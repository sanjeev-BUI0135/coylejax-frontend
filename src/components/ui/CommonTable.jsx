import React, { useState, useRef } from "react";
import { ArrowUpDown, Filter, X, Search, FileX } from "lucide-react";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell
} from "@/components/ui/table";
import TableHeaderFilter from "@/components/shared/TableHeaderFilter";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import StickyScrollbar from "@/components/shared/StickyScrollbar";

const CommonTable = ({
    columns = [],
    data = [],
    loading = false,
    statusStyles = {},
    showTotal = false,
    totals = {},
    onSort,
    sortConfig,
    columnFilters = {},
    onColumnFilterChange,
    emptyMessage = "No data found",
    emptySubMessage = "Try adjusting your filters or search terms."
}) => {
    const [showColumnFilters, setShowColumnFilters] = useState(false);
    const tableContainerRef = useRef(null);
    if (loading) {
        return (
            <div className="p-12 text-center text-sm text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-gray-50 rounded w-1/2 mx-auto"></div>
                </div>
                <p className="mt-4 text-gray-400 font-medium animate-pulse">Loading data...</p>
            </div>
        );
    }

    return (
        <div className="relative">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-md">
            <Table wrapperRef={tableContainerRef} wrapperClassName="scrollbar-hide">
                {/* HEADER */}
                <TableHeader className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                    <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="w-12 text-center px-2 py-4 border-r border-gray-100 dark:border-gray-700">
                            {onColumnFilterChange && (
                                <button
                                    onClick={() => setShowColumnFilters(!showColumnFilters)}
                                    className={`p-1.5 rounded-md transition-all ${showColumnFilters ? "bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50" : "text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300"}`}
                                    title={showColumnFilters ? "Close Column Filters" : "Open Column Filters"}
                                >
                                    {showColumnFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                                </button>
                            )}
                        </TableHead>
                        {columns.map((col, i) => (
                            <TableHead
                                key={i}
                                className={`px-4 py-4 text-[13px] font-bold text-gray-600 dark:text-gray-300 tracking-tight whitespace-nowrap ${col.sortable !== false ? "cursor-pointer select-none hover:bg-gray-100/80 dark:hover:bg-gray-800/80 group transition-colors" : ""}`}
                                onClick={() => col.sortable !== false && onSort?.(col.accessor)}
                            >
                                <div className={`flex items-center gap-1.5 ${col.align === "right" ? "justify-end" : "justify-start"}`}>
                                    {col.header}
                                    {col.sortable !== false && onSort && (
                                        <ArrowUpDown className={`w-3.5 h-3.5 transition-all duration-200 ${sortConfig?.key === col.accessor ? "text-blue-600 scale-110 opacity-100" : "text-gray-300 opacity-0 group-hover:opacity-100"}`} />
                                    )}
                                </div>
                            </TableHead>
                        ))}
                    </TableRow>

                    {showColumnFilters && onColumnFilterChange && (
                        <TableRow className="bg-white/95 dark:bg-gray-800/95 border-b border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-1 duration-300">
                        <TableHead className="w-12 border-r border-gray-50 dark:border-gray-700 py-3" />
                            {columns.map((col, i) => (
                                <TableHead key={i} className="px-2 py-3">
                                    {col.filterType === "date" ? (
                                        <div className="relative group">
                                            <CustomDatePicker
                                                value={columnFilters[col.accessor] || ""}
                                                onChange={(val) => onColumnFilterChange(col.accessor, val)}
                                                className="h-10 text-xs shadow-sm border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-3 pr-8 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 transition-all w-full min-w-[140px] dark:text-white"
                                            />
                                        </div>
                                    ) : col.filterType === "select" ? (
                                        <div className="relative group">
                                            <select
                                                value={columnFilters[col.accessor] || ""}
                                                onChange={(e) => onColumnFilterChange(col.accessor, e.target.value)}
                                                className="h-10 w-full rounded-lg border border-gray-200 dark:border-gray-700 text-xs px-3 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 transition-all focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none appearance-none cursor-pointer pr-8 font-medium text-gray-700 dark:text-gray-300 shadow-sm"
                                                style={{
                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 0.75rem center',
                                                    backgroundSize: '1rem'
                                                }}
                                            >
                                                <option value="" className="text-gray-400">{`Status...`}</option>
                                                {col.filterOptions?.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : col.filterType !== "none" ? (
                                        <TableHeaderFilter
                                            placeholder={`Search...`}
                                            value={columnFilters[col.accessor] || ""}
                                            onChange={(val) => onColumnFilterChange(col.accessor, val)}
                                            className="h-10 text-xs shadow-sm border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 transition-all dark:text-white"
                                        />
                                    ) : null}
                                </TableHead>
                            ))}
                        </TableRow>
                    )}
                </TableHeader>

                {/* BODY */}
                <TableBody>
                    {data.length > 0 ? (
                        data.map((row, i) => (
                            <TableRow
                                key={i}
                                className={`group border-b border-gray-100 dark:border-gray-700 transition-all duration-200 ${i % 2 === 1 ? "bg-gray-50/20 dark:bg-gray-800/20" : "bg-white dark:bg-gray-800"} hover:bg-blue-50/30 dark:hover:bg-gray-700/30`}
                            >

                                <TableCell className="w-12 border-r border-gray-50/30 dark:border-gray-700/30 py-4" />
                                {columns.map((col, j) => (
                                    <TableCell
                                        key={j}
                                        className={`px-4 py-4 text-[13.5px] text-gray-600 dark:text-gray-300 font-medium ${col.align === "right" ? "text-right" : "text-left"} transition-colors group-hover:text-gray-900 dark:group-hover:text-white`}
                                    >
                                        {col.render
                                            ? col.render(row, { statusStyles })
                                            : (row[col.accessor])}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length + 1} className="h-[400px] text-center bg-white dark:bg-gray-800">
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="bg-gray-50 dark:bg-gray-900 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
                                        <Search className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{emptyMessage}</h3>
                                    <p className="text-gray-500 max-w-sm mx-auto mb-8 text-sm leading-relaxed">
                                        {emptySubMessage}
                                    </p>
                                    {Object.keys(columnFilters).some(k => columnFilters[k]) && (
                                        <button
                                            onClick={() => onColumnFilterChange && Object.keys(columnFilters).forEach(k => onColumnFilterChange(k, ""))}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 text-sm"
                                        >
                                            Clear Search Filters
                                        </button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    )}

                    {/* TOTAL ROW */}
                    {showTotal && data.length > 0 && (
                        <TableRow className="bg-gray-50 dark:bg-gray-900 font-bold border-t-2 border-gray-200 dark:border-gray-700">
                            <TableCell className="w-12 border-r border-gray-200 dark:border-gray-700" />
                            {columns.map((col, j) => (
                                <TableCell
                                    key={j}
                                    className={`px-4 py-5 text-sm text-gray-900 dark:text-white ${col.align === "right" ? "text-right" : "text-left"}`}
                                >
                                    {col.isTotal
                                        ? col.renderTotal
                                            ? col.renderTotal(totals[col.accessor])
                                            : (totals[col.accessor]?.toLocaleString?.() ?? totals[col.accessor] ?? "")
                                        : ""}
                                </TableCell>
                            ))}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
        <StickyScrollbar tableContainerRef={tableContainerRef} />
        </div>
    );
};

export default CommonTable;