from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str


class UserUpdate(BaseModel):
    name: str
    role: str
    status: str
