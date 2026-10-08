import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Plus, Trash } from "lucide-react";
import FileUpload from "../shared/FileUpload";
import InputMask from "react-input-mask";
import { renderTextWithLinks, linkifyHtml, handlePasteLink } from "@/components/ui/renderTextWithLinks";
import masterDataService from "../../services/masterDataService";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";

export default function CustomerForm({ customer, onSubmit, onCancel }) {

  const [divisions, setDivisions] = useState([]);
  const [formData, setFormData] = useState(customer || {
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    customer_type: "residential",
    division: "",
    division_display_name: "",
    billing_information: "",
    file_attachments: [],
    additional_contacts: []
  });

  const loadDivisions = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      const isAdmin = currentUser?.role_type === "admin";

      const res = await masterDataService.getAll("divisions");
      const list = Array.isArray(res) ? res : res?.data || [];

      const filtered = list
        .filter(d => {
          if (d.status !== "active") return false;

          const companyId = isAdmin
            ? currentUser?._id || currentUser?.id
            : currentUser?.created_by;

          const isSameCompany =
            String(d.created_by) === String(companyId);

          if (!isSameCompany) return false;
          if (isAdmin) return true;

          return currentUser.project_type
            ?.map(String)
            .includes(String(d.value));
        })
        .map(d => ({
          _id: d._id,
          label: d.display_name,
          value: d.value
        }));

      setDivisions(filtered);

    } catch (err) {
      console.error("Failed to load divisions:", err);
    }
  };

  useEffect(() => {
    loadDivisions();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate main phone number
    const mainPhoneDigits = (formData.phone || "").replace(/\D/g, "");
    if (mainPhoneDigits.length !== 10) {
      return Swal.fire({
        icon: "error",
        title: "Invalid Phone Number",
        text: "Main phone number must be exactly 10 digits"
      });
    }

    // Validate additional contacts phone numbers
    if (formData.additional_contacts && formData.additional_contacts.length > 0) {
      for (let i = 0; i < formData.additional_contacts.length; i++) {
        const contact = formData.additional_contacts[i];
        if (contact.phone) {
          const digits = contact.phone.replace(/\D/g, "");
          if (digits.length !== 10) {
            return Swal.fire({
              icon: "error",
              title: "Invalid Contact Phone",
              text: `Phone number for additional contact "${contact.contact_name || (i + 1)}" must be exactly 10 digits`
            });
          }
        }
      }
    }

    onSubmit(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addAdditionalContact = () => {
    setFormData(prev => ({
      ...prev,
      additional_contacts: [
        ...prev.additional_contacts,
        {
          contact_name: "",
          email: "",
          phone: "",
          id: Date.now()
        }
      ]
    }));
  };

  const updateAdditionalContact = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      additional_contacts: prev.additional_contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const removeAdditionalContact = (index) => {
    setFormData(prev => ({
      ...prev,
      additional_contacts: prev.additional_contacts.filter((_, i) => i !== index)
    }));
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
            {customer ? "Edit Contact" : "Add New Contact"}
          </CardTitle>
          <Button variant="ghost" size="xsm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="max-h-[80vh] overflow-y-auto mt-4 flex flex-col gap-5">
          <form onSubmit={handleSubmit} onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">
                  Company Name
                  {!formData.company_name && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange("company_name", e.target.value)}
                  placeholder="Company name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name
                  {!formData.contact_name && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleInputChange("contact_name", e.target.value)}
                  placeholder="contact person"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email
                  {!formData.email && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone
                  {!formData.phone && <span className="text-red-500"> *</span>}
                </Label>
                <InputMask
                  mask="(999) 999-9999"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
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
                    handleInputChange("phone", formatted);
                  }}
                >
                  {(inputProps) => (
                    <Input
                      {...inputProps}
                      id="phone"
                      type="tel"
                      placeholder="(999) 999-9999"
                      required
                    />
                  )}
                </InputMask>
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <Label className="text-lg font-medium">Additional Contacts</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAdditionalContact}
                  className="flex items-center gap-2 text-sm px-3 py-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add Contact
                </Button>
              </div>

              {formData.additional_contacts && formData.additional_contacts.length > 0 && (
                <div className="hidden sm:grid sm:grid-cols-3 gap-4 mb-2 px-2">
                  <Label className="text-sm font-medium">Contact Name</Label>
                  <Label className="text-sm font-medium">Email</Label>
                  <Label className="text-sm font-medium">Phone</Label>
                </div>
              )}

              {formData.additional_contacts && formData.additional_contacts.map((contact, index) => (
                <div
                  key={contact.id || index}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3 border sm:border-0 p-3 sm:p-0 rounded-lg sm:rounded-none"
                >
                  <div>
                    <Label className="text-xs text-gray-500temp sm:hidden">Contact Name</Label>
                    <Input
                      value={contact.contact_name || ""}
                      onChange={(e) => updateAdditionalContact(index, "contact_name", e.target.value)}
                      placeholder="Contact name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500temp sm:hidden">Email</Label>
                    <Input
                      type="email"
                      value={contact.email || ""}
                      onChange={(e) => updateAdditionalContact(index, "email", e.target.value)}
                      placeholder="email@company.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500temp sm:hidden">Phone</Label>
                    <div className="flex gap-2">
                      <InputMask
                        mask="(999) 999-9999"
                        value={contact.phone || ""}
                        onChange={(e) => updateAdditionalContact(index, "phone", e.target.value)}
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
                          updateAdditionalContact(index, "phone", formatted);
                        }}
                      >
                        {(inputProps) => (
                          <Input
                            {...inputProps}
                            type="tel"
                            placeholder="987-654-3210"
                          />
                        )}
                      </InputMask>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAdditionalContact(index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {(!formData.additional_contacts || formData.additional_contacts.length === 0) && (
                <div className="text-center py-8 text-gray-500temp border-2 border-dashed rounded-lg dark:bg-gray-900">
                  <p>No additional contacts added</p>
                  <p className="text-sm">Click "Add Contact" to add more contacts</p>
                </div>
              )}
            </div>


            <div className="space-y-2">
              <Label htmlFor="address">Address
                {!formData.address}
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Street address"
              // required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City
                  {!formData.city}
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="City"
                // required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State
                  {!formData.state}
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="State"
                // required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code
                  {!formData.zip_code}
                </Label>
                <Input
                  id="zip_code"
                  type="number"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange("zip_code", e.target.value)}
                  placeholder="ZIP code"
                // required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Customer Type */}
              <div className="space-y-2">
                <Label htmlFor="customer_type">Contact Type</Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value) => handleInputChange("customer_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select contact type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Division */}
              <div className="space-y-2">
                <Label htmlFor="division">Division</Label>
                <Select
                  value={formData.division}
                  onValueChange={(value) => handleInputChange("division", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>

                  <SelectContent>
                    {divisions.map((d) => (
                      <SelectItem key={d._id} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_information">Notes</Label>
              <SunEditor
                setContents={linkifyHtml(formData.billing_information || "")}
                onChange={(content) => handleInputChange("billing_information", content)}
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
                {customer ? "Update Contact" : "Add Contact"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}