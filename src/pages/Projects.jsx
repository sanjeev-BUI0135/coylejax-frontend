import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Building2, Download, MoreVertical, Filter, RefreshCw, Columns, Move } from "lucide-react";
import { Project } from "../api/entities"
import { AnimatePresence } from "framer-motion";
const ProjectForm = lazy(() => import("../components/projects/ProjectForm"));
const ProjectFilters = lazy(() => import("../components/projects/ProjectFilters"));
import ViewToggle from "../components/shared/ViewToggle";
import Pagination from "../components/shared/Pagination";
import BulkActions from "../components/shared/BulkActions";
import AdvancedFilters from "../components/shared/AdvanceFilters";
import Swal from "sweetalert2";
import localApi from "../services/localApi";
import { useProjectsData } from "../hooks/useProjectsData";
import TablePageSkeleton from "../components/ui/tableskeleton.jsx";
const ProjectCard = lazy(() => import("../components/projects/ProjectCard"));
const ProjectListRow = lazy(() => import("../components/projects/ProjectListRow.jsx"));
import { DEFAULT_PROJECT_VISIBLE_COLUMNS, PROJECT_LIST_COLUMN_OPTIONS } from "../config/columnConfigs.js";
import ColumnSelectMenu from "../components/shared/ColumnSelectMenu";
import { buildPermissionMap } from "../utils/buildPermissionMap.js";
import HierarchyUserSelect from "@/components/shared/HierarchyUserSelect";
import { useHierarchyUsers } from "@/hooks/useHierarchyUsers";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCreatedByUsers } from "../hooks/useCreatedByUsers";
import { formatDateUS, formatDateUTC } from "../utils/formatdate.js";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export default function Projects() {
  const { projects, setProjects, customers, divisions, loading, initialLoading, loadData, pagination } = useProjectsData();
  const [customerBids, setCustomerBids] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [awardedDate, setAwardedDate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [creatorFilter, setCreatorFilter] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");


    const sessionVal = sessionStorage.getItem("projects_creatorFilter");
    if (sessionVal !== null) return sessionVal;

    return storedUser._id || storedUser.id || "";
  });

  useEffect(() => {
    sessionStorage.setItem("projects_creatorFilter", creatorFilter);
  }, [creatorFilter]);
  const [itemsPerPage, setItemsPerPage] = useState(() => parseInt(localStorage.getItem('projectsItemsPerPage')) || 25);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    project_type: "all"
  });
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const hierarchyUsers = useHierarchyUsers(user);
  
  const createdByMap = useCreatedByUsers(allProjects);
  const creatorDropdownUsers = useMemo(() => {
    return [
      ...new Set(
        allProjects
          .map((p) => {
            const u = p.created_by_user || p.created_by;
            return typeof u === 'object' && u ? (u._id || u.id) : u;
          })
          .filter(Boolean)
      ),
    ]
      .filter(id => typeof id === 'string' && createdByMap[id] && createdByMap[id] !== "—" && createdByMap[id] !== "Deleted User")
      .map(id => ({ _id: id, full_name: createdByMap[id] }));
  }, [allProjects, createdByMap]);

  const [selectedItems, setSelectedItems] = useState([]);
  const [columnFilters, setColumnFilters] = useState({
    project_name: "",
    project_number: "",
    project_creation_type: "",
    project_type: "",
    location: "",
    createdAt: "",
    estimated_value: "",
    status: "",
    priority: "",
  });
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState(columnFilters);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('projectsViewMode') || 'list');
  const [showFilters, setShowFilters] = useState(false);
  const [me, setMe] = useState({});
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCompany && selectedCompany !== "all") count++;
    if (selectedProject && selectedProject !== "all") count++;
    if (selectedCustomer && selectedCustomer !== "all") count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.priority && filters.priority !== "all") count++;
    if (filters.project_type && filters.project_type !== "all") count++;
    if (awardedDate) count++;
    return count;
  }, [selectedCompany, selectedProject, selectedCustomer, filters, awardedDate]);
  const defaultColumns = DEFAULT_PROJECT_VISIBLE_COLUMNS;
  const initialColumnsList = PROJECT_LIST_COLUMN_OPTIONS
    .filter((col) => !col.hiddenForRoles?.includes(user?.role_type))
    .map((col) => ({ id: col.key, label: col.label }));

  const [allColumnsList, setAllColumnsList] = useState(() => {
    const saved = localStorage.getItem(`project_columns_order_v2_${user?.id || 'default'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Filter out any stale columns from cache that no longer exist in the config
        const validParsed = parsed.filter(col => initialColumnsList.some(c => c.id === col.id));

        // Ensure we use the most up-to-date labels from code config instead of cached labels
        const updatedParsed = validParsed.map(col => {
          const freshCol = initialColumnsList.find(c => c.id === col.id);
          return { ...col, label: freshCol.label };
        });

        // Add any missing columns from initialColumnsList
        const missing = initialColumnsList.filter(col => !updatedParsed.find(p => p.id === col.id));
        return [...updatedParsed, ...missing];
      } catch (e) {
        return initialColumnsList;
      }
    }
    return initialColumnsList;
  });

  useEffect(() => {
    localStorage.setItem(`project_columns_order_v2_${user?.id || 'default'}`, JSON.stringify(allColumnsList));
  }, [allColumnsList, user?.id]);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(`project_columns_v2_${user?.id || 'default'}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  useEffect(() => {
    localStorage.setItem(`project_columns_v2_${user?.id || 'default'}`, JSON.stringify(visibleColumns));
  }, [visibleColumns, user?.id]);

  useEffect(() => {
    const saved = localStorage.getItem(`project_columns_v2_${user?.id || 'default'}`);
    if (saved) {
      try {
        setVisibleColumns(JSON.parse(saved));
      } catch (e) {
        setVisibleColumns(defaultColumns);
      }
    } else {
      setVisibleColumns(defaultColumns);
    }
  }, [user?.id]);

  const projectPerms = buildPermissionMap(
    user.permissions,
    "Projects"
  );
  const canView = projectPerms.module?.view;
  const canAdd = projectPerms.module?.add;
  const canUpdate = projectPerms.module?.update;
  const canDelete = projectPerms.module?.delete;

  const userRole = (user.role_type || '').toLowerCase();
  const isBidUser = userRole === 'bid user';

  const customersById = useMemo(() => {
    const map = new Map();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe()
        setMe(res)
      } catch (error) {
        console.log(error)
      }
    }
    fetchMe()
  }, [])

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/projects?limit=0`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await res.json();

        const projectsData = Array.isArray(data)
          ? data
          : data.data || [];

        setAllProjects(projectsData);

        // Companies
        const companies = Array.from(
          new Set(
            projectsData
              .map(
                (p) => p?.customer_ids?.[0]?.company_name
              )
              .filter(Boolean)
          )
        );

        setAllCompanies(companies);

        // Customers
        const customersMap = new Map();

        projectsData.forEach((p) => {
          const customer = p?.customer_ids?.[0];

          if (customer) {
            customersMap.set(
              customer._id || customer.id,
              customer
            );
          }
        });

        setAllCustomers(
          Array.from(customersMap.values())
        );

      } catch (error) {
        console.log(error);
      }
    };

    fetchDropdownData();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleUserUpdated = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(updatedUser);
    };
    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
    }, 500);

    return () => clearTimeout(timeout);
  }, [columnFilters]);

  const filterDivisions = React.useMemo(() => {
    if (!divisions.length) return [];

    const companyId =
      user.role_type === "admin"
        ? user.id
        : me.created_by;

    return divisions.filter(d =>
      d.status === "active" &&
      String(d.created_by) === String(companyId)
    );
  }, [divisions, user.role_type, user.id, me.created_by]);

  useEffect(() => {
    if (canView) loadData(currentPage, itemsPerPage, creatorFilter, searchTerm,
      {
        company: selectedCompany,
        customer: selectedCustomer,
        project: selectedProject,
        status: filters.status,
        division: filters.project_type
      },
      debouncedColumnFilters
    );
  }, [canView, currentPage, itemsPerPage, creatorFilter, searchTerm, selectedCompany,
    selectedCustomer,
    selectedProject,
    filters.status,
    filters.project_type, debouncedColumnFilters, loadData]);

  useEffect(() => {
    localStorage.setItem('projectsItemsPerPage', itemsPerPage);
  }, [itemsPerPage]);

  const exportColumnMap = {
    project_name: {
      header: "Project Name",
      value: (project) => project.project_name || "",
    },
    company_name: {
      header: "Company Name",
      value: (project) =>
        project.customer_ids?.[0]?.company_name || "",
    },
    contact_name: {
      header: "Contact Name",
      value: (project) =>
        project.customer_ids?.[0]?.contact_name || "",
    },
    project_number: {
      header: "Project Number",
      value: (project) => project.project_number || "",
    },
    project_type: {
      header: "Division Type",
      value: (project) => project.project_type || "",
    },
    createdAt: {
      header: "Created Date",
      value: (project) =>
        project.createdAt
          ? formatDateUTC(project.createdAt)
          : "",
    },
    estimated_value: {
      header: "Value",
      value: (project) => project.estimated_value || "",
    },
    status: {
      header: "Status",
      value: (project) => project.status || "",
    },
    priority: {
      header: "Priority",
      value: (project) => project.priority || "",
    },
    location: {
      header: "Site Address",
      value: (project) => project.location || "",
    },
    description: {
      header: "Description",
      value: (project) => project.description || "",
    },
    requirements: {
      header: "Scope of Work",
      value: (project) => project.requirements ? String(project.requirements).replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim() || "-" : "-",
    },
    special_instructions: {
      header: "Notes",
      value: (project) => project.special_instructions ? String(project.special_instructions).replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim() || "-" : "-",
    },
    project_creation_type: {
      header: "Project Type",
      value: (project) =>
        project.project_creation_type || "",
    },
    materials_status: {
      header: "Materials",
      value: (project) =>
        project.materials_status || "",
    }
  };

  const handleExport = async () => {
    try {
      setSelectedItems([]);

      const token = localStorage.getItem("token");

      // Fetch ALL projects
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/projects?limit=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      const allProjectsData = Array.isArray(data)
        ? data
        : data.data || [];

      if (allProjectsData.length === 0) {
        alert("No projects to export.");
        return;
      }

      const exportColumns = visibleColumns.filter(
        (col) => exportColumnMap[col]
      );

      const headers = exportColumns.map(
        (col) => exportColumnMap[col].header
      );

      const escapeCsvField = (field) => {
        const str = String(field || "");

        if (
          str.includes(",") ||
          str.includes('"') ||
          str.includes("\n")
        ) {
          return `"${str.replace(/"/g, '""')}"`;
        }

        return str;
      };

      const rows = allProjectsData.map((project) => {
        return exportColumns
          .map((col) =>
            escapeCsvField(
              exportColumnMap[col].value(project)
            )
          )
          .join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      link.download = `Projects_${new Date().toISOString().slice(0, 10)
        }.csv`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export projects");
    }
  };

  const handleSubmit = useCallback(async (projectData) => {
    try {
      let response;
      if (editingProject) {
        response = await fetch(`${import.meta.env.VITE_API_BASE}/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(projectData)
        });
      } else {
        if (!canAdd) {
          return Swal.fire({
            icon: 'error',
            title: 'Permission Denied',
            text: 'You do not have permission to add projects.'
          });
        }
        response = await fetch(`${import.meta.env.VITE_API_BASE}/projects`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(projectData)
        });
      }

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `Project ${editingProject ? 'updated' : 'created'} successfully.`,
          timer: 2000,
          showConfirmButton: false
        });
        setShowForm(false);
        setEditingProject(null);
        loadData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save project');
      }
    } catch (error) {
      console.error("Error saving project:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || "An unexpected error occurred while saving the project."
      });
    }
  }, [editingProject, canAdd, canUpdate, loadData]);

  const handleEdit = useCallback(async (project) => {
    setSelectedItems([]);
    const res = await fetch(`${import.meta.env.VITE_API_BASE}/bids?project_id=${project._id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });
    const bids = await res.json();

    const acceptedBid = bids.find(
      (bid) => bid.status?.toLowerCase() === "accepted"
    );

    if (acceptedBid?.reviewed_at) {
      setAwardedDate(acceptedBid.reviewed_at);
    } else {
      setAwardedDate(null);
    }
    setEditingProject(project);
    openForm();
  }, [canUpdate]);

  const handleDeleteProject = async (project) => {
    try {
      Swal.fire({
        title: 'Deleting...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await fetch(`${import.meta.env.VITE_API_BASE}/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete project');

      setProjects(prev => prev.filter(p => p.id !== project.id));
      setSelectedItems(prev => prev.filter(id => id !== project.id));
      Swal.fire('Deleted!', 'Project has been deleted.', 'success');
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedItems.length} project(s). This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Deleting...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        await Project.bulkDelete(selectedItems);
        setProjects(prev => prev.filter(p => !selectedItems.includes(p.id)));
        setSelectedItems([]);
        Swal.fire('Deleted!', 'Projects have been deleted.', 'success');
      } catch (error) {
        console.error("Error deleting projects:", error);
        Swal.fire('Error', 'Failed to delete projects.', 'error');
      }
    }
  };

  const handleStatusChange = useCallback(async (projectId, newStatus, lostReason = null) => {

    try {
      const updateData = { status: newStatus };
      if (newStatus === "lost" && lostReason) {
        updateData.lost_reason = lostReason;
      }
      await fetch(`${import.meta.env.VITE_API_BASE}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      loadData();
      Swal.fire("Updated", `Project status changed to "${newStatus}".`, "success");
    } catch (error) {
      console.error("Error updating project status:", error);
      Swal.fire("Error", "Failed to update project status.", "error");
    }
  }, [canUpdate, loadData]);

  // UPDATED: Simplified handleBidSubmit - No customer creation
  const handleBidSubmit = useCallback(async (bidData) => {
    try {
      // Direct bid submission - bidData already has submitted_by_id from dialog
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/bids`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bidData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit bid');
      }

      await loadData();
    } catch (error) {
      console.error('Error submitting bid:', error);
      throw error;
    }
  }, [loadData]);

  const openForm = useCallback(() => setShowForm(true), []);
  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingProject(null);
  }, []);

  const handleSelectItem = useCallback((id, checked) => {
    setSelectedItems(prev =>
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  }, []);

  const setColumnFilter = useCallback((column, value) => {
    setCurrentPage(1);
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  }, []);

  const getProjectDisplayStatus = useCallback((project) => {
    if (user.role_type) {
      return project.status;
    }
    if (project.status === 'reopen') {
      return canUpdate ? 'reopen' : null;
    }
    const hasBid = customerBids.some(bid => {
      const bidProjectId = bid.project_id?._id || bid.project_id;
      return bidProjectId === project.id || bidProjectId === project._id;
    });

    const wonBid = customerBids.some(bid => {
      const bidProjectId = bid.project_id?._id || bid.project_id;
      return (
        (bidProjectId === project.id || bidProjectId === project._id) &&
        bid.status === 'accepted'
      );
    });
    if (wonBid && project.status === 'awarded') {
      return 'awarded';
    }
    if (['awarded', 'lost', 'cancelled', 'completed', 'processing'].includes(project.status)) {
      return null;
    }
    if (hasBid) {
      return 'bid_submitted';
    }
    return 'open_bids';
  }, [customerBids, user.role_type, canUpdate]);

  const getStatusChangeHandler = useCallback((projectId) => (e, status, lostReason) => {
    e && e.preventDefault();
    handleStatusChange(projectId, status, lostReason);
  }, [handleStatusChange]);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setSearchInput("");
    setCurrentPage(1);
    setFilters({
      status: "all",
      priority: "all",
      project_type: "all"
    });
    setSelectedProject("all");
    setSelectedCustomer("all");
    setSelectedCompany("all");
    setCreatorFilter("");
    setColumnFilters({
      project_name: "",
      project_number: "",
      project_creation_type: "",
      project_type: "",
      location: "",
      createdAt: "",
      estimated_value: "",
      status: "",
      priority: "",
    });
  }, []);

  const shouldShowProject = useCallback((project) => {
    if (canView) {
      return true;
    }
    if (isBidUser) {
      const displayStatus = getProjectDisplayStatus(project);
      if (!displayStatus) {
        return false;
      }
      return ['open_bids', 'bid_submitted', 'awarded'].includes(displayStatus);
    }
    return true;
  }, [canView, isBidUser, getProjectDisplayStatus]);

  const normalize = (str) =>
    (str || "")
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Client-side search and filter on server-provided data
  const filteredProjects = projects

  const handleSelectAll = useCallback((checked) => {
    setSelectedItems(checked ? filteredProjects.map(p => p.id) : []);
  }, [filteredProjects]);

  const filteredProjectsWithDisplayStatus = useMemo(() => {
    return filteredProjects.map(project => ({
      ...project,
      displayStatus: getProjectDisplayStatus(project),
    }));
  }, [filteredProjects, getProjectDisplayStatus]);

  // Use server pagination
  const totalPages = pagination.pages || 1;
  const paginatedProjects = filteredProjects;

  useEffect(() => {
    localStorage.setItem('projectsViewMode', viewMode);
    localStorage.setItem('projectsShowFilters', showFilters);
  }, [viewMode, showFilters]);

  if (initialLoading) return <TablePageSkeleton />;

  const projectStatusOptions = [
    "open",
    "processing",
    "actively_working",
    "cancelled"
  ];
  return (
    <div>
      <>
        <div className="mb-8 flex justify-between items-center gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold">Projects</h1>
            <p className="mt-1">
              {isBidUser
                ? "Browse available projects and track your bids"
                : "Manage your construction projects"
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => { setSelectedItems([]); setShowFilters(!showFilters); }}
              className={`h-10 px-3 relative ${showFilters ? "border-2 border-transparent" : ""}`}
            >
              <Filter className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <div className="w-[180px] hidden md:block">
                <HierarchyUserSelect
                  users={creatorDropdownUsers}
                  value={creatorFilter}
                  onChange={(value) => {
                    setCreatorFilter(value === "all" ? "" : value);
                    setCurrentPage(1);
                  }}
                />
            </div>

            {/* Desktop buttons */}
            {!isMobile && (
              <>
                <ColumnSelectMenu
                  columns={allColumnsList.map((col) => ({
                    key: col.id,
                    label: col.label,
                  }))}
                  visibleColumnKeys={visibleColumns}
                  onVisibleColumnKeysChange={setVisibleColumns}
                  onReset={() => setVisibleColumns(defaultColumns)}
                />

                <ViewToggle view={viewMode} onViewChange={setViewMode} />

                {canUpdate && (
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="w-4 h-4" />
                  </Button>
                )}

                {canAdd && (
                  <Button
                    onClick={() => { setSelectedItems([]); openForm(); }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                )}
              </>
            )}

            {/* Mobile dropdown */}
            {isMobile && (
              <DropdownMenu >
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">

                  {canUpdate && (
                    <DropdownMenuItem onClick={handleExport}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                  )}

                  {canAdd && (
                    <DropdownMenuItem onClick={openForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      New Project
                    </DropdownMenuItem>
                  )}

                </DropdownMenuContent>
              </DropdownMenu>
            )}

          </div>
        </div>

        <Suspense fallback={<TablePageSkeleton />}>
          {showForm && (
            <ProjectForm
              divisions={divisions}
              project={editingProject}
              customers={customers}
              onSubmit={handleSubmit}
              onCancel={closeForm}
              awardedDate={awardedDate}
            />
          )}
        </Suspense>

        {showFilters && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-2 shadow-sm flex flex-wrap gap-1 items-center mb-3">

            {/* Company Select */}
            <div className="w-[180px]">
              <Select
                value={selectedCompany}
                onValueChange={(value) => {
                  setSelectedCompany(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Company" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    Select Company
                  </SelectItem>

                  {allCompanies.map((company) => (
                    <SelectItem
                      key={company}
                      value={company}
                    >
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Select */}
            <div className="w-[180px]">
              <Select
                value={selectedProject}
                onValueChange={(value) => {
                  setSelectedProject(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Select Project</SelectItem>
                  {allProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer Select */}
            <div className="w-[180px]">
              <Select
                value={selectedCustomer}
                onValueChange={(value) => {
                  setSelectedCustomer(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Contact" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    Select Contact
                  </SelectItem>

                  {allCustomers.map((customer) => (
                    <SelectItem
                      key={customer._id || customer.id}
                      value={customer._id || customer.id}
                    >
                      {customer.contact_name ||
                        customer.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status, Priority, Division */}
            <Suspense fallback={<div className=" bg-gray-100 animate-pulse rounded" />}>
              <ProjectFilters
                filters={filters}
                onFilterChange={(newFilters) => {
                  setFilters(newFilters);
                  setCurrentPage(1);
                }}
                divisions={filterDivisions}
                statusOptions={projectStatusOptions}
                compact={true}
              />
            </Suspense>

            {/* Reset */}
            <Button
              variant="outline"
              size="icon"
              onClick={resetFilters}
              className="h-10 w-10 ml-auto"
              title="Reset Filters"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2 items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by projects name, Contact name, Project number..."
                value={searchInput}
                onChange={(e) => { setSelectedItems([]); setCurrentPage(1); setSearchInput(e.target.value) }}
                className="pl-10 h-10"
              />
            </div>
          </div>

          <BulkActions
            selectedCount={selectedItems.length}
            onDelete={handleBulkDelete}
            onClear={() => setSelectedItems([])}
          />
        </div>

        <Suspense fallback={<TablePageSkeleton />}>
          {!isMobile && viewMode === "list" ? (
            <ProjectListRow
              projects={paginatedProjects}
              customers={customers}
              divisions={divisions}
              users={hierarchyUsers}
              canEdit={canUpdate}
              canDelete={canDelete}
              onClearSelection={() => setSelectedItems([])}
              onEdit={handleEdit}
              onStatusChange={handleStatusChange}
              onDelete={handleDeleteProject}
              onBidSubmit={handleBidSubmit}
              onDuplicate={loadData}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectAll={handleSelectAll}
              columnFilters={columnFilters}
              onColumnFilterChange={setColumnFilter}
              totalFilteredCount={filteredProjects.length}
              visibleColumnKeys={visibleColumns}
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {paginatedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    customers={customers}
                    canEdit={canUpdate}
                    canDelete={canDelete}
                    onEdit={handleEdit}
                    onClearSelection={() => setSelectedItems([])}
                    onStatusChange={getStatusChangeHandler(project.id)}
                    onDelete={handleDeleteProject}
                    onBidSubmit={handleBidSubmit}
                    onDuplicate={loadData}
                    selectedItems={selectedItems}
                    onSelectItem={handleSelectItem}
                    totalFilteredCount={filteredProjects.length}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </Suspense>

        {paginatedProjects.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="mt-2">
              {isBidUser
                ? "No available projects to bid on at the moment"
                : canAdd
                  ? "Get started by creating your first project"
                  : "No projects available at the moment"
              }
            </p>
          </div>
        )}

        {paginatedProjects.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={pagination.total}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(value) => {
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          />
        )}

      </>


    </div>
  );
}
