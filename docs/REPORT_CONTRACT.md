# REPORT_CONTRACT.md — Inspection PDF Report (B6)

## Template
- Single template: `backend/app/services/report_templates/inspection_report.html.j2`
  (prototype layout, our own design — no official Form A/B specimen exists).
- Version: `TEMPLATE_VERSION = "v1"` in `report_service.py`; stamped in header/footer + audit.
- Second template later = new `.j2` + version bump; service/routers unchanged.

## Context model (`build_report_context`)
| Key | Source |
|---|---|
| `inspection.{id,status,compliance_result,final_decision,location,context_notes,physical_sample,created_at,submitted_at}` | `inspections` |
| `officer.{name,employee_id,email}` | `users` via `officer_id` |
| `commodity.{generic_name,category,barcode,sku,package_type,pack_size}` | `commodities` |
| `brand`, `entity.{legal_name,type,address}` | `brands`, `business_entities` |
| `rule_set_version` | `rule_sets` |
| `evidence[].{view_type,mime_type,uploaded_at,image_b64}` | `evidence` + Storage download (base64; null + warning if fetch fails) |
| `declarations[].{field,canonical_key,machine_value,officer_value,corrected,confidence,low_conf}` | `declarations` ⨝ `field_definitions` (low-conf < 0.60) |
| `evaluations[].{rule_ref,title,severity,result}` | `compliance_evaluations` ⨝ `requirements` |
| `findings[].{severity,title,explanation,legal_reference,officer_accepted,officer_note}` | `findings` |
| `audit_trail[].{action,actor_id,at}` | `audit_events` (INSPECTION scope, ≤50) |

## Lifecycle
- Auto-render inside `POST /inspections/{id}/evaluate` (non-fatal: failure logs + skips;
  `GET .../report` lazy-generates). Re-evaluate overwrites. `REPORT_GENERATED` audit per render.
- Storage: bucket `SUPABASE_BUCKET_REPORTS` (`Bluetick_Report_Store` live), object
  `reports/{inspection_id}.pdf` (upsert). `reports` row upsert on `inspection_id` unique key.
- `GET /inspections/{id}/report` returns fresh presigned URL on every read (stored `file_url`
  is a fallback; signed URLs expire per `SUPABASE_URL_EXPIRE_SECS`).
- RBAC: `can_view_own_reports` gate; cross-officer reads need `can_view_all_reports`/SUPERADMIN.

## Local dev prerequisite (macOS)
WeasyPrint needs system libs: `brew install pango cairo gdk-pixbuf libffi glib`, then run the
server with `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib`.
