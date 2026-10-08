// import React, { useState } from "react";
// import { X, XCircle, CheckCircle } from "lucide-react";

// export default function RejectReasonPopup({ isOpen, onClose, onConfirm }) {
//   const [reason, setReason] = useState("");
//   const [error, setError] = useState("");

//   if (!isOpen) return null;

//   const handleConfirm = () => {
//     if (!reason.trim()) {
//       setError("Rejection reason is required.");
//       return;
//     }
//     onConfirm(reason);
//     setReason("");
//     setError("");
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="bg-white rounded-2xl shadow-2xl w-[500px] animate-fadeIn">
//         <div className="bg-[#bcdbff] text-black text-center text-2xl font-bold px-6 py-4 rounded-t-2xl">
//           Requirement Rejection
//         </div>

//         <div className="p-8 flex flex-col items-center text-center">
//           <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-500 mb-6">
//             <X className="w-10 h-10 text-white" />
//           </div>

//           <p className="text-black text-lg font-medium mb-4">
//             Please provide a reason for rejection
//           </p>

//           <textarea
//             className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2 transition ${
//               error
//                 ? "border-red-500 focus:ring-red-400"
//                 : "border-gray-300 focus:ring-blue-300"
//             }`}
//             rows="4"
//             value={reason}
//             onChange={(e) => setReason(e.target.value)}
//             placeholder="Enter reason here..."
//           />
//           {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
//         </div>

//         <div className="flex justify-center gap-4 pb-6">
//           <button
//             onClick={onClose}
//             className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-medium shadow transition flex items-center gap-2"
//           >
//             <XCircle className="w-5 h-5" />
//             Cancel
//           </button>
//           <button
//             onClick={handleConfirm}
//             className="px-6 py-2 bg-[#0c54aa] hover:bg-blue-700 text-white rounded-lg font-medium shadow transition flex items-center gap-2"
//             disabled={!reason.trim()}
//           >
//             <CheckCircle className="w-5 h-5" />
//             Reject
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
