// ============================================================
// API4ALL v3 — Typed client
// All requests are proxied through the Supabase edge function
// `api4all-proxy` so credentials never reach the browser.
// ============================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  Api4AllSearchType,
  Api4AllSearchResponse,
  Api4AllReportType,
  Api4AllReportResponse,
  Api4AllReportDatesResponse,
  Api4AllCreateOrderRequest,
  Api4AllOrderResult,
  Api4AllCancelOrderRequest,
  Api4AllInformationResponse,
} from './types';

// ── Helper ───────────────────────────────────────────────────

async function callProxy<T>(
  path: string,
  options?: { method?: string; body?: unknown }
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('api4all-proxy', {
    body: {
      path,
      method: options?.method ?? 'GET',
      body: options?.body ?? null,
    },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ── Authentication ────────────────────────────────────────────
// Token management is handled server-side inside the edge function.
// These are exposed in case an admin page needs to trigger a refresh.

export const api4all = {

  // ── Search ─────────────────────────────────────────────────

  /**
   * Search companies by name, VAT number, or registration number.
   * @param countryCode  ISO country code e.g. "cy", "gr"
   * @param type         'name' | 'vat_no' | 'reg_no'
   * @param query        Search string
   */
  async search(
    countryCode: string,
    type: Api4AllSearchType,
    query: string
  ): Promise<Api4AllSearchResponse> {
    return callProxy<Api4AllSearchResponse>(
      `/search/${countryCode.toLowerCase()}/${type}/${encodeURIComponent(query)}`
    );
  },

  // ── Reports ────────────────────────────────────────────────

  /**
   * Fetch a report by ICG company code.
   * @param type     Report type: 'kyb' | 'structure' | 'credit' | 'scoring' | 'fccb' | 'bankruptcy'
   * @param icgCode  ICG company code e.g. "CY00001234406861"
   */
  async getReport(
    type: Api4AllReportType,
    icgCode: string
  ): Promise<Api4AllReportResponse> {
    return callProxy<Api4AllReportResponse>(
      `/report/${type}/code/${encodeURIComponent(icgCode)}`
    );
  },

  /**
   * Check report availability dates for a company.
   * @param icgCode  ICG company code
   */
  async getReportDates(icgCode: string): Promise<Api4AllReportDatesResponse> {
    return callProxy<Api4AllReportDatesResponse>(
      `/reports/dates/${encodeURIComponent(icgCode)}`
    );
  },

  // ── Company information ────────────────────────────────────

  /**
   * Fetch company information (test/information endpoint).
   */
  async getInformation(
    countryCode: string,
    type: Api4AllSearchType,
    query: string
  ): Promise<Api4AllInformationResponse> {
    return callProxy<Api4AllInformationResponse>(
      `/information/${countryCode.toLowerCase()}/${type}/${encodeURIComponent(query)}`
    );
  },

  // ── Orders ─────────────────────────────────────────────────

  /**
   * Create a new order.
   */
  async createOrder(payload: Api4AllCreateOrderRequest): Promise<Api4AllOrderResult> {
    return callProxy<Api4AllOrderResult>('/orders/create/', {
      method: 'POST',
      body: payload,
    });
  },

  /**
   * Get order by internal ID.
   */
  async getOrderById(id: number | string): Promise<Api4AllOrderResult> {
    return callProxy<Api4AllOrderResult>(`/orders/id/${id}`);
  },

  /**
   * Get order by your reference code.
   */
  async getOrderByCode(code: string): Promise<Api4AllOrderResult> {
    return callProxy<Api4AllOrderResult>(`/orders/code/${encodeURIComponent(code)}`);
  },

  /**
   * Get orders by status. e.g. 'received' | 'completed' | 'processing'
   */
  async getOrdersByStatus(status: string): Promise<Api4AllOrderResult[]> {
    return callProxy<Api4AllOrderResult[]>(`/orders/status/${encodeURIComponent(status)}`);
  },

  /**
   * Get orders by date period.
   * @param from  YYYYMMDD
   * @param to    YYYYMMDD
   */
  async getOrdersByPeriod(from: string, to: string): Promise<Api4AllOrderResult[]> {
    return callProxy<Api4AllOrderResult[]>(`/orders/period/${from}-${to}`);
  },

  /**
   * Get orders by API4ALL product code e.g. "2200".
   */
  async getOrdersByProduct(productCode: string): Promise<Api4AllOrderResult[]> {
    return callProxy<Api4AllOrderResult[]>(`/orders/product/${productCode}`);
  },

  /**
   * Get a single order item by its ID.
   */
  async getOrderItem(itemId: string | number): Promise<Api4AllOrderResult> {
    return callProxy<Api4AllOrderResult>(`/orders/item/${itemId}`);
  },

  /**
   * Cancel one or more orders.
   */
  async cancelOrders(payload: Api4AllCancelOrderRequest): Promise<{ success: boolean }> {
    return callProxy<{ success: boolean }>('/orders/cancel/', {
      method: 'POST',
      body: payload,
    });
  },
};

export default api4all;
