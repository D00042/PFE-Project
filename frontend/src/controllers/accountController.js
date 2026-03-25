/**
 * accountController.js
 * User Story 1.2 — Manage Accounts (Team Leader only)
 * Handles: create account, activate/deactivate, edit, list users
 */

import { API_BASE_URL, getAuthHeaders, handleResponse } from './apiUtils.js';

const accountController = {

  /**
   * US 1.2.1 — Create an employee account
   * POST /auth/create-user
   * Requires: leader role
   */
  createAccount: async ({ email, password, role, fullName, telephone, team }) => {
    const response = await fetch(`${API_BASE_URL}/auth/create-user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password, role, fullName, telephone, team }),
    });
    return handleResponse(response);
  },

  /**
   * US 1.2 — Consult the list of all registered users
   * GET /auth/users
   * Requires: leader role
   */
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * US 1.2.3 — Edit an employee account
   * PUT /auth/users/:id
   * Note: email and password are NOT editable (read-only per UC spec)
   */
  editAccount: async (userId, { fullName, role, telephone, team }) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ fullName, role, telephone, team }),
    });
    return handleResponse(response);
  },

  /**
   * US 1.2.2 — Deactivate an account
   * PATCH /auth/users/:id/deactivate
   * Replaces permanent deletion — preserves all user data and history
   */
  deactivateAccount: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/deactivate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * US 1.2.2 — Activate a deactivated account
   * PATCH /auth/users/:id/activate
   */
  activateAccount: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/activate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

export default accountController;