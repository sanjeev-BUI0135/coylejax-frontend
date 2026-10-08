import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import localApi from "../services/localApi";
import Swal from "sweetalert2";
import { Table, ShieldAlert, Banknote, CreditCard, Smartphone, Wallet, Building2, Loader2, Info, Copy, Check, ExternalLink, Globe } from "lucide-react";
import TablePageSkeleton from "../components/ui/tableskeleton";
import MultiSelect from "@/components/ui/MultiSelect";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function PaymentSettings() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [hasSecret, setHasSecret] = useState(false);

  const [vitalEnabled, setVitalEnabled] = useState(false);
  const [vitalPublishableKey, setVitalPublishableKey] = useState("");
  const [vitalSecretKey, setVitalSecretKey] = useState("");
  const [vitalMerchantId, setVitalMerchantId] = useState("");
  const [vitalHasSecret, setVitalHasSecret] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [initialState, setInitialState] = useState(null);
  // Payment methods
  const [cashEnabled, setCashEnabled] = useState(false);
  const [checkEnabled, setCheckEnabled] = useState(false);
  const [cardsEnabled, setCardsEnabled] = useState(false);
  const [achEnabled, setAchEnabled] = useState(false);
  const [mobileEnabled, setMobileEnabled] = useState(false);

  // Tax Settings State
  const [taxRate, setTaxRate] = useState(0.075);
  const [taxExemptCustomers, setTaxExemptCustomers] = useState([]);
  const [taxExemptLeads, setTaxExemptLeads] = useState([]);
  const [customersList, setCustomersList] = useState([]);
  const [leadsList, setLeadsList] = useState([]);

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [copied, setCopied] = useState(false);

  // Ensure user state is refreshed with full admin ID
  useEffect(() => {
    localApi
      .getMe()
      .then((res) => {
        if (res && (res._id || res.id)) {
          setUser(res);
        }
      })
      .catch((err) => console.error("Error fetching me:", err));
  }, []);

  const isAdmin = user.role_type === "admin" || user.role_type === "super_admin" || user.role_type === "super-admin";
  const modules = user.permissions || [];
  const canView = isAdmin || modules.find(m => m.module === 'Payment Settings')?.canView !== false;
  const canAdd = isAdmin || modules.find(m => m.module === 'Payment Settings')?.canAdd !== false;
  const canUpdate = isAdmin || modules.find(m => m.module === 'Payment Settings')?.canUpdate !== false;
  const canDelete = isAdmin || modules.find(m => m.module === 'Payment Settings')?.canDelete !== false;

  const currentAdminId = user.role_type === "admin"
    ? (user._id || user.id)
    : (user.created_by || user._id || user.id);

  const publicPaymentUrl = currentAdminId
    ? `${window.location.origin}/pay?merchant=${currentAdminId}`
    : `${window.location.origin}/pay`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(publicPaymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsPageLoading(true);
      await Promise.all([loadSettings(), fetchCustomers(), fetchLeads()]);
      setIsPageLoading(false);
    };
    init();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await localApi.request("/customers");
      setCustomersList(data || []);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await localApi.request("/leads?includeConverted=true&limit=10000");
      const leads = Array.isArray(res) ? res : (res.data || []);
      setLeadsList(leads);
    } catch (err) {
      console.error("Failed to fetch leads", err);
    }
  };

  const loadSettings = async () => {
    try {
      const stripeData = await localApi.request("/payment-settings/stripe");
      const vitalData = await localApi.request("/payment-settings/vital");

      // Set stripe state
      setEnabled(stripeData.enabled || false);
      setPublishableKey(stripeData.publishableKey || "");
      setSecretKey(stripeData.maskedSecretKey || "");
      setHasSecret(stripeData.hasSecretKey || false);

      // Set vital state
      setVitalEnabled(vitalData.enabled || false);
      setVitalPublishableKey(vitalData.publishableKey || "");
      setVitalSecretKey(vitalData.maskedSecretKey || "");
      setVitalHasSecret(vitalData.hasSecretKey || false);
      setVitalMerchantId(vitalData.vitalMerchantId || "");

      // Determine active settings source for generic fields
      const data = stripeData.enabled ? stripeData : (vitalData.enabled ? vitalData : stripeData);

      const state = {
        enabled: stripeData.enabled || false,
        publishableKey: stripeData.publishableKey || "",
        secretKey: stripeData.maskedSecretKey || "",
        hasSecret: stripeData.hasSecretKey || false,
        vitalEnabled: vitalData.enabled || false,
        vitalPublishableKey: vitalData.publishableKey || "",
        vitalSecretKey: vitalData.maskedSecretKey || "",
        vitalHasSecret: vitalData.hasSecretKey || false,
        vitalMerchantId: vitalData.vitalMerchantId || "",
        cashEnabled: data.cashEnabled || false,
        checkEnabled: data.checkEnabled || false,
        cardsEnabled: data.cardsEnabled || false,
        achEnabled: data.achEnabled || false,
        mobileEnabled: data.mobileEnabled || false,
        taxRate: data.taxRate != null ? data.taxRate : 0.075,
        taxExemptCustomers: data.taxExemptCustomers || [],
        taxExemptLeads: data.taxExemptLeads || [],
      };

      setInitialState(state);

      setCashEnabled(state.cashEnabled);
      setCheckEnabled(state.checkEnabled);
      setCardsEnabled(state.cardsEnabled);
      setAchEnabled(state.achEnabled);
      setMobileEnabled(state.mobileEnabled);
      setTaxRate(state.taxRate);
      setTaxExemptCustomers(state.taxExemptCustomers);
      setTaxExemptLeads(state.taxExemptLeads);

    } catch (err) {
      console.error("Failed to load payment settings", err);
    }
  };

  const saveSettings = async () => {
    // Check for existing records if new tax exempt customers or leads are added
    const newlyAddedExempts = taxExemptCustomers.filter(id => initialState && !initialState.taxExemptCustomers.includes(id));
    const newlyAddedExemptLeads = taxExemptLeads.filter(id => initialState && !initialState.taxExemptLeads.includes(id));
    const allNewlyAdded = [...newlyAddedExempts, ...newlyAddedExemptLeads];
    
    const showLoader = () => {
      Swal.fire({
        title: 'Saving Settings',
        html: 'Please wait...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    };

    showLoader();

    if (allNewlyAdded.length > 0) {
      setLoading(true);
      try {
        const [estimatesRes, invoicesRes] = await Promise.all([
          localApi.request("/estimates?limit=10000"),
          localApi.request("/invoices?limit=10000")
        ]);
        
        const estimates = Array.isArray(estimatesRes) ? estimatesRes : (estimatesRes.data || estimatesRes.estimates || []);
        const invoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes.data || invoicesRes.invoices || []);
        
        const customersWithRecords = [];

        allNewlyAdded.forEach(customerId => {
          let customerObj = customersList.find(c => c._id === customerId || c.id === customerId);
          if (!customerObj) customerObj = leadsList.find(l => l._id === customerId || l.id === customerId);
          const customerEmail = customerObj?.email?.toLowerCase();
          const customerName = customerObj?.company_name || customerObj?.contact_name || customerObj?.customer_name || "Unknown";

          let estCount = 0;
          estimates.forEach(e => {
             const inEstCustomer = e.customer_id === customerId;
             const inProjCustomer = e.project?.customer_id === customerId;
             const inProjCustomerIds = e.project?.customer_ids?.some(c => c === customerId || c._id === customerId || c.id === customerId);
             const inQuickCustomer = e.quick_customer?._id === customerId || e.quick_customer?.id === customerId;
             const matchQuickEmail = customerEmail && e.quick_customer?.email_address && e.quick_customer.email_address.toLowerCase() === customerEmail;
             
             if (inEstCustomer || inProjCustomer || inProjCustomerIds || inQuickCustomer || matchQuickEmail) {
                estCount++;
             }
          });

          let invCount = 0;
          invoices.forEach(i => {
             const inInvCustomer = i.customer_id === customerId;
             const inProjCustomer = i.project?.customer_id === customerId;
             const inProjCustomerIds = i.project?.customer_ids?.some(c => c === customerId || c._id === customerId || c.id === customerId);
             const inQuickCustomer = i.quick_customer?._id === customerId || i.quick_customer?.id === customerId;
             const matchQuickEmail = customerEmail && i.quick_customer?.email_address && i.quick_customer.email_address.toLowerCase() === customerEmail;
             
             if (inInvCustomer || inProjCustomer || inProjCustomerIds || inQuickCustomer || matchQuickEmail) {
                invCount++;
             }
          });

          if (estCount > 0 || invCount > 0) {
             customersWithRecords.push({ name: customerName, estCount, invCount });
          }
        });

        if (customersWithRecords.length > 0) {
          setLoading(false);
          
          let htmlContent = "<div style='text-align: left;'><p>The following selected customers already have associated records:</p><ul style='margin-left: 20px; margin-top: 10px; margin-bottom: 10px;'>";
          customersWithRecords.forEach(c => {
             const estStr = c.estCount === 1 ? "1 estimate" : `${c.estCount} estimates`;
             const invStr = c.invCount === 1 ? "1 invoice" : `${c.invCount} invoices`;
             
             let parts = [];
             if (c.estCount > 0) parts.push(`<strong>${estStr}</strong>`);
             if (c.invCount > 0) parts.push(`<strong>${invStr}</strong>`);
             
             htmlContent += `<li style='margin-bottom: 4px;'><strong>${c.name}</strong>: ${parts.join(" and ")}</li>`;
          });
          htmlContent += "</ul><p style='margin-top: 15px;'>If you proceed, the tax rate and total amount for the selected customers’ existing estimates and invoices will be updated. Do you want to proceed with saving?</p></div>";

          const result = await Swal.fire({
            icon: "warning",
            title: "Tax Rate Update Warning",
            html: htmlContent,
            showCancelButton: true,
            confirmButtonColor: "#2563eb",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, save settings"
          });
          
          if (!result.isConfirmed) {
            setTaxExemptCustomers(initialState.taxExemptCustomers);
            setTaxExemptLeads(initialState.taxExemptLeads);
            return; // Cancel saving
          }
          showLoader();
        }
      } catch (err) {
        console.error("Failed to check existing records", err);
        Swal.close();
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    try {
      // Save Stripe Settings
      await localApi.request("/payment-settings/stripe", {
        method: "POST",
        body: JSON.stringify({
          enabled,
          publishableKey,
          secretKey: secretKey.includes("*") ? undefined : secretKey,
          cashEnabled,
          checkEnabled,
          cardsEnabled,
          achEnabled,
          mobileEnabled,
          taxRate,
          taxExemptCustomers,
          taxExemptLeads,
        }),
      });

      // Save Vital Settings
      await localApi.request("/payment-settings/vital", {
        method: "POST",
        body: JSON.stringify({
          enabled: vitalEnabled,
          publishableKey: vitalPublishableKey,
          secretKey: vitalSecretKey.includes("*") ? undefined : vitalSecretKey,
          vitalMerchantId,
          cashEnabled,
          checkEnabled,
          cardsEnabled,
          achEnabled,
          mobileEnabled,
          taxRate,
          taxExemptCustomers,
          taxExemptLeads,
        }),
      });

      await Swal.fire({
        icon: "success",
        title: "Saved!",
        text: "Settings saved successfully.",
        confirmButtonColor: "#2563eb",
      });
      loadSettings();
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save settings.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (!initialState) return;

    setEnabled(initialState.enabled);
    setPublishableKey(initialState.publishableKey);
    setSecretKey(initialState.secretKey);
    setHasSecret(initialState.hasSecret);

    setVitalEnabled(initialState.vitalEnabled);
    setVitalPublishableKey(initialState.vitalPublishableKey);
    setVitalSecretKey(initialState.vitalSecretKey);
    setVitalHasSecret(initialState.vitalHasSecret);
    setVitalMerchantId(initialState.vitalMerchantId);

    setCashEnabled(initialState.cashEnabled);
    setCheckEnabled(initialState.checkEnabled);
    setCardsEnabled(initialState.cardsEnabled);
    setAchEnabled(initialState.achEnabled);
    setMobileEnabled(initialState.mobileEnabled);
    setTaxRate(initialState.taxRate);
    setTaxExemptCustomers(initialState.taxExemptCustomers);
    setTaxExemptLeads(initialState.taxExemptLeads);
  };

  const handleStripeToggle = (val) => {
    setEnabled(val);
  };

  const handleVitalToggle = (val) => {
    setVitalEnabled(val);
  };

  const handleTestConnection = async () => {
    if (!vitalPublishableKey || !vitalSecretKey || !vitalMerchantId) {
      Swal.fire({
        icon: "warning",
        title: "Missing Fields",
        text: "Please enter all Vital Merchant credentials before testing.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setTestingConnection(true);
    try {
      const res = await localApi.request("/payment-settings/vital/test", {
        method: "POST",
        body: JSON.stringify({
          publishableKey: vitalPublishableKey,
          secretKey: vitalSecretKey,
          vitalMerchantId: vitalMerchantId
        })
      });

      if (res.success) {
        Swal.fire({
          icon: "success",
          title: "Connection Succeeded!",
          text: res.message,
          confirmButtonColor: "#2563eb",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Connection Failed",
          text: res.error || "Failed to verify connection. Please check your keys.",
          confirmButtonColor: "#2563eb",
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "An unexpected error occurred while testing.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const canSave = canAdd || canUpdate;

  if (!canView) {
    return (
      <div className="p-6 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
        <p className="text-gray-600temp mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }
  if (isPageLoading) {
    return <TablePageSkeleton />;
  }

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-1">Online Payment Gateways</h1>
      <p className="text-gray-500 mb-6">
        Configure payment processors for accepting online payments from customers.
      </p>

      {/* Customer Public Payment Link Banner */}
      <div className="mb-6 p-5 rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Customer Public Payment Link
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Ready for Customers
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                Share this dedicated public link with your customers to pay invoices online by credit card with a 3.5% processing fee. This page requires no login and is securely branded with your company information.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex-1 lg:w-72 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all shadow-inner">
              {publicPaymentUrl}
            </div>
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={handleCopyLink}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5 h-9"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.open(publicPaymentUrl, "_blank")}
              className="shrink-0 gap-1.5 h-9 border-slate-300 dark:border-slate-700"
            >
              <ExternalLink className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Preview</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stripe Card */}
        <div className="border rounded-lg table-listrow-divstyle shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Stripe</h2>
                <p className="text-sm text-gray-500">
                  Credit cards, Apple Pay, Google Pay
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${enabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-600"
                  }`}
              >
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleStripeToggle(e.target.checked)}
                className="h-4 w-4"
              />
              <label className="text-sm font-medium">
                Enable Stripe payments
              </label>
            </div>

            {/* Publishable Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Publishable Key {!publishableKey && <span className="text-red-500">*</span>}
              </label>
              <Input
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                placeholder="pk_test_..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from your Stripe Dashboard
              </p>
            </div>

            {/* Secret Key */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">
                Secret Key {!secretKey && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={hasSecret ? "Secret key already saved" : "sk_test_..."}
              />
              <p className="text-xs text-gray-500 mt-1">
                Keep this secure — never share it
              </p>
            </div>
          </div>
        </div>

        {/* Vital Merchant Card */}
        <div className="border rounded-lg table-listrow-divstyle shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Vital Merchant</h2>
                <p className="text-sm text-gray-500">
                  Credit cards, ACH bank transfers
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${vitalEnabled
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200 text-gray-600"
                  }`}
              >
                {vitalEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                checked={vitalEnabled}
                onChange={(e) => handleVitalToggle(e.target.checked)}
                className="h-4 w-4"
              />
              <label className="text-sm font-medium">
                Enable Vital Merchant payments
              </label>
            </div>

            {/* Client-side Key / Web Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Client API Key (Web Key) {!vitalPublishableKey && <span className="text-red-500">*</span>}
              </label>
              <Input
                value={vitalPublishableKey}
                onChange={(e) => setVitalPublishableKey(e.target.value)}
                placeholder="gp_web_..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Get this from your Global Payments / Vital Portal
              </p>
            </div>

            {/* Merchant ID */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Merchant ID (MID) {!vitalMerchantId && <span className="text-red-500">*</span>}
              </label>
              <Input
                value={vitalMerchantId}
                onChange={(e) => setVitalMerchantId(e.target.value)}
                placeholder="Enter Vital Merchant ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Vital POS/Merchant account identifier
              </p>
            </div>

            {/* API Password / Secret Key */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">
                API Password / Secret {!vitalSecretKey && <span className="text-red-500">*</span>}
              </label>
              <Input
                type="password"
                value={vitalSecretKey}
                onChange={(e) => setVitalSecretKey(e.target.value)}
                placeholder={vitalHasSecret ? "Secret already saved" : "Enter API password/secret"}
              />
              <p className="text-xs text-gray-500 mt-1">
                Keep this secure — used for server authentication
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="w-full flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-1">Payment Method</h2>
        <p className="text-gray-500 mb-6">Manage payment method</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Cash */}
          <div className="border dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center mb-4">
              <Banknote className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cash-checkbox"
                checked={cashEnabled}
                onChange={(e) => setCashEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="cash-checkbox" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Cash
              </label>
            </div>
          </div>

          {/* Check */}
          <div className="border dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="check-checkbox"
                checked={checkEnabled}
                onChange={(e) => setCheckEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="check-checkbox" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Cheque
              </label>
            </div>
          </div>

          {/* Cards */}
          <div className="border dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cards-checkbox"
                checked={cardsEnabled}
                onChange={(e) => setCardsEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="cards-checkbox" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Cards
              </label>
            </div>
            <span className="text-xs text-gray-400 mt-1 font-semibold">(Vital Merchant)</span>
          </div>

          {/* ACH */}
          <div className="border dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ach-checkbox"
                checked={achEnabled}
                onChange={(e) => setAchEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="ach-checkbox" className="text-base font-semibold text-gray-900 dark:text-gray-100">
                ACH
              </label>
            </div>
            <span className="text-xs text-gray-400 mt-1 font-semibold">(Stripe)</span>
          </div>

          {/* Mobile */}
          {/* <div className="border rounded-xl p-6 flex flex-col items-center justify-center bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mobile-checkbox"
                checked={mobileEnabled}
                onChange={(e) => setMobileEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="mobile-checkbox" className="text-base font-semibold text-gray-900">
                Mobile
              </label>
            </div>
          </div> */}
        </div>
      </div>

      {/* Tax Settings section */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-1">Tax Settings</h2>
        <p className="text-gray-500 mb-6">Configure tax rates and client exemptions</p>

        <div className="border rounded-lg table-listrow-divstyle shadow-sm p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tax Rate */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Default Tax Rate (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate !== undefined ? Math.round(taxRate * 100 * 100) / 100 : ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTaxRate(isNaN(val) ? 0 : val / 100);
                }}
                placeholder="7.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                The default tax rate percentage to apply to new estimates (e.g. 7.5 for 7.5%).
              </p>
            </div>

            {/* Tax Exempt Customers */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                Tax Exempt Contacts
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors">
                        <Info className="w-3.5 h-3.5 inline" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                      {taxExemptCustomers.length === 0 ? (
                        <span className="italic text-gray-300">No contacts selected</span>
                      ) : (
                        <ul className="list-disc ml-4 space-y-0.5">
                          {customersList
                            .filter(c => taxExemptCustomers.includes(c._id || c.id))
                            .map(c => (
                              <li key={c._id || c.id}>{c.company_name} ({c.contact_name})</li>
                            ))}
                        </ul>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <MultiSelect
                options={customersList.map((c) => ({
                  value: c._id || c.id,
                  label: `${c.company_name} (${c.contact_name})`
                }))}
                selectedValues={taxExemptCustomers}
                onChange={(values) => setTaxExemptCustomers(values)}
                placeholder="Select tax exempt contacts"
                showSearch={true}
              />
              <p className="text-xs text-gray-500 mt-1">
                Selected contacts will not have tax calculated on their estimates/invoices.
              </p>
            </div>

            {/* Tax Exempt Leads */}
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                Tax Exempt Leads
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors">
                        <Info className="w-3.5 h-3.5 inline" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] max-h-[300px] overflow-y-auto whitespace-pre-wrap">
                      {taxExemptLeads.length === 0 ? (
                        <span className="italic text-gray-300">No leads selected</span>
                      ) : (
                        <ul className="list-disc ml-4 space-y-0.5">
                          {leadsList
                            .filter(l => taxExemptLeads.includes(l._id || l.id))
                            .map(l => (
                              <li key={l._id || l.id}>{l.company_name} ({l.customer_name || l.contact_name})</li>
                            ))}
                        </ul>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <MultiSelect
                options={leadsList
                  .filter((l) => l.status !== "CONVERTED" || taxExemptLeads.includes(l._id || l.id))
                  .map((l) => ({
                    value: l._id || l.id,
                    label: `${l.company_name} (${l.customer_name || l.contact_name})`
                  }))}
                selectedValues={taxExemptLeads}
                onChange={(values) => setTaxExemptLeads(values)}
                placeholder="Select tax exempt leads"
                showSearch={true}
              />
              <p className="text-xs text-gray-500 mt-1">
                Selected leads will not have tax calculated on their estimates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-10 pb-10">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="min-w-[100px]"
        >
          Cancel
        </Button>
        {canSave && (
          <Button
            onClick={saveSettings}
            disabled={loading || !canSave}
            className="min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
