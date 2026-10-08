export const tabs = [
  { id: 'locations', label: 'Inventory Locations' },
  { id: 'categories', label: 'Inventory Categories' },
  { id: 'labor_roles', label: 'Labor Roles' },
  { id: 'divisions', label: 'Project Divisions' },
  { id: 'project_creation_type', label: 'Project Creation Type' },
  { id: 'lead_source', label: 'Leads Source' },
  {id: 'lead_status', label: 'Leads Status'}, 
  { id: "markup", label: "Alerts & Approvals" }
];

export const baseColumns = [
  { key: 'display_name', label: 'Display Name', width: '30%' },
  { key: 'value', label: 'Value', width: '25%' },
  { key: 'sort_order', label: 'Sort Order', width: '15%' },
];

export const config = {
  locations: { title: 'Inventory Locations', showHourlyRate: false },
  categories: { title: 'Inventory Categories', showHourlyRate: false },
  labor_roles: { title: 'Labor Roles', showHourlyRate: true },
  divisions: { title: 'Project Divisions', showHourlyRate: false },
  project_creation_type: { title: 'Project Creation Type', showHourlyRate: false },
  lead_source: { title: 'Leads Source', showHourlyRate: false },
  lead_status: { title: 'Leads Status', showHourlyRate: false },
  markup: { title: "Alerts & Approvals", showHourlyRate: false }
};
