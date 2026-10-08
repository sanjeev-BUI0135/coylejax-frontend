import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Estimate } from "@/api/entities";
import { Project } from "@/api/entities";
import { Customer } from "@/api/entities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Download, Mail, Loader2, Clock, MoreVertical, MessageSquare, ArrowLeft, FileText, Eye, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { AnimatePresence } from "framer-motion";
import clientService from "../services/clientAddService";
import ShareInvoiceModal from "../components/invoices/ShareInvoiceModal";
import { useRef } from "react";
import localApi from "../services/localApi";
import api from "../services/masterDataService.js";
import TablePageSkeleton from "../components/ui/tableskeleton.jsx";
import Swal from "sweetalert2";
import { Table, Thead, Tbody, Tr, Th, Td, } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import "../App.css";
import { renderTextWithLinks, linkifyHtml } from "../components/ui/renderTextWithLinks.jsx";

const stripHtml = (html) => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EstimateHistory from "../components/estimates/details/EstimateHistory";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import formatUSPhone from "../utils/common/formatUSPhone";
import { UserService } from "../services/userservice.js";
import { formatDateUS, formatDateUTC } from "../utils/formatdate.js";
import MaterialOrderAttachments from "../components/MaterialOrders/MaterialOrderAttachments";
import { hasPermission } from "../utils/hasPermission.js";
import EstimateSmsPopup from "../components/estimates/EstimateSmsPopup.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE;
const statusColors = {
    draft: "bg-gray-100 text-gray-800temp",
    sent: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    // expired: "bg-orange-100 text-orange-800",
};

