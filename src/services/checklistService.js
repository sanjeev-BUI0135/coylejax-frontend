import localApi from "./localApi";
import axios from "axios";

const API_URL = "/checklists";

export const getChecklists = (projectId) => localApi.request(`${API_URL}/project/${projectId}`);

export const addChecklist = (data) => localApi.request(API_URL, {
  method: 'POST',
  body: JSON.stringify(data)
});

export const updateChecklist = (id, data) => localApi.request(`${API_URL}/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data)
});

export const getChecklist = (id) => localApi.request(`${API_URL}/${id}`);

export const deleteChecklist = (id) => localApi.request(`${API_URL}/${id}`, {
  method: 'DELETE'
});

export const deleteFile = (id, fileIndex) => localApi.request(`${API_URL}/${id}/files/${fileIndex}`, {
  method: 'DELETE'
});

export const uploadFiles = (id, formData) =>
  localApi.request(`${API_URL}/${id}/upload`, {
    method: 'POST',
    body: formData
  });

export const getEstimate = (token, userToken) => {
  return axios.get(`${import.meta.env.VITE_API_BASE}/estimates/estimate-print`, {
    params: { token }, 
    headers: userToken
      ? { Authorization: `Bearer ${userToken}` } 
      : {},
  });
};