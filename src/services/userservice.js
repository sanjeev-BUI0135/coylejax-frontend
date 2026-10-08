import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const UserService = {
  async list(params = {}) {
    const queryParams = typeof params === 'string' ? { sort: params } : params;

    const res = await axios.get(`${API_BASE}/users`, {
      params: queryParams,
      headers: getAuthHeader(),
    });
    return res.data;
  },
  async get(id) {
    const res = await axios.get(`${API_BASE}/users/${id}`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },
  async me() {
    const res = await axios.get(`${API_BASE}/users/me`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  async create(data) {

    const res = await axios.post(`${API_BASE}/users/register`, data, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  async update(id, data) {
    const res = await axios.put(`${API_BASE}/users/${id}`, data, {
      headers: getAuthHeader(),
    });
    return res.data;
  },

  async remove(id) {
    const res = await axios.delete(`${API_BASE}/users/${id}`, {
      headers: getAuthHeader(),
    });
    return res.data;
  },
};
