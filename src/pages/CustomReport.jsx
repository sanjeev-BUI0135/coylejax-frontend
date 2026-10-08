import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, Edit, Trash2, FileText, Filter, X, ArrowUpDown, History, RefreshCcw, Eye, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Pagination from "../components/shared/Pagination";
import customReportService from "../services/customReportService";
import { formatDateUS, formatDateTimeUS } from "../utils/formatdate";
import Swal from "sweetalert2";
import { useTableSort } from "@/hooks/useTableSort";
import TableHeaderFilter from "../components/shared/TableHeaderFilter";
import CustomDatePicker from "../components/ui/CustomDatePicker";
import { hasPermission } from "../utils/hasPermission";

const formatTimeAMPM = (timeString) => {
  if (!timeString) return "—";
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/;
  if (timeRegex.test(timeString)) {
    let [hours, minutes] = timeString.split(':');
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    hours = String(hours).padStart(2, '0');
    return `${hours}:${minutes} ${ampm}`;
  }
  return timeString;
};

const CustomReport = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState({
    report_name: "",
    report_interval: "",
    report_day: "",
    created_by_name: "",
    status: "",
  });

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser?.role_type?.toLowerCase() === "admin";
  const perms = currentUser?.permissions || [];
  const canView = isAdmin || hasPermission(perms, "Reports", "view", "CustomReport");
  const canAdd = isAdmin || hasPermission(perms, "Reports", "add", "CustomReport");
  const canUpdate = isAdmin || hasPermission(perms, "Reports", "update", "CustomReport");
  const canDelete = isAdmin || hasPermission(perms, "Reports", "delete", "CustomReport");


  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await customReportService.getCustomReports();
      setReports(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching Custom Report:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await customReportService.deleteCustomReport(id);
        Swal.fire("Deleted!", "Your report has been deleted.", "success");
        fetchReports();
      } catch (error) {
        Swal.fire("Error", "Failed to delete the report.", "error");
      }
    }
  };

  const onColumnFilterChange = (column, value) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
    setCurrentPage(1);
  };

  const normalize = (str) => (str || "").toLowerCase().trim();

  const filterByDate = (itemDateStr, filterValue) => {
    if (!filterValue) return true;
    if (!itemDateStr) return false;
    const itemDate = new Date(itemDateStr);
    const filterDate = new Date(filterValue);
    return itemDate.getFullYear() === filterDate.getFullYear() &&
      itemDate.getMonth() === filterDate.getMonth() &&
      itemDate.getDate() === filterDate.getDate();
  };

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const interval = report.interval || report.report_interval || "";
      const dayOrTime = report.schedule_day || report.report_day || report.schedule_time || "";
      return (
        normalize(report.report_name).includes(normalize(columnFilters.report_name)) &&
        normalize(interval).includes(normalize(columnFilters.report_interval)) &&
        normalize(dayOrTime).includes(normalize(columnFilters.report_day)) &&
        normalize(report.created_by_name || "Admin").includes(normalize(columnFilters.created_by_name)) &&
        normalize(report.status || "Active").includes(normalize(columnFilters.status)) &&
        filterByDate(report.last_run, columnFilters.last_run) &&
        filterByDate(report.createdAt, columnFilters.createdAt)
      );
    });
  }, [reports, columnFilters]);

  const customGetters = useMemo(() => {
    return {
      interval: (report) => report.interval || report.report_interval || "",
      schedule_day: (report) => report.schedule_day || report.report_day || report.schedule_time || "",
      created_by_name: (report) => report.created_by_name || "Admin",
      status: (report) => report.status || "Active",
    };
  }, []);

  const { sortedData, handleSort } = useTableSort(filteredReports, "", "asc", customGetters);

  const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Custom Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage Custom Reports</p>
        </div>
        <div className="flex items-center gap-2">
          {canAdd && (
            <Button onClick={() => navigate("/custom-report/create")} className="bg-blue-600 hover:bg-blue-700 h-10 px-6 rounded-md shadow-sm font-medium">
              <Plus className="w-4 h-4 mr-2" /> Create New
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium italic">Loading reports...</div>
        ) : (
          <div className="overflow-x-auto table-listrow-divstyle">
            <Table className="text-sm">
              <TableHeader className="bg-gray50-temp text-gray-700temp font-medium dark:bg-gray-900">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="p-1.5 hover:text-blue-600 transition-colors text-gray-400"
                    >
                      {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                    </button>
                  </TableHead>

                  <TableHead onClick={() => handleSort("report_name")} className="py-5 px-4 text-gray-500 dark:text-gray-300 font-semibold cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      <span>Report Name</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </TableHead>

                  <TableHead onClick={() => handleSort("interval")} className="py-5 px-4 text-gray-500 dark:text-gray-300 font-semibold cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      <span>Report Interval</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </TableHead>

                  <TableHead onClick={() => handleSort("schedule_day")} className="py-5 px-4 text-gray-500 dark:text-gray-300 font-semibold cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      <span>Report Day</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </TableHead>

                  <TableHead onClick={() => handleSort("last_run")} className="py-5 px-4 text-gray-500 dark:text-gray-300 font-semibold cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      <span>Report Execution Date</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </TableHead>

                  <TableHead onClick={() => handleSort("createdAt")} className="py-5 px-4 text-gray-500 dark:text-gray-300 font-semibold cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      <span>Created Date</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </TableHead>

                  <TableHead onClick={() => handleSort("created_by_name")} className="py-5 px-4 text-gray-500 dark:text-gray-300 font-semibold cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      <span>Created By</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </TableHead>

                  <TableHead onClick={() => handleSort("status")} className="py-5 px-4 text-gray-500 font-semibold text-center cursor-pointer select-none">
                    <div className="flex items-center justify-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-300" />
                    </div>
                  </TableHead>

                  <TableHead className="py-5 px-4 text-gray-500 dark:text-gray-300 font-semibold text-center">Action</TableHead>
                </TableRow>

                {showFilters && (
                  <TableRow className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-300 dark:border-gray-700">
                    <TableHead></TableHead>
                    <TableHead className="px-4 py-2">
                      <TableHeaderFilter
                        value={columnFilters.report_name}
                        onChange={(val) => onColumnFilterChange("report_name", val)}
                        placeholder="Search name..."
                      />
                    </TableHead>
                    <TableHead className="px-4 py-2">
                      <TableHeaderFilter
                        value={columnFilters.report_interval}
                        onChange={(val) => onColumnFilterChange("report_interval", val)}
                        placeholder="Interval..."
                      />
                    </TableHead>
                    <TableHead className="px-4 py-2">
                      <TableHeaderFilter
                        value={columnFilters.report_day}
                        onChange={(val) => onColumnFilterChange("report_day", val)}
                        placeholder="Day/Time..."
                      />
                    </TableHead>
                    <TableHead className="px-4 py-2">
                      <CustomDatePicker
                        value={columnFilters.last_run}
                        onChange={(val) => onColumnFilterChange("last_run", val)}
                        className="h-8 text-xs bg-white dark:bg-gray-800 dark:text-gray-200"
                      />
                    </TableHead>
                    <TableHead className="px-4 py-2">
                      <CustomDatePicker
                        value={columnFilters.createdAt}
                        onChange={(val) => onColumnFilterChange("createdAt", val)}
                        className="h-8 text-xs bg-white dark:bg-gray-800 dark:text-gray-200"
                      />
                    </TableHead>
                    <TableHead className="px-4 py-2">
                      <TableHeaderFilter
                        value={columnFilters.created_by_name}
                        onChange={(val) => onColumnFilterChange("created_by_name", val)}
                        placeholder="Creator..."
                      />
                    </TableHead>
                    <TableHead className="px-4 py-2">
                      <TableHeaderFilter
                        value={columnFilters.status}
                        onChange={(val) => onColumnFilterChange("status", val)}
                        placeholder="Status..."
                      />
                    </TableHead>
                    <TableHead className="px-4 py-2"></TableHead>
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((report) => (
                    <TableRow key={report._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 transition-colors">
                      <TableCell className="text-center text-gray-300 font-medium">#</TableCell>
                      <TableCell className="py-4 px-4 font-medium text-blue-500 hover:underline cursor-pointer" onClick={() => canUpdate ? navigate(`/custom-report/edit/${report._id}`) : navigate(`/custom-report/view/${report._id}`)}>
                        {report.report_name}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-gray-700 dark:text-gray-300">
                        {report.interval || report.report_interval || "—"}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-gray-700 dark:text-gray-300">
                        {formatTimeAMPM(report.schedule_day || report.report_day || report.schedule_time)}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-gray-500 dark:text-gray-400">
                        {report.last_run ? formatDateTimeUS(report.last_run) : "—"}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-gray-500 dark:text-gray-400">
                        {formatDateUS(report.createdAt)}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-gray-700 dark:text-gray-300">
                        {report.created_by_name || "Admin"}
                      </TableCell>
                      <TableCell className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-md text-[11px] font-bold tracking-wide shadow-sm ${(report.status || "Active") === "Active" ? "bg-green-100 text-green-600 border border-green-200" : "bg-red-100 text-red-600 border border-red-200"}`}>
                          {report.status || "Active"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-4">
                        <div className="flex items-center justify-center gap-4">
                          <button onClick={() => navigate(`/custom-report/history/${report._id}`)} title="History" className="p-1 hover:text-blue-600 text-gray-400 transition-colors">
                            <History className="w-4 h-4" />
                          </button>
                          {canUpdate && (
                            <button onClick={() => navigate(`/custom-report/edit/${report._id}`)} title="Edit" className="p-1 hover:text-blue-600 text-gray-400 transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => navigate(`/custom-report/view/${report._id}`)} title="View" className="p-1 hover:text-blue-600 text-gray-400 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDelete(report._id)} title="Delete" className="p-1 hover:text-red-600 text-gray-400 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="py-16 text-center text-gray-400 font-medium">
                      No matching reports found. {Object.values(columnFilters).some(v => v !== "") ? "Try adjusting your filters." : "Get started by creating your first report."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="p-6 border-t border-gray-100 dark:border-gray-700">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredReports.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomReport;
