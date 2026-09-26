# Hide the misleading Active Charges metric

## Finding
The latest Barclays report stores 25 retrieved charge rows, all marked outstanding, but the official response records 300 total charges. The Risk Summary currently calculates “Active Charges” from those 25 rows and labels 25 as the total, so the displayed metric is incomplete.

## Change
- Remove the “Active Charges” card from the UK Risk Summary.
- Leave the separate Charges & Mortgages section unchanged.
- Keep the other risk metrics and overall layout intact.

## Verification
- Confirm the Risk Summary no longer shows Active Charges or “25 total”.
- Confirm the remaining cards display correctly and the project builds cleanly.
