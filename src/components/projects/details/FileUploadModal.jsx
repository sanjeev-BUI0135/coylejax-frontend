import React, { useState, useEffect } from "react";
import { getChecklist, uploadFiles, deleteFile } from "../../../services/checklistService";
import { Download, Trash, Upload, XCircle, FileText } from "lucide-react";
import Swal from "sweetalert2";


export default function UploadModal({ checklistId, mode = "upload", onClose }) {
  const [files, setFiles] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);

  const getFileURL = (filePath) => {
    if (!filePath) return "";
    try {
      let safePath = filePath.trim();
      
      // Fix for Mixed Content issue (http URL on https site)
      if (safePath.startsWith('http://') && window.location.protocol === 'https:') {
        safePath = safePath.replace('http://', 'https://');
      }

      // If it's a relative path without a leading slash, ensure it uses the absolute path relative to root
      if (!safePath.startsWith('http') && !safePath.startsWith('/')) {
        safePath = '/' + safePath;
      }

      // Avoid double encoding if already encoded
      const parts = safePath.split("/");
      let fileName = parts.pop();
      if (!fileName.includes('%')) {
        fileName = encodeURIComponent(fileName);
      }
      return [...parts, fileName].join("/");
    } catch {
      return filePath;
    }
  };

  useEffect(() => {
    if (checklistId) fetchFiles();
  }, [checklistId]);

  const fetchFiles = async () => {
    try {
      const res = await getChecklist(checklistId);
      setFiles(res.files || []);
    } catch (err) {
      console.error("Failed to fetch files:", err);
    }
  };

  const handleUpload = async (e) => {
    e?.preventDefault();
    if (!newFiles.length) return;

    const formData = new FormData();
    Array.from(newFiles).forEach((file) => formData.append("files", file));

    try {
      await uploadFiles(checklistId, formData);
      setNewFiles([]);
      await fetchFiles();

      // Show success alert
      await Swal.fire({
        icon: "success",
        title: "Files uploaded successfully",
        showConfirmButton: false,
        timer: 1500,
      });

      // Close the modal after alert
      onClose();
    } catch (err) {
      console.error("Upload failed:", err);
      Swal.fire({
        icon: "error",
        title: "Upload failed",
        text: err.message || "Something went wrong",
      });
    }
  };


  const handleDeleteFile = async (index) => {
    try {
      await deleteFile(checklistId, index);
      fetchFiles();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 w-[500px] max-w-[90%] rounded-lg shadow-lg relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center border-b dark:border-slate-700 pb-4 mb-4 w-full bg-blue-100 dark:bg-slate-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white pt-4">
            {mode === "view" ? "View Files" : "Upload Files"}
          </h2>
        </div>

        {/* Upload input */}
        {mode === "upload" && (
          <div className="mb-4 px-5">
            <div
              onClick={() => document.getElementById('file-upload-input').click()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  setNewFiles(e.dataTransfer.files);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            >
              <input
                id="file-upload-input"
                type="file"
                multiple
                onChange={(e) => setNewFiles(e.target.files)}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Drag & drop files here, or click to select
                </p>
                {newFiles && newFiles.length > 0 && (
                  <p className="mt-2 text-sm font-medium text-blue-600">
                    {newFiles.length} file(s) selected
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Files list */}
        <div className="space-y-4 mb-4 p-5">
          {files.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <FileText className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium">No files uploaded</p>
            </div>
          ) : (
            files.map((file, index) => {
              const fileURL = getFileURL(file.filePath);
              const isImage = file.fileType?.startsWith("image/");

              return (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-slate-700 p-3 rounded-lg flex items-center gap-3 bg-gray-50 dark:bg-slate-800 relative"
                >
                  {isImage ? (
                    <img
                      src={fileURL}
                      alt={file.fileName}
                      className="w-[70px] h-[70px] object-cover rounded cursor-pointer"
                      onClick={() => setPreviewImage(fileURL)}
                    />
                  ) : (
                    <div className="w-[70px] h-[70px] bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center text-sm text-gray-600 dark:text-gray-300 text-center px-2">
                      {file.fileName.split(".").pop().toUpperCase()}
                    </div>
                  )}

                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {file.fileName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Download Icon */}
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const response = await fetch(fileURL);
                          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.setAttribute('download', file.fileName);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error("Download failed:", error);
                          // Fallback to opening in new tab
                          window.open(fileURL, '_blank');
                        }
                      }}
                      title="Download"
                      className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Download className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>

                    {/* Delete Icon */}
                    {mode === "upload" && (
                      <button
                        onClick={() => handleDeleteFile(index)}
                        title="Delete"
                        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-red-500"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Buttons */}
       <div className="flex justify-between mt-6 border-t dark:border-slate-700 p-5">
  <button
    onClick={onClose}
    className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
  >
    Cancel
  </button>
  {mode === "upload" && (
    <button
      onClick={handleUpload}
      className="flex item-center px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
    >
      Upload Files
    </button>
  )}
</div>

        {/* Image Preview Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            onClick={() => setPreviewImage(null)}
          >
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[90vh] max-w-[90vw] rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
}
