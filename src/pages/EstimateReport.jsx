import React, { useEffect, useMemo, useState } from "react";
import CommonTable from "../components/ui/CommonTable";
import Pagination from "../components/shared/Pagination";
import { useEstimateReportData } from "../hooks/useEstimateReportData";
import { Button } from "@/components/ui/button";
import { Download, Filter, RefreshCw, Mail, Search, FileText } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { useCreatedByUsers } from "../hooks/useCreatedByUsers";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, } from "@/components/ui/select";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Eye, ChevronDown } from "lucide-react";
import { Estimate, Project, Customer } from "@/api/entities";
import localApi from "../services/localApi";
import clientService from "../services/clientAddService";
import ShareInvoiceModal from "../components/invoices/ShareInvoiceModal";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { useTableSort } from "../hooks/useTableSort";
import { formatDateUS, formatDateUTC } from "../utils/formatdate";

const API_BASE_URL = import.meta.env.VITE_API_BASE;


const statusStyles = {
  Draft: "bg-gray-100 text-gray-700",
  Sent: "bg-blue-100 text-blue-700",
  Approved: "bg-green-100 text-green-700",
  Declined: "bg-red-100 text-red-700",
  Invoiced: "bg-purple-100 text-purple-700",
};

const formatStatus = (status) => {
  if (!status) return "—";
  const map = {
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    declined: "Declined",
    invoiced: "Invoiced",
  };
  return map[status.toLowerCase()] || status;
};

