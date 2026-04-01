

import { API_BASE_URL, getAuthHeaders, handleResponse } from './apiUtils.js';

const dataService = {



  createRevenueExpense: async (data) => {
    const response = await fetch(`${API_BASE_URL}/revenue-expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getAllRevenueExpenses: async () => {
    const response = await fetch(`${API_BASE_URL}/revenue-expenses`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateRevenueExpense: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/revenue-expenses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteRevenueExpense: async (id) => {
    const response = await fetch(`${API_BASE_URL}/revenue-expenses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },



  createAssetLiability: async (data) => {
    const response = await fetch(`${API_BASE_URL}/asset-liabilities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getAllAssetLiabilities: async () => {
    const response = await fetch(`${API_BASE_URL}/asset-liabilities`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateAssetLiability: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/asset-liabilities/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteAssetLiability: async (id) => {
    const response = await fetch(`${API_BASE_URL}/asset-liabilities/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },


  createCashFlow: async (data) => {
    const response = await fetch(`${API_BASE_URL}/cash-flows`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getAllCashFlows: async () => {
    const response = await fetch(`${API_BASE_URL}/cash-flows`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateCashFlow: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/cash-flows/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteCashFlow: async (id) => {
    const response = await fetch(`${API_BASE_URL}/cash-flows/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },


  createClient: async (data) => {
    const response = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getAllClients: async () => {
    const response = await fetch(`${API_BASE_URL}/clients`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateClient: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteClient: async (id) => {
    const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },


  get: async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeaders(),
    });
    const result = await handleResponse(response);
    return result.data;
  },

  post: async (endpoint, data) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  put: async (endpoint, data) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

export default dataService;