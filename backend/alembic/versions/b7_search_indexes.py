"""b7 repository search indexes

Revision ID: b7_search_indexes
Revises: b5_kpi_indexes
Create Date: 2026-09-09
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b7_search_indexes'
down_revision: Union[str, Sequence[str], None] = 'b5_kpi_indexes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEXES = [
    ("ix_commodities_generic_name", "commodities", ["generic_name"]),
    ("ix_brands_name", "brands", ["name"]),
    ("ix_business_entities_legal_name", "business_entities", ["legal_name"]),
    ("ix_inspections_submitted_at", "inspections", ["submitted_at"]),
]


def upgrade() -> None:
    for name, table, cols in INDEXES:
        op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({', '.join(cols)})")


def downgrade() -> None:
    for name, table, _ in INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {name}")
