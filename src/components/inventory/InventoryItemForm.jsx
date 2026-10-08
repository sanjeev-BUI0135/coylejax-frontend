import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Select from "react-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Upload, FileText, Info, Search } from "lucide-react";
import { UploadFile } from "@/api/integrations";
import CustomDatePicker from "../ui/CustomDatePicker";
import masterDataService from "@/services/masterDataService";
import { Supplier } from "../../api/entities";
import localApi from "../../services/localApi";
import { renderTextWithLinks } from "@/components/ui/renderTextWithLinks";

export default function InventoryItemForm({
  item,
  inventoryItems,
  onSubmit,
  onCancel,
  prefillData,
  isProjectSpecific = false,
}) {
  const [originalUnitCost, setOriginalUnitCost] = useState(
    item ? parseFloat(item.unit_cost) : null
  );
  const [formData, setFormData] = useState(
    item
      ? {
        ...item,
        received_date: item.received_date
          ? new Date(item.received_date).toISOString().split("T")[0]
          : "",
        previous_unit_cost: item.previous_unit_cost || null,
      }
      : prefillData
        ? {
          item_name: prefillData.item_name || "",
          project_id: prefillData.project_id || "",
          description: prefillData.description || "",
          category: prefillData.category || "materials",
          quantity: prefillData.quantity || 0,
          unit: prefillData.unit || "each",
          unit_cost: prefillData.unit_cost || 0,
          location: prefillData.location || "main_warehouse",
          supplier: "",
          reorder_level: 0,
          received_date: prefillData.received_date || "",
          notes: "",
          item_image_url: "",
          receipt: null,
          previous_unit_cost: null,
        }
        : {
          item_name: "",
          project_id: "",
          description: "",
          category: "materials",
          quantity: 0,
          unit: "each",
          unit_cost: 0,
          location: "main_warehouse",
          supplier: "",
          reorder_level: 0,
          received_date: "",
          notes: "",
          item_image_url: "",
          receipt: null,
          previous_unit_cost: null,
        }
  );

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    formData.item_image_url || null
  );
  const [receiptFile, setReceiptFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingItem, setExistingItem] = useState(null);
  const [addToExisting, setAddToExisting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isNotesEditing, setIsNotesEditing] = useState(false);
  const [me, setMe] = useState([]);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const filterCategories = categories.filter((f => f.created_by === user.id || f.created_by === me.created_by))
  const filterLocations = locations.filter((f => f.created_by === user.id || f.created_by === me.created_by))
  const filterSuppliers = suppliers.filter((f => f.created_by === user.id || f.created_by === me.created_by))

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
    if (!item) {
      const itemName = formData.item_name;
      if (itemName) {
        const trimmedName = itemName.trim().toLowerCase();
        if (trimmedName) {
          const found = inventoryItems.find(
            (i) => i.item_name && i.item_name.toLowerCase() === trimmedName
          );
          setExistingItem(found || null);
          if (!found) {
            setAddToExisting(false);
          }
        } else {
          setExistingItem(null);
        }
      } else {
        setExistingItem(null);
      }
    }
  }, [formData.item_name, inventoryItems, item]);

  useEffect(() => {
    masterDataService
      .getAll("categories")
      .then((res) => {
        const activeSorted = res.data
          .filter((item) => item.status === "active")
          .sort((a, b) => b.sort_order - a.sort_order);
        setCategories(activeSorted);
      })
      .catch((err) => console.error("Failed to load categories:", err));

    masterDataService
      .getAll("locations")
      .then((res) => {
        const activeSorted = res.data
          .filter((item) => item.status === "active")
          .sort((a, b) => b.sort_order - a.sort_order);
        setLocations(activeSorted);
      })
      .catch((err) => console.error("Failed to load locations:", err));

    Supplier.list()
      .then((res) => {
        setSuppliers(res);
      })
      .catch((err) => console.error("Failed to load suppliers:", err));
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let imageUrl = formData.item_image_url;
    let receiptData = formData.receipt;

    if (imageFile) {
      try {
        const { file_url } = await UploadFile({ file: imageFile });
        imageUrl = file_url;
      } catch (error) {
        console.error("Image upload failed:", error);
        alert("Image upload failed. Please try again.");
        setIsUploading(false);
        return;
      }
    }

    if (receiptFile) {
      try {
        const { file_url } = await UploadFile({ file: receiptFile });
        receiptData = { file_name: receiptFile.name, file_url };
      } catch (error) {
        console.error("Receipt upload failed:", error);
        alert("Receipt upload failed. Please try again.");
        setIsUploading(false);
        return;
      }
    }

    const parsedData = {
      quantity: parseFloat(formData.quantity) || 0,
      unit_cost: parseFloat(formData.unit_cost) || 0,
      reorder_level: parseFloat(formData.reorder_level) || 0,
    };

    if (addToExisting && existingItem) {
      const existingUnitCost = parseFloat(existingItem.unit_cost) || 0;
      const newUnitCost = parsedData.unit_cost || existingUnitCost;
      const updateData = {
        ...existingItem,
        quantity: (existingItem.quantity || 0) + parsedData.quantity,
        unit_cost: newUnitCost,
        previous_unit_cost:
          existingUnitCost !== newUnitCost
            ? existingUnitCost
            : existingItem.previous_unit_cost,
        supplier: formData.supplier || existingItem.supplier,
        received_date:
          formData.received_date || new Date().toISOString().split("T")[0],
        notes: `${existingItem.notes || ""
          }\n[${new Date().toLocaleDateString()}] Added ${formData.quantity} ${formData.unit || "units"
          }. Notes: ${formData.notes}`.trim(),
        receipt: receiptData || existingItem.receipt,
        item_image_url: imageUrl || existingItem.item_image_url,
      };
      // await onSubmit(updateData, existingItem.id);
    } else {
      const submitData = {
        ...formData,
        ...parsedData,
        item_image_url: imageUrl,
        receipt: receiptData,
      };

      if (item && originalUnitCost !== null) {
        const newUnitCost = parsedData.unit_cost;
        if (newUnitCost !== originalUnitCost) {
          submitData.previous_unit_cost = originalUnitCost;
        } else {
          submitData.previous_unit_cost = item.previous_unit_cost;
        }
      } else if (!item) {
        submitData.previous_unit_cost = null;
      }
      await onSubmit(submitData, item ? item._id : null);
    }
    setIsUploading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, item_image_url: "" }));
    const fileInput = document.getElementById("item_image");
    if (fileInput) fileInput.value = "";
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setFormData((prev) => ({ ...prev, receipt: null }));
    const fileInput = document.getElementById("receipt");
    if (fileInput) fileInput.value = "";
  };

  const formDisabled = isUploading || (existingItem && addToExisting);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-2xl">
        <CardHeader
          className={`flex flex-row items-center justify-between rounded-t-xl 
  ${isProjectSpecific
              ? "bg-blue-200 text-black"
              : "bg-blue-200 dark:bg-gray-900"
            }`}
        >
          <CardTitle>
            {isProjectSpecific
              ? "Add New Project Specific Material"
              : item
                ? "Edit Inventory Item"
                : "Add New Inventory Item"}
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
          }} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="item_name">
                Item Name
                {!formData.item_name && (
                  <span className="text-red-500"> *</span>
                )}
              </Label>
              <Input
                id="item_name"
                value={formData.item_name}
                onChange={(e) => handleInputChange("item_name", e.target.value)}
                placeholder="e.g. Steel Rebar, Safety Helmet"
                required
                disabled={isUploading || !!item || isProjectSpecific}
              />
            </div>

            {existingItem && !item && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Existing Item Found!</AlertTitle>
                <AlertDescription>
                  An item named "{existingItem.item_name}" already exists with a
                  quantity of {existingItem.quantity}.
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="add-to-existing"
                      checked={addToExisting}
                      onCheckedChange={setAddToExisting}
                    />
                    <label
                      htmlFor="add-to-existing"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Add the new quantity to the existing stock.
                    </label>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!isProjectSpecific && (<div className="space-y-2">
              <Label htmlFor="item_image">Item Image</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm transition-colors"
                      disabled={isUploading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400temp" />
                  </div>
                )}
                <Input
                  id="item_image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                  disabled={isUploading}
                />
              </div>
            </div>)}

            <div className="space-y-2">
              <Label htmlFor="receipt">Packing Slip / Receipt</Label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-gray-400temp" />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    id="receipt"
                    type="file"
                    onChange={handleReceiptChange}
                    className="flex-1"
                    disabled={isUploading}
                  />
                  {receiptFile && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500temp">
                        Selected: {receiptFile.name}
                      </p>
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveReceipt} className="text-red-500 h-6 px-2 py-0">
                        <X className="w-4 h-4"/>
                      </Button>
                    </div>
                  )}
                  {!receiptFile && formData.receipt && (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500temp">
                        Current:{" "}
                        <a
                          href={formData.receipt.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {formData.receipt.file_name}
                        </a>
                      </p>
                      <Button type="button" variant="ghost" size="sm" onClick={handleRemoveReceipt} className="text-red-500 h-6 px-2 py-0">
                        <X className="w-4 h-4"/>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description{" "}
                {!formData.description && (
                  <span className="text-red-500"> *</span>
                )}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Detailed specifications, size, grade, etc."
                rows={3}
                required
                disabled={formDisabled}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>

                <Select
                  options={filterCategories.map((d) => ({
                    value: d.value,
                    label: d.display_name,
                  }))}
                  value={
                    formData.category
                      ? (() => {
                        const found = filterCategories.find(cat => cat.value === formData.category);
                        return found
                          ? { value: found.value, label: found.display_name }
                          : { value: formData.category, label: formData.category };
                      })()
                      : null
                  }
                  onChange={(selected) => handleInputChange("category", selected?.value)}
                  className="w-full"
                  classNamePrefix="select"
                />
              </div>

              <div className="space-y-2 relative">
                <Label htmlFor="location">Location</Label>

                <Select
                  id="location"
                  options={filterLocations.map((d) => ({
                    value: d.value,
                    label: d.display_name,
                  }))}
                  value={
                    formData.location
                      ? {
                        value: formData.location,
                        label:
                          filterLocations.find((d) => d.value === formData.location)
                            ?.display_name || formData.location
                      }
                      : null
                  }
                  onChange={(selected) =>
                    handleInputChange("location", selected?.value)
                  }
                  className="w-full"
                  classNamePrefix="select"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity {addToExisting && existingItem ? "(to add)" : ""}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", e.target.value)
                  }
                  placeholder="0"
                  required
                  disabled={isUploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => handleInputChange("unit", e.target.value)}
                  placeholder="each, ft, lbs"
                  required
                  disabled={formDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) =>
                    handleInputChange("unit_cost", e.target.value)
                  }
                  placeholder="0.00"
                  required
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">


              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Select
                  options={filterSuppliers.map((d) => ({
                    value: d.company_name,
                    label: d.company_name,
                  }))}
                  value={
                    formData.supplier
                      ? {
                        value: formData.supplier,
                        label: formData.supplier
                      }
                      : null
                  }
                  onChange={(selected) => handleInputChange("supplier", selected?.value)}
                  className="w-full"
                  classNamePrefix="select"
                />

              </div>

              <div className="space-y-2">
                <Label htmlFor="reorder_level">
                  Reorder Level{!formData.reorder_level}
                </Label>
                <Input
                  id="reorder_level"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.reorder_level}
                  onChange={(e) =>
                    handleInputChange("reorder_level", e.target.value)
                  }
                  placeholder="0"
                  required
                  disabled={formDisabled}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="received_date">
                Received Date{!formData.received_date}
              </Label>
              <CustomDatePicker
                id="received_date"
                value={formData.received_date}
                minDate={new Date().toISOString().split("T")[0]}
                onChange={(value) => handleInputChange("received_date", value)}
                required
                disabled={isUploading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="notes">Notes</Label>
                {item && (
                  <div className="flex gap-2">
                    {isNotesEditing ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setIsNotesEditing(false)}
                        >
                          Save
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setIsNotesEditing(false);
                            handleInputChange("notes", item?.notes || "");
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsNotesEditing(true)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {/* CREATE MODE */}
              {!item && (
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes"
                  rows={3}
                  disabled={isUploading}
                />
              )}
              {/* EDIT MODE */}
              {item && (
                <>
                  {isNotesEditing ? (
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange("notes", e.target.value)}
                      rows={3}
                      disabled={isUploading}
                    />
                  ) : (
                    <div className="border rounded p-2 min-h-[80px] bg-gray-100 dark:bg-gray-800">
                      {formData.notes
                        ? renderTextWithLinks(formData.notes)
                        : "No notes available"}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {item
                      ? "Update Item"
                      : addToExisting && existingItem
                        ? "Add to Stock"
                        : "Add Item"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
