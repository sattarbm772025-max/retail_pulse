from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator


class CustomerPayload(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=30)
    customer_type: str
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    preferred_sales_channel: str | None = None
    status: str = "ACTIVE"

    @field_validator("customer_type")
    @classmethod
    def validate_type(cls, value: str):
        value = value.upper()
        if value not in {"RETAIL", "WHOLESALE", "CORPORATE"}:
            raise ValueError("Customer type must be RETAIL, WHOLESALE, or CORPORATE")
        return value
