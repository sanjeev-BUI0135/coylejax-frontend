import React, { useEffect, useState, useCallback, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Lead, Estimate } from "../api/entities"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, AlertTriangle, UserRound } from "lucide-react";
import Pagination from "@/components/shared/Pagination";
import ViewToggle from "@/components/shared/ViewToggle";
import BulkActions from "@/components/shared/BulkActions";
import Swal from "sweetalert2";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import LeadListView from "../components/Leads/LeadsTable";
import LeadCard from "../components/Leads/LeadCard";
import TablePageSkeleton from "../components/ui/tableskeleton";
import AdvancedFilters from "@/components/shared/AdvanceFilters";
import HierarchyUserSelect from "@/components/shared/HierarchyUserSelect";
import { useHierarchyUsers } from "@/hooks/useHierarchyUsers";
import EstimateForm from "../components/estimates/EstimateForm";
import masterDataService from "../services/masterDataService";
import { UilUsersAlt, UilUserPlus, UilChartLine, UilCheckCircle, UilUserTimes } from '@iconscout/react-unicons';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { lastDayOfDecade } from "date-fns";
import localApi from "../services/localApi";

/* ---------------- LAZY LOAD ---------------- */
const LeadForm = React.lazy(() => import("../components/Leads/CreateLead"));

/* ---------------- DEBOUNCE HOOK ---------------- */
function useDebounce(value, delay = 500) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}

