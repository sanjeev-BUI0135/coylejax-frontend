import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, ShieldAlert, Download, Search, MoreVertical, Filter, RefreshCw, Columns, Move } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import axios from "axios";
import Swal from "sweetalert2";
import MaterialOrderCard from '../components/MaterialOrders/MaterialOrderCard';
import MaterialOrderListRow from '../components/MaterialOrders/MaterialOrderListRow';
import { DEFAULT_MaterialOrder_VISIBLE_COLUMNS, MaterialOrder_LIST_COLUMN_OPTIONS } from '../config/columnConfigs';
import ColumnSelectMenu from "@/components/shared/ColumnSelectMenu";
import ViewToggle from "../components/shared/ViewToggle";
import Pagination from "../components/shared/Pagination";
import { MaterialOrder, InventoryItem } from "@/api/entities";
import BulkActions from "../components/shared/BulkActions";
import AdvancedFilters from "../components/shared/AdvanceFilters";
import localApi from '../services/localApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatedByUsers } from "../hooks/useCreatedByUsers";
import HierarchyUserSelect from "@/components/shared/HierarchyUserSelect";
import { useHierarchyUsers } from "@/hooks/useHierarchyUsers";
import TablePageSkeleton from '../components/ui/tableskeleton';
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import useDebounce from "@/hooks/useDebounce";
import { formatDateUS, formatDateUTC } from '../utils/formatdate.js';

