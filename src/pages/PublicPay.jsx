import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getPublicInvoice } from "@/api/functions";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, CheckCircle, XCircle, ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import localApi from "../services/localApi";

const STATUS_LABELS = {
  pending: "Pending",
  received: "Received",
  failed: "Failed",
  refunded: "Refunded",
};

export default function PublicPay() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const typeParam = searchParams.get("type");
  const sigParam = searchParams.get("sig");

  const [invoice, setInvoice] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [allUser, setAllUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [istrue, setIsTrue] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [transactionDetails, setTransactionDetails] = useState(null);

  // Card States
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const feeRate = 0.035; // Card only (3.5%)
  const processingFee = Number((payAmount * feeRate).toFixed(2));
  const finalPayAmount = Number((payAmount + processingFee).toFixed(2));

  useEffect(() => {
    const loadInvoiceAndSettings = async () => {
      if (!token) {
        setError("Invalid or missing token");
        setLoading(false);
        return;
      }

      try {
        const data = await getPublicInvoice(token, typeParam, sigParam);
        setInvoice(data.invoice);
        setCustomer(data.customer);
        setAllUser(data.createdBy);

        const balanceDue = (data.invoice.total_amount || 0) - (data.invoice.amount_paid || 0);
        
        const amountQuery = searchParams.get("amount");
        const amountParam = amountQuery ? parseFloat(amountQuery) : NaN;
        if (!isNaN(amountParam) && amountParam > 0 && amountParam <= balanceDue) {
          setPayAmount(Number(amountParam.toFixed(2)));
        } else {
          setPayAmount(Number(balanceDue.toFixed(2)));
        }

        try {
          const settings = await localApi.request(`/payment-settings/stripe/public?invoiceId=${data.invoice._id}`);
          setPaymentSettings(settings);
        } catch (settingsErr) {
          console.error("Error loading payment settings:", settingsErr);
        }

      } catch (err) {
        console.error("Error loading checkout data:", err);
        setError(err.message || "Unable to load invoice details.");
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceAndSettings();
  }, [token, typeParam, sigParam]);

  const handleVitalPayment = async (e) => {
    e.preventDefault();
    if (!invoice) return;

    if (!istrue) {
      alert("Please agree to the terms and conditions.");
      return;
    }

    if (!cardHolder.trim()) return alert("Cardholder name is required");
    if (!cardNumber.replace(/\s+/g, "")) return alert("Card number is required");
    if (!cardExpiry.replace("/", "")) return alert("Expiration date is required");
    if (!cardCvv.trim()) return alert("CVV is required");

    setIsProcessing(true);
    try {
      const payload = {
        invoiceId: invoice._id,
        customerId: customer?._id,
        amount: payAmount,
        paymentMethod: "card",
        processingFee: processingFee,
        notes: `Payment for Invoice ${invoice.invoice_number} via Card`,
        token: "vital_public_token_" + Math.random().toString(36).substr(2, 9),
        cardDetails: {
          cardHolder,
          cardNumber: cardNumber.replace(/\s+/g, ""),
          cardExpiry: cardExpiry.replace("/", ""),
          cardCvv
        }
      };

      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/paymentroutes/charge-vital`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process payment");
      }

      setTransactionDetails(data.payment);
      setModalType("success");
    } catch (err) {
      alert("Payment failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToInvoice = () => {
    navigate(`/publicinvoice?token=${token}&type=${typeParam}&sig=${sigParam}&pm=card`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 w-12 h-12 mx-auto" />
          <p className="mt-4 text-slate-500 font-medium text-sm">Preparing secure checkout...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-8 rounded-3xl max-w-sm w-full text-center">
          <XCircle className="mx-auto text-red-500 w-14 h-14 mb-4" />
          <h2 className="font-bold text-lg text-slate-800 dark:text-white mb-2">Initialisation Failed</h2>
          <p className="text-slate-500 text-xs mb-6 leading-relaxed">{error || "Could not find invoice details."}</p>
          <Button onClick={handleBackToInvoice} variant="outline" className="w-full rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Return to Invoice
          </Button>
        </div>
      </div>
    );
  }

  const balanceDue = (invoice.total_amount || 0) - (invoice.amount_paid || 0);
  const visibleLineItems = invoice?.line_items?.filter(item => !item.is_section && item.total && item.total > 0) || [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col md:flex-row">
      
      {/* LEFT COLUMN: Invoice Summary Card */}
      <div className="w-full md:w-1/2 bg-slate-50/80 dark:bg-slate-900/40 p-6 sm:p-10 md:p-16 border-b md:border-b-0 md:border-r border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
        <div className="space-y-8">
          {/* Logo & Back button */}
          <div className="flex justify-between items-center">
            <button 
              onClick={handleBackToInvoice}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Invoice</span>
            </button>
            {allUser?.logo ? (
              <img
                src={`${import.meta.env.VITE_IMG}${allUser.logo}`}
                alt="Logo"
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="text-xs font-extrabold text-blue-600 tracking-wider">SECURE CHECKOUT</span>
            )}
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Order Summary</p>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Pay Invoice #{invoice.invoice_number}</h1>
            <p className="text-xs text-slate-400">Issued on {format(new Date(invoice.issue_date), "MM/dd/yyyy")}</p>
          </div>

          {/* Line items checklist */}
          {visibleLineItems.length > 0 && (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {visibleLineItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start py-3 border-b border-slate-100 dark:border-slate-800/80 text-sm">
                  <div className="pr-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-250 capitalize">
                      {item.category_display_name || "Line Item"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[280px]">
                      {item.description}
                    </p>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white shrink-0">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Detailed Pricing Breakdown */}
          <div className={`space-y-2 text-sm text-slate-500 ${visibleLineItems.length > 0 ? 'border-t border-slate-200/60 dark:border-slate-800 pt-4' : ''}`}>
            {invoice.subtotal > 0 && (
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(invoice.subtotal)}</span>
              </div>
            )}
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between">
                <span>Tax ({(invoice.tax_rate * 100).toFixed(1)}%):</span>
                <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 dark:text-white font-extrabold text-base border-t border-dashed border-slate-200 dark:border-slate-800 pt-3 mt-2">
              <span>Invoice Total:</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <div className="flex justify-between text-green-600 font-semibold text-xs pt-1">
                <span>Amount Paid:</span>
                <span>-{formatCurrency(invoice.amount_paid)}</span>
              </div>
            )}
            <div className="flex justify-between text-blue-600 dark:text-blue-400 font-extrabold text-sm pt-1">
              <span>Remaining Balance:</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>
            {payAmount > 0 && payAmount < balanceDue && (
              <>
                <div className="flex justify-between text-slate-500 font-semibold text-xs pt-1">
                  <span>This Payment:</span>
                  <span>-{formatCurrency(payAmount)}</span>
                </div>
                <div className="flex justify-between text-green-600 dark:text-green-400 font-extrabold text-sm pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 mt-1">
                  <span>Balance After Payment:</span>
                  <span>{formatCurrency(balanceDue - payAmount)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Security badge at bottom left */}
        <div className="mt-12 pt-6 border-t border-slate-200/60 dark:border-slate-800 flex items-start gap-2.5 text-slate-400 text-[11px] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>Payment details are securely processed via 256-bit encrypted SSL connection using Vital Merchant services. No card data is stored on our servers.</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Modern Centered Card Payment Form */}
      <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-16 flex flex-col justify-center items-center bg-white dark:bg-slate-950">
        <div className="max-w-md w-full space-y-8">
          
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Credit Card Checkout</h2>
            <p className="text-xs text-slate-400">Please enter your credit card billing details below.</p>
          </div>

          <form onSubmit={handleVitalPayment} className="space-y-6">
            
            {/* Visual Interactive Credit Card Graphic */}
            <div className="relative h-44 w-full rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-xl overflow-hidden flex flex-col justify-between border border-white/10 select-none animate-in fade-in zoom-in-95 duration-300">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full -mr-8 -mt-8 blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                {/* Chip illustration */}
                <div className="h-7 w-10 bg-gradient-to-br from-amber-200 to-amber-400 rounded-md opacity-90 flex flex-col justify-between p-1.5 border border-amber-300/30">
                  <div className="h-0.5 w-full bg-slate-900/10" />
                  <div className="h-0.5 w-full bg-slate-900/10" />
                  <div className="h-0.5 w-full bg-slate-900/10" />
                </div>
                <CreditCard className="w-7 h-7 text-white/50" />
              </div>
              
              <div className="space-y-3">
                <p className="text-lg font-mono tracking-widest text-center select-all">
                  {cardNumber || "•••• •••• •••• ••••"}
                </p>
                <div className="flex justify-between items-end">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest">Cardholder</p>
                    <p className="text-xs font-semibold font-mono truncate uppercase">
                      {cardHolder || "JOHN DOE"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest">Expires</p>
                    <p className="text-xs font-semibold font-mono">
                      {cardExpiry || "MM/YY"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input - Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Payment Amount ($)</label>
              <div className="relative rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-400 text-sm">$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-7 pr-3 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 font-semibold focus:outline-none cursor-not-allowed select-none"
                  value={payAmount}
                  readOnly
                  disabled={isProcessing}
                  required
                />
              </div>
            </div>

            {/* Input - Cardholder Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Cardholder Name</label>
              <input
                type="text"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                placeholder="John Doe"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                disabled={isProcessing}
                required
              />
            </div>
            
            {/* Input - Card Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Card Number</label>
              <input
                type="text"
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                placeholder="4111 1111 1111 1111"
                value={cardNumber}
                onChange={(e) => {
                  let val = e.target.value.replace(/\D/g, '').substring(0, 16);
                  let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                  setCardNumber(formatted);
                }}
                disabled={isProcessing}
                required
              />
            </div>

            {/* Inputs - Expiry & CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Expiry Date</label>
                <input
                  type="text"
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
                    if (val.length >= 2) {
                      val = val.substring(0, 2) + '/' + val.substring(2);
                    }
                    setCardExpiry(val);
                  }}
                  disabled={isProcessing}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">CVV</label>
                <input
                  type="password"
                  maxLength={4}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all font-mono"
                  placeholder="123"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                  disabled={isProcessing}
                  required
                />
              </div>
            </div>

            {/* Sub-Pricing Breakdown Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Charge Amount:</span>
                <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(payAmount)}</span>
              </div>
              {processingFee > 0 && (
                <div className="flex justify-between">
                  <span>Processing Fee (3.5%):</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{formatCurrency(processingFee)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200/50 dark:border-slate-800 pt-2 text-slate-800 dark:text-white font-bold text-sm">
                <span>Total Charge:</span>
                <span>{formatCurrency(finalPayAmount)}</span>
              </div>
            </div>

            {/* Authorise Checkbox */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agree-checkout-terms"
                checked={istrue}
                onChange={(e) => setIsTrue(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-md border-slate-350 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                disabled={isProcessing}
              />
              <label htmlFor="agree-checkout-terms" className="text-[11px] text-slate-500 leading-normal cursor-pointer select-none">
                I authorize the secure payment of <strong>{formatCurrency(finalPayAmount)}</strong> and agree to the terms of service.
              </label>
            </div>

            {/* Checkout Button */}
            <Button
              type="submit"
              className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.99] transition-all duration-150"
              disabled={isProcessing || !istrue}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-0.5" />
                  <span>Pay {formatCurrency(finalPayAmount)}</span>
                </>
              )}
            </Button>

          </form>
        </div>
      </div>

      {/* Success Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-5 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            {modalType === "success" ? (
              <>
                <div className="mx-auto w-16 h-16 bg-green-50 dark:bg-green-950/20 rounded-full flex items-center justify-center text-green-500">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Successful</h2>
                  <p className="text-slate-500 text-xs leading-relaxed">Your payment transaction was processed successfully. The invoice status has been updated.</p>
                </div>
                {transactionDetails && (
                  <div className="text-left bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl text-[11px] space-y-1.5 border border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-300">
                    <p><strong>Transaction ID:</strong> {transactionDetails?.reference_number}</p>
                    <p><strong>Amount Paid:</strong> {formatCurrency((transactionDetails?.amount || 0) + (transactionDetails?.processing_fee || 0))}</p>
                    <p><strong>Status:</strong> {STATUS_LABELS[transactionDetails?.status] || transactionDetails?.status}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center text-red-500">
                  <XCircle className="w-10 h-10" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Payment Failed</h2>
                  <p className="text-slate-500 text-xs">The gateway was unable to authorize your card. Please verify details and try again.</p>
                </div>
              </>
            )}
            <Button className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-xl font-semibold shadow-md" onClick={handleBackToInvoice}>
              Return to Invoice
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