export default function Leads() {
    const currentUser = JSON.parse(localStorage.getItem("user")) || {};

    const [leads, setLeads] = useState([]);
    const [estimates, setEstimates] = useState([]);
    const [search, setSearch] = useState("");
    const [assigningLeadId, setAssigningLeadId] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(25);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [divisions, setDivisions] = useState([]);
    const [leadStatuses, setLeadStatuses] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [editingLead, setEditingLead] = useState(null);
    const [viewMode, setViewMode] = useState("list");
    const [selectedItems, setSelectedItems] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [creatorFilter, setCreatorFilter] = useState(() => {
        const sessionVal = sessionStorage.getItem("leads_creatorFilter");
        if (sessionVal !== null) return sessionVal;
        return "";
    });

    useEffect(() => {
        sessionStorage.setItem("leads_creatorFilter", creatorFilter);
    }, [creatorFilter]);
    const [totalItems, setTotalItems] = useState(0);
    const [showEstimateForm, setShowEstimateForm] = useState(false);
    const [selectedLeadForEstimate, setSelectedLeadForEstimate] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const [unassignedOnly, setUnassignedOnly] = useState(false);
    const [stats, setStats] = useState({
        totalLeads: 0,
        newLeads: 0,
        assigned: 0,
        converted: 0,
        unassigned: 0
    });
    const [columnFilters, setColumnFilters] = useState(() => {
        const sessionVal = sessionStorage.getItem("leads_assignedToFilter");
        let defaultAssignedTo = "";
        if (sessionVal !== null) {
            defaultAssignedTo = sessionVal;
        } else {
            const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
            defaultAssignedTo = (storedUser.role_type === "admin" || !storedUser.leads_assigned) ? "" : (storedUser._id || storedUser.id || "");
        }
        
        return {
            customer_name: "",
            company_name: "",
            phone: "",
            division: "",
            assigned_to: defaultAssignedTo,
            lead_status: "",
            due_date: ""
        };
    });

    useEffect(() => {
        sessionStorage.setItem("leads_assignedToFilter", columnFilters.assigned_to);
    }, [columnFilters.assigned_to]);
    const navigate = useNavigate();
    const debouncedSearch = useDebounce(search);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (creatorFilter && creatorFilter !== "all" && creatorFilter !== "") count++;
        if (columnFilters.assigned_to && columnFilters.assigned_to !== "all" && columnFilters.assigned_to !== "") count++;
        return count;
    }, [creatorFilter, columnFilters.assigned_to]);

    const modules = currentUser.permissions || [];
    const leadsPermissions = modules.filter(
        m => m.module?.toLowerCase() === "leads"
    );

    const users = useHierarchyUsers(currentUser);
    const leadAssignableUsers = useMemo(() => {
        return users.filter(
            (u) => u.leads_assigned === true
        );
    }, [users]);

    const allLeadsPermission = leadsPermissions.find(
        m => m.submenu_module === "AllLeads"
    );

    const assignedLeadsPermission = leadsPermissions.find(
        m => m.submenu_module === "AssignedLeads"
    );

    const hasAllLeadsAccess = allLeadsPermission && (
        allLeadsPermission.canView ||
        allLeadsPermission.canUpdate ||
        allLeadsPermission.canDelete ||
        allLeadsPermission.canAdd
    );

    const hasAssignedLeadsAccess = assignedLeadsPermission && (
        assignedLeadsPermission.canView ||
        assignedLeadsPermission.canUpdate ||
        assignedLeadsPermission.canDelete ||
        assignedLeadsPermission.canAdd
    );

    const canView = (allLeadsPermission?.canView || assignedLeadsPermission?.canView) ?? false;
    const canAdd = (allLeadsPermission?.canAdd || assignedLeadsPermission?.canAdd) ?? false;
    const canUpdate = (allLeadsPermission?.canUpdate || assignedLeadsPermission?.canUpdate) ?? false;
    const canDelete = (allLeadsPermission?.canDelete || assignedLeadsPermission?.canDelete) ?? false;

    const assignedOnly = hasAssignedLeadsAccess && !hasAllLeadsAccess;
    /* ---------------- LOAD LEADS ---------------- */
    const debouncedFilters = useDebounce(columnFilters, 500);
    const loadLeads = useCallback(async () => {
        try {
            setLoading(true);

            // Determine if we are in "filter mode" (any filter active)
            const isFiltered = !!debouncedSearch || Object.entries(debouncedFilters).some(([k, v]) => v !== "" && k !== "assigned_to") || (debouncedFilters.assigned_to && debouncedFilters.assigned_to !== "");

            const params = {
                page: isFiltered ? 1 : page,
                limit: isFiltered ? 1000 : limit,
                search: (debouncedSearch || "").trim(),
                created_by_user: creatorFilter || undefined,
            };

            // Only add non-empty filters
            Object.entries(debouncedFilters).forEach(([key, value]) => {
                // Skip special keywords that are handled client-side
                const isSpecialKeyword = ["all", "unassigned", "assigned"].includes(value);
                if (value !== "" && value !== null && value !== undefined && !isSpecialKeyword) {
                    params[key] = value;
                }
            });

            if (assignedOnly) {
                params.assigned_to = columnFilters.assigned_to || currentUser.id;
            }

            const res = await Lead.list(params);
            const data = res.data || [];

            setLeads(data);

            if (!isFiltered) {
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalItems(res.pagination?.total || 0);
            }
        } catch (err) {
            console.error("Failed to load leads:", err);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, [
        page,
        limit,
        debouncedSearch,
        debouncedFilters,
        creatorFilter,
        assignedOnly
    ]);

    const loadStats = async () => {
        try {
            const res = await Lead.getStats();
            setStats(res);
        } catch (err) {
            console.error("Stats load failed", err);
        }
    };

    useEffect(() => {
        loadLeads();
    }, [loadLeads]);

    useEffect(() => {
        loadStats();
    }, []);

    useEffect(() => {
        // Fetch customers for tax exemption lookup in EstimateForm
        const fetchCustomers = async () => {
            try {
                const data = await localApi.request("/customers");
                setCustomers(data || []);
            } catch (err) {
                console.error("Failed to fetch customers", err);
            }
        };
        fetchCustomers();
    }, []);

    useEffect(() => {
        loadDivisions();
    }, []);

    useEffect(() => {
        Estimate.list().then(res => {
            setEstimates(res.data || []);
        });
    }, []);

    const loadDivisions = async () => {
        const [divisionsRes, leadStatusRes] = await Promise.all([
            masterDataService.getAll("divisions", { 
                all: true, 
                skipFilter: currentUser?.role_type === "admin" || currentUser?.all_lead_visible 
            }),
            masterDataService.getAll("lead_status", { all: true })
        ]);

        setDivisions(divisionsRes.data || []);
        setLeadStatuses(leadStatusRes.data || []);
    };

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);


    useEffect(() => {
        if (isMobile) {
            setViewMode("grid");
        }
    }, [isMobile]);

    /* ---------------- SELECTION ---------------- */
    const handleSelectItem = useCallback((id, checked) => {
        setSelectedItems(prev =>
            checked ? [...prev, id] : prev.filter(x => x !== id)
        );
    }, []);

    const filteredLeads = useMemo(() => {
        const assigneeFilterValue = (columnFilters.assigned_to || "").toLowerCase();
        const searchTerm = (search || "").toLowerCase().trim();

        let result = leads.filter(lead => {
            // 1. Assignee Filter
            let matchesAssignee = true;
            if (assigneeFilterValue && assigneeFilterValue !== "all") {
                // Robust unassigned check
                const isUnassigned = !lead.assigned_to ||
                    (typeof lead.assigned_to === 'object' && !lead.assigned_to._id) ||
                    lead.assigned_to === "unassigned";

                if (assigneeFilterValue === "unassigned") {
                    matchesAssignee = isUnassigned;
                } else if (assigneeFilterValue === "assigned") {
                    matchesAssignee = !isUnassigned;
                } else {
                    matchesAssignee = (
                        lead.assigned_to?._id === columnFilters.assigned_to ||
                        lead.assigned_to?.full_name?.toLowerCase().includes(assigneeFilterValue)
                    );
                }
            }

            // 2. Search Filter (Client-side fallback/sync)
            let matchesSearch = true;
            if (searchTerm) {
                const searchableFields = [
                    lead.customer_name,
                    lead.company_name,
                    lead.email,
                    lead.division?.name,
                    lead.assigned_to?.full_name
                ].map(f => (f || "").toLowerCase());

                const matchesOtherFields = searchableFields.some(f => f.includes(searchTerm));

                let matchesPhone = false;
                if (lead.phone) {
                    const cleanPhone = lead.phone.replace(/\D/g, "");
                    const cleanSearchTerm = searchTerm.replace(/\D/g, "");
                    if (cleanSearchTerm) {
                        matchesPhone = cleanPhone.includes(cleanSearchTerm);
                    } else {
                        matchesPhone = lead.phone.toLowerCase().includes(searchTerm);
                    }
                }

                matchesSearch = matchesOtherFields || matchesPhone;
            }

            return matchesAssignee && matchesSearch;
        });

        return result;
    }, [leads, columnFilters.assigned_to, search]);

    const paginatedLeads = useMemo(() => {
        return filteredLeads;
    }, [filteredLeads]);

    useEffect(() => {
        const isFiltered = !!search || Object.values(columnFilters).some(v => v !== "");
        if (isFiltered) {
            setTotalItems(filteredLeads.length);
            setTotalPages(Math.ceil(filteredLeads.length / limit) || 1);
        }
    }, [filteredLeads.length, search, columnFilters, limit]);

    const handleSelectAll = useCallback((checked) => {
        setSelectedItems(
            checked ? filteredLeads.map(l => l._id) : []
        );
    }, [filteredLeads]);

    /* ---------------- BULK DELETE ---------------- */
    const handleBulkDelete = async () => {
        const result = await Swal.fire({
            title: "Delete Selected Leads?",
            text: `You are deleting ${selectedItems.length} leads`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Yes, delete all"
        });

        if (!result.isConfirmed) return;

        try {
            await Lead.bulkDelete(selectedItems);
            Swal.fire({
                icon: "success",
                title: "Deleted",
                text: "Selected leads deleted successfully",
                timer: 1500,
                showConfirmButton: false
            });
            setSelectedItems([]);
            loadLeads();
            loadStats();
        } catch (err) {
            console.error("Bulk delete failed:", err);
        }
    };

    /* ---------------- ACTIONS ---------------- */
    const handleAssign = async (leadId, userId) => {

        try {
            setAssigningLeadId(leadId);
            await Lead.assign(leadId, userId);

            const assignedUser = users.find(u => u._id === userId);

            Swal.fire({
                icon: "success",
                title: "Lead Assigned",
                text: `Lead successfully assigned to ${assignedUser?.full_name || "user"}`,
                timer: 2000,
                showConfirmButton: false
            });

            loadLeads();
            loadStats();
        } catch (err) {
            console.error("Assign failed:", err);

            Swal.fire({
                icon: "error",
                title: "Assignment Failed",
                text: "Unable to assign lead. Please try again."
            });
        } finally {
            setAssigningLeadId(null);
        }
    };

    const handleConvert = async (id) => {
        try {
            await Lead.convert(id);

            Swal.fire({
                icon: "success",
                title: "Converted",
                text: "Lead converted to contact",
                timer: 1500,
                showConfirmButton: false
            });

            setLeads(prev => prev.filter(l => l._id !== id));
            loadStats();
        } catch (err) {
            const message =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                "Something went wrong while converting the lead";

            Swal.fire({
                icon: "error",
                title: "Conversion Failed",
                text: message
            });
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Delete Lead?",
            text: "This action cannot be undone!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: "Yes, delete it"
        });

        if (!result.isConfirmed) return;

        try {
            await Lead.delete(id);

            Swal.fire({
                icon: "success",
                title: "Deleted",
                text: "Lead deleted successfully",
                timer: 1500,
                showConfirmButton: false
            });

            loadLeads();
            loadStats();
        } catch (err) {
            Swal.fire("Error", "Failed to delete lead", "error");
        }
    };

    const handleQuickEstimate = (lead) => {
        setSelectedLeadForEstimate(lead);
        setShowEstimateForm(true);
    };

    const handleColumnFilterChange = useCallback((key, value) => {
        setColumnFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const leadStatsCards = [
        {
            title: "Total Leads",
            value: stats.totalLeads,
            icon: UilUsersAlt,
            color: "bg-orange-500"
        },
        {
            title: "Converted",
            value: stats.converted,
            icon: UilCheckCircle,
            color: "bg-indigo-700"
        },
        {
            title: "Assigned",
            value: stats.assigned,
            icon: UilChartLine,
            color: "bg-yellow-500"
        },
        {
            title: "Unassigned",
            value: stats.unassigned,
            icon: UilUserTimes,
            color: "bg-red-500"
        }
    ];

    const handleStatClick = (title) => {
        setPage(1);
        if (title === "Unassigned") {
            setUnassignedOnly(true);
            setColumnFilters(prev => ({ ...prev, assigned_to: "unassigned" }));
        } else if (title === "Total Leads") {
            setUnassignedOnly(false);
            setColumnFilters(prev => ({ ...prev, assigned_to: "" }));
            setSearch("");
            setCreatorFilter("");
        } else if (title === "Assigned") {
            setUnassignedOnly(false);
            setColumnFilters(prev => ({ ...prev, assigned_to: "assigned" }));
        }
    };

    if (initialLoading) return <TablePageSkeleton />;
    /* ---------------- UI ---------------- */
    return (
        <div>
            {/* HEADER */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold">Leads</h1>
                    <p className="text-gray-600">Manage your incoming leads</p>
                </div>

                <div className="flex gap-2 items-center">
                    {!isMobile && (
                        <ViewToggle view={viewMode} onViewChange={setViewMode} />
                    )}

                    {canAdd && (
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                setSelectedItems([]);
                                setEditingLead(null);
                                setShowForm(true);
                            }}

                        >
                            <Plus className="w-4 h-4 mr-2" />
                            New Lead
                        </Button>
                    )}
                </div>
            </div>

            {hasAllLeadsAccess && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

                {leadStatsCards.map((stat, index) => (
                    <Card
                        key={index}
                        className={`relative overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer transition-all hover:shadow-md ${(stat.title === "Unassigned" && unassignedOnly) || (stat.title === "Total Leads" && !unassignedOnly && !columnFilters.assigned_to)
                            ? ""
                            : ""
                            }`}
                    >
                        <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${stat.color} rounded-full opacity-10`} />

                        <CardHeader className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="relative group cursor-help inline-block">
                                        <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                            {stat.title}

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-gray-400 text-lg cursor-help">ⓘ</span>
                                                    </TooltipTrigger>

                                                    <TooltipContent side="top" className="max-w-xs text-left">

                                                        {stat.title === "Total Leads" && (
                                                            <>
                                                                Total number of leads created
                                                                <br /><br />
                                                                Assigned: {stats.assigned} <br />
                                                                Unassigned: {stats.unassigned} <br />
                                                                Convert: {stats.converted}
                                                                <br />
                                                            </>
                                                        )}

                                                        {stat.title === "Assigned" && (
                                                            <>
                                                                {currentUser.role_type === "admin"
                                                                    ? "Leads assigned to users"
                                                                    : "Leads assigned to you"}
                                                            </>
                                                        )}

                                                        {stat.title === "Unassigned" && (
                                                            <>Leads without any assigned user</>
                                                        )}

                                                        {stat.title === "Converted" && (
                                                            <>Leads converted into contacts or quick estimates</>
                                                        )}

                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </p>
                                    </div>

                                    <p className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                                        {stat.value}
                                    </p>

                                </div>

                                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-20`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                                </div>

                            </div>
                        </CardHeader>
                    </Card>
                ))}

            </div>)}

            {/* SEARCH + FILTER */}
            <div className="mb-6 flex flex-wrap flex-row items-center gap-3">

                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                        placeholder="Search leads..."
                        value={search}
                        onChange={(e) => {
                            setSelectedItems([]);
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="pl-10"
                    />
                </div>

                {hasAllLeadsAccess && (
                    <Button
                        variant={unassignedOnly ? "default" : "outline"}

                        className={`flex items-center gap-2 ${unassignedOnly
                            ? "bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 dark:text-white dark:border-orange-600"
                            : "dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                            }`}
                        onClick={() => {
                            setUnassignedOnly(prev => {
                                const newValue = !prev;

                                setColumnFilters(prevFilters => ({
                                    ...prevFilters,
                                    assigned_to: newValue ? "unassigned" : ""
                                }));

                                return newValue;
                            });

                            setPage(1);
                        }}
                    >
                        <AlertTriangle className="w-5 h-5" /> Unassigned Only
                    </Button>)}

                {/* Advanced Filters Button */}
                <AdvancedFilters
                    isOpen={showFilters}
                    onToggle={() => { setSelectedItems([]); setShowFilters(prev => !prev); }}
                    activeCount={activeFiltersCount}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <HierarchyUserSelect
                            label="Created By"
                            users={users}
                            value={creatorFilter}
                            onChange={(value) => {
                                setCreatorFilter(value === "all" ? "" : value);
                                setPage(1);
                            }}
                        />
                        <HierarchyUserSelect
                            label="Assigned To"
                            users={leadAssignableUsers}
                            value={columnFilters.assigned_to}
                            onChange={(value) => {
                                setColumnFilters(prev => ({
                                    ...prev,
                                    assigned_to: value === "all" ? "" : value
                                }));
                                setPage(1);
                            }}
                        />
                    </div>
                </AdvancedFilters>
            </div>

            {/* BULK BAR */}
            <BulkActions
                selectedCount={selectedItems.length}
                onDelete={handleBulkDelete}
                onClear={() => setSelectedItems([])}
            />

            {/* LIST / GRID VIEW */}
            {!isMobile && viewMode === "list" ? (
                <LeadListView
                    leads={paginatedLeads}
                    users={users}
                    divisions={divisions}
                    leadStatuses={leadStatuses}
                    currentUser={currentUser}
                    selectedItems={selectedItems}
                    hasAllLeadsAccess={hasAllLeadsAccess}
                    onSelectItem={handleSelectItem}
                    onSelectAll={handleSelectAll}
                    onClearSelection={() => setSelectedItems([])}
                    canUpdate={canUpdate}
                    onEdit={(lead) => {
                        setSelectedItems([]);
                        setEditingLead(lead);
                        setShowForm(true);
                    }}
                    canDelete={canDelete}
                    onAssign={handleAssign}
                    assigningLeadId={assigningLeadId}
                    onDelete={handleDelete}
                    onConvert={(id) => {
                        setSelectedItems([]);
                        handleConvert(id);
                    }}
                    columnFilters={columnFilters}
                    onColumnFilterChange={handleColumnFilterChange}
                    onQuickEstimate={(lead) => {
                        setSelectedItems([]);
                        handleQuickEstimate(lead);
                    }}
                />
            ) : paginatedLeads.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border">
                    <UserRound className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No leads found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {search || Object.values(columnFilters || {}).some(v => v !== "")
                            ? "No leads match your filter criteria"
                            : "Get started by creating your first lead"}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedLeads.map(lead => (
                        <LeadCard
                            key={lead._id}
                            users={users}
                            currentUser={currentUser}
                            lead={lead}
                            leadStatuses={leadStatuses}
                            onEdit={(lead) => {
                                setSelectedItems([]);
                                setEditingLead(lead);
                                setShowForm(true);
                            }}
                            selected={selectedItems.includes(lead._id)}
                            onSelect={handleSelectItem}
                            canUpdate={canUpdate}
                            hasAllLeadsAccess={hasAllLeadsAccess}
                            canDelete={canDelete}
                            onAssign={handleAssign}
                            assigningLeadId={assigningLeadId}
                            onDelete={handleDelete}
                            onConvert={(id) => {
                                setSelectedItems([]);
                                handleConvert(id);
                            }}
                            onQuickEstimate={(lead) => {
                                setSelectedItems([]);
                                handleQuickEstimate(lead);
                            }}
                        />
                    ))}
                </div>
            )}

            {/* PAGINATION */}
            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={(value) => {
                    setLimit(value);
                    setPage(1);
                }}
            />

            {/* CREATE FORM */}
            {showForm && (
                <Suspense fallback={<TablePageSkeleton />}>
                    <LeadForm
                        lead={editingLead}
                        users={users}
                        customers={customers}
                        onSuccess={() => {
                            setShowForm(false);
                            setEditingLead(null);
                            loadLeads();
                            loadStats();
                        }}
                        onCancel={() => {
                            setShowForm(false);
                            setEditingLead(null);
                        }}
                    />
                </Suspense>
            )}

            {showEstimateForm && (
                <EstimateForm
                    prefillLead={selectedLeadForEstimate}
                    estimates={estimates}
                    fromLeads={true}
                    customers={customers}
                    onSubmit={async (data, token) => {
                        await Estimate.createQuick(data);
                        setShowEstimateForm(false);
                        setSelectedLeadForEstimate(null);
                        loadLeads();
                        loadStats();
                    }}
                    onCancel={() => {
                        setShowEstimateForm(false);
                        setSelectedLeadForEstimate(null);
                    }}

                />
            )}

        </div>
    );
}
