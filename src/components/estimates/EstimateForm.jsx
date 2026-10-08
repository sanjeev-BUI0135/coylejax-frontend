import React, { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import api from "../../services/masterDataService.js";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

import { X, Save, Loader2 } from "lucide-react"
import { renderTextWithLinks, linkifyHtml, handlePasteLink } from "@/components/ui/renderTextWithLinks"
import InputMask from "react-input-mask"

import FileUpload from "@/components/shared/FileUpload"
import CustomDatePicker from "../ui/CustomDatePicker"
import useEstimateLogic from "./useEstimateLogic"
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";
import LineItemsTable from "./LineItemsTable"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { ArrowRight } from "lucide-react"
import Swal from "sweetalert2";

const stripHtml = (html) => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

export default function EstimateForm({
  estimate,
  projectForNewEstimate,
  projects,
  customers,
  estimates,
  onSubmit,
  onCancel,
  initialCustomer,
  prefillLead,
  fromLeads = false
}) {
  // Toggle between quick and full estimate modes
  const [isQuickMode, setIsQuickMode] = useState(
    fromLeads
      ? true
      : estimate?.is_quick_estimate ?? !projectForNewEstimate
  )
  
  const [quickCustomer, setQuickCustomer] = useState({
    company_name: estimate?.quick_customer?.company_name || initialCustomer?.company_name || prefillLead?.company_name || "",
    customer_name: estimate?.quick_customer?.customer_name || initialCustomer?.contact_name || prefillLead?.customer_name || "",
    phone_number: estimate?.quick_customer?.phone_number || initialCustomer?.phone || prefillLead?.phone || "",
    email_address: estimate?.quick_customer?.email_address || initialCustomer?.email || prefillLead?.email || "",
    billing_address: estimate?.quick_customer?.billing_address || initialCustomer?.address || prefillLead?.billing_address || prefillLead?.site_address || "",
    site_address: estimate?.quick_customer?.site_address || prefillLead?.site_address || "",
    division_type: estimate?.quick_customer?.division_type || prefillLead?.division || "",
    project_name: estimate?.quick_customer?.project_name || "",
    _lead_id: estimate?.quick_customer?._lead_id || prefillLead?._id || undefined,
  })
  
  const   logic = useEstimateLogic({
    estimate,
    projectForNewEstimate,
    projects,
    estimates,
    onSubmit,
    onCancel,
    isQuickMode,
    quickCustomer,
    customers,
  })
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [notesBeforeEdit, setNotesBeforeEdit] = useState("");
  const [markupData, setMarkUpData] = useState([])
  let type = "markup"
  const load = useCallback(async () => {
    try {
      const res = await api.getAll(type);
      setMarkUpData(res.data)
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Could not fetch data", "error");
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);


  const userData = JSON.parse(localStorage.getItem("user") || "{}")
  const isCrewView = userData?.role_type === "Crew View"

  const {
    formData,
    client,
    inventoryCategories,
    divisionTypes,
    subtotal,
    tax_amount,
    total_amount,
    me,
    user,
    handleInputChange,
    handleSubmit,
    isSubmitting,
    setIsDirty,
    isTaxExemptToggle,
    handleTaxExemptToggle,
    paymentSettings
  } = logic



  const handleQuickCustomerChange = (field, value) => {
    setIsDirty(true);
    setQuickCustomer(prev => ({ ...prev, [field]: value }))
  }

  // ─── Plan Scan AI callback ────────────────────────────────────────────────
    const handlePlanScanSave = ({ projectName, lineItems, notes, divisions }) => {
    // 1. Fill project name and division if available
    if (projectName || (divisions && divisions.length > 0)) {
      setQuickCustomer(prev => {
        const next = { ...prev };
        if (projectName) {
          next.project_name = projectName;
        }
        if (divisions && divisions.length > 0) {
          next.division_type = divisions[0];
        }
        return next;
      });
      if (divisions && divisions.length > 0) {
        logic.handleInputChange("division_type", divisions[0]);
      }
    }

    // 2. Append / replace line items with associated notes if any
    const rawNotesList = notes ? notes.split("\n").filter(Boolean) : [];
    const processedLineItems = (lineItems || []).map((item, index) => {
      // link individual note to this item if available
      return {
        ...item,
        associated_note: rawNotesList[index] || ""
      };
    });

    if (processedLineItems.length > 0) {
      logic.handleInputChange(
        "line_items",
        [...(logic.formData.line_items || []), ...processedLineItems]
      );
      logic.handleInputChange("imported_via_planscan", true);
    }

    // 3. Append notes
    if (notes) {
      const existing = logic.formData.notes || ""
      const combined = existing ? `${existing}\n${notes}` : notes
      logic.handleInputChange("notes", combined)
    }
  }

  const getProjectDisplayName = (project) => {
    return project?.project_name || "Unnamed Project";
  };

  // Set all quickCustomer fields from prefillLead immediately (no async dependency)
  useEffect(() => {
    if (!prefillLead) return;
    setIsQuickMode(true);
    setQuickCustomer(prev => ({
      ...prev,
      company_name: prefillLead.company_name || prev.company_name || "",
      customer_name: prefillLead.customer_name || prev.customer_name || "",
      phone_number: prefillLead.phone || prev.phone_number || "",
      email_address: prefillLead.email || prev.email_address || "",
      billing_address: prefillLead.billing_address || prefillLead.site_address || prev.billing_address || "",
      site_address: prefillLead.site_address || prev.site_address || "",
      _lead_id: prefillLead._id,
    }));
    handleInputChange("notes", prefillLead.notes || "");
  }, [prefillLead]);

  // Set division_type separately once divisionTypes have loaded
  useEffect(() => {
    if (!prefillLead || !divisionTypes || divisionTypes.length === 0) return;
    if (prefillLead.division) {
      setQuickCustomer(prev => ({ ...prev, division_type: prefillLead.division }));
    }
  }, [prefillLead, divisionTypes]);

  useEffect(() => {
    if (!estimate && initialCustomer?.billing_information) {
      handleInputChange("notes", initialCustomer.billing_information);
    }
  }, [initialCustomer, estimate]);

  useEffect(() => {
    if (!estimate && projectForNewEstimate && customers?.length > 0) {

      const customerId =
        projectForNewEstimate.customer_ids?.[0]?._id ||
        projectForNewEstimate.customer_ids?.[0];

      if (!customerId) return;

      const customer = customers.find(
        (c) =>
          c._id?.toString() === customerId?.toString() ||
          c.id?.toString() === customerId?.toString()
      );

      if (!formData.notes && customer?.billing_information) {
        handleInputChange("notes", customer.billing_information);
      }

    }
  }, [projectForNewEstimate, customers]);

  // Disable mode toggle if editing existing estimate with project
  const canToggleMode = !projectForNewEstimate && (!estimate || estimate.is_quick_estimate)
  const filteredMarkupdata = markupData.filter((f =>
    f?.created_by === me?._id ||
    f?.created_by === user?.id ||
    f?.created_by === me?.created_by))

  const formatUSD = (value) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto my-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {estimate ? "Edit Estimate" : "Create New Estimate"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent>
          {/* CLIENT INFO */}
          <div className="mb-8 text-center border-b pb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {client?.companyName || " "}
            </h1>
            <div className="text-gray-600 dark:text-gray-400 mt-2">
              {client?.address || " "}
            </div>
          </div>

          {/* QUICK MODE TOGGLE */}
          {canToggleMode && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Quick Estimate Mode
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Create estimates without setting up projects first. Perfect for quick quotes.
                  </p>
                </div>
                <Switch
                  checked={isQuickMode}
                  onCheckedChange={setIsQuickMode}
                  disabled={!canToggleMode || fromLeads}
                />
              </div>
            </div>
          )}

          {/* CONVERTED NOTICE */}
          {estimate?.converted_to_project && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This quick estimate has been converted to a full project.
                <Button
                  variant="link"
                  size="sm"
                  className="ml-2"
                  onClick={() => window.location.href = `/projects/${estimate.converted_project_id}`}
                >
                  View Project <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={(e) => handleSubmit(e, quickCustomer, isQuickMode)} onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault()
            }
          }} className="space-y-6">

            {/* QUICK CUSTOMER INFO (Quick Mode Only) */}
            {isQuickMode && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  Customer Information
                  <span className="text-red-500 ml-1">*</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">
                      Company Name
                      {!quickCustomer.company_name && <span className="text-red-500"> *</span>}
                    </Label>
                    <Input
                      id="company_name"
                      value={quickCustomer.company_name}
                      onChange={(e) => handleQuickCustomerChange("company_name", e.target.value)}
                      required={isQuickMode}
                      placeholder="Enter Company Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_name">
                      Contact Name
                      {!quickCustomer.customer_name && <span className="text-red-500"> *</span>}
                    </Label>
                    <Input
                      id="customer_name"
                      value={quickCustomer.customer_name}
                      onChange={(e) => handleQuickCustomerChange("customer_name", e.target.value)}
                      required={isQuickMode}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone_number">
                      Phone Number
                    </Label>
                    <InputMask
                      mask="(999) 999-9999"
                      value={quickCustomer.phone_number}
                      onChange={(e) => handleQuickCustomerChange("phone_number", e.target.value)}
                      onPaste={(e) => {
                        e.preventDefault();

                        const pasted = e.clipboardData.getData("Text");
                        const digits = pasted.replace(/\D/g, "").slice(0, 10);

                        let formatted = "";

                        if (digits.length > 6) {
                          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                        } else if (digits.length > 3) {
                          formatted = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
                        } else {
                          formatted = digits;
                        }

                        handleQuickCustomerChange("phone_number", formatted);
                      }}
                    >
                      {(inputProps) => (
                        <Input
                          {...inputProps}
                          id="phone_number"
                          type="tel"
                          placeholder="555-123-4567"
                        />
                      )}
                    </InputMask>

                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email_address">
                      Email Address
                      {!quickCustomer.email_address && <span className="text-red-500"> *</span>}
                    </Label>
                    <Input
                      id="email_address"
                      type="email"
                      value={quickCustomer.email_address}
                      onChange={(e) => handleQuickCustomerChange("email_address", e.target.value)}
                      required={isQuickMode}
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="billing_address">
                      Billing Address
                    </Label>
                    <Textarea
                      id="billing_address"
                      value={quickCustomer.billing_address}
                      onChange={(e) => handleQuickCustomerChange("billing_address", e.target.value)}
                      placeholder="123 Billing St, City, State 12345"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="site_address">
                      Site Address
                    </Label>
                    <Textarea
                      id="site_address"
                      value={quickCustomer.site_address}
                      onChange={(e) => handleQuickCustomerChange("site_address", e.target.value)}
                      placeholder="123 Main St, City, State 12345"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* BASIC INFO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimate_number">Estimate Number</Label>
                <Input
                  id="estimate_number"
                  value={formData.estimate_number || ""}
                  onChange={(e) => handleInputChange("estimate_number", e.target.value)}
                  readOnly
                  placeholder="Auto Generated"
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_po_number">
                  Customer PO Number
                  {!formData.customer_po_number && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="customer_po_number"
                  type="text"
                  value={formData.customer_po_number || ""}
                  onChange={(e) => handleInputChange("customer_po_number", e.target.value)}
                  placeholder="po-1234"
                  required
                />
              </div>
            </div>

            {/* PROJECT SELECTION (Full Mode Only) */}
            {!isQuickMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project_id">Project</Label>
                  <Select
                    value={formData.project_id || ""}
                    onValueChange={(value) => {
                      const selected = projects.find( p => p.id === value || p._id === value )
                      handleInputChange("project_id", value)
                      handleInputChange( "project_location",
                        selected?.location || ""
                      )
                      if (selected?.project_number) {

                        handleInputChange(
                          "customer_po_number",
                          `PO-${selected.project_number}`
                        );

                      }

                      if (selected?.customer_ids?.length > 0) {

                        const customerId =
                          selected.customer_ids[0]?._id ||
                          selected.customer_ids[0];

                        const customer = customers.find(
                          (c) =>
                            c._id?.toString() === customerId?.toString() ||
                            c.id?.toString() === customerId?.toString()
                        );

                        if (!formData.notes && customer?.billing_information) {
                          handleInputChange(
                            "notes",
                            customer.billing_information
                          );
                        }
                      }
                    }}
                    disabled={!!projectForNewEstimate || !!estimate?.project_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project._id || project.id} value={project._id || project.id}>
                          {getProjectDisplayName(project) || project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_location">Site Address</Label>
                  <Input
                    id="project_location"
                    value={formData.project_location || ""}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>
            )}

            {isQuickMode && (<div className="space-y-2">
              <Label htmlFor="project_name">
                Project Name{!quickCustomer.project_name && <span className="text-red-500"> *</span>}
              </Label>

              <Input
                id="project_name"
                value={quickCustomer.project_name || ""}
                onChange={(e) =>
                  handleQuickCustomerChange("project_name", e.target.value)
                }
                placeholder="Enter Project Name"
                required
              />
            </div>)}

            {/* STATUS + DIVISION TYPE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* STATUS - LEFT */}
              <div className={`space-y-2 ${isQuickMode ? "md:col-span-1" : "md:col-span-2"}`}>
                <Label>Status</Label>
                <Select
                  value={formData.status||"draft"}
                  onValueChange={(value) => handleInputChange("status", value)}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* DIVISION TYPE - RIGHT */}
              {isQuickMode && (<div className="space-y-2">
                <Label>Division Type{!quickCustomer.division_type && <span className="text-red-500"> *</span>}</Label>

                <Select
                  value={quickCustomer.division_type || ""}
                  onValueChange={(value) => handleQuickCustomerChange("division_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Division" />
                  </SelectTrigger>

                  <SelectContent>
                    {divisionTypes.map((div) => (
                      <SelectItem
                        key={div._id}
                        value={div.value}
                      >
                        {div.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>)}
            </div>


            {/* LINE ITEMS */}
            <LineItemsTable
              formData={formData}
              inventoryCategories={inventoryCategories}
              isCrewView={isCrewView}
              showInventorySearch={logic.showInventorySearch}
              setShowInventorySearch={logic.setShowInventorySearch}
              inventorySearchTerm={logic.inventorySearchTerm}
              setInventorySearchTerm={logic.setInventorySearchTerm}
              filteredInventoryItems={logic.filteredInventoryItems}
              inputRefs={logic.inputRefs}
              addLineItem={logic.addLineItem}
              addSection={logic.addSection}
              updateLineItem={logic.updateLineItem}
              selectInventoryItem={logic.selectInventoryItem}
              removeLineItem={logic.removeLineItem}
              filteredMarkupdata={filteredMarkupdata}
              divisionType={quickCustomer.division_type || formData.division_type || ""}
              divisionTypes={divisionTypes}
              onPlanScanSave={handlePlanScanSave}
            />

            {/* NOTES + SUMMARY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Row 1: Notes (left) & Tax Fields (right) */}
              <div>
                <Label>Notes</Label>
                <SunEditor
                  setContents={linkifyHtml(formData.notes || "")}
                  onChange={(content) => handleInputChange("notes", content)}
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
                    height: "100px",
                    resizingBar: false,
                    showPathLabel: false
                  }}
                />
              </div>

              {!isCrewView ? (
                <div className="space-y-4">
                  {/* Tax Rate with toggle */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Tax Rate</Label>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="tax-exempt-toggle"
                          checked={isTaxExemptToggle}
                          onCheckedChange={handleTaxExemptToggle}
                        />
                        <label
                          htmlFor="tax-exempt-toggle"
                          className={`text-sm font-medium cursor-pointer select-none transition-colors ${
                            isTaxExemptToggle
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {isTaxExemptToggle ? "Tax Exempt" : "Taxable"}
                        </label>
                      </div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.001"
                      value={formData.tax_rate || 0}
                      disabled={true}
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <Label>{filteredMarkupdata?.[0]?.value ?? "Additional Markup"}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.material_markup_amount || ""}
                      onChange={(e) => handleInputChange("material_markup_amount", e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div />
              )}

              {/* Row 2: Scope of Work (left) & Summary Card (right) */}
              <div>
                <Label>
                  Scope of Work
                  <span className="text-red-500"> *</span>
                </Label>
                <SunEditor
                  setContents={formData.Scope_of_work || ""}
                  onChange={(content) => handleInputChange("Scope_of_work", content)}
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
                    height: "100px",
                    resizingBar: false,
                    showPathLabel: false
                  }}
                />
              </div>

              {!isCrewView ? (
                <div className="p-4 rounded-lg space-y-2 border bg-gray-50 dark:bg-gray-800">
                  <div className="flex justify-between">
                    <span>
                      {filteredMarkupdata?.[0]?.value ?? "Additional Markup"}
                    </span>

                    <span>
                      +${formatUSD(formData.material_markup_amount)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>
                      ${formatUSD(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Tax ({((formData.tax_rate || 0) * 100).toFixed(1)}%)</span>
                    <span>
                      ${formatUSD(tax_amount)}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>
                      ${formatUSD(total_amount)}
                    </span>
                  </div>
                </div>
              ) : (
                <div />
              )}
            </div>

            {/* FILE UPLOAD */}
            <FileUpload
              attachments={formData.file_attachments || []}
              onAttachmentsChange={(files) => handleInputChange("file_attachments", files)}
            />

            {/* FOOTER */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>

              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isCrewView || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSubmitting
                  ? (estimate ? "Updating..." : "Creating...")
                  : (estimate ? "Update Estimate" : "Create Estimate")
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
