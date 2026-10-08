import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Select from "react-select";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import CustomDatePicker from "../ui/CustomDatePicker";

const NewLogTime = ({
  isOpen,
  editingEntry,
  formData,
  projects,
  userProjectType,
  isAdmin,
  currentTotalHours,
  submitting,
  handleInputChange,
  handleSubmit,
  handleUpdate,
  handleCancel
}) => {
  if (!isOpen) return null;
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

  // Filter projects based on status and permissions
  let availableProjects = projects.filter(project =>
    (project.status === "processing" || project.status === "completed" || project.status === "reopen") &&
    (isAdmin || project.created_by === (user.created_by || user.id))
  );

  // Further filter by userProjectType if applicable
  if (userProjectType && !isAdmin) {
    availableProjects = availableProjects.filter(project => {
      if (Array.isArray(userProjectType)) {
        return userProjectType.includes(project.project_type);
      }
      return project.project_type === userProjectType;
    });
  }

   const getProjectDisplayName = (project) => {
    return project?.project_name || "Unnamed Project";
  };

  // Map to options for react-select
  const projectOptions = availableProjects.map(project => ({
    value: project._id || project.id,
     label: getProjectDisplayName(project) || project.project_name
  }));

  // Find the currently selected option
  const selectedOption = projectOptions.find(option => option.value === formData.project_id) || null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleCancel}
    >
      <div
        className="model-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="model-header">
          <h2 className="font-semibold">
            {editingEntry ? "Edit Time Entry" : "Log New Time"}
          </h2>
        </div>
        <form onSubmit={editingEntry ? handleUpdate : handleSubmit} onKeyDown={(e) => {
          if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
            e.preventDefault();
          }
        }} className="space-y-4">
          <div className="model-body">
            <div className="space-y-2">
              <Label htmlFor="project_id" className="text-sm font-medium">Project</Label>
              <Select
                id="project_id"
                options={projectOptions}
                value={selectedOption}
                onChange={(option) => handleInputChange("project_id", option ? option.value : "")}
                placeholder="Select a project..."
                isSearchable
                required
                className="text-sm"
                classNamePrefix="select"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: "hsl(var(--input))",
                    borderRadius: "calc(var(--radius) - 2px)",
                    minHeight: "2.5rem",
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999,
                  })
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">Date</Label>
              <CustomDatePicker
                id="date"
                value={formData.date}
                minDate={new Date().toISOString().split("T")[0]}
                onChange={(value) => handleInputChange("date", value)}
                required
                className="w-full h-10 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="text-sm font-medium">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange("start_time", e.target.value)}
                  required
                  className="w-full h-10 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-sm font-medium">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange("end_time", e.target.value)}
                  required
                  className="w-full h-10 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Hours</Label>
              <div className="flex items-center h-10 px-3 py-2 border border-gray-200 rounded-md bg-gray50-temp">
                <span className="font-medium text-sm">
                  {currentTotalHours > 0 ? `${currentTotalHours.toFixed(2)} hrs` : "--"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Work Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe the work performed..."
                rows={3}
                required
                className="w-full text-sm min-h-[80px] resize-none"
              />
            </div>
          </div>
          <div className="model-footer">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 text-sm"
              onClick={handleCancel}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {editingEntry ? "Update" : "Add Log"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLogTime;