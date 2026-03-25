/**
 * accessController.js
 * User Story 1.5 — Control Dashboard Access (Manager only)
 * Handles: assign access, revoke access, view current permissions
 */

import { API_BASE_URL, getAuthHeaders, handleResponse } from './apiUtils.js';

const accessController = {

  /**
   * US 1.5.3 — View current access permissions for all team leaders
   * GET /dashboard-access/leaders
   * Requires: manager role
   */
  getAllLeadersWithPermissions: async () => {
    const response = await fetch(`${API_BASE_URL}/dashboard-access/leaders`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * US 1.5.1 — Assign dashboard access to a user
   * US 1.5.2 — Revoke dashboard access from a user
   * PATCH /dashboard-access/leaders/:userId
   * @param {number} userId
   * @param {string} dashboard  - one of: profitability, balance_sheet, liquidity, dpo_dso
   * @param {boolean} enabled   - true = grant, false = revoke
   */
  toggleDashboardAccess: async (userId, dashboard, enabled) => {
    const response = await fetch(`${API_BASE_URL}/dashboard-access/leaders/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dashboard, enabled }),
    });
    return handleResponse(response);
  },
};

export default accessController;