import React from 'react';
import { AnimatePresence } from 'framer-motion';
import ProjectForm from '@/components/projects/ProjectForm';
import SubProjectForm from '@/components/projects/details/SubProjectForm';
import EstimateForm from '@/components/estimates/EstimateForm';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import PaymentForm from '@/components/revenue/PaymentForm';
import BidSubmissionDialog from '@/components/projects/Bidsubmission.jsx';

export default function ProjectModals(props) {
  const {
    showProjectForm,
    showSubProjectForm,
    showEstimateForm,
    showInvoiceForm,
    showPaymentForm,
    showBidSubmissionForm,
    project,
    editingEstimate,
    showLostModal,
    setShowLostModal,
    lostReason,
    setLostReason,
    customReason,
    setCustomReason,
    loading1,
    confirmLost,
    setShowProjectForm,
    setShowSubProjectForm,
    setShowEstimateForm,
    setShowInvoiceForm,
    setShowPaymentForm,
    setShowBidSubmissionForm,
    onProjectSubmit,
    onSubProjectSubmit,
    onEstimateSubmit,
    onInvoiceSubmit,
    onPaymentSubmit,
    editingInvoice,
    sourceEstimateForInvoice,
    invoiceForPayment,
    projects,
    customers,
    estimates,
    allestimates,
    invoices,
    subProjects,
    handleBidSubmit,
  } = props;

  return (
    <AnimatePresence>
      {showProjectForm && (
        <ProjectForm
          divisions={[]}
          project={project}
          customers={customers}
          onSubmit={onProjectSubmit}
          onCancel={() => setShowProjectForm(false)}
        />
      )}

      {showSubProjectForm && (
        <SubProjectForm
          parentProject={project}
          customers={customers}
          onSubmit={onSubProjectSubmit}
          onCancel={() => setShowSubProjectForm(false)}
        />
      )}

      {showEstimateForm && (
        <EstimateForm
          estimate={editingEstimate}
          allestimates={allestimates}
          projectForNewEstimate={!editingEstimate ? project : null}
          projects={projects}
          customers={customers}
          estimates={allestimates}
          onSubmit={onEstimateSubmit}
          onCancel={() => {
            setShowEstimateForm(false);
          }}
        />
      )}

      {showInvoiceForm && (
        <InvoiceForm
          invoice={editingInvoice}
          invoices={invoices}
          sourceEstimate={sourceEstimateForInvoice}
          project={project}
          projects={projects}
          customers={customers}
          onSubmit={onInvoiceSubmit}
          onCancel={() => {
            setShowInvoiceForm(false);
          }}
        />
      )}

      {showPaymentForm && (
        <PaymentForm
          payment={{}}
          invoice={invoiceForPayment}
          project={project}
          onSubmit={onPaymentSubmit}
          onCancel={() => {
            setShowPaymentForm(false);
          }}
        />
      )}

      {showBidSubmissionForm && (
        <BidSubmissionDialog
          project={project}
          onClose={() => setShowBidSubmissionForm(false)}
          onSubmit={handleBidSubmit}
        />
      )}
      {showLostModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowLostModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl w-11/12 max-w-md shadow-lg p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#ffd1d1] dark:bg-red-900/40 rounded-t-xl p-4 -m-6 mb-4 text-center">
              <h3 className="text-xl font-bold text-[#030405] dark:text-white">
                Project Lost
              </h3>
            </div>

            <img
              src="https://coylejax.app/icon_3.png"
              alt="Logo"
              className="mx-auto my-4"
            />

            <div className="mb-4 text-left">
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Reason for Loss
              </label>

              <select
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-red-500"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
              >
                <option value="">Select reason</option>
                {[
                  "Price",
                  "Timeline",
                  "Client cancelled",
                  "Budget not approved",
                  "Competitor selected",
                ].map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 text-left">
              <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                Please specify
              </label>
              <textarea
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg p-2 focus:ring-2 focus:ring-red-500"
                placeholder="Enter custom reason..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
              />
            </div>

            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400 text-center">
              This project will be marked as <b className="dark:text-gray-200">Lost</b>.
            </p>

            <div className="flex gap-3 justify-center">
              <button onClick={() => {
                setShowLostModal(false);
                setLostReason("");
                setCustomReason("");
              }}
                className="bg-gray-100 dark:bg-gray-700 text-black dark:text-white px-6 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmLost({ lostReasonLocal: lostReason, customReason: customReason, })}
                disabled={loading1 || !lostReason}
                className={`bg-red-600 text-white px-6 py-2 rounded-lg ${loading1 || !lostReason ? "opacity-60 cursor-not-allowed" : ""
                  }`}
              >
                {loading1 ? "Marking as Lost..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
