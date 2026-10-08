import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import customReportService from "../services/customReportService";
import masterDataService from "../services/masterDataService";
import localApi from "../services/localApi";
import { UserService } from "../services/userservice";
import clientService from "../services/clientAddService";
import Swal from "sweetalert2";
import { hasPermission } from "../utils/hasPermission";

// Modular Components
import GeneralInfo from "../components/custom-reports/GeneralInfo";
import FilterCriteria from "../components/custom-reports/FilterCriteria";
import ReportFields from "../components/custom-reports/ReportFields";
import EmailReport from "../components/custom-reports/EmailReport";

const reportFieldsList = [
  { id: "project_name", label: "Project Name" },
  { id: "company_name", label: "Company Name" },
  { id: "status", label: "Status/Progress" },
  { id: "project_number", label: "Project ID" },
  { id: "docs", label: "Docs" },
  { id: "project_type_name", label: "Division" },
  { id: "install_date", label: "Install Date" },
  { id: "completion_date", label: "Completion Date" },
  { id: "material_cost", label: "Material Cost" },
  { id: "estimated_value", label: "Contract Value" },
  { id: "contact_name", label: "Contact Name" },
  //  { id: "estimate_number", label: "Estimate ID" },
  //   { id: "invoice_number", label: "Invoice ID" },
  // { id: "createdAt", label: "Created Date" },
  // { id: "total_amount", label: "Total Amount" },
  // { id: "amount_paid", label: "Paid" },
  // { id: "balance", label: "Balance" },
  // { id: "issue_date", label: "Issue Date" },
  // { id: "due_date", label: "Due Date" },
  // { id: "customer_po_number", label: "Customer PO Number" },
];

const statusOptionsMap = {
  Project: ["Open", "Processing", "Actively Working", "Cancelled", "Completed", "Reopen", "Lost"],
  Estimate: ["draft", "sent", "approved", "rejected", "expired"],
  Invoice: ["draft", "sent", "paid", "partial", "void"],
};

const AddCustomReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = currentUser?.role_type?.toLowerCase() === "admin";
  const perms = currentUser?.permissions || [];
  const canAdd = isAdmin || hasPermission(perms, "Reports", "add", "CustomReport");
  const canUpdate = isAdmin || hasPermission(perms, "Reports", "update", "CustomReport");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [divisions, setDivisions] = useState([]);
  const [users, setUsers] = useState([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  const [formData, setFormData] = useState({
    report_type: "Project",
    report_name: "",
    status: "Active",
    filters: [
      { field: "Status", condition: "=(equal)", value: [], operator: "AND" }
    ],
    selected_fields: ["project_name", "company_name", "status", "project_number"],
    interval: "Daily",
    schedule_time: "10:00",
    schedule_day: "",
    schedule_date: "",
    schedule_year: "",
    attachment_type: "Excel",
    target_users: [],
    email_subject: "",
    additional_emails: "",
    email_text: "",
  });

  const [fields, setFields] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [divData, userData, meData] = await Promise.all([
          masterDataService.getAll("divisions"),
          UserService.list(),
          localApi.getMe()
        ]);

        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const companyId = currentUser.role_type === "admin" ? currentUser.id : meData.created_by;

        const filteredDivs = (divData?.data || []).filter(d => {
          if (d.status !== "active") return false;
          const isSameCompany = String(d.created_by) === String(companyId);
          if (!isSameCompany) return false;
          if (currentUser.role_type?.toLowerCase() === "admin") return true;

          return currentUser.project_type
            ?.map(String)
            .includes(String(d.value));
        });

        setDivisions(filteredDivs);

        let allUsers = userData || [];
        try {
          const adminData = await clientService.getClientById(companyId);
          if (adminData) {
            const adminUser = {
              _id: adminData._id,
              full_name: adminData.firstName
                ? `${adminData.firstName} ${adminData.lastName || ''}`.trim()
                : adminData.companyName || 'Admin',
              email: adminData.email,
              role_type: 'admin'
            };
            if (!allUsers.find(u => u._id === adminUser._id)) {
              allUsers = [adminUser, ...allUsers];
            }
          }
        } catch (e) {
          // silently fail if admin fetch fails
        }
        setUsers(allUsers);

        let loadedSelected = [];
        if (id) {
          const report = await customReportService.getCustomReportById(id);
          setFormData(report);
          loadedSelected = report.selected_fields || [];
        } else {
          loadedSelected = formData.selected_fields || [];
        }

        const selected = [];
        const unselected = [];

        loadedSelected.forEach(fieldId => {
          const found = reportFieldsList.find(f => f.id === fieldId);
          if (found) selected.push(found);
        });

        reportFieldsList.forEach(f => {
          if (!loadedSelected.includes(f.id)) {
            unselected.push(f);
          }
        });

        setFields([...selected, ...unselected]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [id]);

  const handleAddFilter = () => {
    setFormData({
      ...formData,
      filters: [...formData.filters, { field: "Status", condition: "=(equal)", value: [], operator: "AND" }]
    });
  };

  const handleRemoveFilter = (index) => {
    const newFilters = formData.filters.filter((_, i) => i !== index);
    setFormData({ ...formData, filters: newFilters });
  };

  const handleFilterChange = (index, key, value) => {
    const newFilters = [...formData.filters];
    newFilters[index][key] = value;
    if (key === "field") {
      newFilters[index].value = [];
    }
    setFormData({ ...formData, filters: newFilters });
  };

  const handleFieldToggle = (fieldId) => {
    const isCurrentlySelected = formData.selected_fields.includes(fieldId);
    let newSelectedFields;

    if (isCurrentlySelected) {
      newSelectedFields = formData.selected_fields.filter(id => id !== fieldId);
    } else {
      newSelectedFields = [...formData.selected_fields, fieldId];
    }

    const sortedSelectedFields = fields
      .filter(f => newSelectedFields.includes(f.id))
      .map(f => f.id);

    setFormData({ ...formData, selected_fields: sortedSelectedFields });
  };

  const handleToggleAllFields = (checked) => {
    if (checked) {
      setFormData({ ...formData, selected_fields: fields.map(f => f.id) });
    } else {
      setFormData({ ...formData, selected_fields: [] });
    }
  };

  const handleFieldsReorder = (newFields) => {
    setFields(newFields);

    const sortedSelectedFields = newFields
      .filter(f => formData.selected_fields.includes(f.id))
      .map(f => f.id);

    setFormData(prev => ({ ...prev, selected_fields: sortedSelectedFields }));
  };

  const handleGeneralInfoChange = (field, value) => {
    if (field === "report_type") {
      const defaultSelected = value === "Project"
        ? ["project_name", "company_name", "status", "project_number"]
        : value === "Estimate"
          ? ["estimate_number", "company_name", "status", "total_amount"]
          : ["invoice_number", "project_name", "company_name", "contact_name", "status", "total_amount", "amount_paid", "balance", "due_date"];

      setFormData({
        ...formData,
        [field]: value,
        filters: [{ field: "Status", condition: "=(equal)", value: [], operator: "AND" }],
        selected_fields: defaultSelected
      });

      const selected = [];
      const unselected = [];

      defaultSelected.forEach(fieldId => {
        const found = reportFieldsList.find(f => f.id === fieldId);
        if (found) selected.push(found);
      });

      reportFieldsList.forEach(f => {
        if (!defaultSelected.includes(f.id)) {
          unselected.push(f);
        }
      });

      setFields([...selected, ...unselected]);
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.report_name?.trim()) {
      newErrors.report_name = "Report Name is required";
    }
    if (!formData.schedule_time) {
      newErrors.schedule_time = "Select Time is required";
    }
    if (formData.interval === "Weekly" && !formData.schedule_day) {
      newErrors.schedule_day = "Select Day is required";
    }
    if (formData.interval === "Monthly" && !formData.schedule_date) {
      newErrors.schedule_date = "Select Date is required";
    }
    if (formData.interval === "Yearly" && !formData.schedule_year) {
      newErrors.schedule_year = "Select Year is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const payload = { ...formData };
    if (payload.interval !== "Weekly") { delete payload.schedule_day; }
    if (payload.interval !== "Monthly") { delete payload.schedule_date; }
    if (payload.interval !== "Yearly") { delete payload.schedule_year; }

    try {
      setLoading(true);
      if (id) {
        await customReportService.updateCustomReport(id, payload);
        Swal.fire("Success", "Report updated successfully", "success");
      } else {
        await customReportService.createCustomReport(payload);
        Swal.fire("Success", "Report created successfully", "success");
      }
      navigate("/custom-report");
    } catch (error) {
      console.error("Error saving report:", error);
      Swal.fire("Error", "Failed to save report", "error");
    } finally {
      setLoading(false);
    }
  };

  // Block unauthorized access before rendering the form
  const hasAccess = id ? canUpdate : canAdd;
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 max-w-md">
          You do not have permission to {id ? "edit" : "create"} Custom Report. Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2  mx-auto space-y-6 bg-gray-50/50 dark:bg-transparent min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">{id ? "Edit" : "Add"} Custom Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage Custom Reports</p>
        </div>
        {/* <Button onClick={() => navigate("/custom-report")} variant="outline">
          Cancel
        </Button> */}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <GeneralInfo
          formData={formData}
          onChange={handleGeneralInfoChange}
          errors={errors}
        />

        <FilterCriteria
          filters={formData.filters}
          divisions={divisions}
          statusOptions={statusOptionsMap[formData.report_type] || []}
          onAdd={handleAddFilter}
          onRemove={handleRemoveFilter}
          onChange={handleFilterChange}
          isExpanded={isFilterExpanded}
          onToggle={() => setIsFilterExpanded(!isFilterExpanded)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ReportFields
              fields={fields}
              selectedFields={formData.selected_fields}
              onToggle={handleFieldToggle}
              onToggleAll={handleToggleAllFields}
              onReorder={handleFieldsReorder}
            />
          </div>

          <div className="lg:col-span-3">
            <EmailReport
              formData={formData}
              users={users}
              onChange={setFormData}
              errors={errors}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/custom-report")}
            className="px-8"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-10 text-white"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddCustomReport;
