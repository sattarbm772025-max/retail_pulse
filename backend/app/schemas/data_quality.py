from pydantic import BaseModel, Field, field_validator


class IssueStatusUpdate(BaseModel):
    status: str
    resolution_note: str | None = Field(default=None, max_length=2000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str):
        value = value.upper()
        if value not in {"OPEN", "INVESTIGATING", "RESOLVED", "IGNORED"}:
            raise ValueError(
                "Status must be OPEN, INVESTIGATING, RESOLVED, or IGNORED"
            )
        return value