const EstimateReport = () => {
  const { data, loading, loadEstimates } = useEstimateReportData();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedCreatedBy, setSelectedCreatedBy] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");


    const sessionVal = sessionStorage.getItem("estimateReport_creatorFilter");
    if (sessionVal !== null) return sessionVal;

    return storedUser._id || storedUser.id || "";
  });

  useEffect(() => {
    sessionStorage.setItem("estimateReport_creatorFilter", selectedCreatedBy);
  }, [selectedCreatedBy]);
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [clientInfo, setClientInfo] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const me = await localApi.getMe();
        if (me.role_type === "admin") {
          setClientInfo(me);
        } else {
          const clientId = me.created_by;
          if (clientId) {
            const client = await clientService.getClientById(clientId);
            setClientInfo(client);
          }
        }
      } catch (err) {
        console.error("Failed to fetch client info:", err);
      }
    };
    fetchClient();
  }, []);

  const createdByMap = useCreatedByUsers(data);
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search && search !== "") count++;
    if (selectedCustomer && selectedCustomer !== "all") count++;
    if (selectedCreatedBy && selectedCreatedBy !== "all" && selectedCreatedBy !== "") count++;
    if (statusFilter && statusFilter !== "all") count++;
    if (dateRange?.from || dateRange?.to) count++;
    return count;
  }, [search, selectedCustomer, selectedCreatedBy, statusFilter, dateRange]);

  useEffect(() => {
    loadEstimates();
  }, [loadEstimates]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCustomer, selectedCreatedBy, statusFilter, dateRange, columnFilters]);

  const customers = useMemo(() => {
    const map = new Map();

    data.forEach((e) => {
      // QUICK ESTIMATE
      if (e.is_quick_estimate && e.quick_customer) {
        const quickCustomer =
          e.quick_customer;

        const key =
          quickCustomer._id ||
          quickCustomer.id ||
          quickCustomer.customer_name;

        if (!map.has(key)) {
          map.set(key, {
            _id: `quick-${e._id}`,

            contact_name:
              quickCustomer.customer_name ||
              "—",

            company_name:
              quickCustomer.company_name ||
              "—",
          });
        }

        return;
      }

      // NORMAL ESTIMATE
      if (e.customer_id && !map.has(e.customer_id)) {
        map.set(e.customer_id, {
          _id: e.customer_id,

          contact_name:
            e.customer_name || "—",

          company_name:
            e.company_name || "—",
        });
      }
    });

    return Array.from(map.values());
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((e) => {
      const matchesSearch = !search || e.estimate_number?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesCustomer = selectedCustomer === "all" || e.customer_id === selectedCustomer || (e.is_quick_estimate && `quick-${e._id}` === selectedCustomer);;
      const matchesCreatedBy = selectedCreatedBy === "all" || (e.created_by_user || e.created_by) === selectedCreatedBy;

      let matchesDate = true;
      if (dateRange?.from || dateRange?.to) {
        const estDate = new Date(e.createdAt);
        const start = dateRange.from ? startOfDay(dateRange.from) : null;
        const end = dateRange.to ? endOfDay(dateRange.to) : (start ? endOfDay(start) : null);

        if (start && end) {
          matchesDate = isWithinInterval(estDate, { start, end });
        } else if (start) {
          matchesDate = estDate >= start;
        }
      } else if (dateRange?.isAllTime) {
        matchesDate = true;
      }

      const matchesColumnFilters = Object.keys(columnFilters).every((key) => {
        const filterVal = columnFilters[key];

        if (!filterVal) return true;

        let rowVal = "";

        switch (key) {
          case "company_name":
            rowVal =
              e.company_name || "";
            break;

          case "customer_name":
            rowVal =
              e.customer_name || "";
            break;

          case "project_name":
            rowVal =
              e.project_name || "";
            break;

          default:
            rowVal = String(
              e[key] || ""
            );
        }

        return rowVal
          .toLowerCase()
          .includes(
            filterVal.toLowerCase()
          );
      });

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCustomer &&
        matchesCreatedBy &&
        matchesDate &&
        matchesColumnFilters
      );
    });
  }, [data, search, statusFilter, selectedCustomer, selectedCreatedBy, dateRange, columnFilters]);

  const formattedData = useMemo(() => {
    return filteredData.map((e) => {
      const customer =
        customers.find(
          (c) =>
            c._id?.toString() ===
            e.customer_id?.toString()
        ) ||
        customers.find(
          (c) =>
            c.contact_name ===
            e.customer_name
        );

      return {
        _id: e._id || e.id,

        estimate_number:
          e.estimate_number,

        project_id: e.project_id,

        project_name:
          e.project_name,

        customer_id:
          e.customer_id,

        company_name:
          customer?.company_name ||
          e.company_name ||
          "—",

        customer_name:
          customer?.contact_name ||
          e.customer_name ||
          "—",

        division_type:
          e.division_type,

        created_by_name:
          createdByMap[
          e.created_by_user ||
          e.created_by
          ] ||
          e.created_by_name ||
          "—",

        total_amount:
          e.total_amount || 0,

        createdAt: e.createdAt,

        valid_until:
          e.valid_until,

        created_date:
          formatDateUTC(e.createdAt),

        due_date:
          formatDateUTC(e.valid_until),

        status: e.status,
      };
    });
  }, [
    filteredData,
    createdByMap,
    customers,
  ]);

  const { sortedData, sortConfig, handleSort } = useTableSort(formattedData);

  const handleExport = () => {
    if (!filteredData.length) return alert("No data to export");

    const headers = ["Estimation #", "Project Name", "Company Name",  "Contact Name","Division Type", "Total Amt", "Created Date", "Created By", "Status"];
    const rows = formattedData.map((e) => [
      `"${(e.estimate_number || "").replace(/"/g, '""')}"`,
      `"${(e.project_name || "—").replace(/"/g, '""')}"`,
      `"${(e.company_name || "—").replace(/"/g, '""')}"`,
      `"${(e.customer_name || "—").replace(/"/g, '""')}"`,
      `"${(e.division_type || "").replace(/"/g, '""')}"`,
      `$ ${e.total_amount}`,
      e.created_date,
      `"${(e.created_by_name || "").replace(/"/g, '""')}"`,
      `"${(e.status || "").replace(/"/g, '""')}"`,
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Estimates_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownloadEstimatePdf = async (estimate, type = "details") => {
    try {
      setDownloadingId(`${estimate._id}-${type}`);
      const response = await fetch(`${API_BASE_URL}/functions/generate-estimate-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          estimate_id: estimate._id,
          pdf_type: type
        })
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate_${estimate.estimate_number}_${type}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Error generating PDF: " + error.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadEstimateDocx = async (estimate, type = "details") => {
    try {
      setDownloadingId(`${estimate._id}-${type}-docx`);
      const response = await fetch(`${API_BASE_URL}/functions/generate-estimate-docx`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          estimate_id: estimate._id,
          docx_type: type
        })
      });

      if (!response.ok) throw new Error("Failed to generate Word document");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `estimate_${estimate.estimate_number}_${type}.docx`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Error generating Word document: " + error.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareData, setShareData] = useState({
    estimate: null,
    customer: null,
    project: null,
    user: null,
    client: null
  });
  const [loadingShareId, setLoadingShareId] = useState(null);

  const handleOpenShareModal = async (estimateItem) => {
    try {
      setLoadingShareId(estimateItem._id);

      const estimate = await Estimate.get(estimateItem._id);

      let project = null;
      if (estimate.project_id) {
        project = await Project.get(estimate.project_id);
      }

      let customer = null;
      const rawCustomer = estimate.is_quick_estimate
        ? estimate.quick_customer
        : (project?.customer_ids?.[0] || project?.customer_ids);

      const customerId = typeof rawCustomer === "string" ? rawCustomer : rawCustomer?._id;
      if (customerId) {
        customer = await Customer.get(customerId);
      } else if (estimate.is_quick_estimate) {
        customer = estimate.quick_customer;
      }

      const me = await localApi.getMe();
      const clientId = me.role_type === "admin" ? me.id : me.created_by;
      let client = null;
      if (clientId) {
        client = await clientService.getClientById(clientId);
      }

      setShareData({
        estimate,
        customer,
        project,
        user: me,
        client
      });
      setShowShareModal(true);
    } catch (error) {
      console.error(error);
      alert("Failed to load estimate data for sharing: " + error.message);
    } finally {
      setLoadingShareId(null);
    }
  };

  const handleExportPDF = async () => {
    if (!filteredData.length) return alert("No data to export");

    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Pre-load logo
    let logoImg = null;
    if (clientInfo?.logo) {
      try {
        const logoUrl = `${import.meta.env.VITE_IMG}${clientInfo.logo}`;
        const img = new Image();
        img.src = logoUrl;
        img.crossOrigin = "Anonymous";
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        if (img.complete && img.naturalWidth > 0) {
          logoImg = img;
        }
      } catch (err) {
        console.error("Logo loading error:", err);
      }
    }

    const drawHeader = () => {
      const headerHeight = 32;

      // Blue background banner
      doc.setFillColor(12, 84, 170);
      doc.rect(0, 0, pageWidth, headerHeight, "F");

      let textStartX = 14;

      // Logo in white rounded box on the left
      if (logoImg) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(10, 5, 22, 22, 2, 2, "F");
        doc.addImage(logoImg, "PNG", 12, 7, 18, 18);
        textStartX = 36;
      }

      // Company details to the right of the logo
      const companyName = clientInfo?.companyName || clientInfo?.company_name || "";
      const companyAddress = clientInfo?.address || "";
      const companyEmail = clientInfo?.email || "";
      const companyPhone = clientInfo?.companyPhone || clientInfo?.phone || "";
      const contactLine = [companyEmail, companyPhone].filter(Boolean).join("  |  ");

      doc.setTextColor(255, 255, 255);

      // Company Name - bold & smaller
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(companyName, textStartX, 11);

      // Address & Contact
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      if (companyAddress) {
        doc.text(companyAddress, textStartX, 17);
      }
      if (contactLine) {
        doc.text(contactLine, textStartX, companyAddress ? 23 : 17);
      }

      // Report title & generated date — right side
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Estimates Report", pageWidth - 14, 11, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(`Generated: ${formatDateUS(new Date())}`, pageWidth - 14, 17, { align: "right" });
    };

    const tableColumn = ["Estimation #", "Project Name", "Company Name", "Contact Name","Division Type", "Total Amt", "Created Date", "Created By", "Status"];
    const tableRows = formattedData.map(e => [
      e.estimate_number,
      e.project_name,
      e.company_name,
      e.division_type,
      e.customer_name,
      formatCurrency(e.total_amount),
      e.created_date,
      e.created_by_name,
      formatStatus(e.status)
    ]);

    tableRows.push([
      "", "", "", "","Total",
      formatCurrency(totals.total_amount),
      "", "", ""
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 38,
      theme: "grid",
      headStyles: { fillColor: [12, 84, 170], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      margin: { top: 38 },
      didDrawPage: drawHeader
    });

    doc.save(`Estimates_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totals = useMemo(() => {
    return formattedData.reduce(
      (acc, row) => {
        acc.total_amount += row.total_amount || 0;
        return acc;
      },
      { total_amount: 0 }
    );
  }, [formattedData]);



  const columns = [
    {
      header: "Estimate #",
      accessor: "estimate_number",
    },
    {
      header: "Project Name",
      accessor: "project_name",
      render: (row) => {
        if (!row.project_id) {
          return (
            <span className="text-gray-800 dark:text-gray-300">
              {row.project_name || "—"}
            </span>
          );
        }
        return (
          <Link
            to={`/projects/${row.project_id}`}
            className="text-blue-600 hover:underline"
          >
            {row.project_name}
          </Link>
        );
      },
    },
    {
      header: "Company Name",
      accessor: "company_name",
      filterType: "text",
      render: (row) => (
        <span className="font-medium">
          {row.company_name}
        </span>
      ),
    },
    {
      header: "Contact Name",
      accessor: "customer_name",
      filterType: "text",
      render: (row) => (
        <span
          className="text-blue-600 cursor-pointer hover:underline"
          onClick={() => {
            if (row.customer_id) {
              navigate(
                `/customers/${row.customer_id}?projectId=${row.project_id}`
              );
            }
          }}
        >
          {row.customer_name}
        </span>
      ),
    },
    // {
    //   header: "Division Type",
    //   accessor: "division_type",
    // },

    // {
    //   header: "Customer Name",
    //   accessor: "customer_name",
    //   render: (row) => (
    //     <span
    //       className="text-blue-600 cursor-pointer hover:underline"
    //       onClick={() => {
    //         if (row.customer_id) {
    //           navigate(`/customers/${row.customer_id}?projectId=${row.project_id}`);
    //         }
    //       }}
    //     >
    //       {row.customer_name}
    //     </span>
    //   ),
    // },

    {
      header: "Total Amount",
      accessor: "total_amount",
      align: "right",
      isTotal: true,
      render: (row) => formatCurrency(row.total_amount),
      renderTotal: (val) => formatCurrency(val),
    },

    {
      header: "Created Date",
      accessor: "createdAt",
      filterType: "date",
      render: (row) => row.created_date,
    },
    {
      header: "Created By",
      accessor: "created_by_name",
    },
    {
      header: "Status",
      accessor: "status",
      filterType: "select",
      filterOptions: [
        { label: "Draft", value: "draft" },
        { label: "Sent", value: "sent" },
        { label: "Approved", value: "approved" },
        { label: "Declined", value: "declined" },
        { label: "Invoiced", value: "invoiced" },
      ],
      render: (row) => {
        const status = formatStatus(row.status);
        return (
          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusStyles[status] || "bg-gray-100 text-gray-600"}`}>
            {status}
          </span>
        );
      },
    },


    {
      header: "Action",
      sortable: false,
      filterType: "none",
      render: (row) => (
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="Download Options"
                className="p-1 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                disabled={downloadingId?.startsWith(row._id)}
              >
                {downloadingId?.startsWith(row._id) ? (
                  <Loader2 size={15} className="animate-spin text-gray-400" />
                ) : (
                  <div className="flex items-center gap-0.5">
                    <Download size={15} />
                    <ChevronDown size={10} />
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => handleDownloadEstimatePdf(row, "summary")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText size={14} />
                <span>Summary PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownloadEstimatePdf(row, "details")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Eye size={14} />
                <span>Details PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownloadEstimateDocx(row, "summary")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <FileText size={14} className="text-blue-600" />
                <span className="text-blue-600">Summary Word</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDownloadEstimateDocx(row, "details")}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Eye size={14} className="text-blue-600" />
                <span className="text-blue-600">Details Word</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">Estimates Report</h1>
          <p className="text-sm text-gray-500">Manage Estimates Report</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => { setShowFilters(!showFilters); }}
            className="relative"
          >
            <Filter className="w-4 h-4" />
            {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                    {activeFiltersCount}
                </span>
            )}
          </Button>

          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* FILTERS */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 mb-4 shadow-sm flex items-center">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter Estimate Number"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 w-[200px]"
              />
            </div>

            <Select
              value={selectedCustomer}
              onValueChange={(val) => {
                setSelectedCustomer(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.contact_name || c.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedCreatedBy}
              onValueChange={(val) => {
                setSelectedCreatedBy(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Created By" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>

                {[
                  ...new Set(
                    data
                      .map((e) => e.created_by_user)
                      .filter(Boolean)
                  ),
                ].filter(id => createdByMap[id] && createdByMap[id] !== "—" && createdByMap[id] !== "Deleted User").map((id) => (
                  <SelectItem key={id} value={id}>
                    {createdByMap[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="invoiced">Invoiced</SelectItem>
              </SelectContent>
            </Select>

            <DateRangePicker
              date={dateRange}
              setDate={(val) => {
                setDateRange(val);
                setCurrentPage(1);
              }}
              className="w-[260px]"
            />
            <div className="">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setSelectedCustomer("all");
                  setSelectedCreatedBy("all");
                  setDateRange({ from: null, to: null });
                  setColumnFilters({});
                  setCurrentPage(1);
                }}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* TABLE */}
      <CommonTable
        columns={columns}
        data={paginatedData}
        loading={loading}
        showTotal={true}
        totals={totals}
        statusStyles={statusStyles}
        onSort={handleSort}
        sortConfig={sortConfig}
        columnFilters={columnFilters}
        onColumnFilterChange={(col, val) => {
          setColumnFilters(prev => ({ ...prev, [col]: val }));
          setCurrentPage(1);
        }}
      />


      {/* PAGINATION */}
      {formattedData.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(
              formattedData.length / itemsPerPage
            )}
            totalItems={formattedData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => {
              setItemsPerPage(val);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
      {showShareModal && (
        <ShareInvoiceModal
          type="estimate"
          document={shareData.estimate}
          customer={shareData.customer}
          project={shareData.project}
          user={shareData.user}
          client={shareData.client}
          onCancel={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default EstimateReport;