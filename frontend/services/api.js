const API_BASE_URL = 'http://localhost:8000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw {
      response: {
        data: data,
        status: response.status,
      },
    };
  }
  return { data };
};

// =============================================================
//  AUTH API
//  Backend prefix: /auth  (routes/auth.py)
// =============================================================
export const authAPI = {

  // POST /auth/login
  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  // POST /auth/create-user  (leader role required)
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/create-user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
        role: userData.role || 'member',
      }),
    });
    return handleResponse(response);
  },

  // GET /auth/me  — returns { email, role } for the logged-in user
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // POST /auth/request-password-reset
  forgotPassword: async (data) => {
    const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // POST /auth/reset-password
  resetPassword: async (data) => {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // ── Routes below don't exist in the backend yet ──────────────
  // Your friend needs to add these to routes/auth.py before they work.
  // The frontend calls are wired up and ready — just needs the backend route.

  // GET /auth/users  → needs:  @router.get("/users")
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // GET /auth/users/:id  → needs:  @router.get("/users/{user_id}")
  getUserById: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // PUT /auth/users/:id  → needs:  @router.put("/users/{user_id}")
  updateUser: async (userId, userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // DELETE /auth/users/:id  → needs:  @router.delete("/users/{user_id}")
  deleteUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // PATCH /auth/users/:id/activate  → needs:  @router.patch("/users/{user_id}/activate")
  activateUser: async (id) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${id}/activate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // PATCH /auth/users/:id/deactivate  → needs:  @router.patch("/users/{user_id}/deactivate")
  deactivateUser: async (id) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${id}/deactivate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // PUT /auth/profile  → needs:  @router.put("/profile")
  updateProfile: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // POST /auth/logout  → needs:  @router.post("/logout")
  // JWT is stateless so logout is usually handled client-side (just delete the token).
  // If your backend doesn't add this route, call authAPI.logoutLocal() instead.
  logout: async () => {
    localStorage.removeItem('token'); // always clear locally
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return handleResponse(response);
    } catch {
      // Backend route doesn't exist yet — local logout already done above
      return { data: { message: 'Logged out locally' } };
    }
  },

};

export default authAPI;


// =============================================================
//  DATA API
//  Backend prefix: /  (routes/data.py — keep as-is, these look correct)
// =============================================================
export const dataAPI = {

  // REVENUE & EXPENSES
  createRevenueExpense: async (data) => {
    const response = await fetch(`${API_BASE_URL}/revenue-expenses`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  getAllRevenueExpenses: async () => {
    const response = await fetch(`${API_BASE_URL}/revenue-expenses`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },
  updateRevenueExpense: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/revenue-expenses/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  deleteRevenueExpense: async (id) => {
    const response = await fetch(`${API_BASE_URL}/revenue-expenses/${id}`, {
      method: 'DELETE', headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // ASSETS & LIABILITIES
  createAssetLiability: async (data) => {
    const response = await fetch(`${API_BASE_URL}/asset-liabilities`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  getAllAssetLiabilities: async () => {
    const response = await fetch(`${API_BASE_URL}/asset-liabilities`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },
  updateAssetLiability: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/asset-liabilities/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  deleteAssetLiability: async (id) => {
    const response = await fetch(`${API_BASE_URL}/asset-liabilities/${id}`, {
      method: 'DELETE', headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // CASH FLOW
  createCashFlow: async (data) => {
    const response = await fetch(`${API_BASE_URL}/cash-flows`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  getAllCashFlows: async () => {
    const response = await fetch(`${API_BASE_URL}/cash-flows`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },
  updateCashFlow: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/cash-flows/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  deleteCashFlow: async (id) => {
    const response = await fetch(`${API_BASE_URL}/cash-flows/${id}`, {
      method: 'DELETE', headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // SUPPLIERS
  createSupplier: async (data) => {
    const response = await fetch(`${API_BASE_URL}/suppliers`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  getAllSuppliers: async () => {
    const response = await fetch(`${API_BASE_URL}/suppliers`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },
  updateSupplier: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  deleteSupplier: async (id) => {
    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
      method: 'DELETE', headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // CUSTOMERS
  createCustomer: async (data) => {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  getAllCustomers: async () => {
    const response = await fetch(`${API_BASE_URL}/customers`, { headers: getAuthHeaders() });
    return handleResponse(response);
  },
  updateCustomer: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  deleteCustomer: async (id) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'DELETE', headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

};