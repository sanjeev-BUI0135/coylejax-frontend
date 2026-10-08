import { useEffect, useState, useMemo, useRef } from "react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Mail, Eye, ArrowUpDown, Filter, X } from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useTableSort } from "@/hooks/useTableSort";
import CustomDatePicker from "../ui/CustomDatePicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SendApprovalMailModal from "../ui/SendApprovalMailModal";
import localApi from "../../services/localApi";
import clientService from "../../services/clientAddService";
import TableHeaderFilter from "../shared/TableHeaderFilter";
import { formatDateUTC } from "../../utils/formatdate";
import { DEFAULT_MaterialOrder_VISIBLE_COLUMNS, MaterialOrder_LIST_COLUMN_OPTIONS } from "../../config/columnConfigs";
import StickyScrollbar from "../shared/StickyScrollbar";

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

export default function MaterialOrderListRow({
  orders,
  getProjectName,
  calculateMaterialOrderCost,
  systemConfig,
  onSendMail,
  selectedItems = [],
  onSelectItem,
  onSelectAll,
  columnFilters = {},
  onColumnFilterChange,
  totalFilteredCount,
  clientSidePagination = false,
  currentSort = "-createdAt",
  onSortChange,
  canUpdate,
  canDelete,
  inventoryItems = [],
  projects = [],
  estimates = [],
  visibleColumnKeys = DEFAULT_MaterialOrder_VISIBLE_COLUMNS,
}) {
  const externalSortConfig = useMemo(() => {
    if (clientSidePagination) return null;
    const direction = currentSort.startsWith('-') ? 'desc' : 'asc';
    const key = currentSort.replace(/^-/, '');
    return { key, direction };
  }, [currentSort, clientSidePagination]);

  const handleExternalSort = (config) => {
    if (onSortChange) {
      const prefix = config.direction === 'desc' ? '-' : '';
      onSortChange(`${prefix}${config.key}`);
    }
  };

  const customGetters = useMemo(() => {
    return {
      project_id: (order) => {
        const { projectName } = getOrderContext(order);
        return projectName || "";
      },
      project_name: (order) => {
        const { projectName } = getOrderContext(order);
        return projectName || "";
      },
      company_name: (order) => {
        const project = projects.find(p => p.id === order.project_id || p._id === order.project_id) || order.project;
        const customer = project?.customer_ids?.[0];
        return order?.estimate_data?.is_quick_estimate
          ? order?.estimate_data?.quick_customer?.company_name || ""
          : customer?.company_name || "";
      },
      contact_name: (order) => {
        const project = projects.find(p => p.id === order.project_id || p._id === order.project_id) || order.project;
        if (order?.estimate_data?.is_quick_estimate) {
          return order?.estimate_data?.quick_customer?.customer_name || order?.estimate_data?.quick_customer?.contact_name || "";
        }
        return project?.customer_ids?.[0]?.contact_name || "";
      },
      estimate_id: (order) => order.estimate_id ? order.estimate_id.slice(-6) : "",
      estimate_ref: (order) => order.estimate_id ? order.estimate_id.slice(-6) : "",
      createdAt: (order) => {
        return order.createdAt || order.created_date || "";
      },
      created_date: (order) => {
        return order.createdAt || order.created_date || "";
      },
      order_cost: (order) => {
        const { materialOrderCost } = getOrderContext(order);
        return materialOrderCost || 0;
      },
      status: (order) => order.order_status || "",
      order_status: (order) => order.order_status || "",
    };
  }, [projects]);

  const { sortedData, handleSort } = useTableSort(
    orders,
    "",
    "asc",
    customGetters,
    null,
    null
  );

  const [showFilters, setShowFilters] = useState(false);
  const tableContainerRef = useRef(null);
  const [openMailModal, setOpenMailModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [me, setMe] = useState([]);
  const [allData, setAllData] = useState([]);
  const [client, setClient] = useState(null);
  const user = JSON.parse(localStorage.getItem("user")) || {};

  const filterByMail = allData.filter(f => f.created_by === user.id || f.created_by === me.created_by);
  const contactMap = new Map();
  filterByMail.forEach(item => {
    if (item?.email) {
      contactMap.set(item.email, { email: item.email, role_type: item.role_type || "User" });
    }
  });
  const uniqueContacts = Array.from(contactMap.values());

  const handleApprovalClick = (order) => {
    setActiveOrder(order);
    setOpenMailModal(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, allRes] = await Promise.all([localApi.getMe(), localApi.getAll()]);
        setMe(meRes);
        setAllData(allRes || []);
        const clientId = meRes.role_type === "admin" ? meRes.id : meRes.created_by;
        if (clientId) {
          const clientRes = await clientService.getClientById(clientId);
          setClient(clientRes);
        }
      } catch (error) {
        console.error("Fetch data error:", error);
      }
    };
    fetchData();
  }, []);

  const handleSendFromModal = async (emails) => {
    if (!activeOrder) return;
    return onSendMail(activeOrder.id || activeOrder._id, activeOrder.estimate_id || "", emails);
  };

  const getTotalItems = (order) => {
    if (!order.line_items || !Array.isArray(order.line_items)) return 0;
    return order.line_items.length;
  };

  const getReceivedItems = (order) => {
    if (!order.line_items || !Array.isArray(order.line_items)) return 0;
    return order.line_items.filter(item => item.quantity_received >= item.quantity_ordered).length;
  };

  // Computes per-order derived values (status config, cost, approval state, project name)
  const getOrderContext = (order) => {
    const config = statusConfig[order.order_status] || statusConfig.Pending;
    const materialOrderCost = calculateMaterialOrderCost(order);
    const showWaitingForApproval = order.order_status === "Pending" && materialOrderCost >= systemConfig.approvalThreshold;
    const projectName = getProjectName(order.project_id, order.estimate_id, order.estimate_data, order.project);
    return { config, materialOrderCost, showWaitingForApproval, projectName };
  };

  const allSelected = orders.length > 0 && selectedItems.length === orders.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalFilteredCount;

  // ─── Unified columns array (same pattern as EstimateListRow / ProjectListRow) ──
  const columns = [
    {
      label: "Project Name",
      key: "project_name",
      sortKey: "project_id",
      filterKey: "project_name",
      renderCell: (order) => {
        const { projectName, showWaitingForApproval } = getOrderContext(order);
        const isQuickEstimate = order?.estimate_data?.is_quick_estimate;
        
        return (
          <>
            {canUpdate && !isQuickEstimate && order.project_id ? (
              <Link
                to={(`/projects/${order.project_id}`)}
                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                onClick={e => e.stopPropagation()}
              >
                {projectName}
              </Link>
            ) : (
              <span className={canUpdate ? "font-medium" : "font-medium text-gray-400 cursor-not-allowed"}>
                {projectName}
              </span>
            )}
            {showWaitingForApproval && (
              <p className="text-xs text-orange-600 mt-1">Requires Approval</p>
            )}
          </>
        );
      },
    },
    {
      label: "Company Name",
      key: "company_name",
      filterKey: "company_id",
      renderCell: (order) => {
        const project =
          projects.find(
            p => p.id === order.project_id || p._id === order.project_id
          ) || order.project;

        const customer = project?.customer_ids?.[0];

        const companyName = order?.estimate_data?.is_quick_estimate
          ? order?.estimate_data?.quick_customer?.company_name || "-"
          : customer?.company_name || "-";
        if (customer?._id || customer?.id) {
          return (
            <Link
              to={`/customers/${customer._id || customer.id}`}
              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              {companyName}
            </Link>
          );
        }
        return <span>{companyName}</span>;
      },
    },
    {
      label: "Contact Name",
      key: "contact_name",
      filterKey: "customer_name",
      renderCell: (order) => {

        const project =
          projects.find(
            p => p.id === order.project_id || p._id === order.project_id
          ) || order.project;

        if (order?.estimate_data?.is_quick_estimate) {
          return (
            order?.estimate_data?.quick_customer?.customer_name ||
            order?.estimate_data?.quick_customer?.contact_name ||
            "-"
          );
        }

        return project?.customer_ids?.[0]?.contact_name || "-";
      },
    },
    {
      label: "Estimate Ref",
      key: "estimate_ref",
      sortKey: "estimate_id",
      filterKey: "estimate_ref",
      renderCell: (order) => order.estimate_id ? order.estimate_id.slice(-6) : "N/A",
    },
    {
      label: "Created Date",
      key: "createdAt",
      sortKey: "createdAt",
      filterKey: "createdAt",
      renderFilter: () => (
        <CustomDatePicker
          value={columnFilters.createdAt || ""}
          onChange={date => onColumnFilterChange("createdAt", date)}
        />
      ),
      renderCell: (order) => formatDateUTC(order.createdAt || order.created_date),
    },
    {
      label: "Order Cost",
      key: "order_cost",
      sortKey: "order_cost",
      filterKey: "order_cost",
      hidden: user?.role_type === "Crew View",
      className: "font-semibold",
      renderCell: (order) => {
        const { materialOrderCost } = getOrderContext(order);
        return formatCurrency(materialOrderCost);
      },
    },
    {
      label: "Items Progress",
      key: "items_progress",
      sortable: false,
      filterable: false,
      headerClassName: "text-center",
      className: "text-center",
      renderCell: (order) => (
        <div className="flex items-center justify-center gap-2">
          <Package className="w-4 h-4 text-gray-500temp" />
          <span>{getReceivedItems(order)} / {getTotalItems(order)}</span>
        </div>
      ),
    },
    {
      label: "Status",
      key: "status",
      sortKey: "order_status",
      filterKey: "status",
      headerClassName: "text-center",
      className: "text-center",
      renderFilter: () => (
        <TableHeaderFilter
          placeholder="Status..."
          value={columnFilters.status || ""}
          onChange={v => onColumnFilterChange("status", v)}
          className="h-8 text-xs"
        />
      ),
      renderCell: (order) => {
        const { config } = getOrderContext(order);
        return <Badge className={config.color}>{order.order_status}</Badge>;
      },
    },
    {
      label: "Actions",
      key: "actions",
      sortable: false,
      filterable: false,
      headerClassName: "text-center",
      className: "px-4 py-3",
      renderCell: (order) => {
        const { showWaitingForApproval } = getOrderContext(order);
        return (
          <div className="flex justify-center gap-2">
            {showWaitingForApproval && canUpdate && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                onClick={() => handleApprovalClick(order)}
              >
                <Mail className="w-4 h-4 mr-1" /> Approval
              </Button>
            )}
            {openMailModal && activeOrder && (activeOrder._id === order._id || activeOrder.id === order.id || activeOrder === order) && (
              <SendApprovalMailModal
                open={openMailModal}
                onClose={() => setOpenMailModal(false)}
                projectName={getProjectName(activeOrder.project_id, activeOrder.estimate_id)}
                contacts={uniqueContacts}
                onSend={handleSendFromModal}
              />
            )}
            {canUpdate && (
              <Link to={createPageUrl(`MaterialOrderDetails?id=${order.id || order._id}`)}>
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  const availableColumns = columns.filter(col => !col.hidden);
  const availableColumnsByKey = new Map(availableColumns.map(col => [col.key, col]));
  const visibleColumns = visibleColumnKeys
    .map(key => availableColumnsByKey.get(key))
    .filter(Boolean);

  const renderColumnFilter = (col) => {
    if (col.filterable === false) return null;
    if (col.renderFilter) return col.renderFilter();
    return (
      <TableHeaderFilter
        placeholder="Search..."
        value={columnFilters[col.filterKey || col.key] || ""}
        onChange={v => onColumnFilterChange(col.filterKey || col.key, v)}
        className="h-8 text-xs"
      />
    );
  };

  return (
    <div className="relative">
    <div className="table-listrow-divstyle">
      <Table wrapperRef={tableContainerRef} wrapperClassName="scrollbar-hide" className="min-w-full text-sm">
        <TableHeader className="bg-gray50-temp text-gray-700temp font-medium">
          {/* ── Main Header Row ── */}
          <TableRow>
            <TableHead className="px-4 py-3 w-12 text-center">
              <div className="flex flex-col items-left justify-center gap-2">
                <button
                  onClick={() => setShowFilters(prev => !prev)}
                  className="p-0 bg-transparent border-none hover:text-blue-600 text-gray-600temp"
                >
                  {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                </button>
                {canDelete && (
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onCheckedChange={onSelectAll}
                  />
                )}
              </div>
            </TableHead>

            {visibleColumns.map(col => (
              <TableHead
                key={col.key}
                className={`px-4 py-3 text-left select-none ${col.sortable === false ? "" : "cursor-pointer"} ${col.headerClassName || ""}`}
                onClick={() => col.sortable === false ? undefined : handleSort(col.sortKey || col.key)}
              >
                <div className={`flex items-center gap-1 ${col.headerClassName === "text-center" ? "justify-center" : ""}`}>
                  <span>{col.label}</span>
                  {col.sortable !== false && <ArrowUpDown className="w-4 h-4 text-gray-400temp" />}
                </div>
              </TableHead>
            ))}
          </TableRow>

          {/* ── Filter Row ── */}
          {showFilters && (
            <TableRow className="bg-white border-t dark:bg-gray-900">
              <TableHead></TableHead>
              {visibleColumns.map((col) => (
                <TableCell key={col.key}>
                  {DEFAULT_MaterialOrder_VISIBLE_COLUMNS.includes(col.key)
                    ? renderColumnFilter(col)
                    : null}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableHeader>

        <TableBody>
          {sortedData.length > 0 && sortedData.map(order => {
            const isSelected = selectedItems.includes(order.id || order._id);
            return (
              <TableRow
                key={order.id || order._id}
                className={`hover:bg-gray50-temp border-b ${isSelected ? "bg-blue-50 dark:bg-gray-900" : ""}`}
              >
                <TableCell className="px-4 py-3">
                  {canDelete && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={checked => onSelectItem(order.id || order._id, checked)}
                    />
                  )}
                </TableCell>
                {visibleColumns.map(col => (
                  <TableCell key={col.key} className={col.className || "px-4 py-3 text-gray-700temp"}>
                    {col.renderCell(order)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    <StickyScrollbar tableContainerRef={tableContainerRef} />
    </div>
  );
}
