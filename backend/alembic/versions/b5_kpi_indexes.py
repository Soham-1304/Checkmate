"""b5 dashboard indexes (runtime KPI aggregation)

Revision ID: b5_kpi_indexes
Revises: b3_refresh_tokens
Create Date: 2026-09-08
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b5_kpi_indexes'
down_revision: Union[str, Sequence[str], None] = 'b3_refresh_tokens'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

INDEXES = [
    ("ix_inspections_created_at", "inspections", ["created_at"]),
    ("ix_inspections_status", "inspections", ["status"]),
    ("ix_inspections_compliance_result", "inspections", ["compliance_result"]),
    ("ix_inspections_officer_id", "inspections", ["officer_id"]),
    ("ix_commodities_category", "commodities", ["category"]),
    ("ix_findings_legal_reference", "findings", ["legal_reference"]),
    ("ix_declarations_confidence", "declarations", ["confidence"]),
]


def upgrade() -> None:
    for name, table, cols in INDEXES:
        op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({', '.join(cols)})")


def downgrade() -> None:
    for name, table, _ in INDEXES:
        op.execute(f"DROP INDEX IF EXISTS {name}")
