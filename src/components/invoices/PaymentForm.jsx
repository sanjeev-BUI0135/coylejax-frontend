import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Loader2, XCircle, AlertTriangle, DollarSign } from "lucide-react";
import {
  FaCreditCard,
  FaMoneyCheckAlt,
  FaMoneyBill,
} from "react-icons/fa";
import localApi from "../../services/localApi";
import clientService from "../../services/clientAddService";
import Logo from "../../assets/images/pm-w-logo.png";
import { Project } from "@/api/entities";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import toast from "react-hot-toast";
import { formatCurrency, cn } from "@/lib/utils";
import CustomDatePicker from "../ui/CustomDatePicker";
import Select from "react-select";

const StripeCheckoutForm = ({ amount, invoiceId, onCancel, clientSecret, isUpdatingAmount, balanceDue, isGeneral = false, customerId = null, isNewCustomer = false, newCustomerName = "", newCustomerCompany = "", newCustomerEmail = "", newCustomerPhone = "", paymentMethod = "card" }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;
    const roundedAmount = parseFloat(amount.toFixed(2));
    
    if (!isGeneral) {
      const roundedBalance = parseFloat(balanceDue.toFixed(2));
      if (roundedAmount > roundedBalance) {
        toast.error(`Payment amount cannot exceed remaining balance (${formatCurrency(roundedBalance)})`);
        return;
      }
    }

    try {
      setIsProcessing(true);

      let finalCustomerId = customerId;
      if (isGeneral && isNewCustomer) {
        if (!newCustomerName) {
          toast.error("Customer name is required.");
          setIsProcessing(false);
          return;
        }
        try {
          const { Customer } = await import("@/api/entities");
          const newCust = await Customer.create({
            contact_name: newCustomerName,
            company_name: newCustomerCompany,
            email: newCustomerEmail,
            phone: newCustomerPhone
          });
          finalCustomerId = newCust._id || newCust.id;
        } catch (err) {
          toast.error("Failed to create customer.");
          setIsProcessing(false);
          return;
        }
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && (paymentIntent.status === "succeeded" || paymentIntent.status === "processing")) {
        const amt = parseFloat(amount.toFixed(2));
        const fee = paymentMethod === "card" ? parseFloat((amt * 0.035).toFixed(2)) : 0;
        
        const endpoint = isGeneral 
          ? "/paymentroutes/update-general-payment" 
          : "/paymentroutes/update-payment";
          
        const payload = isGeneral ? {
          customerId: finalCustomerId,
          enteredAmount: amt,
          processingFee: fee,
          notes: `General ${paymentMethod === "ach" ? "ACH" : "Card"} Payment - ${newCustomerName || "Customer"}`,
          transaction: {
            payment_intent: paymentIntent.id,
            amount_received: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            payment_method: paymentIntent.payment_method_types?.[0] || (paymentMethod === "ach" ? "us_bank_account" : "card"),
          },
        } : {
          invoiceId,
          enteredAmount: amt,
          processingFee: fee,
          transaction: {
            payment_intent: paymentIntent.id,
            amount_received: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            payment_method: paymentIntent.payment_method_types?.[0] || (paymentMethod === "ach" ? "us_bank_account" : "card"),
          },
        };

        await localApi.request(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        toast.success(paymentIntent.status === "processing" ? "Payment processing!" : "Payment successful!");
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      toast.error("Payment failed");
    }

    setIsProcessing(false);
  };



  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Payment Element */}
      <div className="border p-4 rounded-lg">
        <PaymentElement options={{
          wallets: {
            applePay: "auto",
            googlePay: "auto",
            link: "never",
          },
        }} />
      </div>

      <div className="flex gap-4">

        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isProcessing}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          disabled={!stripe || isProcessing || isUpdatingAmount}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing
            </div>
          ) : (
            `Pay ${formatCurrency(amount + (paymentMethod === "card" ? Number((amount * 0.035).toFixed(2)) : 0))}`
          )}
        </Button>

      </div>

    </form>
  );
};

