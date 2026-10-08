import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import {
  CreditCard,
  Building2,
  User,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Lock,
  ShieldCheck,
  Printer,
  Receipt,
  Mail,
  Landmark,
  ExternalLink,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import CoyleLogo from "@/assets/images/coyle-logo.jpg";

export default function PublicPaymentPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParams = useParams();
  const navigate = useNavigate();

  // Detect currently logged-in user if testing on same machine (memoized so object reference never triggers re-renders)
  const loggedInUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }, []);

  // Route / Query params for merchant identification (supports ?merchant=, ?merchantId=, ?account=, ?company=, and legacy ?adminId=)
  const adminIdParam =
    searchParams.get("merchant") ||
    searchParams.get("merchantId") ||
    searchParams.get("account") ||
    searchParams.get("company") ||
    searchParams.get("adminId") ||
    searchParams.get("admin") ||
    searchParams.get("creatorId") ||
    "";
  const effectiveAdminId = adminIdParam || (loggedInUser?.role_type === "admin" ? (loggedInUser._id || loggedInUser.id) : (loggedInUser?.created_by || loggedInUser?._id || loggedInUser?.id)) || "";
  const invoiceParam = searchParams.get("invoice") || searchParams.get("invoiceNumber") || searchParams.get("inv") || "";
  const amountParam = searchParams.get("amount") || "";

  // Ref to prevent duplicate loads of the same admin
  const lastFetchedAdminRef = useRef(null);

  // Settings & Branding State
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(() => {
    if (!adminIdParam && loggedInUser?.companyName) {
      return {
        companyName: loggedInUser.companyName,
        logo: loggedInUser.logo || null,
        phone: loggedInUser.companyPhone || loggedInUser.phone || "",
        email: loggedInUser.email || "",
        creatorId: effectiveAdminId
      };
    }
    return null;
  });
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Form State: Customer Information
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");

  // Form State: Payment Information
  const [invoiceNumber, setInvoiceNumber] = useState(invoiceParam);
  const [amount, setAmount] = useState(amountParam);

  // Form State: Payment Method & Details
  const [paymentMethod, setPaymentMethod] = useState("card"); // "card" | "ach"

  // Form State: Payment Method (Credit Card)
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Form State: Payment Method (ACH / Bank Transfer)
  const [accountHolderName, setAccountHolderName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("checking");

  // Agreement & Processing states
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState(null);

  // Invoice Lookup State
  const [isSearchingInvoice, setIsSearchingInvoice] = useState(false);
  const [matchedInvoice, setMatchedInvoice] = useState(null);
  const [invoiceLookupMessage, setInvoiceLookupMessage] = useState(null);

  // Success Modal
  const [receiptData, setReceiptData] = useState(null);

  // Fee calculation (Card: 3.5%, ACH: $0 / 0%)
  const numAmount = parseFloat(amount) || 0;
  const isCard = paymentMethod === "card";
  const processingFee = isCard ? Number((numAmount * 0.035).toFixed(2)) : 0;
  const totalAmount = Number((numAmount + processingFee).toFixed(2));

  // 1. Fetch Payment Settings & Branding (Admin-based)
  const loadPaymentSettings = useCallback(async (targetAdminId, targetInvoiceId) => {
    const adminToUse = targetAdminId || effectiveAdminId;
    try {
      setSettingsLoading(true);
      const queryParts = [];
      if (adminToUse) queryParts.push(`creatorId=${adminToUse}`);
      if (targetInvoiceId) queryParts.push(`invoiceId=${targetInvoiceId}`);
      const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";

      const res = await fetch(`${import.meta.env.VITE_API_BASE}/payment-settings/stripe/public${qs}`);
      if (!res.ok) {
        console.warn("Public payment settings response error:", res.status);
        return;
      }
      const data = await res.json();
      setPaymentSettings(data);

      // Select active payment method based on merchant settings
      if (data) {
        if (data.cardsEnabled === false && data.achEnabled !== false) {
          setPaymentMethod("ach");
        } else if (data.cardsEnabled !== false && data.achEnabled === false) {
          setPaymentMethod("card");
        }
      }

      if (data && data.companyInfo) {
        if (!adminIdParam && loggedInUser?.companyName && !data.companyInfo.creatorId) {
          setCompanyInfo({
            ...data.companyInfo,
            companyName: loggedInUser.companyName,
            creatorId: adminToUse
          });
        } else {
          setCompanyInfo(data.companyInfo);
        }
      }
    } catch (err) {
      console.error("Failed to load payment settings:", err);
    } finally {
      setSettingsLoading(false);
    }
  }, [adminIdParam, effectiveAdminId, loggedInUser]);

  useEffect(() => {
    if (lastFetchedAdminRef.current === effectiveAdminId && paymentSettings) {
      return;
    }
    lastFetchedAdminRef.current = effectiveAdminId;
    loadPaymentSettings(effectiveAdminId);
  }, [effectiveAdminId, loadPaymentSettings]);

  // Handle return from Stripe Checkout (for ACH)
  useEffect(() => {
    const sessionIdParam = searchParams.get("session_id");
    const statusParam = searchParams.get("status");

    if (sessionIdParam && statusParam === "success") {
      const finalizeStripePayment = async () => {
        setIsProcessing(true);
        try {
          const detailRes = await fetch(`${import.meta.env.VITE_API_BASE}/paymentroutes/session-details?session_id=${sessionIdParam}`);
          const detailData = await detailRes.json();

          if (!detailRes.ok) throw new Error(detailData.error || "Could not retrieve Stripe session details");

          // Update payment record in database
          await fetch(`${import.meta.env.VITE_API_BASE}/paymentroutes/update-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              invoiceId: detailData.invoiceId || matchedInvoice?._id || undefined,
              invoiceNumber: detailData.invoiceNumber || invoiceNumber.trim() || undefined,
              creatorId: detailData.creatorId || companyInfo?.creatorId || effectiveAdminId || undefined,
              transaction: {
                ...detailData,
                payment_method: "ach",
              },
              enteredAmount: detailData.enteredAmount,
              processingFee: detailData.processingFee,
              customerInfo: {
                contactName: detailData.customerInfo?.contactName || detailData.customer_details?.name || contactName || "",
                companyName: detailData.customerInfo?.companyName || companyName || "",
                email: detailData.customerInfo?.email || detailData.customer_details?.email || email || "",
                phone: detailData.customerInfo?.phone || phoneNumber || "",
                address: detailData.customerInfo?.address || address || "",
              }
            }),
          });

          setReceiptData({
            transactionId: detailData.payment_intent,
            amount: detailData.enteredAmount || detailData.amount_received,
            processingFee: 0,
            totalCharged: detailData.enteredAmount || detailData.amount_received,
            paymentMethod: "ach",
            invoiceNumber: detailData.invoiceNumber || (detailData.invoiceId ? undefined : invoiceNumber),
            companyName: detailData.customerInfo?.companyName || companyName || detailData.customer_details?.name,
            contactName: detailData.customerInfo?.contactName || contactName || detailData.customer_details?.name,
            email: detailData.customerInfo?.email || email || detailData.customer_details?.email,
            accountType: "US Bank Account",
            accountLast4: "Stripe Verified",
            routingLast4: "••••",
            date: new Date().toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            }),
          });

          // Clean up searchParams
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("session_id");
          newParams.delete("status");
          newParams.delete("pm");
          setSearchParams(newParams, { replace: true });
        } catch (finalizeErr) {
          console.error("Error finalizing Stripe payment:", finalizeErr);
          setFormError(finalizeErr.message || "Failed to finalize payment confirmation.");
        } finally {
          setIsProcessing(false);
        }
      };

      finalizeStripePayment();
    } else if (statusParam === "cancel") {
      setFormError("Stripe bank payment was cancelled. You can try again whenever you are ready.");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("status");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // 2. Invoice Lookup Helper
  const handleLookupInvoice = async (invNumToSearch) => {
    const term = (invNumToSearch || invoiceNumber || "").trim();
    if (!term) {
      setMatchedInvoice(null);
      setInvoiceLookupMessage(null);
      return;
    }

    setIsSearchingInvoice(true);
    setInvoiceLookupMessage(null);
    try {
      const adminQuery = adminIdParam ? `&adminId=${adminIdParam}` : "";
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/paymentroutes/public-invoice-lookup?invoiceNumber=${encodeURIComponent(term)}${adminQuery}`
      );
      const data = await res.json();

      if (data.found && data.invoice) {
        setMatchedInvoice(data.invoice);
        setInvoiceLookupMessage({
          type: "success",
          text: `Invoice #${data.invoice.invoice_number} found! Balance due: ${formatCurrency(data.invoice.balance_due)}`,
        });

        // Auto-fill amount if not already specified by user
        if (!amount || parseFloat(amount) === 0) {
          setAmount(data.invoice.balance_due > 0 ? String(data.invoice.balance_due) : String(data.invoice.total_amount));
        }

        // Auto-fill customer details if found on invoice
        if (data.customer) {
          if (!companyName && data.customer.company_name) setCompanyName(data.customer.company_name);
          if (!contactName && data.customer.contact_name) setContactName(data.customer.contact_name);
          if (!email && data.customer.email) setEmail(data.customer.email);
          if (!phoneNumber && data.customer.phone) setPhoneNumber(formatPhoneString(data.customer.phone));
          if (!address && data.customer.address) setAddress(data.customer.address);
        }

        // Refresh settings with this invoice's creator
        if (data.creator?.id) {
          loadPaymentSettings(data.creator.id, data.invoice._id);
          if (data.creator) {
            setCompanyInfo(prev => ({ ...prev, ...data.creator }));
          }
        }
      } else {
        setMatchedInvoice(null);
        setInvoiceLookupMessage({
          type: "info",
          text: "Invoice not found in system records. You may still proceed with general payment.",
        });
      }
    } catch (err) {
      console.error("Invoice lookup error:", err);
      setMatchedInvoice(null);
    } finally {
      setIsSearchingInvoice(false);
    }
  };

  // If invoice query param provided on initial load, auto-lookup
  useEffect(() => {
    if (invoiceParam) {
      handleLookupInvoice(invoiceParam);
    }
  }, [invoiceParam]);

  // Phone number format helper
  const formatPhoneString = (value) => {
    const cleaned = ("" + value).replace(/\D/g, "");
    if (cleaned.length === 0) return "";
    if (cleaned.length <= 3) return `(${cleaned}`;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    setPhoneNumber(formatPhoneString(e.target.value));
  };

  // Card brand detector
  const getCardBrand = (num) => {
    const cleaned = num.replace(/\s+/g, "");
    if (/^4/.test(cleaned)) return "Visa";
    if (/^5[1-5]/.test(cleaned)) return "Mastercard";
    if (/^3[47]/.test(cleaned)) return "Amex";
    if (/^6(?:011|5)/.test(cleaned)) return "Discover";
    return "Card";
  };

  // Form Submit Handler
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (numAmount <= 0) {
      setFormError("Please enter a valid payment amount greater than $0.");
      return;
    }
    if (!contactName.trim() && !companyName.trim()) {
      setFormError("Please provide a Company Name or Contact Name.");
      return;
    }

    if (paymentMethod === "ach") {
      if (!isAuthorized) {
        setFormError("Please check the authorization box to agree to the payment terms.");
        return;
      }

      setIsProcessing(true);
      try {
        const payload = {
          invoiceNumber: invoiceNumber.trim() || undefined,
          invoiceId: matchedInvoice?._id || undefined,
          merchant: matchedInvoice?.created_by || companyInfo?.creatorId || effectiveAdminId || undefined,
          adminId: matchedInvoice?.created_by || companyInfo?.creatorId || effectiveAdminId || undefined,
          amount: Math.round(numAmount * 100),
          enteredAmount: numAmount,
          processingFee: 0,
          paymentMethod: "ach",
          customerInfo: {
            companyName: companyName.trim(),
            contactName: contactName.trim(),
            email: email.trim(),
            phone: phoneNumber.trim(),
            address: address.trim(),
          },
          returnUrl: `${window.location.origin}${window.location.pathname}${effectiveAdminId ? `?merchant=${effectiveAdminId}` : ""}`
        };

        const res = await fetch(`${import.meta.env.VITE_API_BASE}/paymentroutes/create-checkout-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.checkout_url) {
          throw new Error(data.error || "Failed to initialize Stripe ACH checkout session.");
        }

        // Redirect to Stripe Checkout (US bank account flow)
        window.location.href = data.checkout_url;
        return;
      } catch (err) {
        console.error("Stripe ACH error:", err);
        setFormError(err.message || "Failed to launch Stripe bank payment. Please try again.");
        setIsProcessing(false);
        return;
      }
    }

    // Card Payment Validation (Vital)
    const cleanCard = cardNumber.replace(/\s+/g, "");
    if (!cardHolder.trim()) {
      setFormError("Cardholder name is required.");
      return;
    }
    if (cleanCard.length < 15 || cleanCard.length > 16) {
      setFormError("Please enter a valid 15 or 16-digit credit card number.");
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      setFormError("Please enter a valid card expiration date (MM/YY).");
      return;
    }
    if (!cardCvv || cardCvv.length < 3) {
      setFormError("Please enter a valid card CVV / CVC code.");
      return;
    }

    if (!isAuthorized) {
      setFormError("Please check the authorization box to agree to the payment terms.");
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        invoiceNumber: invoiceNumber.trim() || undefined,
        invoiceId: matchedInvoice?._id || undefined,
        merchant: matchedInvoice?.created_by || companyInfo?.creatorId || effectiveAdminId || undefined,
        adminId: matchedInvoice?.created_by || companyInfo?.creatorId || effectiveAdminId || undefined,
        amount: numAmount,
        processingFee: processingFee,
        totalAmount: totalAmount,
        paymentMethod: "card",
        customerInfo: {
          companyName: companyName.trim(),
          contactName: contactName.trim(),
          email: email.trim(),
          phone: phoneNumber.trim(),
          address: address.trim(),
        },
        cardDetails: {
          cardHolder: cardHolder.trim(),
          cardNumber: cleanCard,
          cardExpiry: cardExpiry.replace("/", ""),
          cardCvv: cardCvv.trim(),
        },
        notes: `Online card payment from ${companyName || contactName} ${invoiceNumber ? `for Inv #${invoiceNumber}` : ""}`
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE}/paymentroutes/public-card-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Payment failed. Please check your card information and try again.");
      }

      // Success
      setReceiptData({
        transactionId: data.transactionId,
        amount: data.amount,
        processingFee: data.processingFee,
        totalCharged: data.totalCharged,
        paymentMethod: paymentMethod,
        invoiceNumber: data.invoiceNumber,
        companyName: companyName,
        contactName: contactName,
        email: email,
        cardLast4: cleanCard.slice(-4),
        cardBrand: getCardBrand(cleanCard),
        date: new Date().toLocaleString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      });
    } catch (err) {
      console.error("Payment error:", err);
      setFormError(err.message || "An unexpected error occurred while processing your payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForm = () => {
    setReceiptData(null);
    setAmount("");
    setInvoiceNumber("");
    setMatchedInvoice(null);
    setCompanyName("");
    setContactName("");
    setEmail("");
    setPhoneNumber("");
    setAddress("");
    setCardHolder("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setAccountHolderName("");
    setRoutingNumber("");
    setAccountNumber("");
    setAccountType("checking");
    setIsAuthorized(false);
    setFormError(null);
  };

  const isCardDisabled = paymentSettings && paymentSettings.cardsEnabled === false;
  const isAchDisabled = paymentSettings && paymentSettings.achEnabled === false;
  const isGatewaysDisabled = paymentSettings && paymentSettings.enabled === false;
  const allMethodsDisabled = isCardDisabled && isAchDisabled;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      
      {/* HEADER: Company Branding */}
      <header className="max-w-5xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {companyInfo?.logo ? (
            <img
              src={`${import.meta.env.VITE_IMG}${companyInfo.logo}`}
              alt={companyInfo.companyName || "Logo"}
              className="h-12 max-w-[180px] object-contain rounded-lg shadow-sm"
              onError={(e) => {
                e.target.src = CoyleLogo;
              }}
            />
          ) : (
            <img src={CoyleLogo} alt="Logo" className="h-12 max-w-[180px] object-contain rounded-lg shadow-sm" />
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {companyInfo?.companyName || loggedInUser?.companyName || "George P. Coyle & Sons"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {companyInfo?.phone ? `Support: ${companyInfo.phone}` : "Secure Online Payment Processing"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>256-Bit SSL Encrypted & PCI Compliant</span>
        </div>
      </header>

      {/* DISABLED NOTICES IF ADMIN TURNED OFF ONLINE PAYMENTS */}
      {isGatewaysDisabled && (
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Online Payments Currently Disabled</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Online payments have been temporarily disabled for this account. Please contact {companyInfo?.companyName || "the office"} directly to complete your payment.
            </p>
          </div>
        </div>
      )}

      {allMethodsDisabled && !isGatewaysDisabled && (
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Online Payment Methods Unavailable</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Both credit card and ACH payment options are currently turned off in merchant settings. Please contact our team.
            </p>
          </div>
        </div>
      )}

      {isCardDisabled && !isAchDisabled && !isGatewaysDisabled && (
        <div className="max-w-5xl mx-auto mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Credit Card Payments Temporarily Disabled</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Credit card processing is currently turned off. You can still pay securely via ACH Bank Transfer below ($0 fee).
            </p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT: 2-COLUMN GRID */}
      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Payment Form */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6 space-y-4">
            {/* Payment Method Selector Tabs (Placed top-left) */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700 w-fit">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("card");
                  setFormError(null);
                }}
                disabled={isCardDisabled || isProcessing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  paymentMethod === "card"
                    ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                } ${isCardDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                title={isCardDisabled ? "Credit card payments are disabled" : "Pay with Credit Card"}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Credit Card</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod("ach");
                  setFormError(null);
                }}
                disabled={isAchDisabled || isProcessing}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  paymentMethod === "ach"
                    ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                } ${isAchDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                title={isAchDisabled ? "ACH payments are disabled" : "Pay via ACH Bank Transfer"}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>ACH Bank</span>
                <span className="bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                  $0 Fee
                </span>
              </button>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {paymentMethod === "ach" ? (
                  <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CreditCard className="w-5 h-5 text-blue-600" />
                )}
                {paymentMethod === "ach" ? "Pay with ACH Bank Transfer" : "Pay with Credit Card"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {paymentMethod === "ach"
                  ? "Enter your customer details and US bank account details below."
                  : "Please enter your billing information and credit card details below."}
              </p>
            </div>
          </div>

          {formError && (
            <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors p-0.5 rounded cursor-pointer"
                title="Dismiss message"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmitPayment} className="space-y-6">
            
            {/* 1. CUSTOMER INFORMATION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                <User className="w-4 h-4" />
                <span>Customer Information</span>
              </div>

              {/* Row 1: Company Name & Contact Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="companyName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Company Name
                  </Label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Acme Corporation"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="pl-9 text-sm rounded-xl"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Contact Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="contactName" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Contact Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <Input
                      id="contactName"
                      type="text"
                      placeholder="Jane Doe"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="pl-9 text-sm rounded-xl"
                      required
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email Address & Phone Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="customer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-sm rounded-xl"
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phoneNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      className="pl-9 text-sm rounded-xl"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Address
                </Label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Main St, Suite 100"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-9 text-sm rounded-xl"
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* 2. PAYMENT INFORMATION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                <FileText className="w-4 h-4" />
                <span>Payment Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Invoice Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex justify-between items-center">
                    <span>Invoice Number</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional / Reference</span>
                  </Label>
                  <div className="relative flex gap-2">
                    <div className="relative flex-1">
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <Input
                        id="invoiceNumber"
                        type="text"
                        placeholder="e.g. INV-0012"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        onBlur={() => handleLookupInvoice(invoiceNumber)}
                        className="pl-9 text-sm rounded-xl font-mono uppercase"
                        disabled={isProcessing}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleLookupInvoice(invoiceNumber)}
                      disabled={isSearchingInvoice || !invoiceNumber.trim() || isProcessing}
                      className="rounded-xl px-3 text-xs"
                      title="Look up invoice in system"
                    >
                      {isSearchingInvoice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lookup"}
                    </Button>
                  </div>

                  {/* Lookup Feedback Badge */}
                  {invoiceLookupMessage && (
                    <p
                      className={`text-[11px] mt-1 font-medium ${
                        invoiceLookupMessage.type === "success"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {invoiceLookupMessage.text}
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Amount ($) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^\d*\.?\d{0,2}$/.test(val)) return;
                        setAmount(val);
                      }}
                      className="pl-9 text-sm rounded-xl font-semibold text-slate-900 dark:text-white"
                      required
                      disabled={isProcessing}
                    />
                  </div>
                  {numAmount > 0 && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isCard ? (
                        `+ 3.5% processing fee: ${formatCurrency(processingFee)}`
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ ACH processing fee: $0.00 (0% Fee)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* 3. PAYMENT METHOD (CREDIT CARD OR ACH) */}
            {paymentMethod === "card" ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Method: Credit Card</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {getCardBrand(cardNumber)}
                  </span>
                </div>

                {/* Cardholder Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="cardHolder" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Cardholder Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cardHolder"
                    type="text"
                    placeholder="John Doe"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="text-sm rounded-xl"
                    required={paymentMethod === "card"}
                    disabled={isProcessing}
                  />
                </div>

                {/* Card Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Card Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <Input
                      id="cardNumber"
                      type="text"
                      placeholder="4111 1111 1111 1111"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").substring(0, 16);
                        const formatted = digits.match(/.{1,4}/g)?.join(" ") || digits;
                        setCardNumber(formatted);
                      }}
                      className="pl-9 text-sm rounded-xl font-mono"
                      required={paymentMethod === "card"}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Expiry Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cardExpiry" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Expiry Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cardExpiry"
                      type="text"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "").substring(0, 4);
                        if (val.length >= 2) {
                          val = val.substring(0, 2) + "/" + val.substring(2);
                        }
                        setCardExpiry(val);
                      }}
                      className="text-sm rounded-xl font-mono text-center"
                      required={paymentMethod === "card"}
                      disabled={isProcessing}
                    />
                  </div>

                  {/* CVV */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cardCvv" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      CVV / CVC <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cardCvv"
                      type="password"
                      placeholder="123"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                      className="text-sm rounded-xl font-mono text-center"
                      required={paymentMethod === "card"}
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    <Landmark className="w-4 h-4" />
                    <span>Payment Method: US Bank Account (Stripe ACH)</span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/40">
                    Direct Debit • $0 Fee
                  </span>
                </div>

                {/* Stripe Bank Connect Card */}
                <div className="p-5 rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-950 space-y-4 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Pay with US Bank Account</span>
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded font-bold">
                          Stripe Hosted
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Securely connect your bank account (Chase, Bank of America, Wells Fargo, Citi, etc.) or enter account details manually via Stripe's official checkout.
                      </p>
                    </div>
                  </div>

                  {/* Processing Fee */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between shadow-2xs">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">ACH Processing Fee</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40">
                      $0.00 (0% Free)
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-100/60 dark:bg-emerald-950/50 border border-emerald-300/40 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      When you click <strong>Authorize & Pay with Stripe ACH</strong> below, you will be securely redirected to Stripe to authenticate with your bank.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AUTHORIZATION CHECKBOX */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="authorizeTerms"
                  checked={isAuthorized}
                  onChange={(e) => setIsAuthorized(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  disabled={isProcessing || (isCard && isCardDisabled) || (!isCard && isAchDisabled) || isGatewaysDisabled}
                  required
                />
                <label htmlFor="authorizeTerms" className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed cursor-pointer select-none">
                  {isCard ? (
                    <>
                      I authorize <strong>{companyInfo?.companyName || "the merchant"}</strong> to charge my credit card for the total amount of{" "}
                      <strong>{formatCurrency(totalAmount)}</strong> (including a 3.5% card processing fee of {formatCurrency(processingFee)}).
                    </>
                  ) : (
                    <>
                      I authorize <strong>{companyInfo?.companyName || "the merchant"}</strong> to electronically debit my bank account via Stripe ACH for the exact payment amount of{" "}
                      <strong>{formatCurrency(numAmount)}</strong> ($0.00 processing fee).
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* PAY NOW BUTTON */}
            <Button
              type="submit"
              disabled={isProcessing || !isAuthorized || numAmount <= 0 || (isCard && isCardDisabled) || (!isCard && isAchDisabled) || isGatewaysDisabled}
              className={`w-full py-6 rounded-xl text-white font-bold text-base shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 ${
                paymentMethod === "ach"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-emerald-600/25"
                  : "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-600/25"
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{paymentMethod === "ach" ? "Redirecting to Stripe..." : "Processing Payment..."}</span>
                </>
              ) : (
                <>
                  {paymentMethod === "ach" ? (
                    <>
                      <Landmark className="w-5 h-5" />
                      <span>Proceed to Stripe ACH • {formatCurrency(numAmount)}</span>
                      <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay with Card • {formatCurrency(totalAmount)}</span>
                    </>
                  )}
                </>
              )}
            </Button>

          </form>
        </section>

        {/* RIGHT COLUMN: Order Summary & Live Card Preview */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* Visual Interactive Payment Graphic: Credit Card or ACH Bank Account */}
          {paymentMethod === "card" ? (
            <div className="relative h-52 w-full rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-950 to-indigo-900 p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between border border-white/10 select-none animate-in fade-in duration-200">
              <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/10 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-start">
                {/* Chip illustration */}
                <div className="h-8 w-11 bg-gradient-to-br from-amber-200 via-amber-300 to-amber-400 rounded-md opacity-90 flex flex-col justify-between p-1.5 border border-amber-300/40 shadow-inner">
                  <div className="h-0.5 w-full bg-slate-900/20" />
                  <div className="h-0.5 w-full bg-slate-900/20" />
                  <div className="h-0.5 w-full bg-slate-900/20" />
                </div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-blue-200">
                  {getCardBrand(cardNumber)}
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-xl font-mono tracking-widest text-center drop-shadow-sm">
                  {cardNumber || "•••• •••• •••• ••••"}
                </p>
                
                <div className="flex justify-between items-end">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-[9px] text-blue-300/70 uppercase tracking-widest">Cardholder</p>
                    <p className="text-xs font-semibold font-mono truncate uppercase">
                      {cardHolder || contactName || "CARDHOLDER NAME"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-blue-300/70 uppercase tracking-widest">Expires</p>
                    <p className="text-xs font-semibold font-mono">
                      {cardExpiry || "MM/YY"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-52 w-full rounded-2xl bg-gradient-to-tr from-slate-950 via-emerald-950 to-slate-900 p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between border border-emerald-500/20 select-none animate-in fade-in duration-200">
              <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 rounded-full -mr-12 -mt-12 blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                    <Landmark className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-300">ACH DIRECT DEBIT</p>
                    <p className="text-[9px] text-slate-400 font-mono">Stripe Secured • NACHA Standard</p>
                  </div>
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/30">
                  US BANK ACCOUNT
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-black/30 rounded-xl border border-white/10 text-center font-mono text-xs text-emerald-200">
                  <p className="text-[10px] text-slate-400 uppercase">Gateway</p>
                  <p className="font-semibold text-white tracking-wide">Powered by Stripe Checkout</p>
                </div>

                <div className="flex justify-between items-end pt-1">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="text-[9px] text-emerald-300/70 uppercase tracking-widest">Customer</p>
                    <p className="text-xs font-semibold font-mono truncate uppercase">
                      {contactName || companyName || "VALUED CUSTOMER"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-emerald-300/70 uppercase tracking-widest">Processing Fee</p>
                    <p className="text-xs font-bold text-emerald-400 font-mono">$0.00 Free</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Summary Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-blue-600" />
                Payment Summary
              </h3>
              {matchedInvoice && (
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-full text-[11px] font-semibold">
                  Invoice #{matchedInvoice.invoice_number}
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
                <span>Paying To (Merchant):</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                  <Building2 className="w-3.5 h-3.5" />
                  {companyInfo?.companyName || loggedInUser?.companyName || "George P. Coyle & Sons"}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Payment Amount</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(numAmount)}
                </span>
              </div>

              {isCard ? (
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    Credit Card Processing Fee (3.5%)
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatCurrency(processingFee)}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    ACH Processing Fee (0.0%)
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-xs">
                    $0.00 (Free)
                  </span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-3 flex justify-between items-center text-base">
                <span className="font-bold text-slate-900 dark:text-white">Total Amount</span>
                <span className={`font-extrabold text-lg ${
                  paymentMethod === "ach" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                }`}>
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {matchedInvoice && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <span>Invoice Total:</span>
                  <span className="font-medium">{formatCurrency(matchedInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid to Date:</span>
                  <span className="font-medium text-emerald-600">-{formatCurrency(matchedInvoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-200/60 dark:border-slate-700 pt-1 text-slate-800 dark:text-white">
                  <span>Remaining Balance:</span>
                  <span className="text-blue-600">{formatCurrency(matchedInvoice.balance_due)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Security Guarantee Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs leading-relaxed flex items-start gap-3">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              {paymentMethod === "ach"
                ? "Your bank account information is encrypted using 256-bit security and processed via NACHA standards. Bank account credentials are never stored on our servers."
                : "Your card information is encrypted using industry standard protocols and transmitted securely. Credit card details are never saved or stored on our servers."}
            </span>
          </div>

        </section>
      </main>

      {/* SUCCESS MODAL / PAYMENT RECEIPT */}
      {receiptData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 text-center animate-in zoom-in-95 duration-200">
            
            <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Payment Successful!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thank you for your payment. A confirmation has been recorded.
              </p>
            </div>

            {/* Printable Receipt Card */}
            <div id="payment-receipt" className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 text-left border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{receiptData.transactionId}</span>
              </div>
              {receiptData.invoiceNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Invoice Number:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{receiptData.invoiceNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{receiptData.companyName || receiptData.contactName}</span>
              </div>
              {receiptData.email && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[200px]">{receiptData.email}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {receiptData.paymentMethod === "ach" ? "ACH Bank Transfer" : "Credit Card"}
                </span>
              </div>
              {receiptData.paymentMethod === "ach" ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bank Account:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {(receiptData.accountType || "Checking").toUpperCase()} •••• {receiptData.accountLast4 || "••••"}
                    </span>
                  </div>
                  {receiptData.routingLast4 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Routing Number:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        •••••{receiptData.routingLast4}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-slate-400">Card:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {receiptData.cardBrand} •••• {receiptData.cardLast4}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Amount Paid:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(receiptData.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {receiptData.paymentMethod === "ach" ? "Processing Fee (0%):" : "Processing Fee (3.5%):"}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {receiptData.processingFee > 0 ? formatCurrency(receiptData.processingFee) : "$0.00 (Free)"}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                <span>Total Charged:</span>
                <span>{formatCurrency(receiptData.totalCharged)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                <span>Date & Time:</span>
                <span>{receiptData.date}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 rounded-xl text-xs py-5 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
              <Button
                type="button"
                onClick={handleResetForm}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs py-5 font-semibold"
              >
                Done
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
