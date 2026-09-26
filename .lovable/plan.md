# Rename the Risk Indicator upsell to Compliance & AML

## Problem
The "Risk Indicator" card on company pages tells visitors that sanctions screening, PEP checks and adverse media are "included in the KYB Report" with an "Order KYB Report →" button. Since we renamed the offering to Compliance & AML, this wording is inconsistent with the rest of the site.

## Change (one file: `src/pages/CompanyProfilePage.tsx`, lines 922–944)

- Heading stays **Risk Indicator** (it describes the traffic-light, which is fine).
- Body copy becomes: "Full compliance analysis — sanctions screening, PEP checks and adverse media — is included in the **Compliance & AML Report**."
- Button label becomes **"Order Compliance & AML Report →"**.
- The button's behaviour is unchanged: it opens the order pop-up pre-selecting the country's KYB/credit report (the product that carries the screening), or scrolls to the products sidebar when none exists.

## Verification
- Open the Barclays company page: the card reads "Compliance & AML Report" and the button opens the order pop-up.
- Type check clean.