const VitalCheckoutForm = ({
  amount,
  invoiceId,
  onCancel,
  balanceDue,
  isGeneral = false,
  customerId = null,
  isNewCustomer = false,
  newCustomerName = "",
  newCustomerCompany = "",
  newCustomerEmail = "",
  newCustomerPhone = "",
  paymentMethod = "card",
  clientKey = ""
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Card States
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // ACH States
  const [accHolder, setAccHolder] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("checking");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);

    const roundedAmount = parseFloat(amount.toFixed(2));
    if (!isGeneral) {
      const roundedBalance = parseFloat(balanceDue.toFixed(2));
      if (roundedAmount > roundedBalance) {
        toast.error(`Payment amount cannot exceed remaining balance (${formatCurrency(roundedBalance)})`);
        setIsProcessing(false);
        return;
      }
    }

    try {
      let finalCustomerId = customerId;
      if (isGeneral && isNewCustomer) {
        if (!newCustomerName) {
          toast.error("Customer name is required.");
          setIsProcessing(false);
          return;
        }
        try {
          const { Customer } = await import("@/api/entities");
          const newCust = await Customer.create({
            contact_name: newCustomerName,
            company_name: newCustomerCompany,
            email: newCustomerEmail,
            phone: newCustomerPhone
          });
          finalCustomerId = newCust._id || newCust.id;
        } catch (err) {
          toast.error("Failed to create customer.");
          setIsProcessing(false);
          return;
        }
      }

      const processingFee = paymentMethod === "card" ? parseFloat((roundedAmount * 0.035).toFixed(2)) : 0;

      const payload = {
        invoiceId,
        customerId: finalCustomerId,
        amount: roundedAmount,
        paymentMethod,
        processingFee,
        notes: isGeneral 
          ? `General ${paymentMethod === "ach" ? "ACH" : "Card"} Payment - ${newCustomerName || "Customer"}`
          : `Payment for Invoice via ${paymentMethod === "ach" ? "ACH" : "Card"}`,
        token: "vital_sim_token_" + Math.random().toString(36).substr(2, 9),
        cardDetails: paymentMethod === "card" ? {
          cardHolder,
          cardNumber: cardNumber.replace(/\s+/g, ""),
          cardExpiry: cardExpiry.replace("/", ""),
          cardCvv
        } : undefined,
        bankDetails: paymentMethod === "ach" ? {
          accountNumber,
          routingNumber,
          accountHolderName: accHolder,
          accountType
        } : undefined
      };

      const res = await localApi.request("/paymentroutes/charge-vital", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res.success) {
        toast.success("Payment processed successfully!");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(res.error || "Failed to process Vital payment");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Error processing Vital payment");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
      {paymentMethod === "card" ? (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Credit / Debit Card</h4>
          <div>
            <Label htmlFor="cardHolder" className="text-xs text-gray-500">Cardholder Name</Label>
            <Input 
              id="cardHolder" 
              value={cardHolder} 
              onChange={e => setCardHolder(e.target.value)} 
              placeholder="John Doe" 
              required 
              disabled={isProcessing}
            />
          </div>
          <div>
            <Label htmlFor="cardNumber" className="text-xs text-gray-500">Card Number</Label>
            <Input 
              id="cardNumber" 
              value={cardNumber} 
              onChange={e => {
                let val = e.target.value.replace(/\D/g, '').substring(0, 16);
                let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                setCardNumber(formatted);
              }} 
              placeholder="4111 1111 1111 1111" 
              required 
              disabled={isProcessing}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cardExpiry" className="text-xs text-gray-500">Expiration Date</Label>
              <Input 
                id="cardExpiry" 
                value={cardExpiry} 
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, '').substring(0, 4);
                  if (val.length >= 2) {
                    val = val.substring(0, 2) + '/' + val.substring(2);
                  }
                  setCardExpiry(val);
                }} 
                placeholder="MM/YY" 
                required 
                disabled={isProcessing}
              />
            </div>
            <div>
              <Label htmlFor="cardCvv" className="text-xs text-gray-500">CVV</Label>
              <Input 
                id="cardCvv" 
                type="password"
                maxLength={4}
                value={cardCvv} 
                onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))} 
                placeholder="123" 
                required 
                disabled={isProcessing}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">ACH Bank Transfer</h4>
          <div>
            <Label htmlFor="accHolder" className="text-xs text-gray-500">Account Holder Name</Label>
            <Input 
              id="accHolder" 
              value={accHolder} 
              onChange={e => setAccHolder(e.target.value)} 
              placeholder="John Doe" 
              required 
              disabled={isProcessing}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="routingNumber" className="text-xs text-gray-500">Routing Number</Label>
              <Input 
                id="routingNumber" 
                value={routingNumber} 
                onChange={e => setRoutingNumber(e.target.value.replace(/\D/g, '').substring(0, 9))} 
                placeholder="021000021" 
                required 
                disabled={isProcessing}
              />
            </div>
            <div>
              <Label htmlFor="accountNumber" className="text-xs text-gray-500">Account Number</Label>
              <Input 
                id="accountNumber" 
                value={accountNumber} 
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').substring(0, 17))} 
                placeholder="123456789" 
                required 
                disabled={isProcessing}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="accountType" className="text-xs text-gray-500">Account Type</Label>
            <select
              id="accountType"
              value={accountType}
              onChange={e => setAccountType(e.target.value)}
              className="w-full mt-1 border rounded-md p-2 bg-white dark:bg-slate-900 border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200"
              disabled={isProcessing}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
            </select>
          </div>
        </div>
      )}

      <div className="flex gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            `Pay ${formatCurrency(amount + (paymentMethod === "card" ? amount * 0.035 : 0))}`
          )}
        </Button>
      </div>
    </form>
  );
};

