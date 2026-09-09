# Officer Assigned-Inspect Flow — Design (2026-09-10)

## Problem
Scanner showed the full commodity catalog after capture ("shitty list"), gallery button was dead,
pipeline jumped straight from picker to analysis with no review step, and branding was stale.

## Flow (approved)
1. **Scan** (`app/scanner.tsx`): capture via camera AND/OR pick from gallery
   (expo-image-picker multi-select). Photos accumulate in `inspectStore`.
2. **Assigned sheet**: after first photo, bottom sheet lists ONLY
   `GET /assignments/my-checklist` (status ASSIGNED) — brand + commodity + barcode +
   due date. No catalog fetch.
3. **Confirm** (`app/inspect-confirm.tsx`, new route): photo grid (add/remove),
   metadata card (brand, commodity, barcode, due date, assignment notes), big
   **INSPECT** button.
4. **Pipeline** (modal progress): create inspection (commodity_id + assignment_id) →
   upload all photos → analyze-auto → evaluate → submit (→ UNDER_REVIEW) →
   `router.replace(/analysis/{id})`.
5. **Result** (existing `app/analysis/[id].tsx`): verdict ring, findings,
   declarations, PDF report via Linking. Inspections tab shows it UNDER_REVIEW.

## Backend: untouched
All endpoints exist and live-verified: my-checklist, POST /inspections
(commodity_id + assignment_id), POST evidence (multipart), analyze-auto,
evaluate, submit, report. Seed: officer@doca.gov.in holds 5 ASSIGNED items
(Amul Butter, Parle-G Glucose Biscuits, Aashirvaad Atta, Tata CTC Tea,
Haldiram's Aloo Bhujia); duplicate Glucose assignment cancelled.

## Branding
`frontend_app/assets/logo.png` (user drops in the Checkmate logo file) wired
into splash (`app/index.tsx`), login header, confirm/result headers.
Text already renamed Checkmate. app.json name/slug updated.

## Non-goals
Barcode decoding, assignment status auto-complete, Hindi OCR, officer dashboard
rewire (P2), admin detail flow (P3).
