import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import {
  History, Search, RefreshCw,
  PlusCircle, Edit3, Trash2, Upload, AlertCircle,
  FileText, DollarSign, Package, Briefcase,
  User, Download, CalendarDays, X, ChevronDown
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { ActivityLog } from '@/api/entities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import HistoryPagination from "@/components/shared/HistoryPagination";
import "../../../App.css";
import { formatDateUS, formatDateUTC } from '../../../utils/formatdate';

const moduleConfig = {
  'Project': { icon: Briefcase, color: 'text-blue-600   bg-blue-50   dark:bg-blue-900/20' },
  'Estimate': { icon: FileText, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  'Invoice': { icon: DollarSign, color: 'text-green-600  bg-green-50  dark:bg-green-900/20' },
  'Material Order': { icon: Package, color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  'Upload': { icon: Upload, color: 'text-gray-600   bg-gray-50   dark:bg-gray-900/20' },
};

const actionConfig = {
  'Create': { icon: PlusCircle, color: 'bg-green-100  text-green-800  dark:bg-green-900/50  dark:text-green-300' },
  'Update': { icon: Edit3, color: 'bg-blue-100   text-blue-800   dark:bg-blue-900/50   dark:text-blue-300' },
  'Delete': { icon: Trash2, color: 'bg-red-100    text-red-800    dark:bg-red-900/50    dark:text-red-300' },
  'Status Change': { icon: RefreshCw, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  'Upload': { icon: Upload, color: 'bg-gray-100   text-gray-800   dark:bg-gray-700      dark:text-gray-300' },
};

export default function ProjectHistory({ projectId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const searchRef = useRef(null);

  // Fetch logs from backend (module + action only)
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (moduleFilter !== 'all') params.module = moduleFilter;
      if (actionFilter !== 'all') params.action = actionFilter;

      const response = await ActivityLog.getByProject(projectId, params);
      setLogs(response?.data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, moduleFilter, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-focus search input when shown
  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  // Derive unique users from loaded logs
  const uniqueUsers = useMemo(() => {
    const names = [...new Set(logs.map(l => l.user_name).filter(Boolean))];
    return names.sort();
  }, [logs]);

  // Client-side filters: user, date range, search
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // User filter
      if (userFilter !== 'all' && log.user_name !== userFilter) return false;

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const ts = new Date(log.timestamp);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(ts, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
        } else if (dateRange.from) {
          if (ts < startOfDay(dateRange.from)) return false;
        } else if (dateRange.to) {
          if (ts > endOfDay(dateRange.to)) return false;
        }
      }

      // Search filter
      if (searchText) {
        const lower = searchText.toLowerCase();
        if (
          !log.description?.toLowerCase().includes(lower) &&
          !log.user_name?.toLowerCase().includes(lower) &&
          !log.module?.toLowerCase().includes(lower)
        ) return false;
      }

      return true;
    });
  }, [logs, userFilter, dateRange, searchText]);

  // Active filter count (for badge)
  const activeFilterCount = [
    moduleFilter !== 'all',
    userFilter !== 'all',
    actionFilter !== 'all',
    !!(dateRange.from || dateRange.to),
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setModuleFilter('all');
    setUserFilter('all');
    setActionFilter('all');
    setDateRange({ from: null, to: null });
    setSearchText('');
    setShowSearch(false);
  };

  // Date range label
  const dateLabel = useMemo(() => {
    if (dateRange.from && dateRange.to)
      return `${formatDateUS(dateRange.from, 'MMM d')} – ${formatDateUS(dateRange.to, 'MMM d, yyyy')}`;
    if (dateRange.from) return `From ${formatDateUS(dateRange.from, 'MMM d, yyyy')}`;
    if (dateRange.to) return `To ${formatDateUS(dateRange.to, 'MMM d, yyyy')}`;
    return 'Date Range';
  }, [dateRange]);

  // CSV Export
  // CSV Export
  const handleExport = () => {
    if (!filteredLogs.length) return;
    const escape = (f) => {
      const s = String(f || '');
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = ['Date', 'Time', 'Updated By', 'Module', 'Description', 'Action'];
    const rows = filteredLogs.map(log => [
      formatDateUTC(log.timestamp),
      format(new Date(log.timestamp), 'hh:mm a'),
      log.user_name || 'System',
      log.module || '',
      log.description || '',
      log.action || '',
    ].map(escape).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Project_History_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render helpers
  const renderModuleIcon = (module) => {
    const cfg = moduleConfig[module] || { icon: AlertCircle, color: 'text-gray-400' };
    const Icon = cfg.icon;
    return (
      <div className={`p-2 rounded-lg ${cfg.color} inline-flex items-center justify-center mr-3`}>
        <Icon className="w-4 h-4" />
      </div>
    );
  };

  const renderActionBadge = (action) => {
    const cfg = actionConfig[action] || { icon: AlertCircle, color: 'bg-gray-100 text-gray-800' };
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} border-none font-medium flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />
        {action}
      </Badge>
    );
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to first page when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [moduleFilter, userFilter, actionFilter, dateRange, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
      <CardHeader className="bg-white dark:bg-[#1f2937] border-b border-gray-100 dark:border-gray-800 py-3 px-4">

        {/* ── Compact single-row header ── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Title */}
          <div className="flex items-center gap-2 mr-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <History className="w-4 h-4 text-primary" />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap">History</span>
            {activeFilterCount > 0 && (
              <Badge className="bg-primary text-white text-xs px-1.5 py-0 h-5">{activeFilterCount}</Badge>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ── Filter Controls ── */}

          {/* Select Module */}
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px] border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Select Module" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Select Module</SelectItem>
              <SelectItem value="Project">Project</SelectItem>
              <SelectItem value="Estimate">Estimate</SelectItem>
              <SelectItem value="Invoice">Invoice</SelectItem>
              <SelectItem value="Material Order">Material Order</SelectItem>
            </SelectContent>
          </Select>

          {/* Select User */}
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="h-8 text-xs w-[120px] border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Select User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Select User</SelectItem>
              {uniqueUsers.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Select Action */}
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-8 text-xs w-[130px] border-gray-200 dark:border-gray-700">
              <SelectValue placeholder="Select Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Select Action</SelectItem>
              <SelectItem value="Create">Create</SelectItem>
              <SelectItem value="Update">Update</SelectItem>
              <SelectItem value="Delete">Delete</SelectItem>
              <SelectItem value="Status Change">Status Change</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Popover */}
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-8 text-xs px-3 gap-1.5 border-gray-200 dark:border-gray-700 font-normal ${(dateRange.from || dateRange.to) ? 'text-primary border-primary' : 'text-gray-500'}`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="max-w-[110px] truncate">{dateLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-50 ml-auto" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => setDateRange(range || { from: null, to: null })}
                numberOfMonths={2}
                initialFocus
              />
              {(dateRange.from || dateRange.to) && (
                <div className="flex justify-end px-4 pb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-500"
                    onClick={() => { setDateRange({ from: null, to: null }); setDateOpen(false); }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Search icon button + inline input */}
          <div className="flex items-center gap-1">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  ref={searchRef}
                  placeholder="Search..."
                  className="h-8 pl-8 pr-7 text-xs w-[160px]"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                {searchText && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchText('')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              className={`h-8 w-8 border-gray-200 dark:border-gray-700 ${showSearch ? 'bg-primary/10 text-primary border-primary' : ''}`}
              onClick={() => { setShowSearch(v => !v); if (showSearch) setSearchText(''); }}
              title="Toggle search"
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-gray-400 hover:text-gray-600 px-2"
              onClick={clearAllFilters}
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-gray-200 dark:border-gray-700"
            onClick={fetchLogs}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-gray-200 dark:border-gray-700"
            onClick={handleExport}
            disabled={loading || !filteredLogs.length}
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>

        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="responsiveTable1 w-full">
            <Thead className="bg-gray-50 dark:bg-gray-800/50">
              <Tr>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Date &amp; Time</Th>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Updated By</Th>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Module</Th>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Description</Th>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={5} className="py-20 text-center">
                    <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-gray-500">Loading history logs...</p>
                  </Td>
                </Tr>
              ) : filteredLogs.length === 0 ? (
                <Tr>
                  <Td colSpan={5} className="py-20 text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No history found</h3>
                    <p className="text-gray-500 mt-1">Try adjusting your filters or search terms</p>
                  </Td>
                </Tr>
              ) : (
                paginatedLogs.map((log, index) => (
                  <Tr key={log._id || index} className={`group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                    <Td className="py-1 px-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {formatDateUTC(log.timestamp)}
                        </span>
                        <span className="text-xs text-gray-500 font-normal">
                          {format(new Date(log.timestamp), 'hh:mm a')}
                        </span>
                      </div>
                    </Td>
                    <Td className="py-1 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          <User className="w-3 h-3" />
                        </div>
                        <span className="font-medium text-gray-700 text-sm dark:text-gray-300">{log.user_name || 'System'}</span>
                      </div>
                    </Td>
                    <Td className="py-1 px-6">
                      <div className="flex items-center">
                        {renderModuleIcon(log.module)}
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{log.module}</span>
                      </div>
                    </Td>
                    <Td className="py-1 px-6 max-w-md">
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-normal">
                        {log.description}
                      </p>
                    </Td>
                    <Td className="py-1 px-6">
                      {renderActionBadge(log.action)}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>

        {!loading && filteredLogs.length > 0 && (
          <HistoryPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </CardContent>
    </Card>
  );
}
