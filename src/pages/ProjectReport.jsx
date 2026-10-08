import { useEffect, useState, useMemo } from "react";
import CommonTable from "../components/ui/CommonTable";
import Pagination from "../components/shared/Pagination";
import { useProjectReportData } from "../hooks/useProjectReportData";
import { useTableSort } from "../hooks/useTableSort";
import { Button } from "@/components/ui/button";
import { Download, Filter, RefreshCw } from "lucide-react";
import { useCreatedByUsers } from "../hooks/useCreatedByUsers";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, } from "@/components/ui/select";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Link, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { formatCurrency, formatDate, formatProjectName } from "@/lib/utils";
import localApi from "../services/localApi";
import clientService from "../services/clientAddService";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { formatDateUS, formatDateUTC } from "../utils/formatdate";

const statusStyles = {
    Open: "bg-blue-100 text-blue-700",
    Processing: "bg-yellow-100 text-yellow-700",
    "Actively Working": "bg-indigo-100 text-indigo-800",
    Completed: "bg-green-100 text-green-700",
    Reopen: "bg-gray-200 text-gray-700",
};

const formatStatus = (status) => {
    if (!status) return "—";

    const map = {
        open: "Open",
        processing: "Processing",
        actively_working: "Actively Working",
        completed: "Completed",
        reopen: "Reopen",
    };

    return map[status.toLowerCase()] || status;
};

