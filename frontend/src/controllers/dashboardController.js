/**
 * dashboardController.js
 * Sprint 2 — Dashboard Development
 * User Stories 2.1 to 2.5: Consult Profitability, Balance Sheet,
 * Liquidity Analysis, DPO & DSO dashboards + export graph
 */

import { API_BASE_URL, getAuthHeaders, handleResponse } from './apiUtils.js';

const dashboardController = {

  /**
   * US 2.1 — Consult the Profitability dashboard
   * US 2.1.1 — Filter by year
   * US 2.1.2 — Filter by period (P1–P12)
   * GET /dashboard/profitability?year=YYYY&period=Pn
   */
  getProfitabilityData: async (year, period = 'P12') => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/profitability?year=${year}&period=${period}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  /**
   * US 2.2 — Consult the Balance Sheet Overview
   * US 2.2.1 — Filter by year
   * US 2.2.2 — Filter by period
   * GET /dashboard/balance-sheet?year=YYYY&period=Pn
   */
  getBalanceSheetData: async (year, period = 'P12') => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/balance-sheet?year=${year}&period=${period}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  /**
   * US 2.3 — Consult the Liquidity Analysis dashboard
   * US 2.3.1 — Filter by year
   * US 2.3.2 — Filter by period
   * GET /dashboard/liquidity?year=YYYY&period=Pn
   */
  getLiquidityData: async (year, period = 'P12') => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/liquidity?year=${year}&period=${period}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  /**
   * US 2.4 — Consult the DPO & DSO dashboard
   * US 2.4.1 — Filter by year
   * US 2.4.2 — Filter by period
   * GET /dashboard/dso-dpo?year=YYYY&period=Pn
   */
  getDsoDpoData: async (year, period = 'P12') => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/dso-dpo?year=${year}&period=${period}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  /**
   * US 2.5 — Export dashboard graph
   * This is handled client-side using the browser's print API.
   * Call window.print() from the view — no backend request needed.
   */
  exportToPDF: () => {
    window.print();
  },
};

export default dashboardController;