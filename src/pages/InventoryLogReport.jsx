import { useEffect, useState, useMemo } from "react";
import CommonTable from "../components/ui/CommonTable";
import Pagination from "../components/shared/Pagination";
import { useInventoryLogReportData } from "../hooks/useInventoryLogReportData";
import { Button } from "@/components/ui/button";
import { Download, Filter, RefreshCw, Search, FileText } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import localApi from "../services/localApi";
import clientService from "../services/clientAddService";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { useTableSort } from "../hooks/useTableSort";
import masterDataService from "../services/masterDataService";

const InventoryLogReport = () => {
    const {
        data: inventory,
        loading,
        loadReport
    } = useInventoryLogReportData();

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [searchItem, setSearchItem] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [dateRange, setDateRange] = useState({ from: null, to: null });
    const [clientInfo, setClientInfo] = useState(null);
    const [columnFilters, setColumnFilters] = useState({});
    const [categoryMap, setCategoryMap] = useState({});

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

    useEffect(() => {
        loadReport();
    }, [loadReport]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchItem, selectedCategory, lowStockOnly, dateRange, columnFilters]);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await masterDataService.getAll("categories");
                const list = res.data || res || [];
                const map = {};
                list.forEach(cat => {
                    map[cat.value] = cat.display_name;
                });

                setCategoryMap(map);
            } catch (err) {
                console.error("Failed to load categories", err);
            }
        };

        loadCategories();
    }, []);

    const categories = useMemo(() => {
        const usedValues = new Set();

        inventory.forEach(item => {
            if (item.category) {
                usedValues.add(item.category);
            }
        });

        return Array.from(usedValues).map(value => ({
            value,
            label: categoryMap[value] || value
        }));
    }, [inventory, categoryMap]);

    const filteredData = useMemo(() => {
        return inventory.filter((item) => {
            const matchesSearch = !searchItem || item.item_name?.toLowerCase().includes(searchItem.toLowerCase());
            const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
            let matchesDate = true;
            if (dateRange?.from || dateRange?.to) {
                const itemDate = new Date(item.createdAt);
                const start = dateRange.from ? startOfDay(dateRange.from) : null;
                const end = dateRange.to ? endOfDay(dateRange.to) : (start ? endOfDay(start) : null);

                if (start && end) {
                    matchesDate = isWithinInterval(itemDate, { start, end });
                } else if (start) {
                    matchesDate = itemDate >= start;
                }
            } else if (dateRange?.isAllTime) {
                matchesDate = true;
            }

            const matchesLowStock = !lowStockOnly || item.available_qty <= 0;

            const matchesColumnFilters = Object.keys(columnFilters).every(key => {
                const filterVal = columnFilters[key];
                if (!filterVal) return true;
                const rowVal = String(item[key] || "").toLowerCase();
                return rowVal.includes(filterVal.toLowerCase());
            });

            return matchesSearch && matchesCategory && matchesLowStock && matchesDate && matchesColumnFilters;
        });
    }, [inventory, searchItem, selectedCategory, lowStockOnly, dateRange, columnFilters]);

    const formattedData = filteredData.map((item) => ({
        _id: item._id || item.id,
        item_name: item.item_name,
        category: categoryMap[item.category] || item.category || "—",
        opening_stock: item.opening_stock,
        received: item.received_qty,
        issued: item.issued_qty,
        available_qty: item.available_qty,
        unit_cost: item.unit_cost || 0,
        total_value: item.total_value || 0,
        createdAt: item.createdAt,
    }));

    const { sortedData, sortConfig, handleSort } = useTableSort(formattedData);

    const handleExport = () => {
        if (!formattedData.length) return alert("No data to export");

        const headers = [
            "Item Name", "Category", "Opening Stock", "Received", "Issued", "Available Qty", "Unit Cost", "Total Value"
        ];

        const rows = formattedData.map((item) => [
            item.item_name,
            item.category,
            item.opening_stock,
            item.received,
            item.issued,
            item.available_qty,
            item.unit_cost,
            item.total_value,
        ].join(","));

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Inventory_Log_Report.csv";
        a.click();
    };

    const handleExportPDF = async () => {
        if (!formattedData.length) return alert("No data to export");

        const doc = new jsPDF("p", "mm", "a4");
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
            doc.text("Inventory Log Report", pageWidth - 14, 11, { align: "right" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.text(`Generated: ${formatDate(new Date())}`, pageWidth - 14, 17, { align: "right" });
        };

        const tableColumn = ["Item Name", "Category", "Opening", "Received", "Issued", "Available", "Unit Cost", "Total Value"];
        const tableRows = formattedData.map(item => [
            item.item_name,
            item.category,
            item.opening_stock,
            item.received,
            item.issued,
            item.available_qty,
            formatCurrency(item.unit_cost),
            formatCurrency(item.total_value)
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

        doc.save(`Inventory_Log_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const columns = [
        {
            header: "Item Name",
            accessor: "item_name",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">{row.item_name}</span>
                </div>
            )
        },
        {
            header: "Category",
            accessor: "category",
            filterType: "select",
            filterOptions: categories.map((c) => ({
                label: c.label,
                value: c.value,
            })),
            render: (row) => (
                <span className="capitalize">{row.category}</span>
            )
        },
        {
            header: "Opening Stock",
            accessor: "opening_stock",
            align: "center",
            render: (row) => <span className="font-semibold text-gray-700 dark:text-gray-300">{row.opening_stock}</span>
        },
        {
            header: "Received",
            accessor: "received",
            align: "center",
            render: (row) => <span className="font-semibold text-blue-600">{row.received}</span>
        },
        {
            header: "Issued",
            accessor: "issued",
            align: "center",
            render: (row) => <span className="font-semibold text-orange-600">{row.issued}</span>
        },
        {
            header: "Available Qty",
            accessor: "available_qty",
            align: "center",
            render: (row) => (
                <span className={`font-bold ${row.available_qty <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.available_qty}
                </span>
            )
        },
        {
            header: "Unit Cost",
            accessor: "unit_cost",
            align: "right",
            render: (row) => formatCurrency(row.unit_cost)
        },
        {
            header: "Total Value",
            accessor: "total_value",
            align: "right",
            isTotal: true,
            render: (row) => <span className="font-bold">{formatCurrency(row.total_value)}</span>,
            renderTotal: (val) => <span className="font-bold">{formatCurrency(val)}</span>
        }
    ];

    const paginatedData = sortedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totals = useMemo(() => {
        return formattedData.reduce((acc, row) => {
            acc.total_value += row.total_value || 0;
            return acc;
        }, {
            total_value: 0
        });
    }, [formattedData]);

    return (
        <div className="p-2 md:p-4">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Inventory Log Report</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage Inventory Items Log Report
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant={showFilters ? "default" : "outline"}
                        size="icon"
                        onClick={() => setShowFilters(!showFilters)}
                        className="rounded-md shadow-sm"
                    >
                        <Filter className="w-5 h-5" />
                    </Button>

                    <Button onClick={handleExport} variant="outline" className="rounded-pill shadow-sm border-gray-200">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button onClick={handleExportPDF} variant="outline" className="rounded-pill shadow-sm border-gray-200 ml-2">
                        <FileText className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* FILTERS */}
            {showFilters && (
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-100 dark:border-gray-700 rounded-2xl p-6 mb-6 shadow-xl flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex-1 flex flex-wrap gap-4 items-center">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            <Input
                                placeholder="Enter Item Name"
                                value={searchItem}
                                onChange={(e) => {
                                    setSearchItem(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10 w-[240px] rounded-md border-gray-200 focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                        </div>

                        <Select
                            value={selectedCategory}
                            onValueChange={(val) => {
                                setSelectedCategory(val);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[200px] rounded-md border-gray-200 shadow-sm">
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl shadow-xl">
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
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

                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-md border border-orange-100">
                            <Checkbox
                                id="low-stock"
                                checked={lowStockOnly}
                                onCheckedChange={(val) => {
                                    setLowStockOnly(val);
                                    setCurrentPage(1);
                                }}
                                className="border-orange-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                            />
                            <Label htmlFor="low-stock" className="text-orange-700 font-medium cursor-pointer select-none">
                                Low Stock Only
                            </Label>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full hover:bg-gray-100 text-gray-500"
                                onClick={() => {
                                    setSearchItem("");
                                    setSelectedCategory("all");
                                    setLowStockOnly(false);
                                    setDateRange({ from: null, to: null });
                                    setColumnFilters({});
                                    setCurrentPage(1);
                                }}
                                title="Reset Filters"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>


                </div>
            )}

            {/* TABLE */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
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
            </div>

            {/* PAGINATION */}
            {formattedData.length > 0 && (
                <div className="mt-6">
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

export default InventoryLogReport;
