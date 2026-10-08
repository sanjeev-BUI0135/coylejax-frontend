import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, CheckCircle2, XCircle, History, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import customReportService from "../services/customReportService";
import { formatDateUS, formatDateTimeUS } from "../utils/formatdate";
import Pagination from "../components/shared/Pagination";
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

const CustomReportHistory = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser?.role_type?.toLowerCase() === "admin";
  const perms = currentUser?.permissions || [];
  const canView = isAdmin || hasPermission(perms, "Reports", "view", "CustomReport");

  const [logs, setLogs] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reportData, historyData] = await Promise.all([
          customReportService.getCustomReportById(id),
          customReportService.getReportHistory(id)
        ]);
        setReport(reportData);
        setLogs(Array.isArray(historyData) ? historyData : []);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            {report ? report.report_name : "Automated Report"} - History
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage Report History</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/custom-report")}
          className="bg-blue-600 text-white hover:bg-blue-700 h-10 px-6 border-none"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium italic">Loading history...</div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto table-listrow-divstyle">
            <Table className="text-sm">
              <TableHeader className="bg-gray50-temp text-gray-700temp font-medium dark:bg-gray-900">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 px-3 text-gray-700 dark:text-gray-300 font-semibold">Report Interval</TableHead>
                  <TableHead className="py-3 px-3 text-gray-700 dark:text-gray-300 font-semibold">Report Day</TableHead>
                  <TableHead className="py-3 px-3 text-gray-700 dark:text-gray-300 font-semibold">Report Execution Date</TableHead>
                  <TableHead className="py-3 px-3 text-gray-700 dark:text-gray-300 font-semibold text-center">Email Status</TableHead>
                  <TableHead className="py-3 px-3 text-gray-700 dark:text-gray-300 font-semibold text-center">Download</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedLogs.map((log) => (
                  <TableRow key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 transition-colors">
                    <TableCell className="py-3 px-3 text-gray-700 dark:text-gray-300">
                      {log.interval || "Daily"}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-gray-700 dark:text-gray-300">
                      {formatTimeAMPM(log.schedule_time || "10:00:00")}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-gray-700 dark:text-gray-300">
                      {formatDateTimeUS(log.execution_date)}
                    </TableCell>
                    <TableCell className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold tracking-wide shadow-sm ${log.email_status === "Success"
                        ? "bg-green-100 text-green-600 border border-green-200"
                        : "bg-red-100 text-red-600 border border-red-200"
                        }`}>
                        {log.email_status === "Success" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {log.email_status}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-3 text-center">
                      {log.email_status === "Success" && (
                        <button
                          className="p-2 hover:text-blue-600 text-gray-400 transition-colors"
                          title="Download Report"
                          onClick={async () => {
                            try {
                              const blob = await customReportService.exportReport(id);
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `${report?.report_name || "report"}.xlsx`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } catch (error) {
                              console.error("Download error:", error);
                            }
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-6 border-t border-gray-100 ">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={logs.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="p-24 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <History className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No history found</h2>
            <p className="text-gray-400 mb-8 max-w-sm">This report has not been executed yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomReportHistory;
