# Re-run Barclays Bank PLC screening and compare old vs new

## Goal
Run the Compliance & AML screening for Barclays Bank PLC one more time with the stricter rules, then show you a side-by-side comparison with the old noisy results.

## Steps
1. Find the paid Barclays report order that has screening unlocked (the add-on or the AML & Compliance report).
2. Start the screening for that order once. The customer is not charged again, and the results are saved with the order.
3. Read the saved results: entities screened, sanctions hits, PEP hits, regulatory enforcement hits, and the timestamp.
4. Open the Barclays page in the preview and take a screenshot of the Compliance & AML tab.
5. Compare the new results against the old ones. The old results come from the export you uploaded earlier: 12 entities, 0 sanctions, 14 PEP, 274 adverse media, plus warnings such as the US sex-offender and most-wanted hits for Robert Berry.

## What you get
A short comparison table in chat (old vs new count for each section), the names of any real hits that remain, and confirmation that the crime-list false matches are gone.

## Technical details
- Call the `complyadvantage-screen` edge function with the order item id, then query `screening_results` and `screening_entity_hits`.
- The old stored rows were deleted by the earlier migration, so the old baseline is the uploaded export.
- No code changes. If the new results still contain noise, I'll suggest threshold tweaks in a follow-up.
