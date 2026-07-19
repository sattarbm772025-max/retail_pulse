from pydantic import BaseModel, Field, model_validator


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    sku: str = Field(min_length=2, max_length=100)
    category_id: int
    brand: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=1000)
    unit_price: float = Field(gt=0)
    cost_price: float = Field(ge=0)
    stock_quantity: int = Field(ge=0)
    unit_of_measure: str = Field(default="Unit", min_length=1, max_length=50)
    status: str = "ACTIVE"

    @model_validator(mode="after")
    def validate_prices_and_status(self):
        self.sku = self.sku.strip().upper()
        self.name = self.name.strip()
        self.status = self.status.upper()
        if self.cost_price > self.unit_price:
            raise ValueError("Cost price cannot exceed unit price")
        if self.status not in {"ACTIVE", "INACTIVE"}:
            raise ValueError("Status must be ACTIVE or INACTIVE")
        return self


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass
