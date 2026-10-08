import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Select from "react-select";
import { X, Save, Search } from "lucide-react";
import FileUpload from "../shared/FileUpload";
import CustomDatePicker from "../ui/CustomDatePicker";
import masterDataService from "../../services/masterDataService";

const stripHtml = (html) => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

import localApi from "../../services/localApi";
import { validateProjectForm } from "../../utils/projectValidation";
import { renderTextWithLinks, linkifyHtml, handlePasteLink } from "../ui/renderTextWithLinks";
import toast from "react-hot-toast";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";

export default function ProjectForm({
  project,
  customers,
  onSubmit,
  onCancel,
  awardedDate,
}) {
  const customerValidationRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [divisions, setDivisions] = useState([]);
  const [projectcreations, setProjectcreations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [me, setMe] = useState([]);
  const [formData, setFormData] = useState(
    project
      ? {
        ...project,
        special_instructions: project.special_instructions || "",
        customer_ids: project.customer_ids
          ? project.customer_ids.map((c) =>
            typeof c === "string" ? c : c._id || c.id
          )
          : [],
        estimated_start_date: project.estimated_start_date
          ? new Date(project.estimated_start_date).toISOString().split("T")[0]
          : "",
        estimated_end_date: project.estimated_end_date
          ? new Date(project.estimated_end_date).toISOString().split("T")[0]
          : "",
      }
      : {
        project_name: "",
        customer_ids: [],
        project_creation_type: "",
        proproject_creation_type_name: "",
        project_type: "",
        project_type_name: "",
        description: "",
        billing_address: "",
        location: "",
        priority: "medium",
        requirements: "",
        special_instructions: "",
        estimated_start_date: "",
        estimated_end_date: "",
        estimated_value: "",
        file_attachments: [],
      }
  );
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe();
        setMe(res);
      } catch (error) {
        console.log(error);
      }
    };
    fetchMe();
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  const handleInputChange = (field, value) => {
    if (field === "estimated_start_date") {
      const newStart = value;
      setFormData((prev) => {
        let newEnd = prev.estimated_end_date;
        if (newEnd && new Date(newEnd) < new Date(newStart)) {
          newEnd = newStart;
        }
        return {
          ...prev,
          estimated_start_date: newStart,
          estimated_end_date: newEnd,
        };
      });
      return;
    }

    if (field === "estimated_end_date") {
      const newEnd = value;
      setFormData((prev) => {
        if (prev.estimated_start_date && new Date(newEnd) < new Date(prev.estimated_start_date)) {
          return {
            ...prev,
            estimated_end_date: prev.estimated_start_date,
          };
        }
        return {
          ...prev,
          estimated_end_date: newEnd,
        };
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "customer_ids" && customerValidationRef.current) {
      customerValidationRef.current.setCustomValidity(
        value && value.length > 0 ? "" : "Please select at least one customer"
      );
    }
  };
  useEffect(() => {
    if (
      projectcreations.length > 0 &&
      !formData.project_creation_type
    ) {
      const defaultProject = projectcreations.find(
        (p) => p.value === "new_project"
      );

      if (defaultProject) {
        setFormData((prev) => ({
          ...prev,
          project_creation_type: defaultProject.value,
          project_creation_type_name: defaultProject.display_name,
        }));
      }
    }
  }, [projectcreations]);

  useEffect(() => {
    loadDivisions();
    loadProjectcreations();
    // if (!project?._id) {
    //   generateProjectNumber();
    // }
  }, []);

  useEffect(() => {
    if (project && !formData.billing_address && formData.customer_ids?.length > 0 && customers?.length > 0) {
      const customerId = formData.customer_ids[0];
      const customer = customers.find(c => (c.id || c._id) === customerId);
      if (customer) {
        const addr = [customer.address, customer.city, customer.state, customer.zip_code || customer.zip]
          .filter(Boolean)
          .join(", ");
        if (addr) {
          setFormData(prev => ({ ...prev, billing_address: addr }));
        }
      }
    }
  }, [project, customers]);

  const filterDivisions = divisions.filter(div => {
    if (div.status !== "active") return false;

    const companyId = me.role_type === "admin" ? me._id : me.created_by;
    return String(div.created_by) === String(companyId);
  })
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const loadDivisions = async () => {
    try {
      const divisionsData = await masterDataService.getAll("divisions");
      const activeDivisions = (divisionsData.data || divisionsData || [])
        .filter((div) => div.status === "active")
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setDivisions(activeDivisions);
    } catch (error) {
      console.error("Failed to load divisions:", error);
      setDivisions([]);
    }
  };
  const loadProjectcreations = async () => {
    try {
      const ProjectCreationData = await masterDataService.getAll('project_creation_type');
      const actionProjectCreation = (ProjectCreationData.data || ProjectCreationData || []).filter((div) => div.status === "active")
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setProjectcreations(actionProjectCreation)
    }
    catch (error) {
      console.error("Fail to load Project creation type", error);
      setProjectcreations([]);
    }
  }

  const isEditMode = !!project?._id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const validationErrors = validateProjectForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    setErrors({});

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const submitData = {
      ...formData,
      estimated_value: formData.estimated_value
        ? parseFloat(formData.estimated_value)
        : undefined,
      created_by: user.role_type === "admin" ? user._id || user.id : me.created_by,
    };
    try {
      const res = await onSubmit(submitData);
      if (res && typeof res === 'object' && Object.prototype.hasOwnProperty.call(res, 'ok')) {
        if (res.ok) {
          toast.success(isEditMode ? "Project updated successfully" : "Project created successfully");
          if (typeof onCancel === "function") onCancel();
        } else {
          toast.error(res.error || "Failed to save project");
        }
      }
    } catch (err) {
      console.error("ProjectForm submit error:", err);
      toast.error("Failed to save project");
    }
    finally {
      setIsSubmitting(false);
    }
  };

  const isQuickEstimateConversion = !!project?._quickEstimateData;

  const isServiceWorkOrder = formData.project_creation_type === "service_work_order";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between bg-blue-200 dark:bg-gray-900 rounded-t-xl">
          <CardTitle>
            {project ? "Edit Project" : "Create New Project"}
          </CardTitle>
          <Button variant="ghost" size="xsm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="max-h-[80vh] overflow-y-auto mt-2">
          <form onSubmit={handleSubmit} onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_number">Project Number</Label>
                <Input
                  id="project_number"
                  value={formData.project_number || ""}
                  onChange={(e) =>
                    handleInputChange("project_number", e.target.value)
                  }
                  disabled
                  className={
                    user.role_type !== "admin"
                      ? "bg-gray-100 cursor-not-allowed"
                      : ""
                  }
                  placeholder="Auto-generated project number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_name">
                  Project Name
                  {!formData.project_name && (
                    <span className="text-red-500"> *</span>
                  )}
                </Label>
                <Input
                  id="project_name"
                  value={formData.project_name}
                  onChange={(e) =>
                    handleInputChange("project_name", e.target.value)
                  }
                  placeholder="Enter project name"
                />
                {errors.project_name && (
                  <p className="text-sm text-red-500">
                    {errors.project_name}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label>Project Creation Type{!formData.project_creation_type && (
                  <span className="text-red-500"> *</span>
                )}</Label>
                <Select
                  isDisabled={isEditMode}
                  options={projectcreations
                    .filter((p) => {
                      const hasAccess =
                        p.created_by === user.id ||
                        p.created_by === me.created_by;

                      if (!hasAccess) return false;

                      // Quick estimate conversion -> only New Project
                      if (
                        isQuickEstimateConversion &&
                        p.value === "service_work_order"
                      ) {
                        return false;
                      }

                      return true;
                    })
                    .map((p) => ({
                      value: p.value,
                      label: p.display_name,
                    }))}
                  value={
                    formData.project_creation_type
                      ? {
                        value: formData.project_creation_type,
                        label:
                          formData.project_creation_type_name ||
                          projectcreations.find(
                            (p) => p.value === formData.project_creation_type
                          )?.display_name,
                      }
                      : null
                  }
                  onChange={(selected) => {
                    handleInputChange("project_creation_type", selected?.value);
                    handleInputChange("project_creation_type_name", selected?.label);
                    setErrors((prev) => ({ ...prev, project_creation_type: "" }));
                  }}
                  className={`w-full ${isEditMode ? "opacity-70 cursor-not-allowed" : ""}`}
                  classNamePrefix="select"
                  menuPosition="fixed"
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={document.body}
                />
                {errors.project_creation_type && (
                  <p className="text-sm text-red-600">
                    {errors.project_creation_type}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_id">
                  Contacts
                  {formData.customer_ids?.length === 0 && (
                    <span className="text-red-500"> *</span>
                  )}
                  {/* {formData.customer_ids?.length > 0 && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {formData.customer_ids.length} selected
                    </span>
                  )} */}
                </Label>

                <Select
                  options={customers
                    .filter(
                      (c) =>
                        c.created_by === user.id ||
                        c.created_by === me.created_by
                    )
                    .map((c) => ({
                      value: c.id || c._id,
                      label: c.company_name
                        ? `${c.contact_name} - ${c.company_name}`
                        : c.contact_name,
                    }))}

                  value={
                    customers
                      .filter(
                        (c) =>
                          (c.id || c._id) === formData.customer_ids?.[0]
                      )
                      .map((c) => ({
                        value: c.id || c._id,
                        label: c.company_name
                          ? `${c.contact_name} - ${c.company_name}`
                          : c.contact_name,
                      }))[0] || null
                  }

                  onChange={(selected) => {
                    handleInputChange(
                      "customer_ids",
                      selected ? [selected.value] : []
                    );

                    // Auto-fill billing address when a contact is selected
                    if (selected) {
                      const customer = customers.find(c => (c.id || c._id) === selected.value);
                      if (customer) {
                        const addr = [customer.address, customer.city, customer.state, customer.zip_code || customer.zip]
                          .filter(Boolean)
                          .join(", ");
                        handleInputChange("billing_address", addr);
                      }
                    } else {
                      handleInputChange("billing_address", "");
                    }

                    setErrors((prev) => ({
                      ...prev,
                      customer_ids: "",
                    }));
                  }}

                  className="w-full"
                  classNamePrefix="select"
                  placeholder="Select contact..."
                  menuPosition="fixed"
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={document.body}
                />

                {errors.customer_ids && (
                  <p className="text-sm text-red-600">
                    {errors.customer_ids}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_type">Division Type</Label>
                <Select
                  options={filterDivisions.map((d) => ({
                    value: d.value,
                    label: d.display_name,
                  }))}
                  value={
                    formData.project_type
                      ? {
                        value: formData.project_type,
                        label:
                          formData.project_type_name ||
                          filterDivisions.find(
                            (d) => d.value === formData.project_type
                          )?.display_name,
                      }
                      : null
                  }
                  onChange={(selected) => {
                    handleInputChange("project_type", selected?.value);
                    handleInputChange("project_type_name", selected?.label);
                    setErrors((prev) => ({ ...prev, project_type: "" }));
                  }}
                  className="w-full"
                  classNamePrefix="select"
                  menuPosition="fixed"
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={document.body}
                />
                {errors.project_type && (
                  <p className="text-sm text-red-600">
                    {errors.project_type}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                    { value: "urgent", label: "Urgent" },
                  ]}
                  value={
                    formData.priority
                      ? { value: formData.priority, label: formData.priority }
                      : null
                  }
                  onChange={(selected) =>
                    handleInputChange("priority", selected.value)
                  }
                  className="w-full"
                  classNamePrefix="select"
                  menuPosition="fixed"
                  styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="billing_address">
                  Billing Address
                </Label>
                <Input
                  id="billing_address"
                  value={formData.billing_address || ""}
                  onChange={(e) => handleInputChange("billing_address", e.target.value)}
                  placeholder="Billing address"
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Site Address
                  {!formData.location && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="location"
                  value={formData.location || ""}
                  onChange={(e) => { handleInputChange("location", e.target.value); setErrors((prev) => ({ ...prev, location: "" })); }}
                  placeholder="Project location/address"
                />
                {errors.location && (
                  <p className="text-sm text-red-500">
                    {errors.location}
                  </p>
                )}
              </div>
            </div>

            {!isServiceWorkOrder && (<div className="space-y-2">
              <Label htmlFor="description">
                Description
                {!formData.description && (
                  <span className="text-red-500"> *</span>
                )}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  handleInputChange("description", e.target.value);
                  setErrors((prev) => ({ ...prev, description: "" }));
                }}
                placeholder="Project description"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-500">
                  {errors.description}
                </p>
              )}
            </div>)}

            {!isServiceWorkOrder && (<div className="space-y-2">
              <Label htmlFor="requirements">
                Scope of Work
                {!formData.requirements && (
                  <span className="text-red-500"> *</span>
                )}
              </Label>
              <SunEditor
                setContents={formData.requirements || ""}
                onChange={(content) => {
                  handleInputChange("requirements", content);
                  setErrors((prev) => ({ ...prev, requirements: "" }));
                }}
                onClick={(e) => {
                  const target = e.target.closest('a');
                  if (target && target.href) {
                    window.open(target.href, '_blank', 'noopener,noreferrer');
                  }
                }}
                onPaste={handlePasteLink}
                setOptions={{
                  buttonList: [
                    ["undo", "redo", "bold", "underline", "italic", "strike", "link"]
                  ],
                  defaultTag: "div",
                  height: "80px",
                  resizingBar: false,
                  showPathLabel: false
                }}
              />
              {errors.requirements && (
                <p className="text-sm text-red-500">
                  {errors.requirements}
                </p>
              )}
            </div>)}

            {!isServiceWorkOrder && (<div className="space-y-2">
              <Label htmlFor="special_instructions">
                Notes
                {!formData.special_instructions && (
                  <span className="text-red-500"> *</span>
                )}
              </Label>
              <SunEditor
                setContents={linkifyHtml(formData.special_instructions || "")}
                onChange={(content) => {
                  handleInputChange("special_instructions", content);
                  setErrors((prev) => ({ ...prev, special_instructions: "" }));
                }}
                onClick={(e) => {
                  const target = e.target.closest('a');
                  if (target && target.href) {
                    window.open(target.href, '_blank', 'noopener,noreferrer');
                  }
                }}
                onPaste={handlePasteLink}
                setOptions={{
                  buttonList: [
                    ["undo", "redo", "bold", "underline", "italic", "strike", "link"]
                  ],
                  defaultTag: "div",
                  height: "80px",
                  resizingBar: false,
                  showPathLabel: false
                }}
              />
              {errors.special_instructions && (
                <p className="text-sm text-red-500">
                  {errors.special_instructions}
                </p>
              )}
            </div>)}
            {/* 
            {isEditMode && (
              <div className="space-y-2">
                <Label htmlFor="awarded_date">Awarded Date</Label>
                <Input
                  id="awarded_date"
                  type="date"
                  value={
                    awardedDate
                      ? new Date(awardedDate).toISOString().split("T")[0]
                      : ""
                  }
                  readOnly
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
            )} */}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_start_date">
                  Estimated Start Date
                  {!formData.estimated_start_date && (
                    <span className="text-red-500"> *</span>
                  )}
                </Label>
                <CustomDatePicker
                  id="estimated_start_date"
                  minDate={todayStr}
                  maxDate={formData.estimated_end_date || undefined}
                  value={formData.estimated_start_date}
                  onChange={(val) => {
                    handleInputChange("estimated_start_date", val);
                    setErrors((prev) => ({ ...prev, estimated_start_date: "" }));
                  }}
                  dateFormat="MM/dd/yyyy"

                />
                {errors.estimated_start_date && (
                  <p className="text-sm text-red-500">
                    {errors.estimated_start_date}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_end_date">Estimated End Date
                  {!formData.estimated_end_date && (
                    <span className="text-red-500"> *</span>
                  )}
                </Label>
                <CustomDatePicker
                  id="estimated_end_date"
                  minDate={formData.estimated_start_date || todayStr}
                  value={formData.estimated_end_date}
                  onChange={(val) => {
                    handleInputChange("estimated_end_date", val);
                    setErrors((prev) => ({ ...prev, estimated_end_date: "" }));
                  }}
                  dateFormat="MM/dd/yyyy"
                />
                {errors.estimated_end_date && (
                  <p className="text-sm text-red-500">
                    {errors.estimated_end_date}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_value">Estimated Value</Label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <Input
                    id="estimated_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimated_value}
                    onChange={(e) => {
                      handleInputChange("estimated_value", e.target.value);
                      setErrors((prev) => ({ ...prev, estimated_value: "" }));
                    }}
                    placeholder="0.0"
                    className="pl-7"
                  />
                </div>
                {errors.estimated_value && (
                  <p className="text-sm text-red-500">
                    {errors.estimated_value}
                  </p>
                )}
              </div>
            </div>

            <FileUpload
              attachments={formData.file_attachments}
              onAttachmentsChange={(files) => {
                const updated = files.map(file => ({
                  ...file,
                  uploaded_by:
                    file.uploaded_by ||
                    user?.full_name ||
                    user?.name ||
                    user?.email,

                  uploaded_by_id: file.uploaded_by_id || user?._id,
                  uploaded_by_model:
                    file.uploaded_by_model ||
                    (user?.role_type === "admin" ? "Client" : "User"),

                  createdAt: file.createdAt || new Date()
                }));

                handleInputChange("file_attachments", updated);
              }}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting
                  ? "Saving..."
                  : project
                    ? "Update Project"
                    : "Create Project"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
