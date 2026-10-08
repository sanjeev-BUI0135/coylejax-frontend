const RAW_BASE =
  (typeof window !== 'undefined' && window.__APP_CONFIG__?.API_BASE_URL) ??
  import.meta.env.VITE_API_BASE

const base = String(RAW_BASE).trim().replace(/\/+$/, '');

const API_BASE_URL = import.meta.env.DEV
  ? base
  : (/\/api$/i.test(base) ? base : `${base}/api`);

const handleResponse = async (response) => {
  const contentType = response.headers.get("content-type");

  if (contentType && (
    contentType.includes("application/pdf") ||
    contentType.includes("text/csv") ||
    contentType.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
    contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
  )) {
    return response.blob();
  }

  let data = {};
  let textContent = "";
  try {
    textContent = await response.text();
    data = JSON.parse(textContent);
  } catch (e) {
    if (response.status === 413) {
      data = { error: "File is too large. Maximum allowed file size is 10 MB." };
    } else {
      if (textContent && textContent.trim().startsWith('<')) {
        data = { error: response.statusText || `HTTP Error ${response.status}` };
      } else {
        data = { error: textContent || response.statusText };
      }
    }
  }

  if (!response.ok) {
    // FIX: throw structured error
    throw {
      message: data.error || data.message || `HTTP Error ${response.status}`,
      response: {
        data,
        status: response.status
      }
    };
  }

  return data;
};

const localApi = {
  request: async (endpoint, options = {}) => {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');
    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers, credentials: "include", cache: "no-store" };

    try {
      const response = await fetch(fullUrl, config);
      return handleResponse(response);
    } catch (error) {
      throw error;
    }
  },
  // --- Authentication ---
  login: (credentials) => localApi.request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  register: (userData) => localApi.request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),

  getMe: () => localApi.request('/auth/me'),

  forgotPassword: (data) => localApi.request('/auth/forgotPassword', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  resetPassword: (data) => localApi.request('/auth/resetPassword', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getAll: () => localApi.request('/users'),

  // --- Integrations ---
  integrations: {
    UploadFile: async ({ file }) => {
      const formData = new FormData();
      formData.append('file', file);

      return localApi.request('/integrations/upload-file', {
        method: 'POST',
        body: formData,
      });
    },

    SendEmail: async ({ to, subject, body, from_name = null, reply_to_email = null, isHTML = false }) => {
      return localApi.request('/integrations/send-email', {
        method: 'POST',
        body: JSON.stringify({ to, subject, body, from_name, reply_to_email, isHTML }),
      });
    },

    SendSms: async ({ to, body, isWhatsApp = false }) => {
      return localApi.request('/integrations/send-sms', {
        method: 'POST',
        body: JSON.stringify({ to, body, isWhatsApp }),
      });
    },

    InvokeLLM: async ({ prompt, add_context_from_internet = false, response_json_schema = null, file_urls = null }) => {
      return localApi.request('/integrations/invoke-llm', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          add_context_from_internet,
          response_json_schema,
          file_urls
        }),
      });
    },

    GenerateImage: async ({ prompt }) => {
      return localApi.request('/integrations/generate-image', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
    },

    ExtractDataFromUploadedFile: async ({ file_url, json_schema }) => {
      return localApi.request('/integrations/extract-data', {
        method: 'POST',
        body: JSON.stringify({ file_url, json_schema }),
      });
    },
  },

  // --- Backend Functions ---
  functions: {
    generateInvoicePdf: async (invoiceId) => {
      return localApi.request(`/functions/generate-invoice-pdf/${invoiceId}`, {
        method: 'POST',
      });
    },

    generateEstimatePdf: async (estimateId) => {
      return localApi.request(`/functions/generate-estimate-pdf/${estimateId}`, {
        method: 'POST',
      });
    },

    exportLaborToPdf: async (projectId, filters = {}) => {
      return localApi.request(`/functions/export-labor-pdf/${projectId}`, {
        method: 'POST',
        body: JSON.stringify(filters),
      });
    },

    exportLaborToCsv: async (projectId, filters = {}) => {
      return localApi.request(`/functions/export-labor-csv/${projectId}`, {
        method: 'POST',
        body: JSON.stringify(filters),
      });
    },

    sendInvoiceSms: async (invoiceId, data) => {
      return localApi.request(`/invoices/${invoiceId}/send-sms`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    sendEstimateSms: async (estimateId, data) => {
      return localApi.request(`/estimates/${estimateId}/send-sms`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    getPublicInvoice: async (token) => {
      return localApi.request(`/functions/public-invoice/${token}`);
    },
    getPublicEstimate: async (token) => {
      return localApi.request(`/functions/public-estimate/${token}`);
    },
    generatePublicInvoicePdf: async (token) => {
      return localApi.request(`/functions/public-invoice-pdf/${token}`, {
        method: 'POST',
      });
    },

    acceptEstimate: async (token) => {
      return localApi.request(`/functions/accept-estimate/${token}`, {
        method: 'POST',
      });
    },

    getChatContacts: () => localApi.request('/messages/contacts'),
    getChatHistory: (phone) => localApi.request(`/messages/history/${phone}`),
    markAsRead: (phone) => localApi.request(`/messages/read/${phone}`, { method: 'POST' }),
    sendChatMessage: (data) => localApi.request('/messages/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    // SMS Settings
    getSmsSettings: () => localApi.request('/sms-settings'),
    saveSmsSettings: (data) => localApi.request('/sms-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    deleteSmsSettings: () => localApi.request('/sms-settings', {
      method: 'DELETE',
    }),
  },

  projects: {
    getDashboardProjects: () =>
      localApi.request("/projects/all/dashboard"),
  },
};

export default localApi;