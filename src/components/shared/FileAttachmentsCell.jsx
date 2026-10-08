import React, { useState } from "react";
import { Download, File } from "lucide-react";
import Modal from "../ui/Modal";

export default function FileAttachmentsCell({ attachments, title = "Attachments" }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  const getFileName = (file) => file.name || file.file_name || file.original_name || "Attachment";
  const getFileUrl = (file) => {
    let url = file.url || file.file_url;
    if (url && url.includes('/uploads/')) {
      const uploadPath = url.substring(url.indexOf('/uploads/'));
      url = `${(import.meta.env.VITE_IMG || '').replace(/\/$/, '')}${uploadPath}`;
    }
    return url;
  };

  const downloadFile = async (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    const fileUrl = getFileUrl(file);
    const fileName = getFileName(file);
    if (!fileUrl) return;

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("CORS or network error");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.open(fileUrl, '_blank');
    }
  };

  const maxVisible = 2;
  const hasMore = attachments.length > maxVisible;
  const visibleAttachments = attachments.slice(0, maxVisible);

  return (
    <div className="flex flex-col gap-1 items-start text-left min-w-[120px]">
      {visibleAttachments.map((file, idx) => (
        <a
          key={idx}
          href={getFileUrl(file) || "#"}
          onClick={(e) => downloadFile(e, file)}
          className="text-blue-600 hover:text-blue-800 hover:underline text-xs flex items-center gap-1 max-w-[150px] truncate"
          title={`Click to download ${getFileName(file)}`}
        >
          <File className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{getFileName(file)}</span>
        </a>
      ))}

      {hasMore && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="text-blue-500 hover:text-blue-700 cursor-pointer text-xs font-semibold underline-offset-2 hover:underline mt-0.5"
        >
          +{attachments.length - maxVisible} more
        </button>
      )}

      {isOpen && (
        <Modal 
          open={isOpen} 
          onClose={() => setIsOpen(false)} 
          title={title}
        >
          <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
            {attachments.map((file, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2.5 rounded border border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800 transition"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title={getFileName(file)}>
                    {getFileName(file)}
                  </span>
                </div>
                <button
                  onClick={(e) => downloadFile(e, file)}
                  className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition"
                  title="Download File"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
