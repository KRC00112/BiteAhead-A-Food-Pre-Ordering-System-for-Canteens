from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import activity
from app.admin.live import router as live_router
from app.admin.router import router as admin_router
from app.auth.router import router as auth_router
from app.cart.router import router as cart_router
from app.database.database import init_db
from app.feedback.router import router as feedback_router
from app.inventory.router import router as inventory_router
from app.items.router import legacy_router as items_legacy_router
from app.items import images
from app.items.router import router as items_router
from app.notifications.router import router as notifications_router
from app.orders.router import router as orders_router
from app.payments.router import router as payments_router
from app.reports.router import router as reports_router
from app.staff.router import router as staff_router
from app.users.router import router as users_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Canteen Pre-Order System API",
    description="SOA backend for the Canteen Pre-Order System (CS612 Group 4).",
    version="0.1.0",
    lifespan=lifespan,
)

activity.install(app)


@app.middleware("http")
async def remember_base_url(request: Request, call_next):
    # Food image URLs in responses are built from the address the app called us on.
    images.set_request_base_url(str(request.base_url))
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(items_router)
app.include_router(items_legacy_router)
app.include_router(inventory_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(staff_router)
app.include_router(notifications_router)
app.include_router(feedback_router)
app.include_router(admin_router)
app.include_router(reports_router)
app.include_router(live_router)
# Default food photos (app/static/food). Uploaded photos are served by GET /items/{id}/image.
app.mount("/static", StaticFiles(directory=images.STATIC_DIR), name="static")


@app.get("/", tags=["Health"])
def health():
    return {"service": "canteen-backend", "status": "ok"}
