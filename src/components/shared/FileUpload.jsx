import React, { useState, useCallback, useRef } from 'react';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, File, X, Loader2, Paperclip } from 'lucide-react';

export default function FileUpload({ attachments, onAttachmentsChange }) {
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const newAttachments = [...(attachments || [])];

    for (const file of Array.from(files)) {
      try {
        const result = await UploadFile({ file });
        if (result && result.file_url) {
          newAttachments.push({
            file_name: file.name,
            file_url: result.file_url,
          });
        }
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
      }
    }

    onAttachmentsChange(newAttachments);
    setUploading(false);
  }, [attachments, onAttachmentsChange]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  const handleRemoveFile = (indexToRemove) => {
    const newAttachments = attachments.filter((_, index) => index !== indexToRemove);
    onAttachmentsChange(newAttachments);
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <Label>File Attachments</Label>
      <div
        onClick={openFileDialog}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 mr-2 animate-spin text-blue-500" />
            <p className="mt-2 text-sm text-gray-500temp ">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400temp" />
            <p className="mt-2 text-sm text-gray-500temp ">
              {isDragActive ? 'Drop the files here...' : 'Drag & drop files here, or click to select , Maximum file size: 10 MB'}
            </p>
          </div>
        )}
      </div>

      {attachments && attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Attached Files
          </h4>
          <ul className="space-y-2">
            {attachments.map((file, index) => (
              <li key={index} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                <div className="flex items-center gap-2 min-w-0">
                  <File className="w-4 h-4 text-gray-500temp  flex-shrink-0" />
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate"
                  >
                    {file.file_name}
                  </a>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => handleRemoveFile(index)}>
                  <X className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}