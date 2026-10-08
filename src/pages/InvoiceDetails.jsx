import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { Invoice, Project, Customer, Payment } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, Clock, AlertCircle, Loader2, FileDown, Mail, ArrowLeft, MessageSquare, MoreVertical, FileText, Eye, ChevronDown, Download } from "lucide-react";
import { format } from "date-fns";
import ShareInvoiceModal from "../components/invoices/ShareInvoiceModal";
import clientService from "../services/clientAddService";
import localApi from "../services/localApi";
import api from "../services/masterDataService.js";
import TablePageSkeleton from "../components/ui/tableskeleton.jsx";
import SummaryCard from "../components/invoices/SummaryCard";
import InvoiceHistory from "../components/invoices/InvoiceHistory";
import InvoicePayments from "../components/invoices/InvoicePayments";
import PaymentForm from "../components/invoices/PaymentForm";
import InvoiceSmsMessageModal from "../components/invoices/InvoiceSmsMessageModal";
import InvoiceSmsPopup from "../components/invoices/InvoiceSmsPopup.jsx";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { toast } from "sonner";
import InvoiceDetailView from "../components/invoices/InvoiceDetailView";
import InvoicePreviewTab from "../components/invoices/InvoicePreviewTab";
import Swal from "sweetalert2";
import { hasPermission } from "../utils/hasPermission";
import { formatDateUS, formatDateUTC } from "../utils/formatdate.js";



const statusColors = {
  draft: "bg-gray-200 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  void: "bg-red-100 text-red-800",
};

