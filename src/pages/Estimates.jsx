import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Estimate, Project, Customer } from "../api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Calculator, ArrowRight, Download, Zap, MoreVertical, Filter, RefreshCw } from "lucide-react";
import { AnimatePresence, m } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EstimateCard from "../components/estimates/EstimateCard";
import EstimateForm from "../components/estimates/EstimateForm";
import ProjectForm from "../components/projects/ProjectForm";
import Swal from "sweetalert2";
import { DEFAULT_ESTIMATE_VISIBLE_COLUMNS, ESTIMATE_LIST_COLUMN_OPTIONS } from "../config/columnConfigs";
import EstimateListRow, { getDivisionDisplayName } from "../components/estimates/EstimateListRow";
import { generateEstimatePdf, generateEstimateDocx } from "@/api/functions";
import ViewToggle from "../components/shared/ViewToggle";
import ColumnSelectMenu from "../components/shared/ColumnSelectMenu";
import Pagination from "../components/shared/Pagination";
import BulkActions from "../components/shared/BulkActions";
import AdvancedFilters from "../components/shared/AdvanceFilters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import localApi from "../services/localApi";
import TablePageSkeleton from "../components/ui/tableskeleton";
import HierarchyUserSelect from "@/components/shared/HierarchyUserSelect";
import { useHierarchyUsers } from "@/hooks/useHierarchyUsers";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, } from "@/components/ui/dropdown-menu";
import { useCreatedByUsers } from "../hooks/useCreatedByUsers";
import masterDataService from "@/services/masterDataService";
import { formatDateUS, formatDateUTC } from "../utils/formatdate";
import { formatCurrency } from "../lib/utils";
import useDebounce from "@/hooks/useDebounce";

const getEstimateColumnStorageKey = (user = {}) => {
  const userId = user.id || user._id || user.email || "default";
  const role = user.role_type || "user";
  return `estimateListVisibleColumns:${role}:${userId}`;
};

const getAvailableEstimateColumnKeys = (user = {}) => (
  ESTIMATE_LIST_COLUMN_OPTIONS
    .filter((column) => !column.hiddenForRoles?.includes(user.role_type))
    .map((column) => column.key)
);

const getDefaultEstimateColumns = (user = {}) => {
  const availableKeys = getAvailableEstimateColumnKeys(user);
  return DEFAULT_ESTIMATE_VISIBLE_COLUMNS.filter((key) => availableKeys.includes(key));
};

const readStoredEstimateColumns = (user = {}) => {
  try {
    const stored = localStorage.getItem(getEstimateColumnStorageKey(user));
    const parsed = stored ? JSON.parse(stored) : null;
    const availableKeys = getAvailableEstimateColumnKeys(user);
    const visibleKeys = Array.isArray(parsed)
      ? parsed.filter((key) => availableKeys.includes(key))
      : [];

    return visibleKeys.length > 0 ? visibleKeys : getDefaultEstimateColumns(user);
  } catch {
    return getDefaultEstimateColumns(user);
  }
};

