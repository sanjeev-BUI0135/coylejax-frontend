import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InventoryItem } from "@/api/entities";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { X, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import localApi from "../../services/localApi";

export default function BulkInventoryUpload({ onSuccess, onCancel }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadResults, setUploadResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "text/csv" || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setUploadStatus(null);
        setUploadResults(null);
      } else {
        setUploadStatus({ type: 'error', message: 'Please select a CSV file.' });
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setUploadStatus(null);
        setUploadResults(null);
      } else {
        setUploadStatus({ type: 'error', message: 'Please select a CSV file.' });
      }
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "item_name", "description", "category", "quantity", "unit", "unit_cost",
      "location", "supplier", "reorder_level", "received_date", "notes"
    ];

    const sampleData = [
      "Steel Rebar #4", "Grade 60 steel rebar, 20ft length", "materials", "100", "pieces", "12.50", "Main Warehouse", "Steel Supply Co", "10", "2024-01-15", "Standard construction grade",
      "Concrete Mix", "Fast-setting concrete mix, 50lb bags", "materials", "50", "bags", "8.75", "Storage Shed", "Concrete Plus", "5", "2024-01-16", "Quick set formula",
      "Safety Helmet", "ANSI Z89.1 compliant hard hat, white", "equipment", "25", "each", "35.00", "Equipment Room", "Safety First", "5", "2024-01-17", "Class E electrical protection"
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.reduce((rows, _, index) => {
        if (index % headers.length === 0) {
          const rowData = sampleData.slice(index, index + headers.length);
          rows.push(rowData.join(','));
        }
        return rows;
      }, [])
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const handleUpload = async () => {
    if (!file) {
      setUploadStatus({ type: "error", message: "Please select a file first." });
      return;
    }

    setUploading(true);
    setUploadStatus({
      type: "info",
      message: "Uploading file and extracting data...",
    });

    try {
      const { file_url } = await localApi.integrations.UploadFile({ file });

      const jsonSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            item_name: { type: "string" },
            description: { type: "string" },
            category: {
              type: "string",
              enum: ["materials", "equipment", "tools", "supplies", "other"],
              default: "materials",
            },
            quantity: { type: "number" },
            unit: { type: "string", default: "each" },
            unit_cost: { type: "number", default: 0 },
            location: { type: "string", default: "main_warehouse" },
            supplier: { type: "string" },
            reorder_level: { type: "number", default: 0 },
            received_date: { type: "string" },
            notes: { type: "string" },
          },
          required: ["item_name", "quantity"],
        },
      };

      const extractResult =
        await localApi.integrations.ExtractDataFromUploadedFile({
          file_url,
          json_schema: jsonSchema,
        });

      if (extractResult.status === "error") {
        setUploadStatus({
          type: "error",
          message: extractResult.details || "File extraction failed",
        });
        return;
      }

      const inventoryData = extractResult.output;

      if (!Array.isArray(inventoryData) || inventoryData.length === 0) {
        setUploadStatus({
          type: "error",
          message: "No valid inventory data found in file.",
        });
        return;
      }

      const cleanedItems = inventoryData
        .map((item) => {
          if (!item.item_name) return null;

          return {
            item_name: item.item_name.trim(),
            description: item.description || "",
            category: item.category || "materials",
            quantity: Number(item.quantity) || 0,
            unit: item.unit || "each",
            unit_cost: Number(item.unit_cost) || 0,
            reorder_level: Number(item.reorder_level) || 0,
            location: item.location || "main_warehouse",
            supplier: item.supplier || "",
            notes: item.notes || "",
            received_date: item.received_date || null,
          };
        })
        .filter(Boolean);

      if (cleanedItems.length === 0) {
        setUploadStatus({
          type: "error",
          message: "All rows were invalid after cleaning.",
        });
        return;
      }

      setUploadStatus({
        type: "info",
        message: `Uploading ${cleanedItems.length} inventory items...`,
      });

      /*SINGLE BULK API CALL */
      const bulkResult = await localApi.request(
        "/inventoryitems/bulk",
        {
          method: "POST",
          body: JSON.stringify({ items: cleanedItems }),
        }
      );

      setUploadResults({
        total: inventoryData.length,
        created: bulkResult.inserted || cleanedItems.length,
        skipped:
          inventoryData.length -
          (bulkResult.inserted || cleanedItems.length),
      });

      setUploadStatus({
        type: "success",
        message: `Successfully uploaded ${bulkResult.inserted} inventory items.`,
      });

      setFile(null); // Clear file to prevent double upload
      setTimeout(() => onSuccess(), 2000);
    } catch (error) {
      console.error("Bulk upload failed:", error);
      setUploadStatus({
        type: "error",
        message:
          error?.message ||
          "Bulk upload failed. Please check server logs.",
      });
    } finally {
      setUploading(false);
    }
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
          <CardTitle>Bulk Inventory Upload</CardTitle>
          <Button variant="ghost" size="xsm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <div className="" style={{ height: "-webkit-fill-available" }}>
          <CardContent className="max-h-[80vh] overflow-y-auto mt-4 flex flex-col gap-5">
            <div className="bg-blue-50 p-4 rounded-lg dark:bg-gray-900">
              <h4 className="font-semibold text-blue-900 mb-2 dark:text-white">CSV Format Requirements:</h4>
              <ul className="text-sm text-blue-800 space-y-1 dark:text-white">
                <li>• <strong>item_name</strong> (required): Main item name/title</li>
                <li>• <strong>quantity</strong> (required): Quantity in stock</li>
                <li>• <strong>description</strong>: Detailed specifications</li>
                <li>• <strong>unit_cost</strong>: Cost per unit</li>
              </ul>
            </div>
            <div className="text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Inventory CSV File</h3>
              <p className="text-gray-600temp mb-4">
                Upload a CSV file with your inventory data to quickly add multiple items.
              </p>

              <Button variant="outline" onClick={downloadTemplate} className="mb-4">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 transition-colors ${dragActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-gray-900'
                  : 'border-gray-300 hover:border-gray-400'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <Upload className={`w-12 h-12 ${dragActive ? 'text-blue-500' : 'text-gray-400temp'}`} />

                {file ? (
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">File Selected</span>
                    </div>
                    <p className="text-sm text-gray-600temp">{file.name}</p>
                    <p className="text-xs text-gray-500temp mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="mt-2 text-red-600 hover:text-red-700"
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600temp mb-2">
                      Drag and drop your CSV file here, or
                    </p>
                    <label htmlFor="csvFile">
                      <Button variant="outline" className="cursor-pointer" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Browse Files
                        </span>
                      </Button>
                    </label>
                    <input
                      id="csvFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500temp mt-2">
                      Only CSV files are accepted
                    </p>
                  </div>
                )}
              </div>
            </div>

            {uploadStatus && (
              <Alert className={
                uploadStatus.type === 'error' ? 'border-red-200 bg-red-50' :
                  uploadStatus.type === 'success' ? 'border-green-200 bg-green-50' :
                    'border-blue-200 bg-blue-50 dark:bg-gray-900'
              }>
                {uploadStatus.type === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                {uploadStatus.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                {uploadStatus.type === 'info' && <Upload className="h-4 w-4 text-blue-500" />}
                <AlertDescription className={
                  uploadStatus.type === 'error' ? 'text-red-700' :
                    uploadStatus.type === 'success' ? 'text-green-700' :
                      'text-blue-700'
                }>
                  {uploadStatus.message}
                </AlertDescription>
              </Alert>
            )}

            {uploadResults && (
              <div className="bg-gray50-temp p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Upload Results:</h4>
                <div className="space-y-1 text-sm">
                  <p>Total rows processed: {uploadResults.total}</p>
                  <p className="text-green-600">Successfully created: {uploadResults.created}</p>
                  {uploadResults?.errors?.length > 0 && (
                    <div>
                      <p className="text-red-600">Errors: {uploadResults.errors.length}</p>
                      <div className="mt-2 max-h-32 overflow-y-auto">
                        {uploadResults.errors.slice.map((error, index) => (
                          <p key={index} className="text-red-600 text-xs">{error}</p>
                        ))}
                        {uploadResults.errors.length > 5 && (
                          <p className="text-red-600 text-xs">... and {uploadResults.errors.length - 5} more errors</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading || uploadStatus?.type === 'success'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Inventory
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}