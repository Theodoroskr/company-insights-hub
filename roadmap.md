# Roadmap

- [ ] Fix guest order-item RLS failure with atomic checkout creation; verify guest and signed-in ownership

- [x] Require country selection on Global; alphabetical picker; results search across up to five chosen countries; verify country-site locks

- [x] Add admin Order Status page with payment, per-report status, and delivery progress; verify with live orders

- [x] Fix AML screening to read directors (Administrators) from Cyprus/global API4ALL report shape — company + directors only, no shareholders/UBOs
- [x] Deploy complyadvantage-screen and re-run screening for LAIKO - COSMOS TRADING LIMITED order item (a7731554-b258-40b5-afae-ec55e4058deb)
- [x] Verify entities_screened > 1 and results stored correctly (7 entities, clear)
- [x] Regional pricing for global Profile/Credit/Due Diligence reports + delivery terms per region
- [ ] Confirm real delivery times per region (placeholders in use) — waiting on user

- [ ] Security batch 2: committed admin password, simulated card payment marks orders paid, public company data/UK lookups
