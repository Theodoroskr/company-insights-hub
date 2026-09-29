// Normalizes a delivered API4ALL company bundle (Cyprus / global) into flat fields.
type R = Record<string, any>;
const arr = (v: unknown): R[] => (Array.isArray(v) ? (v as R[]) : []);
const active = (x: R) => x.Active !== 0 && !x.EndDate;
const personName = (p: R) =>
  (p.IsCompany ? p.CompanyName : [p.FirstName, p.MiddleName, p.LastName].filter(Boolean).join(' ')) || p.CompanyName || '';
const fmtAddr = (a?: R) => (a ? [a.Address, a.City, a.PostalCode, a.Country].filter(Boolean).join(', ') : '');
const addrOf = (p: R) => fmtAddr(arr(p.Address).filter((a) => a.Active !== 0)[0]);

export interface NormOfficer { name: string; roles: string[]; appointed?: string; nationality?: string; address?: string }
export interface NormHolder { name: string; isCompany: boolean; pct?: string; shares?: string; nationality?: string; address?: string }
export interface NormCharge { kind: 'charge' | 'mortgage'; type?: string; beneficiary?: string; amount?: number; currency?: string; prepared?: string; registered?: string; number?: string; ended?: string }
export interface NormReport {
  name?: string; status?: string; legalForm?: string; website?: string; emails?: string; phones?: string;
  registrationDate?: string; lastUpdated?: string;
  dates: { label: string; date: string }[];
  identifiers: { label: string; value: string }[];
  addresses: { label: string; value: string }[];
  registeredAddress?: string;
  officers: NormOfficer[]; shareholders: NormHolder[];
  activities: { code: string; type: string; description: string }[];
  charges: NormCharge[];
  capital?: { authorised?: string; issued?: string; paidUp?: string; currency?: string; classes: { type: string; issued?: string; value?: string }[] };
}

export function isApi4AllBundle(b: unknown): b is R {
  return !!b && Array.isArray((b as R).Company) && (b as R).Company.length > 0;
}

export function normalizeApi4AllReport(bundle: R): NormReport | null {
  const c: R | undefined = arr(bundle?.Company)[0];
  if (!c) return null;
  const gen: R = arr(c.GeneralInfo)[0] ?? {};
  const more: R = arr(c.MoreInfo)[0] ?? {};
  const dates = arr(gen.CompanyDates).filter((d) => d.Date).map((d) => ({ label: d.Description, date: d.Date }));

  const officerMap = new Map<string, NormOfficer>();
  for (const a of arr(c.Administrators).filter(active)) {
    const name = personName(a).trim();
    if (!name) continue;
    const key = name.toUpperCase();
    const ex = officerMap.get(key);
    const role = String(a.Position || 'Officer');
    if (ex) { if (!ex.roles.includes(role)) ex.roles.push(role); if (a.StartDate && (!ex.appointed || a.StartDate < ex.appointed)) ex.appointed = a.StartDate; }
    else officerMap.set(key, { name, roles: [role], appointed: a.StartDate || undefined, nationality: a.Nationality || undefined, address: addrOf(a) || undefined });
  }

  const charges: NormCharge[] = [];
  for (const mc of arr(c.MortgagesCharges)) {
    const nestedC = arr(mc.Charges), nestedM = arr(mc.Mortgages);
    const push = (x: R, kind: NormCharge['kind']) => charges.push({
      kind, type: x.Type || x.Description || (kind === 'mortgage' ? 'Mortgage' : 'Charge'),
      beneficiary: x.Beneficiary || x.CreditorName || undefined,
      amount: x.Amount ? Number(x.Amount) : undefined, currency: x.Currency || undefined,
      prepared: x.DatePrepared || undefined, registered: x.DateRegistered || undefined,
      number: x.Number || undefined, ended: x.EndDate || undefined,
    });
    if (nestedC.length || nestedM.length) { nestedC.forEach((x) => push(x, 'charge')); nestedM.forEach((x) => push(x, 'mortgage')); }
    else push(mc, 'charge');
  }

  const cap = arr(c.Capitals)[0];
  const addresses = arr(gen.Address).map((a) => ({ label: a.Type || 'Address', value: fmtAddr(a) })).filter((a) => a.value);

  return {
    name: gen.Name, status: arr(gen.Status)[0]?.Description, legalForm: arr(gen.LegalType)[0]?.Description,
    website: gen.Website || undefined, emails: more.Emails || undefined, phones: more.Phones || undefined,
    registrationDate: dates.find((d) => /registration/i.test(d.label))?.date ?? dates.find((d) => /start/i.test(d.label))?.date,
    lastUpdated: gen.DateUpdated ? String(gen.DateUpdated).replace(' ', 'T') : undefined,
    dates,
    identifiers: arr(c.Identifiers).filter((i) => i.Number).map((i) => ({ label: i.Description, value: i.Number })),
    addresses,
    registeredAddress: addresses.find((a) => /registered/i.test(a.label))?.value ?? addresses[0]?.value,
    officers: [...officerMap.values()],
    shareholders: arr(c.Shareholders).filter(active).map((s) => ({
      name: personName(s), isCompany: !!s.IsCompany, pct: s.SharesPercentage || undefined,
      shares: s.IssuedShares || undefined, nationality: s.Nationality || undefined, address: addrOf(s) || undefined,
    })).filter((s) => s.name),
    activities: arr(arr(c.Activities)[0]?.ActivityCode).map((a) => ({ code: String(a.Code ?? ''), type: a.Type ?? '', description: a.Description ?? '' })),
    charges,
    capital: cap ? {
      authorised: cap.AuthorisedCapital, issued: cap.IssuedShares, paidUp: cap.PaidUpCapital, currency: cap.Currency,
      classes: arr(cap.SharesBreakdown).map((b) => ({ type: b.Type, issued: b.IssuedShares, value: b.Value })),
    } : undefined,
  };
}
