import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { getPublicInvoice, generatePublicInvoicePdf } from "@/api/functions";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, AlertTriangle, Clock, Printer, CreditCard, XCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { HiMiniHandThumbDown } from "react-icons/hi2";
import Bill from "../assets/images/bill-to.png";
import Ship from "../assets/images/ship-to.png";
import Swal from 'sweetalert2';
import localApi from "../services/localApi";
import formatUSPhone from "../utils/common/formatUSPhone.js";
import { formatDateUS, formatDateUTC } from "../utils/formatdate.js";

const STATUS_LABELS = {
  pending: "Pending",
  received: "Received",
  failed: "Failed",
  refunded: "Refunded",
};

export default function PublicInvoice() {
  const [invoice, setInvoice] = useState(null);
  const [project, setProject] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [viewType, setViewType] = useState('summary');
  const [allUser, setAllUser] = useState([]);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = searchParams.get("token");
  const pm = searchParams.get("pm");
  const [istrue, setIsTrue] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [createdUser, setCreatedUser] = useState(null);
  const action = searchParams.get("action");
  const [markupData, setMarkUpData] = useState([]);
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [selectedPm, setSelectedPm] = useState('card');
  const [paymentSettings, setPaymentSettings] = useState(null);
  const type = viewType;

  const feeRate = selectedPm === 'card' ? 0.035 : 0;
  const processingFee = Number((payAmount * feeRate).toFixed(2));
  const finalPayAmount = Number((payAmount + processingFee).toFixed(2));

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
    }
    return () => {
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    };
  }, []);

  const handlePayment = async (overrideAmount = finalPayAmount, overridePm = selectedPm) => {
    if (!invoice) return;

    let settings = paymentSettings;
    if (!settings) {
      try {
        settings = await localApi.request(`/payment-settings/stripe/public?invoiceId=${invoice._id}`);
        setPaymentSettings(settings);
      } catch (err) {
        alert("Unable to check payment settings");
        return;
      }
    }

    if (!settings?.enabled) {
      alert("Online payment disabled by admin");
      return;
    }

    const balanceDueAmount = (invoice.total_amount || 0) - (invoice.amount_paid || 0);
    if (balanceDueAmount <= 0) {
      alert("Invoice is already paid.");
      return;
    }

    setLoading(true);
    try {
      if (overridePm === "card") {
        const sigParam = searchParams.get("sig");
        window.location.href = `/publicpay?token=${token}&type=${viewType === 'details' ? 'd' : 's'}&sig=${sigParam}&pm=${overridePm}&amount=${payAmount}`;
        setLoading(false);
        return;
      }

      // Stripe Checkout Flow (for ACH)
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/paymentroutes/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: invoice._id,
            amount: Math.round(overrideAmount * 100),
            token: token,
            type: viewType === 'details' ? 'd' : 's',
            paymentMethod: overridePm,
            enteredAmount: payAmount,
            processingFee: processingFee
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to create session");

      window.location.href = data.checkout_url;
    } catch (err) {
      alert("Payment failed: " + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInvoiceData = async () => {
      if (!token) {
        setError("Invalid or missing token");
        setLoading(false);
        return;
      }

      const typeParam = searchParams.get("type");
      const sigParam = searchParams.get("sig");

      try {
        const data = await getPublicInvoice(token, typeParam, sigParam);
        setInvoice(data.invoice);
        if (data.emailType) {
          setViewType(data.emailType);
        }
        setProject(data.project);
        setCustomer(data.customer);
        setAllUser(data.createdBy)
        setCreatedUser(data.createdByUser);
        setMarkUpData(data.markupData)

        // Load public payment settings
        try {
          const settings = await localApi.request(`/payment-settings/stripe/public?invoiceId=${data.invoice._id}`);
          setPaymentSettings(settings);
          if (settings?.enabled) {
            if (pm === 'ach' && settings.achEnabled) {
              setSelectedPm("ach");
            } else {
              setSelectedPm("card");
            }
          }
        } catch (settingsErr) {
          console.error("Error fetching payment settings:", settingsErr);
        }
      } catch (err) {
        console.error("Error loading invoice:", err);
        setError(err.message || "Unable to load invoice. Please contact support.");
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceData();
  }, [token]);

  useEffect(() => {
    const status = searchParams.get("status");
    const sessionId = searchParams.get("session_id");

    if (!invoice || paymentProcessed) return;

    if (status === "success" && sessionId) {
      setPaymentProcessed(true);
      setLoading(true);

      fetch(`${import.meta.env.VITE_API_BASE}/paymentroutes/session-details?session_id=${sessionId}`)
        .then(res => res.json())
        .then(transaction =>
          fetch(`${import.meta.env.VITE_API_BASE}/paymentroutes/update-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId: invoice._id, transaction }),
          })
        )
        .then(res => res.json())
        .then(({ invoice: updatedInvoice, payment }) => {
          const paidInvoice = {
            ...invoice,
            ...updatedInvoice,
            termsAndConditions:
              updatedInvoice.termsAndConditions ?? invoice.termsAndConditions,
          };

          setInvoice(paidInvoice);
          setTransactionDetails(payment);
          setPayments(prev => [...prev, payment]);
          setModalType("success");
          setLoading(false);

          searchParams.delete("status");
          searchParams.delete("session_id");
          setSearchParams(searchParams);
        })
        .catch(err => {
          console.error("Payment handling error:", err);
          setModalType("error");
          setLoading(false);
        });

    } else if (status === "cancel") {
      setModalType("cancel");
      searchParams.delete("status");
      searchParams.delete("session_id");
      setSearchParams(searchParams);
    }
  }, [searchParams, invoice, paymentProcessed]);

  useEffect(() => {
    if (invoice) {
      const balanceDue = (invoice.total_amount || 0) - (invoice.amount_paid || 0);
      setPayAmount(Number((balanceDue).toFixed(2)));
    }
  }, [invoice]);

  const closeModal = () => {
    setModalType(null);
    setPaymentProcessed(false);
    searchParams.delete("status");
    searchParams.delete("session_id");
    setSearchParams(searchParams);
  };

  const handleDecline = async () => {
    if (!invoice) return;

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You are about to decline this invoice. This action cannot be undone!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, decline it!',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/paymentroutes/void-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice._id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to void invoice");

      setInvoice(data.invoice);
      await Swal.fire({
        title: 'Declined!',
        text: 'The invoice has been successfully voided.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } catch (err) {
      await Swal.fire({
        title: 'Error',
        text: "Failed to void invoice: " + err.message,
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    } finally {
      setLoading(false);
    }
  };

  const capitalizeFirst = (value = "") =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

  const formatDivisionName = (val) => {
    if (!val) return 'N/A';
    return val
        .replace(/_/g, ' ')
        .replace(/client(\d+)/gi, 'Client $1')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  };

  const displayName = [project?.project_name]
    .filter(Boolean)
    .join(" - ");

  const status = searchParams.get("status");

  if (loading || (status && !modalType)) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">
          {pm ? "Redirecting to secure payment..." : "Processing..."}
        </p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray50-temp flex items-center justify-center">
      <div className="text-center bg-red-100 border border-red-400 px-8 py-6 rounded-lg">
        <h2 className="font-bold text-lg mb-2">Unable to Load Invoice</h2>
        <p className="mb-4">{error}</p>
      </div>
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center bg-yellow-100 border border-yellow-400 px-8 py-6 rounded-lg">
        <h2 className="font-bold text-lg mb-2">Invoice Not Found</h2>
      </div>
    </div>
  );

  const amountPaid = Number(Number(invoice.amount_paid || 0).toFixed(2));
  const balanceDue = Number(Math.max(0, (invoice.total_amount || 0) - amountPaid).toFixed(2));
  const additionalMarkupAmount = (invoice.material_markup_amount || 0);
  return (
    <div className="min-h-screen bg-gray-100 py-4">
      <div className="max-w-4xl md:max-w-6xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
        <div className="w-full bg-[#0c54aa] rounded-t-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-white rounded-lg p-2 w-auto">
            <img
              src={allUser?.logo ? `${import.meta.env.VITE_IMG}${allUser.logo}` : '/default-logo.png'}
              alt="Logo"
              className="h-12 w-auto"
            />
          </div>
          <div className="bg-white text-[#195daf] rounded-lg px-4 py-2 shadow-md text-center w-auto">
            <p className="text-sm">Invoice Amount</p>
            <p className="text-xl font-bold">
              {formatCurrency(invoice.total_amount)}
            </p>
          </div>
          <div className="text-white w-full sm:w-auto md:text-right sm:text-right">
            <p className="text-xl font-semibold">Invoice</p>
            <p className="text-sm break-all">
              Invoice Number:{" "}
              <span className="font-bold">{invoice.invoice_number}</span>
            </p>
            <p className="text-sm">
              Date:{" "}
              <span className="font-bold">
                {format(new Date(invoice.issue_date), "MM/dd/yyyy")}
              </span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 pb-4">
          <div>
            <img src={Bill} alt="Bill To" className="md:me-0 mb-2 w-16 h-16 object-contain mb-4" />
            <h3 className="text-xl font-bold text-[#0c54aa]">Project Information</h3>
            <p><span>Project Name:</span> <b>{displayName || 'N/A'}</b></p>
            <p><span>Company Name:</span> <b>{customer?.company_name || 'N/A'}</b></p>
            <p><span>Contact Name:</span> <b>{customer?.contact_name}</b></p>
            <p><span>Company Email:</span> <b>{customer?.email}</b></p>
            <p><span>Company Phone Number:</span> <b>{customer?.phone}</b></p>
            <p><span>Site Address:</span> <b>{project?.location}</b></p>
            {/* <div><span>Project Start Date:</span><b> {project?.estimated_start_date ? formatDateUTC(project.estimated_start_date) : invoice?.createdAt ? formatDateUTC(invoice.createdAt) : "N/A"}</b></div> */}
          </div>
          <div className="md:text-right">
            <img src={Ship} alt="Ship To" className="md:mx-auto md:me-0 mb-2 w-16 h-16 object-contain mb-4" />
            <h3 className="text-xl font-bold text-[#0c54aa]">From </h3>
            <p>Client Name: <span><b>{`${allUser?.firstName} ${allUser?.lastName}`}</b></span></p>
            <p>Address: <span><b>{allUser?.address}</b></span></p>
            <p>Phone: <span><b>{formatUSPhone(allUser?.companyPhone)}</b></span></p>
            <p>
              <span>Created By:</span>{" "}
              <b>
                {createdUser?.full_name ||
                  [createdUser?.firstName, createdUser?.lastName]
                    .filter(Boolean)
                    .join(" ") ||
                  "N/A"}
              </b>
            </p>
            <p><span>Email:</span>{" "}<span><b>{createdUser?.email}</b></span></p>
            <p><span>Division:</span>{" "}<span><b>{invoice?.divisionDisplayName || formatDivisionName(project?.project_type || 'N/A')}</b></span></p>
          </div>
        </div>

        <div className="px-6">
          <h3 class="text-xl font-bold text-[#0c54aa] mb-4">Line Items</h3>
          <table className="w-full border border-gray-300 text-sm ">
            <thead className="bg-[#0c54aa] text-white">
              <tr>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">Description</th>
                {viewType === 'details' && (
                  <>
                    {/* <th className="border p-2 text-center">Qty</th> */}
                    {/* <th className="border p-2 text-center">Unit</th>
                    <th className="border p-2 text-right">Unit Price</th>
                    <th className="border p-2 text-right">Markup %</th> */}
                    <th className="border p-2 text-right">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {invoice?.line_items?.map((item, idx) => {
                if (item.is_section) {
                  return (
                    <tr key={idx} className="bg-gray-100 dark:bg-slate-800">
                      <td colSpan={viewType === 'details' ? 3 : 2} className="border p-2 text-left font-semibold text-gray-800 dark:text-white">
                        {capitalizeFirst(item?.description)}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={idx}>
                    <td className="border p-2 white-space break-all"> {capitalizeFirst((item?.category_display_name))}</td>
                    <td className="border p-2 whitespace-pre-line break-all">{capitalizeFirst(item?.description)}</td>
                    {viewType === 'details' && (
                      <>
                        <td className="border p-2 text-right">{formatCurrency(item?.total)}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2 bg-gray-50 border rounded-lg p-4 md:col-start-2">

            {type === "details" && <div className="flex justify-between ">
              <span>{markupData?.value ?? "Additional Markup"}</span>
              <span>{formatCurrency(additionalMarkupAmount)}</span>
            </div>}
            {type === "details" && <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice?.subtotal)}</span>
            </div>}

            <>

              {type === "details" && <div className="flex justify-between">
                <span>Tax ({(invoice?.tax_rate * 100).toFixed(1)}%):</span>
                <span>{formatCurrency(invoice?.tax_amount)}</span>
              </div>}
            </>

            <div className="flex justify-between font-bold text-lg border-t pt-3 mt-3">
              <span>Total:</span>
              <span>{formatCurrency(invoice?.total_amount)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-semibold">
              <span>Amount Paid</span>
              <span>{formatCurrency(amountPaid)}</span>
            </div>
            <div className="flex justify-between border-t pt-3 text-red-600 font-bold">
              <span>Balance Due</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>

          </div>
          <div className="md:col-span-2 space-y-6">
            {invoice?.Scope_of_work && (
              <div>
                <h3 className="text-lg font-bold text-black mb-2">Scope of Work:</h3>
                <div 
                  className="bg-gray-50 border rounded-lg p-4 text-sm text-black prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: invoice.Scope_of_work }}
                />
              </div>
            )}
            {invoice?.termsAndConditions && (<div>
              <h3 className="text-lg font-bold text-black mb-2">Terms and Conditions:</h3>
              <div className="bg-gray-50 border rounded-lg p-4 text-sm text-black">
                <div
                  className="leading-relaxed whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: invoice.termsAndConditions }}
                />
              </div>
            </div>)}
          </div>
        </div>

        {balanceDue <= 0 && (
          <div className="px-6 pb-6 mt-4 text-center">
            <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg font-semibold text-lg">
              Invoice Fully Paid
            </div>
          </div>
        )}

        {balanceDue > 0 && invoice.status !== "paid" && modalType !== "success" && searchParams.get("preview") !== "true" && (
          <div className="px-6 pb-6 flex flex-col md:flex-row justify-between items-start gap-8 mt-2 border-t pt-6">
            <div className="w-full md:w-1/2 flex flex-col justify-between items-start gap-6 min-h-[140px]">
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="checkbox" 
                  id="agree-terms" 
                  checked={istrue} 
                  onChange={(e) => setIsTrue(e.target.checked)} 
                />
                <label htmlFor="agree-terms" className="text-sm text-gray-700 cursor-pointer select-none font-medium">
                  I agree to the terms and condition
                </label>
              </div>

              <Button
                variant="destructive"
                className="bg-red-500 hover:bg-red-600 w-full sm:w-auto mt-auto"
                onClick={handleDecline}
              >
                <HiMiniHandThumbDown className="w-5 h-5 mr-2" />
                Decline
              </Button>
            </div>

            <div className="w-full md:w-1/2 flex flex-col items-stretch md:items-end gap-4 bg-gray-50/50 p-6 rounded-xl border border-gray-100 dark:border-slate-800">
              <div className="flex items-center justify-between md:justify-end gap-3 w-full">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap text-right">
                  Enter Amount to Pay ($)
                </label>
                <div className="flex flex-col w-full sm:w-40">
                  <input
                    type="number"
                    step="0.01"
                    className="border rounded-lg p-2 w-full text-right bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    value={payAmount}
                    max={balanceDue}
                    min={1}
                    onChange={(e) => {
                      let value = parseFloat(e.target.value);
                      if (isNaN(value)) value = 0;
                      if (value > balanceDue) value = balanceDue;
                      setPayAmount(Number(value.toFixed(2)));
                    }}
                  />
                </div>
              </div>

              {/* Select Payment Method if both Card and ACH are enabled in settings and no pm is in URL */}
              {paymentSettings?.enabled && paymentSettings.cardsEnabled && paymentSettings.achEnabled && !searchParams.get("pm") && (
                <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-lg w-full max-w-sm ml-auto my-1 border border-gray-250">
                  <button
                    type="button"
                    onClick={() => setSelectedPm("card")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${selectedPm === 'card' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Credit/Debit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPm("ach")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${selectedPm === 'ach' ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    ACH Bank Transfer
                  </button>
                </div>
              )}

              {processingFee > 0 && (
                <div className="flex items-center justify-between md:justify-end gap-3 w-full">
                  <label className="text-sm font-semibold text-gray-700 whitespace-nowrap text-right">
                    Processing Fee ({selectedPm === 'card' ? '3.5%' : '0%'}) ($)
                  </label>
                  <div className="border rounded-lg p-2 w-full sm:w-40 bg-gray-50 text-right text-gray-700 font-medium">
                    {formatCurrency(processingFee)}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between md:justify-end gap-3 w-full">
                <label className="text-sm font-bold text-gray-800 whitespace-nowrap text-right">
                  Total
                </label>
                <div className="border rounded-lg p-2 w-full sm:w-40 bg-gray-50 text-right font-bold text-gray-800">
                  {formatCurrency(finalPayAmount)}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between md:justify-end gap-3 w-full mt-2 border-t pt-2">
                <p className="text-xs text-gray-500 text-right">
                  Maximum payable: {formatCurrency(balanceDue)}
                </p>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto px-6 font-semibold"
                  onClick={() => handlePayment(finalPayAmount, selectedPm)}
                  disabled={loading || istrue === false}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay by {selectedPm === 'ach' ? 'ACH' : 'Card'} {formatCurrency(finalPayAmount)}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-100 py-3 text-center text-sm text-gray-600temp">
          {allUser?.address} | <a href={`tel:${allUser?.companyPhone}`} className="text-blue-600">{formatUSPhone(allUser?.companyPhone)}</a> | <a href={`mailto:${allUser?.email}`} className="text-blue-600">{allUser?.email}</a>
          <p className="text-xs text-gray-500temp mt-1">© {new Date().getFullYear()} Project Management.</p>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
            {modalType === "success" ? (
              <>
                <CheckCircle className="mx-auto text-green-500" size={72} />
                <h2 className="text-2xl font-bold mt-4">Payment Successful!</h2>
                <p className="mt-2 text-gray-600temp">Your invoice has been marked as Paid.</p>
                {transactionDetails && (
                  <div className="mt-4 text-left bg-gray50-temp p-4 rounded">
                    <p><strong>Transaction ID:</strong> {transactionDetails?.reference_number}</p>
                    <p><strong>Amount Paid:</strong> {formatCurrency((transactionDetails?.amount || 0) + (transactionDetails?.processing_fee || 0))}</p>
                    <p><strong>Status:</strong>{" "}{STATUS_LABELS[transactionDetails?.status] || transactionDetails?.status}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <XCircle className="mx-auto text-red-500" size={72} />
                <h2 className="text-2xl font-bold mt-4">{modalType === "cancel" ? "Payment Canceled" : "Payment Error"}</h2>
                <p className="mt-2 text-gray-600temp">Your payment was not completed.</p>
              </>
            )}
            <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={closeModal}>Close</button>
          </div>
        </div>
      )}

    </div>
  );
}
