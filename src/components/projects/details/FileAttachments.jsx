import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, File, Download, Trash, FileText } from 'lucide-react';
import FileUpload from '../../shared/FileUpload';
import { Project } from '@/api/entities';
import Swal from 'sweetalert2';

export default function FileAttachments({ project, onUpdate, tabPermission }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [selectedVisibility, setSelectedVisibility] = useState(() => {
    const initial = {};
    (project.file_attachments || []).forEach((file, idx) => {
      initial[idx] = !!file.crew_visible;
    });
    return initial;
  });

  const visibleFiles =
    user.role_type === 'Crew View'
      ? project.file_attachments?.filter((f) => f.crew_visible)
      : project.file_attachments || [];

  const handleCheckboxChange = (index, checked) => {
    setSelectedVisibility((prev) => ({ ...prev, [index]: checked }));
  };

  const handleSaveVisibility = async () => {
    const hasChanges = project.file_attachments?.some((file, idx) => {
      return file.crew_visible !== (selectedVisibility[idx] === true);
    });

    const hasSelected = Object.values(selectedVisibility).some((v) => v === true);

    if (!hasChanges && !hasSelected) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'Please select at least one file to make visible to Crew before saving.',
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }
    try {
      Swal.fire({
        title: 'Updating Crew View...',
        text: 'Please wait while visibility settings are saved',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const updatedAttachments = project.file_attachments.map((file, idx) => ({
        ...file,
        crew_visible: selectedVisibility[idx] === true,
      }));

      await Project.update(project.id, { file_attachments: updatedAttachments });

      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: 'Crew visibility updated successfully.',
        timer: 1500,
        showConfirmButton: false,
      });

      onUpdate();
    } catch (error) {
      console.error('Error saving crew visibility:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed',
        text: 'Could not update crew visibility.',
      });
    }
  };


  const downloadFile = async (fileUrl, fileName) => {
    try {
      Swal.fire({
        title: 'Preparing Download...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      let actualUrl = fileUrl;
      if (actualUrl && actualUrl.includes('/uploads/')) {
        const uploadPath = actualUrl.substring(actualUrl.indexOf('/uploads/'));
        actualUrl = `${(import.meta.env.VITE_IMG || '').replace(/\/$/, '')}${uploadPath}`;
      }

      const response = await fetch(actualUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const extension = fileUrl.split('.').pop();
      const finalFileName = fileName.includes('.') ? fileName : `${fileName}.${extension}`;
      link.href = url;
      link.download = finalFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: 'success',
        title: 'Download Started!',
        text: `"${finalFileName}" is being downloaded`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'There was an error downloading the file. Please try again.',
      });
    }
  };

  const handleFileUpload = async (newAttachments) => {
    setUploading(true);

    Swal.fire({
      title: 'Uploading Files...',
      text: 'Please wait while your files are being uploaded',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const enrichedFiles = newAttachments.map(file => ({
        ...file,
        uploaded_by: user?.full_name || user?.email,
        uploaded_by_id: user?._id,
        uploaded_by_model: user?.role_type === "admin" ? "Client" : "User",
        createdAt: new Date()
      }));

      const updatedAttachments = [
        ...(project.file_attachments || []),
        ...enrichedFiles
      ];
      await Project.update(project.id, {
        file_attachments: updatedAttachments
      });

      Swal.fire({
        icon: 'success',
        title: 'Files Uploaded!',
        text: 'Your files have uploaded successfully',
        timer: 2000,
        showConfirmButton: false
      })

      setShowUpload(false);
      onUpdate();
    } catch (error) {
      console.error('Error uploading files:', error);

      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: 'There was an uploading your files. Please again.',
        confirmButtonText: 'OK'
      });

    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileIndex) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: 'Deleting File...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const updatedAttachments = project.file_attachments.filter((_, index) => index !== fileIndex);
      await Project.update(project.id, { file_attachments: updatedAttachments });

      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'File has been deleted successfully',
        timer: 2000,
        showConfirmButton: false,
      });

      onUpdate();
    } catch (error) {
      console.error('Error deleting file:', error);
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: 'There was an error deleting the file. Please try again.',
      });
    }
  };

  const getFileExtension = (fileName) => fileName.split('.').pop()?.toLowerCase() || '';

  const getFileTypeColor = (extension) => {
    const colors = {
      pdf: 'bg-red-100 text-red-800',
      doc: 'bg-blue-100 text-blue-800',
      docx: 'bg-blue-100 text-blue-800',
      xls: 'bg-green-100 text-green-800',
      xlsx: 'bg-green-100 text-green-800',
      jpg: 'bg-purple-100 text-purple-800',
      jpeg: 'bg-purple-100 text-purple-800',
      png: 'bg-purple-100 text-purple-800',
      gif: 'bg-purple-100 text-purple-800',
    };
    return colors[extension] || 'bg-gray-100 text-gray-800temp';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Project Files ({visibleFiles.length || 0})</CardTitle>
        {tabPermission?.add && (
          <Button onClick={() => setShowUpload(true)} size="sm">
            <Plus className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Upload Files</span>
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {showUpload && (
          <div className="space-y-4 mb-6 p-4 bg-gray50-temp rounded-lg">
            <FileUpload
              attachments={[]}
              onAttachmentsChange={(files) => handleFileUpload(files)}
              uploading={uploading}
            />
            <Button variant="outline" onClick={() => setShowUpload(false)} disabled={uploading}>
              Cancel
            </Button>
          </div>
        )}

        {visibleFiles.length === 0 && !showUpload && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Files Found</h3>
            <p className="text-gray-500temp mt-2">Upload files to see them here</p>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {visibleFiles.map((file, index) => (
            <div key={index} className="relative group">
              {tabPermission?.update && (
                <div className="absolute -top-3 -left-3 z-10 bg-white rounded-full p-1 shadow-sm">
                  <input
                    type="checkbox"
                    checked={selectedVisibility[index] || false}
                    onChange={(e) => handleCheckboxChange(index, e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                    title="Visible to Crew"
                  />
                </div>
              )}

              <div
                className={`border rounded-lg p-4 transition-all hover:shadow-md ${selectedVisibility[index] ? 'ring-2 ring-green-400' : ''
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="w-8 h-8 text-gray-400temp flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate" title={file.file_name}>
                        {file.file_name}
                      </p>
                      <Badge className={`mt-1 ${getFileTypeColor(getFileExtension(file.file_name))}`}>
                        {getFileExtension(file.file_name).toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {tabPermission?.update && (<Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file.file_url, file.file_name)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>)}
                    {(tabPermission?.delete) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {(tabPermission?.update) && visibleFiles.length > 0 && (
          <div className="flex justify-end mt-6">
            <Button onClick={handleSaveVisibility}>Save Crew View</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
