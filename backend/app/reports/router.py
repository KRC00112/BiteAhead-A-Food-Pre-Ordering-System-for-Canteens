from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.security import require_role
from app.database.database import get_db
from app.database.models import ADMIN, User
from app.reports import service
from app.reports.service import Period, PeriodOverview, SalesReport, SalesTrend

# Main canteen admin only (read-only monitoring). Staff, students and faculty get 403.
router = APIRouter(prefix="/admin/reports", tags=["Admin sales reports"])
admin_only = require_role(ADMIN)

DAY_HELP = "Any day inside the period, YYYY-MM-DD (default: today, canteen time)"


@router.get("/sales/overview", response_model=List[PeriodOverview])
def sales_overview(
    day: Optional[date] = Query(None, alias="date", description=DAY_HELP),
    admin: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """This week, month, quarter and year at a glance: orders, revenue, collected/pending,
    cancellations, each compared with the period before (% change)."""
    return service.sales_overview(db, day)


@router.get("/sales", response_model=SalesReport)
def sales_report(
    period: Period = Query("monthly", description="weekly | monthly | quarterly | yearly"),
    day: Optional[date] = Query(None, alias="date", description=DAY_HELP),
    admin: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Full sales report for one week, month, quarter or year: totals and comparison with the
    previous period, day-by-day (or month-by-month) breakdown, every item's sales and rating,
    items that did not sell, categories, Veg / Non-Veg, payment methods, customer types and
    peak hours. Cancelled orders are not counted as sales."""
    return service.sales_report(db, period, day)


@router.get("/sales/trend", response_model=SalesTrend)
def sales_trend(
    period: Period = Query("monthly", description="weekly | monthly | quarterly | yearly"),
    count: int = Query(12, ge=1, le=104, description="How many periods, ending with the current one"),
    day: Optional[date] = Query(None, alias="date", description="Any day in the last period (default: today)"),
    admin: User = Depends(admin_only),
    db: Session = Depends(get_db),
):
    """Orders and revenue for the last `count` weeks / months / quarters / years, oldest first,
    for a chart (e.g. `?period=monthly&count=12`)."""
    return service.sales_trend(db, period, count, day)
