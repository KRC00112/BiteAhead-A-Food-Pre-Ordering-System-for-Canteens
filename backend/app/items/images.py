"""Food item photos.

A food item's image_url is one of:
  - a bundled default photo, "/static/food/<file>.jpg" (in app/static/food, see CREDITS.md there)
  - a photo the admin uploaded, "/items/<id>/image?v=<n>" (the bytes are kept in the database,
    because the server's disk is wiped on every deploy)
  - an outside https:// link the admin pasted in
  - None: no photo yet, the app shows its placeholder

Paths are stored relative to the server and returned as full URLs, so the app can pass
image_url straight to <Image source={{ uri }}>.
"""
import os
from contextvars import ContextVar
from typing import Optional

from fastapi import HTTPException, status

from app.config import MAX_IMAGE_UPLOAD_MB, PUBLIC_BASE_URL

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")

# Default photo for a food item, by name (lowercase). New items with one of these names
# get the photo automatically; seed.py also fills it in for existing items without a photo.
DEFAULT_IMAGES = {
    "veg biryani": "/static/food/veg-biryani.jpg",
    "masala dosa": "/static/food/masala-dosa.jpg",
    "chicken roll": "/static/food/chicken-roll.jpg",
    "samosa": "/static/food/samosa.jpg",
    "tea": "/static/food/tea.jpg",
    "coffee": "/static/food/coffee.jpg",
    "paneer tikka wrap": "/static/food/paneer-tikka-wrap.jpg",
    "paneer wrap": "/static/food/paneer-wrap.jpg",
    "chicken fried rice": "/static/food/chicken-fried-rice.jpg",
    "chowmein": "/static/food/chowmein.jpg",
    "chow mein": "/static/food/chowmein.jpg",
}

# JPEG, PNG and WebP, recognised by their first bytes (the declared type can't be trusted).
_SIGNATURES = [
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
]

# The server's own address for the current request, e.g. "https://canteen-backend.onrender.com/".
_base_url: ContextVar[str] = ContextVar("canteen_base_url", default="")


def set_request_base_url(base_url: str) -> None:
    _base_url.set(base_url)


def default_image_for(name: str) -> Optional[str]:
    return DEFAULT_IMAGES.get(name.strip().lower())


def public_url(image_url: Optional[str]) -> Optional[str]:
    """Full URL the app can load: server paths get this server's address in front."""
    if not image_url or not image_url.startswith("/"):
        return image_url
    base = (PUBLIC_BASE_URL or _base_url.get()).rstrip("/")
    return base + image_url


def uploaded_image_path(food_id: int, version: int) -> str:
    # The version changes on every upload, so phones never show a cached older photo.
    return f"/items/{food_id}/image?v={version}"


def detect_image_type(data: bytes) -> str:
    """The image's real media type; refuses anything that isn't a JPEG, PNG or WebP photo."""
    if len(data) > MAX_IMAGE_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image is too large - the limit is {MAX_IMAGE_UPLOAD_MB:g} MB",
        )
    for signature, media_type in _SIGNATURES:
        if data.startswith(signature):
            return media_type
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Upload a JPEG, PNG or WebP image",
    )


def check_image_link(url: Optional[str]) -> Optional[str]:
    """An image link typed in by the admin: empty clears it, otherwise it must be http(s)."""
    url = (url or "").strip()
    if not url:
        return None
    # The app may send back the full URL this server gave it for a bundled/uploaded photo.
    base = (PUBLIC_BASE_URL or _base_url.get()).rstrip("/")
    if base and url.startswith(base + "/"):
        url = url[len(base):]
    if url.startswith(("/static/food/", "/items/")) or url.startswith(("https://", "http://")):
        return url
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="image_url must be an http:// or https:// link to an image",
    )
