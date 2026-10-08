import localApi from '../services/localApi';

const createEntityService = (entityName) => {
  // Handle special endpoint mappings - COMPLETE LIST
  const endpointMap = {
    'MaterialOrder': '/materialorders',
    'InventoryItem': '/inventoryitems',
    'LaborEntry': '/laborentrys',
    'User': '/users',
    // Add any other special mappings your backend uses
    'Project': '/projects',
    'Customer': '/customers',
    'Estimate': '/estimates',
    'Payment': '/payments',
    'Invoice': '/invoices'
  };

  const endpoint = endpointMap[entityName] || `/${entityName.toLowerCase()}s`;
  const userEndpoint = '/users';
  return {
    // UPDATED: list function now accepts sort and limit parameters
    list: (sort, limit) => {
      const params = new URLSearchParams();

      // If first argument is an object, treat it as params
      if (typeof sort === 'object' && sort !== null) {
        Object.entries(sort).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value);
          }
        });
      } else {
        if (sort) {
          params.append('sort', sort);
        }
        if (limit) {
          params.append('limit', limit);
        }
      }

      // Cache-busting: prevent browser from serving stale 304 responses
      // especially important for search queries where results must always be fresh
      params.append('_t', Date.now());

      const queryString = params.toString();
      const url = entityName === 'User' ? userEndpoint : endpoint;
      return localApi.request(queryString ? `${url}?${queryString}` : url);
    },

    get: (id) => {
      const url = `${entityName === 'User' ? userEndpoint : endpoint}/${id}`;
      return localApi.request(url);
    },

    create: (data) => localApi.request(entityName === 'User' ? userEndpoint : endpoint, { method: 'POST', body: JSON.stringify(data) }),

    update: (id, data) => localApi.request(`${entityName === 'User' ? userEndpoint : endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id) => localApi.request(`${entityName === 'User' ? userEndpoint : endpoint}/${id}`, { method: 'DELETE' }),
    bulkDelete: (ids) => localApi.request(`${entityName === 'User' ? userEndpoint : endpoint}/bulk`, { method: 'DELETE', body: JSON.stringify({ ids }) }),

    // UPDATED: filter function now accepts a second 'sort' argument
    filter: (query, sort) => {
      const params = new URLSearchParams(query);
      if (sort) {
        params.append('sort', sort);
      }
      const queryString = params.toString();
      const url = entityName === 'User' ? userEndpoint : endpoint;
      return localApi.request(`${url}?${queryString}`);
    },

    me: () => localApi.getMe(),
    updateMyUserData: (data) => localApi.request('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  };
};

// Export services that mimic the original base44 entity structure
export const Project = createEntityService('Project');
export const Customer = createEntityService('Customer');
export const Lead = {
  ...createEntityService('Lead'),

  assign: (leadId, userId) =>
    localApi.request(`/leads/${leadId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    }),

  convert: (leadId) =>
    localApi.request(`/leads/${leadId}/convert`, {
      method: 'PUT'
    }),
  getStats: () => localApi.request('/leads/stats'),
  getSourceStats: (params = {}) => {
    const query = new URLSearchParams();

    if (params.from) {
      const fromDate = new Date(params.from);
      fromDate.setHours(0, 0, 0, 0);
      query.append("from", fromDate.toISOString());
    }

    if (params.to) {
      const toDate = new Date(params.to);
      toDate.setHours(23, 59, 59, 999);
      query.append("to", toDate.toISOString());
    }

    if (params.division) {
      query.append("division", params.division);
    }

    return localApi.request(`/leads/source-stats?${query.toString()}`);
  }

};

export const Estimate = {
  ...createEntityService('Estimate'),

  createQuick: (data) =>
    localApi.request('/estimates/quick', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateInvoicedAmount: (id, invoiced_amount) =>
    localApi.request(`/estimates/${id}/invoiced-amount`, {
      method: 'PUT',
      body: JSON.stringify({ invoiced_amount }),
    }),

  updateStatus: (id, status) =>
    localApi.request(`/estimates/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};
export const Payment = createEntityService('Payment');
export const Invoice = createEntityService('Invoice');
export const MaterialOrder = createEntityService('MaterialOrder');
export const InventoryItem = createEntityService('InventoryItem');
export const LaborEntry = createEntityService('LaborEntry');
export const User = createEntityService('User');
export const ActivityLog = {
  ...createEntityService('ActivityLog'),
  getByProject: (projectId, params) => {
    const query = new URLSearchParams(params).toString();
    return localApi.request(`/activity-logs/project/${projectId}${query ? `?${query}` : ''}`);
  },
  getByEntity: (entityId, params) => {
    const query = new URLSearchParams(params).toString();
    return localApi.request(`/activity-logs/entity/${entityId}${query ? `?${query}` : ''}`);
  }
};
export const Supplier = {
  ...createEntityService('Supplier'),

  bulkUpload: (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return localApi.request('/suppliers/bulk-upload', {
      method: 'POST',
      body: formData,
    });
  }
};
