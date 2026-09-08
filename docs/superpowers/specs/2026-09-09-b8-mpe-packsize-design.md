# B8 — First Schedule MPE + Second Schedule Pack-Size — Design Spec

Date: 2026-09-09. Status: APPROVED (tables verbatim from `RULES.md`, cross-checked vs Gazette OCR).

## Sources (user-verified)
- MPE TABLE-I bands + % rounding rule: `RULES.md:466-482`.
- MPE TABLE-II (length/area/number): `RULES.md:484-492` (by-number 2% implemented; length/area skipped — no such declarations exist).
- Second Schedule 19 entries: `RULES.md:496-525`. Disclaimer wording: `RULES.md:84` (Rule 5 proviso).
- Deficiency-only semantics: Rules 19/21 (`RULES.md:296-309, 327-338`) — excess is legal.

## Design
- Both are deterministic sub-checks inside the existing **Rule6(1)(c)** evaluation (net-quantity
  correctness is where they belong). No rule-data/version surgery, no migration, no new endpoints
  (`PATCH /inspections/{id}` already records `physical_quantity`/`physical_unit`).
- Findings keep 1-eval-1-finding shape; B8 overrides `legal_reference`
  (e.g. `Rule6(1)(c); First Schedule Table-I`) and appends to explanation. Numeric trace goes in
  `eval_detail.detail`. Severity stays CRITICAL (requirement-level).
- MPE: `deficiency = declared − physical`; FAIL iff `deficiency > band limit`. No physical sample →
  explicitly NOT verifiable (diag note, no fail). Low-conf invariant unchanged (driving keys already
  `net_quantity`, `net_quantity_unit`).
- Pack-size: category → schedule entry keyword match (BISCUITS/TEA/ATTA/EDIBLE_OIL/SOAP→toilet/COFFEE
  mapped; SNACKS etc. → diag "not scheduled", no fail). Non-standard + no `standard_pack_warning`
  text → FAIL; disclaimer present → pass with note.

## Acceptance
Live E2E: (1) 500g declared / 480g weighed → FAIL First Schedule (deficiency 20g > 15g limit);
(2) 480g→490g re-weigh → MPE passes; (3) 63g biscuit pack, no disclaimer → FAIL Second Schedule;
(4) same + disclaimer declaration → pass; (5) SNACKS category → not-applicable note, no fail.
Cleanup + commit. `RULEBOOK_v1.md` gaps section updated to B8-done.
