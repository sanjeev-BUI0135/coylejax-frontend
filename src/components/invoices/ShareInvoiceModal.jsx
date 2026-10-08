import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { X, Mail, Copy, Loader2, Eye, FileText, FileDown } from "lucide-react";
import { createPageUrl } from "@/utils";
import { SendEmail } from "@/api/integrations";
import { formatCurrency } from "@/lib/utils";
import formatUSPhone from "../../utils/common/formatUSPhone.js";
import Swal from "sweetalert2";
import { formatDateUTC } from "../../utils/formatdate.js";
export default function ShareInvoiceModal({
  type,
  document,
  customer,
  project,
  user,
  client,
  isCrewView,
  onCancel,
}) {
  const isInvoice = type === "invoice";
  const isQuickEstimate = !isInvoice && document?.is_quick_estimate;
  const BASE_URL = import.meta.env.VITE_APP_BASE;
  const customerEmail = isQuickEstimate
    ? document?.quick_customer?.email_address
    : customer?.email;

  const customerName = isQuickEstimate
    ? document?.quick_customer?.customer_name
    : customer?.contact_name;

  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);
  const [emailType, setEmailType] = useState("summary");
  const [customersList, setCustomersList] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const isAdmin = user?.role_type === "admin";
  const currentUserId = isAdmin
    ? (user?._id || user?.id)
    : (user?.created_by || user?._id || user?.id);

  useEffect(() => {
    if (isCrewView) {
      setEmailType("crew");
    } else {
      setEmailType("summary");
    }
  }, [isCrewView]);

  const filteredCustomers = customersList.filter(
    (c) => String(c.created_by) === String(currentUserId)
  );

  const uniqueCustomers = Array.from(
    new Map(filteredCustomers.map(c => [c.email, c])).values()
  );

  const balance = (document.total_amount || 0) - (document.amount_paid || 0);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);

  /* ---------------------------------------------------------------- LINKS */
  const mapTypeToParam = (t) => {
    if (t === "summary") return "s";
    if (t === "details") return "d";
    if (t === "crew") return "c";
    return t;
  };
  const paramType = mapTypeToParam(emailType);
  const signatures = document.signatures || document.signature || {};
  const sig = signatures[paramType] || signatures[emailType] || signatures[`${paramType}Signature`] || signatures[`${emailType}Signature`] || "";
  const sigParam = sig ? `&sig=${sig}` : "";

  const shareLink = isInvoice
    ? `${window.location.origin}${createPageUrl(
      `PublicInvoice?token=${document.public_share_token}&type=${paramType}${sigParam}`
    )}`
    : `${window.location.origin}/estimate-print` +
    `?token=${document.public_share_token}` +
    `&type=${paramType}${sigParam}`;

  /* --------------------------------------------------------------- SUBJECT */
  const estimateNumber =
    document?.estimate_number || document?.estimate_no || "N/A";

  const defaultSubject = isInvoice
    ? `Invoice ${document.invoice_number} from ${client?.companyName}`
    : document?.is_quick_estimate
      ? `Estimate ${estimateNumber} - ${customerName}`
      : `Estimate ${estimateNumber} - ${project?.project_name}`;

  /* ------------------------------------------------------------- BODY TEXT */
  const plainTextBody = isInvoice
    ? `Dear ${customer?.contact_name || "Valued Customer"},

Your invoice ${document.invoice_number} is ready.

Amount Due: ${formatCurrency(
      (document.total_amount || 0) -
      (document.amount_paid || 0)
    )}
Due Date: ${new Date(document.due_date).toLocaleDateString()}

You can view and pay your invoice securely using the button below.
${shareLink}

Thank you for your business!

Sincerely,
${client?.companyName}`
    : `Dear ${customer?.contact_name || "Valued Customer"},

Please find the estimate for the project "${project?.project_name}".

Estimate Number: ${estimateNumber}
Total Amount: ${formatCurrency((document.total_amount || 0) - (document.amount_paid || 0))}

You can view the estimate online using the button below.
${shareLink}

Best regards,
${client?.companyName}`;

  /* ------------------------------------------------------- HTML TEMPLATES */
  const generateInvoiceHTML = (forPreview = false) => {
    const downloadLink = `${BASE_URL}api/download-invoice-public/${document.public_share_token}?type=${emailType}${sig ? `&sig=${sig}` : ""}`;
    return `
<div style="background:#f5f7fb; padding:30px 15px; font-family:Arial, sans-serif;color:#000;">
  
  <!-- Logo -->
  <div style="text-align:center; margin-bottom:20px;">
    <img src="${BASE_URL}${client?.logo}" alt="Company Logo" style="height:60px; display:block; margin:0 auto;" />
  </div>

  <!-- Card -->
  <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.08); padding:30px;">

    <!-- Icon -->
    <div style="text-align:center; margin-bottom:20px;">
      <img src="https://coylejax.app/icon_2.png" alt="Invoice Icon" style="height:90px;" />
    </div>

    <!-- Greeting -->
    <p style="font-size:15px;">Dear ${customer?.contact_name || "Customer"},</p>

    <p style="font-size:15px; color:#333;">
      Your invoice <strong>#${document.invoice_number}</strong> is now ready for review.
      Below you will find the summary of items.
    </p>

    <!-- Summary -->
    <ul style="margin:20px 0; padding-left:20px; font-size:14px;">
      <li><strong>Total Amount Due:</strong> ${formatCurrency((document.total_amount || 0) - (document.amount_paid || 0))}</li>
      <li><strong>Due Date:</strong> ${formatDateUTC(document.due_date || '')}</li>
    </ul>

    <!-- CTA -->
    <div style="text-align:center; margin:30px 0;">
      <div style="white-space: nowrap;">
        ${forPreview ? `
        <a href="${shareLink}&preview=true"
           style="display:inline-block; padding:12px 14px; background:#0052cc; color:#fff; border:2px solid #0052cc; text-decoration:none; border-radius:6px; font-weight:600; font-size:13px; margin-right: 8px; margin-bottom: 5px; white-space: nowrap;">
          View Invoice
        </a>` : ""}
        ${!forPreview ? `
        <a href="${downloadLink}" target="_blank"
           style="display:inline-block; padding:12px 14px; background:#0052cc; color:#fff; border:2px solid #0052cc; text-decoration:none; border-radius:6px; font-weight:600; font-size:13px; margin-right: 8px; margin-bottom: 5px; white-space: nowrap;">
          Download Invoice
        </a>` : ""}
        <a href="${shareLink}&pm=card"
           style="display:inline-block; padding:12px 14px; background:#fff; color:#0052cc; border:2px solid #0052cc; text-decoration:none; border-radius:6px; font-weight:600; font-size:13px; margin-right: 8px; margin-bottom: 5px; white-space: nowrap;">
          Pay by Card ${formatCurrency(balance * 1.035)}
        </a>
        <a href="${shareLink}&pm=ach"
           style="display:inline-block; padding:12px 14px; background:#fff; color:#0052cc; border:2px solid #0052cc; text-decoration:none; border-radius:6px; font-weight:600; font-size:13px; margin-bottom: 5px; white-space: nowrap;">
           Pay by ACH ${formatCurrency(balance)}
        </a>
      </div>
    </div>

    <!-- Payment methods -->
    <ul style="font-size:13px; color:#444; padding-left:20px;">
      <li>Credit Card (3.5% processing fee applies)</li>
      <li>ACH (0% processing fee applies)</li>
      <li>Check (No fee – instructions provided on the invoice page)</li>
    </ul>

    <p style="font-size:13px; color:#555; margin-top:20px;">
      If you have any questions regarding this invoice, please don’t hesitate to contact us.
    </p>
  </div>

  <!-- Footer -->
  <p style="text-align:center; font-size:12px; color:#666; margin-top:20px;">
    ${client?.companyName}<br/>
    ${client?.address} | ${formatUSPhone(client?.companyPhone)}
  </p>
</div>
`.trim();
  };

  const generateEstimateHTML = () => `
<div style="max-width:100%; margin:auto; padding:20px; background:#f9f9f9;color:#000;">
  <div style="text-align:center; margin-bottom:20px;">
    <img src="${BASE_URL}${client?.logo}" alt="Company Logo" style="height:50px; display:block; margin:0 auto;" />
  </div>

  <div style="max-width:600px; margin:auto; background:#fff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); padding:30px;">
    
    <div style="text-align:center; margin-bottom:20px;">
      <img src="https://coylejax.app/icon_2.png" alt="Estimate Icon" style="height:80px;" />
    </div>

    <p style="font-size:15px;color:#000;">Dear ${customerName || "Customer"},</p>

    <p style="font-size:15px; color:#333;">
      Thank you for considering <strong>${client?.companyName}</strong>.
    </p>

    <p style="font-size:15px; color:#333;">
      We’ve prepared the estimate <strong>${estimateNumber}</strong> for you.
    </p>

    <p style="font-size:15px; color:#333;">You can review the estimate securely by clicking the button below:</p>

    <div style="text-align:center; margin:30px 0;">
      <a href="${shareLink}"
         style="display:inline-block; padding:14px 28px; background:#0052cc; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">
        View Estimate
      </a>
    </div>

    ${emailType !== "crew" ? `
