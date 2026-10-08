import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

function getAuthHeader() {
    const token = localStorage.getItem("token");

    return token
        ? { Authorization: `Bearer ${token}` }
        : {};
}

const LS_KEY = "glaciers_ai_settings";

function getApiKey() {
  try {
    // localStorage is always kept in sync with the DB by GlaciersAiSettings.
    // On page load the settings page fetches from DB and writes here.
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey) return parsed.apiKey;
    }
  } catch (e) {
    console.error("Error reading glaciers_ai_settings apiKey", e);
  }
  return "";
}

export const PlanScanService = {
    // Get all projects
    async getProjects() {
        const apiKey = getApiKey();
        const headers = { ...getAuthHeader() };
        if (apiKey) {
            headers["x-api-key"] = apiKey;
        }

        const res = await axios.get(
            `${API_BASE}/planscan/projects`,
            {
                headers,
            }
        );

        return res.data;
    },

    // Get single project
    async getProject(projectId) {
        const apiKey = getApiKey();
        const headers = { ...getAuthHeader() };
        if (apiKey) {
            headers["x-api-key"] = apiKey;
        }

        const res = await axios.get(
            `${API_BASE}/planscan/projects/${projectId}`,
            {
                headers,
            }
        );

        return res.data;
    },

    // Get project items
    async getProjectItems(projectId) {
        const apiKey = getApiKey();
        const headers = { ...getAuthHeader() };
        if (apiKey) {
            headers["x-api-key"] = apiKey;
        }

        const res = await axios.get(
            `${API_BASE}/planscan/projects/${projectId}/items`,
            {
                headers,
            }
        );

        return res.data;
    },
};