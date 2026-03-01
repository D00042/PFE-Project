
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
        status: response.status
      }
    };
  }
  
  return { data };
};

// Auth API endpoints
export const authAPI = {

activateUser: (id) => axios.patch(`${API_URL}/users/${id}/activate`),
deactivateUser: (id) => axios.patch(`${API_URL}/users/${id}/deactivate`),

// FIXED - use fetch like the rest of the file
activateUser: async (id) => {
  const response = await fetch(`${API_BASE_URL}/users/${id}/activate`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
},

deactivateUser: async (id) => {
  const response = await fetch(`${API_BASE_URL}/users/${id}/deactivate`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
},

  // Register new user (Create user account - Manager only)
  register: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        fullName: userData.fullName,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'Team Member'
      }),
    });
    
    return handleResponse(response);
  },

  // Get all users (Manager only)
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  // Get user by ID
  getUserById: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  // Update user (Manager only)
  updateUser: async (userId, userData) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    
    return handleResponse(response);
  },

  // Delete user (Manager only)
  deleteUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  // Update own profile
  updateProfile: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    
    return handleResponse(response);
  },

  // Get own profile
  getProfile: async () => {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },

  // Forgot password
  forgotPassword: async (data) => {
    const response = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return handleResponse(response);
  },

  // Reset password
  resetPassword: async (data) => {
    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    return handleResponse(response);
  },

  // Logout
  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    return handleResponse(response);
  },
  
};

export default authAPI;


export const dataAPI = {

  //  REVENUE & EXPENSES
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

  //  ASSETS & LIABILITIES 
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

  //  SUPPLIERS 
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

  //  CUSTOMERS
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