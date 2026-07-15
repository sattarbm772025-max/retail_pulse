from pydantic import BaseModel, EmailStr


class CompanyUpdate(BaseModel):
    name: str
    industry: str
    email: EmailStr
    address: str
    phone: str