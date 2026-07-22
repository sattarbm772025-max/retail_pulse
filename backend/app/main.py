from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import *
from app.routers.profile import router as profile_router
from app.routers.auth import router as auth_router
from app.routers.company import router as company_router
from app.routers.user import router as user_router
from app.routers.product import router as product_router
from app.routers.category import router as category_router
from app.routers.inventory import router as inventory_router
from app.routers.sale import router as sale_router
app = FastAPI(
    title="RetailPulse Analytics API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(company_router)
app.include_router(user_router)
app.include_router(product_router)
app.include_router(category_router)
app.include_router(inventory_router)
app.include_router(sale_router)


@app.get("/")
def home():
    return {
        "message": "RetailPulse API Running"
    }
