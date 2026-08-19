from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.core.database import Base


class DemandForecast(Base):
    __tablename__ = "demand_forecasts"

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "product_id",
            "forecast_period",
            name="uq_forecast_company_product_period",
        ),
    )

    id = Column(Integer, primary_key=True)

    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
    )

    category_id = Column(
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
    )

    forecast_period = Column(
        Integer,
        nullable=False,
    )

    predicted_demand = Column(
        Float,
        nullable=False,
    )

    # Model confidence.
    # This is NOT actual forecast accuracy.
    confidence_score = Column(
        Float,
        nullable=False,
    )

    generated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ForecastHistory(Base):
    __tablename__ = "forecast_history"

    id = Column(
        Integer,
        primary_key=True,
    )

    forecast_id = Column(
        Integer,
        ForeignKey(
            "demand_forecasts.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    historical_sales = Column(
        Float,
        nullable=False,
    )

    prediction = Column(
        Float,
        nullable=False,
    )

    # Actual sales observed after the forecast period.
    actual_sales = Column(
        Float,
        nullable=True,
    )

    # Actual accuracy percentage.
    accuracy = Column(
        Float,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
