from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.security import get_optional_user
from app.database.database import get_db
from app.database.models import FoodImage, User
from app.items import service
from app.items.schemas import CategoryOut, FoodItemOut, FoodType

router = APIRouter(prefix="/items", tags=["Items"])
# The app used /menu before it was renamed to /items; kept so current app builds keep working.
legacy_router = APIRouter(prefix="/menu", include_in_schema=False)


@router.get("", response_model=List[FoodItemOut])
@legacy_router.get("", response_model=List[FoodItemOut])
def get_items(
    search: Optional[str] = Query(None, description="Search by food name or description"),
    category_id: Optional[int] = Query(None, description="Filter by category"),
    food_type: Optional[FoodType] = Query(None, description="VEG or NON_VEG"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    available_only: bool = Query(False, description="Only show items that can be ordered now"),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """List food items with price, Veg/Non-Veg type, cooking time and stock status.

    The token is optional; when sent, stock in your own cart is not counted as reserved.
    """
    return service.list_items(
        db, user, search, category_id, food_type, min_price, max_price, available_only
    )


@router.get("/categories", response_model=List[CategoryOut])
@legacy_router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return service.list_categories(db)


@router.get("/{food_id}/image", response_class=Response)
def get_food_image(food_id: int, db: Session = Depends(get_db)):
    """The photo the admin uploaded for this item. Use the item's image_url rather than
    building this URL yourself: image_url also covers default photos and outside links."""
    image = db.get(FoodImage, food_id)
    if image is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This item has no uploaded photo")
    # image_url carries a version (?v=...) that changes with every upload, so it can be cached for good.
    return Response(
        content=image.data,
        media_type=image.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.get("/{food_id}", response_model=FoodItemOut)
@legacy_router.get("/{food_id}", response_model=FoodItemOut)
def get_food_item(
    food_id: int, user: Optional[User] = Depends(get_optional_user), db: Session = Depends(get_db)
):
    return service.get_food_out(db, food_id, user)
