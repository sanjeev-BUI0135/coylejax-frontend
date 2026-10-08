import React, { useState } from "react";
import { addChecklist } from "../../../services/checklistService";
import {
  Plus, FileText, XCircle, CheckCircle
} from "lucide-react";
export default function AddChecklistForm({ projectId, onClose, refresh }) {
  const [name, setName] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await addChecklist({ name, status: "Open", project: projectId });
    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="model-container">
        {/* Header with Icon */}
        <div className="model-header">
          <div className="flex items-center  justify-center">

            <h3 className="font-bold">Add Checklist</h3>
          </div>
        </div>

        {/* Content */}
        <div className="model-body">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-3">
              Checklist Name
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter checklist name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="model-footer">
          <div className="flex justify-between items-center gap-5">
            <button
              onClick={onClose}
              className="flex items-center px-6 py-2.5 text-sm font-medium text-gray-700temp bg-white border border-gray-300 rounded-lg hover:bg-gray50-temp focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Add Checklist
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
