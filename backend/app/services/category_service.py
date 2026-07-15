from app.models.category import Category


def create_category(db, current_user, request):

    category = Category(
        company_id=current_user.company_id,
        name=request.name,
        description=request.description
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


def get_categories(db, current_user):

    return (
        db.query(Category)
        .filter(Category.company_id == current_user.company_id)
        .all()
    )