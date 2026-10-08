// Replace the base44 createPageUrl with a simple local version
export const createPageUrl = (pageName: string, params: string = '') => {
  const pageRoutes: any = {
    'Dashboard': '/dashboard',
    'Projects': '/projects',
    'Customers': '/customers',
    'Estimates': '/estimates',
    'Invoices': '/invoices',
    'TimeEntry': '/time-entry',
    'UserManagement': '/user-management',
    'Inventory': '/inventory',
    'MaterialOrders': '/material-orders',
    'ProjectDetails': '/projects', // Will append ID
    'InvoiceDetails': '/invoices', // Will append ID
    'MaterialOrderDetails': '/material-orders', // Will append ID
    'CustomerDetails': '/customers', // Will append ID
    'EstimateDetails': '/estimate', // Will append ID (singular as per App.jsx)
    'project-report': '/project-report',
    'estimate-report': '/estimate-report',
    'invoice-report': '/invoice-report',
    'material-order-report': '/material-order-report',
    'inventory-log-report': '/inventory-log-report',
    'custom-report': '/custom-report',
    'glaciers-ai': '/glaciers-ai',
  };

  // Handle ID-based routes differently
  const [basePage, queryParams] = pageName.split('?');
  const route = pageRoutes[basePage] || `/${basePage.toLowerCase()}`;
  const allParams = (queryParams ? `${queryParams}&${params}` : params).replace(/^&|&$/, '');

  if (allParams && allParams.includes('id=')) {
    const id = allParams.split('id=')[1].split('&')[0];
    return `${route}/${id}`;
  }

  return allParams ? `${route}?${allParams}` : route;
};

// Add this helper function for URL parameters
export const getUrlParams = () => {
  return new URLSearchParams(window.location.search);
};

// Add this helper to get URL path parameters (like /invoices/123)
export const getPathParam = (paramName: string) => {
  // This is a simple implementation - you might want to use useParams from react-router-dom instead
  const pathParts = window.location.pathname.split('/');
  if (paramName === 'id') {
    return pathParts[pathParts.length - 1];
  }
  return null;
};