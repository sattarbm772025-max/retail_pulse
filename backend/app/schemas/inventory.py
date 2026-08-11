from pydantic import BaseModel, Field, field_validator


class InventoryAdjustment(BaseModel):
    adjustment_type: str
    direction: str | None = None
    quantity: int = Field(gt=0)
    reason: str = Field(min_length=2, max_length=255)
    remarks: str | None = Field(default=None, max_length=500)

    @field_validator("adjustment_type")
    @classmethod
    def movement_type(cls, value: str):
        value = value.upper().replace(" ", "_")
        if value not in {"STOCK_IN", "STOCK_OUT", "MANUAL_ADJUSTMENT"}:
            raise ValueError(
                "Adjustment type must be STOCK_IN, STOCK_OUT, or MANUAL_ADJUSTMENT"
            )
        return value

    @field_validator("direction")
    @classmethod
    def adjustment_direction(cls, value: str | None):
        if value is None:
            return value
        value = value.upper()
        if value not in {"INCREASE", "DECREASE"}:
            raise ValueError("Direction must be INCREASE or DECREASE")
        return value


class ReorderLevelUpdate(BaseModel):
    reorder_level: int = Field(ge=0)
    reason: str = Field(min_length=2, max_length=255)
