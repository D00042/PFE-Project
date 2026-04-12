
import { API_BASE_URL, getAuthHeaders, handleResponse } from './apiUtils.js';

const dashboardService = {


  getProfitabilityData: async (year, period = 'P12') => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/profitability?year=${year}&period=${period}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },


  getBalanceSheetData: async (year, period = 'P12') => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/balance-sheet?year=${year}&period=${period}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },

  getLiquidityData: async (year, period = 'P12') => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/liquidity?year=${year}&period=${period}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },


  getDsoDpoData: async (year, period = 'P12') => {
    const response = await fetch(
      `${API_BASE_URL}/dashboard/dso-dpo?year=${year}&period=${period}`,
      { headers: getAuthHeaders() }
    );
    return handleResponse(response);
  },
  interpretProfitability: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/ai/interpret/profitability`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
},

  interpretBalanceSheet: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/ai/interpret/balance-sheet`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
},

  interpretLiquidity: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/ai/interpret/liquidity`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
},

  interpretDsoDpo: async (payload) => {
    const response = await fetch(`${API_BASE_URL}/ai/interpret/dso-dpo`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
    });
    return handleResponse(response);
},


  exportToPDF: () => {
    window.print();
  },
};

export default dashboardService;