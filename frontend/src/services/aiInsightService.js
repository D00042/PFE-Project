const API_BASE_URL = 'http://localhost:8000';

const getToken = () => localStorage.getItem('token');

const aiInsightService = {

  generateInterpretation: async (year, period, dashboard = "profitability") => {
    const response = await fetch(`${API_BASE_URL}/ai-insights/generate/interpretation`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ year, period, dashboard }),
    });
    if (!response.ok) throw await response.json();
    return { data: await response.json() };
  },

  generateRecommendation: async (year, period, dashboard = "profitability") => {
    const response = await fetch(`${API_BASE_URL}/ai-insights/generate/recommendation`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ year, period, dashboard }),
    });
    if (!response.ok) throw await response.json();
    return { data: await response.json() };
  },

  getHistory: async (dashboard = null, insightType = null) => {
    const params = new URLSearchParams();
    if (dashboard)   params.append("dashboard",   dashboard);
    if (insightType) params.append("insightType", insightType);
    const response = await fetch(
      `${API_BASE_URL}/ai-insights/history?${params.toString()}`,
      {
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${getToken()}`,
        },
      }
    );
    if (!response.ok) throw await response.json();
    return { data: await response.json() };
  },

  deleteInsight: async (id) => {
    const response = await fetch(`${API_BASE_URL}/ai-insights/${id}`, {
      method:  "DELETE",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
    });
    if (!response.ok) throw await response.json();
    return { data: await response.json() };
  },
};

export default aiInsightService;