<p style="font-size:15px; color:#333;">
  Once you’ve reviewed, you can easily approve it online by clicking the
  <strong style="color:#0052cc;"> Approve </strong> button on that page.
</p>
` : ""}

    <p style="margin-top:25px; font-weight:600; color:#d32f2f;">Note:</p>
    <ul style="padding-left:18px; font-size:14px;">
      <li>This link is secure and unique to you. No login is required.</li>
    </ul>

    <p style="margin-top:25px;font-size:15px; color:#333;">
      If you have any questions about this estimate, feel free to reply to this email
      or call us at ${(formatUSPhone(client?.companyPhone))}.
    </p>

    <p style="margin-top:30px;font-size:15px; color:#333;">
      Best regards,<br/>
      <strong>${client?.companyName}</strong>
    </p>
  </div>

  <p style="font-size:12px; color:#555; text-align:center; margin-top:20px;">
    ${client?.address} |
    <a href="mailto:${client?.email}" style="color:#0052cc;">${client?.email}</a> |
    ${(formatUSPhone(client?.companyPhone))}<br/>
    Copyright © ${new Date().getFullYear()} ${client?.companyName}
  </p>
</div>
`.trim();

  /* -------------------------------------------------------------- STATE */
  const [emailData, setEmailData] = useState({
    to: customerEmail || "",
    subject: defaultSubject,
    body: plainTextBody,
  });

  useEffect(() => {
    setEmailData((prev) => ({ ...prev, body: plainTextBody }));
  }, [emailType]);
  /* -------------------------------------------------------------- CUSTOMER EMAIL  */
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/customers`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        setCustomersList(data);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load customers",
        });
      }
    };

    fetchCustomers();
  }, []);

  /* -------------------------------------------------------------- ACTIONS */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: "Link copied", description: "Shareable link copied" });
  };


  const handleSendEmail = async () => {
    setIsSending(true);

    try {
      if (isInvoice) {
        const htmlBody = generateInvoiceHTML(false);

        const res = await SendEmail({
          to: emailData.to,
          subject: emailData.subject,
          body: htmlBody,
          isHTML: true,
          from_name: client?.companyName,
          reply_to_email: client?.email,
        });

        if (!res?.success) {
          throw new Error(res?.message || "Invoice email failed");
        }

        if (document?.status !== "paid" && document?.status !== "partial") {
          await fetch(
            `${import.meta.env.VITE_API_BASE}/invoices/${document._id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                ...document,
                status: "sent",
                invoice_sent_date: new Date(),
              }),
            }
          );
        }

      } else {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE}/estimates/${document._id}/send-email`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              email_type: emailType,
              emails: [emailData.to],
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Estimate email failed");
        }
      }
      Swal.fire({
        icon: "success",
        title: "Email Sent",
        text: `Sent to ${emailData.to}`,
        confirmButtonColor: "#2563eb",
      });

      onCancel();

    } catch (err) {
      console.error(err);

      toast({
        variant: "destructive",
        title: "Failed to send email",
        description: err.message || "Something went wrong",
      });

    } finally {
      setIsSending(false);
    }
  };

  /* ---------------------------------------------------------------- UI */
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        onClick={onCancel}
      >
        <Card
          className="w-[90%] md:w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Share {isInvoice ? "Invoice" : "Estimate"}
            </CardTitle>

            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* TYPE SELECTOR */}
            {!isCrewView && (<div>
              <Label>{isInvoice ? "Invoice Type" : "Estimate Type"}</Label>
              <div className="flex gap-3 mt-2">
                {["summary", "details"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setEmailType(t)}
                    className={`flex flex-row items-center justify-center gap-2 flex-1 px-4 py-3 rounded-lg border-2 ${emailType === t
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200"
                      }`}
                  >
                    {t === "summary" ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                    <span className="font-medium capitalize">{t}</span>
                  </button>
                ))}
              </div>

            </div>)}

            {/* LINK */}
            <div>
              <Label>Shareable Link</Label>
              <div className="flex gap-2">
                <Input readOnly value={shareLink} />
                <Button size="icon" variant="outline" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* EMAIL */}
            <div className="space-y-4 pt-4 border-t">
              <div className="relative">
                <Label>Recipient Email</Label>

                <Input
                  value={emailData.to}
                  onChange={(e) => {
                    setEmailData({ ...emailData, to: e.target.value });
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  placeholder="Select customer or enter email"
                  autoComplete="off"
                />

                {showDropdown && customersList.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow max-h-40 overflow-y-auto">
                    {uniqueCustomers
                      .filter(
                        (c) =>
                          c.contact_name
                            ?.toLowerCase()
                            .includes(emailData.to.toLowerCase()) ||
                          c.email
                            ?.toLowerCase()
                            .includes(emailData.to.toLowerCase())
                      )
                      .map((c) => (
                        <div
                          key={c._id}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100  dark:hover:bg-gray-700"
                          onMouseDown={() => {
                            setEmailData({ ...emailData, to: c.email });
                            setShowDropdown(false);
                          }}
                        >
                          <div className="font-medium">{c.contact_name}</div>
                          <div className="text-xs text-gray-500">{c.email}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Subject</Label>
                <Input
                  value={emailData.subject}
                  onChange={(e) =>
                    setEmailData({ ...emailData, subject: e.target.value })
                  }
                />
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <Label>Message</Label>
                  <div className="flex gap-1">
                    {/* <Button
                      size="sm"
                      variant={previewMode ? "default" : "outline"}
                      onClick={() => setPreviewMode(true)}
                    >
                      <Eye className="w-3 h-3 mr-1" /> Preview
                    </Button> */}
                    {/* <Button
                      size="sm"
                      variant={!previewMode ? "default" : "outline"}
                      onClick={() => setPreviewMode(false)}
                    >
                      <Code className="w-3 h-3 mr-1" /> Edit
                    </Button> */}
                  </div>
                </div>

                {previewMode ? (
                  <div
                    className="border rounded-md p-3 min-h-[200px]"
                    dangerouslySetInnerHTML={{
                      __html: isInvoice
                        ? generateInvoiceHTML(true)
                        : generateEstimateHTML(emailData.body),
                    }}
                  />
                ) : (
                  <Textarea
                    rows={10}
                    value={emailData.body}
                    onChange={(e) =>
                      setEmailData({ ...emailData, body: e.target.value })
                    }
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send {isInvoice ? "Invoice" : "Estimate"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
