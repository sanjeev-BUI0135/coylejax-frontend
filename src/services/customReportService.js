import localApi from "./localApi";

const customReportService = {
  getCustomReports: () => localApi.request("/custom-reports"),
  getCustomReportById: (id) => localApi.request(`/custom-reports/${id}`),
  createCustomReport: (data) =>
    localApi.request("/custom-reports", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCustomReport: (id, data) =>
    localApi.request(`/custom-reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteCustomReport: (id) =>
    localApi.request(`/custom-reports/${id}`, {
      method: "DELETE",
    }),
  getReportHistory: (id) => localApi.request(`/custom-reports/${id}/history`),
  getReportData: (id, params) => {
    let url = `/custom-reports/${id}/data`;
    if (params) {
      const query = new URLSearchParams(params).toString();
      url += `?${query}`;
    }
    return localApi.request(url);
  },
  exportReport: (id, params) => {
    let url = `/custom-reports/${id}/export`;
    if (params) {
      const query = new URLSearchParams(params).toString();
      url += `?${query}`;
    }
    return localApi.request(url);
  },
};

export default customReportService;
