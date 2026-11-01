"""Feedback: a rating (1-5) and a description for each food item a customer ordered.

It opens once the order is SERVED, and sending it again for an item edits the earlier one.
Customers' names are only shown to staff and the admin.
"""
from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, StringConstraints, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import activity
from app.auth.security import utcnow
from app.database.models import ORDER_SERVED, Feedback, Order, OrderItem, User
from app.items import service as items_service
from app.orders import service as orders_service


# ---------- Schemas ----------

class FeedbackItemIn(BaseModel):
    food_id: int
    rating: int = Field(..., ge=1, le=5, examples=[4])
    description: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)] = Field(
        ..., examples=["Tasty, but a little too spicy"]
    )


class FeedbackIn(BaseModel):
    items: List[FeedbackItemIn] = Field(..., min_length=1)

    @field_validator("items")
    @classmethod
    def one_per_food(cls, items):
        food_ids = [i.food_id for i in items]
        if len(food_ids) != len(set(food_ids)):
            raise ValueError("Each food item can only appear once")
        return items


class OrderFeedbackItemOut(BaseModel):
    food_id: int
    food: str
    quantity: int
    # None until the customer has given feedback for this item.
    rating: Optional[int] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class OrderFeedbackOut(BaseModel):
    order_id: str
    status: str
    # True once the order is SERVED.
    can_give_feedback: bool
    items: List[OrderFeedbackItemOut]


class ItemReviewOut(BaseModel):
    rating: int
    description: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class ItemFeedbackOut(BaseModel):
    food_id: int
    food: str
    average_rating: Optional[float]
    rating_count: int
    # Newest first, at most 50.
    reviews: List[ItemReviewOut]


class StaffFeedbackOut(ItemReviewOut):
    id: int
    order_id: str
    food_id: int
    food: str
    customer: str
    institute_id: str


# ---------- Logic ----------

def _own_order(db: Session, user: User, order_code: str, lock: bool = False) -> Order:
    if lock:
        order = orders_service.lock_order(db, order_code)
    else:
        order = db.scalar(select(Order).where(Order.order_id == order_code))
    if order is None or order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def _order_feedback_out(db: Session, order: Order) -> OrderFeedbackOut:
    saved = {
        f.order_item_id: f
        for f in db.scalars(
            select(Feedback).where(Feedback.order_item_id.in_([oi.id for oi in order.items]))
        )
    }
    items = []
    for oi in order.items:
        f = saved.get(oi.id)
        items.append(
            OrderFeedbackItemOut(
                food_id=oi.food_item_id,
                food=oi.food_item.name,
                quantity=oi.quantity,
                rating=f.rating if f else None,
                description=f.description if f else None,
                created_at=f.created_at if f else None,
                updated_at=f.updated_at if f else None,
            )
        )
    return OrderFeedbackOut(
        order_id=order.order_id,
        status=order.status,
        can_give_feedback=order.status == ORDER_SERVED,
        items=items,
    )


def get_order_feedback(db: Session, user: User, order_code: str) -> OrderFeedbackOut:
    return _order_feedback_out(db, _own_order(db, user, order_code))


def submit_feedback(db: Session, user: User, order_code: str, data: FeedbackIn) -> OrderFeedbackOut:
    # The lock makes a double-tap update the same feedback rather than clash on the unique key.
    order = _own_order(db, user, order_code, lock=True)
    if order.status != ORDER_SERVED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Order {order.order_id} is {order.status}: feedback opens once it has been served",
        )
    order_items = {oi.food_item_id: oi for oi in order.items}
    for item in data.items:
        if item.food_id not in order_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Food item {item.food_id} is not part of order {order.order_id}",
            )

    now = utcnow()
    for item in data.items:
        oi = order_items[item.food_id]
        feedback = db.scalar(select(Feedback).where(Feedback.order_item_id == oi.id))
        if feedback is None:
            db.add(
                Feedback(
                    order_item_id=oi.id,
                    user_id=user.id,
                    food_item_id=oi.food_item_id,
                    rating=item.rating,
                    description=item.description,
                    created_at=now,
                )
            )
        else:
            feedback.rating = item.rating
            feedback.description = item.description
            feedback.updated_at = now
    db.commit()
    activity.event(
        f"Feedback for {order.order_id}: "
        + ", ".join(f"{order_items[i.food_id].food_item.name} {i.rating}/5" for i in data.items)
    )
    return _order_feedback_out(db, order)


def _review_fields(f: Feedback) -> dict:
    return {
        "rating": f.rating,
        "description": f.description,
        "created_at": f.created_at,
        "updated_at": f.updated_at,
    }


def get_item_feedback(db: Session, food_id: int) -> ItemFeedbackOut:
    food = items_service.get_food_item(db, food_id)
    average, count = items_service.rating_summary(db).get(food_id, (None, 0))
    newest = (
        select(Feedback)
        .where(Feedback.food_item_id == food_id)
        .order_by(Feedback.created_at.desc(), Feedback.id.desc())
        .limit(50)
    )
    return ItemFeedbackOut(
        food_id=food.id,
        food=food.name,
        average_rating=average,
        rating_count=count,
        reviews=[ItemReviewOut(**_review_fields(f)) for f in db.scalars(newest)],
    )


def list_all_feedback(
    db: Session, food_id: Optional[int] = None, max_rating: Optional[int] = None
) -> List[StaffFeedbackOut]:
    stmt = select(Feedback).order_by(Feedback.created_at.desc(), Feedback.id.desc())
    if food_id is not None:
        stmt = stmt.where(Feedback.food_item_id == food_id)
    if max_rating is not None:
        stmt = stmt.where(Feedback.rating <= max_rating)
    return [
        StaffFeedbackOut(
            **_review_fields(f),
            id=f.id,
            order_id=f.order_item.order.order_id,
            food_id=f.food_item_id,
            food=f.order_item.food_item.name,
            customer=f.user.username,
            institute_id=f.user.institute_id,
        )
        for f in db.scalars(stmt).unique()
    ]