export default function PaymentForm({ invoice, balanceDue, onSubmit, onCancel, publicShareToken, loading: parentLoading, isGeneral = false, customers = [] }) {
  const [formData, setFormData] = useState({
    amount: isGeneral ? "" : Number(balanceDue || 0).toFixed(2),
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    reference_number: "",
    notes: isGeneral ? "General Payment (No Invoice)" : `Payment for Invoice ${invoice.invoice_number}`,
  });

  const [selectedMethod, setSelectedMethod] = useState("cash");
  const [currentUser, setCurrentUser] = useState(null);
  const [clientLogo, setClientLogo] = useState([]);
  const [project, setProject] = useState(null);
  const [publishableKey, setPublishableKey] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentProvider, setPaymentProvider] = useState("stripe");
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [debouncedAmount, setDebouncedAmount] = useState(formData.amount);

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerCompany, setNewCustomerCompany] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const customer = project?.customer_ids?.[0];
  const displayName = isGeneral
    ? (isNewCustomer ? newCustomerName || "New Customer" : (customers.find(c => (c.id || c._id) === selectedCustomerId)?.contact_name || "Select Customer"))
    : ([project?.project_name].filter(Boolean).join(" - ") || project?.project_name || "Loading...");

  const activeProvider = selectedMethod === "card" ? "vital" : "stripe";

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAmount(formData.amount);
    }, 800);
    return () => clearTimeout(handler);
  }, [formData.amount]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await localApi.getMe();
        const storedUserData = localStorage.getItem("user");
        if (storedUserData) {
          const storedUser = JSON.parse(storedUserData);
          if (storedUser.permissions) {
            user.permissions = storedUser.permissions;
          }
        }
        setCurrentUser(user);
      } catch (e) {
        console.error("Authentication error:", e);
      }
    };

    const LoadClient = async () => {
      try {
        const res = await clientService.getClients();
        setClientLogo(res);
      } catch (error) {
        console.log(error);
      }
    };

    const fetchProject = async () => {
      if (invoice?.project_id) {
        try {
          const projectId =
            typeof invoice.project_id === "object"
              ? invoice.project_id._id
              : invoice.project_id;

          if (!projectId) return;

          const projectData = await Project.get(projectId);
          setProject(projectData);
        } catch (error) {
          console.error("Error fetching project:", error);
        }
      }
    };

    const fetchStripeConfig = async () => {
      try {
        let creatorId = "";
        if (!invoice?._id) {
          try {
            const user = await localApi.getMe();
            creatorId = user?.role_type === "admin" ? user._id : (user?.created_by || "");
          } catch (e) {
            console.error("Failed to fetch user for stripe config", e);
          }
        }
        
        const queryParams = invoice?._id ? `?invoiceId=${invoice._id}` : `?creatorId=${creatorId}`;
        const data = await localApi.request(`/payment-settings/stripe/public${queryParams}`);
        setPaymentSettings(data);
        if (data?.publishableKey && (data?.stripeEnabled || data?.enabled)) {
          setPaymentProvider("stripe");
          setPublishableKey(data.publishableKey);
          setStripePromise(loadStripe(data.publishableKey));
        } else if (data?.vitalMerchantId && data?.vitalEnabled) {
          setPaymentProvider("vital");
        }
        if (data && !data?.cardsEnabled && !data?.cashEnabled && !data?.checkEnabled && !data?.achEnabled) {
          setInitError("No payment methods are enabled for this account.");
        }
      } catch (err) {
        console.error("Error fetching Stripe/Vital config:", err);
        setInitError("Failed to load payment configuration.");
      }
    };

    fetchUser();
    LoadClient();
    fetchProject();
    fetchStripeConfig();
  }, [invoice?.project_id]);

  useEffect(() => {
    if (activeProvider === "vital") {
      setClientSecret("vital_active");
      return;
    }
    // Clear secret immediately when switching to Stripe to avoid using stale "vital_active"
    setClientSecret(null);
    const createIntent = async () => {
      const amountValue = Number(debouncedAmount);
      if ((selectedMethod !== "card" && selectedMethod !== "ach") || !debouncedAmount || isNaN(amountValue) || amountValue <= 0 || debouncedAmount.endsWith(".")) {
        setClientSecret(null);
        return;
      }
      if (isGeneral && !isNewCustomer && !selectedCustomerId) {
        setClientSecret(null);
        return;
      }
      try {
        const feeRate = selectedMethod === "card" ? 0.035 : 0.0;
        const processingFee = Number((amountValue * feeRate).toFixed(2));
        const totalCharged = Number((amountValue + processingFee).toFixed(2));

        const endpoint = isGeneral
          ? "/paymentroutes/create-general-payment-intent"
          : "/paymentroutes/create-payment-intent";

        const payload = isGeneral ? {
          customerId: selectedCustomerId || null,
          amount: Math.round(totalCharged * 100),
          paymentMethod: selectedMethod,
        } : {
          invoiceId: invoice._id,
          amount: Math.round(totalCharged * 100),
          paymentMethod: selectedMethod,
        };

        const data = await localApi.request(endpoint, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("PaymentIntent creation failed:", err);
      }
    };

    createIntent();
  }, [selectedMethod, debouncedAmount, selectedCustomerId, activeProvider]);

  const logoClient =
    currentUser?.role_type === "admin" ? null : currentUser?.created_by;

  const logoData = clientLogo.find((c) => c._id === logoClient);

  const allTabs = [
    { key: "card", label: "Card", color: "blue-600", icon: <FaCreditCard className="w-4 h-4" />, settingKey: "cardsEnabled" },
    { key: "ach", label: "ACH", color: "teal-600", icon: <FaMoneyCheckAlt className="w-4 h-4" />, settingKey: "achEnabled" },
    { key: "cash", label: "Cash", color: "indigo-600", icon: <FaMoneyBill className="w-4 h-4" />, settingKey: "cashEnabled" },
    { key: "cheque", label: "cheque", color: "pink-600", icon: <FaMoneyCheckAlt className="w-4 h-4" />, settingKey: "checkEnabled" },
  ];

  // Only show tabs that are explicitly enabled in payment settings.
  // Empty array while settings are loading — tabs appear once settings arrive.
  const visibleTabs = paymentSettings
    ? allTabs.filter(tab => !!paymentSettings[tab.settingKey])
    : [];

  // Set first available tab as default once payment settings are loaded
  useEffect(() => {
    if (visibleTabs.length > 0) {
      const firstTab = visibleTabs[0];
      setSelectedMethod(firstTab.key);
      setFormData(prev => ({ ...prev, payment_method: firstTab.key }));
    }
  }, [paymentSettings]);

  const handleMethodChange = (method) => {
    setSelectedMethod(method.key);
    setFormData((prev) => ({ ...prev, payment_method: method.key }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formData.amount || 0);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Payment amount must be greater than zero.");
      return;
    }
    const amount = parseFloat(parsedAmount.toFixed(2));

    if (!isGeneral) {
      const balance = parseFloat(parseFloat(balanceDue).toFixed(2));
      if (amount > balance) {
        toast.error(`Payment amount cannot exceed remaining balance (${formatCurrency(balance)})`);
        return;
      }
    }

    let customerId = selectedCustomerId;
    if (isGeneral) {
      if (isNewCustomer) {
        if (!newCustomerName) {
          toast.error("Customer name is required.");
          return;
        }
        setLoading(true);
        try {
          const { Customer } = await import("@/api/entities");
          const newCust = await Customer.create({
            contact_name: newCustomerName,
            company_name: newCustomerCompany,
            email: newCustomerEmail,
            phone: newCustomerPhone
          });
          customerId = newCust._id || newCust.id;
        } catch (err) {
          console.error(err);
          toast.error("Failed to create new customer");
          setLoading(false);
          return;
        }
      } else if (!customerId) {
        toast.error("Please select a customer.");
        return;
      }
    }

    await onSubmit({
      ...formData,
      amount,
      customer_id: customerId || undefined
    });
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (field === "amount" && selectedMethod === "card") {
      setClientSecret(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col md:flex-row max-w-5xl w-full mx-auto p-4 md:p-8 gap-6 md:gap-10 bg-white dark:bg-slate-900 rounded-xl shadow-lg border-0 dark:border dark:border-gray-800 items-center justify-center"
    >
      {/* LEFT PANEL */}
      <div className="flex-1 min-w-0 bg-gradient-to-br from-blue-700 to-blue-600 text-white rounded-xl p-8 flex flex-col justify-between shadow-md h-full self-stretch">
        <div>
          {logoData?.logo || currentUser?.logo ? (
            <img
              src={
                logoData?.logo
                  ? import.meta.env.VITE_IMG + logoData.logo
                  : currentUser?.logo
                    ? import.meta.env.VITE_IMG + currentUser.logo
                    : Logo
              }
              alt="Logo"
              className="h-12 rounded-lg object-contain"
            />
          ) : (
            <img src={Logo} alt="CoyleJax Logo" className="h-12" />
          )}
          
          <p className="text-5xl mt-6 font-extrabold truncate" title={formatCurrency(isGeneral ? parseFloat(formData.amount || 0) : balanceDue)}>
            {formatCurrency(isGeneral ? parseFloat(formData.amount || 0) : balanceDue)}
          </p>
          <p className="mt-2 text-sm opacity-80">
            {isGeneral 
              ? "General Payment (No Invoice)" 
              : (invoice.invoice_number?.startsWith("INV-")
                ? invoice.invoice_number
                : `INV-${invoice.invoice_number || invoice._id}`)}
          </p>
          {!isGeneral && (
            <p className="mt-3 text-xs opacity-75">
              Due {new Date(invoice.due_date).toLocaleDateString()}
            </p>
          )}

          <div className="mt-8 space-y-2 text-sm">
            <p>
              <span className="font-semibold">To :</span>{" "}
              {displayName}
            </p>
            <p>
              <span className="font-semibold">From :</span> {currentUser?.companyName || currentUser?.full_name || "CoyleJax"}
            </p>
            <p><span className="font-semibold">Email :</span> {currentUser?.email} </p>
            <p><span className="font-semibold">Phone :</span> {currentUser?.companyPhone || currentUser?.phone || currentUser?.mobile || currentUser?.company_phone || "-"}</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 min-w-0 bg-gray-50 dark:bg-slate-800 border border-transparent dark:border-gray-700 rounded-xl p-6 shadow-md min-h-[400px] max-h-[85vh] overflow-y-auto hide-scrollbar">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-6">
          <div className="flex items-center space-x-6 dark:text-white">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleMethodChange(tab)}
                className={`pb-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${selectedMethod === tab.key
                  ? cn(`border-${tab.color}`, `text-${tab.color}`)
                  : "border-transparent text-gray-500temp hover:text-gray-700temp"
                  }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Selection Info for General Payments */}
        {isGeneral && (
          <div className="mb-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 rounded-lg space-y-4">
            <h3 className="font-bold text-sm text-blue-950 dark:text-blue-200">Customer Information</h3>
            <div>
              <Label htmlFor="customer_select" className="text-xs text-gray-500 mb-1 block">Select Customer</Label>
              <Select
                id="customer_select"
                options={customers.map((c) => ({
                  value: c.id || c._id,
                  label: c.company_name
                    ? `${c.contact_name} (${c.company_name})`
                    : c.contact_name,
                }))}
                value={
                  customers
                    .filter((c) => (c.id || c._id) === selectedCustomerId)
                    .map((c) => ({
                      value: c.id || c._id,
                      label: c.company_name
                        ? `${c.contact_name} (${c.company_name})`
                        : c.contact_name,
                    }))[0] || null
                }
                onChange={(selected) => {
                  setSelectedCustomerId(selected ? selected.value : "");
                }}
                className="w-full text-sm"
                classNamePrefix="select"
                placeholder="-- Choose Customer --"
                blurInputOnSelect={true}
                styles={{
                  menu: (base) => ({ ...base, zIndex: 9999 })
                }}
              />
            </div>
          </div>
        )}

        {/* Form Content */}
        {selectedMethod === "card" || selectedMethod === "ach" ? (
          <div className="space-y-6">
            <div className="mb-4">
              <Label htmlFor="payment_amount" className="text-gray-700temp">Payment Amount</Label>
              <Input
                id="payment_amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => {
                  let raw = e.target.value;
                  if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
                  handleInputChange("amount", raw);
                }}
                placeholder="0.00"
                className={cn(
                  "mt-1",
                  !isGeneral && Math.round(parseFloat(formData.amount || 0) * 100) > Math.round(parseFloat(balanceDue || 0) * 100) && "border-orange-500 focus-visible:ring-orange-500"
                )}
                disabled={loading}
              />
              {!isGeneral && Math.round(parseFloat(formData.amount || 0) * 100) > Math.round(parseFloat(balanceDue || 0) * 100) && (
                <div className="relative">
                  <div className="absolute top-2 left-4 z-50 flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded shadow-lg border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                    <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white dark:bg-slate-800 border-t border-l border-gray-200 dark:border-gray-700 rotate-45" />
                    <div className="bg-orange-500 rounded-sm p-0.5">
                      <AlertTriangle className="w-3 h-3 text-white" fill="currentColor" />
                    </div>
                    <p className="text-[13px] text-gray-800 dark:text-gray-200 font-medium">
                      Value must be less than or equal to {parseFloat(balanceDue).toFixed(2)}.
                    </p>
                  </div>
                </div>
              )}

              {/* Processing Fee Details */}
              {parseFloat(formData.amount || 0) > 0 && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2 text-sm border border-gray-100 dark:border-gray-800 animate-in fade-in duration-200">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Payment Amount:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency(parseFloat(formData.amount || 0))}
                    </span>
                  </div>
                  {selectedMethod === "card" && (
                    <div className="flex justify-between text-gray-600 dark:text-gray-400">
                      <span>Processing Fee (3.5%):</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {formatCurrency(Number((parseFloat(formData.amount || 0) * 0.035).toFixed(2)))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-gray-800 dark:text-gray-200 font-bold">
                    <span>Total Amount Charged:</span>
                    <span>
                      {selectedMethod === "card"
                        ? formatCurrency(Number((parseFloat(formData.amount || 0) + Number((parseFloat(formData.amount || 0) * 0.035).toFixed(2))).toFixed(2)))
                        : formatCurrency(parseFloat(formData.amount || 0))
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>

            {activeProvider === "vital" && parseFloat(formData.amount || 0) > 0 ? (
              paymentSettings && paymentSettings.vitalEnabled === false ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg border border-amber-200 dark:border-amber-900/50 flex flex-col items-center gap-3 my-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Vital Merchant Card Payments Disabled</h4>
                  <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed max-w-sm">
                    Vital Merchant card payments are currently disabled in payment settings. You can still accept payments using Cash or Cheque.
                  </p>
                </div>
              ) : (
                <VitalCheckoutForm
                  onCancel={onCancel}
                  amount={parseFloat(debouncedAmount || 0)}
                  invoiceId={invoice?._id}
                  balanceDue={balanceDue}
                  isGeneral={isGeneral}
                  customerId={selectedCustomerId}
                  isNewCustomer={isNewCustomer}
                  newCustomerName={newCustomerName}
                  newCustomerCompany={newCustomerCompany}
                  newCustomerEmail={newCustomerEmail}
                  newCustomerPhone={newCustomerPhone}
                  paymentMethod={selectedMethod}
                  clientKey={paymentSettings?.publishableKey}
                />
              )
            ) : activeProvider === "stripe" && parseFloat(formData.amount || 0) > 0 ? (
              paymentSettings && paymentSettings.stripeEnabled === false ? (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg border border-amber-200 dark:border-amber-900/50 flex flex-col items-center gap-3 my-4 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Stripe ACH Payments Disabled</h4>
                  <p className="text-amber-700 dark:text-amber-400 text-xs leading-relaxed max-w-sm">
                    Stripe ACH bank payments are currently disabled in payment settings. You can still accept payments using Cash or Cheque.
                  </p>
                </div>
              ) : stripePromise && clientSecret ? (
                <Elements
                  key={clientSecret}
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "flat",
                      variables: {
                        colorPrimary: "#2563eb",
                        borderRadius: "8px",
                      },
                    },
                  }}
                >
                  <StripeCheckoutForm
                    clientSecret={clientSecret}
                    onCancel={onCancel}
                    amount={parseFloat(debouncedAmount || 0)}
                    invoiceId={invoice?._id}
                    balanceDue={balanceDue}
                    isUpdatingAmount={parseFloat(formData.amount || 0) !== parseFloat(debouncedAmount || 0)}
                    isGeneral={isGeneral}
                    customerId={selectedCustomerId}
                    isNewCustomer={isNewCustomer}
                    newCustomerName={newCustomerName}
                    newCustomerCompany={newCustomerCompany}
                    newCustomerEmail={newCustomerEmail}
                    newCustomerPhone={newCustomerPhone}
                    paymentMethod={selectedMethod}
                  />
                </Elements>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-gray-500 text-sm">Initializing secure payment form...</p>
                </div>
              )
            ) : initError ? (
              <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-100 dark:border-red-900/50 flex flex-col items-center gap-4 my-4">
                <XCircle className="w-8 h-8 text-red-500" />
                <p className="text-red-800 dark:text-red-400 text-sm font-medium text-center leading-relaxed">
                  {initError}
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : parseFloat(formData.amount || 0) <= 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center border border-dashed rounded-lg border-gray-200 dark:border-gray-700 p-6 bg-gray-50/50 dark:bg-slate-800/50">
                <DollarSign className="w-8 h-8 text-blue-500 animate-pulse" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Enter Payment Amount</h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs max-w-xs leading-relaxed">
                  Please enter a valid amount above to securely initialize the {selectedMethod === "ach" ? "ACH bank" : "credit/debit card"} payment form.
                </p>
              </div>
            ) : (isGeneral && !isNewCustomer && !selectedCustomerId) ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center border border-dashed rounded-lg border-gray-200 dark:border-gray-700 p-6 bg-gray-50/50 dark:bg-slate-800/50">
                <DollarSign className="w-8 h-8 text-blue-500 animate-pulse" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Select Customer</h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs max-w-xs leading-relaxed">
                  Please select a customer to securely initialize the {selectedMethod === "ach" ? "ACH bank" : "credit/debit card"} payment form.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-gray-500 text-sm">Initializing secure payment form...</p>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="reference_number" className="text-gray-700temp">
                {selectedMethod === "cheque" ? "Check Number" : selectedMethod === "ach" ? "ACH Routing / Transaction ID" : "Reference #"}
              </Label>
              <Input
                id="reference_number"
                placeholder={
                  selectedMethod === "cheque"
                    ? "Enter Check number"
                    : selectedMethod === "ach"
                      ? "Enter ACH Routing or Transaction ID"
                      : "Cheque #, Transaction ID, or Reference"
                }
                value={formData.reference_number}
                onChange={(e) => handleInputChange("reference_number", e.target.value)}
                required={selectedMethod !== "cash"}
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-gray-700temp">Amount</Label>
                {!isGeneral && (
                  <span className={`text-xs font-medium ${(balanceDue - parseFloat(formData.amount || 0)) <= 0.005
                    ? "text-green-600"
                    : "text-blue-600"
                    }`}>
                    Remaining: {formatCurrency(Math.max(0, balanceDue - parseFloat(formData.amount || 0)))}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    let raw = e.target.value;
                    if (!/^\d*\.?\d{0,2}$/.test(raw)) return;
                    handleInputChange("amount", raw);
                  }}
                  placeholder="0.00"
                  className={cn(
                    !isGeneral && Math.round(parseFloat(formData.amount || 0) * 100) > Math.round(parseFloat(balanceDue || 0) * 100) && "border-orange-500 focus-visible:ring-orange-500"
                  )}
                />
                {!isGeneral && Math.round(parseFloat(formData.amount || 0) * 100) > Math.round(parseFloat(balanceDue || 0) * 100) && (
                  <div className="absolute top-full left-4 mt-2 z-50 flex items-center gap-2 bg-white px-3 py-2 rounded shadow-lg border border-gray-200 animate-in fade-in zoom-in duration-200">
                    <div className="absolute -top-1.5 left-6 w-3 h-3 bg-white border-t border-l border-gray-200 rotate-45" />
                    <div className="bg-orange-500 rounded-sm p-0.5">
                      <AlertTriangle className="w-3 h-3 text-white" fill="currentColor" />
                    </div>
                    <p className="text-[13px] text-gray-800 font-medium whitespace-nowrap">
                      Value must be less than or equal to {parseFloat(balanceDue).toFixed(2)}.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 dark:text-gray-700temp">
              <div>
                <Label>Payment Date</Label>
                <CustomDatePicker
                  id="payment-date"
                  value={formData.payment_date}
                  minDate={new Date().toISOString().split("T")[0]}
                  onChange={(val) => handleInputChange("payment_date", val)}
                />
              </div>
            </div>
            <div className="dark:text-gray-700temp">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
                disabled={parentLoading}
              >
                {parentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Pay {formatCurrency(formData.amount)}
              </Button>
            </div>
          </form>
        )}
      </div>
    </motion.div >
  );
}