import Modal from "../ui/Modal";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const MasterDataFormModal = ({
  open,
  onClose,
  onSave,
  title,
  formData,
  setFormData,
  errors,
  setErrors,
  showHourlyRate,
  editingItem,
  type
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {/* =========================
          MARKUP ONLY VIEW
         ========================= */}
      {type === "markup" ? (
        <>
          <div className="mb-4">
            <Label>
              Markup Value <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.value || ""}
              onChange={(e) => {
                setFormData({ ...formData, value: e.target.value });
                if (errors.value) setErrors({ ...errors, value: "" });
              }}
              placeholder="Enter markup value"
              className={cn(
                errors.value &&
                "border-red-500 focus:border-red-500 focus:ring-red-500"
              )}
            />
            {errors.value && (
              <p className="text-red-500 text-sm mt-1">
                {errors.value}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                setErrors({});
              }}
            >
              Cancel
            </Button>

            {/* {editingItem && (
              <Button
                variant="destructive"
                onClick={() => onSave("delete")}
              >
                Delete
              </Button>
            )} */}

            <Button variant="primary" onClick={onSave}>
              {editingItem ? "Update" : "Add"}
            </Button>
          </div>
        </>
      ) : (
        /* =========================
            DEFAULT FULL FORM
           ========================= */
        <>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <Label>
                Internal Value {!formData.value && <span className="text-red-500">*</span>}
              </Label>
              <Input
                value={formData.value}
                onChange={(e) => {
                  setFormData({ ...formData, value: e.target.value });
                  if (errors.value) setErrors({ ...errors, value: "" });
                }}
                readOnly={(editingItem) || formData.value === "service_work_order" || (type === "categories" && formData.value === "labor")}
                className={cn(
                  errors.value &&
                  "border-red-500 focus:border-red-500 focus:ring-red-500",
                  ((editingItem) || formData.value === "service_work_order" ||
                    (type === "categories" && formData.value === "labor")) &&
                  "bg-gray-100 text-gray-600 cursor-not-allowed"
                )}
                placeholder="e.g., project_type_1"
              />
              {errors.value && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.value}
                </p>
              )}
            </div>

            <div>
              <Label>
                Display Name {!formData.display_name && <span className="text-red-500">*</span>}
              </Label>
              <Input
                value={formData.display_name}
                readOnly={type === "categories" && formData.value === "labor"}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    display_name: e.target.value
                  });
                  if (errors.display_name)
                    setErrors({
                      ...errors,
                      display_name: ""
                    });
                }}
                className={cn(
                  errors.display_name && "border-red-500 focus:border-red-500 focus:ring-red-500",
                  type === "categories" && formData.value === "labor" &&
                  "bg-gray-100 text-gray-600 cursor-not-allowed"
                )}
              />
              {errors.display_name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.display_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Sort Order {!formData.sort_order && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      sort_order: Number(e.target.value)
                    });
                    if (errors.sort_order)
                      setErrors({
                        ...errors,
                        sort_order: ""
                      });
                  }}
                  className={
                    errors.sort_order
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }
                />
                {errors.sort_order && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.sort_order}
                  </p>
                )}
              </div>

              {showHourlyRate && (
                <div>
                  <Label>
                    Hourly Rate ($){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate ?? ""}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        hourly_rate: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined
                      });
                      if (errors.hourly_rate)
                        setErrors({
                          ...errors,
                          hourly_rate: ""
                        });
                    }}
                    className={
                      errors.hourly_rate
                        ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                        : ""
                    }
                  />
                  {errors.hourly_rate && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.hourly_rate}
                    </p>
                  )}
                </div>
              )}
            </div>

            {type === "divisions" && (
              <div>
                <Label>Terms & Conditions</Label>
                <textarea
                  rows={5}
                  className="w-full border rounded-md p-2 text-sm"
                  value={formData.terms_and_conditions || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      terms_and_conditions: e.target.value
                    })
                  }
                />
                
                <div className="mt-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.show_all_division_data === true}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          show_all_division_data: e.target.checked
                        })
                      }
                    />
                    <span className="text-sm font-medium">
                      Show Division Data to All Users
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 ml-5 mt-1">If unchecked, users will only see data they created within this division.</p>
                </div>
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.status === "active"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.checked
                      ? "active"
                      : "inactive"
                  })
                }
              />
              <span className="text-sm font-medium">
                Active
              </span>
            </label>
            {type === "categories" && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.tax_added === true}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_added: e.target.checked
                    })
                  }
                />
                <span className="text-sm font-medium">
                  Markup Added
                </span>
              </label>
            )}
            {type === "categories" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.value === "labor"}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        value: "labor",
                        display_name: "Labor",
                      });
                      setErrors({
                        ...errors,
                        value: "",
                        display_name: "",
                      });
                    } else {
                      setFormData({
                        ...formData,
                        value: "",
                        display_name: "",
                      });
                    }
                  }}
                />
                <Label className="text-sm font-medium">
                  Labor
                </Label>
              </div>
            )}

            {type === "project_creation_type" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    formData.value === "service_work_order"
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        value: "service_work_order",
                        display_name: "Service Work"
                      });
                      setErrors({
                        ...errors,
                        value: "",
                        display_name: ""
                      });
                    } else {
                      setFormData({
                        ...formData,
                        value: "",
                        display_name: ""
                      });
                    }
                  }}
                />
                <Label className="text-sm font-medium">
                  Service Work
                </Label>
              </div>
            )}

            {type === "lead_status" && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_default || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_default: e.target.checked
                    })
                  }
                />
                <span>Set as Default</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                onClose();
                setErrors({});
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              disabled={isSubmitting}
              onClick={async () => {
                if (isSubmitting) return;

                try {
                  setIsSubmitting(true);
                  await onSave();
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? "Saving..." : editingItem ? "Update" : "Add"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default MasterDataFormModal;
