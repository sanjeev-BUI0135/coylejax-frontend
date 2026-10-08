import React, { useState } from "react";
import { X, XCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RejectPopup({
  isOpen,
  onClose,
  projectName,
  projectId,
  onReject,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleReject = () => {
    if (!reason.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    setError("");
    onClose();

    if (onReject) {
      onReject(projectId, reason);
    }

    const id =
      projectId ||
      new URLSearchParams(window.location.search).get("id") ||
      window.location.pathname.split("/").pop();

 if (id) {
      navigate(`/projects/${id}?tab=material_orders`);
    }

  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] animate-fadeIn">
        <div className="bg-[
#bcdbff] text-black text-center text-2xl font-bold px-6 py-4 rounded-t-2xl">
          Material Order Rejected
        </div>
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500 mb-6">
            <X className="w-10 h-10 text-white" />
          </div>

          <p className="text-black text-xl font-medium mb-4">
            Please provide a reason for rejection
          </p>
          <textarea
            className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2 transition ${
              error 
                ? "border-red-500 focus:ring-red-400"
                : "border-gray-300 focus:ring-blue-300"
            }`}
            rows="4"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason here..."
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        <div className="flex justify-center gap-4 pb-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-medium shadow transition flex items-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            <span>Cancel</span>
          </button>
          <button
            onClick={handleReject}
            className="px-6 py-2 bg-[#0c54aa] hover:bg-blue-700 text-white rounded-lg font-medium shadow transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!reason.trim()}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Reject</span>
          </button>
        </div>
      </div>
    </div>
  );
}