# Backend ↔ AI Integration

> **One-line version:** the worker extracts, Supabase decides. The FastAPI backend
> (Postgres + Storage) is the source of truth for evidence, declarations, rules,
> verdicts, and reports. `AI_ML/` holds a stateless OCR worker and stores nothing.

## 1. File map

| File | Role | Source |
|---|---|---|
| `AI_ML/ocr_extract.py` | Preprocessing + per-line OCR + contrast helper | Adapted from `main2.py` (app/DB/rules stripped, per-line upgrade, `en+hi`) |
| `AI_ML/worker_bridge.py` | CLI worker: login → analyze → download → extract → PUT declarations | New, only integration code |
| `AI_ML/doca-worker-requirements.txt` | Worker venv pins (easyocr/torch/opencv/requests) | New |
| `AI_ML/main2.py` | **Retired prototype.** Reference only — never run in the demo (own SQLite, own 3-rule engine, wrong font slabs, FSSAI rule is not LM-PCR law) | Mates' original |
| `AI_ML/legal_metrology_dataset.json` | **Retired stub** (2 samples, image paths don't exist) | Mates' original |

## 2. Run lifecycle (async callback, `docs/RULEBOOK_CONTRACT.md`)

```
officer uploads photos (POST .../evidence, Supabase Bluetick_Image_Store)
  -> worker_bridge: POST .../analyze            -> run QUEUED (201) or reuse (200)
  -> worker_bridge: GET .../evidence            -> presigned URLs
  -> worker_bridge: download + easyocr en+hi    -> per-line text/conf/bbox/script
  -> worker_bridge: PUT .../analysis-runs/{rid}/declarations -> run COMPLETED
  -> officer: POST .../evaluate                 -> verdict + auto-rendered PDF
```

Backend guards that protect the demo: evidence-required before analyze
(`analysis.py:46-48`); unknown canonical key → 422; confidence out of range →
422; re-POST while QUEUED returns the existing run; completed runs reject
re-ingest.

## 3. Declaration mapping (12 canonical keys)

| Key | Worker sends | Backend requirement it drives |
|---|---|---|
| `mrp` | OCR MRP line + `[tax legend seen]` flag, line conf, bbox, font-mm, measured `contrast_pass`, script | Rule6(1)(e), Rule9(1)(b) |
| `net_quantity` / `net_quantity_unit` | OCR qty number + SI unit, line conf, bbox, `font_size_mm`, `contrast_pass`, script | Rule6(1)(c), Rule7 (font Table I), Rule8, MPE + Second Schedule |
| other 9 (`mfg_date`, `expiry_date`, `generic_name`, `manufacturer_name`, `manufacturer_address`, `packer_name`, `importer_name`, `consumer_care`, `standard_pack_warning`) | `machine_value: null`, `confidence: 0.0`, `UNDETECTED` | Their FAILs downgrade to REVIEW via the low-confidence invariant (`compliance_service.py:424-436`) — missing OCR never fabricates a verdict |
| `raw_ocr_output` | `{engine: easyocr[en,hi], images: [per-image lines]}` | Stored on `analysis_runs` for traceability |

## 4. Geometry: what is real vs stubbed (say this on stage)

- **Real:** `font_size_mm` (OCR bbox height × package-height scale — genuine Rule 7 input); `contrast_pass` (Otsu luminance ratio on the MRP/qty crop, threshold 3.0 mirroring `min_contrast_ratio`); `script_language` per line (Devanagari regex → Rule 9(4) can actually fire on Hindi labels).
- **Stubbed:** `clearance_pass` always null → Rule 8 stays PASS-by-default with the honest caveat "clearance verified physically". Package height defaults to 150mm (`--pkg-height-mm` override).

## 5. Rules live in our DB (untouched by this integration)

Seeded by `backend/app/db/seeds/seed_gazette.py`: 12 `field_definitions`,
rule-set `LM-PCR-2011-v1.0` (active), 10 requirements incl. MPE Table-I/II and
the 19-entry Second Schedule map in `compliance_service.py`. The worker never
evaluates rules and never sends verdicts — `main2.py`'s `LegalMetrologyRuleEngine`
is deliberately excluded (wrong Rule 7 slabs, out-of-scope FSSAI check).

## 6. Run it (E2E checklist)

```bash
# 0. backend up (Supabase-backed), officer account exists
# 1. worker venv (once; pulls torch + en/hi models on first OCR run)
pip install -r AI_ML/doca-worker-requirements.txt

# 2. officer flow (app or curl): create inspection, upload 2-3 photos,
#    note the inspection UUID
# 3. worker (one command per inspection)
python AI_ML/worker_bridge.py --inspection <uuid> \
  --officer-email officer@doca.gov.in --officer-password '<pw>' \
  --base-url http://localhost:8000/api/v1

# 4. verdict + report
POST /api/v1/inspections/<uuid>/evaluate   # -> PASS/FAIL/REVIEW + report_id
GET  /api/v1/inspections/<uuid>/report     # -> PDF
```

Expected on a clean English pack: `mrp` + `net_quantity` HIGH conf, font check
evaluated, remaining 9 keys REVIEW ("requires officer confirmation"), overall
REVIEW — the officer corrects in-app, re-evaluates, verdict firms up. That
human-in-the-loop arc IS the demo story.

## 7. Deferred (post-demo, in order)

1. Clearance-zone measurement (bbox-gap heuristic) → real Rule 8.
2. Field-level regex mining for `mfg_date`/`consumer_care`/address+PIN from OCR lines (cuts REVIEW count without new models).
3. PaddleOCR swap only if Hindi accuracy disappoints on real photos.
4. Celery/queue + webhook so the worker need not be manually invoked.
