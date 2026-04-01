const API_BASE_URL = 'http://localhost:8000';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw { response: { data, status: response.status } };
  }
  return { data };
};

export { API_BASE_URL };