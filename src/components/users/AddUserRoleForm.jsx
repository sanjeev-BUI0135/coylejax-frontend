import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, ChevronDown, ChevronRight, MessageSquare, LayoutDashboard, Building2, Calculator, Package, DollarSign, Users, Users2,
  Clock, Settings, FileText, FileCode2, Ban, MoreVertical, Info, Sparkles
} from "lucide-react";
import { widgetPermissions } from "@/config/widgetPermissions";
import toast from "react-hot-toast";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const modules = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Leads", icon: Users },
  { name: "Estimates", icon: Calculator },
  { name: "Projects", icon: Building2 },
  { name: "Material Orders", icon: Package },
  { name: "Inventory Management", icon: Package },
  { name: "Invoices", icon: DollarSign },
  { name: "Time Entry", icon: Clock },
  { name: "master data", icon: Settings },
  { name: "Customers", icon: Users },
  { name: "User Management", icon: Users2 },
  { name: "Add Client", icon: Users2 },
  { name: "Suppliers", icon: Building2 },
  { name: "Reports", icon: FileCode2 },
  { name: "Message", icon: MessageSquare },
  { name: "SMS Settings", icon: MessageSquare },
  { name: "Settings", icon: Settings },
  { name: "Glaciers AI", icon: Sparkles },
  { name: "Super Dashboard", icon: Users2 },
  { name: "Tenant", icon: Users2 },
  { name: "Profile", icon: Users2 },
  { name: "Inactive Projects", icon: Building2 },

  { name: "Payment Settings", icon: DollarSign },
];

const MASTER_DATA_SUBMODULES = [
  "Customers",
  "User Management",
  "Inactive Projects",
  "Suppliers",
  "Settings",
  "Payment Settings",
  "Estimates",
  "Invoices",
  "Material Orders",
  "Inventory Management",
];

const actions = ["delete", "update", "add", "view"];

const allowedActions = {
  Dashboard: ["view", "add", "update", "delete"],
  "Leads": ["view", "add", "update", "delete"],
  Estimates: ["view", "add", "update", "delete"],
  Projects: ["view", "add", "update", "delete"],
  "Material Orders": ["view", "add", "update", "delete"],
  "Inventory Management": ["view", "add", "update", "delete"],
  Invoices: ["view", "add", "update", "delete"],
  "Time Entry": ["view", "add", "update", "delete"],
  "User Management": ["view", "add", "update", "delete"],
  Message: ["view", "add", "update", "delete"],
  "SMS Settings": ["view", "add", "update", "delete"],
  "Add Client": ["view", "add", "update", "delete"],
  "Master Data": ["view", "add", "update", "delete"],
  "master data": ["view", "add", "update", "delete"],
  Customers: ["view", "add", "update", "delete"],
  "Suppliers": ["view", "add", "update", "delete"],
  "Settings": ["view", "add", "update", "delete"],
  "Super Dashboard": ['view', 'add', "update", 'delete'],
  Reports: ["view", "add", "update", "delete"],
  Tenant: ["view", "add", "update", 'delete'],
  Profile: ["view", "add", "update", "delete"],
  "Payment Settings": ["view", "add", "update", "delete"],
  "Inactive Projects": ["view", "add", "update", "delete"],
  "AllLeads": ["view", "add", "update", "delete"],
  "AssignedLeads": ["view", "add", "update", "delete"],
  "Glaciers AI": ["view", "add", "update", "delete"]
};

