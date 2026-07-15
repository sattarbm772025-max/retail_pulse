from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


class CompanyRegister(BaseModel):
    company_name: str = Field(min_length=2, max_length=200)
    industry: str = Field(min_length=2, max_length=100)
    company_email: EmailStr
    company_address: str = Field(min_length=3, max_length=500)
    company_phone: str = Field(min_length=5, max_length=20)

    owner_name: str = Field(min_length=2, max_length=100)
    owner_email: EmailStr

    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
