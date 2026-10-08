import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";

export default function BulkUploadModal({ onUpload, onCancel }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setError("");

    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError("Please select a CSV file");
        setSelectedFile(null);
        return;
      }

      if (file.size > 5 * 1024 * 1024) { 
        setError("File size must be less than 5MB");
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }
    onUpload(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const headers = ["company_name", "contact_name", "email", "phone", "address"];
    const sampleData = [
      ["ABC Supplies Inc", "John Doe", "john@abc.com", "555-0101", "123 Main St, City, State"],
      ["XYZ Trading Co", "Jane Smith", "jane@xyz.com", "555-0102", "456 Oak Ave, City, State"]
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(field => {
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "suppliers_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 "
    >
      <Card className="w-full max-w-2xl overflow-auto max-h-full">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle>Bulk Upload Suppliers</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="space-y-6">

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Upload Instructions</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>Download the CSV template below</li>
                <li>Fill in your supplier information</li>
                <li>Upload the completed CSV file</li>
                <li>Required fields: company_name, contact_name, email, phone</li>
              </ul>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">CSV Template</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Download the template to get started</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="bg-white dark:bg-slate-900 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-slate-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload CSV File
              </label>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${selectedFile ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="w-12 h-12 text-green-600 dark:text-green-400" />
                    <p className="font-medium text-green-900 dark:text-green-200">{selectedFile.name}</p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setError("");
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-12 h-12 text-gray-400temp" />
                    <p className="font-medium text-gray-900temp">Click to upload CSV file</p>
                    <p className="text-sm text-gray-600temp">or drag and drop</p>
                    <p className="text-xs text-gray-500temp">CSV files only (max 5MB)</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Suppliers
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}