from pydantic import BaseModel, Field, field_validator


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    status: str = "ACTIVE"

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        value = value.upper()
        if value not in {"ACTIVE", "INACTIVE"}:
            raise ValueError("Status must be ACTIVE or INACTIVE")
        return value


class CategoryUpdate(CategoryCreate):
    pass
