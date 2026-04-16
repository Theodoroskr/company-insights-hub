// ============================================================
// Companies House UK — Typed client
// All requests go through the `companies-house-uk` edge function
// so the API key never reaches the browser.
// ============================================================

import { supabase } from "@/integrations/supabase/client";

export interface CHSearchItem {
  company_number: string;
  title: string;
  company_status?: string;
  company_type?: string;
  date_of_creation?: string;
  address_snippet?: string;
}

export interface CHSearchResponse {
  items: CHSearchItem[];
  total_results: number;
  start_index: number;
  items_per_page: number;
}

export interface CHCompanyProfile {
  icg_code: string;
  country_code: "GB";
  name: string;
  reg_no: string;
  legal_form?: string;
  status?: string;
  registered_address?: string;
  directors_json?: unknown[];
  raw_source_json?: Record<string, unknown>;
  cached_at?: string;
}

type Action = "search" | "profile" | "officers" | "filing-history" | "charges" | "psc";

async function call<T>(action: Action, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("companies-house-uk", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? "Companies House request failed");
  return data.data as T;
}

export const companiesHouseUK = {
  search: (query: string, opts: { itemsPerPage?: number; startIndex?: number } = {}) =>
    call<CHSearchResponse>("search", { query, ...opts }),

  profile: (companyNumber: string) =>
    call<{ source: "cache" | "live"; company: CHCompanyProfile }>("profile", {
      companyNumber,
    }),

  officers: (companyNumber: string) => call<{ items: unknown[] }>("officers", { companyNumber }),

  filingHistory: (companyNumber: string, itemsPerPage = 25) =>
    call<{ items: unknown[]; total_count: number }>("filing-history", {
      companyNumber,
      itemsPerPage,
    }),

  charges: (companyNumber: string) =>
    call<{ items: unknown[]; total_count: number }>("charges", { companyNumber }),

  psc: (companyNumber: string) =>
    call<{ items: unknown[]; total_results: number }>("psc", { companyNumber }),
};

export default companiesHouseUK;
