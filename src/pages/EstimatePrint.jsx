import React, { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Send, X, Loader2 } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import axios from "axios";
import Swal from "sweetalert2";
import img1 from "../assets/images/bill-to.png";
import img2 from "../assets/images/ship-to.png";
import { Button } from "@/components/ui/button";
import { getPublicEstimate } from "../api/functions";
import { formatCurrency } from "@/lib/utils";
import formatUSPhone from "../utils/common/formatUSPhone.js";
import "../App.css";
import { formatDateUS, formatDateUTC } from "../utils/formatdate.js";
import { linkifyHtml } from "../components/ui/renderTextWithLinks.jsx";

const stripHtml = (html) => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

const EstimatePrintPage = () => {
  const [estimate, setEstimate] = useState(null);
  const [project, setProject] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const sigCanvas = useRef(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [signaturePayload, setSignaturePayload] = useState(null);
  const [signatureError, setSignatureError] = useState("");
  const [status, setStatus] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [istrue, setIsTrue] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState(null);
  const queryParams = new URLSearchParams(window.location.search);
  const estimateId = queryParams.get('id');
  const [emailType, setEmailType] = useState('summary');
  const isCrewView = emailType === "crew";
  const [me, setMe] = useState([]);
  const [userData] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const [createdUser, setCreatedUser] = useState(null);
  const [markupData, setMarkUpData] = useState([]);
  
  const shouldHideNewItems = Boolean(
    project && (project.status === 'completed' || project.project_status === 'completed')
  );
  const hasNewItems = estimate?.line_items?.some(item => item.is_new === true);
  const hideItems = hasNewItems && shouldHideNewItems;

  const displayLineItems = hideItems
    ? (estimate?.line_items || []).filter(item => item.is_new !== true)
    : (estimate?.line_items || []);

  // Recompute totals for only the displayed (original) items when filtering is active
  
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
  const originalItemsTotal = displayLineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const originalItemsTaxable = displayLineItems
    .filter(i => i.category?.toLowerCase() === 'materials')
    .reduce((sum, i) => sum + (i.total || 0), 0);
  const displaySubtotal = hideItems ? originalItemsTotal : estimate?.subtotal;
  const displayTaxAmount = hideItems
    ? originalItemsTaxable * (estimate?.tax_rate || 0)
    : estimate?.tax_amount;
  const displayTotal = hideItems
    ? originalItemsTotal + originalItemsTaxable * (estimate?.tax_rate || 0)
    : estimate?.total_amount;

  useEffect(() => {
    const loadEstimateData = async () => {
      const params = new URLSearchParams(window.location.search);
      const tokens = params.get("token");
      const type = params.get("type");
      const sig = params.get("sig");

      if (!tokens) {
        setError("Invalid or missing token");
        setLoading(false);
        return;
      }

      try {
        const data = await getPublicEstimate(tokens, type, sig);
        const resolvedType = data.emailType || type;
        if (resolvedType) {
          if (resolvedType === "s" || resolvedType === "summary") {
            setEmailType("summary");
          } else if (resolvedType === "d" || resolvedType === "details") {
            setEmailType("details");
          } else if (resolvedType === "c" || resolvedType === "crew") {
            setEmailType("crew");
          }
        }
        if (data.estimate) {
          setEstimate(data.estimate);
          setStatus(data.estimate.status);
          if (data.estimate.termsAndConditions) {
            setTermsAndConditions(data.estimate.termsAndConditions);
          }
        }
        if (data.project) {
          setProject(data.project);
        }

        if (data.customer) {
          setCustomer(data.customer);
          setRecipientEmail(data.customer.email || "");
        }
        if (data.createdByUser) {
          setCreatedUser(data.createdByUser);
        }

        if (data.createdBy) {
          setUser(data.createdBy);
        }
        if (data.markupData) {
          setMarkUpData(data.markupData);
        }

        if (data.customer && data.project) {
          setCustomMessage(
            `Dear ${data.customer.contact_name || 'Valued Customer'},\n\nPlease find the estimate for project "${data.project.project_name || 'the project'}" for your review.\n\nYou can view the estimate online and approve it directly using the buttons in this email. No login is required.\n\nBest regards,\n${data.createdByUser?.companyName || 'Our Company'}`
          );
        }

      } catch (err) {
        console.error("Error loading estimate:", err);
        setError(err.message || "Unable to load estimate. Please contact support.");
      } finally {
        setLoading(false);
      }
    };

    loadEstimateData();
  }, []);

  const clearSignature = () => {
    if (sigCanvas.current) sigCanvas.current.clear();
    setSignaturePayload(null);
    setSignatureError("");
  };

  function base64ToBlob(base64, contentType = "image/png") {
    const base64Data = base64.split(",")[1];
    const byteCharacters = atob(base64Data);
    const byteArrays = new Uint8Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }

    return new Blob([byteArrays], { type: contentType });
  }

  const handleOpenApproveModal = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setSignatureError("Please provide your signature.");
      return;
    }
    setSignatureError("");

    const base64Data = sigCanvas.current.toDataURL("image/png");
    const signatureBlob = base64ToBlob(base64Data);

    const payload = {
      signatureBase64: base64Data,
      signatureBlob,
      approvedAt: new Date().toISOString(),
      notes: approveNote,
    };

    await confirmApprovalWithSignature(payload);
  };

  const confirmApprovalWithSignature = async (payload) => {
    const resolvedPayload = payload || signaturePayload;
    if (!estimate?._id) {
      alert("Estimate ID not found.");
      return;
    }
    if (!resolvedPayload) return;

    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    try {
      const formData = new FormData();
      formData.append("status", "approved");
      formData.append("signature", resolvedPayload.signatureBlob, "signature.png");
      formData.append("approvedAt", resolvedPayload.approvedAt);
      if (project?.project_name) {
        formData.append("project_name", project.project_name);
      }

      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE}/estimates/${estimate._id}/status`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const materialOrderCreated = response.data?.materialOrderCreated || false;

      setStatus("approved");
      clearSignature();
      // Show the success popup after API succeeds
      setShowApproveModal(true);

    } catch (err) {
      console.error("Approval failed:", err.response?.data || err.message);
      Swal.fire({
        title: "Approval Failed",
        text: err.response?.data?.error || err.message,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#d33",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRejectModal = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setSignatureError("Please provide your signature.");
      return;
    }
    setSignatureError("");

    const base64Data = sigCanvas.current.toDataURL("image/png");
    const signatureBlob = base64ToBlob(base64Data);

    setSignaturePayload({
      signatureBase64: base64Data,
      signatureBlob,
      rejectedAt: new Date().toISOString(),
      notes: rejectReason,
    });
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!estimate?._id) {
      alert("Estimate ID not found.");
      return;
    }
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    try {
      const formData = new FormData();
      formData.append("status", "rejected");
      formData.append("signature", signaturePayload.signatureBlob, "signature.png");
      formData.append("rejectedAt", signaturePayload.rejectedAt);
      formData.append("reject_reason", rejectReason);

      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE}/estimates/${estimate._id}/status`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStatus("rejected");
      setShowRejectModal(false);
      clearSignature();
      Swal.fire({
        icon: "success",
        title: "Estimate Rejected",
        text: "Estimate rejected successfully!",
        confirmButtonColor: "#3085d6",
      });

    } catch (err) {
      console.error("Rejection failed:", err.response?.data || err.message);
      Swal.fire({
        icon: "error",
        title: "Rejection Failed",
        text: err.response?.data?.error || err.message,
        confirmButtonColor: "#d33",
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

  const displayName = estimate?.is_quick_estimate
    ? estimate?.quick_customer?.project_name || "Unnamed Project"
    : project?.project_name || "Unnamed Project";

  const handleDownloadEstimate = () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Token not found.",
        confirmButtonColor: "#d33",
      });
      return;
    }
    const downloadUrl = `${import.meta.env.VITE_API_BASE.replace('/api', '')}/api/functions/download-estimate-public/${token}?type=${emailType}`;
    window.open(downloadUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading estimate...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        <span>Error: {error}</span>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span>Estimate not found</span>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray50-temp py-4 w-full">
      <div className="min-h-screen flex flex-col items-center w-full max-w-4xl md:max-w-6xl mx-auto bg-white shadow-md rounded-lg">
        <div className="w-full bg-[#0c54aa] rounded-t-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-white rounded-lg p-2 w-auto">
            <img
              src={user?.logo ? `${import.meta.env.VITE_IMG}${user.logo}` : '/default-logo.png'}
              alt="Company Logo"
              className="h-12 w-auto"
            />
          </div>
          {!isCrewView && (<div className="bg-white text-[#195daf] rounded-lg px-4 py-2 shadow-md text-center 
                  w-auto">
            <p className="text-sm">{hasNewItems ? 'Additional Amount' : 'Estimate Amount'}</p>
            <p className="text-xl font-bold">
              {formatCurrency(displayTotal)}
            </p>
          </div>)}
          <div className="text-white w-full sm:w-auto md:text-right sm:text-right">
            <p className="text-xl font-semibold">Estimate</p>
            <p className="text-sm break-all">
              Estimate Number:{" "}
              <span className="font-bold">{estimate?.estimate_number}</span>
            </p>
            <p className="text-sm opacity-90">
              Date:{" "}
              <span className="font-medium">
                {format(new Date(estimate.createdAt), "MM/dd/yyyy")}
              </span>
            </p>
          </div>

        </div>

        <div className="p-6 w-full rounded-b-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4">
            <div>
              <div className="flex items-center mb-4">
                <div>
                  <img src={img1} alt="Project Icon" className="w-16 h-16 object-contain" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-[#0c54aa]">Project Information</h2>

              <div className="">
                {/* <div><span>Customer PO Number:</span> <b> {estimate?.customer_po_number || 'N/A'}</b></div> */}
                <div><span>Project Name:</span> <b> {displayName || 'N/A'}</b></div>
                <div><span>Company Name:</span> <b> {customer?.company_name || estimate?.quick_customer?.company_name || 'N/A'}</b></div>
                <div><span>Contact Name:</span> <b> {customer?.contact_name || estimate?.quick_customer?.customer_name || 'N/A'}</b></div>
                <div><span>Company Email:</span> <b> {customer?.email || estimate?.quick_customer?.customer_email || 'N/A'}</b></div>
                <div><span>Company Phone Number:</span><b> {customer?.phone || estimate?.quick_customer?.customer_phone || 'N/A'}</b></div>
                <div><span>Site Address:</span> <b> {estimate?.is_quick_estimate
                                                    ? estimate?.quick_customer?.site_address || "N/A"
                                                    : project.location || "N/A"}</b></div>
                {/* <div><span>Project Start Date:</span><b> {project?.estimated_start_date ? formatDateUTC(project.estimated_start_date) : estimate?.createdAt ? formatDateUTC(estimate.createdAt) : "N/A"}</b></div> */}
              </div>
            </div>

            <div>
              <div className="flex items-center mb-4">
                <div className="md:ml-auto">
                  <img src={img2} alt="Client Icon" className="w-16 h-16 object-contain" />
                </div>
              </div>

              <div className="md:text-right">
                <h2 className="text-700 font-bold mb-2 text-[#1157ac] text-xl">From</h2>
                <p><span>Client Name:</span> <b>{`${user?.firstName} ${user?.lastName}` || 'N/A'}</b></p>
                <p><span>Address:</span> <b>{user?.address || 'N/A'}</b></p>
                <p>
                  <span>Phone Number:</span>{' '}
                  <b>{formatUSPhone(user?.companyPhone)}</b>
                </p>
                <p><span>Created By:</span> <b>{createdUser?.full_name || `${createdUser?.firstName || ""} ${createdUser?.lastName || ""}`.trim() || "N/A"}</b></p>
                <div><span>Email: </span><b>{createdUser?.email || 'N/A'}</b></div>
                <div><span>Division: </span><b>{estimate?.divisionDisplayName || formatDivisionName(project?.project_type || estimate?.quick_customer?.division_type)}</b></div>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-[#0c54aa] mb-4">Line Items</h3>
            {displayLineItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 text-sm">
                  <thead className="bg-[#0c54aa] text-white">
                    <tr >
                      <th className="border border-gray-300 p-2 text-left font-medium">Category</th>
                      <th className="border border-gray-300 p-2 text-left font-medium">Description</th>
                      {isCrewView && (<th className="border border-gray-300 p-2 text-center font-medium">Qty</th>)}
                      {emailType !== 'summary' && !isCrewView && (
                        <>
                          {/* <th className="border border-gray-300 p-2 text-center font-medium">Unit</th>
                          <th className="border border-gray-300 p-2 text-right font-medium">Unit Price</th>
                          <th className="border border-gray-300 p-2 text-right font-medium">Markup %</th> */}
                          <th className="border border-gray-300 p-2 text-right font-medium">Total</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {displayLineItems.map((item, index) => {
                      if (item.is_section) {
                        const colSpan = emailType === 'summary' ? 2 : (isCrewView ? 3 : 3);
                        return (
                          <tr key={index} className="bg-gray-100">
                            <td colSpan={colSpan} className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
                              {capitalizeFirst(item.description)}
                            </td>
                          </tr>
                        );
                      }
                      
                      return (
                        <tr key={index} className="bg-white">
                          <td className="border border-gray-300 p-2 capitalize white-space break-all">{capitalizeFirst(item?.category_display_name)}</td>
                          <td className="border border-gray-300 p-2 whitespace-pre-line break-all">{capitalizeFirst(item.description)}</td>
                          {isCrewView && (<td className="border border-gray-300 p-2 text-center">{item.quantity}</td>)}
                          {emailType !== 'summary' && !isCrewView && (
                            <>
                              {/* <td className="border border-gray-300 p-2 text-center">{item.unit}</td>
                              <td className="border border-gray-300 p-2 text-right">${item.unit_price?.toFixed(2)}</td>
                              <td className="border p-2 text-right">{item?.markup_percentage || 0}%</td> */}
                              <td className="border border-gray-300 p-2 text-right font-medium">${item.total?.toFixed(2)}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-gray-500temp text-center py-8">No line items available</div>
            )}
          </div>

          {/* UPDATED LAYOUT: Total on right */}
          {!isCrewView && (
            <div className="flex justify-end mt-4">
              {/* Summary */}
              <div className="w-full sm:w-1/2 bg-white rounded-lg flex flex-col">
                <div className="space-y-3 bg-gray-100 rounded-lg p-2 flex flex-col">
                  {emailType !== "summary" && !isCrewView && !hasNewItems && (
                    <div className="flex justify-between md:text-2xl">
                      <span>{markupData?.value ?? "Additional Markup"}:</span>
                      <span className="font-semibold md:font-bold">
                        {formatCurrency(estimate?.material_markup_amount)}
                      </span>
                    </div>
                  )}

                  {emailType !== "summary" && !isCrewView && (
                    <p className="flex justify-between md:text-2xl">
                      <span>Subtotal:</span>
                      <span className="font-semibold md:font-bold">
                        {formatCurrency(displaySubtotal)}
                      </span>
                    </p>
                  )}

                  {estimate?.tax_rate > 0 && emailType !== "summary" && !isCrewView && (
                    <p className="flex justify-between md:text-2xl">
                      <span>Tax ({(estimate.tax_rate * 100).toFixed(1)}%):</span>
                      <span className="font-semibold md:font-bold">
                        {formatCurrency(displayTaxAmount)}
                      </span>
                    </p>
                  )}

                  {!isCrewView && (
                    <p className="flex justify-between text-xl md:text-4xl bg-[#d0d0d0] p-2 border-2 border-white rounded">
                      <span>Total:</span>
                      <span className="font-semibold md:font-bold">
                        {formatCurrency(displayTotal)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isCrewView && estimate?.notes && (
            <div className="mt-6 shadow-sm">
              <h3 className="font-bold text-lg mb-3">Notes:</h3>
              <div 
                className="text-base p-4 rounded-lg bg-gray-100 prose max-w-none"
                dangerouslySetInnerHTML={{ __html: linkifyHtml(estimate.notes) }}
              />
            </div>
          )}

          {estimate?.Scope_of_work && (
            <div className="mt-6 shadow-sm">
              <h3 className="font-bold text-lg mb-3">Scope of Work:</h3>
              <div 
                className="text-base p-4 rounded-lg bg-gray-100 prose max-w-none"
                dangerouslySetInnerHTML={{ __html: estimate.Scope_of_work }}
              />
            </div>
          )}

          {/* DYNAMIC TERMS AND CONDITIONS - FULL WIDTH BELOW */}
          {!isCrewView && termsAndConditions && (
            <div className="mt-6 shadow-sm">
              <h3 className="font-bold text-lg mb-3">Terms and Conditions: </h3>
              <div className="text-sm p-4 rounded-lg overflow-auto max-h-96 bg-gray50-temp ">

                <div
                  className="terms-content whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: termsAndConditions }}
                />

              </div>
            </div>)}
      
        {!isCrewView && (status === null || (status !== "approved" && status !== "rejected")) && (
          <div className="grid md:grid-cols-2 gap-8 items-start px-2 mt-6">
            {/* Left side: I agree checkbox */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                name=""
                id="agree-checkbox"
                checked={istrue}
                onChange={(e) => setIsTrue(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="agree-checkbox" className="text-sm font-medium">
                I agree to the terms and condition <span className="text-red-500">*</span>
              </label>
            </div>

            {/* Right side: Customer Signature drawing pad */}
            <div className="rounded-lg flex flex-col w-full max-w-md ml-auto">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">Customer Signature:</h3>
                <button
                  onClick={clearSignature}
                  className="text-sm text-red-600 px-3 py-1 border border-red-300 rounded bg-white hover:bg-red-50 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="rounded-lg border-gray-300 p-2 w-full flex flex-col bg-gray-100 border">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  clearOnResize={false}
                  canvasProps={{
                    className: "w-full h-36 border border-gray-300 rounded bg-white",
                  }}
                />
                {signatureError && (
                  <p className="text-red-500 text-sm mt-2">{signatureError}</p>
                )}
              </div>
            </div>
          </div>
        )}

          {status === null || (status !== "approved" && status !== "rejected") ? (
            <div className="flex justify-between mt-3">
              {!isCrewView && (
                <Button onClick={handleOpenRejectModal} className="bg-[#ff7575] text-white px-6 py-2 rounded-lg">
                  Decline
                </Button>
              )}
              {!isCrewView && (
                <Button onClick={handleOpenApproveModal} className="bg-[#0c54aa] text-white px-6 py-2 rounded-lg" disabled={istrue === false}>
                  Approve
                </Button>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-row items-center justify-end gap-3 pr-4 mt-2">
              <p
                className={`text-lg font-semibold ${status === "approved" ? "text-green-600" : "text-red-600"}`}
              >
                {status === "approved" ? "Approved" : "Declined"}
              </p>
              {status === "approved" && !isCrewView && (
                <Button onClick={handleDownloadEstimate} className="bg-[#0c54aa] text-white px-6 py-2 rounded-lg flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Download Estimate
                </Button>
              )}
            </div>
          )}


          {showApproveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl w-11/12 max-w-md shadow-lg p-6 text-center">
                <div className="bg-[#bcdbff] rounded-t-xl p-4 -m-6 mb-4">
                  <h3 className="text-xl font-bold text-[#030405]">Estimate Approved</h3>
                </div>

                <img src={user?.logo ? `${import.meta.env.VITE_IMG}${user.logo}` : '/default-logo.png'} alt="Logo" />
                <p className="mb-6">
                  The estimate <b>{estimate?.estimate_number}</b> has been approved successfully.
                </p>

                <button
                  onClick={() => setShowApproveModal(false)}
                  className="bg-[#0c54aa] text-white px-6 py-2 rounded-lg flex items-center justify-center mx-auto"
                >
                  Ok
                </button>
              </div>
            </div>
          )}

          {showRejectModal && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowRejectModal(false)}
            >
              <div
                className="bg-white rounded-xl w-11/12 max-w-md shadow-lg p-6 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#ffd1d1] rounded-t-xl p-4 -m-6 mb-4">
                  <h3 className="text-xl font-bold text-[#030405]">Estimate Rejected</h3>
                </div>

                <img src={user?.logo ? `${import.meta.env.VITE_IMG}${user.logo}` : '/default-logo.png'} alt="Logo" />

                <div className="mb-4 text-left">
                  <label className="block text-sm font-medium text-gray-700temp mb-1">
                    Reason for Decline
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={3}
                    placeholder="Please provide a reason..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>

                <p className="mb-6">
                  The estimate <b>{estimate?.estimate_number}</b> will be rejected.
                </p>

                <button
                  onClick={async () => {
                    await confirmReject();
                  }}
                  disabled={loading || !rejectReason.trim()}
                  className={`bg-red-600 text-white px-6 py-2 rounded-lg flex items-center justify-center mx-auto ${loading || !rejectReason.trim() ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                >
                  {loading ? "Rejecting..." : "Ok"}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-center text-center space-y-2 p-4 bg-[#cdcdcd] rounded-lg shadow-sm mt-6">
            <p className="text-black-900 font-medium">
              {user?.address || ''} | <span className="text-600 text-[#0c54aa]">{formatUSPhone(user?.companyPhone || '')}</span> |
              <span className="text-600 text-[#0c54aa]"> {user?.email || ''}</span>
            </p>
            <p className="text-black-900 text-sm">Copyright © {new Date().getFullYear()} Project Management.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstimatePrintPage;
