import React, { useState, useEffect, useRef, Suspense, lazy, useMemo, useCallback } from "react";
import { Project, Customer, Estimate, Invoice, Payment, MaterialOrder, User } from "@/api/entities";
import useProjectData from "@/hooks/useProjectData";
import useProjectActions from "@/hooks/useProjectActions";
import {
  Flag, RefreshCw, Paperclip, CheckCircle, XCircle, Zap,
} from "lucide-react";
import { useLocation, useParams, useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import api from "../services/masterDataService.js";
import ProjectHeader from "@/components/projects/details/ProjectHeader";
import SummaryCards from "@/components/projects/details/SummaryCards";
import ProjectTabs from "@/components/projects/details/ProjectTabs";
import ProjectModals from "@/components/projects/details/ProjectModals";
import TablePageSkeleton from "../components/ui/tableskeleton.jsx";
import { buildPermissionMap } from "../utils/buildPermissionMap.js";
import { InventoryItem } from "../api/entities.js";
import axios from "axios";
import localApi from "../services/localApi.js";

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', icon: Flag },
  bid_submitted: { label: 'Bid Submitted', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', icon: Paperclip },
  awarded: { label: 'Awarded', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', icon: Zap },
  processing: { label: 'Processing', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', icon: RefreshCw },
  actively_working: { label: 'Actively Working', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300', icon: RefreshCw },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300', icon: CheckCircle },
  reopen: { label: 'Reopen', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300', icon: RefreshCw },
  lost: { label: 'Lost', color: 'bg-gray-400 text-white dark:bg-gray-600 dark:text-gray-400temp', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', icon: XCircle },
  draft: { label: "Draft", color: 'bg-gray-100 text-gray-800temp dark:bg-gray-700 dark:text-gray-400temp' },
  sent: { label: "Sent", color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
  approved: { label: "Approved", color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  rejected: { label: "Rejected", color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  expired: { label: "Expired", color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' },
  paid: { label: "Paid", color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  partial: { label: "Partial", color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  void: { label: "Void", color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
  unpaid: { label: "Unpaid", color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
};

const projectStatusKeys = [
  "open",
  // "bid_submitted",
  // "awarded",
  "processing",
  "actively_working",
  "completed",
  "reopen",
  "lost"
];

const priorityColors = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
};

export default function ProjectDetails() {
  const [project, setProject] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [projectCustomers, setProjectCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [materialOrders, setMaterialOrders] = useState([]);
  const [projectInventory, setProjectInventory] = useState([]);
  const [laborEntries, setLaborEntries] = useState([]);
  const [subProjects, setSubProjects] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showSubProjectForm, setShowSubProjectForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [sourceEstimateForInvoice, setSourceEstimateForInvoice] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [invoiceForPayment, setInvoiceForPayment] = useState(null);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("details");
  const [checklists, setChecklists] = useState([]);
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [customReason, setCustomReason] = useState("");
  const [loading1, setLoading1] = useState(false);
  const [divisions, setDivisions] = useState([]);
  const [showBidSubmissionForm, setShowBidSubmissionForm] = useState(false);
  const [systemConfig, setSystemConfig] = useState({ approvalThreshold: 15000 });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [allEstimatesGlobal, setAllEstimatesGlobal] = useState([])
  const [allInvoicesGlobal, setAllInvoicesGlobal] = useState([])

  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const queryId = searchParams.get('id');
  const projectId = paramId || queryId;

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

  const projectPermissions = buildPermissionMap(
    user.permissions,
    "Projects"
  );

  const { pendingMaterials, fulfilledMaterials, subProjectsTotal, totalProjectValue } = useProjectData({ materialOrders, subProjects, project });

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const {
    loadProjectDetails,
    loadChecklists,
    confirmLost,
    handleSubProjectSubmit,
    handleDeleteSubProject,
    handleProjectSubmit,
    handleStatusChange,
    handlePriorityChange,
  } = useProjectActions({
    projectId,
    setLoading,
    setProject,
    setAllCustomers,
    setEstimates,
    setAllEstimatesGlobal,
    setInvoices,
    setAllInvoicesGlobal,
    setPayments,
    setMaterialOrders,
    setProjectInventory,
    setLaborEntries,
    setAllProjects,
    setSubProjects,
    setProjectCustomers,
    setCustomer,
    setChecklists,
    setShowSubProjectForm,
    setShowLostModal,
    setLostReason,
    setCustomReason,
    setLoading1,
    projectPermissions,
    statusConfig,
  });

  useEffect(() => {
    if (projectId) {
      loadProjectDetails();
      loadChecklists();
    }
  }, [projectId, loadProjectDetails, loadChecklists]);

  // Load divisions for Terms and other UI that depends on master data
  useEffect(() => {
    const loadDivisions = async () => {
      try {
        const divisionsData = await api.getAll('divisions');
        const sorted = (divisionsData.data || divisionsData || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setDivisions(sorted);
      } catch (err) {
        console.error('Failed to load divisions:', err);
      }
    };

    loadDivisions();
  }, []);

  const loadSystemConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE;
      const [markupRes, me] = await Promise.all([
        axios.get(`${API_BASE_URL}/master-data/markup`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        localApi.getMe()
      ]);

      const markups = markupRes.data?.data || markupRes.data || [];
      if (markups.length > 0) {
        const entry =
          markups.find((m) => String(m.created_by) === String(me._id)) ||
          markups.find((m) => String(m.created_by) === String(me.created_by));

        if (entry && entry.estimate_amount) {
          setSystemConfig({
            approvalThreshold: Number(entry.estimate_amount)
          });
          return;
        }
      }
      setSystemConfig({ approvalThreshold: 15000 });
    } catch (error) {
      console.error('Failed to load system config:', error);
      setSystemConfig({ approvalThreshold: 15000 });
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      const resp = await InventoryItem.list();
      setInventoryItems(resp.data || []);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  }, []);

  useEffect(() => {
    loadSystemConfig();
    loadInventory();
  }, [loadSystemConfig, loadInventory]);

  const handleSendMail = async (orderId, estimateId, emails) => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE;
    const token = localStorage.getItem('token');

    Swal.fire({
      title: "Sending Emails...",
      html: `Sending ${emails.length} email(s)...`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await axios.post(
        `${API_BASE_URL}/materialorders/${orderId}/send-mail`,
        {
          estimateId: estimateId || "",
          emails: emails || []
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update status in local state if needed, though ProjectMaterialOrders fetches names separately
      setMaterialOrders(prevOrders =>
        prevOrders.map(order =>
          (order._id === orderId || order.id === orderId)
            ? { ...order, order_status: "Sent" }
            : order
        )
      );

      Swal.fire({
        title: "Success",
        text: "Approval email sent successfully! Status updated to 'Sent'.",
        icon: "success",
        confirmButtonText: "OK",
      });

      return response;

    } catch (error) {
      Swal.fire({
        title: "Error",
        text: "Failed to send emails. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
      throw error;
    }
  };

  const updateProjectEstimatedValue = async () => {
    if (!project) return;

    try {
      let newEstimatedValue = project.estimated_value;

      if (project.status === 'completed') {
        const totalInvoiceValue = invoices.reduce((sum, invoice) => sum + (invoice.total_amount || 0), 0);
        if (totalInvoiceValue > 0) {
          newEstimatedValue = totalInvoiceValue;
        }
      } else {
        const approvedEstimates = estimates.filter(est => est.status === 'approved');
        if (approvedEstimates.length > 0) {
          const totalApprovedValue = approvedEstimates.reduce((sum, est) => sum + (est.total_amount || 0), 0);
          newEstimatedValue = totalApprovedValue;
        }
      }

    } catch (error) {
      console.error('Error updating project estimated value:', error);
    }
  };

  useEffect(() => {
    if (project && estimates && invoices) {
      const timer = setTimeout(() => {
        updateProjectEstimatedValue();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [project?.status, estimates, invoices, project?.estimated_value]);

  // Wrapper to call hook action and handle UI flows (bid submission, reopen confirmation)
  const onStatusChange = async (newStatus) => {
    const res = await handleStatusChange(newStatus, { checklists });
    if (res?.action === 'open_bid_submission') setShowBidSubmissionForm(true);
    if (res?.action === 'open_lost_modal') setShowLostModal(true);
    if (res?.action === 'confirm_reopen') {
      const result = await Swal.fire({
        title: 'Reopen for Warranty Work?',
        html: `
        <p>This will reopen the project for warranty work.</p>
        <p class="text-sm text-amber-600 mt-2">
          <strong>Note:</strong> Estimates and invoices can be created but will NOT be sent to customers.
        </p>
      `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#8b5cf6',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Reopen for Warranty',
        cancelButtonText: 'Cancel',
      });
      if (!result.isConfirmed) return;
      await handleStatusChange(newStatus, { confirmReopen: true });
    }
  };

  const handleBidSubmit = async (bidData) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/bids`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bidData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit bid');
      }

      await Project.update(projectId, {
        status: 'bid_submitted',
        bid_submitted_date: new Date().toISOString()
      });

      toast.success('Bid submitted and project status updated successfully!');
      setShowBidSubmissionForm(false);
      loadProjectDetails();
    } catch (error) {
      console.error('Error submitting bid:', error);
      throw error;
    }
  };

  const handleEditEstimate = (estimate) => {
    setSourceEstimateForInvoice(null);
    setEditingEstimate(estimate);
    setShowEstimateForm(true);
  };

  const handleEstimateSubmit = async (estimateData) => {
    Swal.fire({
      title: "Saving...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    })
    setSaving(true);
    try {
      let savedEstimate;
      if (editingEstimate && ['sent', 'approved', 'rejected', 'expired'].includes(editingEstimate.status)) {
        const revisedData = { ...estimateData };
        const revRegex = /-R(\d+)$/;
        const match = revisedData.estimate_number.match(revRegex);
        if (match) {
          const nextRev = parseInt(match[1], 10) + 1;
          revisedData.estimate_number = revisedData.estimate_number.replace(revRegex, `-R${nextRev}`);
        } else {
          revisedData.estimate_number += "-R1";
        }
        revisedData.revision_date = new Date().toISOString().split('T')[0];
        revisedData.status = 'draft';
        savedEstimate = await Estimate.update(editingEstimate.id, revisedData);
      } else if (editingEstimate) {
        savedEstimate = await Estimate.update(editingEstimate.id, estimateData);
      } else {
        const user = await User.me();
        const dataWithManager = {
          ...estimateData,
          project_id: estimateData.project_id || project.id,
          project_manager: user.full_name,
        };
        savedEstimate = await Estimate.create(dataWithManager);
      }

      Swal.close();

      if (estimateData.file_attachments && estimateData.file_attachments.length > 0) {
        const currentProjectFiles = project.file_attachments || [];
        const estimateFiles = estimateData.file_attachments.map(file => ({
          ...file,
          source: 'estimate',
          estimate_number: estimateData.estimate_number,
          uploaded_date: new Date().toISOString()
        }));

        const existingUrls = new Set(currentProjectFiles.map(f => f.file_url));
        const newFiles = estimateFiles.filter(f => !existingUrls.has(f.file_url));

        if (newFiles.length > 0) {
          const updatedProjectFiles = [...currentProjectFiles, ...newFiles];
          await Project.update(project.id, {
            file_attachments: updatedProjectFiles
          });
        }
      }

      setShowEstimateForm(false);
      setEditingEstimate(null);
      loadProjectDetails();

    } catch (error) {
      console.error("Error saving estimate:", error);
      Swal.close();
      setSaving(false);
      throw error; // Let useEstimateLogic handle the error and show the Swal message
    } finally {
      setSaving(false);
    }
  };

  const handleEstimateStatusChange = async (estimateId, newStatus) => {
    try {
      const estimate = estimates.find(e => e.id === estimateId);
      if (!estimate) return;

      await Estimate.update(estimateId, {
        status: newStatus,
        approved_date: newStatus === 'approved' ? new Date().toISOString().split('T')[0] : estimate.approved_date,
        sent_date: newStatus === 'sent' ? new Date().toISOString().split('T')[0] : estimate.sent_date
      });

      if (newStatus === 'approved') {
        const materialItems = (estimate.line_items || []).filter(item => {
          const category = (item.category || '').toLowerCase().trim();
          const isLabor = category.includes('labor') || category.includes('labour');
          const isServiceFee = category.includes('service') && category.includes('fee');
          const isService = category === 'service_fee' || category === 'service fee';
          if (isLabor || isServiceFee || isService) {
            return false;
          }

          return true;
        });

        if (materialItems.length > 0) {
          const materialOrderData = {
            project_id: estimate.project_id,
            estimate_id: estimateId,
            order_status: 'Pending',
            requirement_status: 'Pending',
            line_items: materialItems.map(item => ({
              description: item.description,
              quantity_ordered: item.quantity,
              quantity_received: 0,
              unit: item.unit,
              unit_price: item.unit_price || 0,
              status: 'Not Ordered',
              category: item.category,
              inventory_item_id: item.inventory_item_id || null
            })),
            notes: `Material order created from approved estimate ${estimate.estimate_number}. Labor and service fee items excluded.`
          };

          const createdOrder = await MaterialOrder.create(materialOrderData);

          const estimateTotal = estimate.total_amount || 0;
          const APPROVAL_THRESHOLD = 20000;

          if (estimateTotal > APPROVAL_THRESHOLD) {
            try {
              await fetch(
                `${import.meta.env.VITE_API_BASE}/materialorders/${createdOrder._id}/sync-from-estimate`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                  body: JSON.stringify({ estimate_status: 'approved' }),
                }
              );
            } catch (syncError) {
              console.error('Error syncing requirement status:', syncError);
            }
          }

          await Project.update(estimate.project_id, {
            materials_status: 'Not Ordered'
          });

          toast.success(`Material order created with ${materialItems.length}`);
        } else {
          toast.info('Estimate approved. No material order created (only labor/service items)');
        }
      }

      if (newStatus === 'rejected') {
        const relatedMaterialOrders = materialOrders.filter(
          order => order.estimate_id === estimateId
        );

        const estimateTotal = estimate.total_amount || 0;
        const APPROVAL_THRESHOLD = 15000;

        if (estimateTotal > APPROVAL_THRESHOLD) {
          for (const order of relatedMaterialOrders) {
            try {
              await fetch(
                `${import.meta.env.VITE_API_BASE}/materialorders/${order._id}/sync-from-estimate`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                  },
                  body: JSON.stringify({ estimate_status: 'rejected' }),
                }
              );
            } catch (syncError) {
              console.error('Error syncing requirement status for rejection:', syncError);
            }
          }
        }
      }

      loadProjectDetails();
    } catch (error) {
      console.error('Error updating estimate status:', error);
      toast.error('Failed to update estimate status');
    }
  };

  const handleUpdateRequirementStatus = async (orderId, newStatus) => {
    try {
      if (newStatus === "deleted") {
        setMaterialOrders(prevOrders =>
          prevOrders.filter(order => order._id !== orderId)
        );

      } else {
        setMaterialOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === orderId
              ? { ...order, requirement_status: newStatus }
              : order
          )
        );
      }
    } catch (error) {
      console.error('Error handling requirement status update:', error);
      loadProjectDetails();
    }
  };

  const handleConvertToInvoice = (estimate) => {
    setSourceEstimateForInvoice(estimate);
    setEditingInvoice(null);
    setShowInvoiceForm(true);
  };

  const handleEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setShowInvoiceForm(true);
  };

  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setSourceEstimateForInvoice(null);
    setShowInvoiceForm(true);
  };

  const handleInvoiceSubmit = async (invoiceData) => {
    setLoading(true);

    const estimateIdToUpdate =
      editingInvoice?.estimate_id ||
      sourceEstimateForInvoice?.id ||
      sourceEstimateForInvoice?._id;

    try {
      if (!invoiceData.project_id && project) {
        invoiceData.project_id = project.id;
      }
      const dataToSubmit = {
        ...invoiceData,
        material_markup_amount: invoiceData.material_markup_amount || 0
      };

      const existingInvoicesForEstimate = (invoices || []).filter(inv => {
        return inv.estimate_id == estimateIdToUpdate;
      });

      if (!editingInvoice && estimateIdToUpdate && existingInvoicesForEstimate.length > 0) {
        const firstInvoice = existingInvoicesForEstimate
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];

        const baseNumber = firstInvoice.invoice_number.replace(/-\d+$/, "");

        const duplicates = existingInvoicesForEstimate
          .map(inv => inv.invoice_number)
          .filter(num => num.startsWith(baseNumber));

        const suffixes = duplicates.map(num => {
          const match = num.match(/-(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        });

        const nextSuffix = Math.max(...suffixes) + 1;

        const newInvoiceNumber = `${baseNumber}-${nextSuffix}`;

        dataToSubmit.invoice_number = newInvoiceNumber;
      }

      // Save or update the invoice using prepared data
      let savedInvoice;
      if (editingInvoice?._id) {
        savedInvoice = await Invoice.update(editingInvoice._id, dataToSubmit);
      } else {

        savedInvoice = await Invoice.create(dataToSubmit);
      }

      // If invoice is related to an estimate, update that estimate's invoiced amount
      if (estimateIdToUpdate) {
        try {
          const existingInvoicesForEstimate = (invoices || []).filter(inv => {
            return inv.estimate_id == estimateIdToUpdate || inv.estimate_id === estimateIdToUpdate;
          });

          const existingTotal = existingInvoicesForEstimate.reduce(
            (sum, inv) => sum + Number(inv.total_amount || 0),
            0
          );

          let totalInvoicedForEstimate = existingTotal;

          if (editingInvoice?._id) {
            // Replace the old invoice amount with the saved one
            totalInvoicedForEstimate = existingTotal - Number(editingInvoice.total_amount || 0) + Number(savedInvoice.total_amount || 0);
          } else {
            totalInvoicedForEstimate = existingTotal + Number(savedInvoice.total_amount || 0);
          }

          if (!Number.isNaN(totalInvoicedForEstimate) && totalInvoicedForEstimate >= 0) {
            await Estimate.updateInvoicedAmount(
              estimateIdToUpdate,
              totalInvoicedForEstimate
            );
          }
        } catch (estimateUpdateError) {
          console.error("Error updating estimate invoiced_amount:", estimateUpdateError);
        }
      }

      setShowInvoiceForm(false);
      setEditingInvoice(null);
      setSourceEstimateForInvoice(null);
      await loadProjectDetails();

      toast.success("Invoice saved successfully!");
    } catch (error) {
      console.error("Error saving invoice:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong while saving the invoice";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPayment = (invoice = null) => {
    setEditingPayment(null);
    setInvoiceForPayment(invoice);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async (paymentData) => {
    setLoading(true);
    try {
      if (editingPayment) {
        await Payment.update(editingPayment.id, paymentData);
      } else {
        const dataToCreate = { ...paymentData, project_id: projectId };
        if (invoiceForPayment) {
          dataToCreate.invoice_id = invoiceForPayment.id;
        }
        await Payment.create(dataToCreate);
      }
      setShowPaymentForm(false);
      setEditingPayment(null);
      setInvoiceForPayment(null);
      loadProjectDetails();
    } catch (error) {
      console.error("Error saving payment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentsUpdate = () => {
    loadProjectDetails();
  };

  const handleDeleteEstimate = (estimate) => {
    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete estimate #${estimate.estimate_number}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        Swal.fire({
          title: 'Deleting...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const res = await fetch(`${import.meta.env.VITE_API_BASE}/estimates/${estimate.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to delete');

        setEstimates((prev) => prev.filter((e) => e.id !== estimate.id));
        Swal.fire('Deleted!', 'Estimate has been deleted.', 'success');

      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    });
  };

  const handleDeleteInvoice = (invoice) => {

    Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete invoice #${invoice.invoice_number}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      try {
        Swal.fire({
          title: 'Deleting...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const res = await fetch(`${import.meta.env.VITE_API_BASE}/invoices/${invoice._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to delete');

        setInvoices(prev => prev.filter(i => i._id !== invoice._id));
        Swal.fire('Deleted!', 'Invoice has been deleted.', 'success');
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    });
  };

  if (loading) {
    return <TablePageSkeleton />;
  }

  if (!project) {
    return <div>Project not found.</div>;
  }

  const BacktoParentId = () => {
    let parentId = project.parent_id || project.parentId || project.parent_project_id;
    if (parentId && typeof parentId === 'object') {
      parentId = parentId._id || parentId.id;
    }
    if (parentId) {
      navigate(`/projects/${parentId}`);
    } else {
      toast.error('Parent project ID not found');
    }
  }

  return (
    <div>
      <ProjectHeader
        project={project}
        customer={customer}
        projectCustomers={projectCustomers}
        statusConfig={statusConfig}
        priorityColors={priorityColors}
        projectStatusKeys={projectStatusKeys}
        user={user}
        onStatusChange={onStatusChange}
        onPriorityChange={handlePriorityChange}
        onEdit={() => setShowProjectForm(true)}
        onCreateSubProject={() => setShowSubProjectForm(true)}
        onBackToParent={BacktoParentId}
        projectPermissions={projectPermissions}
        showDetails={showDetails}
        setShowDetails={setShowDetails}
      />

      {(showDetails || window.innerWidth >= 768) && (<SummaryCards
        project={project}
        projectCustomers={projectCustomers}
        customer={customer}
        subProjects={subProjects}
        onCreateSubProject={() => setShowSubProjectForm(true)}
        onDeleteSubProject={handleDeleteSubProject}
        statusConfig={statusConfig}
        priorityColors={priorityColors}
        subProjectsTotal={subProjectsTotal}
        totalProjectValue={totalProjectValue}
        user={user}

      />)}

      <ProjectTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        project={project}
        customer={customer}
        projectCustomers={projectCustomers}
        user={user}
        subProjects={subProjects}
        onCreateSubProject={() => setShowSubProjectForm(true)}
        onDeleteSubProject={handleDeleteSubProject}
        statusConfig={statusConfig}
        priorityColors={priorityColors}
        setChecklists={setChecklists}
        estimates={estimates}
        invoices={invoices}
        payments={payments}
        materialOrders={materialOrders}
        projectInventory={projectInventory}
        laborEntries={laborEntries}
        checklists={checklists}
        fulfilledMaterials={fulfilledMaterials}
        pendingMaterials={pendingMaterials}
        handleEditEstimate={handleEditEstimate}
        handleNewEstimate={() => {
          setEditingEstimate(null);
          setSourceEstimateForInvoice(null);
          setShowEstimateForm(true);
        }}
        handleEstimateStatusChange={handleEstimateStatusChange}
        onEstimateUpdate={loadProjectDetails}
        handleConvertToInvoice={handleConvertToInvoice}
        handleDeleteEstimate={handleDeleteEstimate}
        handleNewInvoice={handleNewInvoice}
        handleEditInvoice={handleEditInvoice}
        handleDeleteInvoice={handleDeleteInvoice}
        handleNewPayment={handleNewPayment}
        handleUpdateRequirementStatus={handleUpdateRequirementStatus}
        handleAttachmentsUpdate={handleAttachmentsUpdate}
        divisions={divisions}
        allProjects={allProjects}
        allCustomers={allCustomers}
        projectId={projectId}
        onAwardedDateChange={(date) => {
          if (date && project && project.awarded_date !== date) {
            setProject(prev => ({ ...prev, awarded_date: date }));
          }
        }}
        projectPermissions={projectPermissions}
        systemConfig={systemConfig}
        inventoryItems={inventoryItems}
        onSendMail={handleSendMail}
      />

      <ProjectModals
        showProjectForm={showProjectForm}
        showSubProjectForm={showSubProjectForm}
        showEstimateForm={showEstimateForm}
        showInvoiceForm={showInvoiceForm}
        showPaymentForm={showPaymentForm}
        showBidSubmissionForm={showBidSubmissionForm}
        showLostModal={showLostModal}
        project={project}
        editingEstimate={editingEstimate}
        editingInvoice={editingInvoice}
        invoiceForPayment={invoiceForPayment}
        sourceEstimateForInvoice={sourceEstimateForInvoice}
        setShowProjectForm={setShowProjectForm}
        setShowSubProjectForm={setShowSubProjectForm}
        setShowEstimateForm={setShowEstimateForm}
        setShowInvoiceForm={setShowInvoiceForm}
        setShowPaymentForm={setShowPaymentForm}
        setShowBidSubmissionForm={setShowBidSubmissionForm}
        setShowLostModal={setShowLostModal}
        lostReason={lostReason}
        setLostReason={setLostReason}
        loading1={loading1}
        projects={[project, ...subProjects]}
        customers={allCustomers}
        estimates={estimates}
        allestimates={allEstimatesGlobal}
        invoices={allInvoicesGlobal}
        subProjects={subProjects}
        onProjectSubmit={handleProjectSubmit}
        onSubProjectSubmit={handleSubProjectSubmit}
        onEstimateSubmit={handleEstimateSubmit}
        onInvoiceSubmit={handleInvoiceSubmit}
        onPaymentSubmit={handlePaymentSubmit}
        handleBidSubmit={handleBidSubmit}
        confirmLost={confirmLost}
        customReason={customReason}
        setCustomReason={setCustomReason}
      />
    </div>
  );
}