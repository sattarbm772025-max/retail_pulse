from fastapi import HTTPException
from app.models.company import Company


def get_company(current_user):

    return current_user.company


def update_company(
    db,
    current_user,
    request
):

    company = db.query(Company).filter(
        Company.id == current_user.company_id
    ).first()

    if not company:
        raise HTTPException(
            status_code=404,
            detail="Company Not Found"
        )

    company.name = request.name
    company.industry = request.industry
    company.email = request.email
    company.address = request.address
    company.phone = request.phone

    db.commit()
    db.refresh(company)

    return company