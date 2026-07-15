from fastapi import HTTPException


def ensure_company_access(current_user, company_id: int):
    """
    Prevent users from accessing another company's data.
    """

    if current_user.company_id != company_id:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Company mismatch."
        )
