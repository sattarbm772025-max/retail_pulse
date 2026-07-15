from pydantic import BaseModel


class InventoryCreate(BaseModel):
    product_id: int
    quantity: int
    reorder_level: int


class InventoryUpdate(BaseModel):
    quantity: int
    reorder_level: int