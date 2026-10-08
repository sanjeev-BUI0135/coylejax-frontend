import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import {
  History, Search, RefreshCw,
  PlusCircle, Edit3, Trash2, AlertCircle,
  CheckCircle2, XCircle, Send, Download,
  CalendarDays, X, ChevronDown, FileText
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ActivityLog } from '@/api/entities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import HistoryPagination from "@/components/shared/HistoryPagination";
import "../../../App.css";
import { formatCurrency, stripHtmlTags } from "@/lib/utils";
import { formatDateUS, formatDateUTC } from '../../../utils/formatdate';

const actionConfig = {
  'Create':        { icon: PlusCircle,  color: 'bg-green-100  text-green-800  dark:bg-green-900/50  dark:text-green-300'  },
  'Update':        { icon: Edit3,       color: 'bg-blue-100   text-blue-800   dark:bg-blue-900/50   dark:text-blue-300'   },
  'Delete':        { icon: Trash2,      color: 'bg-red-100    text-red-800    dark:bg-red-900/50    dark:text-red-300'    },
  'Status Change': { icon: RefreshCw,   color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  'Sent':          { icon: Send,        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
  'Approved':      { icon: CheckCircle2,color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' },
  'Rejected':      { icon: XCircle,    color: 'bg-rose-100   text-rose-800   dark:bg-rose-900/50   dark:text-rose-300'   },
};

const formatValue = (val, fieldName) => {
  if (val === null || val === undefined || val === '') return '-';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'object') return JSON.stringify(val);
  if (fieldName && typeof fieldName === 'string') {
    const moneyFields = ['Total Amount', 'Subtotal', 'Tax Amount', 'Material Markup Amount', 'Invoiced Amount', 'Unit Price', 'Total'];
    if (moneyFields.some(f => fieldName.includes(f)) && !isNaN(parseFloat(val))) {
      return formatCurrency(val);
    }
  }
  return stripHtmlTags(String(val));
};

export default function EstimateHistory({ estimateId }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const [userFilter,   setUserFilter]   = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange,    setDateRange]    = useState({ from: null, to: null });
  const [searchText,   setSearchText]   = useState('');
  const [showSearch,   setShowSearch]   = useState(false);
  const [dateOpen,     setDateOpen]     = useState(false);
  const searchRef = useRef(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to first page when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userFilter, actionFilter, dateRange, searchText]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { module: 'Estimate' };
      if (actionFilter !== 'all') params.action = actionFilter;

      const response = await ActivityLog.getByEntity(estimateId, params);

      const flattenedLogs = (response?.data || []).flatMap(log => {
        if (Array.isArray(log.changes) && log.changes.length > 0) {
          return log.changes.map((change, idx) => ({
            ...log,
            _displayId: `${log._id}-${idx}`,
            field: change.field,
            oldValue: change.old,
            newValue: change.new
          }));
        }
        return [{ ...log, _displayId: log._id, field: '-', oldValue: '-', newValue: log.description }];
      });

      setLogs(flattenedLogs);
    } catch (error) {
      console.error('Error fetching estimate history:', error);
    } finally {
      setLoading(false);
    }
  }, [estimateId, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus(); }, [showSearch]);

  // Reset to first page when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userFilter, actionFilter, dateRange, searchText]);

  const uniqueUsers = useMemo(() => {
    const names = [...new Set(logs.map(l => l.user_name).filter(Boolean))];
    return names.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (userFilter !== 'all' && log.user_name !== userFilter) return false;
      if (dateRange.from || dateRange.to) {
        const ts = new Date(log.timestamp);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(ts, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) return false;
        } else if (dateRange.from && ts < startOfDay(dateRange.from)) return false;
        else if (dateRange.to   && ts > endOfDay(dateRange.to))   return false;
      }
      if (searchText) {
        const lower = searchText.toLowerCase();
        if (
          !log.description?.toLowerCase().includes(lower) &&
          !log.user_name?.toLowerCase().includes(lower) &&
          !log.field?.toLowerCase().includes(lower)
        ) return false;
      }
      return true;
    });
  }, [logs, userFilter, dateRange, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeFilterCount = [
    userFilter   !== 'all',
    actionFilter !== 'all',
    !!(dateRange.from || dateRange.to),
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setUserFilter('all');
    setActionFilter('all');
    setDateRange({ from: null, to: null });
    setSearchText('');
    setShowSearch(false);
  };

  const dateLabel = useMemo(() => {
    if (dateRange.from && dateRange.to) return `${formatDateUS(dateRange.from, 'MMM d')} – ${formatDateUS(dateRange.to, 'MMM d, yyyy')}`;
    if (dateRange.from) return `From ${formatDateUS(dateRange.from, 'MMM d, yyyy')}`;
    if (dateRange.to)   return `To ${formatDateUS(dateRange.to, 'MMM d, yyyy')}`;
    return 'Date Range';
  }, [dateRange]);

  const handleExport = () => {
    if (!filteredLogs.length) return;
    const escape = (f) => { const s = String(f || ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s; };
    const headers = ['Date', 'Time', 'Updated By', 'Field', 'Old Value', 'New Value', 'Action'];
    const rows = filteredLogs.map(log => [
      formatDateUS(log.timestamp),
      format(new Date(log.timestamp), 'hh:mm a'),
      log.user_name || 'System',
      log.field || '-',
      formatValue(log.oldValue, log.field),
      formatValue(log.newValue, log.field),
      log.action || '',
    ].map(escape).join(','));
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Estimate_History_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const renderActionBadge = (action) => {
    const cfg = actionConfig[action] || { icon: AlertCircle, color: 'bg-gray-100 text-gray-800' };
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} border-none font-medium flex items-center gap-1 w-fit`}>
        <Icon className="w-3 h-3" />{action}
      </Badge>
    );
  };

  return (
    <Card className="shadow-sm border-gray-200 dark:border-gray-800 dark:bg-slate-900 overflow-hidden">
      <CardHeader className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-gray-800 py-3 px-4">
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

          <div className="flex-1" />

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
              <SelectItem value="Status Change">Status Change</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline" size="sm"
                className={`h-8 text-xs px-3 gap-1.5 border-gray-200 dark:border-gray-700 font-normal ${(dateRange.from || dateRange.to) ? 'text-primary border-primary' : 'text-gray-500'}`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="max-w-[110px] truncate">{dateLabel}</span>
                <ChevronDown className="w-3 h-3 opacity-50 ml-auto" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={dateRange} onSelect={(r) => setDateRange(r || { from: null, to: null })} numberOfMonths={2} initialFocus />
              {(dateRange.from || dateRange.to) && (
                <div className="flex justify-end px-4 pb-3">
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500"
                    onClick={() => { setDateRange({ from: null, to: null }); setDateOpen(false); }}>
                    <X className="w-3 h-3 mr-1" />Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Search */}
          <div className="flex items-center gap-1">
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input ref={searchRef} placeholder="Search..." className="h-8 pl-8 pr-7 text-xs w-[160px]"
                  value={searchText} onChange={(e) => setSearchText(e.target.value)} />
                {searchText && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setSearchText('')}>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
            <Button variant="outline" size="icon"
              className={`h-8 w-8 border-gray-200 dark:border-gray-700 ${showSearch ? 'bg-primary/10 text-primary border-primary' : ''}`}
              onClick={() => { setShowSearch(v => !v); if (showSearch) setSearchText(''); }} title="Toggle search">
              <Search className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Refresh */}
          <Button variant="outline" size="icon" className="h-8 w-8 border-gray-200 dark:border-gray-700"
            onClick={fetchLogs} disabled={loading} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200 dark:border-gray-700"
            onClick={handleExport} disabled={loading || !filteredLogs.length} title="Export CSV">
            <Download className="w-3.5 h-3.5 mr-1.5" />Export
          </Button>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400 hover:text-gray-600 px-2"
              onClick={clearAllFilters} title="Clear all filters">
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="responsiveTable1 w-full">
            <Thead className="bg-gray-50 dark:bg-slate-800">
              <Tr>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Date &amp; Time</Th>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Updated By</Th>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Fields</Th>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Old Value</Th>
                <Th className="text-left font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">New Value</Th>
                <Th className="text-right font-semibold text-gray-600 dark:text-gray-300 text-sm py-1 px-6 border-b border-gray-100 dark:border-gray-800">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr><Td colSpan={6} className="py-20 text-center">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-gray-500">Loading history logs...</p>
                </Td></Tr>
              ) : filteredLogs.length === 0 ? (
                <Tr><Td colSpan={6} className="py-20 text-center">
                  <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No history found</h3>
                  <p className="text-gray-500 mt-1">Try adjusting your filters or search terms</p>
                </Td></Tr>
              ) : (
                paginatedLogs.map((log, index) => (
                  <Tr key={log._displayId} className={`group hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-slate-800" : "bg-white dark:bg-slate-900"}`}>
                    <Td className="py-1 px-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 text-sm dark:text-gray-100">{formatDateUS(log.timestamp)}</span>
                        <span className="text-xs text-gray-500 font-normal">{format(new Date(log.timestamp), 'hh:mm a')}</span>
                      </div>
                    </Td>
                    <Td className="py-1 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {log.user_name ? log.user_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="font-medium text-gray-700 text-sm dark:text-gray-300">{log.user_name || 'System'}</span>
                      </div>
                    </Td>
                    <Td className="py-1 px-6"><span className="font-medium text-gray-900 text-sm dark:text-gray-100">{log.field}</span></Td>
                    <Td className="py-1 px-6"><span className="text-sm text-gray-500 dark:text-gray-400">{formatValue(log.oldValue, log.field)}</span></Td>
                    <Td className="py-1 px-6"><span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatValue(log.newValue, log.field)}</span></Td>
                    <Td className="py-1 px-6"><div className="flex justify-end">{renderActionBadge(log.action)}</div></Td>
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
