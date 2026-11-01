from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.security import get_current_user, require_role
from app.database.database import get_db
from app.database.models import ADMIN, CANTEEN_STAFF, User
from app.feedback import service
from app.feedback.service import FeedbackIn, ItemFeedbackOut, OrderFeedbackOut, StaffFeedbackOut

router = APIRouter(tags=["Feedback"])


@router.get("/orders/{order_id}/feedback", response_model=OrderFeedbackOut)
def order_feedback(order_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The feedback form for your order: every item, with your rating and description if given."""
    return service.get_order_feedback(db, user, order_id)


@router.post("/orders/{order_id}/feedback", response_model=OrderFeedbackOut)
def submit_feedback(
    order_id: str,
    data: FeedbackIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rate (1-5) and describe the items of your order, once it is SERVED (409 before that).
    Send one item or several; sending an item again edits your earlier feedback."""
    return service.submit_feedback(db, user, order_id, data)


@router.get("/items/{food_id}/feedback", response_model=ItemFeedbackOut)
def item_feedback(food_id: int, db: Session = Depends(get_db)):
    """A food item's average rating and newest reviews (without customers' names). Public."""
    return service.get_item_feedback(db, food_id)


@router.get("/staff/feedback", response_model=List[StaffFeedbackOut])
def all_feedback(
    food_id: Optional[int] = Query(None, description="Only this food item"),
    max_rating: Optional[int] = Query(None, ge=1, le=5, description="This rating or lower, e.g. 2"),
    staff: User = Depends(require_role(CANTEEN_STAFF, ADMIN)),
    db: Session = Depends(get_db),
):
    """Every customer's feedback, newest first, with who gave it and for which order."""
    return service.list_all_feedback(db, food_id, max_rating)
