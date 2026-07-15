from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    price: float
    stock: int


class ProductUpdate(BaseModel):
    name: str
    sku: str
    category: str
    price: float
    stock: int