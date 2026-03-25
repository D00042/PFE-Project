/**
 * authController.js
 * User Story 1.1 — Authenticate
 * Handles: login, logout, get current user profile
 */

import { API_BASE_URL, getAuthHeaders, handleResponse } from './apiUtils.js';

const authController = {

  /**
   * US 1.1 — Basic Scenario: user submits email + password
   * POST /auth/login → returns JWT access token
   */
  login: async ({ email, password }) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  /**
   * US 1.1 — After login: fetch role-specific user data
   * GET /auth/me → returns { id, email, role, is_active }
   */
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * US 1.1 — Alternative Scenario 3.2: Deactivated account check
   * handled by the backend (403), but we expose logout here for
   * the client to clear state.
   * POST /auth/logout
   */
  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    } catch {
      return { data: { message: 'Logged out locally' } };
    }
  },

  /**
   * Password reset flow (linked to authentication module)
   * POST /auth/request-password-reset
   */
  requestPasswordReset: async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  /**
   * Change password from profile page
   * POST /auth/change-password
   */
  changePassword: async ({ old_password, new_password }) => {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ old_password, new_password }),
    });
    return handleResponse(response);
  },
};

export default authController;