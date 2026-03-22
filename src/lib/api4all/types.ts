// ============================================================
// API4ALL v3 — TypeScript types
// Base URL: https://v3.api4all.io/a4a/3.0/api
// Client ID: F25Y0RU2M5
// ============================================================

export const API4ALL_BASE_URL = 'https://v3.api4all.io/a4a/3.0/api';
export const API4ALL_CLIENT_ID = 'F25Y0RU2M5';

// ── Auth ─────────────────────────────────────────────────────

export interface Api4AllTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Api4AllRefreshRequest {
  refresh_token: string;
  client_id: string;
  client_secret: string;
}

// ── Search ───────────────────────────────────────────────────

export type Api4AllSearchType = 'name' | 'vat_no' | 'reg_no';

export interface Api4AllSearchResult {
  code: string;           // ICG company code e.g. "CY00001234406861"
  name: string;
  country: string;        // ISO country code e.g. "CY"
  reg_no: string | null;
  vat_no: string | null;
  status: string | null;
  legal_form: string | null;
  registered_address: string | null;
}

export type Api4AllSearchResponse = Api4AllSearchResult[];

// ── Reports ──────────────────────────────────────────────────

export type Api4AllReportType =
  | 'kyb'
  | 'structure'
  | 'credit'
  | 'scoring'
  | 'fccb'
  | 'bankruptcy';

/** Raw report envelope — actual data varies per report type */
export interface Api4AllReportResponse {
  code: string;
  report_type: string;
  generated_at: string;
  data: Record<string, unknown>;
}

export interface Api4AllReportDatesResponse {
  code: string;
  available_reports: Array<{
    report_type: string;
    available_at: string;
    version: number;
  }>;
}

// ── Orders ───────────────────────────────────────────────────

export type Api4AllOrderSpeed = 'Normal' | 'Urgent';
export type Api4AllOrderFormat = 'JSON' | 'PDF';

export interface Api4AllOrderItem {
  code: string;               // ICG company code
  reference: string;          // your internal reference
  language: string;           // e.g. "EN"
  product: string;            // product code e.g. "2200"
  format: Api4AllOrderFormat;
  speed: Api4AllOrderSpeed;
  freshinvestigation: 0 | 1;
  comments?: string;
}

export interface Api4AllCreateOrderRequest {
  reference: string;
  items: Api4AllOrderItem[];
}

export interface Api4AllOrderResultItem {
  id: number;
  code: string;
  reference: string;
  product: string;
  speed: string;
  status: string;
  sla_deadline: string | null;
  report_url: string | null;
}

export interface Api4AllOrderResult {
  id: number;
  reference: string;
  status: string;
  created_at: string;
  items: Api4AllOrderResultItem[];
}

export interface Api4AllCancelOrderItem {
  id: number;
  reference: string;
  comments?: string;
}

export interface Api4AllCancelOrderRequest {
  orders: Api4AllCancelOrderItem[];
}

// ── Information (test endpoint) ───────────────────────────────

export interface Api4AllInformationResponse {
  code: string;
  name: string;
  country: string;
  status: string | null;
  reg_no: string | null;
  vat_no: string | null;
  legal_form: string | null;
  registered_address: string | null;
  raw: Record<string, unknown>;
}
