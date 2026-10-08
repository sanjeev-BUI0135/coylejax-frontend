import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, Filter, Search, RotateCcw, ShieldAlert, ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import customReportService from "../services/customReportService";
import { formatDateUS } from "../utils/formatdate";
import Pagination from "../components/shared/Pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { useCreatedByUsers } from "../hooks/useCreatedByUsers";
import { hasPermission } from "../utils/hasPermission";
import TableHeaderFilter from "../components/shared/TableHeaderFilter";
import CustomDatePicker from "../components/ui/CustomDatePicker";
import StickyScrollbar from "../components/shared/StickyScrollbar";
import { useTableSort } from "@/hooks/useTableSort";

const filterByDate = (itemDateStr, filterValue) => {
  if (!filterValue) return true;
  if (!itemDateStr || itemDateStr === "—") return false;
  const itemDate = new Date(itemDateStr);
  const filterDate = new Date(filterValue);
  return itemDate.getFullYear() === filterDate.getFullYear() &&
    itemDate.getMonth() === filterDate.getMonth() &&
    itemDate.getDate() === filterDate.getDate();
};


const CustomReportView = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const tableContainerRef = React.useRef(null);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser?.role_type?.toLowerCase() === "admin";
  const perms = currentUser?.permissions || [];
  const canView = isAdmin || hasPermission(perms, "Reports", "view", "CustomReport");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchFilters, setSearchFilters] = useState({
    search: "",
    company_name: "all",
    status: "all",
    created_by: "all"
  });
  const [columnFilters, setColumnFilters] = useState({});
  const [allData, setAllData] = useState([]); // Used for filter dropdowns
  const [date, setDate] = useState({ from: null, to: null, isAllTime: true });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showHeaderFilters, setShowHeaderFilters] = useState(false);
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchFilters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchFilters.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
    }, 500);
    return () => clearTimeout(timer);
  }, [columnFilters]);

  // Fetch report metadata and data once on mount or when id changes
  useEffect(() => {
    const loadReport = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Fetch up to 10000 records so we have all data on the client side
        const response = await customReportService.getReportData(id, { limit: 10000 });
        setReport(response.report);
        setAllData(response.data || []);
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [id]);

  // Dropdown options always derived from full unfiltered allData
  const uniqueCustomers = useMemo(() => {
    const set = new Set();
    allData.forEach(item => {
      const project = item.project_id || item;
      const custs = item.customer_ids || project?.customer_ids;
      if (Array.isArray(custs)) {
        custs.forEach(c => c.company_name && set.add(c.company_name));
      } else if (custs?.company_name) {
        set.add(custs.company_name);
      } else if (item.company_name) {
        set.add(item.company_name);
      }
    });
    return Array.from(set).sort();
  }, [allData]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set();
    allData.forEach(item => {
      if (item.status) set.add(item.status.toLowerCase());
    });
    return Array.from(set).sort();
  }, [allData]);

  const createdByMap = useCreatedByUsers(allData);

  const uniqueCreators = useMemo(() => {
    const map = new Map();
    allData.forEach(item => {
      const userId = item.created_by_user?._id || item.created_by_user || item.created_by;
      const name = createdByMap[userId] || item.created_by_name;
      if (userId && name && name !== "—" && name !== "Deleted User") map.set(String(userId), name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [allData, createdByMap]);



  const fieldLabels = {
    project_name: "Project Name",
    company_name: "Company Name",
    status: "Status/Progress",
    project_number: "Project ID",
    project_type_name: "Division",
    createdAt: "Created Date",
    material_cost: "Material Cost",
    estimated_value: "Contract Value",
    install_date: "Install Date",
    completion_date: "Completion Date",
    contact_name: "Contact Name",
    estimate_number: "Estimate ID",
    invoice_number: "Invoice ID",
    total_amount: "Total Amount",
    amount_paid: "Paid",
    balance: "Balance",
    issue_date: "Issue Date",
    due_date: "Due Date",
    customer_po_number: "Customer PO Number",
  };

  const getFieldValue = (item, fieldKey) => {
    if (!item) return "—";

    // Handle specific field logic
    const project = item.project_id || item;
    const customers = item.customer_ids || project?.customer_ids;

    if (fieldKey === "company_name" || fieldKey === "contact_name") {
      if (Array.isArray(customers)) {
        const values = customers.map(c => c[fieldKey] || "—").filter(v => v !== "—");
        return values.length > 0 ? values.join(", ") : "—";
      }
      return customers?.[fieldKey] || item[fieldKey] || "—";
    }

    if (fieldKey === "project_name") return item.project_name || project?.project_name || "—";
    if (fieldKey === "status") {
      const s = item.status || "—";

      return s
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    if (fieldKey === "project_number") return item.project_number || project?.project_number || "—";
    if (fieldKey === "project_type_name") return item.project_type_name || project?.project_type_name || "—";

    let val;
    if (fieldKey === "balance") {
      const total = Number(item.total_amount || 0);
      const paid = Number(item.amount_paid || 0);
      val = total - paid;
    } else {
      val = item[fieldKey] || project?.[fieldKey];
    }

    if (fieldKey === "install_date") val = item.estimated_start_date || project?.estimated_start_date;
    if (fieldKey === "completion_date") val = item.estimated_end_date || project?.estimated_end_date;

    if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/))) {
      return formatDateUS(val);
    }

    if (typeof val === 'number') {
      const currencyFields = ['cost', 'value', 'price', 'amount', 'balance', 'paid'];
      if (currencyFields.some(f => fieldKey.includes(f))) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
      }
      return val;
    }

    return val || "—";
  };

  const onColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const selectedFields = report?.selected_fields || [];

  const filteredData = useMemo(() => {
    return allData.filter(item => {
      const project = item.project_id || item;

      // 1. General search
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const matches = selectedFields.some(fieldKey => {
          const val = getFieldValue(item, fieldKey);
          return String(val || "").toLowerCase().includes(searchLower);
        });
        if (!matches) return false;
      }

      // 2. Dropdown filters
      if (searchFilters.company_name !== "all") {
        const comp = getFieldValue(item, "company_name");
        if (!String(comp || "").toLowerCase().includes(searchFilters.company_name.toLowerCase())) {
          return false;
        }
      }
      if (searchFilters.status !== "all") {
        if ((item.status || "").toLowerCase() !== searchFilters.status.toLowerCase()) {
          return false;
        }
      }
      if (searchFilters.created_by !== "all") {
        const userId = String(item.created_by_user?._id || item.created_by_user || item.created_by || "");
        if (userId !== String(searchFilters.created_by)) {
          return false;
        }
      }

      // 3. Date range filter
      if (date.from || date.to) {
        const itemDate = new Date(item.createdAt || project?.createdAt);
        if (date.from && itemDate < new Date(date.from)) return false;
        if (date.to && itemDate > new Date(date.to)) return false;
      }

      // 4. Column header filters
      const colFilterKeys = Object.keys(debouncedColumnFilters);
      for (const fieldKey of colFilterKeys) {
        const filterVal = debouncedColumnFilters[fieldKey];
        if (filterVal) {
          const val = getFieldValue(item, fieldKey);
          if (fieldKey === 'install_date' || fieldKey === 'completion_date' || fieldKey === 'createdAt' || fieldKey === 'due_date' || fieldKey === 'issue_date') {
            if (!filterByDate(val, filterVal)) return false;
          } else {
            if (!String(val || "").toLowerCase().includes(String(filterVal).toLowerCase())) {
              return false;
            }
          }
        }
      }

      return true;
    });
  }, [allData, debouncedSearch, searchFilters, date, debouncedColumnFilters, selectedFields]);

  const customGetters = useMemo(() => {
    const getters = {};
    selectedFields.forEach(fieldKey => {
      getters[fieldKey] = (item) => {
        const val = getFieldValue(item, fieldKey);
        const isNumeric = ['cost', 'value', 'price', 'amount', 'balance', 'paid'].some(f => fieldKey.includes(f));
        if (isNumeric) {
          if (typeof val === 'number') return val;
          const cleaned = String(val || "").replace(/[^0-9.-]/g, "");
          return cleaned ? Number(cleaned) : 0;
        }
        return val || "";
      };
    });
    return getters;
  }, [selectedFields]);

  const { sortedData, handleSort, sortConfig } = useTableSort(filteredData, "createdAt", "desc", customGetters);

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, searchFilters.status, searchFilters.company_name, searchFilters.created_by, date, debouncedColumnFilters, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 max-w-md">
          You do not have permission to view Custom Reports. Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 bg-gray-50/50 dark:bg-transparent min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {report ? report.report_name : "Automated Report"} - View
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage View Report</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowFilters(!showFilters); }}
          >
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 h-10 px-5 font-medium shadow-sm"
            onClick={async () => {
              try {
                const params = {
                  search: debouncedSearch,
                  status: searchFilters.status === "all" ? "" : searchFilters.status,
                  customer: searchFilters.company_name === "all" ? "" : searchFilters.company_name,
                  created_by: searchFilters.created_by === "all" ? "" : searchFilters.created_by,
                  startDate: date.from ? (date.from instanceof Date ? date.from.toISOString() : new Date(date.from).toISOString()) : "",
                  endDate: date.to ? (date.to instanceof Date ? date.to.toISOString() : new Date(date.to).toISOString()) : "",
                  colFilters: JSON.stringify(debouncedColumnFilters),
                  sortBy: sortConfig.key,
                  sortOrder: sortConfig.direction
                };
                const blob = await customReportService.exportReport(id, params);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const now = new Date();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const yy = String(now.getFullYear()).slice(-2);
                const dateStr = `${mm}-${dd}-${yy}`;
                a.download = `${(report?.report_name || "report").replace(/\s+/g, '_')}_${dateStr}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (error) {
                console.error("Export error:", error);
              }
            }}
          >
            <Download className="w-4 h-4 mr-2 text-gray-800 dark:text-gray-200" /> Export
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/custom-report")}
            className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-5 border-none"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-2">
        {showFilters && (
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4 bg-gray-50/30 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  className="pl-10 h-10 border-gray-200"
                  value={searchFilters.search}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <Select value={searchFilters.company_name} onValueChange={(v) => setSearchFilters(prev => ({ ...prev, company_name: v }))}>
                <SelectTrigger className="w-48 h-10 bg-white dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                  <SelectValue placeholder="Company Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Company Name</SelectItem>
                  {uniqueCustomers.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={searchFilters.created_by} onValueChange={(v) => setSearchFilters(prev => ({ ...prev, created_by: v }))}>
                <SelectTrigger className="w-44 h-10 bg-white dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                  <SelectValue placeholder="All Created By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Created By</SelectItem>
                  {uniqueCreators.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={searchFilters.status} onValueChange={(v) => setSearchFilters(prev => ({ ...prev, status: v }))}>
                <SelectTrigger className="w-40 h-10 bg-white dark:bg-gray-800 dark:border-gray-700 border-gray-200">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {uniqueStatuses.map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DateRangePicker className="w-64" date={date} setDate={setDate} />

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-gray-500 border-gray-200"
                  onClick={() => {
                    setSearchFilters({ search: "", company_name: "all", status: "all", created_by: "all" });
                    setColumnFilters({});
                    setDate({ from: null, to: null, isAllTime: true });
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 min-h-[400px] flex flex-col">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium italic">Loading data...</div>
        ) : (
          <>
            <div className="table-listrow-divstyle border-0 shadow-none rounded-none flex-1">
              <Table wrapperRef={tableContainerRef} wrapperClassName="scrollbar-hide" className="text-sm" >
              <TableHeader className="bg-gray50-temp text-gray-700temp font-medium dark:bg-gray-900">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center border-r border-gray-50">
                    <button
                      onClick={() => setShowHeaderFilters(!showHeaderFilters)}
                      className={`p-1.5 rounded-md transition-all ${showHeaderFilters ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-100"}`}
                      title={showHeaderFilters ? "Hide Column Filters" : "Show Column Filters"}
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                  </TableHead>
                  {selectedFields.map((fieldKey, idx) => {
                    const isNumeric = ['cost', 'value', 'price', 'amount', 'balance', 'paid'].some(f => fieldKey.includes(f));
                    return (
                      <TableHead
                        key={idx}
                        className={`py-5 px-6 text-gray-500 dark:text-gray-300 font-semibold whitespace-nowrap cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors select-none ${isNumeric ? "text-right" : ""}`}
                        onClick={() => handleSort(fieldKey)}
                      >
                        <div className={`flex items-center gap-1.5 ${isNumeric ? "justify-end" : ""}`}>
                          {fieldLabels[fieldKey] || fieldKey}
                          <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === fieldKey ? "text-blue-500" : "text-gray-300"}`} />
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>

                {showHeaderFilters && (
                  <TableRow className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 animate-in slide-in-from-top-1 duration-200">
                    <TableHead className="w-12 border-r border-gray-50" />
                    {selectedFields.map((fieldKey, idx) => {
                      let dbField = fieldKey;
                      if (fieldKey === 'install_date') dbField = 'estimated_start_date';
                      if (fieldKey === 'completion_date') dbField = 'estimated_end_date';

                      const isDate = dbField.includes('date') || dbField === 'createdAt';
                      return (
                        <TableHead key={`filter-${idx}`} className="px-4 py-2">
                          {isDate ? (
                            <CustomDatePicker
                              value={columnFilters[fieldKey] || ""}
                              onChange={(val) => onColumnFilterChange(fieldKey, val)}
                              className="h-8 text-xs bg-white dark:bg-gray-800"
                            />
                          ) : (
                            <TableHeaderFilter
                              value={columnFilters[fieldKey] || ""}
                              onChange={(val) => onColumnFilterChange(fieldKey, val)}
                              placeholder="Search..."
                            />
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 transition-colors">
                      <TableCell className="w-12 border-r border-gray-50/30" />
                      {selectedFields.map((fieldKey, colIdx) => {
                        const isNumeric = ['cost', 'value', 'price', 'amount', 'balance', 'paid'].some(f => fieldKey.includes(f));
                        return (
                          <TableCell key={colIdx} className={`py-4 px-6 ${fieldKey === "project_name" ? "text-blue-500 font-medium cursor-pointer hover:underline" : "text-gray-700 dark:text-gray-300"} ${isNumeric ? "text-right" : ""}`}>
                            {getFieldValue(item, fieldKey)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={selectedFields.length + 1} className="py-24 text-center text-gray-400 dark:text-gray-500">
                      No records match the current filters for this report.
                    </TableCell>
                  </TableRow>
                )}

                {/* Footer Totals */}
                {paginatedData.length > 0 && selectedFields.some(f => f.includes('cost') || f.includes('value')) && (
                  <TableRow className="bg-gray-50/30 dark:bg-gray-900/30 font-bold border-t-2 border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    <TableCell className="w-12 border-r border-gray-50/30" />
                    {selectedFields.map((fieldKey, colIdx) => {
                      const currencyFields = ['cost', 'value', 'price', 'amount', 'balance', 'paid'];
                      const isNumeric = currencyFields.some(f => fieldKey.includes(f));
                      if (isNumeric) {
                        const total = paginatedData.reduce((acc, item) => {
                          const project = item.project_id || item;
                          let val = 0;
                          if (fieldKey === 'balance') {
                            const t = Number(item.total_amount || 0);
                            const p = Number(item.amount_paid || 0);
                            val = t - p;
                          } else {
                            val = Number(item[fieldKey] || project?.[fieldKey] || 0);
                          }
                          return acc + val;
                        }, 0);
                        return (
                          <TableCell key={colIdx} className="py-4 px-6 text-gray-900 dark:text-gray-200 font-bold text-right">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total)}
                          </TableCell>
                        );
                      }
                      return <TableCell key={colIdx}></TableCell>;
                    })}
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
            <StickyScrollbar tableContainerRef={tableContainerRef} />
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-xl mt-auto">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredData.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomReportView;
