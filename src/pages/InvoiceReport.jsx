import React, { useEffect, useMemo, useState } from "react";
import CommonTable from "../components/ui/CommonTable";
import Pagination from "../components/shared/Pagination";
import { useInvoiceReportData } from "../hooks/useInvoiceReportData";
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
import { Invoice, Project, Customer } from "@/api/entities";
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
    Paid: "bg-green-100 text-green-700",
    Partial: "bg-yellow-100 text-yellow-700",
    Void: "bg-red-100 text-red-700",
    Overdue: "bg-red-200 text-red-900",
};

const formatStatus = (status) => {
    if (!status) return "—";
    const map = {
        draft: "Draft",
        sent: "Sent",
        paid: "Paid",
        partial: "Partial",
        void: "Void",
        overdue: "Overdue",
    };
    return map[status.toLowerCase()] || status;
};

const InvoiceReport = () => {
    const { data, loading, loadInvoices } = useInvoiceReportData();
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const [searchInvoice, setSearchInvoice] = useState("");
    const [searchEstimate, setSearchEstimate] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedCustomer, setSelectedCustomer] = useState("all");
    const [selectedCreatedBy, setSelectedCreatedBy] = useState(() => {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");


        const sessionVal = sessionStorage.getItem("invoiceReport_creatorFilter");
        if (sessionVal !== null) return sessionVal;

        return storedUser._id || storedUser.id || "";
    });

    useEffect(() => {
        sessionStorage.setItem("invoiceReport_creatorFilter", selectedCreatedBy);
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

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchInvoice, searchEstimate, statusFilter, selectedCustomer, selectedCreatedBy, dateRange, columnFilters]);

    const customers = useMemo(() => {
        const map = new Map();

        data.forEach((inv) => {
            if (
                inv.customer_id &&
                !map.has(inv.customer_id)
            ) {
                map.set(inv.customer_id, {
                    _id: inv.customer_id,

                    contact_name:
                        inv.customer_name || "—",

                    company_name:
                        inv.company_name || "—",
                });
            }
        });

        return Array.from(map.values());
    }, [data]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (searchInvoice && searchInvoice !== "") count++;
        if (searchEstimate && searchEstimate !== "") count++;
        if (selectedCustomer && selectedCustomer !== "all") count++;
        if (selectedCreatedBy && selectedCreatedBy !== "all" && selectedCreatedBy !== "") count++;
        if (statusFilter && statusFilter !== "all") count++;
        if (dateRange?.from || dateRange?.to) count++;
        return count;
    }, [searchInvoice, searchEstimate, selectedCustomer, selectedCreatedBy, statusFilter, dateRange]);

    const filteredData = useMemo(() => {
        return data.filter((inv) => {
            const matchesInvoice = !searchInvoice || inv.invoice_number?.toLowerCase().includes(searchInvoice.toLowerCase());
            const matchesEstimate = !searchEstimate || inv.estimate_number?.toLowerCase().includes(searchEstimate.toLowerCase());
            const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
            const matchesCustomer = selectedCustomer === "all" || inv.customer_id === selectedCustomer;
            const matchesCreatedBy = selectedCreatedBy === "all" || (inv.created_by_user || inv.created_by) === selectedCreatedBy;

            let matchesDate = true;
            if (dateRange?.from || dateRange?.to) {
                const invDate = new Date(inv.createdAt);
                const start = dateRange.from ? startOfDay(dateRange.from) : null;
                const end = dateRange.to ? endOfDay(dateRange.to) : (start ? endOfDay(start) : null);

                if (start && end) {
                    matchesDate = isWithinInterval(invDate, { start, end });
                } else if (start) {
                    matchesDate = invDate >= start;
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
                            inv.company_name || "";
                        break;

                    case "customer_name":
                        rowVal =
                            inv.customer_name || "";
                        break;

                    case "project_name":
                        rowVal =
                            inv.project_name || "";
                        break;

                    default:
                        rowVal = String(
                            inv[key] || ""
                        );
                }

                return rowVal
                    .toLowerCase()
                    .includes(
                        filterVal.toLowerCase()
                    );
            });

            return (
                matchesInvoice &&
                matchesEstimate &&
                matchesStatus &&
                matchesCustomer &&
                matchesCreatedBy &&
                matchesDate &&
                matchesColumnFilters
            );
        });
    }, [data, searchInvoice, searchEstimate, statusFilter, selectedCustomer, selectedCreatedBy, dateRange, columnFilters]);

    const formattedData = useMemo(() => {
        return filteredData.map((inv) => {
            const customer =
                customers.find(
                    (c) =>
                        c._id?.toString() ===
                        inv.customer_id?.toString()
                ) ||
                customers.find(
                    (c) =>
                        c.contact_name ===
                        inv.customer_name
                );

            return {
                ...inv,

                _id: inv._id || inv.id,

                company_name:
                    customer?.company_name ||
                    inv.company_name ||
                    "—",

                customer_name:
                    customer?.contact_name ||
                    inv.customer_name ||
                    "—",

                total_amount:
                    parseFloat(inv.total_amount) || 0,

                paid_amount:
                    parseFloat(inv.paid_amount) || 0,

                balance_amount:
                    parseFloat(inv.balance_amount) || 0,

                invoice_date:
                    formatDateUTC(inv.createdAt),

                created_by_name:
                    createdByMap[
                    inv.created_by_user ||
                    inv.created_by
                    ] ||
                    inv.created_by_name ||
                    "—",
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

        const headers = ["Invoice #", "Estimation #", "Project Name", "Company Name","Contact Name", "Total Amt", "Paid Amt", "Balance Amt", "Created By", "Invoice Date", "Status"];
        const rows = formattedData.map((inv) => [
            `"${(inv.invoice_number || "").replace(/"/g, '""')}"`,
            `"${(inv.estimate_number || "").replace(/"/g, '""')}"`,
            `"${(inv.project_name || "—").replace(/"/g, '""')}"`,
            `"${(inv.company_name || "—").replace(/"/g, '""')}"`,
            `"${(inv.customer_name || "—").replace(/"/g, '""')}"`,
            `$ ${inv.total_amount}`,
            `$ ${inv.paid_amount}`,
            `$ ${inv.balance_amount}`,
            `"${(inv.created_by_name || "").replace(/"/g, '""')}"`,
            inv.invoice_date,
            `"${(inv.status || "").replace(/"/g, '""')}"`,
        ].join(","));

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Invoices_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
    };

    const [downloadingId, setDownloadingId] = useState(null);

    const handleDownloadInvoicePdf = async (invoice, type = "details") => {
        try {
            setDownloadingId(`${invoice._id}-${type}`);
            const response = await fetch(`${API_BASE_URL}/functions/generate-invoice-pdf`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    invoice_id: invoice._id,
                    pdf_type: type
                })
            });

            if (!response.ok) throw new Error("PDF generation failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice_${invoice.invoice_number}_${type}.pdf`;
            a.click();

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert("Error generating PDF: " + error.message);
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDownloadInvoiceDocx = async (invoice, type = "details") => {
        try {
            setDownloadingId(`${invoice._id}-${type}-docx`);
            const response = await fetch(`${API_BASE_URL}/functions/generate-invoice-docx`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    invoice_id: invoice._id,
                    docx_type: type
                })
            });

            if (!response.ok) throw new Error("Word document generation failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `invoice_${invoice.invoice_number}_${type}.docx`;
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
        invoice: null,
        customer: null,
        project: null,
        user: null,
        client: null
    });
    const [loadingShareId, setLoadingShareId] = useState(null);

    const handleOpenShareModal = async (invoiceItem) => {
        try {
            setLoadingShareId(invoiceItem._id);

            const invoice = await Invoice.get(invoiceItem._id);
            const clientData = await clientService.getClientById(invoice.created_by);
            const [projectData, me] = await Promise.all([
                Project.get(invoice.project_id),
                localApi.getMe()
            ]);

            const customerRaw = projectData?.customer_ids?.[0];
            const customerId = typeof customerRaw === "object" ? (customerRaw?._id || customerRaw?.id) : customerRaw;

            let customerData = null;
            if (customerId) {
                customerData = await Customer.get(customerId);
            }

            setShareData({
                invoice,
                customer: customerData,
                project: projectData,
                user: me,
                client: clientData
            });
            setShowShareModal(true);
        } catch (error) {
            console.error(error);
            alert("Failed to load invoice data for sharing: " + error.message);
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
            doc.text("Invoices Report", pageWidth - 14, 11, { align: "right" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text(`Generated: ${formatDateUS(new Date())}`, pageWidth - 14, 17, { align: "right" });
        };

        const tableColumn = ["Invoice #", "Estimation #", "Project Name", "Company Name","Contact Name", "Total Amt", "Paid Amt", "Balance Amt", "Created By", "Invoice Date", "Status"];
        const tableRows = formattedData.map(inv => [
            inv.invoice_number,
            inv.estimate_number,
            inv.project_name,
            inv.company_name,
            inv.customer_name,
            formatCurrency(inv.total_amount),
            formatCurrency(inv.paid_amount),
            formatCurrency(inv.balance_amount),
            inv.created_by_name,
            inv.invoice_date,
            inv.status
        ]);

        tableRows.push([
            "", "", "", "","Total",
            formatCurrency(totals.total_amount),
            formatCurrency(totals.paid_amount),
            formatCurrency(totals.balance_amount),
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

        doc.save(`Invoices_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const paginatedData = sortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totals = useMemo(() => {
        return formattedData.reduce(
            (acc, row) => {
                acc.total_amount += row.total_amount || 0;
                acc.paid_amount += row.paid_amount || 0;
                acc.balance_amount += row.balance_amount || 0;
                return acc;
            },
            { total_amount: 0, paid_amount: 0, balance_amount: 0 }
        );
    }, [formattedData]);

    const columns = [
        {
            header: "Invoice #",
            accessor: "invoice_number",
            render: (row) => (
                <Link to={`/invoices/${row._id}`} className="text-blue-600 hover:underline">
                    {row.invoice_number}
                </Link>
            )
        },
        {
            header: "Estimation #",
            accessor: "estimate_number",
            render: (row) => (
                row.estimate_id ? (
                    <Link to={`/estimate/${row.estimate_id}`} className="text-blue-600 hover:underline">
                        {row.estimate_number}
                    </Link>
                ) : (
                    <span>{row.estimate_number}</span>
                )
            )
        },
        {
            header: "Project Name",
            accessor: "project_name",
            render: (row) => (
                <Link to={`/projects/${row.project_id}`} className="text-blue-600 hover:underline">
                    {row.project_name}
                </Link>
            )
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
        // { header: "Customer Name", accessor: "customer_name" },
        {
            header: "Total Amt",
            accessor: "total_amount",
            align: "right",
            isTotal: true,
            render: (row) => formatCurrency(row.total_amount),
            renderTotal: (val) => formatCurrency(val)
        },
        {
            header: "Paid Amt",
            accessor: "paid_amount",
            align: "right",
            isTotal: true,
            render: (row) => formatCurrency(row.paid_amount),
            renderTotal: (val) => formatCurrency(val)
        },
        {
            header: "Balance Amt",
            accessor: "balance_amount",
            align: "right",
            isTotal: true,
            render: (row) => formatCurrency(row.balance_amount),
            renderTotal: (val) => formatCurrency(val)
        },
        { header: "Created By", accessor: "created_by_name" },
        { header: "Invoice Date", accessor: "createdAt", filterType: "date", render: (row) => row.invoice_date },
        {
            header: "Status",
            accessor: "status",
            filterType: "select",
            filterOptions: [
                { label: "Draft", value: "draft" },
                { label: "Sent", value: "sent" },
                { label: "Paid", value: "paid" },
                { label: "Partial", value: "partial" },
                { label: "Void", value: "void" },
                { label: "Overdue", value: "overdue" },
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
                                onClick={() => handleDownloadInvoicePdf(row, "summary")}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <FileText size={14} />
                                <span>Summary PDF</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleDownloadInvoicePdf(row, "details")}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Eye size={14} />
                                <span>Details PDF</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleDownloadInvoiceDocx(row, "summary")}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <FileText size={14} className="text-blue-600" />
                                <span className="text-blue-600">Summary Word</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleDownloadInvoiceDocx(row, "details")}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Eye size={14} className="text-blue-600" />
                                <span className="text-blue-600">Details Word</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* <button
                        title="Share via Email"
                        className="p-1 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                        onClick={() => handleOpenShareModal(row)}
                        disabled={loadingShareId === row._id}
                    >
                        {loadingShareId === row._id ? (
                            <Loader2 size={15} className="animate-spin text-gray-400" />
                        ) : (
                            <Mail size={15} />
                        )}
                    </button> */}
                </div>
            ),
        },
    ];

    return (
        <div className="">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-xl font-bold">Invoices Report</h1>
                    <p className="text-sm text-gray-500">Manage Invoices Report</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showFilters ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
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
                                placeholder="Enter Invoice Number"
                                value={searchInvoice}
                                onChange={(e) => {
                                    setSearchInvoice(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-8 w-[180px]"
                            />
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Enter Estimate Number"
                                value={searchEstimate}
                                onChange={(e) => {
                                    setSearchEstimate(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-8 w-[180px]"
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
                                            .map((inv) => inv.created_by_user)
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
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="partial">Partial</SelectItem>
                                <SelectItem value="void">Void</SelectItem>
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
                                    setSearchInvoice("");
                                    setSearchEstimate("");
                                    setStatusFilter("all");
                                    setSelectedCustomer("all");
                                    setSelectedCreatedBy("all");
                                    setDateRange(undefined);
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
                        totalPages={Math.ceil(formattedData.length / itemsPerPage)}
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
                    type="invoice"
                    document={shareData.invoice}
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

export default InvoiceReport;
