import React from "react";
import { CheckCircle, Check } from "lucide-react";

export default function ApprovalPopup({
  isOpen,
  onClose,
  projectName,
  projectId,
  onNavigateToMaterialOrders,
}) {
  if (!isOpen) return null;

  const handleOk = () => {
    onClose();

    const id =
      projectId ||
      new URLSearchParams(window.location.search).get("id") ||
      window.location.pathname.split("/").pop();

    if (id && onNavigateToMaterialOrders) {
      onNavigateToMaterialOrders(id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[500px]">
        <div className="bg-[#bcdbff] text-black text-center text-xl font-bold px-6 py-4 rounded-t-xl">
          Material Order Approved
        </div>

        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-500 mb-6">
            <Check className="w-10 h-10 text-white" />
          </div>

          <p className="text-black text-lg">
            A new material work order has been approved for Project{" "}
            <span className="font-bold text-black">{projectName}</span>.
          </p>
        </div>

        <div className="flex justify-center pb-6">
          <button
            onClick={handleOk}
            className="px-6 py-2 bg-[#0c54aa] hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}