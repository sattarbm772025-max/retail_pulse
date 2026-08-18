from datetime import date

from pydantic import BaseModel, EmailStr, Field, model_validator, field_validator


class CustomerPayload(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=30)
    customer_type: str
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    postal_code: str | None = Field(default=None, min_length=2, max_length=20)
    preferred_sales_channel: str | None = None
    status: str = "ACTIVE"

    @model_validator(mode="after")
    def create_full_name(self):
        if self.first_name and self.last_name:
            self.full_name = f"{self.first_name.strip()} {self.last_name.strip()}"
        if not self.full_name:
            raise ValueError("First name and last name are required")
        return self

    @field_validator("customer_type")
    @classmethod
    def validate_type(cls, value: str):
        value = value.upper()
        if value not in {"RETAIL", "WHOLESALE", "CORPORATE"}:
            raise ValueError("Customer type must be RETAIL, WHOLESALE, or CORPORATE")
        return value
