from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator


class SaleItemInput(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)
    discount: float = Field(default=0, ge=0)
    tax: float = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_discount(self):
        if self.discount > self.quantity * self.unit_price:
            raise ValueError("Discount cannot exceed total product value")
        return self


class SaleCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=200)
    sale_date: datetime | None = None
    sales_channel: str
    payment_method: str
    items: list[SaleItemInput] = Field(min_length=1)

    @field_validator("sales_channel")
    @classmethod
    def channel(cls, value: str):
        value = value.upper().replace(" ", "_")
        if value not in {"RETAIL_STORE", "ONLINE_STORE", "MARKETPLACE"}:
            raise ValueError("Invalid sales channel")
        return value

    @field_validator("payment_method")
    @classmethod
    def payment(cls, value: str):
        value = value.upper().replace(" ", "_")
        if value not in {"CASH", "CARD", "UPI", "BANK_TRANSFER"}:
            raise ValueError("Invalid payment method")
        return value


class SaleUpdate(SaleCreate):
    pass