export default function Estimates() {
  const [estimates, setEstimates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [convertingEstimate, setConvertingEstimate] = useState(null);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const searchTerm = useDebounce(searchInput, 500);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [visibleEstimateColumns, setVisibleEstimateColumns] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    return readStoredEstimateColumns(storedUser);
  });
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('estimatesViewMode') || 'list');
  const [showFilters, setShowFilters] = useState();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => parseInt(localStorage.getItem('estimatesItemsPerPage')) || 25);
  const [selectedItems, setSelectedItems] = useState([]);
  const [creatorFilter, setCreatorFilter] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const sessionVal = sessionStorage.getItem("estimates_creatorFilter");
    if (sessionVal !== null) return sessionVal;

    return storedUser._id || storedUser.id || "";
  });

  useEffect(() => {
    sessionStorage.setItem("estimates_creatorFilter", creatorFilter);
  }, [creatorFilter]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [me, setMe] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    estimateType: "all"
  });
  const [columnFilters, setColumnFilters] = useState({
    estimate_number: "",
    customer_po_number: "",
    project_name: "",
    company_name: "",
    customer_name: "",
    email_address: "",
    site_address: "",
    billing_address: "",
    type: "",
    scope_of_work: "",
    additional_markup: "",
    notes: "",
    created_date: "",
    valid_until: "",
    total_amount: "",
    status: ""
  });
  const debouncedColumnFilters = useDebounce(columnFilters, 500);
  const [prevFilters, setPrevFilters] = useState(() => ({
    searchTerm: "",
    selectedProject: "all",
    selectedCompany: "all",
    selectedCustomer: "all",
    status: "all",
    type: "all",
    estimateType: "all",
    columnFilters: {
      estimate_number: "",
      customer_po_number: "",
      project_name: "",
      company_name: "",
      customer_name: "",
      email_address: "",
      site_address: "",
      billing_address: "",
      type: "",
      scope_of_work: "",
      additional_markup: "",
      notes: "",
      created_date: "",
      valid_until: "",
      total_amount: "",
      status: ""
    }
  }));
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCompany && selectedCompany !== "all") count++;
    if (selectedProject && selectedProject !== "all") count++;
    if (selectedCustomer && selectedCustomer !== "all") count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.type && filters.type !== "all") count++;
    if (filters.estimateType && filters.estimateType !== "all") count++;
    return count;
  }, [selectedCompany, selectedProject, selectedCustomer, filters]);
  const location = useLocation();
  const [prefillLead, setPrefillLead] = useState(null);
  const [allEstimates, setAllEstimates] = useState([]);
  const hierarchyUsers = useHierarchyUsers(user);

  useEffect(() => {
    const fetchAllEstimates = async () => {
      try {
        const probeResp = await Estimate.list({ limit: 1 });
        const total = probeResp?.total || 1000;
        const estimatesResp = await Estimate.list({ limit: total });
        const data = Array.isArray(estimatesResp) ? estimatesResp : (estimatesResp?.data || []);
        setAllEstimates(data);
      } catch (err) {
        console.error("Failed to fetch all estimates for dropdown", err);
      }
    };
    fetchAllEstimates();
  }, []);

  const createdByMap = useCreatedByUsers(allEstimates);
  const creatorDropdownUsers = useMemo(() => {
    return [
      ...new Set(
        allEstimates
          .map((e) => {
            const u = e.created_by_user || e.created_by;
            return typeof u === 'object' && u ? (u._id || u.id) : u;
          })
          .filter(Boolean)
      ),
    ]
      .filter(id => typeof id === 'string' && createdByMap[id] && createdByMap[id] !== "—" && createdByMap[id] !== "Deleted User")
      .map(id => ({ _id: id, full_name: createdByMap[id] }));
  }, [allEstimates, createdByMap]);

  const modules = user.permissions || [];
  const estimateTabPermission = modules.find(
    p =>
      p.module?.toLowerCase() === "projects" &&
      p.submenu_module?.toLowerCase() === "estimates"
  );
  const canView = estimateTabPermission?.canView ?? false;
  const canAdd = estimateTabPermission?.canAdd ?? false;
  const isAdmin = user?.role_type?.toLowerCase() === "admin";
  const canUpdate = isAdmin || (estimateTabPermission?.canUpdate ?? false);
  const canDelete = estimateTabPermission?.canDelete ?? false;

  const navigate = useNavigate();

  useEffect(() => {
    const handleUserUpdated = () => {
      const updatedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUser(updatedUser);
    };
    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, []);

  // Load metadata once when permission is verified
  useEffect(() => {
    if (canView) {
      loadMetadata();
    }
  }, [canView]);

  // Reset page to 1 when search or filters change
  useEffect(() => {
    const filterChanged =
      prevFilters.searchTerm !== searchTerm ||
      prevFilters.selectedProject !== selectedProject ||
      prevFilters.selectedCompany !== selectedCompany ||
      prevFilters.selectedCustomer !== selectedCustomer ||
      prevFilters.status !== filters.status ||
      prevFilters.type !== filters.type ||
      prevFilters.estimateType !== filters.estimateType ||
      JSON.stringify(prevFilters.columnFilters) !== JSON.stringify(debouncedColumnFilters);

    if (filterChanged) {
      setPrevFilters({
        searchTerm,
        selectedProject,
        selectedCompany,
        selectedCustomer,
        status: filters.status,
        type: filters.type,
        estimateType: filters.estimateType,
        columnFilters
      });
      setCurrentPage(1);
    }
  }, [searchTerm, selectedProject, selectedCompany, selectedCustomer, filters, columnFilters, prevFilters]);

  // Load estimates list when dependencies change, avoiding duplicate calls by checking filterChanges
  useEffect(() => {
    if (!canView) return;

    const filterChanged =
      prevFilters.searchTerm !== searchTerm ||
      prevFilters.selectedProject !== selectedProject ||
      prevFilters.selectedCompany !== selectedCompany ||
      prevFilters.selectedCustomer !== selectedCustomer ||
      prevFilters.status !== filters.status ||
      prevFilters.type !== filters.type ||
      prevFilters.estimateType !== filters.estimateType ||
      JSON.stringify(prevFilters.columnFilters) !== JSON.stringify(columnFilters);

    // If filters changed and current page is not 1 yet, wait for currentPage to reset to 1
    if (filterChanged && currentPage !== 1) {
      return;
    }

    loadData(currentPage, itemsPerPage, creatorFilter, searchTerm);
  }, [
    canView,
    currentPage,
    itemsPerPage,
    creatorFilter,
    searchTerm,
    selectedProject,
    selectedCompany,
    selectedCustomer,
    filters.status,
    filters.type,
    filters.estimateType,
    debouncedColumnFilters,
    
  ]);

  useEffect(() => {
    localStorage.setItem('estimatesViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('estimatesShowFilters', showFilters);
  }, [showFilters]);

  useEffect(() => {
    localStorage.setItem('estimatesItemsPerPage', itemsPerPage);
  }, [itemsPerPage]);

  useEffect(() => {
    setVisibleEstimateColumns(readStoredEstimateColumns(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem(
      getEstimateColumnStorageKey(user),
      JSON.stringify(visibleEstimateColumns)
    );
  }, [user, visibleEstimateColumns]);

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
    const loadCategories = async () => {
      try {
        const res = await masterDataService.getAll("categories");
        setCategories(res.data || res || []);
      } catch (e) {
        console.error("Failed to load categories", e);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const loadMetadata = async () => {
    try {
      const [projectsData, customersData, divisionsData] = await Promise.all([
        localApi.projects.getDashboardProjects(),
        Customer.list(),
        masterDataService.getAll("divisions")
      ]);
      const projectsArray = Array.isArray(projectsData) ? projectsData : (projectsData.data || []);
      const customersArray = Array.isArray(customersData) ? customersData : (customersData.data || []);

      setProjects(projectsArray.filter(p => p.status !== 'inactive' && p.is_inactive !== true));
      setCustomers(customersArray);
      setDivisions(divisionsData?.data || []);
    } catch (error) {
      console.error("Error loading metadata:", error);
    }
  };

  const loadData = async (page = 1, limit = 25, created_by_user = "", searchValue = "") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page, limit, sort: "-updatedAt", search: searchValue || "", });
      Object.entries(debouncedColumnFilters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      if (created_by_user) {
        params.append("created_by_user", created_by_user);
      }

      if (selectedProject !== "all") {
        params.append("project_id", selectedProject);
      }

      if (selectedCompany !== "all") {
        params.append("company_name", selectedCompany);
      }

      if (selectedCustomer !== "all") {
        params.append("customer", selectedCustomer);
      }

      if (filters.status !== "all") {
        params.append("status", filters.status);
      }

      if (filters.type !== "all") {
        params.append("division_type", filters.type);
      }

      if (filters.estimateType !== "all") {
        params.append("estimate_type", filters.estimateType);
      }
      const estimatesRes = await fetch(`${import.meta.env.VITE_API_BASE}/estimates?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(r => r.json());

      const estimatesData = Array.isArray(estimatesRes) ? estimatesRes : (estimatesRes.data || []);

      const paginationInfo = !Array.isArray(estimatesRes) ? {
        page: estimatesRes.page || 1,
        limit: estimatesRes.limit || 25,
        total: estimatesRes.total || 0,
        pages: estimatesRes.pages || 0
      } : { page: 1, limit: 25, total: 0, pages: 0 };

      setEstimates(estimatesData);
      setPagination(paginationInfo);
    } catch (error) {
      console.error("Error loading estimates data:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.openForm && canAdd) {
      setShowForm(true);
      if (location.state?.fromLead && location.state?.leadData) {
        setPrefillLead(location.state.leadData);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, canAdd]);

  const handleSubmit = async (estimateData) => {
    try {
      const token = localStorage.getItem("token");
      const endpoint = estimateData.is_quick_estimate ? '/estimates/quick' : '/estimates';
      const url = `${import.meta.env.VITE_API_BASE}${endpoint}`;

      if (editingEstimate) {
        await Estimate.update(editingEstimate.id, estimateData);
      } else {
        if (!canAdd) {
          throw new Error("You cannot add estimates.");
        }

        if (estimateData.is_quick_estimate) {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(estimateData)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create quick estimate');
          }
        } else {
          await Estimate.create(estimateData);
        }
      }

      setShowForm(false);
      setEditingEstimate(null);
      loadMetadata();
      loadData(currentPage, itemsPerPage, creatorFilter, searchTerm);
    } catch (error) {
      console.error("Error saving estimate:", error);
      throw error; // Re-throw so useEstimateLogic can handle the error display
    }
  };

  // NEW: Handle opening project form for conversion
  const handleConvertToProject = (estimate) => {
    setSelectedItems([]);
    setConvertingEstimate({
      ...estimate,
      _autoSelect: {
        customer_id: estimate.quick_customer?._id || null,
        division_type: estimate.quick_customer?.division_type || null
      }
    });
    setShowProjectForm(true);
  };

  // NEW: Handle project form submission for conversion
  const handleProjectFormSubmit = async (projectData) => {
    try {
      if (!convertingEstimate) return;

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/estimates/${convertingEstimate.id}/convert-to-project`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            customer_id: projectData.customer_ids?.[0],
            ...projectData
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || "Conversion failed");
      }

      const result = await response.json();
      setConvertingEstimate(prev => ({
        ...prev,
        _autoSelect: result.auto_select
      }));

      Swal.fire({
        icon: "success",
        title: "Estimate Converted!",
        html: `
          <div class="space-y-2">
            <p>Your estimate has been successfully converted to a project.</p>
            <div class="mt-4 p-3 bg-green-50 rounded-lg">
              <p class="font-semibold text-green-800">Created:</p>
              <ul class="text-sm text-green-700 mt-2 space-y-1">
                <li>✓ Project: ${result.project.project_name}</li>
                <li>✓ Contact: ${result.customer.contact_name}</li>
                <li>✓ Material Order (if applicable)</li>
              </ul>
            </div>
          </div>
        `,
        confirmButtonText: "View Project",
        showCancelButton: true,
        cancelButtonText: "Stay Here"
      }).then((swalResult) => {
        if (swalResult.isConfirmed) {
          navigate(`/projects/${result.project.id}`);
        }
      });

      setShowProjectForm(false);
      setConvertingEstimate(null);
      loadMetadata();
      loadData(currentPage, itemsPerPage, creatorFilter, searchTerm);

    } catch (error) {
      console.error("Conversion error:", error);
      Swal.fire({
        icon: "error",
        title: "Conversion Failed",
        text: error.message || "Failed to convert estimate to project"
      });
    }
  };

  const handleEdit = (estimate) => {
    setSelectedItems([]);
    setEditingEstimate({
      ...estimate,
      // status: "draft"
    });
    setShowForm(true);
  };

  const handleStatusChange = async (estimate, newStatus) => {
    if (estimate.status === newStatus) return;
    try {
      Swal.fire({
        title: 'Updating Status...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      await Estimate.updateStatus(estimate.id || estimate._id, newStatus);
      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        timer: 1500,
        showConfirmButton: false
      });
      loadData(currentPage, itemsPerPage, creatorFilter, searchTerm);
      if (newStatus === "approved") {
        loadMetadata();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update status',
      });
    }
  };

  const handleSelectItem = (id, checked) => {
    setSelectedItems(prev =>
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedItems(checked ? filteredEstimates.map(e => e.id) : []);
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedItems.length} estimate(s). This action cannot be undone.`,
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

        await Estimate.bulkDelete(selectedItems);
        setEstimates(prev => prev.filter(e => !selectedItems.includes(e.id)));
        setSelectedItems([]);
        Swal.fire('Deleted!', 'Estimates have been deleted.', 'success');
      } catch (error) {
        console.error("Error deleting estimates:", error);
        Swal.fire('Error', 'Failed to delete estimates.', 'error');
      }
    }
  };

  const setColumnFilter = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setCurrentPage(1);
    setFilters({
      status: "all",
      type: "all",
      estimateType: "all"
    });
    setSelectedProject("all");
    setSelectedCustomer("all");
    setSelectedCompany("all");
    setCreatorFilter("");
    setColumnFilters({
      estimate_number: "",
      customer_po_number: "",
      project_name: "",
      company_name: "",
      customer_name: "",
      email_address: "",
      site_address: "",
      billing_address: "",
      type: "",
      scope_of_work: "",
      additional_markup: "",
      notes: "",
      created_date: "",
      valid_until: "",
      total_amount: "",
      status: ""
    });
  }, []);

  // Filters and search resetting page to 1 is handled in the unified filterChanged effect


  const filteredEstimates = estimates
  const totalPages = pagination.pages || 1;
  const paginatedEstimates = filteredEstimates;

  const handleExport = async () => {
    try {
      setSelectedItems([]);

      const token = localStorage.getItem("token");

      // Fetch ALL estimates
      const params = new URLSearchParams({
        page: 1,
        limit: 0,
        sort: "-updatedAt",
        search: searchTerm || "",
      });

      // Apply existing filters
      Object.entries(columnFilters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      if (creatorFilter) {
        params.append("created_by_user", creatorFilter);
      }

      if (selectedProject !== "all") {
        params.append("project_id", selectedProject);
      }

      if (selectedCompany !== "all") {
        params.append("company_name", selectedCompany);
      }

      if (selectedCustomer !== "all") {
        params.append("customer", selectedCustomer);
      }

      if (filters.status !== "all") {
        params.append("status", filters.status);
      }

      if (filters.type !== "all") {
        params.append("division_type", filters.type);
      }

      if (filters.estimateType !== "all") {
        params.append("estimate_type", filters.estimateType);
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/estimates?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      const allEstimates = Array.isArray(result)
        ? result
        : result.data || [];

      if (allEstimates.length === 0) {
        alert("No estimates to export.");
        return;
      }

      const exportColumnMap = {
        estimate_number: {
          header: "Estimate No",
          value: (est) => est.estimate_number || "",
        },
        project_id: {
          header: "Project Name",
          value: (est) => {
            const project = est.project || projects.find(p => p.id === est.project_id || p._id === est.project_id);
            return est.is_quick_estimate
              ? est.quick_customer?.project_name || "N/A"
              : project?.project_name || "Unnamed Project";
          },
        },
        company_name: {
          header: "Company Name",
          value: (est) => {
            const project = est.project || projects.find(p => p.id === est.project_id || p._id === est.project_id);
            const customer = project && Array.isArray(project.customer_ids) ? project.customer_ids[0] : null;
            return est.is_quick_estimate
              ? est.quick_customer?.company_name || "-"
              : customer?.company_name || "-";
          },
        },
        customer_name: {
          header: "Contact Name",
          value: (est) => {
            const project = est.project || projects.find(p => p.id === est.project_id || p._id === est.project_id);
            const customer = project && Array.isArray(project.customer_ids) ? project.customer_ids[0] : null;
            return est.is_quick_estimate
              ? est.quick_customer?.customer_name || "-"
              : customer?.contact_name || "-";
          },
        },
        customer_po_number: {
          header: "Customer PO Number",
          value: (est) => est.customer_po_number || "-",
        },
        email_address: {
          header: "Email Address",
          value: (est) => {
            const project = est.project || projects.find(p => p.id === est.project_id || p._id === est.project_id);
            const customer = project && Array.isArray(project.customer_ids) ? project.customer_ids[0] : null;
            return est.is_quick_estimate
              ? est.quick_customer?.email_address || "-"
              : customer?.email || "-";
          },
        },
        site_address: {
          header: "Site Address",
          value: (est) => {
            const project = est.project || projects.find(p => p.id === est.project_id || p._id === est.project_id);
            return est.is_quick_estimate
              ? est.quick_customer?.site_address || "-"
              : project?.location || "-";
          },
        },
        billing_address: {
          header: "Billing Address",
          value: (est) => {
            const project = est.project || projects.find(p => p.id === est.project_id || p._id === est.project_id);
            return est.billing_address || project?.billing_address || est.quick_customer?.billing_address || est.quick_customer?.site_address || project?.location || "-";
          },
        },
        type: {
          header: "Division Type",
          value: (est) => {
            const project = est.project || projects.find(p => p.id === est.project_id || p._id === est.project_id);
            return getDivisionDisplayName(project?.project_type || est.quick_customer?.division_type , divisions) || "-" ;
          },
        },
        scope_of_work: {
          header: "Scope of Work",
          value: (est) => est.Scope_of_work ? String(est.Scope_of_work).replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim() || "-" : "-",
        },
        file_attachments: {
          header: "Attached Files",
          value: (est) => {
            const attachments = est.file_attachments || [];
            return attachments
              .map((file) => file.name || file.file_name || file.original_name || file.url || "Attachment")
              .join(", ") || "-";
          },
        },
        additional_markup: {
          header: "Additional Markup",
          value: (est) => formatCurrency(est.material_markup_amount || 0),
        },
        notes: {
          header: "Notes",
          value: (est) => est.notes ? String(est.notes).replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").trim() || "-" : "-",
        },
        created_date: {
          header: "Created Date",
          value: (est) => formatDateUTC(est.created_date || est.createdAt),
        },
        total_amount: {
          header: "Amount",
          value: (est) => formatCurrency(est.total_amount || 0),
        },
        status: {
          header: "Status",
          value: (est) => est.status || "",
        },
      };

      const exportColumns = visibleEstimateColumns.filter(
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

      const csvRows = allEstimates.map((estimate) => {
        return exportColumns
          .map((col) =>
            escapeCsvField(
              exportColumnMap[col].value(estimate)
            )
          )
          .join(",");
      });

      const csvContent = [
        headers.join(","),
        ...csvRows,
      ].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");

      const url = URL.createObjectURL(blob);

      link.href = url;

      const today = new Date()
        .toISOString()
        .slice(0, 10);

      link.download = `CoyleJax_Estimates_${today}.csv`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export estimates");
    }
  };

  const handlePrintPdf = async (estimate, pdfType = 'summary') => {
    try {
      Swal.fire({
        title: 'Generating PDF...',
        html: 'Please wait while the PDF is being generated.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const payload = {
        estimate_id: estimate.id,
        estimate_number: estimate.estimate_number,
        pdf_type: pdfType
      };

      if (estimate.project_id) {
        payload.project_id = estimate.project_id;
      }
      const response = await generateEstimatePdf(payload);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimate_${estimate.estimate_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      Swal.fire({
        icon: 'success',
        title: 'Download Successful!',
        text: `Estimate ${estimate.estimate_number} has been downloaded.`,
        timer: 3000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'There was an error generating the PDF. Please try again.',
        confirmButtonText: 'Ok'
      });
    }
  };

  const handlePrintDocx = async (estimate, docxType = 'summary') => {
    try {
      Swal.fire({
        title: 'Generating Word Document...',
        html: 'Please wait while the Word document is being generated.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const payload = {
        estimate_id: estimate.id || estimate._id,
        estimate_number: estimate.estimate_number,
        docx_type: docxType
      };

      if (estimate.project_id) {
        payload.project_id = estimate.project_id;
      }
      const response = await generateEstimateDocx(payload);
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimate_${estimate.estimate_number}_${docxType}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      Swal.fire({
        icon: 'success',
        title: 'Download Successful!',
        text: `Estimate ${estimate.estimate_number} has been downloaded.`,
        timer: 3000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error generating DOCX:', error);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'There was an error generating the Word document. Please try again.',
        confirmButtonText: 'Ok'
      });
    }
  };

  const handleEstimateClick = (estimate) => {
    navigate(`/estimate/${estimate._id}`);
  };

  const availableEstimateColumnOptions = ESTIMATE_LIST_COLUMN_OPTIONS.filter(
    (column) => !column.hiddenForRoles?.includes(user.role_type)
  );

  const resetEstimateColumns = () => {
    setVisibleEstimateColumns(getDefaultEstimateColumns(user));
  };

  if (initialLoading) {
    return <TablePageSkeleton />;
  }

  const getCategoryDisplayName = (value) => {
    const found = categories.find(c => c.value === value);
    return found?.display_name || value;
  };

  // NEW: Prepare initial project data from converting estimate
  const getProjectDataFromEstimate = () => {
    if (!convertingEstimate) return {};
    const formattedDescription = (convertingEstimate.line_items || [])
      .filter(item => !item.is_section && item.category?.toLowerCase() !== "section")
      .map(item => {
        const category = getCategoryDisplayName(item.category);
        const desc = item.description || "";
        return `${category} - ${desc}`;
      })
      .join("\n");

    const matchedCustomer = customers.find(
      (c) =>
        c.email &&
        convertingEstimate.quick_customer?.email_address &&
        c.email.toLowerCase() ===
        convertingEstimate.quick_customer.email_address.toLowerCase()
    );

    return {
      project_name: convertingEstimate.quick_customer?.project_name || "",
      location: convertingEstimate.quick_customer?.site_address || "",
      billing_address: convertingEstimate.quick_customer?.billing_address || convertingEstimate.quick_customer?.site_address || "",
      estimated_value: convertingEstimate.total_amount || 0,
      // We'll create customer after project is approved, so don't pre-fill customer_ids
      customer_ids: matchedCustomer
        ? [matchedCustomer.id || matchedCustomer._id]
        : [],
      project_type: convertingEstimate._autoSelect?.division_type || "",
      project_type_name: convertingEstimate._autoSelect?.division_name || "",
      _quickEstimateData: convertingEstimate.quick_customer,// Store for later customer creation
      description: convertingEstimate.description || formattedDescription,
      file_attachments: convertingEstimate.file_attachments || [],
      requirements: convertingEstimate.Scope_of_work,
      special_instructions: convertingEstimate.notes
    };
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">All Estimates</h1>
          <p className="text-gray-600 mt-1">Create quick quotes or full project estimates</p>
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

          {!isMobile && (
            <ColumnSelectMenu
              columns={availableEstimateColumnOptions}
              visibleColumnKeys={visibleEstimateColumns}
              onVisibleColumnKeysChange={setVisibleEstimateColumns}
              onReset={resetEstimateColumns}
            />
          )}
          {!isMobile && (
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          )}

          {/* Desktop Buttons */}
          {!isMobile && (
            <>

              {canUpdate && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                </Button>
              )}

              {!isMobile && (
                <Link to={createPageUrl('Projects')}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    View Projects
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}

              {canAdd && (
                <Button
                  onClick={() => { setSelectedItems([]); setShowForm(true) }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Estimate
                </Button>
              )}
            </>
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

                {canUpdate && (
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => navigate(createPageUrl('Projects'))}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  View Projects
                </DropdownMenuItem>

                {canAdd && (
                  <DropdownMenuItem onClick={() => { setSelectedItems([]); setShowForm(true) }}>
                    <Zap className="w-4 h-4 mr-2" />
                    Quick Estimate
                  </DropdownMenuItem>
                )}

              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <EstimateForm
            estimate={editingEstimate}
            prefillLead={prefillLead}
            projects={projects}
            customers={customers}
            estimates={estimates}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingEstimate(null);
              setPrefillLead(null);
            }}
          />
        )}

        {/* NEW: Project Form for conversion */}
        {showProjectForm && (
          <ProjectForm
            project={getProjectDataFromEstimate()}
            customers={customers}
            onSubmit={handleProjectFormSubmit}
            onCancel={() => {
              setShowProjectForm(false);
              setConvertingEstimate(null);
            }}
          />
        )}
      </AnimatePresence>
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-2 shadow-sm flex flex-wrap gap-1 items-center mb-3">

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

                {projects.map((p) => (
                  <SelectItem key={p.id || p._id} value={p.id || p._id}>
                    {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

                {Array.from(
                  new Set(
                    [
                      // Project companies
                      ...projects.flatMap((project) =>
                        (project.customer_ids || [])
                          .map((customer) => customer?.company_name)
                          .filter(Boolean)
                      ),

                      // Quick estimate companies
                      ...estimates
                        .filter((e) => e.is_quick_estimate)
                        .map((e) => e.quick_customer?.company_name)
                        .filter(Boolean)
                    ]
                  )
                ).map((company) => (
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
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Select Contact
                </SelectItem>

                {Array.from(
                  new Map(
                    [
                      // Project customers
                      ...projects.flatMap((project) =>
                        (project.customer_ids || []).map((customer) => [
                          customer._id || customer.id,
                          customer
                        ])
                      ),

                      // Quick estimate customers
                      ...estimates
                        .filter((e) => e.is_quick_estimate)
                        .map((estimate) => {
                          const customer = estimate.quick_customer;

                          if (!customer) return null;

                          return [
                            customer._id ||
                            customer.id ||
                            customer.customer_name,
                            {
                              _id: customer._id || customer.id,
                              contact_name: customer.customer_name,
                              company_name: customer.company_name
                            }
                          ];
                        })
                        .filter(Boolean)
                    ]
                  ).values()
                ).map((customer) => (
                  <SelectItem
                    key={
                      customer._id ||
                      customer.id ||
                      customer.contact_name
                    }
                    value={
                      customer._id ||
                      customer.id ||
                      customer.contact_name
                    }
                  >
                    {customer.contact_name ||
                      customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Existing Filters */}
          <div className="flex-1 min-w-[300px]">
            <EstimateFilters
              filters={filters}
              onFilterChange={setFilters}
              projects={projects.filter(
                (f) => f.created_by === user.id || f.created_by === me.created_by
              )}
              divisions={divisions}
            />
          </div>
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

            <Input
              placeholder="Search by estimate #, PO, project, or contact name..."
              value={searchInput}
              onChange={(e) => { setSelectedItems([]); setSearchInput(e.target.value) }}
              className="pl-10"
            />
          </div>
        </div>


      </div>

      <BulkActions
        selectedCount={selectedItems.length}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedItems([])}
      />

      {!isMobile && viewMode === "list" ? (
        <EstimateListRow
          estimate={paginatedEstimates}
          projects={projects}
          divisions={divisions}
          onEdit={handleEdit}
          onPrint={handlePrintPdf}
          onPrintDocx={handlePrintDocx}
          onClearSelection={() => setSelectedItems([])}
          onEstimateClick={handleEstimateClick}
          selectedItems={selectedItems}
          onSelectItem={handleSelectItem}
          onSelectAll={handleSelectAll}
          columnFilters={columnFilters}
          onColumnFilterChange={setColumnFilter}
          totalFilteredCount={filteredEstimates.length}
          onConvertToProject={handleConvertToProject}
          onStatusChange={handleStatusChange}
          canAdd={canAdd}
          canUpdate={canUpdate}
          canDelete={canDelete}
          visibleColumnKeys={visibleEstimateColumns}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {paginatedEstimates.map((estimate) => (
              <EstimateCard
                key={estimate.id}
                estimate={estimate}
                projects={projects}
                divisions={divisions}
                customers={customers}
                onEdit={handleEdit}
                onClearSelection={() => setSelectedItems([])}
                canEdit={canUpdate}
                onPrint={handlePrintPdf}
                onPrintDocx={handlePrintDocx}
                onEstimateClick={handleEstimateClick}
                selectedItems={selectedItems}
                onSelectItem={handleSelectItem}
                totalFilteredCount={filteredEstimates.length}
                onConvertToProject={handleConvertToProject}
                onStatusChange={handleStatusChange}
                canAdd={canAdd}
                canUpdate={canUpdate}
                canDelete={canDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {filteredEstimates.length === 0 && !loading && (
        <div className="text-center py-12">
          <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No estimates found</h3>
          <p className="text-gray-500 mt-2">
            {searchTerm ? "Try adjusting your search" : "Create your first quick estimate"}
          </p>
        </div>
      )}

      {filteredEstimates.length > 0 && (
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
    </div>
  );
}

function EstimateFilters({ filters, onFilterChange, projects, divisions }) {
  const currentUser = JSON.parse(localStorage.getItem("user"));

  const handleChange = (key, value) => {
    onFilterChange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const uniqueTypes = divisions
    .filter(d => {
      if (d.status !== "active") return false;

      const companyId =
        currentUser.role_type === "admin"
          ? (currentUser.id || currentUser._id)
          : currentUser.created_by;

      return String(d.created_by) === String(companyId);
    })
    .map(d => ({
      value: d.value,
      label: d.display_name
    }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <div>
        <Select
          value={filters.estimateType}
          onValueChange={(value) => handleChange("estimateType", value)}
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="quick">Quick Estimates</SelectItem>
            <SelectItem value="project">Project-Based</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Select
          value={filters.status}
          onValueChange={(value) => handleChange("status", value)}
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            {/* <SelectItem value="expired">Expired</SelectItem> */}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Select
          value={filters.type}
          onValueChange={(value) => handleChange("type", value)}
        >
          <SelectTrigger className="w-full truncate h-10">
            <SelectValue placeholder="Select Division" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {uniqueTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