export default function EstimateDetails() {
    const [estimate, setEstimate] = useState(null);
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [user, setUser] = useState(null);
    const [me, setMe] = useState({})
    const [client, setClient] = useState(null)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const estimateRef = useRef();
    const [downloadingType, setDownloadingType] = useState(null);
    const [sharing, setSharing] = useState(false);
    const [markupData, setMarkUpData] = useState([])
    const [showActions, setShowActions] = useState(false);
    const [categories, setCategories] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [createdUser, setCreatedUser] = useState(null);
    const [isCrewView, setIsCrewView] = useState(false);
    const [shareMode, setShareMode] = useState("summary");
    const [attachments, setAttachments] = useState([]);
    const headerRef = useRef();
    const bodyRef = useRef();
    const navigate = useNavigate();
    const permissions = JSON.parse(localStorage.getItem("user") || "{}")?.permissions || [];
    const canSendSms = hasPermission(permissions, "Message", "view");
    const [showSmsModal, setShowSmsModal] = useState(false);
    let type = "markup"
    const [activeTab, setActiveTab] = useState("details");
    const [showCrewOptions, setShowCrewOptions] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api.getAll(type);
            setMarkUpData(res.data)
        } catch (err) {
            console.error(err);
            Swal.fire("Error", err.message || "Could not fetch data", "error");
        }
    }, [type]);

    useEffect(() => {
        load();
    }, [load]);

    // ================= LOAD USER / CLIENT =================
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const meRes = await localApi.getMe()
                setMe(meRes)
                const clientId = meRes.role_type === "admin" ? meRes.id : meRes.created_by
                if (clientId) {
                    const clientRes = await clientService.getClientById(clientId)
                    setClient(clientRes)
                }
            } catch (err) {
                console.error(err)
            }
        }
        fetchMe()
    }, [])

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await api.getAll("categories");
                setCategories(res.data);
            } catch (err) {
                console.error(err);
            }
        };

        const loadDivisions = async () => {
            try {
                const res = await api.getAll("divisions");
                setDivisions(res.data || res);
            } catch (err) {
                console.error(err);
            }
        };

        loadCategories();
        loadDivisions();
    }, []);

    const { id: estimateId } = useParams();
    const loadData = async () => {
        if (!estimateId) {
            setError("Estimate ID is required");
            setLoading(false);
            return;
        }

        try {
            const estimateData = await Estimate.get(estimateId);
            setEstimate(estimateData);
            setAttachments(estimateData.file_attachments || []);
            if (estimateData.created_by_user) {
                try {
                    const userData = await UserService.get(estimateData.created_by_user);
                    const name = userData?.email || "—";
                    setCreatedUser({ ...userData, displayName: name });
                } catch {
                    setCreatedUser(null);
                }
            }

            let currentUser = null;
            try {
                currentUser = await clientService.getClientById(estimateData.created_by);
            } catch {
                // console.log("Public view mode");
            }
            setUser(currentUser);

            // QUICK ESTIMATE FLOW
            if (estimateData.is_quick_estimate) {
                setProject(null);
                setCustomer(estimateData.quick_customer);
                return;
            }

            // PROJECT-BASED FLOW
            const projectData = await Project.get(estimateData.project_id);
            setProject(projectData);

            const rawCustomer = Array.isArray(projectData.customer_ids)
                ? projectData.customer_ids[0]
                : projectData.customer_ids;

            const customerId =
                typeof rawCustomer === "string"
                    ? rawCustomer
                    : rawCustomer?._id;

            if (!customerId) {
                throw new Error("Customer ID not found for project");
            }

            const customerData = await Customer.get(customerId);
            setCustomer(customerData);

        } catch (err) {
            console.error("Error loading estimate data:", err);
            setError("Failed to load estimate data");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
    }, [estimateId]);

    useEffect(() => {
        const handleAfterPrint = () => {
            setIsCrewView(false);
        };
        window.addEventListener("afterprint", handleAfterPrint);
        return () => window.removeEventListener("afterprint", handleAfterPrint);
    }, []);

    const isCrewUser = me?.role_type?.toLowerCase() === "crew view";

    const estimateTabPermission = permissions.find(
        p =>
            p.module?.toLowerCase() === "projects" &&
            p.submenu_module?.toLowerCase() === "estimates"
    );
    const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = loggedInUser?.role_type?.toLowerCase() === "admin" || me?.role_type?.toLowerCase() === "admin";
    const canUpdate = isAdmin || (estimateTabPermission?.canUpdate ?? false);

    const handleStatusChange = async (newStatus) => {
        if (estimate.status === newStatus) return;
        try {
            Swal.fire({
                title: 'Updating Status...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
            await Estimate.updateStatus(estimate.id || estimate._id, newStatus);
            Swal.fire({
                icon: 'success',
                title: 'Status Updated',
                timer: 1500,
                showConfirmButton: false
            });
            loadData();
        } catch (error) {
            console.error('Error updating status:', error);
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error.message || 'Failed to update status',
            });
        }
    };

    const handleShareEstimate = async () => {
        try {
            setSharing(true);
            let token = estimate.public_share_token;
            if (!token) {
                token = crypto.randomUUID();
            }

            const payload = {
                public_share_token: token,
            };

            // Only send project_id if it's a real project estimate
            if (!estimate.is_quick_estimate && estimate.project_id) {
                payload.project_id =
                    typeof estimate.project_id === "object"
                        ? estimate.project_id._id || estimate.project_id.id
                        : estimate.project_id;
            }

            if (!isCrewUser) {
                await Estimate.update(estimate._id, payload);
                const refreshedEstimate = await Estimate.get(estimate._id);
                setEstimate(refreshedEstimate);
            } else {
                setEstimate((prev) => ({
                    ...prev,
                    public_share_token: token,
                }));
            }
            setShowShareModal(true);
        } catch (error) {
            console.error("Failed to generate estimate share token:", error);
            alert("Failed to generate share link");
        } finally {
            setSharing(false);
        }
    };

    const handleDownloadPdf = async (type = "details") => {
        try {
            setDownloadingType(type);

            const response = await fetch(`${API_BASE_URL}/functions/generate-estimate-pdf`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    estimate_id: estimate._id,
                    pdf_type: type
                })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `estimate_${estimate.estimate_number}_${type}.pdf`;
            a.click();

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
        } finally {
            setDownloadingType(null);
        }
    };

    const handleDownloadDocx = async (type = "details") => {
        try {
            setDownloadingType(type);

            const response = await fetch(`${API_BASE_URL}/functions/generate-estimate-docx`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    estimate_id: estimate._id,
                    docx_type: type
                })
            });

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `estimate_${estimate.estimate_number}_${type}.docx`;
            a.click();

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
        } finally {
            setDownloadingType(null);
        }
    };

    if (loading) {
        return <TablePageSkeleton />
    }

    if (error || !estimate) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <div className="text-red-600 text-lg mb-4">
                    {error || "Estimate not found"}
                </div>
            </div>
        );
    }

    const filteredMarkupdata = markupData.filter((f =>
        f?.created_by === me?._id ||
        f?.created_by === user?.id ||
        f?.created_by === me?.created_by))

    const getCategoryName = (value) => {
        const found = categories.find((c) => c.value === value);
        return found ? found.display_name : value;
    };
    const getDivisionName = (value) => {
        if (!value) return "N/A";
        // Check both data structure possibilities depending on API response
        const divisionsList = Array.isArray(divisions) ? divisions : (divisions.data || []);
        const found = divisionsList.find((d) => d.value === value);
        return found ? found.display_name : value;
    };
    const displayName = estimate?.is_quick_estimate
        ? estimate?.quick_customer?.project_name || "Unnamed Project"
        : project?.project_name || "Unnamed Project";

    return (
        <div className="estimate-print-wrapper min-h-screen bg-gray-50 dark:bg-[#1f2937]">
            <div className="estimate-page-content">
                {/* Header with Actions */}
                <div className="flex items-center justify-between mb-6 hide-print">
                    <div className="flex items-center gap-2 text-gray-600">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                Back to Estimates
                            </span>
                        </Button>
                        {/* <Clock className="w-5 h-5 text-yellow-500" /> */}
                        {/* <span className="text-sm font-medium dark:text-gray-300">
                            Valid until {estimate.valid_until ? format(new Date(estimate.valid_until), 'MMM dd, yyyy') : 'N/A'}
                        </span> */}
                        {canUpdate && estimate.status !== 'approved' && estimate.status !== 'rejected' ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="outline-none hide-print">
                                    <Badge className={`${statusColors[estimate.status]} cursor-pointer`}>
                                        {estimate.status}
                                        <ChevronDown className="w-3 h-3 ml-1 inline-block" />
                                    </Badge>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {Object.keys(statusColors).map((statusKey) => (
                                        <DropdownMenuItem key={statusKey} onClick={() => handleStatusChange(statusKey)}>
                                            <span className="capitalize">{statusKey}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Badge className={`hide-print ${statusColors[estimate.status]}`}>
                                {estimate.status}
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* DESKTOP BUTTONS */}
                        <div className="hidden sm:flex items-center gap-2">
                            {estimate.status === "approved" && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            disabled={downloadingType === "crew"}
                                            className="flex items-center gap-2 border-blue-400"
                                        >
                                            {downloadingType === "crew" ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Eye className="w-4 h-4" />
                                                    Crew View
                                                </>
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => handleDownloadPdf("crew")}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Download PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownloadDocx("crew")}>
                                            <FileText className="w-4 h-4 mr-2" />
                                            Download Word
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            setIsCrewView(true);
                                            setTimeout(() => {
                                                window.print();
                                            }, 100);
                                        }}>
                                            <FileText className="w-4 h-4 mr-2" />
                                            Print
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            setShareMode("crew");
                                            handleShareEstimate();
                                        }}>
                                            <Mail className="w-4 h-4 mr-2" />
                                            Share
                                        </DropdownMenuItem>

                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {!isCrewUser && (<DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={downloadingType === "summary" || downloadingType === "details"}
                                        className="flex items-center gap-2 px-4 py-2 border-green-400 shadow-md"
                                    >
                                        {(downloadingType === "summary" || downloadingType === "details") ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4 mr-2" />
                                                Download Estimate
                                            </>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem onClick={() => handleDownloadPdf("summary")}>
                                        <Download className="w-4 h-4 mr-2" /> Summary PDF
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => handleDownloadPdf("details")}>
                                        <Download className="w-4 h-4 mr-2" /> Details PDF
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => handleDownloadDocx("summary")}>
                                        <Download className="w-4 h-4 mr-2 text-blue-600" /> Summary Word
                                    </DropdownMenuItem>

                                    <DropdownMenuItem onClick={() => handleDownloadDocx("details")}>
                                        <Download className="w-4 h-4 mr-2 text-blue-600" /> Details Word
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>)}

                            {!isCrewUser && estimate.status !== "approved" && (
                                <Button
                                    onClick={() => {
                                        setIsCrewView(false);
                                        handleShareEstimate();
                                    }}
                                    disabled={sharing}
                                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 "
                                >
                                    {sharing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating Link...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4" />
                                            Share Estimate
                                        </>
                                    )}
                                </Button>
                            )}
                            {canSendSms && estimate.status !== "approved" && (
                                <Button
                                    onClick={() => {
                                        setShowSmsModal(true)
                                    }}
                                    className="flex w-full items-center bg-blue-600 hover:bg-blue-700 gap-2 text-white rounded-md "
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Message
                                </Button>
                            )}
                        </div>

                        {/* MOBILE DROPDOWN */}
                        <div className="relative sm:hidden">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowActions(!showActions)}
                            >
                                <MoreVertical className="w-5 h-5" />
                            </Button>

                            {showActions && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                                    {estimate.status === "approved" && (
                                        <>
                                            <button
                                                onClick={() => setShowCrewOptions(!showCrewOptions)}
                                                className="flex w-full items-center justify-between px-4 py-2 hover:bg-gray-100"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Eye className="w-4 h-4" />
                                                    Crew View
                                                </div>
                                                <ChevronDown className="w-4 h-4" />
                                            </button>

                                            {/* CREW VIEW SUB OPTIONS */}
                                            {showCrewOptions && (
                                                <div>
                                                    <button
                                                        onClick={() => {
                                                            handleDownloadPdf("crew");
                                                            setShowActions(false);
                                                            setShowCrewOptions(false);
                                                        }}
                                                        className="flex w-full items-center gap-2 px-6 py-2 hover:bg-gray-100"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download PDF
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            handleDownloadDocx("crew");
                                                            setShowActions(false);
                                                            setShowCrewOptions(false);
                                                        }}
                                                        className="flex w-full items-center gap-2 px-6 py-2 hover:bg-gray-100"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                        Download Word
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setIsCrewView(true);
                                                            setTimeout(() => {
                                                                window.print();
                                                            }, 100);
                                                            setShowActions(false);
                                                            setShowCrewOptions(false);
                                                        }}
                                                        className="flex w-full items-center gap-2 px-6 py-2 hover:bg-gray-100"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                        Print
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setShareMode("crew");
                                                            handleShareEstimate();
                                                            setShowActions(false);
                                                            setShowCrewOptions(false);
                                                        }}
                                                        className="flex w-full items-center gap-2 px-6 py-2  hover:bg-gray-100"
                                                    >
                                                        <Mail className="w-4 h-4" />
                                                        Share
                                                    </button>

                                                </div>
                                            )}
                                        </>
                                    )}
                                    {!isCrewUser && (<button
                                        onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                                        className="flex w-full items-center justify-between px-4 py-2 hover:bg-gray-100"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Download className="w-4 h-4" />
                                            Download Estimate
                                        </div>
                                        <ChevronDown className="w-4 h-4" />
                                    </button>)}

                                    {/* SUB OPTIONS */}
                                    {showDownloadOptions && (
                                        <div className="border-l-2 border-green-200 pl-2">
                                            <button
                                                onClick={() => {
                                                    handleDownloadPdf("summary");
                                                    setShowActions(false);
                                                    setShowDownloadOptions(false);
                                                }}
                                                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm"
                                            >
                                                <Download className="w-4 h-4" />Summary PDF
                                            </button>

                                            <button
                                                onClick={() => {
                                                    handleDownloadPdf("details");
                                                    setShowActions(false);
                                                    setShowDownloadOptions(false);
                                                }}
                                                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm"
                                            >
                                                <Download className="w-4 h-4" />Details PDF
                                            </button>

                                            <button
                                                onClick={() => {
                                                    handleDownloadDocx("summary");
                                                    setShowActions(false);
                                                    setShowDownloadOptions(false);
                                                }}
                                                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm"
                                            >
                                                <Download className="w-4 h-4 text-blue-600" />Summary Word
                                            </button>

                                            <button
                                                onClick={() => {
                                                    handleDownloadDocx("details");
                                                    setShowActions(false);
                                                    setShowDownloadOptions(false);
                                                }}
                                                className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100 text-sm"
                                            >
                                                <Download className="w-4 h-4 text-blue-600" />Details Word
                                            </button>
                                        </div>
                                    )}
                                    {estimate.status !== "approved" && !isCrewUser && (
                                        <button
                                            onClick={handleShareEstimate}
                                            className="flex w-full items-center gap-2 px-4 py-2 hover:bg-gray-100"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Share Estimate
                                        </button>
                                    )}
                                    {canSendSms && estimate.status !== "approved" && (
                                        <button
                                            onClick={() => {
                                                setShowSmsModal(true)
                                            }}
                                            className="flex w-full items-center bg-blue-600 hover:bg-blue-700 gap-2 px-4 py-2"
                                        >
                                            <MessageSquare className="w-4 h-4" />
                                            Message
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="details">Estimate Details</TabsTrigger>
                        <TabsTrigger value="attachments">Attachments</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="print-tab-content">
                        {/* Main Card */}
                        <Card ref={estimateRef} className="shadow-lg print-area print-multipage" style={{ overflow: "visible" }}>
                            {/* Blue Header Section */}
                            <div ref={headerRef} className="bg-[#0c54aa] rounded-t-lg p-4 text-white">
                                <div className="grid grid-cols-2 md:flex md:flex-row md:justify-between items-start md:items-center gap-4 md:gap-6">
                                    {/* Logo */}
                                    <div className="bg-white rounded-lg p-3 shadow-md">
                                        <div className="w-full h-16 flex items-center justify-center">
                                            <img
                                                src={user?.logo ? `${import.meta.env.VITE_IMG}${user?.logo}` : "/default-logo.png"}
                                                alt="Logo"
                                                className="h-12"
                                            />
                                        </div>
                                    </div>

                                    {/* Total Amount */}
                                    {!isCrewUser && (
                                        <div className="bg-white text-[#0c54aa] rounded-xl px-6 py-3 md:px-8 md:py-4 text-center shadow-lg">
                                            <h3 className="text-sm md:text-lg opacity-90">Total Amount</h3>
                                            <h1 className="text-2xl md:text-3xl font-extrabold">
                                                {formatCurrency(estimate.total_amount)}
                                            </h1>
                                        </div>
                                    )}

                                    {/* Estimate Info */}
                                    <div className="col-span-2 md:col-span-1 md:text-right">
                                        <p className="text-xl font-bold">Estimate</p>
                                        <p className="text-sm opacity-90">
                                            Estimate Number: <span className="font-medium">{estimate.estimate_number}</span>
                                        </p>
                                        <p className="text-sm opacity-90">
                                            Date:{" "}
                                            <span className="font-medium">
                                                {formatDateUTC(estimate.createdAt)}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div ref={bodyRef} className="p-4 md:p-8">
                                {/* Billed To / Ship To Section */}
                                <div className="px-0">
                                    <div className="grid md:grid-cols-2 gap-2">
                                        <div className="">

                                            <h4 className="text-lg md:text-lg font-bold text-[#0c54aa] dark:text-white">Project Information</h4>
                                            <p>
                                                <strong>Project Name:</strong>{" "}

                                                {estimate?.is_quick_estimate ? (
                                                    <span>{displayName || "N/A"}</span>
                                                ) : (
                                                    <span
                                                        onClick={() => navigate(`/projects/${project?._id}`)}
                                                        className="text-blue-600 hover:underline cursor-pointer font-medium"
                                                    >
                                                        {project?.project_name || "N/A"}
                                                    </span>
                                                )}
                                            </p>
                                            <p><strong>Company Name:</strong> {customer?.company_name || estimate?.quick_customer?.company_name}</p>
                                            <p><strong>Contact Name:</strong> {
                                                estimate.is_quick_estimate
                                                    ? customer?.customer_name
                                                    : customer?.contact_name
                                            }</p>
                                            <p><strong>Company Email: </strong>{customer?.email || estimate?.quick_customer?.email_address || "N/A"}</p>
                                            <p><strong>Company Phone Number: </strong>{customer?.phone || estimate?.quick_customer?.phone_number}</p>
                                            <p>
                                                <strong>Site Address:</strong>{" "}
                                                {estimate?.is_quick_estimate
                                                    ? estimate?.quick_customer?.site_address || "N/A"
                                                    : project?.location || "N/A"}
                                            </p>
                                            {/* <p><strong>Project Start Date:</strong> {project?.estimated_start_date ? formatDateUTC(project.estimated_start_date) : estimate?.createdAt ? formatDateUTC(estimate.createdAt) : "N/A"}</p> */}
                                        </div>

                                        <div className="text-left md:text-right">
                                            <h4 className="text-lg md:text-lg font-bold text-[#0c54aa] dark:text-white">From</h4>
                                            <p><strong>Client Company Name:</strong> {user?.companyName}</p>
                                            <p><strong>Address:</strong> {user?.address}</p>
                                            <p><strong>Phone:</strong> {formatUSPhone(user?.companyPhone)}</p>
                                            <p><strong>Created By:</strong> {createdUser?.full_name || `${createdUser?.firstName || ""} ${createdUser?.lastName || ""}`.trim() || "N/A"}</p>
                                            <div><span><b>Email: </b></span>{createdUser?.email || 'N/A'}</div>
                                            <div><span><b>Division: </b></span>{getDivisionName(project?.project_type || estimate?.quick_customer?.division_type)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Line Items */}
                                <div className="mb-8 mt-6">
                                    <h4 className="text-lg md:text-lg font-bold text-[#0c54aa] mb-4 dark:text-white">
                                        Line Items
                                    </h4>
                                    <div className="rounded-lg table-print-wrapper">
                                        <Table className="rsp-table w-full rounded-lg border-collapse">
                                            <Thead className="bg-[#0c54aa] text-white rounded-lg">
                                                <Tr>
                                                    <Th className="px-4 py-3 text-left  border-2 border-gray-300 ">Category</Th>
                                                    <Th className="px-4 py-3 text-left  border-2 border-gray-300 ">Description</Th>
                                                    {isCrewView ? (
                                                        <Th className="px-4 py-3 text-center  border-2 border-gray-300 ">Quantity</Th>
                                                    ) : (
                                                        <Th className="px-4 py-3 text-right  border-2 border-gray-300 ">Total</Th>
                                                    )}
                                                </Tr>
                                            </Thead>
                                            <Tbody className="dark:text-slate-200">
                                                {estimate?.line_items?.map((item, index) => {
                                                    if (item.is_section) {
                                                        const colSpan = 3;
                                                        return (
                                                            <Tr key={index} className="bg-gray-100 dark:bg-slate-800 break-inside-avoid">
                                                                <Td colSpan={colSpan} className="px-4 py-3 text-left font-semibold border-2 border-gray-300 dark:border-slate-600 bg-gray-100 dark:bg-slate-800">
                                                                    {item.description}
                                                                </Td>
                                                            </Tr>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <Tr key={index} className="bg-white dark:bg-slate-800 break-inside-avoid">
                                                            <Td data-label="Category" className="px-4 white-space break-all  border-2 border-gray-300 dark:border-slate-600">
                                                                {getCategoryName(item.category)}
                                                            </Td>
                                                            <Td data-label="Description" className="px-4 whitespace-pre-line break-words  border-2 border-gray-300 dark:border-slate-600">
                                                                {item.description}
                                                            </Td>

                                                            {isCrewView ? (
                                                                <Td data-label="Quantity" className="px-4 py-3 text-center  border-2 border-gray-300 dark:border-slate-600 ">{item.quantity}</Td>
                                                            ) : (
                                                                <Td data-label="Total" className="px-4 py-3 text-right font-semibold  border-2 border-gray-300 dark:border-slate-600 ">{formatCurrency(item.total)}</Td>
                                                            )}

                                                        </Tr>
                                                    );
                                                })}
                                            </Tbody>
                                        </Table>
                                    </div>
                                </div>
                                 {/* Totals Section on the right */}
                                 <div className="flex justify-end mt-4 break-inside-avoid">
                                     {!(isCrewView || isCrewUser) ? (
                                         <div className="w-full md:w-1/2 bg-white dark:bg-slate-800 rounded-lg flex flex-col">
                                             <div className="w-full space-y-3 md:p-4">
                                                 <div className="flex justify-between items-center py-2 border-b">
                                                     <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                         {filteredMarkupdata?.[0]?.value ?? "Additional Markup"} :
                                                     </span>
                                                     <span className="font-semibold">{formatCurrency(estimate.material_markup_amount)}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center py-2 border-b">
                                                     <span className="text-gray-700 dark:text-gray-300 font-medium">Subtotal :</span>
                                                     <span className="font-semibold">{formatCurrency(estimate.subtotal)}</span>
                                                 </div>
                                                 {estimate.tax_rate > 0 && (
                                                     <div className="flex justify-between items-center py-2 border-b">
                                                         <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                             Tax ({(estimate.tax_rate * 100).toFixed(1)}%) :
                                                         </span>
                                                         <span className="font-semibold">{formatCurrency(estimate.tax_amount)}</span>
                                                     </div>
                                                 )}
                                                 <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-900/20 px-4 rounded-lg">
                                                     <span className="text-lg font-bold text-[#0c54aa] dark:text-blue-400">Total :</span>
                                                     <span className="text-2xl font-bold text-[#0c54aa] dark:text-blue-400">
                                                         {formatCurrency(estimate.total_amount)}
                                                     </span>
                                                 </div>
                                             </div>
                                         </div>
                                     ) : null}
                                 </div>

                                 {/* Notes, Scope & Signature Section */}
                                 <div className="mt-8 pt-6 border-t border-[#0f5ba7] space-y-6">
                                     {/* Notes */}
                                     {(estimate.notes || estimate.special_instructions) && (
                                         <div className="break-inside-avoid">
                                             <h4 className="text-[#0f5ba7] dark:text-blue-400 font-bold text-lg mb-2">Notes</h4>
                                             <div 
                                                 className="text-gray-700 dark:text-gray-300 pl-1 prose"
                                                  dangerouslySetInnerHTML={{ 
                                                      __html: linkifyHtml(estimate.notes || estimate.special_instructions) 
                                                  }}
                                             />
                                         </div>
                                     )}

                                     {/* Scope of Work */}
                                     {estimate.Scope_of_work && (
                                         <div className="break-inside-avoid">
                                             <h4 className="text-[#0f5ba7] dark:text-blue-400 font-bold text-lg mb-2">Scope of Work</h4>
                                             <div 
                                                 className="text-gray-700 dark:text-gray-300 pl-1 prose"
                                                 dangerouslySetInnerHTML={{ __html: linkifyHtml(estimate.Scope_of_work) }}
                                             />
                                         </div>
                                     )}

                                     {/* Customer Signature (below Notes & Scope, aligned to the right) */}
                                     <div className="flex justify-end w-full break-inside-avoid">
                                         <div className="rounded-lg flex flex-col mt-6 max-w-md w-full">
                                             <div className="flex justify-between items-end mb-3">
                                                 <h3 className="font-bold text-lg text-[#0c54aa]">Customer Signature </h3>
                                                 {estimate?.status === 'approved' && estimate?.approved_date && (
                                                     <div className="text-sm text-gray-500 font-medium">
                                                         Approved on: {format(new Date(estimate.approved_date), "MM/dd/yyyy hh:mm a")}
                                                     </div>
                                                 )}
                                             </div>
                                             <div className="rounded-lg border-gray-300 dark:border-slate-700 p-4 w-full flex flex-col bg-gray-50 dark:bg-slate-800 border h-36 justify-center items-center">
                                                 {estimate?.status === 'approved' && estimate?.file_attachments?.some(file => file.file_name?.includes('signature') || file.file_url?.includes('e-signature')) ? (
                                                     <img 
                                                         src={([...estimate.file_attachments].reverse().find(file => file.file_name?.includes('signature') || file.file_url?.includes('e-signature'))?.file_url || '').replace('http://localhost:5173', (import.meta.env.VITE_IMG || '').replace(/\/$/, ''))} 
                                                         alt="Customer Signature" 
                                                         className="max-h-full object-contain" 
                                                     />
                                                 ) : (
                                                     <div className="w-full h-full"></div>
                                                 )}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="attachments">
                        <MaterialOrderAttachments attachments={attachments} />
                    </TabsContent>

                    <TabsContent value="history">
                        <EstimateHistory estimateId={estimateId} />
                    </TabsContent>
                </Tabs>
            </div>

            {showShareModal && (
                <ShareInvoiceModal
                    type="estimate"
                    document={estimate}
                    customer={customer}
                    project={project}
                    user={me}
                    client={user}
                    isCrewView={shareMode === "crew"}
                    onCancel={() => setShowShareModal(false)}
                />
            )}
            <AnimatePresence>
                {showSmsModal && (
                    <EstimateSmsPopup
                        estimates={[estimate]}
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