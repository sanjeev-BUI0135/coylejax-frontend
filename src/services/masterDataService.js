import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const masterDataService = {
  getAll(type, params = {}) {
    return api
      .get(`/master-data/${type}`, { params })
      .then((res) => {
        let data = res.data;
        if (type === "divisions" && !params.skipFilter) {
          try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
              const user = JSON.parse(userStr);
              const role = user.role_type?.toLowerCase();
              if (role !== "admin" && role !== "superadmin" && !user.all_data_visible) {
                const userDivisions = Array.isArray(user.project_type) ? user.project_type : [];
                if (data && Array.isArray(data.data)) {
                  data.data = data.data.filter(d => userDivisions.includes(d.value));
                } else if (Array.isArray(data)) {
                  data = data.filter(d => userDivisions.includes(d.value));
                }
              }
            }
          } catch (err) {
            console.error("Error filtering divisions:", err);
          }
        }
        return data;
      });
  },

  create(type, payload) {
    return api.post(`/master-data`, { type, ...payload }).then(res => res.data);
  },

  update(id, payload) {
    return api.put(`/master-data/${id}`, payload).then(res => res.data);
  },

  remove(id) {
    return api.delete(`/master-data/${id}`).then(res => res.data);
  },

  toggleStatus(id) {
    return api.patch(`/master-data/toggle/${id}`).then(res => res.data);
  },
};

export default masterDataService;
