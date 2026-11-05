"""Sales reports for the admin: weekly, monthly, quarterly and yearly sales. Read-only.

- A sale is an order that was not cancelled. It counts on the day it was placed, in canteen time
  (CANTEEN_TIMEZONE, default Asia/Kolkata).
- Revenue is the order totals at the prices the customers paid. `collected` is the part already
  paid (UPI, or cash taken at the counter). `pending` is cash still to be collected.
- Cancelled orders are not sales. They are counted separately (`cancelled_orders`).
- Weeks start on Monday. Quarters are calendar quarters (Q1 = Jan-Mar).
"""
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Dict, Iterable, List, Literal, Optional, Tuple
from zoneinfo import ZoneInfo

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.security import as_utc
from app.config import CANTEEN_TIMEZONE
from app.database.models import (
    ORDER_CANCELLED,
    ORDER_PAYMENT_PAID,
    Feedback,
    FoodItem,
    Order,
    OrderItem,
    Role,
    User,
)

TZ = ZoneInfo(CANTEEN_TIMEZONE)
Period = Literal["weekly", "monthly", "quarterly", "yearly"]
PERIODS: Tuple[Period, ...] = ("weekly", "monthly", "quarterly", "yearly")


# ---------- Schemas ----------

class SalesSummary(BaseModel):
    # Orders that were not cancelled.
    orders: int
    items_sold: int
    revenue: float
    # Already paid (UPI, or cash taken at the counter).
    collected: float
    # Cash still to be collected for orders that are not picked up yet.
    pending: float
    average_order_value: float
    # Different customers who ordered.
    customers: int
    cancelled_orders: int
    cancelled_amount: float


class PreviousPeriod(BaseModel):
    label: str
    start: date
    end: date
    orders: int
    revenue: float
    # Percentage change from the previous period; null when the previous period had no sales.
    orders_change_percent: Optional[float]
    revenue_change_percent: Optional[float]


class SalesBucket(BaseModel):
    """One day (weekly / monthly report) or one month (quarterly / yearly report)."""

    label: str
    start: date
    # Last day included.
    end: date
    orders: int
    items_sold: int
    revenue: float


class ItemSales(BaseModel):
    food_id: int
    food: str
    category: str
    food_type: str
    quantity: int
    revenue: float
    revenue_share_percent: float
    # Orders that included this item.
    orders: int
    # From feedback on this period's orders; null when nobody rated it.
    average_rating: Optional[float]
    rating_count: int
    # True when the admin has removed the item from the menu since.
    removed: bool


class UnsoldItem(BaseModel):
    food_id: int
    food: str
    category: str
    food_type: str


class GroupSales(BaseModel):
    """Sales grouped by category, Veg / Non-Veg, payment method or customer type."""

    name: str
    orders: int
    quantity: int
    revenue: float
    revenue_share_percent: float


class HourSales(BaseModel):
    hour: int
    label: str
    orders: int
    revenue: float


class Highlights(BaseModel):
    best_seller: Optional[str] = None
    top_earner: Optional[str] = None
    # Items need at least MIN_RATINGS_FOR_HIGHLIGHT ratings to be named here.
    highest_rated: Optional[str] = None
    lowest_rated: Optional[str] = None
    busiest_hour: Optional[str] = None
    # The day (or month) with the most revenue.
    best_day: Optional[str] = None


class SalesReport(BaseModel):
    period: Period
    label: str
    start: date
    # Last day included.
    end: date
    timezone: str
    generated_at: datetime
    summary: SalesSummary
    previous: PreviousPeriod
    highlights: Highlights
    breakdown: List[SalesBucket]
    items: List[ItemSales]
    not_sold: List[UnsoldItem]
    categories: List[GroupSales]
    food_types: List[GroupSales]
    payment_methods: List[GroupSales]
    customer_types: List[GroupSales]
    peak_hours: List[HourSales]


class PeriodOverview(BaseModel):
    period: Period
    label: str
    start: date
    end: date
    summary: SalesSummary
    previous: PreviousPeriod


class TrendPoint(BaseModel):
    label: str
    start: date
    end: date
    orders: int
    items_sold: int
    revenue: float
    collected: float
    cancelled_orders: int


class SalesTrend(BaseModel):
    period: Period
    timezone: str
    # Oldest first; the last point is the period containing the requested date.
    points: List[TrendPoint]


