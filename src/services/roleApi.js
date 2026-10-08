import axios from 'axios';
const API = axios.create({ baseURL: import.meta.env.VITE_API_BASE, });
API.interceptors.request.use(req => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const fetchRoles = () => API.get('/roles');
export const createRole = (body) => API.post('/roles', body);
export const updateRole = (id, body) => API.put(`/roles/${id}`, body);
export const deleteRole = (id) => API.delete(`/roles/${id}`);
export const fetchMyPermissions = () => API.get('/users/me/permissions');
export const fetchRolesInSignUp = () =>
  axios.get(`${import.meta.env.VITE_API_BASE}/roles/getRoles`, {
    headers: {
      'x-api-key': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6ImNveWxlamF4IiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.yOCCptYEcEMfAeLXdKSUMyeZ3GbZ5CMV3C8d3qNM_RE',
    },
  });
export const fetchProjects = () =>API.get('/projects/all/dashboard')
export const fetchBids = () => API.get('/bids')
export const fetchTimeEntries = () => API.get("/time-entry");