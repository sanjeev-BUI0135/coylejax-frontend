import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Select from "react-select";
import { X, Save } from "lucide-react";
import FileUpload from "../../shared/FileUpload";
import CustomDatePicker from "../../ui/CustomDatePicker";
import api from "../../../services/masterDataService.js";
import localApi from "../../../services/localApi.js";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";
import { linkifyHtml, handlePasteLink } from "../../ui/renderTextWithLinks";

export default function SubProjectForm({ parentProject, customers, onSubmit, onCancel }) {
  const subProjectCount = Array.isArray(parentProject?.sub_projects) ? parentProject.sub_projects.length : 0;
  const subProjectNumber = parentProject?.project_number
    ? `${parentProject.project_number}-SUB${String(subProjectCount + 1).padStart(2, '0')}`
    : "SUB-PROJECT";

  const [divisions, setDivisions] = useState([]);
  const [projectcreations, setProjectcreations] = useState([]);
  const users = JSON.parse(localStorage.getItem("user") || "{}");
  const [me, setMe] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    project_number: subProjectNumber,
    sub_project_name: "",
    project_name: parentProject?.project_name ? `${parentProject.project_name} - ` : "Sub-Project - ",
    project_creation_type: parentProject?.project_creation_type || "",
    project_creation_type_name: parentProject?.project_creation_type_name || "",
    customer_ids: (parentProject?.customer_ids || []).map(c =>
      typeof c === 'string' ? c : (c._id || c.id)
    ),
    project_type: parentProject?.project_type || "",
    description: parentProject?.description || "",
    location: parentProject?.location || "",
    priority: parentProject?.priority || "medium",
    requirements: parentProject?.requirements || "",
    special_instructions: parentProject?.special_instructions || "",
    estimated_start_date: parentProject?.estimated_start_date
      ? new Date(parentProject.estimated_start_date).toISOString().split("T")[0]
      : "",
    estimated_end_date: parentProject?.estimated_end_date
      ? new Date(parentProject.estimated_end_date).toISOString().split("T")[0]
      : "",
    estimated_value: "",
    file_attachments: [],
    is_sub_project: true,
    parent_project_id: parentProject?._id || parentProject?.id
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === "sub_project_name" && parentProject?.project_name) {
        newData.project_name = `${parentProject.project_name} - ${value}`;
      }
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user) {
      alert("User not logged in!");
      return;
    }

    let createdBy;

    if (user.role_type === "admin") {
      createdBy = user._id || user.id;
    } else {
      createdBy = user.created_by;
    }

    if (!formData.customer_ids || formData.customer_ids.length === 0) {
      setErrors({ customer_ids: "Please select at least one contact." });
      return;
    }

    if (!createdBy) {
      alert("Unable to determine created_by");
      return;
    }

    const submitData = {
      ...formData,
      project_number: subProjectNumber,
      estimated_value: formData.estimated_value
        ? parseFloat(formData.estimated_value)
        : undefined,
      created_by: createdBy,
      user_initials: parentProject?.user_initials || ""
    };

    onSubmit(submitData);
  };


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

  useEffect(() => {
    loadDivisions();
    loadProjectCreations();
  }, []);
  const filterDivisions = divisions.filter((d => d.created_by === users.id || d.created_by === me.created_by && users.project_type?.includes(d.value)))
  const loadDivisions = async () => {
    try {
      const divisionsData = await api.getAll('divisions');
      const activeDivisions = (divisionsData.data || divisionsData || [])
        .filter(div => div.status === 'active')
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      setDivisions(activeDivisions);
    } catch (error) {
      console.error('Failed to load divisions:', error);
      setDivisions([]);
    }
  };
  const loadProjectCreations = async () => {
    try {
      const res = await api.getAll("project_creation_type");

      const active = (res.data || res || [])
        .filter((p) => p.status === "active")
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      setProjectcreations(active);
    } catch (err) {
      console.error("Failed to load project creation types", err);
      setProjectcreations([]);
    }
  };

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
          <CardTitle>Create Sub-Project</CardTitle>
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

            <div className="space-y-2 bg-blue-50 p-4 rounded-lg">
              <Label className="text-sm font-medium text-blue-900">Parent Project</Label>
              <p className="text-sm text-blue-700">
                <strong>Project Number:</strong> {parentProject?.project_number || "N/A"}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Project Name:</strong> {parentProject?.project_name || "N/A"}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Sub-Project Number (Auto-Generated)</Label>
              <Input
                value={subProjectNumber}
                readOnly
                className="bg-gray-100 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sub_project_name">
                Sub-Project Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sub_project_name"
                value={formData.sub_project_name}
                onChange={(e) => handleInputChange("sub_project_name", e.target.value)}
                placeholder="e.g., Classroom, Playground, Entry, Fence"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_name">Full Project Name (Auto-Generated)</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                readOnly
                className="bg-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label>Project Creation Type{!formData.project_creation_type && (
                <span className="text-red-500"> *</span>
              )}</Label>
              <Select
                isDisabled={!!formData.project_creation_type}
                options={projectcreations
                  .filter((p) => p.created_by === users.id || p.created_by === me.created_by)
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
                }}
                className="w-full"
                classNamePrefix="select"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_id">Contact<span className="text-red-500">*</span></Label>
              <Select
                isMulti
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.contact_name} - ${c.company_name || ""}`,
                }))}
                value={customers
                  .filter((c) => formData.customer_ids.includes(c.id))
                  .map((c) => ({
                    value: c.id,
                    label: `${c.contact_name} - ${c.company_name || ""}`,
                  }))}
                onChange={(selected) => {
                  handleInputChange(
                    "customer_ids",
                    selected.map((s) => s.value)
                  );
                  if (selected && selected.length > 0) {
                    setErrors((prev) => ({ ...prev, customer_ids: "" }));
                  }
                }}
                placeholder="Select one or more contacts"
                className="basic-multi-select w-full"
                classNamePrefix="select"
              />
              {errors.customer_ids && (
                <p className="text-sm text-red-500">{errors.customer_ids}</p>
              )}
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
                    filterDivisions
                      .filter((d) => d.value === formData.project_type)
                      .map((d) => ({ value: d.value, label: d.display_name }))[0] || null
                  }
                  onChange={(selected) =>
                    handleInputChange("project_type", selected?.value)
                  }
                  placeholder="Select division"
                  className="w-full"
                  classNamePrefix="select"
                />
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
                  value={[
                    { value: formData.priority, label: formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1) }
                  ]}
                  onChange={(selected) => handleInputChange("priority", selected.value)}
                  placeholder="Select priority"
                  className="w-full"
                  classNamePrefix="select"
                />
              </div>

            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Project Address</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="Project location/address"
              />
            </div>

            {!isServiceWorkOrder && (<div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Sub-project description"
                rows={3}
              />
            </div>)}

            {!isServiceWorkOrder && (<div className="space-y-2 relative z-10">
              <Label htmlFor="requirements">Scope of Work</Label>
              <SunEditor
                setContents={linkifyHtml(formData.requirements || "")}
                onChange={(content) => handleInputChange("requirements", content)}
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
                  height: "100px"
                }}
              />
            </div>)}

            {!isServiceWorkOrder && (<div className="space-y-2 relative z-10">
              <Label htmlFor="special_instructions">Notes</Label>
              <SunEditor
                setContents={linkifyHtml(formData.special_instructions || "")}
                onChange={(content) => handleInputChange("special_instructions", content)}
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
                  height: "100px"
                }}
              />
            </div>)}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_start_date">Estimated Start Date</Label>
                <CustomDatePicker
                  id="estimated_start_date"
                  minDate={new Date().toISOString().split("T")[0]}
                  value={formData.estimated_start_date}
                  onChange={(val) => handleInputChange("estimated_start_date", val)}
                  dateFormat="MM/dd/yyyy"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_end_date">Estimated End Date</Label>
                <CustomDatePicker
                  id="estimated_end_date"
                  label="Estimated End Date"
                  value={formData.estimated_end_date}
                  minDate={formData.estimated_start_date || new Date().toISOString().split("T")[0]}
                  onChange={(val) => handleInputChange("estimated_end_date", val)}
                  dateFormat="MM/dd/yyyy"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_value">Estimated Value</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_value}
                  onChange={(e) => handleInputChange("estimated_value", e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <FileUpload
              attachments={formData.file_attachments}
              onAttachmentsChange={(newAttachments) => handleInputChange('file_attachments', newAttachments)}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Create Sub-Project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}