# ---------- Periods ----------

MIN_RATINGS_FOR_HIGHLIGHT = 3


def today() -> date:
    return datetime.now(TZ).date()


def _add_months(d: date, months: int) -> date:
    index = d.year * 12 + d.month - 1 + months
    return date(index // 12, index % 12 + 1, 1)


def period_range(period: Period, day: date) -> Tuple[date, date]:
    """(first day, day after the last day) of the period containing `day`."""
    if period == "weekly":
        start = day - timedelta(days=day.weekday())
        return start, start + timedelta(days=7)
    if period == "monthly":
        start = day.replace(day=1)
        return start, _add_months(start, 1)
    if period == "quarterly":
        start = date(day.year, (day.month - 1) // 3 * 3 + 1, 1)
        return start, _add_months(start, 3)
    start = date(day.year, 1, 1)
    return start, date(day.year + 1, 1, 1)


def period_label(period: Period, start: date) -> str:
    if period == "weekly":
        last = start + timedelta(days=6)
        return f"{start:%d %b} - {last:%d %b %Y}"
    if period == "monthly":
        return f"{start:%B %Y}"
    if period == "quarterly":
        last = _add_months(start, 2)
        return f"Q{(start.month - 1) // 3 + 1} {start.year} ({start:%b}-{last:%b})"
    return str(start.year)


def _sub_ranges(period: Period, start: date, end: date) -> List[Tuple[str, date, date]]:
    """Days for a weekly or monthly report, months for a quarterly or yearly one."""
    out = []
    if period in ("weekly", "monthly"):
        d = start
        fmt = "%a %d %b" if period == "weekly" else "%d %b"
        while d < end:
            out.append((d.strftime(fmt), d, d + timedelta(days=1)))
            d += timedelta(days=1)
    else:
        d = start
        while d < end:
            nxt = _add_months(d, 1)
            out.append((d.strftime("%b %Y"), d, nxt))
            d = nxt
    return out


def _utc_bound(d: date) -> datetime:
    """Midnight of that canteen day, as a UTC time to compare with created_at."""
    return datetime.combine(d, time.min, tzinfo=TZ).astimezone(timezone.utc)


# ---------- Loading ----------

@dataclass
class _OrderRow:
    id: int
    total: Decimal
    cancelled: bool
    paid: bool
    payment_method: str
    user_id: int
    role: str
    placed_at: datetime  # canteen time
    items: int


def _load_orders(db: Session, start: date, end: date) -> List[_OrderRow]:
    lo, hi = _utc_bound(start), _utc_bound(end)
    item_counts = dict(
        db.execute(
            select(OrderItem.order_id, func.sum(OrderItem.quantity))
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.created_at >= lo, Order.created_at < hi)
            .group_by(OrderItem.order_id)
        ).all()
    )
    rows = db.execute(
        select(
            Order.id,
            Order.total_amount,
            Order.status,
            Order.payment_status,
            Order.payment_method,
            Order.user_id,
            Role.name,
            Order.created_at,
        )
        .join(User, User.id == Order.user_id)
        .join(Role, Role.id == User.role_id)
        .where(Order.created_at >= lo, Order.created_at < hi)
    ).all()
    return [
        _OrderRow(
            id=oid,
            total=total or Decimal(0),
            cancelled=order_status == ORDER_CANCELLED,
            paid=pay_status == ORDER_PAYMENT_PAID,
            payment_method=method,
            user_id=user_id,
            role=role,
            placed_at=as_utc(created_at).astimezone(TZ),
            items=int(item_counts.get(oid) or 0),
        )
        for oid, total, order_status, pay_status, method, user_id, role, created_at in rows
    ]


def _money(value) -> float:
    return round(float(value or 0), 2)


def _percent(part, whole) -> float:
    return round(float(part) * 100 / float(whole), 1) if whole else 0.0


def _change(now, before) -> Optional[float]:
    return round((float(now) - float(before)) * 100 / float(before), 1) if before else None


def _summarize(rows: Iterable[_OrderRow]) -> SalesSummary:
    sold = [r for r in rows if not r.cancelled]
    cancelled = [r for r in rows if r.cancelled]
    revenue = sum((r.total for r in sold), Decimal(0))
    collected = sum((r.total for r in sold if r.paid), Decimal(0))
    return SalesSummary(
        orders=len(sold),
        items_sold=sum(r.items for r in sold),
        revenue=_money(revenue),
        collected=_money(collected),
        pending=_money(revenue - collected),
        average_order_value=_money(revenue / len(sold)) if sold else 0.0,
        customers=len({r.user_id for r in sold}),
        cancelled_orders=len(cancelled),
        cancelled_amount=_money(sum((r.total for r in cancelled), Decimal(0))),
    )


def _previous(db: Session, period: Period, start: date, current: SalesSummary) -> PreviousPeriod:
    prev_start, prev_end = period_range(period, start - timedelta(days=1))
    prev = _summarize(_load_orders(db, prev_start, prev_end))
    return PreviousPeriod(
        label=period_label(period, prev_start),
        start=prev_start,
        end=prev_end - timedelta(days=1),
        orders=prev.orders,
        revenue=prev.revenue,
        orders_change_percent=_change(current.orders, prev.orders),
        revenue_change_percent=_change(current.revenue, prev.revenue),
    )


# ---------- Reports ----------

def _item_sales(db: Session, start: date, end: date) -> Tuple[List[ItemSales], List[UnsoldItem]]:
    lo, hi = _utc_bound(start), _utc_bound(end)
    in_period = (Order.created_at >= lo, Order.created_at < hi, Order.status != ORDER_CANCELLED)
    lines = db.execute(
        select(
            OrderItem.food_item_id,
            func.sum(OrderItem.quantity),
            func.sum(OrderItem.quantity * OrderItem.price),
            func.count(func.distinct(OrderItem.order_id)),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(*in_period)
        .group_by(OrderItem.food_item_id)
    ).all()
    ratings = {
        food_id: (round(float(avg), 1), count)
        for food_id, avg, count in db.execute(
            select(OrderItem.food_item_id, func.avg(Feedback.rating), func.count(Feedback.rating))
            .join(Feedback, Feedback.order_item_id == OrderItem.id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(*in_period, Feedback.rating.is_not(None))
            .group_by(OrderItem.food_item_id)
        )
    }
    foods = {f.id: f for f in db.scalars(select(FoodItem)).unique()}
    total = sum((Decimal(r[2] or 0) for r in lines), Decimal(0))

    items = []
    for food_id, quantity, revenue, orders in lines:
        food = foods[food_id]
        average, count = ratings.get(food_id, (None, 0))
        items.append(
            ItemSales(
                food_id=food_id,
                food=food.name,
                category=food.category.name,
                food_type=food.food_type,
                quantity=int(quantity or 0),
                revenue=_money(revenue),
                revenue_share_percent=_percent(revenue or 0, total),
                orders=int(orders),
                average_rating=average,
                rating_count=count,
                removed=food.removed_at is not None,
            )
        )
    items.sort(key=lambda i: (-i.revenue, -i.quantity, i.food))

    sold_ids = {i.food_id for i in items}
    not_sold = [
        UnsoldItem(food_id=f.id, food=f.name, category=f.category.name, food_type=f.food_type)
        for f in sorted(foods.values(), key=lambda f: f.name)
        if f.removed_at is None and f.id not in sold_ids
    ]
    return items, not_sold


def _group_items(items: List[ItemSales], key) -> List[GroupSales]:
    groups: Dict[str, List[ItemSales]] = defaultdict(list)
    for item in items:
        groups[key(item)].append(item)
    total = sum(i.revenue for i in items)
    out = [
        GroupSales(
            name=name,
            # An order with two items of the same category counts once per item here.
            orders=sum(i.orders for i in group),
            quantity=sum(i.quantity for i in group),
            revenue=_money(sum(i.revenue for i in group)),
            revenue_share_percent=_percent(sum(i.revenue for i in group), total),
        )
        for name, group in groups.items()
    ]
    return sorted(out, key=lambda g: -g.revenue)


def _group_orders(rows: List[_OrderRow], key) -> List[GroupSales]:
    groups: Dict[str, List[_OrderRow]] = defaultdict(list)
    for r in rows:
        groups[key(r)].append(r)
    total = sum((r.total for r in rows), Decimal(0))
    out = []
    for name, group in groups.items():
        revenue = sum((r.total for r in group), Decimal(0))
        out.append(
            GroupSales(
                name=name,
                orders=len(group),
                quantity=sum(r.items for r in group),
                revenue=_money(revenue),
                revenue_share_percent=_percent(revenue, total),
            )
        )
    return sorted(out, key=lambda g: -g.revenue)


def _hour_label(hour: int) -> str:
    return f"{hour:02d}:00-{(hour + 1) % 24:02d}:00"


def sales_report(db: Session, period: Period, day: Optional[date] = None) -> SalesReport:
    start, end = period_range(period, day or today())
    rows = _load_orders(db, start, end)
    sold = [r for r in rows if not r.cancelled]
    summary = _summarize(rows)

    breakdown = []
    for label, b_start, b_end in _sub_ranges(period, start, end):
        in_bucket = [r for r in sold if b_start <= r.placed_at.date() < b_end]
        breakdown.append(
            SalesBucket(
                label=label,
                start=b_start,
                end=b_end - timedelta(days=1),
                orders=len(in_bucket),
                items_sold=sum(r.items for r in in_bucket),
                revenue=_money(sum((r.total for r in in_bucket), Decimal(0))),
            )
        )

    hours: Dict[int, List[_OrderRow]] = defaultdict(list)
    for r in sold:
        hours[r.placed_at.hour].append(r)
    peak_hours = [
        HourSales(
            hour=h,
            label=_hour_label(h),
            orders=len(hours[h]),
            revenue=_money(sum((r.total for r in hours[h]), Decimal(0))),
        )
        for h in sorted(hours)
    ]

    items, not_sold = _item_sales(db, start, end)
    rated = [i for i in items if i.rating_count >= MIN_RATINGS_FOR_HIGHLIGHT]
    highlights = Highlights(
        best_seller=max(items, key=lambda i: (i.quantity, i.revenue)).food if items else None,
        top_earner=items[0].food if items else None,
        highest_rated=max(rated, key=lambda i: (i.average_rating, i.rating_count)).food if rated else None,
        lowest_rated=min(rated, key=lambda i: (i.average_rating, -i.rating_count)).food if rated else None,
        busiest_hour=max(peak_hours, key=lambda h: (h.orders, h.revenue)).label if peak_hours else None,
        best_day=max(breakdown, key=lambda b: b.revenue).label if sold else None,
    )

    return SalesReport(
        period=period,
        label=period_label(period, start),
        start=start,
        end=end - timedelta(days=1),
        timezone=CANTEEN_TIMEZONE,
        generated_at=datetime.now(TZ),
        summary=summary,
        previous=_previous(db, period, start, summary),
        highlights=highlights,
        breakdown=breakdown,
        items=items,
        not_sold=not_sold,
        categories=_group_items(items, lambda i: i.category),
        food_types=_group_items(items, lambda i: i.food_type),
        payment_methods=_group_orders(sold, lambda r: r.payment_method),
        customer_types=_group_orders(sold, lambda r: r.role),
        peak_hours=peak_hours,
    )


def sales_overview(db: Session, day: Optional[date] = None) -> List[PeriodOverview]:
    """This week, month, quarter and year, each compared with the one before."""
    day = day or today()
    out = []
    for period in PERIODS:
        start, end = period_range(period, day)
        summary = _summarize(_load_orders(db, start, end))
        out.append(
            PeriodOverview(
                period=period,
                label=period_label(period, start),
                start=start,
                end=end - timedelta(days=1),
                summary=summary,
                previous=_previous(db, period, start, summary),
            )
        )
    return out


def sales_trend(db: Session, period: Period, count: int, day: Optional[date] = None) -> SalesTrend:
    """The last `count` periods up to the one containing `day`, oldest first."""
    ranges = []
    start, end = period_range(period, day or today())
    for _ in range(count):
        ranges.append((start, end))
        start, end = period_range(period, start - timedelta(days=1))
    ranges.reverse()

    rows = _load_orders(db, ranges[0][0], ranges[-1][1])
    points = []
    for p_start, p_end in ranges:
        s = _summarize([r for r in rows if p_start <= r.placed_at.date() < p_end])
        points.append(
            TrendPoint(
                label=period_label(period, p_start),
                start=p_start,
                end=p_end - timedelta(days=1),
                orders=s.orders,
                items_sold=s.items_sold,
                revenue=s.revenue,
                collected=s.collected,
                cancelled_orders=s.cancelled_orders,
            )
        )
    return SalesTrend(period=period, timezone=CANTEEN_TIMEZONE, points=points)
