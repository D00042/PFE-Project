
import { API_BASE_URL, getAuthHeaders, handleResponse } from './apiUtils.js';

const accountService = {

  
  createAccount: async ({ email, password, role, fullName, telephone, team }) => {
    const response = await fetch(`${API_BASE_URL}/auth/create-user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email, password, role, fullName, telephone, team }),
    });
    return handleResponse(response);
  },

  
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },


  editAccount: async (userId, { fullName, role, telephone, team }) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ fullName, role, telephone, team }),
    });
    return handleResponse(response);
  },


  deactivateAccount: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/deactivate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

 
  activateAccount: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/activate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

export default accountService;