export default function InvoiceDetails() {

  const { id: paramId } = useParams();
  const navigate = useNavigate();
  const invoiceId = paramId;

  const [invoice, setInvoice] = useState(null);
  const [project, setProject] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [payments, setPayments] = useState([]);
  const [user, setUser] = useState(null);
  const [me, setMe] = useState({});
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") || "details";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [showPreviewMode, setShowPreviewMode] = useState(false);
  const token = localStorage.getItem("token");

  // ================= PERMISSIONS =================
  const permissions = JSON.parse(localStorage.getItem("user") || "{}")?.permissions || [];
  const canSendSms = hasPermission(permissions, "Message", "view");

  // ================= LOAD MARKUP =================
  const [markupData, setMarkUpData] = useState([]);
  const loadMarkup = useCallback(async () => {
    try {
      const res = await api.getAll("markup");
      setMarkUpData(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadMarkup();
  }, [loadMarkup]);

  // ================= LOAD USER =================
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const meRes = await localApi.getMe();
        setMe(meRes);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMe();
  }, []);

  // ================= LOAD DATA =================
  useEffect(() => {
    if (!invoiceId) return navigate("/invoices");
    loadData();
  }, [invoiceId]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const invoiceData = await Invoice.get(invoiceId);
      setInvoice(invoiceData);

      const clientData = await clientService.getClientById(invoiceData.created_by);
      setUser(clientData);

      const [projectData, paymentsData] = await Promise.all([
        Project.get(
          typeof invoiceData.project_id === "object"
            ? invoiceData.project_id._id || invoiceData.project_id.id
            : invoiceData.project_id
        ),
        Payment.filter({ invoice_id: invoiceId })
      ]);

      const filteredPayments = paymentsData.filter(p => {
        const pInvoiceId = typeof p.invoice_id === 'object' ? (p.invoice_id?._id || p.invoice_id?.id) : p.invoice_id;
        return String(pInvoiceId) === String(invoiceId);
      });

      setProject(projectData);
      setPayments(filteredPayments);

      const customerRaw = projectData?.customer_ids?.[0];

      const customerId =
        typeof customerRaw === "object"
          ? customerRaw?._id || customerRaw?.id
          : customerRaw;

      if (customerId) {
        const customerData = await Customer.get(customerId);
        setCustomer(customerData);
      }


    } catch (err) {
      console.error(err);
      navigate("/invoices");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ================= PDF =================
  const handlePrintPdf = async (pdf_type = "details") => {
    try {
      setDownloading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/functions/generate-invoice-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            invoice_id: invoice._id,
            pdf_type
          })
        }
      );

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${invoice.invoice_number}_${pdf_type}.pdf`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("PDF Download Failed");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintDocx = async (docx_type = "details") => {
    try {
      setDownloading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/functions/generate-invoice-docx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : ""
          },
          body: JSON.stringify({
            invoice_id: invoice._id,
            docx_type
          })
        }
      );

      if (!response.ok) throw new Error("Word document generation failed");

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${invoice.invoice_number}_${docx_type}.docx`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("Word Download Failed");
    } finally {
      setDownloading(false);
    }
  };

  // ================= SHARE =================
  const handleShare = async () => {
    try {
      let token = invoice.public_share_token;

      if (!token) {
        token = crypto.randomUUID();
        const updatedInvoice = await Invoice.update(invoice._id, {
          ...invoice,
          public_share_token: token,
        });
        setInvoice(updatedInvoice);
      }
      setShowShareModal(true);
    } catch (error) {
      console.error("Failed to generate share token or update status:", error);
      alert("Error: Could not generate a share link.");
    }
  };

  const handleRecordPayment = async () => {
    try {
      if (!invoice.public_share_token) {
        const token = crypto.randomUUID();
        const updatedInvoice = await Invoice.update(invoice._id, {
          ...invoice,
          public_share_token: token,
        });
        setInvoice(updatedInvoice);
      }
      setShowPaymentModal(true);
    } catch (error) {
      console.error("Failed to ensure share token:", error);
      setShowPaymentModal(true);
    }
  };

  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const handlePaymentSubmit = async (paymentData) => {
    try {
      setIsSubmittingPayment(true);
      await Payment.create({
        ...paymentData,
        invoice_id: invoiceId,
        project_id: typeof invoice.project_id === "object" ? invoice.project_id._id || invoice.project_id.id : invoice.project_id,
        customer_id: customer?._id,
        status: "received"
      });
      const newAmountPaid = Number(((invoice.amount_paid || 0) + paymentData.amount).toFixed(2));
      const isPaidFull = newAmountPaid >= Number((invoice.total_amount || 0).toFixed(2));

      await Invoice.update(invoiceId, {
        ...invoice,
        amount_paid: newAmountPaid,
        status: isPaidFull ? "paid" : "partial"
      });

      setShowPaymentModal(false);
      await loadData(true);

      Swal.fire({
        title: "Success!",
        text: "Payment has been recorded successfully.",
        icon: "success",
        confirmButtonColor: "#1d4ed8",
      });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to record payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (loading) return <TablePageSkeleton />;
  if (!invoice) return null;

  const totalPaid = Number((invoice.amount_paid || 0).toFixed(2));
  const balanceDue = Math.max(0, Number(((invoice.total_amount || 0) - totalPaid).toFixed(2)));

  const additionalMarkupAmount = invoice?.material_markup_amount || 0;

  if (showPreviewMode) {
    return (
      <div className="space-y-4">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setShowPreviewMode(false)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium px-0"
          >
            <ArrowLeft size={18} />
            Back to Invoice Details
          </Button>
        </div>
        <InvoicePreviewTab
          invoice={invoice}
          project={project}
          customer={customer}
          user={user}
          me={me}
          markupData={markupData}
        />
      </div>
    );
  }

  return (
    <div>

      {/* ===== HEADER ===== */}

      <div className="space-y-3">

        {/* Back Button and Preview */}
        <div className="flex items-center justify-between">
          <Link
            to="/invoices"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Invoices
          </Link>
        </div>

        {/* Title + Right Actions */}
        <div className="flex justify-between items-start">

          {/* LEFT SIDE */}
          <div>
            <h1 className="text-xl md:text-3xl font-bold">
              Invoice #{invoice.invoice_number}
            </h1>
            {/* <p className="text-gray-500">
              <Link
                to={(project?.is_inactive || project?.status === 'lost' || project?.status === 'completed') ? `/inactive-projects/${project?._id || project?.id}` : `/projects/${project?._id || project?.id}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {project?.project_name}
              </Link>
            </p> */}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-2">

            {/* STATUS BADGE */}
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${statusColors[invoice.status] || "bg-gray-200 text-gray-800"}`}
            >
              {invoice.status}
            </span>

            {/* DESKTOP BUTTONS */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                onClick={() => setShowPreviewMode(true)}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-700 text-white font-medium"
              >
                <Eye size={16} />
                Invoice Preview
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={downloading}
                    className="flex items-center gap-2 bg-blue-700 hover:bg-blue-700"
                  >
                    {downloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileDown className="w-4 h-4" />
                    )}
                    Download
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handlePrintPdf("summary")}>
                    <Download className="w-4 h-4 mr-2" /> Summary PDF
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handlePrintPdf("details")}>
                    <Download className="w-4 h-4 mr-2" /> Details PDF
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handlePrintDocx("summary")}>
                    <Download className="w-4 h-4 mr-2 text-blue-600" /> Summary Word
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handlePrintDocx("details")}>
                    <Download className="w-4 h-4 mr-2 text-blue-600" /> Details Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {canSendSms && invoice.status !== "paid" && (
                <Button
                  onClick={() => setShowSmsModal(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <MessageSquare className="w-4 h-4" />
                  Message
                </Button>
              )}

              {invoice.status !== "paid" && (
                <Button
                  onClick={handleShare}
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4" />
                  Share
                </Button>
              )}

              {balanceDue > 0 && (
                <Button
                  onClick={handleRecordPayment}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  <DollarSign className="w-4 h-4" />
                  Record Payment
                </Button>
              )}

            </div>

            {/* MOBILE DROPDOWN */}
            <div className="relative md:hidden">

              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowActions(!showActions)}
              >
                <MoreVertical className="w-5 h-5" />
              </Button>

              {showActions && (
                <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-50 dark:bg-[#1f2937]">
                  <button
                    onClick={() => {
                      setShowPreviewMode(true);
                      setShowActions(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
                  >
                    <Eye className="w-4 h-4" /> Invoice Preview
                  </button>

                  <button
                    onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                    className="flex w-full items-center justify-between px-4 py-2 hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <FileDown className="w-4 h-4" />
                      Download Invoice
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* SUB MENU */}
                  {showDownloadOptions && (
                    <div>
                      <button
                        onClick={() => {
                          handlePrintPdf("summary");
                          setShowActions(false);
                          setShowDownloadOptions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
                      >
                        <FileText className="w-4 h-4 mr-2" /> Summary
                      </button>

                      <button
                        onClick={() => {
                          handlePrintPdf("details");
                          setShowActions(false);
                          setShowDownloadOptions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4 mr-2" /> Details
                      </button>
                    </div>
                  )}

                  {canSendSms && invoice.status !== "paid" && (
                    <button
                      onClick={() => setShowSmsModal(true)}
                      className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </button>
                  )}

                  {invoice.status !== "paid" && (
                    <button
                      onClick={handleShare}
                      className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
                    >
                      <Mail className="w-4 h-4" />
                      Share
                    </button>
                  )}

                  {balanceDue > 0 && (
                    <>
                      <button
                        onClick={() => {
                          handleRecordPayment();
                          setShowActions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
                      >
                        <DollarSign className="w-4 h-4 text-green-600" />
                        Record Payment
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab("payments");
                          setShowActions(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
                      >
                        <FileText className="w-4 h-4 text-blue-600" />
                        Payment History
                      </button>
                    </>
                  )}

                </div>
              )}

            </div>

          </div>

        </div>

      </div>


      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid md:grid-cols-4 gap-4 mb-4 mt-4">

        <SummaryCard icon={DollarSign} label="Total Amount" value={invoice.total_amount} />
        <SummaryCard icon={CheckCircle} label="Amount Paid" value={totalPaid} />
        <SummaryCard icon={AlertCircle} label="Remaining" value={balanceDue} />
        <SummaryCard icon={Clock} label="Due Date" value={formatDateUTC(invoice.due_date)} isDate />

      </div>

      {/* ===== TABS ===== */}
      <div className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto whitespace-nowrap dark:bg-[#1f2937]">
        {[
          { key: "details", label: "Invoice Details" },
          { key: "payments", label: `Payments (${payments.length})` },
          { key: "history", label: "History" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-md font-medium ${activeTab === tab.key ? "bg-white shadow dark:bg-black" : "text-gray-500"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB CONTENT ===== */}
      {activeTab === "details" && (
        <InvoiceDetailView
          invoice={invoice}
          project={project}
          customer={customer}
          user={user}
        />
      )}

      {activeTab === "payments" && (
        <InvoicePayments payments={payments} onAddPayment={handleRecordPayment} />
      )}

      {activeTab === "history" && (
        <InvoiceHistory invoiceId={invoiceId} />
      )}

      {showShareModal && (
        <ShareInvoiceModal
          invoice={invoice}
          type="invoice"
          document={invoice}
          customer={customer}
          project={project}
          user={me}
          client={user}
          onCancel={() => setShowShareModal(false)}
        />
      )}

      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-5xl p-0 bg-transparent border-none overflow-y-auto max-h-[90vh]">
          <PaymentForm
            invoice={invoice}
            balanceDue={balanceDue}
            onSubmit={handlePaymentSubmit}
            onCancel={() => setShowPaymentModal(false)}
            publicShareToken={invoice.public_share_token}
            loading={isSubmittingPayment}
          />
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {showSmsModal && (
          <InvoiceSmsPopup
            invoices={[invoice]}
            type="summary"
            onClose={() => setShowSmsModal(false)}
            onSmsSent={() => {
              loadData(true);
            }}
            isSingleSms={true}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
