import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Upload, Download, AlertCircle, CheckCircle, FileUp, FileSpreadsheet } from "lucide-react";
import Swal from "sweetalert2";

export default function CustomerBulkUpload({ onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
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
            } else {
                Swal.fire("Invalid File", "Please upload a CSV file only.", "error");
            }
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type === "text/csv" || selectedFile.name.endsWith('.csv')) {
                setFile(selectedFile);
            } else {
                Swal.fire("Invalid File", "Please upload a CSV file only.", "error");
            }
        }
    };

    const downloadTemplate = () => {
        const headers = [
            "company_name",
            "contact_name",
            "email",
            "phone",
            "address",
            "city",
            "state",
            "zip_code",
            "customer_type",
            "billing_information"
        ];

        const sampleData = [
            [
                "ABC Corporation",
                "John Doe",
                "john@abccorp.com",
                "(555) 123-4567",
                "123 Main St",
                "Springfield",
                "IL",
                "62701",
                "commercial",
                "Net 30 payment terms"
            ],
            [
                "XYZ Industries",
                "Jane Smith",
                "jane@xyzind.com",
                "(555) 987-6543",
                "456 Oak Ave",
                "Chicago",
                "IL",
                "60601",
                "industrial",
                "Payment upon delivery"
            ]
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
        link.setAttribute("download", "customer_upload_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleUpload = async () => {
        if (!file) {
            return Swal.fire("No File Selected", "Please select a CSV file to upload.", "warning");
        }

        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_BASE}/customers/bulk-upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Upload failed');
            }
            let message = `Successfully uploaded ${data.count} contact(s).`;

            if (data.errors && data.errors.length > 0) {
                message += `\n\nErrors encountered: ${data.errors.length}`;

                const errorDetails = data.errors.map(err =>
                    `Line ${err.line}: ${err.error}`
                ).join('\n');

                await Swal.fire({
                    title: 'Upload Completed with Errors',
                    html: `
            <p class="text-green-600">${data.count} contacts uploaded successfully.</p>
            <p class="text-red-600 font-semibold mt-2">${data.errors.length} errors encountered:</p>
            <div class="text-left mt-2 p-3 bg-red-50 rounded max-h-48 overflow-y-auto">
              <pre class="text-sm">${errorDetails}</pre>
              ${data.errors.length > 5 ? '<p class="text-sm mt-2">...and more</p>' : ''}
            </div>
          `,
                    icon: 'warning',
                    confirmButtonColor: '#3085d6'
                });
            } else {
                await Swal.fire({
                    title: 'Success!',
                    text: message,
                    icon: 'success',
                    confirmButtonColor: '#3085d6'
                });
            }

            onSuccess();
            onClose();

        } catch (error) {
            console.error('Upload error:', error);
            Swal.fire({
                title: 'Upload Failed',
                text: error.message || 'An error occurred during upload.',
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
            >
                <Card className="w-full max-w-2xl">
                    <CardHeader className="flex flex-row items-center justify-between bg-blue-200 dark:bg-gray-900 rounded-t-xl">
                        <CardTitle>Bulk Upload Contacts</CardTitle>
                        <Button variant="ghost" size="xsm" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="max-h-[80vh] overflow-y-auto mt-4 flex flex-col gap-5">
                        <div className="bg-blue-50 dark:bg-gray-900 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0 dark:text-white" />
                                <div className="text-sm text-blue-800 dark:text-white">
                                    <p className="font-semibold mb-2">Upload Instructions:</p>
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Download the CSV template below</li>
                                        <li>Fill in your contact data (all fields required)</li>
                                        <li>
                                            Fill in your contact data. The CSV must include the following required fields:
                                            <ul className="list-disc ml-6 mt-1 space-y-1">
                                                <li>company_name</li>
                                                <li>contact_name</li>
                                                <li>email</li>
                                                <li>phone</li>
                                            </ul>
                                        </li>
                                        <li>Upload the completed CSV file</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center">
                            <div>
                                <FileSpreadsheet className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                                <h3 className="text-lg font-semibold mb-2">Upload Contacts CSV File</h3>
                                <p className="text-gray-600temp mb-4">
                                    Upload a CSV file with your Contacts data to quickly add multiple items.
                                </p>
                            </div>

                            <Button
                                variant="outline"
                                onClick={downloadTemplate}
                                className="gap-2 mt-2"
                            >
                                <Download className="w-4 h-4" />
                                Download CSV Template
                            </Button>
                        </div>
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 transition-colors ${dragActive
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center justify-center gap-4">
                                <FileUp className={`w-12 h-12 ${dragActive ? 'text-blue-500' : 'text-gray-400temp'}`} />

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
                                        <label htmlFor="file-upload">
                                            <Button variant="outline" className="cursor-pointer" asChild>
                                                <span>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Browse Files
                                                </span>
                                            </Button>
                                        </label>
                                        <input
                                            id="file-upload"
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

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={onClose} disabled={uploading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Contacts
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}