// ==================validate project form ===================

export const validateProjectForm = (formData) => {
  const errors = {};

  if (!formData.project_name?.trim()) {
    errors.project_name = "Project name is required";
  }

  if (!formData.customer_ids || formData.customer_ids.length === 0) {
    errors.customer_ids = "Please select at least one customer";
  }

   if (!formData.project_creation_type || formData.project_creation_type.length === 0) {
    errors.project_creation_type = "Please select at least one customer";
  }

  if (!formData.project_type) {
    errors.project_type = "Please select a division type";
  }

  if (!formData.location?.trim()) {
    errors.location = "Location is required";
  }

  if (
  formData.project_creation_type !== "service_work_order"
) {

  if (!formData.description?.trim()) {
    errors.description = "Description is required";
  }

  if (!formData.requirements?.trim()) {
    errors.requirements = "Scope of work is required";
  }

  if (!formData.special_instructions?.trim()) {
    errors.special_instructions = "Notes are required";
  }
}

  if (!formData.estimated_start_date) {
    errors.estimated_start_date = "Estimated start date is required";
  }

  if (!formData.estimated_end_date) {
    errors.estimated_end_date = "Estimated end date is required";
  }

  if (
    formData.estimated_start_date &&
    formData.estimated_end_date &&
    new Date(formData.estimated_end_date) <
      new Date(formData.estimated_start_date)
  ) {
    errors.estimated_end_date =
      "End date cannot be before start date";
  }

  if (
    formData.estimated_value === "" ||
    formData.estimated_value === null ||
    formData.estimated_value === undefined
  ) {
    errors.estimated_value = "Estimated value is required";
  }

  return errors;
};

// ==============masterData validation=================

export const validateMasterDataForm = ({
  formData,
  items = [],
  editingItem = null,
  showHourlyRate = false,
}) => {
  const errors = {};

  // Display Name
  if (!formData.display_name?.trim()) {
    errors.display_name = "Display name is required";
  } else if (formData.display_name.trim().length < 2) {
    errors.display_name = "Display name must be at least 2 characters";
  } else if (formData.display_name.trim().length > 100) {
    errors.display_name = "Display name must not exceed 100 characters";
  }

  // Value
  if (!formData.value?.trim()) {
    errors.value = "Internal value is required";
  } else if (formData.value.trim().length < 2) {
    errors.value = "Internal value must be at least 2 characters";
  } else if (formData.value.trim().length > 100) {
    errors.value = "Internal value must not exceed 100 characters";
  } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.value.trim())) {
    errors.value =
      "Internal value can only contain letters, numbers, hyphens, and underscores";
  }

  // Duplicate check
  const duplicate = items.find(
    (item) =>
      item.value === formData.value?.trim() &&
      (!editingItem || item._id !== editingItem._id)
  );

  if (duplicate) {
    errors.value = "This internal value already exists";
  }

  // Sort Order
  if (
    formData.sort_order === "" ||
    formData.sort_order === null ||
    formData.sort_order === undefined
  ) {
    errors.sort_order = "Sort order is required";
  } else if (isNaN(formData.sort_order)) {
    errors.sort_order = "Sort order must be a number";
  } else if (formData.sort_order < 0) {
    errors.sort_order = "Sort order cannot be negative";
  }

  // Hourly Rate
  if (showHourlyRate) {
    if (
      formData.hourly_rate === "" ||
      formData.hourly_rate === null ||
      formData.hourly_rate === undefined
    ) {
      errors.hourly_rate = "Hourly rate is required";
    } else if (isNaN(formData.hourly_rate)) {
      errors.hourly_rate = "Hourly rate must be a number";
    } else if (formData.hourly_rate < 0) {
      errors.hourly_rate = "Hourly rate cannot be negative";
    } 
  }

  return errors;
};


// ===============progress bar =======================

export const calculateProjectProgress = (project) => {
  const calculateTimeProgress = (start, end) => {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();

    if (now <= startDate) return 0;
    if (now >= endDate) return 100;

    const total = endDate - startDate;
    const elapsed = now - startDate;

    return Math.round((elapsed / total) * 100);
  };

  const statusProgressMap = {
    open_bids: 0,
    bid_submitted: 25,
    awarded: 50,
    processing: 75,
    completed: 100,
    lost: 0,
    cancelled: 0
  };

  const statusProgress = statusProgressMap[project.status] || 0;

  const timeProgress = calculateTimeProgress(
    project.estimated_start_date,
    project.estimated_end_date
  );

  const manualProgress = Number(project.progress_percentage || 0);

  let progress;
  if (project.status === "open_bids") {
    progress = 0;
  }else if (project.status === "lost") {
    progress = 0;
  } else if (project.status === "cancelled") {
    progress = 0;
  }else if (manualProgress > 0) {
    progress = manualProgress;
  } else {
    progress = Math.round((statusProgress * 0.7) + (timeProgress * 0.3));
  }

  return Math.min(100, Math.max(0, progress));
};
