import React, { useState, useEffect } from "react";
import { LaborEntry } from "@/api/entities";
import { Project } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, Filter } from "lucide-react";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, parse, addDays } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportLaborToPdf, exportLaborToCsv } from "@/api/functions";
import { UilPlusCircle, UilTrash, UilEdit } from '@iconscout/react-unicons';
import TimeEntryDashboard from '../components/dashboard/TimeEntryDashboard';
import HistoryTooltip from "./HistoryTooltip";
import Swal from 'sweetalert2';
import TopProjectsHoursCard from "../components/timeEntry/TopProjectsHoursCard";
import WeeklyEntriesCard from "../components/timeEntry/WeeklyEntriesCard";
import NewLogTime from "../components/timeEntry/NewLogTime";
import TablePageSkeleton from "../components/ui/tableskeleton";
import { buildPermissionMap } from "@/utils/buildPermissionMap";
import { formatDateUS, formatDateUTC } from "../utils/formatdate";
import TimeEntriesTable from "../components/timeEntry/TimeEntriesTable";
import { Tabs, TabsList, TabsTrigger, TabsContent, } from "@/components/ui/tabs";

const VITE_API_BASE = import.meta.env.VITE_API_BASE;

const getEmployeeName = (entry, usersMap = {}) => {

  // direct employee name
  if (entry.employee_name) {
    return entry.employee_name;
  }

  // populated employee object
  if (
    typeof entry.employee_id === "object" &&
    entry.employee_id !== null &&
    entry.employee_id.full_name
  ) {
    return (
      entry.employee_id.full_name ||
      entry.employee_id.firstName ||
      entry.employee_id.username ||
      "Unknown Employee"
    );
  }

  // employee id lookup (handles ObjectId + string)
  const employeeId =
    typeof entry.employee_id === "object"
      ? entry.employee_id?._id?.toString?.() ||
      entry.employee_id?.toString?.()
      : entry.employee_id?.toString?.();

  if (employeeId && usersMap[employeeId]) {
    return usersMap[employeeId];
  }

  // fallback created_by object
  if (
    typeof entry.created_by === "object" &&
    entry.created_by !== null
  ) {
    return (
      entry.created_by.full_name ||
      entry.created_by.name ||
      "Unknown Employee"
    );
  }

  // fallback created_by string
  const createdById =
    typeof entry.created_by === "object"
      ? entry.created_by?._id?.toString?.() ||
      entry.created_by?.toString?.()
      : entry.created_by?.toString?.();

  if (createdById && usersMap[createdById]) {
    return usersMap[createdById];
  }

  return "Unknown Employee";
};

const normalizeName = (name) =>
  (name || '').toString().trim().toLowerCase();


