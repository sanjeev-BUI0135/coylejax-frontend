import React, { useState } from "react";
import { updateChecklist } from "../../../services/checklistService";
import {
  Plus, FileText, XCircle, CheckCircle
} from "lucide-react";
export default function EditChecklistForm({ checklist, onClose, refresh }) {
  const [name, setName] = useState(checklist.name);
  const [status, setStatus] = useState(checklist.status);

  const handleUpdate = async () => {
    await updateChecklist(checklist._id, { name, status });
    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
      <div className="model-container">
        <div className="model-header">
        <h3 className="font-bold">Edit Checklist</h3>
        </div>
        <div className="model-body">
        <label className="block mb-2">Checklist Name</label>
        <input
          type="text"
          className="border w-full p-2 mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="block mb-2">Status</label>
        <select
          className="border w-full p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="Open">Open</option>
          <option value="Processing">Processing</option>
          <option value="Completed">Completed</option>
          <option value="N/A">N/A</option>
        </select>
        </div>
        <div className="model-footer">
          <button
              onClick={onClose}
              className="flex items-center px-6 py-2.5 text-sm font-medium text-gray-700temp bg-white border border-gray-300 rounded-lg hover:bg-gray50-temp focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              className="flex items-center px-6 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Update
            </button>
        </div>
      </div>
    </div>
  );
}
