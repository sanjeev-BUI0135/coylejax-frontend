import { useState, useEffect } from "react";
import { Project } from "@/api/entities";
import { Customer } from "@/api/entities";
import { Estimate, Invoice } from "@/api/entities";
import { Payment } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Building2, Calculator, Filter, ChevronDown, UserPlus, Download, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DashboardStats from "../components/dashboard/DashboardStats";
import RecentProjects from "../components/dashboard/RecentProjects";
import RevenueChart from "../components/dashboard/RevenueChart";
import ProjectStatusChart from "../components/dashboard/ProjectStatusChart";
import DivisionAnalytics from "../components/dashboard/DivisionAnalytics";
import ProjectTimeline from "../components/dashboard/ProjectTimeline";
import PerformanceMetrics from "../components/dashboard/PerformanceMetrics";
import LostReasonChart from "../components/dashboard/LostReasonChart";
import TimeLineChart from "@/components/dashboard/TimeLineChart";
import api from "../services/masterDataService.js";
import localApi from "../services/localApi.js";
import LeadsSourceChart from "@/components/dashboard/LeadsSourceChart";
import { startOfDay, endOfDay, isWithinInterval } from "date-fns";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import { buildPermissionMap } from "@/utils/buildPermissionMap";
import { hasPermission } from "../utils/hasPermission.js"
import { startOfMonth, endOfMonth } from "date-fns";
import { formatDateUS, formatDateUTC } from "../utils/formatdate.js";
import EstimateStatusChart from "../components/dashboard/EstimateStatusChart.jsx";
import ProjectStageChart from "../components/dashboard/ProjectStageChart.jsx";
import RevenueOverviewChart from "../components/dashboard/RevenueOverviewChart.jsx";
import TopCustomersRevenue from "../components/dashboard/TopCustomersRevenue.jsx";
import InvoiceOverview from "../components/dashboard/InvoiceOverview.jsx";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [date, setDate] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [me, setMe] = useState([]);

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const filterProject = projects
  const dashboardPerms = buildPermissionMap(
    user.permissions,
    "Dashboard"
  );
  const canAddProject = hasPermission(user.permissions, "Projects", "add");
  const canAddEstimate = hasPermission(user.permissions, "Projects", "add", "Estimates");
  const canAddCustomer = hasPermission(user.permissions, "Customers", "add");

  const showCreateMenu =
    canAddProject || canAddEstimate || canAddCustomer;

  const [divisions, setDivisions] = useState([]);
  const sortedDivisions = divisions
    .filter(div => {
      if (div.status !== "active") return false;

      const companyId = me.role_type === "admin" ? me._id : me.created_by;
      return String(div.created_by) === String(companyId);
    })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe()
        setMe(res)
      } catch (error) {
        console.log(error)
      }
    }
    fetchMe()
  }, [])


  const loadDashboardData = async () => {
    try {
      const [projectsRes, customersData, estimatesData, paymentsData, invoicesData, divisionsData] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_BASE}/projects/all/dashboard`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }).then(res => res.json()),
        Customer.list("-createdAt"),
        Estimate.list({ sort: "-updatedAt", limit: 0 }),
        Payment.list("-updatedAt"),
        Invoice.list("-updatedAt"),
        api.getAll('divisions')
      ]);

      const projectsArray = Array.isArray(projectsRes) ? projectsRes : (projectsRes.data || []);
      const customersArray = Array.isArray(customersData) ? customersData : (customersData.data || []);
      const estimatesArray = Array.isArray(estimatesData) ? estimatesData : (estimatesData.data || []);
      const paymentsArray = Array.isArray(paymentsData) ? paymentsData : (paymentsData.data || []);
      setProjects(projectsArray);
      setCustomers(customersArray);
      setEstimates(estimatesArray);
      setPayments(paymentsArray);
      setDivisions(divisionsData.data);
      setInvoices(invoicesData);

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const userProjects = projects

  const isInDateRange = (dateStr) => {
    if (!date?.from) return true;
    if (!dateStr) return false;
    
    let d;
    if (typeof dateStr === "string" && dateStr.includes("T")) {
      // Extract the exact YYYY-MM-DD from the UTC string to avoid timezone shift
      const [year, month, day] = dateStr.split("T")[0].split("-");
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(dateStr);
    }

    if (isNaN(d.getTime())) return false;
    const start = startOfDay(date.from);
    const end = date.to ? endOfDay(date.to) : endOfDay(date.from);
    return isWithinInterval(d, { start, end });
  };

  const dateFilteredProjects = userProjects.filter(p => {
    const dateStr = p.created_date || p.createdAt || p.created_at || p.date;
    return isInDateRange(dateStr);
  });

  const dateFilteredEstimates = estimates.filter(e => {
    const dateStr = e.created_date || e.createdAt || e.created_at || e.date;
    return isInDateRange(dateStr);
  });

  const filteredEstimatesByDivision = divisionFilter === "all"
    ? dateFilteredEstimates
    : dateFilteredEstimates.filter(e => {
      if (e.is_quick_estimate) {
        return e.quick_customer?.division_type === divisionFilter;
      }
      const project = projects.find(p => p.id === e.project_id);
      return project?.project_type === divisionFilter;
    });

  const filteredProjectsByDivision = divisionFilter === "all"
    ? dateFilteredProjects
    : dateFilteredProjects.filter(p => p.project_type === divisionFilter);

  const filteredProjects = statusFilter === "all"
    ? filteredProjectsByDivision
    : filteredProjectsByDivision.filter(p => p.status === statusFilter);

  const filteredPayments = payments.filter(p => {
    const project = filteredProjects.find(proj => proj.id === p.project_id);
    if (!project) return false;
    const paymentDateStr = p.payment_date || p.createdAt || p.created_at;
    return isInDateRange(paymentDateStr);
  });

  const nonLostProjects = filteredProjects.filter(p => p.status !== "lost");

  const now = new Date();

  const thisMonthProjects = nonLostProjects.filter(p => {
    const date = new Date(p.createdAt);

    return (
      date.getUTCFullYear() === now.getUTCFullYear() &&
      date.getUTCMonth() === now.getUTCMonth()
    );
  }).length;

  const lastMonthProjects = nonLostProjects.filter(p => {
    const date = new Date(p.createdAt);

    const lastMonth = now.getUTCMonth() - 1;
    const year =
      lastMonth < 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();

    const month = lastMonth < 0 ? 11 : lastMonth;

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month
    );
  }).length;

  let totalProjectsGrowth;

  if (lastMonthProjects === 0) {
    totalProjectsGrowth =
      thisMonthProjects > 0 ? 100 : 0;
  } else {
    totalProjectsGrowth =
      ((thisMonthProjects - lastMonthProjects) / lastMonthProjects) * 100;
  }

  const thisMonthRevenue = filteredPayments
    .filter(p => {
      if (p.status !== "received") return false;
      const date = new Date(p.payment_date);

      return (
        date.getUTCFullYear() === now.getUTCFullYear() &&
        date.getUTCMonth() === now.getUTCMonth()
      );
    })
    .reduce((sum, p) => sum + (Number(p.amount || 0) - Number(p.processing_fee || 0)), 0);

  const lastMonthRevenue = filteredPayments
    .filter(p => {
      if (p.status !== "received") return false;
      const date = new Date(p.payment_date);

      const lastMonth = now.getUTCMonth() - 1;
      const year =
        lastMonth < 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      const month = lastMonth < 0 ? 11 : lastMonth;

      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month
      );
    })
    .reduce((sum, p) => sum + (Number(p.amount || 0) - Number(p.processing_fee || 0)), 0);

  let revenueGrowth;

  if (lastMonthRevenue === 0) {
    revenueGrowth =
      thisMonthRevenue > 0 ? 100 : 0;
  } else {
    revenueGrowth =
      ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  }

  const thisMonthCompleted = nonLostProjects.filter(p => {
    if (p.status !== "completed") return false;

    const date = new Date(p.actual_end_date || p.completed_date);

    return (
      date.getUTCFullYear() === now.getUTCFullYear() &&
      date.getUTCMonth() === now.getUTCMonth()
    );
  }).length;

  const lastMonthCompleted = nonLostProjects.filter(p => {
    if (p.status !== "completed") return false;

    const date = new Date(p.actual_end_date || p.completed_date);

    const lastMonth = now.getUTCMonth() - 1;
    const year =
      lastMonth < 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    const month = lastMonth < 0 ? 11 : lastMonth;

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month
    );
  }).length;

  let completedGrowth;

  if (lastMonthCompleted === 0) {
    completedGrowth = thisMonthCompleted > 0 ? 100 : 0;
  } else {
    completedGrowth =
      ((thisMonthCompleted - lastMonthCompleted) / lastMonthCompleted) * 100;
  }

  const stats = {
    // 1. Total Estimates (date-filtered)
    totalEstimates: filteredEstimatesByDivision.length,

    // 2. Estimate Revenue (date-filtered)
    estimateRevenue: filteredEstimatesByDivision.reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0),

    // 3. Pending Estimates (date-filtered)
    pendingEstimates: filteredEstimatesByDivision.filter(e => e.status === "sent" || e.status === "draft").length,

    // 4. Awarded Projects (date-filtered estimates)
    awardedProjects: filteredEstimatesByDivision.filter(p => p.status === "awarded" || p.status === "approved").length,

    // 5. Total Revenue (In process to be billed) — uses filteredProjects (date + division + status)
    inProcessRevenue: filteredProjects
      .filter(p => ["open", "processing", "awarded" , "actively_working"].includes(p.status) && p.is_inactive !== true)
      .reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0),

    // 6. Completed Projects (date-filtered)
    completedProjects: filteredProjects.filter(p => p.status === "completed").length,

    // 7. Total Revenue (Completed) — uses filteredProjects
    completedRevenue: filteredProjects
      .filter(p => p.status === "completed")
      .reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0),

    // 8. Active Projects (date-filtered)
    activeProjects: filteredProjects.filter(p =>
      p.is_inactive !== true &&
      !["completed", "lost", "cancelled"].includes(p.status)
    ).length,

    // Keep growth metrics for trend lines
    totalProjectsGrowth: Number(totalProjectsGrowth.toFixed(1)),
    revenueGrowth: Number(revenueGrowth.toFixed(1)),
    completedProjectsGrowth: Number(completedGrowth.toFixed(1)),
    projectsOnTime: nonLostProjects.filter(p => {
      if (!p.estimated_end_date || p.status !== "completed") return false;
      const estimated = new Date(p.estimated_end_date);
      const actual = new Date(p.actual_end_date);
      estimated.setHours(0, 0, 0, 0);
      actual.setHours(0, 0, 0, 0);
      return actual <= estimated;
    }).length,
  };
  
  const escapeCsvField = (field) => {
    const str = String(field || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportSummary = () => {
    const headers = [
      "Metric", "Value", "Division Filter", "Status Filter", "Export Date"
    ];

    const formatCurr = (val) => `$${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

    const summaryData = [
      ["Total Estimates", stats.totalEstimates, divisionFilter, statusFilter, formatDateUS(new Date())],
      ["Estimate Revenue", formatCurr(stats.estimateRevenue), divisionFilter, statusFilter, formatDateUS(new Date())],
      ["Pending Estimates", stats.pendingEstimates, divisionFilter, statusFilter, formatDateUS(new Date())],
      ["Awarded Projects", stats.awardedProjects, divisionFilter, statusFilter, formatDateUS(new Date())],
      ["Total Revenue (In Process)", formatCurr(stats.inProcessRevenue), divisionFilter, statusFilter, formatDateUS(new Date())],
      ["Completed Projects", stats.completedProjects, divisionFilter, statusFilter, formatDateUS(new Date())],
      ["Total Revenue (Completed)", formatCurr(stats.completedRevenue), divisionFilter, statusFilter, formatDateUS(new Date())],
      ["Active Projects", stats.activeProjects, divisionFilter, statusFilter, formatDateUS(new Date())]
    ];

    const csvRows = summaryData.map(row => row.map(escapeCsvField).join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `CoyleJax_Dashboard_Summary_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportProjects = () => {
    if (filteredProjects.length === 0) {
      alert("No projects to export with current filters.");
      return;
    }

    const headers = [
      "Project Name", "Customer", "Division", "Status", "Priority",
      "Location", "Description", "Estimated Value", "Progress %",
      "Est. Start Date", "Est. End Date", "Created Date"
    ];

    const csvRows = filteredProjects.map(project => {
      const rawCustomer = project.customer_ids?.[0];
      const customer = typeof rawCustomer === "object"
        ? rawCustomer
        : customers?.find(c => String(c._id || c.id) === String(rawCustomer));
      const row = [
        project.project_name,
        customer ? customer.contact_name : '',
        project.project_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '',
        project.status?.replace(/_/g, ' '),
        project.priority,
        project.location,
        project.description,
        project.estimated_value || '',
        project.progress_percentage || 0,
        formatDateUTC(project.estimated_start_date || ''),
        formatDateUTC(project.estimated_end_date || ''),
        formatDateUTC(project.createdAt)
      ];
      return row.map(escapeCsvField).join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const today = new Date().toISOString().slice(0, 10);
    const filterSuffix = divisionFilter !== 'all' || statusFilter !== 'all' ? '_Filtered' : '';
    link.setAttribute("download", `CoyleJax_Dashboard_Projects${filterSuffix}_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full pb-10">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1 className="text-xl md:text-3xl font-bold text-gray-900temp dark:text-white">
              Dashboard
            </h1>
            <Button
              variant="outline"
              size="icon"
              className="ml-auto sm:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-5 h-5" />
            </Button>
          </div>
          <div className={`${showFilters ? "flex" : "hidden"} flex flex-col gap-3 w-full sm:flex sm:flex-row sm:flex-wrap sm:justify-end sm:items-center sm:gap-3`}>
            <DateRangePicker className="shrink-0" date={date} setDate={setDate} />
            <div className="flex items-center gap-2 shrink-0">
              {/* <Filter className="w-4 h-4" /> */}
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {sortedDivisions.map((division) => (
                    <SelectItem key={division._id} value={division.value}>
                      {division.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* <Filter className="w-4 h-4" /> */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="actively_working">Actively Working</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportSummary}>
                  Export Dashboard Summary
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportProjects}>
                  Export Filtered Projects
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create */}
            {showCreateMenu && (<DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Create New
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                {canAddProject && (<DropdownMenuItem asChild>
                  <Link to={createPageUrl("Projects")} className="flex items-center w-full">
                    <Building2 className="w-4 h-4 mr-2" />
                    New Project
                  </Link>
                </DropdownMenuItem>)}
                {canAddCustomer && (<DropdownMenuItem asChild>
                  <Link to={createPageUrl("Customers")} className="flex items-center w-full">
                    <UserPlus className="w-4 h-4 mr-2" />
                    New Contact
                  </Link>
                </DropdownMenuItem>)}
                {canAddEstimate && (<DropdownMenuItem asChild>
                  <Link to={createPageUrl("Estimates")} state={{ openForm: true }} className="flex items-center w-full">
                    <Calculator className="w-4 h-4 mr-2" />
                    Quick Estimate
                  </Link>
                </DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>)}
          </div>
        </div>
      </div>

      <DashboardStats stats={stats} loading={loading} divisionFilter={divisionFilter} dashboardPerms={dashboardPerms} />
      <div className="mt-5"> {dashboardPerms.widgets.LeadsSourceChart?.view && <LeadsSourceChart date={date} division={divisionFilter} />}</div>
      <div className="mt-5">
        {dashboardPerms.widgets.ProjectTimelinewidget?.view && (<TimeLineChart customers={customers} />)}
      </div>
      {/* Estimates & Projects Analytics */}
      <div className="grid lg:grid-cols-2 gap-3 mt-5">
        <EstimateStatusChart
          estimates={filteredEstimatesByDivision}
          loading={loading}
        />

        <ProjectStageChart
          projects={filteredProjects}
          loading={loading}
        />
      </div>
      <div className="mt-5">
        <RevenueOverviewChart
          projects={projects}
          payments={payments}
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-3 mt-5">
        <TopCustomersRevenue customers={customers} projects={filteredProjects} />
        <InvoiceOverview payments={payments} invoices={invoices}/>
      </div>
      <div className="grid lg:grid-cols-4 gap-3 mt-5">
        <div className="lg:col-span-2 space-y-8 min-w-0">
          {dashboardPerms.widgets.RecentProjectswidget?.view && (<RecentProjects projects={filteredProjects.slice(0, 5)} customers={customers} loading={loading} />)}
          {/* {dashboardPerms.widgets.PerformanceMetricswidget?.view && (<PerformanceMetrics projects={filteredProjects} loading={loading} />)} */}
          {dashboardPerms.widgets.AnalysisofLostProjectswidget?.view && (<LostReasonChart projects={filterProject} loading={loading} />)}
        </div>

        <div className="lg:col-span-2 space-y-5 min-w-0">
          <DivisionAnalytics
            projects={filteredProjects}
            payments={filteredPayments}
            loading={loading}
            selectedDivision={divisionFilter}
            dashboardPerms={dashboardPerms}
          />
        </div>
      </div>

      <div className="mt-5">
        {dashboardPerms.widgets.Timelinewidget?.view && (<ProjectTimeline projects={filteredProjects} customers={customers} loading={loading} divisions={divisions} />)}
      </div>
    </div>
  );
}