const TimeEntry = () => {
  const [user, setUser] = useState(null);
  const [usersMap, setUsersMap] = useState({});
  const [userProjectType, setUserProjectType] = useState("");
  const [projects, setProjects] = useState([])
  const [allProjects, setAllProjects] = useState([]);
  const [laborEntries, setLaborEntries] = useState([]);
  const [allLaborEntries, setAllLaborEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [userpermission, setUserpermission] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const timeEntryPerms = buildPermissionMap(userpermission.permissions, "Time Entry");
  const { view: canView, add: canAdd, update: canUpdate, delete: canDelete } = timeEntryPerms.module;
  const showActions = (canUpdate && timeEntryPerms.widgets.MyTimeEntries?.update) ||
    (canDelete && timeEntryPerms.widgets.MyTimeEntries?.delete) ||
    timeEntryPerms.widgets.EntryHistory?.view;
  const [activeTab, setActiveTab] = useState(() => {
    if (timeEntryPerms.widgets.Overview?.view) return "overview";
    if (timeEntryPerms.widgets.MyTimeEntries?.view) return "entries";
    return "overview";
  });
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingEntry, setEditingEntry] = useState(null);
  const [weekSummary1, setWeekSummary1] = useState({ entries: [] });
  const [loading1, setLoading1] = useState(true);
  const [weekSummary, setWeekSummary] = useState({ entries: [] });
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterProjectType, setFilterProjectType] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterDescription, setFilterDescription] = useState("");
  const [formData, setFormData] = useState({
    project_id: "",
    date: new Date().toISOString().split('T')[0],
    start_time: "",
    end_time: "",
    description: "",
  });
  const [projectSearchTerm, setProjectSearchTerm] = useState("");
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const filterLaborEntries = (entries) => {
    if (!entries || !Array.isArray(entries)) return [];

    return entries.filter(entry => {
      if (!entry) return false;

      const project = projects.find(p =>
        p._id === entry.project_id || p.id === entry.project_id
      );

      const employeeName = getEmployeeName(entry, usersMap);

      const projectType = project?.project_type_name || project?.project_type || project?.type || 'Not specified';
      const projectName = project?.project_name || 'Unknown Project';
      const entryDate = entry.date
        ? format(new Date(entry.date), 'yyyy-MM-dd')
        : '';

      if (
        filterEmployee &&
        filterEmployee !== 'all' &&
        normalizeName(employeeName) !== normalizeName(filterEmployee)
      ) {
        return false;
      }

      if (filterProjectType && filterProjectType !== "all" && projectType !== filterProjectType) {
        return false;
      }

      if (filterProject && filterProject !== "all" && projectName !== filterProject) {
        return false;
      }

      if (filterDate && entryDate !== filterDate) {
        return false;
      }

      if (
        filterDescription &&
        entry.description &&
        !entry.description.toLowerCase().includes(filterDescription.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  };


  const filteredEntries = filterLaborEntries(laborEntries);
  const currentEntries = filteredEntries.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const filteredAllEntries = filterLaborEntries(allLaborEntries);

  const currentAllEntries = filteredAllEntries.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const totalAllPages = Math.ceil(
    filteredAllEntries.length / itemsPerPage
  );
  // Utility functions
  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startTotalMin = startHour * 60 + startMin;
    const endTotalMin = endHour * 60 + endMin;
    let diffMin = endTotalMin - startTotalMin;
    if (diffMin < 0) diffMin += 24 * 60;
    return diffMin / 60;
  };

  const currentTotalHours = calculateHours(formData.start_time, formData.end_time);
  
  const clearFilters = () => {
    setFilterEmployee("");
    setFilterProjectType("");
    setFilterDate("");
    setFilterProject("");
    setFilterDescription("");
    setCurrentPage(1);
  };

  // Data loading
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_BASE}/top-projects-hours`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setWeekSummary1({ entries: data.projects || [] });
        setLoading1(false);
      })
      .catch((err) => {
        console.error("Error fetching top project hours:", err);
        setWeekSummary1({ entries: [] });
        setLoading1(false);
      });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_BASE}/week-entries`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setWeekSummary({ entries: data.entries || data.weekEntries || [] });
      })
      .catch((err) => {
        console.error("Error fetching week entries:", err);
        setWeekSummary({ entries: [] });
      });
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const currentUser = await User.me();
      const allUsers = await User.list();

      const map = {};
      allUsers.forEach(u => {
        map[u._id || u.id] = u.full_name;
      });

      setUsersMap(map);
      setUser(currentUser);

      const isAdmin = currentUser.role_type === 'admin';

      setIsAdmin(isAdmin);

      const userProjectTypes = Array.isArray(currentUser.project_type)
        ? currentUser.project_type
        : currentUser.project_type
          ? [currentUser.project_type]
          : [];

      setUserProjectType(userProjectTypes);
      const projectsResponse = await Project.list('-createdAt');
      const allProjects = Array.isArray(projectsResponse) ? projectsResponse : (projectsResponse.data || []);
      let filteredProjects = allProjects;

      if (!isAdmin && userProjectTypes.length > 0) {
        filteredProjects = allProjects.filter(project =>
          userProjectTypes.includes(project.project_type)
        );
      }

      setProjects(filteredProjects);
      setAllProjects(allProjects);

      let entries = [];

      try {
        const response = await fetch(`${VITE_API_BASE}/time-entry`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Fetch failed');

        const data = await response.json();

        const allEntries = data?.entries?.data || [];
        entries = allEntries.filter(entry => {

          const employeeId =
            typeof entry.employee_id === "object"
              ? entry.employee_id?._id
              : entry.employee_id;

          return (
            employeeId === currentUser._id ||
            employeeId === currentUser.id
          );
        });

        // All Time Entries -> all data
        if (isAdmin || currentUser.allDataVisible === true) {
          setAllLaborEntries(allEntries);
        } else {
          setAllLaborEntries([]);
        }

      } catch (err) {
        console.error('Entry fetch error:', err);

        entries = await LaborEntry.filter(
          { employee_id: currentUser._id },
          '-date'
        );

        setAllLaborEntries([]);
      }

      setLaborEntries(entries);

    } catch (error) {
      console.error('Error loading data:', error);
      setProjects([]);
      setLaborEntries([]);
    } finally {
      setLoading(false);
    }
  };


  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEdit = (entry) => {
    setFormData({
      project_id: entry.project_id,
      date: entry.date.split('T')[0],
      start_time: entry.start_time,
      end_time: entry.end_time,
      description: entry.description,
    });
    setEditingEntry(entry);
    setIsOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const totalHours = calculateHours(formData.start_time, formData.end_time);
      if (totalHours <= 0) {
        alert("Please enter valid start and end times.");
        return;
      }

      const entryData = {
        ...formData,
        employee_id: user._id,
        total_hours: totalHours,
        rate_per_hour: user.hourly_rate || 0,
        total_cost: totalHours * (user.hourly_rate || 0)
      };

      if (editingEntry) {
        await LaborEntry.update(editingEntry._id, entryData);
      } else {
        await LaborEntry.create(entryData);
      }

      setFormData({
        project_id: "",
        date: new Date().toISOString().split('T')[0],
        start_time: "",
        end_time: "",
        description: "",
      });

      setEditingEntry(null);
      setIsOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving time entry:", error);
      alert("Failed to save time entry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (!editingEntry) return;
    try {
      const API_BASE = import.meta.env.VITE_API_BASE;
      const token = localStorage.getItem('token');
      const changes = [];
      if (formData.project_id !== editingEntry.project_id) {
        const oldProject = projects.find(p => p._id === editingEntry.project_id)?.project_name || 'Unknown Project';
        const newProject = projects.find(p => p._id === formData.project_id)?.project_name || 'Unknown Project';
        changes.push({ field: 'project', from: oldProject, to: newProject });
      }
      const editingDate = editingEntry.date.includes('T')
        ? editingEntry.date.split('T')[0]
        : editingEntry.date;
      if (formData.date !== editingDate) {
        changes.push({ field: 'date', from: editingDate, to: formData.date });
      }
      if (formData.start_time !== editingEntry.start_time) {
        changes.push({ field: 'start_time', from: editingEntry.start_time || 'Not set', to: formData.start_time });
      }
      if (formData.end_time !== editingEntry.end_time) {
        changes.push({ field: 'end_time', from: editingEntry.end_time || 'Not set', to: formData.end_time });
      }
      if (formData.description !== editingEntry.description) {
        changes.push({
          field: 'description',
          from: editingEntry.description || 'Empty',
          to: formData.description || 'Empty'
        });
      }
      const response = await fetch(`${API_BASE}/laborentrys/${editingEntry._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          total_hours: calculateHours(formData.start_time, formData.end_time)
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update entry');
      }
      await Swal.fire({
        title: 'Updated!',
        text: 'Labor entry has been updated successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      setIsOpen(false);
      setEditingEntry(null);
      setFormData({
        project_id: '',
        date: '',
        start_time: '',
        end_time: '',
        description: ''
      });
      await loadData();
    } catch (error) {
      console.error('Update error:', error);
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Error updating labor entry',
        icon: 'error',
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }
    try {
      const response = await fetch(`${VITE_API_BASE}/laborentrys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete entry');
      }
      await Swal.fire({
        title: 'Deleted!',
        text: 'Labor entry has been deleted successfully.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        timer: 2000,
        timerProgressBar: true
      });
      await loadData();

    } catch (error) {
      console.error('Delete error:', error);
      await Swal.fire({
        title: 'Error!',
        text: error.message || 'Error deleting labor entry',
        icon: 'error',
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setEditingEntry(null);
    setFormData({
      project_id: '',
      date: '',
      start_time: '',
      end_time: '',
      description: ''
    });
    setSubmitting(false);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const getProjectDisplayName = (project) => {
    return project?.project_name || "Unnamed Project";
  };

  const handleExport = async (formatType, entries, title, exportType = 'all_entries') => {
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      Swal.fire({
        title: 'No Data',
        text: 'No data available to export.',
        icon: 'warning',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setExporting(true);
    try {
      const enhancedEntries = entries.map((entry) => {
        let projectName = 'Unknown Project';
        let project_type = 'Unknown Type';

        // Enhanced employee_name logic for all user types
        const employee_name = entry.employee_name || entry.employeeName || entry.employee_id?.full_name || entry.employee_id?.firstName ||
          usersMap[
          typeof entry.employee_id === "object"
            ? entry.employee_id?._id
            : entry.employee_id
          ] ||
          "Unknown Employee";

        // Enhanced project lookup with better fallbacks
        const availableProjects = activeTab === "allEntries" ? allProjects : projects;
        const project = availableProjects.find(p =>
          p._id === entry.project_id ||
          p.id === entry.project_id ||
          p.projectId === entry.project_id
        );

        if (project) {
          projectName = getProjectDisplayName(project) || 'Unknown Project';
          project_type =  project.project_type_name || project.project_type || project.type || "Unknown Type";
        }
        else if (entry.project) {
          projectName = getProjectDisplayName(entry.project);
          project_type = entry.project_type || entry.project?.project_type || 'Unknown Type';
        } else if (weekSummary1.entries && weekSummary1.entries.length > 0) {
          const projectFromSummary = weekSummary1.entries.find(p =>
            p.projectId === entry.project_id ||
            p._id === entry.project_id ||
            p.id === entry.project_id
          );
          if (projectFromSummary?.projectName) {
            projectName = projectFromSummary.projectName;
            project_type = projectFromSummary.project_type || 'Unknown Type';
          }
        } else if (entry.project) {
          projectName = getProjectDisplayName(entry.project);
          project_type = entry.project.project_type || entry.project.type || 'Unknown Type';
        }

        return {
          ...entry,
          date: entry.date ? formatDateUTC(entry.date) : "N/A",
          employee_name: employee_name,
          projectName: projectName,
          project_type: project_type,
          id: entry._id || entry.id || entry.entryId,
          total_hours: entry.total_hours || calculateHours(entry.start_time, entry.end_time) || 0,
          work_description: entry.description || entry.work_description || 'No description'
        };
      });


      const entry_ids = enhancedEntries.map((e, index) => {
        return e?.id || e?._id || e?.entryId || `entry-${index}`;
      }).filter(Boolean);

      let blob;
      const exportOptions = {
        entry_ids,
        report_title: title,
        entries_data: enhancedEntries,
        export_type: exportType
        // Remove include_fields to let the export functions handle the data naturally
      };

      if (formatType === 'pdf') {
        blob = await exportLaborToPdf(exportOptions);
      } else {
        blob = await exportLaborToCsv(exportOptions);
      }

      if (!blob || blob.size === 0) {
        throw new Error('Empty export data received from server');
      }

      const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_${format(new Date(), 'yyyy-MM-dd')}.${formatType}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      Swal.fire({
        title: 'Exported!',
        text: `${title} has been exported successfully as ${formatType.toUpperCase()}.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error("Export failed", error);
      Swal.fire({
        title: 'Export Failed',
        text: `Failed to export data: ${error.message}`,
        icon: 'error',
        confirmButtonColor: '#d33',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportSummary = () => {
    const topProject = weekSummary1.entries[0] || { totalHours: 0, project_name: "No projects" };
    const lowestProject = weekSummary1.entries[weekSummary1.entries.length - 1] || { totalHours: 0, project_name: "No projects" };

    const calculatedStats = {
      totalHours: laborEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0),
      daysWorked: new Set(laborEntries.map(entry => entry.date)).size,
      weekEntries: weekSummary.entries.length,
      assignedProjects: projects.length,
      topProjectHours: topProject,
      lowestProjectHours: lowestProject
    };
    calculatedStats.avgHoursDay = calculatedStats.daysWorked > 0
      ? calculatedStats.totalHours / calculatedStats.daysWorked
      : 0;

    const headers = ["Metric", "Value", "Description", "Export Date"];
    const summaryData = [
      ["Total Hours", calculatedStats.totalHours.toFixed(2), "Total hours worked", new Date().toLocaleDateString()],
      ["Days Worked", calculatedStats.daysWorked.toString(), "Total days worked", new Date().toLocaleDateString()],
      ["Average Hours/Day", calculatedStats.avgHoursDay.toFixed(2), "Average hours per day", new Date().toLocaleDateString()],
      ["This Week's Entries", calculatedStats.weekEntries.toString(), "Entries this week", new Date().toLocaleDateString()],
      ["Assigned Projects", calculatedStats.assignedProjects.toString(), "Projects assigned", new Date().toLocaleDateString()],
      ["Top Project Hours", calculatedStats.topProjectHours.totalHours?.toFixed(2) || "0", `Top project: ${calculatedStats.topProjectHours.project_name || "No projects"}`, new Date().toLocaleDateString()],
      ["Lowest Project Hours", calculatedStats.lowestProjectHours.totalHours?.toFixed(2) || "0", `Lowest project: ${calculatedStats.lowestProjectHours.project_name || "No projects"}`, new Date().toLocaleDateString()],
      ["Top Assigned Hours", calculatedStats.topProjectHours.totalHours?.toFixed(2) || "0", "Top assigned hours", new Date().toLocaleDateString()]
    ];

    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '';
      const stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    const csvRows = summaryData.map(row => row.map(escapeCsvField).join(','));
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `TimeEntry_Dashboard_Summary_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="md:<div>">
      <div>
        <div className="mb-6 md:mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-xl md:text-2xl md:text-3xl font-bold text-gray-900temp">Time Entry</h1>
            <p className="text-gray-600temp mt-1 text-sm md:text-base">
              Welcome {user?.full_name}! Log your work hours here.
            </p>
          </div>
          {timeEntryPerms.widgets.ExportButton?.view && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[10px] px-1.5 py-0.5 sm:text-xs sm:px-2 sm:py-1 md:text-sm md:px-3 md:py-2"
                  disabled={exporting}
                  onClick={() => {
                    if (activeTab === "overview") {
                      Swal.fire({
                        title: 'Exported!',
                        text: 'Preparing your dashboard summary for download...',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                      });
                      handleExportSummary();
                    }
                  }}
                >
                  <Download className="w-2.5 h-2.5 mr-0.5 sm:w-3 sm:h-3 sm:mr-1" />
                  Export
                  {activeTab === "overview" ? null : <ChevronDown className="w-2.5 h-2.5 ml-0.5 sm:w-3 sm:h-3 sm:ml-1" />}
                  {exporting && "..."}
                </Button>
              </DropdownMenuTrigger>
              {activeTab !== "overview" && timeEntryPerms.widgets.ExportButton?.view && (
                <DropdownMenuContent align="end" className="text-xs sm:text-sm">
                  <DropdownMenuItem
                    className="text-xs sm:text-sm"
                    onClick={() =>
                      handleExport(
                        "pdf",
                        activeTab === "allEntries"
                          ? allLaborEntries
                          : laborEntries,
                        activeTab === "allEntries"
                          ? "All Time Entries"
                          : "My Time Entries",
                        "all_entries"
                      )
                    }
                    disabled={
                      exporting ||
                      (activeTab === "allEntries"
                        ? allLaborEntries.length === 0
                        : laborEntries.length === 0)
                    }
                  >
                    {exporting ? "Exporting..." : "Export as PDF"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs sm:text-sm"
                    onClick={() =>
                      handleExport(
                        "csv",
                        activeTab === "allEntries"
                          ? allLaborEntries
                          : laborEntries,
                        activeTab === "allEntries"
                          ? "All Time Entries"
                          : "My Time Entries",
                        "all_entries"
                      )
                    }
                    disabled={
                      exporting ||
                      (activeTab === "allEntries"
                        ? allLaborEntries.length === 0
                        : laborEntries.length === 0)
                    }
                  >
                    {exporting ? "Exporting..." : "Export as CSV"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="flex justify-center w-full bg-[#dde8f7] dark:bg-gray-800 rounded-xl h-auto p-1">

            {timeEntryPerms.widgets.Overview?.view && (
              <TabsTrigger
                value="overview"
                className="text-sm font-medium px-4 py-2 rounded data-[state=active]:bg-white data-[state=active]:text-black"
              >
                Overview
              </TabsTrigger>
            )}

            {timeEntryPerms.widgets.MyTimeEntries?.view && (
              <TabsTrigger
                value="entries"
                className="text-sm font-medium px-3 py-2 rounded data-[state=active]:bg-white data-[state=active]:text-black"
              >
                My Time Entries ({laborEntries.length})
              </TabsTrigger>
            )}

            {(isAdmin || user?.allDataVisible === true) && (
              <TabsTrigger
                value="allEntries"
                className="text-sm font-medium px-3 py-2 rounded data-[state=active]:bg-white data-[state=active]:text-black"
              >
                All Time Entries ({allLaborEntries.length})
              </TabsTrigger>
            )}
          </TabsList>

          <div className="py-6">

            <TabsContent value="overview">
              <div className="space-y-4">
                <TimeEntryDashboard timeEntryPerms={timeEntryPerms} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {timeEntryPerms.widgets.TopProjectsHoursList?.view && (
                    <TopProjectsHoursCard
                      weekSummary1={weekSummary1}
                      loading1={loading1}
                      exporting={exporting}
                      onExport={handleExport}
                      projects={projects}
                    />
                  )}

                  {timeEntryPerms.widgets.WeeklyEntriesList?.view && (
                    <WeeklyEntriesCard
                      weekSummary={weekSummary}
                      exporting={exporting}
                      onExport={handleExport}
                      projects={projects}
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="entries">
              <TimeEntriesTable
                title="My Time Entries"
                entries={laborEntries}
                activeTab={activeTab}
                currentEntries={currentEntries}
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                itemsPerPage={itemsPerPage}
                handleItemsPerPageChange={handleItemsPerPageChange}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                filterEmployee={filterEmployee}
                setFilterEmployee={setFilterEmployee}
                filterProjectType={filterProjectType}
                setFilterProjectType={setFilterProjectType}
                filterProject={filterProject}
                setFilterProject={setFilterProject}
                filterDate={filterDate}
                setFilterDate={setFilterDate}
                filterDescription={filterDescription}
                setFilterDescription={setFilterDescription}
                clearFilters={clearFilters}
                usersMap={usersMap}
                projects={projects}
                getEmployeeName={getEmployeeName}
                getProjectDisplayName={getProjectDisplayName}
                calculateHours={calculateHours}
                canAdd={canAdd}
                canUpdate={canUpdate}
                canDelete={canDelete}
                showActions={showActions}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                setIsOpen={setIsOpen}
                timeEntryPerms={timeEntryPerms}
                isAdmin={isAdmin}
                user={user}
              />
            </TabsContent>

            {(isAdmin || user?.allDataVisible === true) && (
              <TabsContent value="allEntries">
                <TimeEntriesTable
                  title="All Time Entries"
                  entries={allLaborEntries}
                  activeTab={activeTab}
                  currentEntries={currentAllEntries}
                  totalPages={totalAllPages}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  handleItemsPerPageChange={handleItemsPerPageChange}
                  showFilters={showFilters}
                  setShowFilters={setShowFilters}
                  filterEmployee={filterEmployee}
                  setFilterEmployee={setFilterEmployee}
                  filterProjectType={filterProjectType}
                  setFilterProjectType={setFilterProjectType}
                  filterProject={filterProject}
                  setFilterProject={setFilterProject}
                  filterDate={filterDate}
                  setFilterDate={setFilterDate}
                  filterDescription={filterDescription}
                  setFilterDescription={setFilterDescription}
                  clearFilters={clearFilters}
                  usersMap={usersMap}
                  projects={allProjects}
                  getEmployeeName={getEmployeeName}
                  getProjectDisplayName={getProjectDisplayName}
                  calculateHours={calculateHours}
                  canAdd={canAdd}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  showActions={showActions}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  setIsOpen={setIsOpen}
                  timeEntryPerms={timeEntryPerms}
                  isAdmin={isAdmin}
                  user={user}
                />
              </TabsContent>
            )}

          </div>
        </Tabs>
      </div>

      <NewLogTime
        isOpen={isOpen}
        editingEntry={editingEntry}
        formData={formData}
        projectSearchTerm={projectSearchTerm}
        setProjectSearchTerm={setProjectSearchTerm}
        projects={projects}
        userProjectType={userProjectType}
        isAdmin={isAdmin}
        currentTotalHours={currentTotalHours}
        submitting={submitting}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        handleUpdate={handleUpdate}
        handleCancel={handleCancel}
      />
    </div >
  );
};

export default TimeEntry;