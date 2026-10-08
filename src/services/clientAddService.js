import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API Error:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

const clientService = {
  createClient: async (data) => {
    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      if (key !== "logo" && key !== "confirmPassword") {
        formData.append(key, data[key]);
      }
    });

    if (data.logo instanceof File) {
      formData.append("logo", data.logo);
    } else if (Array.isArray(data.logo) && data.logo[0]) {
      formData.append("logo", data.logo[0]);
    }

    const res = await api.post("/clients", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  },

  getClients: async () => {
    const res = await api.get("/clients");
    return res.data;
  },

  getClientById: async (id) => {
    const res = await api.get(`/clients/${id}`);
    return res.data;
  },

  updateClient: async (id, data) => {
    const formData = new FormData();

    Object.keys(data).forEach((key) => {
      if (key !== "logo" && key !== "confirmPassword") {
        formData.append(key, data[key]);
      }
    });

    if (data.logo instanceof File) {
      formData.append("logo", data.logo);
    } else if (Array.isArray(data.logo) && data.logo[0]) {
      formData.append("logo", data.logo[0]);
    }

    // Use PATCH because backend expects PATCH
    const res = await api.patch(`/clients/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  },

  deleteClient: async (id) => {
    const res = await api.delete(`/clients/${id}`);
    return res.data;
  },

  checkPrefix: async (prefix, type, excludeId = null) => {
    const params = { prefix, type };
    if (excludeId) params.excludeId = excludeId;
    const res = await api.get("/clients/check-prefix", { params });
    return res.data;
  },
};

export default clientService;
