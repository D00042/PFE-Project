import { API_BASE_URL, getAuthHeaders, handleResponse } from './apiUtils.js';

const accessService = {

  getAllLeadersWithPermissions: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard-access/leaders`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  toggleDashboardAccess: async (userId, dashboard, enabled) => {
    const response = await fetch(`${API_BASE_URL}/dashboard-access/leaders/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dashboard, enabled }),
    });
    return handleResponse(response);
  },

  getAvailableDashboards: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard-access/dashboards`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },


  getDashboardByKey: (dashboards, key) => {
    return dashboards.find(d => d.key === key) ?? null;
  },
};

export default accessService;