const statusConfig = {
  Pending: { icon: Package, color: 'bg-yellow-100 text-yellow-800', order: 1 },
  Sent: { icon: Package, color: 'bg-blue-100 text-blue-800', order: 2 },
  Ordered: { icon: Package, color: 'bg-blue-100 text-blue-800', order: 3 },
  'Partially Received': { icon: Package, color: 'bg-orange-100 text-orange-800', order: 4 },
  Fulfilled: { icon: Package, color: 'bg-green-100 text-green-800', order: 5 },
  Cancelled: { icon: Package, color: 'bg-red-100 text-red-800', order: 6 },
  Approved: { icon: Package, color: 'bg-green-100 text-green-800', order: 7 },
  Rejected: { icon: Package, color: 'bg-red-100 text-red-800', order: 8 },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE;

const sendMail = async (orderId, estimateId, emails = [], token, setOrders) => {
  Swal.fire({
    title: "Sending Emails...",
    html: `Sending ${emails.length} email(s)...`,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const response = await axios.post(
      `${API_BASE_URL}/materialorders/${orderId}/send-mail`,
      {
        estimateId: estimateId || "",
        emails: emails || []
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Update status in UI
    setOrders(prevOrders =>
      prevOrders.map(order =>
        (order.id === orderId || order._id === orderId)
          ? { ...order, order_status: "Sent" }
          : order
      )
    );

    Swal.fire({
      title: "Success",
      text: "Approval email sent successfully! Status updated to 'Sent'.",
      icon: "success",
      confirmButtonText: "OK",
    });

    return response;

  } catch (error) {
    Swal.fire({
      title: "Error",
      text: "Failed to send emails. Please try again.",
      icon: "error",
      confirmButtonText: "OK",
    });

    throw error;
  }
};

const defaultMOColumns = DEFAULT_MaterialOrder_VISIBLE_COLUMNS;

const initialMOColumnsList = MaterialOrder_LIST_COLUMN_OPTIONS.map(col => ({ id: col.key, label: col.label }));

export default function MaterialOrders() {
  const [orders, setOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('materialOrdersViewMode') || 'list');
  const [showFilters, setShowFilters] = useState(() => localStorage.getItem('materialOrdersShowFilters') === 'true');

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => parseInt(localStorage.getItem('materialOrdersItemsPerPage')) || 25);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("-updatedAt");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    requiresApproval: "all"
  });
  const [columnFilters, setColumnFilters] = useState({
    project_name: "",
    company_id: "",
    customer_name: "",
    estimate_ref: "",
    createdAt: "",
    order_cost: "",
    status: ""
  });
  const debouncedColumnFilters = useDebounce(columnFilters, 500);
  const [systemConfig, setSystemConfig] = useState({
    approvalThreshold: 15000
  });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

  const [creatorFilter, setCreatorFilter] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const sessionVal = sessionStorage.getItem("materialOrders_creatorFilter");
    if (sessionVal !== null) return sessionVal;

    return storedUser._id || storedUser.id || "";
  });

  useEffect(() => {
    sessionStorage.setItem("materialOrders_creatorFilter", creatorFilter);
  }, [creatorFilter]);

  const [allOrders, setAllOrders] = useState([]);
  const hierarchyUsers = useHierarchyUsers(user);

  useEffect(() => {
    const fetchAllOrders = async () => {
      try {
        const probeResp = await MaterialOrder.list({ limit: 1 });
        const total = probeResp?.total || 1000;
        const ordersResp = await MaterialOrder.list({ limit: total });
        const data = Array.isArray(ordersResp) ? ordersResp : (ordersResp?.data || []);
        setAllOrders(data);
      } catch (err) {
        console.error("Failed to fetch all orders for dropdown", err);
      }
    };
    fetchAllOrders();
  }, []);

  const createdByMap = useCreatedByUsers(allOrders);
  const creatorDropdownUsers = useMemo(() => {
    return [
      ...new Set(
        allOrders
          .map((o) => {
            const u = o.created_by_user || o.created_by;
            return typeof u === 'object' && u ? (u._id || u.id) : u;
          })
          .filter(Boolean)
      ),
    ]
      .filter(id => typeof id === 'string' && createdByMap[id] && createdByMap[id] !== "—" && createdByMap[id] !== "Deleted User")
      .map(id => ({ _id: id, full_name: createdByMap[id] }));
  }, [allOrders, createdByMap]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedProject && selectedProject !== "all") count++;
    if (selectedCompany && selectedCompany !== "all") count++;
    if (selectedCustomer && selectedCustomer !== "all") count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.requiresApproval && filters.requiresApproval !== "all") count++;
    return count;
  }, [selectedProject, selectedCompany, selectedCustomer, filters]);

  // Columns visibility & ordering
  const [allMOColumnsList, setAllMOColumnsList] = useState(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const saved = localStorage.getItem(`material_columns_order_${u?.id || 'default'}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const missing = initialMOColumnsList.filter(col => !parsed.find(p => p.id === col.id));
        return [...parsed, ...missing];
      } catch { return initialMOColumnsList; }
    }
    return initialMOColumnsList;
  });

  const [visibleMOColumns, setVisibleMOColumns] = useState(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const saved = localStorage.getItem(`material_columns_${u?.id || 'default'}`);
    if (saved) { try { return JSON.parse(saved); } catch { return defaultMOColumns; } }
    return defaultMOColumns;
  });

  useEffect(() => {
    localStorage.setItem(`material_columns_order_${user?.id || 'default'}`, JSON.stringify(allMOColumnsList));
  }, [allMOColumnsList, user?.id]);

  useEffect(() => {
    localStorage.setItem(`material_columns_${user?.id || 'default'}`, JSON.stringify(visibleMOColumns));
  }, [visibleMOColumns, user?.id]);


  const modules = user.permissions || [];
  const materialsTabPermission = modules.find(
    p =>
      p.module?.toLowerCase() === "projects" &&
      p.submenu_module?.toLowerCase() === "materialorders"
  );
  const canUpdate = materialsTabPermission?.canUpdate ?? false;
  const canDelete = materialsTabPermission?.canDelete ?? false;

  useEffect(() => {
    loadData();
    loadSystemConfig();
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
    localStorage.setItem('materialOrdersViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('materialOrdersShowFilters', showFilters);
  }, [showFilters]);

  useEffect(() => {
    localStorage.setItem('materialOrdersItemsPerPage', itemsPerPage);
  }, [itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, debouncedColumnFilters]);

  const loadSystemConfig = async () => {
    try {
      const [markupRes, me] = await Promise.all([
        axios.get(`${API_BASE_URL}/master-data/markup`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        localApi.getMe()
      ]);

      const markups = markupRes.data?.data || markupRes.data || [];
      if (markups.length > 0) {
        const entry =
          markups.find((m) => String(m.created_by) === String(me._id)) ||
          markups.find((m) => String(m.created_by) === String(me.created_by));

        if (entry && entry.estimate_amount) {
          setSystemConfig({
            approvalThreshold: Number(entry.estimate_amount)
          });
          return;
        }
      }
      setSystemConfig({
        approvalThreshold: 15000
      });
    } catch (error) {
      console.error('Failed to load system config:', error);
      setSystemConfig({
        approvalThreshold: 15000
      });
    }
  };

  // Trigger reload when pagination/sort changes in Server-Side mode
  useEffect(() => {
    loadData();
  }, [currentPage, itemsPerPage, sortBy, searchTerm, selectedProject, selectedCustomer, selectedCompany, filters.status, filters.requiresApproval, debouncedColumnFilters, creatorFilter]);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, creatorFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput.trim().length === 0) {
        setSearchTerm("");
      } else if (searchInput.trim().length >= 3) {
        setSearchTerm(searchInput);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadData = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const params = {
        page: Number(currentPage),
        limit: Number(itemsPerPage),
        sort: sortBy,
        search: searchTerm,
        project_id: selectedProject !== "all" ? selectedProject : "",
        customer: selectedCustomer !== "all" ? selectedCustomer : "",
        company_name: selectedCompany !== "all" ? selectedCompany : "",
        status: filters.status !== "all" ? filters.status : "",
        requiresApproval: filters.requiresApproval !== "all" ? filters.requiresApproval : "",
        created_by_user: creatorFilter !== "all" ? creatorFilter : "",
        project_name: debouncedColumnFilters.project_name || "",
        company_name: debouncedColumnFilters.company_id || selectedCompany !== "all"
          ? debouncedColumnFilters.company_id || selectedCompany
          : "",
        customer_name: debouncedColumnFilters.customer_name || "",
        estimate_number: debouncedColumnFilters.estimate_ref || "",
        created_date: debouncedColumnFilters.createdAt || "",
        total_amount: debouncedColumnFilters.order_cost || "",
        status: debouncedColumnFilters.status || filters.status !== "all"
          ? debouncedColumnFilters.status || filters.status
          : ""
      };

      const ordersResp = await MaterialOrder.list(params);

      const [projectsResp, estimatesResp] = await Promise.all([
        localApi.projects.getDashboardProjects(),
        axios
          .get(`${API_BASE_URL}/estimates`, { headers })
          .catch(() => ({ data: [] }))
      ]);

      const rawOrdersData = Array.isArray(ordersResp)
        ? ordersResp
        : ordersResp?.data ?? [];
        
      const ordersData = rawOrdersData.map(order => {
        if (order.order_status === 'Partially Received') {
          return { ...order, order_status: 'Ordered' };
        }
        return order;
      });

      const projectsData = Array.isArray(projectsResp)
        ? projectsResp
        : projectsResp?.data || [];

      const estimatesData =
        estimatesResp?.data?.data ??
        estimatesResp?.data ??
        [];

      setOrders(Array.isArray(ordersData) ? ordersData : []);

      setTotalCount(
        ordersResp?.total ||
        ordersResp?.length ||
        0
      );

      setProjects(
        Array.isArray(projectsData)
          ? projectsData
          : []
      );

      setEstimates(
        Array.isArray(estimatesData)
          ? estimatesData
          : []
      );

    } catch (error) {
      console.error(
        "Failed to load material orders or projects:",
        error?.response || error
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      const resp = await InventoryItem.list();
      setInventoryItems(resp.data || []);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilters({
      status: "all",
      requiresApproval: "all"
    });
    setSelectedProject("all");
    setSelectedCustomer("all");
    setSelectedCompany("all");
    setColumnFilters({
      project_name: "",
      estimate_ref: "",
      createdAt: "",
      order_cost: "",
      status: ""
    });
    setCreatorFilter("");
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const getProjectName = (projectId, estimateId, estimateData = null, orderProject = null) => {
  const project = projects.find(
    (p) =>
      p._id?.toString() === projectId?.toString() ||
      p.id?.toString() === projectId?.toString()
  );

  if (project) {
    return project.project_name || "Unknown Project";
  }

  if (orderProject?.project_name) {
    return orderProject.project_name;
  }

  if (estimateData?.is_quick_estimate) {
    return estimateData?.quick_customer?.project_name || "Quick Estimate";
  }

  return "Unknown Project";
};
  const getProjectEstimatedValue = (projectId) => {
    const project = projects.find(p => p.id === projectId || p._id === projectId);
    if (!project) return 0;

    return parseFloat(project.estimated_value) ||
      parseFloat(project.estimate_value) ||
      parseFloat(project.total_estimate) ||
      parseFloat(project.project_value) ||
      parseFloat(project.budget) ||
      parseFloat(project.total_cost) ||
      parseFloat(project.cost) ||
      0;
  };

  const findEstimateById = (estimateId) => {
    if (!estimateId) return null;

    let estimate = estimates.find(est =>
      (est.id === estimateId || est._id === estimateId)
    );

    if (!estimate) {
      for (const project of projects) {
        if (project.estimates && Array.isArray(project.estimates)) {
          estimate = project.estimates.find(est =>
            est.id === estimateId || est._id === estimateId
          );
          if (estimate) break;
        }
      }
    }

    return estimate;
  };

  const uniqueCompanies = useMemo(() => {
    return Array.from(
      new Set([
        ...projects.flatMap((project) =>
          (project.customer_ids || [])
            .map((customer) => customer?.company_name)
            .filter(Boolean)
        ),

        ...estimates
          .filter((e) => e.is_quick_estimate)
          .map((e) => e.quick_customer?.company_name)
          .filter(Boolean)
      ])
    );
  }, [projects, estimates]);

  const calculateMaterialOrderCost = (order) => {
    if (order.total_cost && parseFloat(order.total_cost) > 0) {
      return parseFloat(order.total_cost);
    }

    if (order.estimate_data && order.estimate_data.total_cost && parseFloat(order.estimate_data.total_cost) > 0) {
      return parseFloat(order.estimate_data.total_cost);
    }

    if (order.estimate_data && order.estimate_data.total_amount && parseFloat(order.estimate_data.total_amount) > 0) {
      return parseFloat(order.estimate_data.total_amount);
    }

    if (order.estimate_total && parseFloat(order.estimate_total) > 0) {
      return parseFloat(order.estimate_total);
    }

    if (order.estimate_amount && parseFloat(order.estimate_amount) > 0) {
      return parseFloat(order.estimate_amount);
    }

    if (order.estimate_id) {
      const estimate = findEstimateById(order.estimate_id);
      if (estimate) {
        if (estimate.total_amount && parseFloat(estimate.total_amount) > 0) {
          return parseFloat(estimate.total_amount);
        }
        if (estimate.total_cost && parseFloat(estimate.total_cost) > 0) {
          return parseFloat(estimate.total_cost);
        }
        if (estimate.estimated_value && parseFloat(estimate.estimated_value) > 0) {
          return parseFloat(estimate.estimated_value);
        }
      }
    }

    if (order.cost && parseFloat(order.cost) > 0) {
      return parseFloat(order.cost);
    }

    if (order.amount && parseFloat(order.amount) > 0) {
      return parseFloat(order.amount);
    }

    if (order.line_items && Array.isArray(order.line_items) && order.line_items.length > 0) {
      const calculatedTotal = order.line_items.reduce((total, item) => {
        const quantity = parseFloat(item.quantity_ordered) ||
          parseFloat(item.quantity) ||
          parseFloat(item.qty) ||
          parseFloat(item.amount_ordered) ||
          parseFloat(item.units) || 0;

        let price = parseFloat(item.unit_price) ||
          parseFloat(item.price) ||
          parseFloat(item.cost) ||
          parseFloat(item.rate) ||
          parseFloat(item.unit_cost) ||
          parseFloat(item.item_price) || 0;

        if (!price && item.total && parseFloat(item.total) > 0) {
          return total + parseFloat(item.total);
        }
        if (!price && item.amount && parseFloat(item.amount) > 0) {
          return total + parseFloat(item.amount);
        }

        const itemTotal = quantity * price;
        return total + itemTotal;
      }, 0);

      if (calculatedTotal > 0) {
        return calculatedTotal;
      }
    }

    const projectEstimate = getProjectEstimatedValue(order.project_id);
    if (projectEstimate && projectEstimate > 0) {
      return parseFloat(projectEstimate);
    }
    return 0;
  };

  const handleSelectItem = (id, checked) => {
    setSelectedItems(prev =>
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedItems(
      checked ? displayOrders.map(o => o.id || o._id) : []
    );
  };

  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${selectedItems.length} material order(s). This action cannot be undone.`,
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

        const token = localStorage.getItem('token');
        await MaterialOrder.bulkDelete(selectedItems);

        setOrders(prev => prev.filter(o => !selectedItems.includes(o.id || o._id)));
        setSelectedItems([]);
        Swal.fire('Deleted!', 'Material orders have been deleted.', 'success');
      } catch (error) {
        console.error("Error deleting material orders:", error);
        Swal.fire('Error', 'Failed to delete material orders.', 'error');
      }
    }
  };

  const setColumnFilter = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const exportColumnMap = {
    project_name: { 
      header: "Project Name", value: (order) => {
        const estimate = estimates.find(e => e.id === order.estimate_id || e._id === order.estimate_id);
        return getProjectName(order.project_id, order.estimate_id, order.estimate_data || estimate, order.project);
      } 
    },
    company_name: {
      header: "Company Name", value: (order) => {
        const project = projects.find(p => p.id === order.project_id || p._id === order.project_id);
        const estimate = estimates.find(e => e.id === order.estimate_id || e._id === order.estimate_id);
        return estimate?.is_quick_estimate ? estimate.quick_customer?.company_name || "" : project?.customer_ids?.[0]?.company_name || "";
      }
    },
    contact_name: {
      header: "Contact Name", value: (order) => {
        const project = projects.find(p => p.id === order.project_id || p._id === order.project_id);
        const estimate = estimates.find(e => e.id === order.estimate_id || e._id === order.estimate_id);
        return estimate?.is_quick_estimate ? estimate.quick_customer?.customer_name || "" : project?.customer_ids?.[0]?.contact_name || "";
      }
    },
    estimate_ref: { header: "Estimate Ref", value: (order) => order.estimate_id ? order.estimate_id.slice(-6) : "" },
    createdAt: { header: "Created Date", value: (order) => order.createdAt ? formatDateUTC(order.createdAt) : "" },
    order_cost: { header: "Order Cost", value: (order) => formatCurrency(calculateMaterialOrderCost(order)) },
    items_progress: {
      header: "Items Progress", value: (order) => {
        const total = order.line_items?.length || 0;
        const received = order.line_items?.filter(i => i.quantity_received >= i.quantity_ordered).length || 0;
        return `'${received}/${total}`;
      }
    },
    status: { header: "Status", value: (order) => order.order_status || "" },
  };

  const handleExport = async () => {
    setSelectedItems([]);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/materialorders?limit=1000000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const allOrdersData = Array.isArray(data) ? data : data.data || [];

      if (allOrdersData.length === 0) {
        alert("No material orders to export.");
        return;
      }

      const exportCols = visibleMOColumns.filter(col => exportColumnMap[col]);
      const headers = exportCols.map(col => exportColumnMap[col].header);

      const escapeCsvField = (field) => {
        const str = String(field || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = allOrdersData.map(order =>
        exportCols.map(col => escapeCsvField(exportColumnMap[col].value(order))).join(',')
      );

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute("download", `CoyleJax_Material_Orders_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export material orders");
    }
  };

  const handleSendMail = (orderId, estimateId, emails) => {
    sendMail(orderId, estimateId, emails, localStorage.getItem("token"), setOrders);
  };

  const filteredOrders = useMemo(() => {
    let dataToFilter = orders;

    return dataToFilter.filter((order) => {
      const project = projects.find(
        (p) =>
          p._id?.toString() === order.project_id?.toString() ||
          p.id?.toString() === order.project_id?.toString()
      );

      const estimate = findEstimateById(order.estimate_id);

      const projectName = getProjectName(
        order.project_id,
        order.estimate_id
      );

      const materialOrderCost =
        calculateMaterialOrderCost(order);

      const requiresApproval =
        materialOrderCost > systemConfig.approvalThreshold;

      const searchLower = searchTerm.toLowerCase();

      const companyName = estimate?.is_quick_estimate
        ? estimate.quick_customer?.company_name || ""
        : project?.customer_ids?.[0]?.company_name || "";

      const customerName = estimate?.is_quick_estimate
        ? estimate.quick_customer?.customer_name || ""
        : project?.customer_ids?.[0]?.contact_name || "";

      const matchesSearch =
        projectName.toLowerCase().includes(searchLower) ||
        companyName.toLowerCase().includes(searchLower) ||
        customerName.toLowerCase().includes(searchLower) ||
        (order.estimate_id || "")
          .toLowerCase()
          .includes(searchLower) ||
        (order.order_status || "")
          .toLowerCase()
          .includes(searchLower);

      const matchesApproval =
        filters.requiresApproval === "all" ||
        (filters.requiresApproval === "yes" &&
          requiresApproval) ||
        (filters.requiresApproval === "no" &&
          !requiresApproval);

      return (
        matchesSearch &&
        matchesApproval
      );
    });
  }, [
    orders,
    searchTerm,
    filters,
    debouncedColumnFilters,
    projects,
    systemConfig,
    selectedProject,
    selectedCustomer,
    selectedCompany,
  ]);

  const uniqueCustomers = useMemo(() => {
    return Array.from(
      new Map([
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
      ]).values()
    );
  }, [projects, estimates]);

  // Client-side Sorting
  const processedOrders = useMemo(() => {
    return filteredOrders;
  }, [filteredOrders]);

  // Pagination Slice
  const displayOrders = useMemo(() => {
    return processedOrders;
  }, [processedOrders]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (initialLoading) {
    return <TablePageSkeleton />;
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900temp">
            Material Orders
          </h1>
          <p className="text-gray-600temp mt-1">
            Track all material orders across your projects
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

          {!isMobile && (
            <>
              {/* Columns Dropdown */}
              <ColumnSelectMenu
                columns={allMOColumnsList.map((col) => ({
                  key: col.id,
                  label: col.label,
                }))}
                visibleColumnKeys={visibleMOColumns}
                onVisibleColumnKeysChange={setVisibleMOColumns}
                onReset={() => {
                  setVisibleMOColumns(defaultMOColumns);
                }}
              />
            </>
          )}
          {!isMobile && (
            <ViewToggle view={viewMode} onViewChange={setViewMode} />
          )}

          {/* Desktop: Columns + Export */}
          {!isMobile && (
            <>
              {canUpdate && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4" />
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}

        </div>

      </div>

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
                <SelectItem value="all">Select Contact</SelectItem>
                {uniqueCustomers.map((c) => (
                  <SelectItem key={c.id || c._id} value={c.id || c._id}>
                    {c.contact_name || c.company_name}
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
                <SelectItem value="all">Select Company</SelectItem>
                {uniqueCompanies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Existing Status & Approval Filters */}
          <div className="flex-1 min-w-[300px]">
            <MaterialOrderFilters
              filters={filters}
              onFilterChange={(newFilters) => {
                setFilters(newFilters);
                setCurrentPage(1);
              }}
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
            <Search className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400temp w-4 h-4" />
            <Input
              placeholder="Search by project name, contact name, company name, status..."
              value={searchInput}
              onChange={(e) => {
                setSelectedItems([]);
                setSearchInput(e.target.value);
              }}
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
        loading ? (
          <div className="bg-white border border-gray-200 rounded-md dark:border-gray-800 dark:bg-slate-900 mt-4 overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-32 hidden md:block" />
                  <Skeleton className="h-5 w-24 hidden md:block" />
                  <div className="ml-auto flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <MaterialOrderListRow
          orders={displayOrders}
          getProjectName={getProjectName}
          calculateMaterialOrderCost={calculateMaterialOrderCost}
          systemConfig={systemConfig}
          onSendMail={handleSendMail}
          selectedItems={selectedItems}
          onSelectItem={handleSelectItem}
          onSelectAll={handleSelectAll}
          columnFilters={columnFilters}
          onColumnFilterChange={setColumnFilter}
          totalFilteredCount={totalCount}
          clientSidePagination={!!searchTerm}
          currentSort={sortBy}
          onSortChange={setSortBy}
          canUpdate={canUpdate}
          canDelete={canDelete}
          inventoryItems={inventoryItems}
          projects={projects}
          estimates={estimates}
          visibleColumnKeys={visibleMOColumns}
        />
        )
      ) : (
        loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                   <Skeleton className="h-4 w-24" />
                   <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {displayOrders.map((order) => {
              const materialOrderCost = calculateMaterialOrderCost(order);
              const requiresApproval = materialOrderCost > systemConfig.approvalThreshold;

              return (
                <MaterialOrderCard
                  key={order.id || order._id}
                  order={order}
                  projectName={getProjectName(order.project_id, order.estimate_id,order.estimate_data,order.project)}
                  materialOrderCost={materialOrderCost}
                  requiresApproval={requiresApproval}
                  systemConfig={systemConfig}
                  onSendMail={handleSendMail}
                  selectedItems={selectedItems}
                  onSelectItem={handleSelectItem}
                  totalFilteredCount={displayOrders.length}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  inventoryItems={inventoryItems}
                />
              );
            })}
          </AnimatePresence>
        </div>
        )
      )}

      {totalCount === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900temp">No Material Orders Found</h3>
          <p className="text-gray-500temp mt-2">
            {searchTerm ? "Try adjusting your search or filters" : "Approve an estimate to automatically create a material order."}
          </p>
        </div>
      )}

      {totalCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
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

// MaterialOrderFilters Component
function MaterialOrderFilters({ filters, onFilterChange }) {
  const handleChange = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Ordered">Ordered</SelectItem>
            <SelectItem value="Fulfilled">Fulfilled</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>

        <Select
          value={filters.requiresApproval}
          onValueChange={(value) =>
            handleChange("requiresApproval", value)
          }
        >
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Approval Required?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="yes">Requires Approval</SelectItem>
            <SelectItem value="no">No Approval Needed</SelectItem>
          </SelectContent>
        </Select>
      </div>

    </div>
  );
}