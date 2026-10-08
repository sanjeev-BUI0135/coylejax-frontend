import React, {
  useEffect,
  useState,
  useCallback,
  Suspense,
  lazy,
  useMemo
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Project } from "../api/entities.js";
import { Search, Building2, RotateCcw, Download, MoreVertical, Filter } from "lucide-react";
import Swal from "sweetalert2";
import ViewToggle from "../components/shared/ViewToggle";
import Pagination from "../components/shared/Pagination";
import BulkActions from "../components/shared/BulkActions";
import ProjectFilters from "../components/projects/ProjectFilters.jsx";
import AdvancedFilters from "../components/shared/AdvanceFilters.jsx";
import { useProjectsData } from "../hooks/useProjectsData.js";
import { useHierarchyUsers } from "../hooks/useHierarchyUsers.js";
import localApi from "../services/localApi.js";
import TablePageSkeleton from "../components/ui/tableskeleton.jsx";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ProjectListRow = lazy(() =>
  import("../components/projects/ProjectListRow.jsx")
);
const ProjectCard = lazy(() =>
  import("../components/projects/ProjectCard.jsx")
);

const ProjectForm = lazy(() =>
  import("../components/projects/ProjectForm.jsx")
);


export default function InactiveProjects() {
  const [projects, setProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pages: 1
  });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const { divisions, loadData, customers } = useProjectsData();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");

  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    project_type: "all"
  });

  const [columnFilters, setColumnFilters] = useState({
    project_name: "",
    project_number: "",
    project_creation_type: "",
    project_type: "",
    createdAt: "",
    estimated_value: "",
    status: "",
    priority: ""
  });
  const [debouncedColumnFilters, setDebouncedColumnFilters] = useState(columnFilters);
  const handleExport = () => {
    setSelectedItems([]);
    if (projects.length === 0) {
      alert("No projects to export.");
      return;
    }

    const headers = [
      "Company Name", "Project Name", "Contact Name", "Division", "Status", "Priority",
      "Location", "Description", "Estimated Value", "Progress %",
      "Est. Start Date", "Est. End Date", "Created Date", "Lost Reason"
    ];

    const escapeCsvField = (field) => {
      const str = String(field || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = projects.map(project => {
      const customerId =
        project.customer_ids?.[0]?._id ||
        project.customer_ids?.[0];

      const customer = customers.find(
        c =>
          c._id?.toString() === customerId?.toString() ||
          c.id?.toString() === customerId?.toString()
      );
      const displayName = [project.project_name]
        .filter(Boolean)
        .join(" - ");
      return [
        customer?.company_name || '',
        displayName || '',
        customer?.contact_name || "",
        project.project_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '',
        project.status?.replace(/_/g, ' ') || '',
        project.priority || '',
        project.location || '',
        project.description || '',
        project.estimated_value || '',
        project.progress_percentage || 0,
        project.estimated_start_date || '',
        project.estimated_end_date || '',
        project.created_date ? new Date(project.created_date).toLocaleDateString() : '',
        project.lost_reason || ''
      ].map(escapeCsvField).join(',');
    });

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Projects_${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(
    () => parseInt(localStorage.getItem("inactiveItemsPerPage")) || 25
  );

  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("inactiveProjectsViewMode") || "list"
  );

  const [user] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const hierarchyUsers = useHierarchyUsers(user);
  const [me, setMe] = useState({});

  useEffect(() => {
    localApi.getMe().then(setMe).catch(console.error);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedColumnFilters(columnFilters);
    }, 500);

    return () => clearTimeout(timeout);
  }, [columnFilters]);

  useEffect(() => {
    if (isMobile) {
      setViewMode("grid");
    }
  }, [isMobile]);

  const filterDivisions = useMemo(() => {
    const companyId =
      user.role_type === "admin"
        ? user.id
        : me.created_by;

    return divisions.filter(d =>
      d.status === "active" &&
      String(d.created_by) === String(companyId)
    );
  }, [divisions, user.role_type, user.id, me.created_by]);

  const loadInactive = useCallback(async () => {
    try {
      setLoading(true);

      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,

        search: searchTerm,

        company: selectedCompany,
        customer: selectedCustomer,
        project: selectedProject,

        status: filters.status,
        division: filters.project_type,

        project_name: columnFilters.project_name || "",
        company_name: columnFilters.company_name || "",
        customer_name: columnFilters.customer_name || "",
        project_number: columnFilters.project_number || "",
        project_type: columnFilters.project_type || "",
        project_creation_type:
          columnFilters.project_creation_type || "",
        estimated_value:
          columnFilters.estimated_value || "",
        status_filter: columnFilters.status || "",
        priority: columnFilters.priority || "",
        createdAt: columnFilters.createdAt || ""
      });

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/projects/inactive/list?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      const data = await res.json();

      setProjects(data.data || []);
      setPagination({
        total: data.total || 0,
        page: data.page || 1,
        pages: data.pages || 1
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    searchTerm,
    selectedCompany,
    selectedCustomer,
    selectedProject,
    filters,
    debouncedColumnFilters
  ]);

  useEffect(() => {
    loadInactive();
  }, [loadInactive]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}/projects/inactive/list?limit=0`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          }
        );

        const data = await res.json();

        const projectsData = data.data || [];

        setAllProjects(projectsData);

        // Customers
        const customersMap = new Map();

        projectsData.forEach((p) => {
          const customer = p.customer_ids?.[0];

          if (customer) {
            customersMap.set(
              customer._id || customer.id,
              customer
            );
          }
        });

        setAllCustomers(
          Array.from(customersMap.values())
        );

        // Companies
        const companies = Array.from(
          new Set(
            projectsData
              .map((p) => p.customer_ids?.[0]?.company_name)
              .filter(Boolean)
          )
        );

        setAllCompanies(companies);

      } catch (err) {
        console.error(err);
      }
    };

    fetchDropdownData();
  }, []);


  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const getProjectDisplayStatus = (project) => {
    if (!project) return "";

    if (project.status === "inactive" && project.is_lost) return "lost";
    if (project.status === "inactive" && project.is_completed) return "completed";

    return project.status;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm, columnFilters]);


  // const totalPages = Math.ceil(projects.length / itemsPerPage);
  const totalPages = pagination?.pages || 1;


  const handleSelectItem = (id, checked) => {
    setSelectedItems(prev =>
      checked ? [...prev, id] : prev.filter(x => x !== id)
    );
  };

  const handleSelectAll = checked => {
    setSelectedItems(
      checked ? projects.map(p => p.id || p._id) : []
    );
  };


  const handleReopen = async projectId => {
    const confirm = await Swal.fire({
      title: "Reopen Project?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Reopen"
    });

    if (!confirm.isConfirmed) return;

    await fetch(
      `${import.meta.env.VITE_API_BASE}/projects/${projectId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: "reopen" })
      }
    );

    Swal.fire("Success", "Project reopened", "success");
    loadInactive();
    setSelectedItems([]);
  };

  useEffect(() => {
    localStorage.setItem("inactiveProjectsViewMode", viewMode);
  }, [viewMode]);

  const modules = user.permissions || [];
  const permissions = useMemo(() => {
    const map = {};
    modules.forEach(m => (map[m.module] = m));
    return map;
  }, [modules]);

  const canView = permissions["Inactive Projects"]?.canView;
  const canAdd = permissions["Inactive Projects"]?.canAdd;
  const canUpdate = permissions["Inactive Projects"]?.canUpdate;
  const canDelete = permissions["Inactive Projects"]?.canDelete;

  const handleEdit = useCallback((project) => {
    if (!canUpdate) {
      return Swal.fire(
        "Permission Denied",
        "You do not have permission to edit projects",
        "warning"
      );
    }

    setEditingProject(project);   // ✅ SET PROJECT
    setShowForm(true);            // ✅ OPEN FORM
  }, [canUpdate]);

  const handleSubmit = useCallback(async (projectData) => {
    try {
      await fetch(
        `${import.meta.env.VITE_API_BASE}/projects/${editingProject.id || editingProject._id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(projectData)
        }
      );

      Swal.fire("Updated", "Project updated successfully", "success");

      setShowForm(false);
      setEditingProject(null);
      loadInactive();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to update project", "error");
    }
  }, [editingProject, loadInactive]);

  const handleDeleteProject = useCallback(async (project) => {
    if (!canDelete) {
      return Swal.fire(
        "Permission Denied",
        "You do not have permission to delete projects",
        "warning"
      );
    }

    try {
      await fetch(
        `${import.meta.env.VITE_API_BASE}/projects/${project.id || project._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      Swal.fire("Deleted", "Project deleted successfully", "success");
      loadInactive();
      setSelectedItems([]);
    } catch (err) {
      Swal.fire("Error", "Failed to delete project", "error");
    }
  }, [canDelete, loadInactive]);


  const handleBulkDelete = async () => {
    if (!canDelete) {
      return Swal.fire("Permission Denied", "", "warning");
    }

    const confirm = await Swal.fire({
      title: `Delete ${selectedItems.length} project(s)?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33"
    });

    if (!confirm.isConfirmed) return;
    await Project.bulkDelete(selectedItems);
    Swal.fire("Deleted", "Projects deleted", "success");
    loadInactive();
    setSelectedItems([]);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProject(null);
  };

  const inactiveStatusOptions = [
    "lost",
    "completed"
  ];

  return (
    <div>
      {initialLoading ? (
        <TablePageSkeleton />
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl md:text-3xl font-bold">Inactive Projects</h1>
            <div className="flex space-x-3">
              {!isMobile && (
                <>
                  <Button
                    className=""
                    variant={showFilters ? "default" : "outline"}
                    size="icon"
                    onClick={() => {
                      setSelectedItems([]);
                      setShowFilters(!showFilters);
                    }}
                  >
                    <Filter className="w-4 h-4" />
                  </Button>
                  <ViewToggle view={viewMode} onViewChange={setViewMode} />

                  <Button
                    variant="outline"
                    onClick={handleExport}
                    disabled={!canView}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </>
              )}

              {/* Mobile Dropdown */}
              {isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">

                    {canView && (
                      <DropdownMenuItem onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          {showFilters && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-3 shadow-sm mb-4">

              <div className="flex gap-x-1 items-center justify-center">

                {/* Project */}
                <div className="w-[190px]">
                  <Select
                    value={selectedProject}
                    onValueChange={setSelectedProject}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Project" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">
                        Select Project
                      </SelectItem>

                      {allProjects.map((p) => (
                        <SelectItem
                          key={p.id || p._id}
                          value={p.id || p._id}
                        >
                          {p.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer */}
                <div className="w-[190px]">
                  <Select
                    value={selectedCustomer}
                    onValueChange={setSelectedCustomer}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Customer" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">
                        Select Customer
                      </SelectItem>

                      {Array.from(
                        new Map(
                          allProjects
                            .map((project) => {
                              const customerId =
                                project.customer_ids?.[0]?._id ||
                                project.customer_ids?.[0];

                              const customer = customers.find(
                                (c) =>
                                  c._id?.toString() === customerId?.toString() ||
                                  c.id?.toString() === customerId?.toString()
                              );

                              if (!customer) return null;

                              return [
                                customer._id || customer.id,
                                customer,
                              ];
                            })
                            .filter(Boolean)
                        ).values()
                      ).map((customer) => (
                        <SelectItem
                          key={customer._id || customer.id}
                          value={customer._id || customer.id}
                        >
                          {customer.contact_name ||
                            customer.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Company */}
                <div className="w-[190px]">
                  <Select
                    value={selectedCompany}
                    onValueChange={setSelectedCompany}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select Company" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">
                        Select Company
                      </SelectItem>

                      {Array.from(
                        new Set(
                          allProjects
                            .map((project) => {
                              const customerId =
                                project.customer_ids?.[0]?._id ||
                                project.customer_ids?.[0];

                              const customer = customers.find(
                                (c) =>
                                  c._id?.toString() === customerId?.toString() ||
                                  c.id?.toString() === customerId?.toString()
                              );

                              return customer?.company_name;
                            })
                            .filter(Boolean)
                        )
                      ).map((company) => (
                        <SelectItem
                          key={company}
                          value={company}
                        >
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Existing Filters */}
                <Suspense fallback={<div className="h-10 w-20 bg-gray-100 animate-pulse rounded" />}>
                  <ProjectFilters
                    filters={filters}
                    onFilterChange={setFilters}
                    divisions={filterDivisions}
                    statusOptions={inactiveStatusOptions}
                  />
                </Suspense>

                {/* Reset */}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={() => {
                    setSelectedProject("all");
                    setSelectedCustomer("all");
                    setSelectedCompany("all");

                    setFilters({
                      status: "all",
                      priority: "all",
                      project_type: "all",
                    });

                    setSearchInput("");
                    setSearchTerm("");
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          <div className="flex gap-3 mb-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-[10px] w-4 h-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search inactive projects..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
          </div>


          <BulkActions
            selectedCount={selectedItems.length}
            deleteLabel="Reopen Selected"
            onDelete={handleBulkDelete}
            onClear={() => setSelectedItems([])}
          />

          <Suspense fallback={<TablePageSkeleton />}>
            {viewMode === "list" ? (
              <ProjectListRow
                projects={projects}
                divisions={filterDivisions}
                customers={customers}
                users={hierarchyUsers}
                canEdit={canUpdate}
                canDelete={canDelete}
                onEdit={handleEdit}
                onDelete={handleDeleteProject}
                onSelectItem={handleSelectItem}
                onSelectAll={handleSelectAll}
                selectedItems={selectedItems}
                onClearSelection={() => setSelectedItems([])}
                columnFilters={columnFilters}
                onColumnFilterChange={(col, val) =>
                  setColumnFilters(prev => ({
                    ...prev,
                    [col]: val
                  }))
                }
                hideActions={false}
                customAction={project => (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleReopen(project.id || project._id)
                    }
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Reopen
                  </Button>
                )}
                totalFilteredCount={projects.length}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                  <ProjectCard
                    key={project.id || project._id}
                    project={project}
                    canEdit={canUpdate}
                    canDelete={canDelete}
                    onEdit={handleEdit}
                    onDelete={handleDeleteProject}
                    selectedItems={selectedItems}
                    onSelectItem={handleSelectItem}
                    hideActions={false}
                    customAction={() => (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleReopen(project.id || project._id)
                        }
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Reopen
                      </Button>
                    )}
                  />
                ))}
              </div>
            )}
          </Suspense>

          {projects.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto mb-4" />
              <p>No inactive projects found</p>
            </div>
          )}

          {projects.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={projects.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          )}
          <Suspense fallback={<TablePageSkeleton />}>
            {showForm && (
              <ProjectForm
                divisions={divisions}
                project={editingProject}
                customers={customers}
                onSubmit={handleSubmit}
                onCancel={closeForm}
              />
            )}
          </Suspense>

        </>
      )}
    </div>
  );
}