const AddUserRoleForm = ({ onCancel, onSave, existingRole }) => {

  const [roleName, setRoleName] = useState(existingRole?.name || "");
  const [status, setStatus] = useState(existingRole?.status || "active");
  const [permissions, setPermissions] = useState({});
  const [roleNameError, setRoleNameError] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [expandedModules, setExpandedModules] = useState({});
  const [allDataVisible, setAllDataVisible] = useState(
    existingRole?.all_data_visible || false
  );
  const [allLeadVisible, setAllLeadVisible] = useState(
    existingRole?.all_lead_visible || false
  );

  const restrictedModules = ["Add Client", "Super Dashboard", "Tenant", "Profile"];

  const visibleModules = modules
    .map(m => m.name === "master data" ? { ...m, name: "Master Data", icon: FileCode2 } : m)
    .filter((m) => !restrictedModules.includes(m.name) && !MASTER_DATA_SUBMODULES.includes(m.name));

  useEffect(() => {
    if (existingRole) {
      const permsObj = {};

      existingRole.permissions?.forEach((p) => {

        const isMasterDataSub = MASTER_DATA_SUBMODULES.includes(p.module);
        const moduleKey = isMasterDataSub ? "Master Data" : p.module;
        const widgetKey = isMasterDataSub ? p.module : (p.submenu_module || "module");

        if (!permsObj[moduleKey]) permsObj[moduleKey] = {};

        permsObj[moduleKey][widgetKey] = {
          view: !!p.canView,
          add: !!p.canAdd,
          update: !!p.canUpdate,
          delete: !!p.canDelete,
        };

      });

      setPermissions(permsObj);
      setStatus(existingRole.status || "active");
    }
  }, [existingRole]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  //  Toggle Module + Widget Permission
  const handlePermissionToggle = (module, action, widget = "module") => {

    setPermissions(prev => {

      const moduleData = prev[module] || {};
      const widgetData = moduleData[widget] || {};
      const newValue = !widgetData[action];

      const newState = {
        ...prev,
        [module]: {
          ...moduleData,
          [widget]: {
            ...widgetData,
            [action]: newValue
          }
        }
      };

      //  If toggling the main module, also toggle all its widgets
      if (widget === "module") {
        const widgets = widgetPermissions[module] || [];
        widgets.forEach(w => {
          const isDashboardViewOnly = module === "Dashboard";
          const isTimeEntryViewOnly = module === "Time Entry" && w !== "MyTimeEntries";
          const isProjectViewOnly = module === "Projects" && ["Details", "Termsandconditions", "Payments", "Financials"].includes(w);
          const isReportsViewOnly = module === "Reports" && w !== "CustomReport";
          const isViewOnlyAction = isDashboardViewOnly || isTimeEntryViewOnly || isProjectViewOnly || isReportsViewOnly;

          if (!(isViewOnlyAction && action !== "view")) {
            if (!newState[module][w]) newState[module][w] = {};
            newState[module][w] = {
              ...newState[module][w],
              [action]: newValue
            };
          }
        });
      }

      return newState;

    });

  };

  const handleSelectAll = (action) => {
    const itemsToUpdate = [];
    visibleModules.forEach(module => {
      const moduleName = module.name;
      if (allowedActions[moduleName]?.includes(action)) {
        itemsToUpdate.push({ module: moduleName, widget: "module" });
      }

      const widgets = widgetPermissions[moduleName] || [];
      widgets.forEach(widget => {
        const isDashboardViewOnly = moduleName === "Dashboard";
        const isTimeEntryViewOnly = moduleName === "Time Entry" && widget !== "MyTimeEntries";
        const isProjectViewOnly = moduleName === "Projects" && ["Details", "Termsandconditions", "Payments", "Financials"].includes(widget);
        const isReportsViewOnly = moduleName === "Reports" && widget !== "CustomReport";
        const isViewOnlyAction = isDashboardViewOnly || isTimeEntryViewOnly || isProjectViewOnly || isReportsViewOnly;

        if (!(isViewOnlyAction && action !== "view") && allowedActions[moduleName]?.includes(action)) {
          itemsToUpdate.push({ module: moduleName, widget: widget });
        }
      });
    });

    const anyUnselected = itemsToUpdate.some(item => !permissions[item.module]?.[item.widget]?.[action]);
    const newValue = anyUnselected;

    setPermissions(prev => {
      const next = { ...prev };
      itemsToUpdate.forEach(item => {
        if (!next[item.module]) next[item.module] = {};
        if (!next[item.module][item.widget]) next[item.module][item.widget] = {};
        next[item.module][item.widget] = {
          ...next[item.module][item.widget],
          [action]: newValue
        };
      });
      return next;
    });
  };

  const toggleModule = (moduleName) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  //  Convert State → Backend Format
  const buildPermissionsArray = () => {

    const result = [];

    Object.entries(permissions).forEach(([module, widgets]) => {

      Object.entries(widgets).forEach(([widgetName, actions]) => {

        if ((module === "Master Data" || module === "master data") && widgetName !== "module") {
          result.push({
            module: widgetName,
            submenu_module: null,
            canView: actions.view || false,
            canAdd: actions.add || false,
            canUpdate: actions.update || false,
            canDelete: actions.delete || false
          });
        } else {
          result.push({
            module,
            submenu_module: widgetName === "module" ? null : widgetName,
            canView: actions.view || false,
            canAdd: actions.add || false,
            canUpdate: actions.update || false,
            canDelete: actions.delete || false
          });
        }

      });

    });

    return result;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!roleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    if (!permissions || Object.keys(permissions).length === 0) {
      toast.error("At least one main module must have View permission.");
      return;
    }

    const hasMainModuleView = visibleModules.some(
      (module) =>
        permissions[module.name]?.module?.view === true
    );

    if (!hasMainModuleView) {
      toast.error("At least one main module must have View permission.");
      return;
    }

    onSave({
      name: roleName,
      status: status,
      permissions: buildPermissionsArray(),
      all_data_visible: allDataVisible,
      all_lead_visible: allLeadVisible
    });
  };
  return (
    <div >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {existingRole ? "Edit User Role" : "Add User Role"}
          </h1>
          <p className="text-gray-600 mt-1">
            View and manage user roles and permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">

          {/* Desktop Button */}
          {!isMobile && (
            <Button variant="outline" onClick={onCancel}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          {/* Mobile Dropdown */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onCancel}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="overflow-x-auto">
          <div className="min-w-[420px]">
            <div className="flex gap-4 mb-6 items-center">
              <Input
                placeholder="Role Name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="flex-1"
              />

              {/* Data Visibility Checkbox */}
              <label className="flex items-center gap-2 whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={allDataVisible}
                  onChange={(e) => setAllDataVisible(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  All Data Visible
                </span>
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>

                  <TooltipContent className="max-w-[250px] text-sm leading-relaxed">
                    <p>
                      Enable this option to allow the user to view all data like an
                      admin. If disabled, the user can only view data created by
                      them.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Lead Visibility Checkbox */}
              <label className="flex items-center gap-2 whitespace-nowrap cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={allLeadVisible}
                  onChange={(e) => setAllLeadVisible(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">
                  All Lead Visible
                </span>
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>

                  <TooltipContent className="max-w-[250px] text-sm leading-relaxed">
                    <p>
                      Enable this option to allow the user to view all leads like an
                      admin, regardless of the division they are in.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* HEADER */}
            <div className="grid grid-cols-[1fr_50px_50px_50px_50px] sm:grid-cols-5 border p-3 font-semibold bg-gray-50 dark:bg-[#111827]">
              <span>Module</span>
              {actions.map(a => (
                <span key={a} className="text-center">{a}</span>
              ))}
            </div>

            {/* SELECT ALL ROW */}
            <div className="grid grid-cols-[1fr_50px_50px_50px_50px] sm:grid-cols-5 border-x border-b p-3 items-center bg-blue-50/20">
              <div className="flex gap-2 items-center pl-8">
                <span className="font-bold text-blue-700 text-sm uppercase tracking-wider">Select All</span>
              </div>
              {actions.map(action => {
                const itemsToUpdate = [];
                visibleModules.forEach(module => {
                  const moduleName = module.name;
                  if (allowedActions[moduleName]?.includes(action)) {
                    itemsToUpdate.push({ module: moduleName, widget: "module" });
                  }
                  const widgets = widgetPermissions[moduleName] || [];
                  widgets.forEach(widget => {
                    const isDashboardViewOnly = moduleName === "Dashboard";
                    const isTimeEntryViewOnly = moduleName === "Time Entry" && widget !== "MyTimeEntries";
                    const isProjectViewOnly = moduleName === "Projects" && ["Details", "Termsandconditions", "Payments", "Financials"].includes(widget);
                    const isReportsViewOnly = moduleName === "Reports";
                    const isViewOnlyAction = isDashboardViewOnly || isTimeEntryViewOnly || isProjectViewOnly || isReportsViewOnly;
                    if (!(isViewOnlyAction && action !== "view") && allowedActions[moduleName]?.includes(action)) {
                      itemsToUpdate.push({ module: moduleName, widget: widget });
                    }
                  });
                });

                const allSelected = itemsToUpdate.length > 0 && itemsToUpdate.every(item => permissions[item.module]?.[item.widget]?.[action]);

                return (
                  <div key={action} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(action)}
                      className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${allSelected
                        ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-200 dark:shadow-blue-900/20"
                        : "border-blue-200 bg-white dark:bg-slate-800 hover:border-blue-400 group"
                        }`}
                    >
                      {allSelected ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-4 h-4 text-white"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <div className="w-2 h-2 rounded-sm bg-blue-100 dark:bg-blue-800 group-hover:bg-blue-200 transition-colors" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {visibleModules.map(({ name, icon: Icon }) => {
              const hasWidgets = widgetPermissions[name]?.length > 0;
              const isExpanded = expandedModules[name];

              return (
                <React.Fragment key={name}>
                  {/* MODULE ROW */}
                  <div className="grid grid-cols-[1fr_50px_50px_50px_50px] sm:grid-cols-5 border-b dark:border-gray-700 p-3 items-center hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex gap-2 items-center">
                      {hasWidgets ? (
                        <button
                          type="button"
                          onClick={() => toggleModule(name)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      ) : (
                        <span className="w-6" /> // Spacer
                      )}
                      <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        {name}
                        {hasWidgets && (
                          <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full tracking-wider border border-gray-200 dark:border-gray-700">
                            {
                              widgetPermissions[name]?.filter(w => permissions[name]?.[w]?.view).length || 0
                            }
                            /
                            {widgetPermissions[name]?.length}
                          </span>
                        )}
                      </span>
                    </div>

                    {actions.map((action) => {
                      const isAllowed = allowedActions[name]?.includes(action);
                      if (!isAllowed) return <div key={action} />;

                      const selected = permissions[name]?.module?.[action] || false;

                      return (
                        <div key={action} className="flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              handlePermissionToggle(name, action, "module")
                            }
                            className={`w-6 h-6 rounded-full border-2 transition-all ${selected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500"
                              }`}
                          >
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* WIDGET ROWS (Collapsible) */}
                  {hasWidgets && isExpanded && (
                    <div className="bg-gray-50 dark:bg-slate-900 border-b dark:border-gray-700 shadow-inner">
                      {widgetPermissions[name]?.map((widget) => (
                        <div
                          key={widget}
                          className="grid grid-cols-[1fr_50px_50px_50px_50px] sm:grid-cols-5 p-2 items-center hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="pl-12 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                            {widget.replace(/([A-Z])/g, ' $1').trim()}
                          </div>

                          {actions.map((action) => {
                            const isAllowed = allowedActions[name]?.includes(action);
                            if (!isAllowed) return <div key={action} />;

                            const selected = permissions[name]?.[widget]?.[action] || false;

                            // ✅ Only Dashboard and Time Entry widgets (except MyTimeEntries) → View only
                            const isDashboardViewOnly = name === "Dashboard";
                            const isTimeEntryViewOnly = name === "Time Entry" && widget !== "MyTimeEntries";
                            const isProjectViewOnly = name === "Projects" && ["Details", "Termsandconditions", "Payments", "Financials"].includes(widget);
                            const isReportsViewOnly = name === "Reports" && widget !== "CustomReport";
                            const isViewOnlyAction = isDashboardViewOnly || isTimeEntryViewOnly || isProjectViewOnly || isReportsViewOnly;

                            return (
                              <div key={action} className="flex justify-center">
                                {isViewOnlyAction && action !== "view" ? (
                                  <div className="w-5 h-5 flex items-center justify-center">
                                    <Ban className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePermissionToggle(name, action, widget)
                                    }
                                    className={`w-5 h-5 rounded-full border-2 transition-all ${selected
                                      ? "bg-blue-600 border-blue-600"
                                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500"
                                      }`}
                                  >
                                    {selected && (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="w-3.5 h-3.5 text-white mx-auto"
                                      >
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                Save
              </Button>
            </div>
          </div>
        </div>

      </form>

    </div>
  );
};

export default AddUserRoleForm;
