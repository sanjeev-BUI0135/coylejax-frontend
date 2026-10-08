import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import ReactSelect from "react-select";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";
import { X, Save, Calendar } from "lucide-react";
import InputMask from "react-input-mask";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { renderTextWithLinks, linkifyHtml, handlePasteLink } from "../ui/renderTextWithLinks";
import Swal from "sweetalert2";
import masterDataService from "../../services/masterDataService";
import localApi from "../../services/localApi";
import { Lead } from "../../api/entities";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";

const leadSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  customer_name: z.string().min(1, "Contact name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string()
    .min(1, "Phone number is required")
    .refine((val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length === 10;
    }, "Phone number must be exactly 10 digits"),
  billing_address: z.string().optional(),
  site_address: z.string().optional(),
  division: z.string().min(1, "Please select a division"),
  lead_status: z.string().optional(),
  due_date: z.string().optional().nullable(),
  notes: z.string().optional(),
  lead_source: z.string().optional()
});

/* -------- SIMPLE CACHE -------- */
let cachedDivisions = {};

export default function LeadForm({ lead, users = [], customers: propCustomers = [], onSuccess, onCancel }) {
  const [divisions, setDivisions] = useState([]);
  const [leadType, setLeadType] = useState("new"); // "new" | "existing"
  const [customersList, setCustomersList] = useState(propCustomers || []);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  const [isUnassigned, setIsUnassigned] = useState(false);
  const [leadSources, setLeadSources] = useState([]);
  const [leadStatuses, setLeadStatuses] = useState([]);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    clearErrors,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      company_name: "",
      customer_name: "",
      email: "",
      phone: "",
      billing_address: "",
      site_address: "",
      division: "",
      lead_status: "",
      due_date: null,
      notes: ""
    }
  });


  /* ---------------- LOAD EDIT DATA ---------------- */
  useEffect(() => {

    // wait until divisions loaded
    if (lead && divisions.length > 0) {

      const matchedDivision = divisions.find( d => d.value === lead.division );
      const matchleadstatus = leadStatuses.find(d=>d.value === lead.lead_status);
      const matchleadsource = leadSources.find (d=>d.value === lead.lead_source);
      reset({
        company_name: lead.company_name || "",
        customer_name: lead.customer_name || "",
        email: lead.email || "",
        phone: lead.phone || "",
        billing_address: lead.billing_address || lead.site_address || "",
        site_address: lead.site_address || "",
        division: matchedDivision?.value || "",
        due_date: lead.due_date || null,
        notes: lead.notes || "",
        lead_source:matchleadsource?.value || "",
        lead_status:matchleadstatus?.value || ""
      });
    }

  }, [lead, divisions, reset,leadStatuses]);

  /* ---------------- LOAD DIVISIONS (CACHED) ---------------- */
  const loadDivisions = useCallback(async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const isAdmin = currentUser?.role_type === "admin";

      const res = await masterDataService.getAll("divisions", {
        all: true,
        skipFilter: isAdmin || currentUser?.all_lead_visible
      });
      const list = Array.isArray(res) ? res : res?.data || [];

      const filtered = list
        .filter(d => {
          if (d.status !== "active") return false;

          const companyId = isAdmin
            ? currentUser?._id || currentUser?.id
            : currentUser?.created_by;

          return String(d.created_by) === String(companyId);
        })
        .map(d => ({
          _id: d._id,
          label: d.display_name || d.name || d.value,
          value: d.value
        }));

      setDivisions(filtered);

      // Auto-select division if creating a new lead and user only has 1 division
      if (!lead && filtered.length === 1) {
        setValue("division", filtered[0].value, { shouldValidate: true });
      }

    } catch (err) {
      console.error("Failed to load divisions:", err);
    }
  }, []);

  const loadLeadSources = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const isAdmin = currentUser?.role_type === "admin";

      const res = await masterDataService.getAll("lead_source", {
        all: true,
      });
      const list = Array.isArray(res) ? res : res?.data || [];

      const companyId = isAdmin
        ? currentUser?._id || currentUser?.id
        : currentUser?.created_by;

      const formatted = list
        .filter(i => {
          if (i.status !== "active") return false;

          return String(i.created_by) === String(companyId);
        })
        .map(i => ({
          label: i.display_name,
          value: i.value
        }));

      setLeadSources(formatted);
    } catch (err) {
      console.error("Failed to load lead sources", err);
    }
  };

  const loadLeadStatuses = async () => {
    const res = await masterDataService.getAll(
      "lead_status",
      { all: true }
    );

    const list = Array.isArray(res)
      ? res
      : res?.data || [];

    setLeadStatuses(
      list
        .filter(i => i.status === "active")
        .map(i => ({
          label: i.display_name,
          value: i.value,
          is_default: i.is_default
        }))
    );
  };

  useEffect(() => {
    loadDivisions();
  }, [loadDivisions]);

  useEffect(() => {
    if (lead?.lead_source && leadSources.length) {
      setValue("lead_source", lead.lead_source, {
        shouldValidate: true,
        shouldDirty: false
      });
    }
  }, [lead?.lead_source, leadSources, setValue]);

  useEffect(() => {
    if (!lead?.lead_status && leadStatuses.length) {
      const defaultStatus =
        leadStatuses.find(
          s => s.is_default
        );

      if (defaultStatus) {
        setValue(
          "lead_status",
          defaultStatus.value
        );
      }
    }
  }, [leadStatuses]);

  useEffect(() => {
    loadLeadSources();
  }, []);

  useEffect(() => {
    loadLeadStatuses();
  }, []);

  /* ---------------- LOAD CUSTOMERS ---------------- */
  useEffect(() => {
    if (propCustomers && propCustomers.length > 0) {
      setCustomersList(propCustomers);
    } else {
      const fetchCustomers = async () => {
        setLoadingCustomers(true);
        try {
          const res = await localApi.request("/customers");
          const list = Array.isArray(res) ? res : res?.data || [];
          setCustomersList(list);
        } catch (err) {
          console.error("Failed to load customers for leads form:", err);
        } finally {
          setLoadingCustomers(false);
        }
      };
      fetchCustomers();
    }
  }, [propCustomers]);

  const customerOptions = useMemo(() => {
    return (customersList || [])
      .filter(c => c && (c.company_name || c.contact_name))
      .map(c => {
        const company = (c.company_name || "").trim();
        const contact = (c.contact_name || "").trim();
        let label = "";
        if (company && contact) {
          label = `${company} — ${contact}`;
        } else if (company) {
          label = company;
        } else {
          label = `${contact} (Individual)`;
        }

        return {
          value: c._id || c.id,
          label: label,
          customer: c,
          companyName: company || contact
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [customersList]);

  const clearPopulatedFields = useCallback(() => {
    setSelectedContact(null);
    setValue("company_name", "");
    setValue("customer_name", "");
    setValue("email", "");
    setValue("phone", "");
    setValue("billing_address", "");
    setValue("site_address", "");
    if (!lead) {
      if (divisions.length === 1) {
        setValue("division", divisions[0].value);
      } else {
        setValue("division", "");
      }
    }
    clearErrors(["company_name", "customer_name", "email", "phone", "division"]);
  }, [divisions, lead, setValue, clearErrors]);

  const handleLeadTypeChange = (val) => {
    setLeadType(val);
    if (val === "new") {
      clearPopulatedFields();
    }
  };

  const handleContactSelect = (selectedOption) => {
    if (!selectedOption) {
      clearPopulatedFields();
      return;
    }

    const customer = selectedOption.customer;
    setSelectedContact(selectedOption);

    const compName = customer.company_name || customer.contact_name || "";
    setValue("company_name", compName, { shouldValidate: true, shouldDirty: true });

    if (customer.contact_name) {
      setValue("customer_name", customer.contact_name, { shouldValidate: true, shouldDirty: true });
    }
    if (customer.email) {
      setValue("email", customer.email, { shouldValidate: true, shouldDirty: true });
    }
    if (customer.phone) {
      const digits = (customer.phone || "").replace(/\D/g, "").slice(0, 10);
      let formatted = digits;
      if (digits.length > 6) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length > 3) {
        formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      }
      setValue("phone", formatted, { shouldValidate: true, shouldDirty: true });
    }

    const fullAddress = [
      customer.address,
      customer.city,
      [customer.state, customer.zip_code].filter(Boolean).join(" ")
    ].filter(Boolean).join(", ");

    if (fullAddress) {
      setValue("billing_address", fullAddress, { shouldDirty: true });
      setValue("site_address", fullAddress, { shouldDirty: true });
    } else if (customer.address) {
      setValue("billing_address", customer.address, { shouldDirty: true });
      setValue("site_address", customer.address, { shouldDirty: true });
    }

    if (customer.division && divisions.length > 0) {
      const matchedDiv = divisions.find(
        d => d.value === customer.division || d._id === customer.division
      );
      if (matchedDiv) {
        setValue("division", matchedDiv.value, { shouldValidate: true, shouldDirty: true });
      }
    }
  };


  /* ---------------- SUBMIT ---------------- */
  const onSubmit = useCallback(async (data) => {
    try {
      let updatedData = { ...data };

      if (lead?.assigned_to) {

        const assignedUser = users?.find(
          u => u._id === (lead.assigned_to?._id || lead.assigned_to)
        );

        const hasDivisionAccess = assignedUser?.project_type?.includes(data.division);

        updatedData.assigned_to = hasDivisionAccess
          ? (lead?.assigned_to?._id || lead?.assigned_to)
          : null;
      }

      if (lead?._id) {
        await Lead.update(lead._id, updatedData);
      } else {
        await Lead.create(updatedData);
      }

      Swal.fire({
        icon: "success",
        title: lead ? "Lead Updated" : "Lead Created",
        text: lead
          ? "Lead updated successfully"
          : "Lead created successfully",
        timer: 2000,
        showConfirmButton: false
      });

      onSuccess?.();
    } catch (err) {
      console.error("Save failed:", err);

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Unable to save lead. Please try again."
      });
    }
  }, [lead, onSuccess]);;

  const companyName = watch("company_name");
  const customerName = watch("customer_name");
  const emailValue = watch("email");
  const phoneValue = watch("phone");
  const divisionValue = watch("division");
  const leadStatusValue = watch("lead_status");

  const handleDivisionChange = async (value, field) => {
    if (value === field.value) return;
    if (lead?.assigned_to) {
      const assignedUser = users?.find(
        u =>
          u._id ===
          (lead.assigned_to?._id || lead.assigned_to)
      );

      const hasDivisionAccess =
        assignedUser?.project_type?.includes(value);

      if (hasDivisionAccess) {
        field.onChange(value);
        return;
      }

      const result = await Swal.fire({
        icon: "warning",
        title: "Change Division?",
        text: "This lead is already assigned. Changing the division will unassign the current user.",
        showCancelButton: true,
        confirmButtonText: "Yes, Change",
        cancelButtonText: "Cancel"
      });

      if (!result.isConfirmed) {
        return;
      }

      setIsUnassigned(true);
    }

    field.onChange(value);
  };

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
            {lead ? "Edit Lead" : "Create Lead"}
          </CardTitle>

          <Button variant="ghost" size="xsm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="max-h-[80vh] overflow-y-auto mt-4">
          <form onSubmit={handleSubmit(onSubmit)} onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }} className="space-y-6">

            {/* Lead Type Radio Options */}
            <div className="pb-2 border-b border-gray-100 dark:border-gray-800">
              <RadioGroup
                value={leadType}
                onValueChange={handleLeadTypeChange}
                className="flex items-center gap-6"
              >
                <div className="flex items-center space-x-2 cursor-pointer">
                  <RadioGroupItem value="new" id="lead-type-new" className="text-blue-600 border-blue-600" />
                  <Label htmlFor="lead-type-new" className="cursor-pointer font-medium text-sm text-gray-700 dark:text-gray-200">
                    New Leads Form
                  </Label>
                </div>
                <div className="flex items-center space-x-2 cursor-pointer">
                  <RadioGroupItem value="existing" id="lead-type-existing" className="text-blue-600 border-blue-600" />
                  <Label htmlFor="lead-type-existing" className="cursor-pointer font-medium text-sm text-gray-700 dark:text-gray-200">
                    Existing Contacts
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Company + Customer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label> Company Name {!companyName && <span className="text-red-500">*</span>}</Label>
                {leadType === "new" ? (
                  <Input {...register("company_name")} placeholder="Enter Company Name" />
                ) : (
                  <ReactSelect
                    options={customerOptions}
                    value={selectedContact}
                    onChange={handleContactSelect}
                    placeholder="Search company or contact..."
                    isClearable
                    isLoading={loadingCustomers}
                    className="w-full text-sm"
                    classNamePrefix="react-select"
                    menuPortalTarget={document.body}
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 99999 }),
                      control: (base, state) => ({
                        ...base,
                        minHeight: "40px",
                        height: "40px",
                        borderRadius: "0.375rem",
                        borderColor: errors.company_name ? "#ef4444" : state.isFocused ? "#3b82f6" : "#e2e8f0",
                        boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
                        "&:hover": {
                          borderColor: errors.company_name ? "#ef4444" : "#cbd5e1",
                        },
                        backgroundColor: "transparent",
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 99999,
                      }),
                      option: (base, state) => ({
                        ...base,
                        cursor: "pointer",
                        backgroundColor: state.isSelected
                          ? "#3b82f6"
                          : state.isFocused
                          ? "#eff6ff"
                          : "transparent",
                        color: state.isSelected ? "#ffffff" : "#1f2937",
                      }),
                    }}
                  />
                )}
                {errors.company_name && (
                  <p className="text-sm text-red-500">
                    {errors.company_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Contact Name {!customerName && <span className="text-red-500">*</span>}</Label>
                <Input {...register("customer_name")} />
                {errors.customer_name && (
                  <p className="text-sm text-red-500">
                    {errors.customer_name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label> Email {!emailValue && <span className="text-red-500">*</span>}</Label>
                <Input type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label> Phone {!phoneValue && <span className="text-red-500">*</span>}</Label>
                <Controller
                  name="phone"
                  control={control}
                  rules={{
                    required: "Phone number is required",
                    pattern: {
                      value: /^[0-9() -]*$/,
                      message: "Enter valid phone number",
                    },
                  }}
                  render={({ field }) => (
                    <InputMask
                      mask="(999) 999-9999"
                      value={field.value}
                      onChange={field.onChange}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData("Text");
                        const digits = pasted.replace(/\D/g, "").slice(0, 10);
                        let formatted = digits;
                        if (digits.length > 6) {
                          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                        } else if (digits.length > 3) {
                          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                        } else {
                          formatted = digits;
                        }
                        field.onChange(formatted);
                      }}
                    >
                      {(inputProps) => (
                        <Input
                          {...inputProps}
                          type="tel"
                          placeholder="(999) 999-9999"
                        />
                      )}
                    </InputMask>
                  )}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">
                    {errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Billing Address & Site Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Address</Label>
                <Input {...register("billing_address")} placeholder="Enter Billing Address" />
              </div>

              <div className="space-y-2">
                <Label>Site Address</Label>
                <Input {...register("site_address")} placeholder="Enter Site Address" />
              </div>
            </div>

            {/* Division */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Division {!divisionValue && <span className="text-red-500">*</span>}</Label>

                <Controller
                  name="division"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(value) =>
                        handleDivisionChange(value, field)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Division" />
                      </SelectTrigger>

                      <SelectContent position="popper" className="z-[9999] max-h-60 overflow-y-auto">
                        {divisions.map(d => (
                          <SelectItem key={d._id} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                {errors.division && (
                  <p className="text-sm text-red-500">
                    {errors.division.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Status {!leadStatusValue && <span className="text-red-500">*</span>}</Label>
                <Controller
                  name="lead_status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Lead Status" />
                      </SelectTrigger>

                      <SelectContent>
                        {leadStatuses.map(status => (
                          <SelectItem
                            key={status._id}
                            value={status.value}
                          >
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            {/* Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Due Date */}
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Controller
                  name="due_date"
                  control={control}
                  render={({ field }) => (
                    <CustomDatePicker
                      value={field.value}
                      minDate={new Date().toISOString().split("T")[0]}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {/* Lead Source */}
              <div className="space-y-2">
                <Label>Lead Source</Label>

                <Controller
                  name="lead_source"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Lead Source" />
                      </SelectTrigger>

                      <SelectContent position="popper" className="z-[9999] max-h-60 overflow-y-auto">
                        {leadSources.map(source => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

            </div>

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Notes</Label>
              </div>
              <SunEditor
                setContents={linkifyHtml(watch("notes") || "")}
                onChange={(content) => setValue("notes", content)}
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
                  height: "120px",
                  resizingBar: false,
                  showPathLabel: false
                }}
              />
            </div>
            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {lead ? "Update Lead" : "Save Lead"}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