const ProjectReport = () => {
    const {
        data: projects,
        loading,
        loadReport
    } = useProjectReportData();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [columnFilters, setColumnFilters] = useState({});
    const createdByMap = useCreatedByUsers(projects);

    const customers = useMemo(() => {
        const map = new Map();

        projects.forEach((p) => {
            const cust = p.customer_ids?.[0];

            if (!cust) return;

            const customerId =
                cust._id || cust.id;

            if (!customerId) return;

            if (!map.has(customerId)) {
                map.set(customerId, {
                    _id: customerId,

                    contact_name:
                        cust.contact_name ||
                        cust.customer_name ||
                        "—",

                    company_name:
                        cust.company_name || "—",
                });
            }
        });

        return Array.from(map.values());
    }, [projects]);

    const [selectedProject, setSelectedProject] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedCreatedBy, setSelectedCreatedBy] = useState(() => {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");


        const sessionVal = sessionStorage.getItem("projectReport_creatorFilter");
        if (sessionVal !== null) return sessionVal;

        return storedUser._id || storedUser.id || "";
    });
    
    useEffect(() => {
        sessionStorage.setItem("projectReport_creatorFilter", selectedCreatedBy);
    }, [selectedCreatedBy]);
    const [dateRange, setDateRange] = useState({ from: null, to: null });
    const [clientInfo, setClientInfo] = useState(null);

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
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedProject && selectedProject !== "all") count++;
        if (selectedCustomer && selectedCustomer !== "all") count++;
        if (selectedCreatedBy && selectedCreatedBy !== "all" && selectedCreatedBy !== "") count++;
        if (statusFilter && statusFilter !== "all") count++;
        if (dateRange?.from || dateRange?.to) count++;
        return count;
    }, [selectedProject, selectedCustomer, selectedCreatedBy, statusFilter, dateRange]);

    const navigate = useNavigate();
    useEffect(() => {
        loadReport();
    }, [loadReport]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedProject, selectedCustomer, selectedCreatedBy, statusFilter, dateRange, columnFilters]);

    const filteredData = useMemo(() => {
        return projects.filter((p) => {
            const matchesSearch = p.project_name?.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === "all" || p.status === statusFilter;
            const matchesProject =
                selectedProject === "all" ||
                !selectedProject ||
                p._id === selectedProject;
            const matchesCustomer = selectedCustomer === "all" || !selectedCustomer || p.customer_ids?.[0]?._id === selectedCustomer;
            const matchesCreatedBy = selectedCreatedBy === "all" || !selectedCreatedBy || (p.created_by_user || p.created_by) === selectedCreatedBy;

            let matchesDate = true;
            if (dateRange?.from || dateRange?.to) {
                const projDate = new Date(p.createdAt);
                const start = dateRange.from ? startOfDay(dateRange.from) : null;
                const end = dateRange.to ? endOfDay(dateRange.to) : (start ? endOfDay(start) : null);

                if (start && end) {
                    matchesDate = isWithinInterval(projDate, { start, end });
                } else if (start) {
                    matchesDate = projDate >= start;
                }
            } else if (dateRange?.isAllTime) {
                matchesDate = true;
            }

            return (
                matchesSearch &&
                matchesStatus &&
                matchesProject &&
                matchesCustomer &&
                matchesCreatedBy &&
                matchesDate
            );
        });
    }, [projects, search, statusFilter, selectedProject, selectedCustomer, selectedCreatedBy, dateRange]);

    const columnFilteredData = useMemo(() => {
        const mappedData = filteredData.map((p) => {
            const customerId =
                p.customer_ids?.[0]?._id ||
                p.customer_ids?.[0];

            const customer = customers.find(
                (c) =>
                    c._id?.toString() ===
                    customerId?.toString() ||
                    c.id?.toString() ===
                    customerId?.toString()
            );

            return {
                _id: p._id || p.id,

                company_name:
                    customer?.company_name || "—",

                customer_id: customer?._id,

                project_name:
                    p.project_name || "—",

                division_type:
                    p.project_type_name ||
                    p.project_type?.replace(/_/g, " "),

                customer_name:
                    customer?.contact_name ||
                    customer?.company_name ||
                    "—",

                project_number:
                    p.project_number || "—",

                project_value:
                    p.estimated_value || 0,

                total_revenue:
                    p.total_revenue,

                total_cost:
                    p.total_cost,

                net_profit:
                    p.net_profit,

                created_by:
                    createdByMap[
                    p.created_by_user ||
                    p.created_by
                    ] || "—",

                createdAt: p.createdAt,

                created_date:
                    formatDateUTC(p.createdAt),

                status: p.status,
            };
        });

        if (
            !Object.values(columnFilters).some(Boolean)
        ) {
            return mappedData;
        }

        return mappedData.filter((row) =>
            Object.keys(columnFilters).every((key) => {
                const filterVal =
                    columnFilters[key];

                if (!filterVal) return true;

                return String(
                    row[key] || ""
                )
                    .toLowerCase()
                    .includes(
                        filterVal.toLowerCase()
                    );
            })
        );
    }, [
        filteredData,
        columnFilters,
        createdByMap,
        customers,
    ]);

    const formattedData = columnFilteredData;


    const handleExport = () => {
        if (!projects.length) return alert("No data");

        const headers = ["Project Name", "Company Name", "Contact Name", "Division", "Value",
            "Revenue", "Cost", "Profit", "Created By", "Date", "Status",
        ];

        const rows = formattedData.map((p) => {
            return [
                `"${(p.project_name || "—").replace(/"/g, '""')}"`,
                p.company_name,
                p.customer_name,
                p.division_type,
                `$ ${p.project_value}`,
                `$ ${p.total_revenue}` || 0,
                `$ ${p.total_cost}` || 0,
                `$ ${(p.total_revenue || 0) - (p.total_cost || 0)}`,
                p.created_by,
                p.created_date,
                p.status,
            ].join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Project_Report.csv";
        a.click();
    };

    const handleExportPDF = async () => {
        if (!projects.length) return alert("No data to export");

        const doc = new jsPDF("l", "mm", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();

        // ================= LOGO =================
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

        // ================= HEADER =================
        const drawHeader = () => {
            const headerHeight = 34;

            // Blue Banner
            doc.setFillColor(12, 84, 170);
            doc.rect(0, 0, pageWidth, headerHeight, "F");

            let textStartX = 16;

            // ===== LOGO =====
            if (logoImg) {
                doc.setFillColor(255, 255, 255);

                // smaller white box
                doc.roundedRect(10, 6, 28, 18, 2, 2, "F");

                // smaller logo
                doc.addImage(logoImg, "PNG", 12, 8, 24, 14);

                textStartX = 42;
            }

            // ===== COMPANY INFO =====
            const companyName =
                clientInfo?.companyName ||
                clientInfo?.company_name ||
                "";

            const companyAddress =
                clientInfo?.address || "";

            const companyEmail =
                clientInfo?.email || "";

            const companyPhone =
                clientInfo?.companyPhone ||
                clientInfo?.phone ||
                "";

            const contactLine = [
                companyEmail,
                companyPhone
            ]
                .filter(Boolean)
                .join("  |  ");

            // Company Name
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);

            doc.text(companyName, textStartX, 14);

            // Address
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);

            if (companyAddress) {
                doc.text(companyAddress, textStartX, 21);
            }

            // Email / Phone
            if (contactLine) {
                doc.text(
                    contactLine,
                    textStartX,
                    companyAddress ? 27 : 21
                );
            }

            // ===== REPORT TITLE =====
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);

            doc.text(
                "Projects Report",
                pageWidth - 14,
                14,
                { align: "right" }
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);

            doc.text(
                `Generated: ${formatDate(new Date())}`,
                pageWidth - 14,
                21,
                { align: "right" }
            );
        };

        // ================= TABLE =================
        const tableColumn = [
            "Project Name",
            "Company Name",
            "Contact",
            "Division",
            "Value",
            "Revenue",
            "Cost",
            "Profit",
            "Created By",
            "Date",
            "Status"
        ];

        const tableRows = formattedData.map((p) => [
            p.project_name,
            p.company_name,
            p.customer_name,
            p.division_type,
            `$${formatCurrency(p.project_value)}`,
            `$${formatCurrency(p.total_revenue || 0)}`,
            `$${formatCurrency(p.total_cost || 0)}`,
            `$${formatCurrency(
                (p.total_revenue || 0) -
                (p.total_cost || 0)
            )}`,
            p.created_by,
            p.created_date,
            p.status
        ]);

        // ===== TOTAL ROW =====
        tableRows.push([
            "",
            "",
            "",
            "TOTAL",
            `${formatCurrency(
                formattedData.reduce(
                    (sum, p) => sum + (p.project_value || 0),
                    0
                )
            )}`,
            `${formatCurrency(
                formattedData.reduce(
                    (sum, p) => sum + (p.total_revenue || 0),
                    0
                )
            )}`,
            `${formatCurrency(
                formattedData.reduce(
                    (sum, p) => sum + (p.total_cost || 0),
                    0
                )
            )}`,
            `$${formatCurrency(
                formattedData.reduce(
                    (sum, p) =>
                        sum +
                        (
                            (p.total_revenue || 0) -
                            (p.total_cost || 0)
                        ),
                    0
                )
            )}`,
            "",
            "",
            ""
        ]);

        // ================= TABLE UI =================
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 42,
            theme: "grid",

            headStyles: {
                fillColor: [12, 84, 170],
                textColor: 255,
                fontStyle: "bold",
                fontSize: 9,
                halign: "center",
                valign: "middle",
            },

            bodyStyles: {
                fontSize: 8,
                textColor: [40, 40, 40],
                lineColor: [220, 220, 220],
                lineWidth: 0.3,
            },

            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },

            styles: {
                cellPadding: 3.5,
                overflow: "linebreak",
            },

            columnStyles: {
                3: { halign: "right" },
                4: { halign: "right" },
                5: { halign: "right" },
                6: { halign: "right" },
            },

            didParseCell: function (data) {
                // Total row styling
                if (data.row.index === tableRows.length - 1) {
                    data.cell.styles.fontStyle = "bold";
                    data.cell.styles.fillColor = [230, 240, 255];
                }
            },

            margin: {
                top: 42,
                left: 10,
                right: 10,
            },

            didDrawPage: drawHeader,
        });

        // ================= SAVE =================
        doc.save(
            `Projects_Report_${new Date()
                .toISOString()
                .slice(0, 10)}.pdf`
        );
    };

    //  TABLE COLUMNS
    const columns = [
        {
            header: "Project Name",
            accessor: "project_name",
            filterType: "text",
            render: (row) => (
                <Link
                    to={(row.is_inactive || row.status === 'lost' || row.status === 'completed') ? `/inactive-projects/${row._id || row.id}` : `/projects/${row._id || row.id}`}
                    className="text-blue-600 hover:underline"
                >
                    {row.project_name}
                </Link>
            ),
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
                                `/customers/${row.customer_id}?projectId=${row._id}`
                            );
                        }
                    }}
                >
                    {row.customer_name}
                </span>
            ),
        },
        { header: "Division Type", accessor: "division_type", filterType: "text" },
        // {
        //     header: "Customer Name",
        //     accessor: "customer_name",
        //     render: (row) => (
        //         <span
        //             className="text-blue-600 cursor-pointer hover:underline"
        //             onClick={() => {
        //                 if (row.customer_id) {
        //                     navigate(`/customers/${row.customer_id}?projectId=${row._id}`);
        //                 }
        //             }}
        //         >
        //             {row.customer_name}
        //         </span>
        //     )
        // },
        {
            header: "Project Value",
            accessor: "project_value",
            align: "right",
            isTotal: true,
            render: (row) => formatCurrency(row.project_value),
            renderTotal: (val) => formatCurrency(val)
        },
        {
            header: "Total Revenue",
            accessor: "total_revenue",
            align: "right",
            isTotal: true,
            render: (row) => formatCurrency(row.total_revenue),
            renderTotal: (val) => formatCurrency(val)
        },
        {
            header: "Total Costs",
            accessor: "total_cost",
            align: "right",
            isTotal: true,
            render: (row) => formatCurrency(row.total_cost),
            renderTotal: (val) => formatCurrency(val)
        },
        {
            header: "Net Profit",
            accessor: "net_profit",
            align: "right",
            isTotal: true,
            render: (row) => formatCurrency(row.net_profit),
            renderTotal: (val) => formatCurrency(val)
        },
        { header: "Created By", accessor: "created_by", filterType: "text" },
        { header: "Created Date", accessor: "createdAt", filterType: "date", render: (row) => formatDateUTC(row.created_date || row.createdAt) },
        {
            header: "Status",
            accessor: "status",
            filterType: "select",
            filterOptions: [
                { label: "Open", value: "open" },
                { label: "Processing", value: "processing" },
                { label: "Actively working", value: "actively_working" },
                { label: "Completed", value: "completed" },
                { label: "Reopen", value: "reopen" },
            ],
            render: (row, extra) => {
                const status = formatStatus(row.status);
                const styles = extra?.statusStyles || {};

                return (
                    <span
                        className={`inline-flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold
    ${styles[status] || "bg-gray-100 text-gray-600"
                            }`}
                    >
                        {status}
                    </span>
                );
            },
        }
    ];

    const { sortedData, sortConfig, handleSort } = useTableSort(formattedData);

    const paginatedData = sortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totals = useMemo(() => {
        return formattedData.reduce((acc, row) => {
            acc.project_value += row.project_value || 0;
            acc.total_revenue += row.total_revenue || 0;
            acc.total_cost += row.total_cost || 0;
            acc.net_profit += row.net_profit || 0;
            return acc;
        }, {
            project_value: 0,
            total_revenue: 0,
            total_cost: 0,
            net_profit: 0
        });
    }, [formattedData]);

    return (
        <div className="">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-xl font-bold">Projects Report</h1>
                    <p className="text-sm text-gray-500">
                        Manage Projects Report
                    </p>
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
                        {/* Project */}
                        <Select
                            value={selectedProject}
                            onValueChange={(val) => {
                                setSelectedProject(val);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Project" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Projects</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p._id} value={p._id}>
                                        {p.project_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* Customer */}
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
                                        {c.contact_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Created By */}
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
                                        projects
                                            .map((p) => p.created_by_user)
                                            .filter(Boolean)
                                    ),
                                ].filter(id => createdByMap[id] && createdByMap[id] !== "—" && createdByMap[id] !== "Deleted User").map((id) => (
                                    <SelectItem key={id} value={id}>
                                        {createdByMap[id]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status */}
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
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="actively_working">Actively Working</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date */}
                        <DateRangePicker
                            date={dateRange}
                            setDate={(val) => {
                                setDateRange(val);
                                setCurrentPage(1);
                            }}
                            className="w-[260px]"
                        />
                        <div className="">
                            {/* Reset */}
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("all");
                                    setSelectedProject("");
                                    setSelectedCustomer("");
                                    setSelectedCreatedBy("");
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

        </div>
    );
};

export default ProjectReport;