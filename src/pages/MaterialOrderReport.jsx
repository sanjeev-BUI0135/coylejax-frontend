import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import CommonTable from "../components/ui/CommonTable";
import Pagination from "../components/shared/Pagination";
import { useMaterialOrderReportData } from "../hooks/useMaterialOrderReportData";
import { Button } from "@/components/ui/button";
import { Download, Filter, RefreshCw } from "lucide-react";
import { useCreatedByUsers } from "../hooks/useCreatedByUsers";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, } from "@/components/ui/select";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink, FileText } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import localApi from "../services/localApi";
import clientService from "../services/clientAddService";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { useTableSort } from "../hooks/useTableSort";
import { formatDateUS, formatDateUTC } from "../utils/formatdate";
import { radioClasses } from "@mui/material/Radio";

const statusStyles = {
    Pending: "bg-yellow-100 text-yellow-700",
    "Partially Received": "bg-orange-100 text-orange-700",
    Fulfilled: "bg-green-100 text-green-700",
    Received: "bg-green-100 text-green-700",
    Ordered: "bg-blue-100 text-blue-700",
    Cancelled: "bg-red-100 text-red-700",
};

const MaterialOrderReport = () => {
    const {
        data: reportData,
        loading,
        loadReport
    } = useMaterialOrderReportData();

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const [search, setSearch] = useState("");

    const [selectedProject, setSelectedProject] = useState("all");
    const [selectedCustomer, setSelectedCustomer] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [selectedCreatedBy, setSelectedCreatedBy] = useState(() => {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");


        const sessionVal = sessionStorage.getItem("materialOrderReport_creatorFilter");
        if (sessionVal !== null) return sessionVal;

        return storedUser._id || storedUser.id || "";
    });

    useEffect(() => {
        sessionStorage.setItem("materialOrderReport_creatorFilter", selectedCreatedBy);
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

    const navigate = useNavigate();
    const createdByMap = useCreatedByUsers(reportData);

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedProject, selectedCustomer, selectedStatus, selectedCreatedBy, dateRange, columnFilters]);

    const projects = useMemo(() => {
        const map = new Map();
        reportData.forEach((item) => {
            if (item.project_id && !map.has(item.project_id)) {
                map.set(item.project_id, {
                    _id: item.project_id,
                    project_name: item.project_name
                });
            }
        });
        return Array.from(map.values());
    }, [reportData]);

    const customers = useMemo(() => {
        const map = new Map();
        reportData.forEach((item) => {
            if (item.customer_id && !map.has(item.customer_id)) {
                map.set(item.customer_id, {
                    _id: item.customer_id,
                    customer_name: item.customer_name
                });
            }
        });
        return Array.from(map.values());
    }, [reportData]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (search && search !== "") count++;
        if (selectedProject && selectedProject !== "all") count++;
        if (selectedCustomer && selectedCustomer !== "all") count++;
        if (selectedStatus && selectedStatus !== "all") count++;
        if (selectedCreatedBy && selectedCreatedBy !== "all" && selectedCreatedBy !== "") count++;
        if (dateRange?.from || dateRange?.to) count++;
        return count;
    }, [search, selectedProject, selectedCustomer, selectedStatus, selectedCreatedBy, dateRange]);

    const statuses = useMemo(() => {
        const set = new Set();
        reportData.forEach(item => {
            if (item.status) set.add(item.status);
        });
        return Array.from(set);
    }, [reportData]);

    const filteredData = useMemo(() => {
        return reportData.filter((item) => {
            const matchesSearch =
                item.project_name?.toLowerCase().includes(search.toLowerCase()) ||
                item.material?.toLowerCase().includes(search.toLowerCase()) ||
                item.customer_name?.toLowerCase().includes(search.toLowerCase());

            const matchesProject = selectedProject === "all" || item.project_id === selectedProject;
            const matchesCustomer = selectedCustomer === "all" || item.customer_id === selectedCustomer;
            const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
            const matchesCreatedBy = selectedCreatedBy === "all" || (item.created_by_user || item.created_by) === selectedCreatedBy;

            let matchesDate = true;
            if (dateRange?.from || dateRange?.to) {
                const orderDate = new Date(item.order_date);
                const start = dateRange.from ? startOfDay(dateRange.from) : null;
                const end = dateRange.to ? endOfDay(dateRange.to) : (start ? endOfDay(start) : null);

                if (start && end) {
                    matchesDate = isWithinInterval(orderDate, { start, end });
                } else if (start) {
                    matchesDate = orderDate >= start;
                }
            } else if (dateRange?.isAllTime) {
                matchesDate = true;
            }

            const matchesColumnFilters = Object.keys(columnFilters).every(key => {
                const filterVal = columnFilters[key];

                if (!filterVal && filterVal !== 0) return true;

                const value = item[key];

                const rowVal =
                    value === null || value === undefined
                        ? ""
                        : String(value).toLowerCase();

                return rowVal.includes(String(filterVal).toLowerCase());
            });

            return matchesSearch && matchesProject && matchesCustomer && matchesStatus && matchesCreatedBy && matchesDate && matchesColumnFilters;
        });
    }, [reportData, search, selectedProject, selectedCustomer, selectedStatus, selectedCreatedBy, dateRange, columnFilters]);

    const { sortedData, sortConfig, handleSort } = useTableSort(filteredData);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedData.slice(start, start + itemsPerPage);
    }, [sortedData, currentPage, itemsPerPage]);

    const totals = useMemo(() => {
        return filteredData.reduce((acc, row) => {
            acc.ordered += row.ordered || 0;
            acc.received += row.received || 0;
            acc.remaining += row.remaining || 0;
            acc.total_amt += row.total_amt || 0;
            acc.order_cost += row.order_cost || 0;
            return acc;
        }, {
            ordered: 0,
            received: 0,
            remaining: 0,
            total_amt: 0,
            order_cost: 0
        });
    }, [filteredData]);

    const handleExport = () => {
        if (!filteredData.length) return alert("No data to export");

        const headers = [
            "Project Name",
            "Contact Name",
            "Project Number",
            "Project Start Date",
            "Material",
            "Ordered",
            "Received",
            "Remaining",
            "Order Cost",
            "Total Amt",
            "Order Date",
            "Status",
        ];

        const dataRows = filteredData.map((item) => ({
            "Project Name": item.project_name || "—",
            "Contact Name": item.customer_name || "—",
            "Project Number": item.project_number || "—",
            "Project Start Date": item.estimated_start_date
                ? formatDateUTC(item.estimated_start_date)
                : "—",
            Material:
                item.materials?.length > 0
                    ? item.materials.map((m) => m.description).join(", ")
                    : item.material || "—",
            Ordered: item.ordered || 0,
            Received: item.received || 0,
            Remaining: item.remaining || 0,
            "Order Cost": `$${(item.order_cost || 0).toFixed(2)}`,
            "Total Amt": `$${(item.total_amt || 0).toFixed(2)}`,
            "Order Date": item.order_date ? formatDateUTC(item.order_date) : "—",
            Status: item.status || "",
        }));

        // Totals row
        const totalRow = {
            "Project Name": "",
            "Contact Name": "",
            "Project Number": "",
            "Project Start Date": "",
            Material: "TOTAL",
            Ordered: totals.ordered,
            Received: totals.received,
            Remaining: totals.remaining,
            "Order Cost": `$${(totals.order_cost || 0).toFixed(2)}`,
            "Total Amt": `$${(totals.total_amt || 0).toFixed(2)}`,
            "Order Date": "",
            Status: "",
        };

        const worksheetData = [headers, ...dataRows.map((r) => headers.map((h) => r[h])), headers.map((h) => totalRow[h])];

        const ws = XLSX.utils.aoa_to_sheet(worksheetData);

        // Auto-filter on header row (row 0)
        ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };

        // Freeze the header row
        ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft" };

        // Column widths
        ws["!cols"] = [
            { wch: 28 }, // Project Name
            { wch: 22 }, // Contact Name
            { wch: 16 }, // Project Number
            { wch: 18 }, // Project Start Date
            { wch: 32 }, // Material
            { wch: 10 }, // Ordered
            { wch: 10 }, // Received
            { wch: 10 }, // Remaining
            { wch: 14 }, // Order Cost
            { wch: 14 }, // Total Amt
            { wch: 14 }, // Order Date
            { wch: 18 }, // Status
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Material Order Report");

        XLSX.writeFile(wb, `Material_Order_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handleDownloadRow = (item) => {
        const headers = ["Project Name", "Contact Name", "Material", "Ordered", "Received", "Remaining", "Total Amt", "Order Date", "Status"];
        const row = [
            `"${(item.project_name || "—").replace(/"/g, '""')}"`,
            `"${(item.customer_name || "—").replace(/"/g, '""')}"`,
            `"${(item.material || "—").replace(/"/g, '""')}"`,
            item.ordered,
            item.received,
            item.remaining,
            item.total_amt,
            formatDateUTC(item.order_date),
            `"${(item.status || "").replace(/"/g, '""')}"`
        ].join(",");

        const csv = [headers.join(","), row].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Material_Order_${item.project_name.replace(/ /g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
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
            doc.text("Material Order Report", pageWidth - 14, 11, { align: "right" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text(`Generated: ${formatDateUS(new Date())}`, pageWidth - 14, 17, { align: "right" });
        };

        const tableColumn = ["Project Name", "Contact Name", "Project Number", "Project Start Date", "Material", "Ordered", "Received", "Remaining", "Order Cost", "Total Amt", "Order Date", "Status"];
        const tableRows = filteredData.map(item => [
            item.project_name,
            item.customer_name,
            item.project_number,
            item.estimated_start_date ? formatDateUTC(item.estimated_start_date) : "—",
            item.materials?.length > 1
                ? item.materials.map(m => m.description).join(", ")
                : item.material,
            item.ordered,
            item.received,
            item.remaining,
            formatCurrency(item.order_cost),
            formatCurrency(item.total_amt),
            formatDateUTC(item.order_date),
            item.status
        ]);

        tableRows.push([
            "", "", "", "", "Total",
            filteredData.reduce((sum, item) => sum + (item.ordered || 0), 0),
            filteredData.reduce((sum, item) => sum + (item.received || 0), 0),
            filteredData.reduce((sum, item) => sum + (item.remaining || 0), 0),
            formatCurrency(filteredData.reduce((sum, item) => sum + (item.order_cost || 0), 0)),
            formatCurrency(filteredData.reduce((sum, item) => sum + (item.total_amt || 0), 0)),
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

        doc.save(`Material_Order_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const columns = [
        {
            header: "Project Name",
            accessor: "project_name",
            render: (row) => {
                const projectName = row.project_name || row.quick_customer?.project_name || "—";
                return row.project_id ? (
                    <Link to={`/projects/${row.project_id}`} className="text-blue-600 hover:underline" >
                        {projectName}
                    </Link>
                ) : (
                    <span>{projectName}</span>
                );
            }
        },
        {
            header: "Contact Name",
            accessor: "customer_name",
            render: (row) => {
                const customerName =
                    row.customer_name ||
                    row.quick_customer?.customer_name ||
                    "—";

                return row.customer_id ? (
                    <Link
                        to={`/customers/${row.customer_id}`}
                        className="text-blue-600 hover:underline"
                    >
                        {customerName}
                    </Link>
                ) : (
                    <span>{customerName}</span>
                );
            }
        },
        {
            header: "Project Number",
            accessor: "project_number",
            render: (row) => row.project_number || "—"
        },
        {
            header: "Project Start Date",
            accessor: "estimated_start_date",
            filterType: "date",
            render: (row) => row.estimated_start_date ? formatDateUTC(row.estimated_start_date) : "—"
        },
        {
            header: "Material",
            accessor: "material",
            render: (row) => {
                const materials = row.materials || [];
                const displayMaterial = materials.length > 0 ? materials[0].description : row.material;
                const hasMore = materials.length > 1 || (displayMaterial && displayMaterial.length > 30);

                return (
                    <div className="flex items-center gap-1">
                        <span className="truncate max-w-[200px]" title={row.material}>
                            {displayMaterial}
                            {materials.length > 1 && <span className="text-gray-400 ml-1">+{materials.length - 1} more</span>}
                        </span>
                        {hasMore && (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <span className="text-blue-500 hover:text-blue-700 cursor-pointer text-xs font-medium underline-offset-2 hover:underline">
                                        view more
                                    </span>
                                </PopoverTrigger>
                                <PopoverContent side="top" className="w-96 p-3 shadow-xl border-gray-200">
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-sm border-b dark:border-gray-700/50 pb-1 dark:text-gray-100">Material Details</h4>
                                        <div className="max-h-60 overflow-y-auto">
                                            <ul className="space-y-2">
                                                {materials.length > 0 ? (
                                                    materials.map((m, idx) => {
                                                        const receivedCost = Number(m.received || 0) * Number(m.unit_price || m.order_cost || 0);
                                                        return (
                                                            <li key={idx} className="text-sm text-gray-600 dark:text-gray-300 border-b border-gray-50 dark:border-gray-700/50 pb-1 last:border-0">
                                                                <div className="font-medium text-gray-800 dark:text-gray-200">{m.description}</div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                                                                    <span>Ordered: {m.ordered} {m.unit}</span>
                                                                    <span>Received: {m.received}</span>
                                                                    <span className="font-medium text-gray-700 dark:text-gray-300">Received Cost: {formatCurrency(receivedCost)}</span>
                                                                </div>
                                                            </li>
                                                        );
                                                    })
                                                ) : (
                                                    <p className="text-sm text-gray-600 dark:text-gray-300 break-words leading-relaxed">
                                                        {row.material}
                                                    </p>
                                                )}
                                            </ul>
                                        </div>
                                        {materials.length > 1 && (
                                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 border-t dark:border-gray-700/50 pt-1 flex justify-end">
                                                Total Received Cost: {formatCurrency(
                                                    materials.reduce((sum, m) => sum + Number(m.received || 0) * Number(m.unit_price || m.order_cost || 0), 0)
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Ordered",
            accessor: "ordered",
            align: "left",
            isTotal: true,
        },
        {
            header: "Received",
            accessor: "received",
            align: "left",
            isTotal: true,
        },
        {
            header: "Remaining",
            accessor: "remaining",
            align: "left",
            isTotal: true,
        },
        {
            header: "Order Cost",
            accessor: "order_cost",
            align: "right",
            isTotal: true,
            render: (row) => {
                const materials = row.materials || [];
                if (materials.length <= 1) {
                    // Single material: show its own cost
                    return formatCurrency(row.order_cost);
                }
                // Multiple materials: show total with a subtle indicator
                return (
                    <span className="font-semibold text-gray-800">
                        {formatCurrency(row.order_cost)}
                    </span>
                );
            },
            renderTotal: (val) => formatCurrency(val)
        },
        {
            header: "Total Amt",
            accessor: "total_amt",
            align: "right",
            isTotal: true,
            render: (row) => formatCurrency(row.total_amt),
            renderTotal: (val) => formatCurrency(val)
        },
        {
            header: "Order Date",
            accessor: "order_date",
            filterType: "date",
            render: (row) => formatDateUTC(row.order_date)
        },
        {
            header: "Status",
            accessor: "status",
            filterType: "select",
            filterOptions: statuses.map(s => ({ label: s, value: s })),
            render: (row) => (
                <span
                    className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 text-xs font-semibold rounded-full ${statusStyles[row.status] || "bg-gray-100 text-gray-600"
                        }`}
                >
                    {row.status}
                </span>
            )
        },
        {
            header: "Actions",
            accessor: "actions",
            sortable: true,
            filterType: "none",
            render: (row) => (
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" title="View Details" onClick={() => navigate(`/material-orders/${row._id}`, { state: { from: 'material-order-report' } })}>
                        <ExternalLink className="w-4 h-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <TooltipProvider>
            <div className="p-4">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">Material Order Report</h1>
                        <p className="text-sm text-gray-500">Manage Material Order Report</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="relative">
                            <Filter className="w-4 h-4 mr-2" />
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </Button>
                        <Button onClick={handleExport} variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export Excel
                        </Button>
                        <Button onClick={handleExportPDF} variant="outline" size="sm">
                            <FileText className="w-4 h-4 mr-2" />
                            Export PDF
                        </Button>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 mb-6 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                            <div>
                                <label className="text-xs font-medium mb-1 block">Project</label>
                                <Select
                                    value={selectedProject}
                                    onValueChange={(val) => {
                                        setSelectedProject(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Project" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Projects</SelectItem>
                                        {projects.map(p => <SelectItem key={p._id} value={p._id}>{p.project_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-medium mb-1 block">Customer</label>
                                <Select
                                    value={selectedCustomer}
                                    onValueChange={(val) => {
                                        setSelectedCustomer(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Contact" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Contacts</SelectItem>
                                        {customers.map(c => <SelectItem key={c._id} value={c._id}>{c.customer_name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-medium mb-1 block">Created By</label>
                                <Select
                                    value={selectedCreatedBy}
                                    onValueChange={(val) => {
                                        setSelectedCreatedBy(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Created By" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="all">All Users</SelectItem>

                                        {[
                                            ...new Set(
                                                reportData
                                                    .map((item) => item.created_by_user)
                                                    .filter(Boolean)
                                            ),
                                        ].filter(id => createdByMap[id] && createdByMap[id] !== "—" && createdByMap[id] !== "Deleted User").map((id) => (
                                            <SelectItem key={id} value={id}>
                                                {createdByMap[id]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-medium mb-1 block">Status</label>
                                <Select
                                    value={selectedStatus}
                                    onValueChange={(val) => {
                                        setSelectedStatus(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-xs font-medium mb-1 block">Date Range</label>
                                <DateRangePicker
                                    date={dateRange}
                                    setDate={(val) => {
                                        setDateRange(val);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => {
                                    setSearch("");
                                    setSelectedProject("all");
                                    setSelectedCustomer("all");
                                    setSelectedStatus("all");
                                    setSelectedCreatedBy("all");
                                    setDateRange({ from: null, to: null });
                                    setColumnFilters({});
                                    setCurrentPage(1);
                                }}>
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <CommonTable
                    columns={columns}
                    data={paginatedData}
                    loading={loading}
                    showTotal={true}
                    totals={totals}
                    onSort={handleSort}
                    sortConfig={sortConfig}
                    columnFilters={columnFilters}
                    onColumnFilterChange={(col, val) => {
                        setColumnFilters(prev => ({ ...prev, [col]: val }));
                        setCurrentPage(1);
                    }}
                />

                {filteredData.length > 0 && (
                    <div className="mt-4">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(filteredData.length / itemsPerPage)}
                            totalItems={filteredData.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={(val) => {
                                setItemsPerPage(val);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
};

export default MaterialOrderReport;
