import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate, useParams } from 'react-router-dom';
import { MaterialOrder, InventoryItem, Estimate, Project } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Truck, CheckCircle, XCircle, Warehouse, ArrowLeft, ThumbsDown, MessageCircle, X, ArrowUp, ArrowDown, Plus, Info, Mail } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { formatProjectName } from '@/lib/utils';
import AllocateFromStockForm from '../components/inventory/AllocateFromStockForm';
import ApprovalPopup from "../components/approvalpopup/approvalPopup";
import RejectPopup from '../components/approvalpopup/rejectPopup';
import Swal from 'sweetalert2';
import TablePageSkeleton from '../components/ui/tableskeleton';
import InventoryItemForm from "../components/inventory/InventoryItemForm";
import masterDataService from '../services/masterDataService';
import localApi from '../services/localApi';
import InventoryPreviewModal from "../components/MaterialOrders/InventoryPreviewModal";
import MaterialOrderHistory from "../components/MaterialOrders/MaterialOrderHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "../App.css";
import MaterialOrderAttachments from '../components/MaterialOrders/MaterialOrderAttachments';

const statusConfig = {
  Pending: { icon: Package, color: 'bg-yellow-100 text-yellow-800' },
  Ordered: { icon: Truck, color: 'bg-blue-100 text-blue-800' },
  'Partially Received': { icon: Truck, color: 'bg-orange-100 text-orange-800' },
  Fulfilled: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  Cancelled: { icon: XCircle, color: 'bg-red-100 text-red-800' },
  Approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  Rejected: { icon: XCircle, color: 'bg-red-100 text-red-800' },
};

const lineItemStatusConfig = {
  'Not Ordered': { color: 'bg-gray-100 text-gray-800temp' },
  Ordered: { color: 'bg-blue-100 text-blue-800' },
  'Partially Received': { color: 'bg-orange-100 text-orange-800' },
  Received: { color: 'bg-green-100 text-green-800' },
};

export default function MaterialOrderDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const [materialOrder, setMaterialOrder] = useState(null);
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receiveQuantities, setReceiveQuantities] = useState({});
  const [allocatingItem, setAllocatingItem] = useState(null);
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const { id: paramId } = useParams();
  const queryId = new URLSearchParams(location.search).get('id');
  const orderId = paramId || queryId;
  const [action, setAction] = useState(null);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [estimateLimit, setEstimateLimit] = useState(15000);
  const anyItemOutOfStock =
    materialOrder?.line_items?.some(
      (item) => item.inventory_status === "Out of Stock"
    );
  const loggedInEmail = user?.email?.toLowerCase();

  const approverEmails = materialOrder?.approver_emails?.map(e => e.toLowerCase()) || [];

  const canApprove = approverEmails.includes(loggedInEmail);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAction(params.get("action"));
  }, []);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const orderData = await MaterialOrder.get(orderId);

      if (orderData.order_status === 'Partially Received') {
        orderData.order_status = 'Ordered';
      }

      if ((!orderData.line_items || orderData.line_items.length === 0) && orderData.estimate_data?.line_items) {
        orderData.line_items = orderData.estimate_data.line_items.map(item => ({
          description: item.description,
          quantity_ordered: item.quantity || 0,
          quantity_received: 0,
          unit: item.unit,
          unit_price: item.unit_price || 0,
          total: item.total || 0,
          status: 'Not Ordered',
          category: item.category || 'materials',
          _id: item._id
        }));
      }

      if (orderData.line_items?.length) {
        const updatedItems = await Promise.all(
          orderData.line_items.map(async (item) => {
            if (item.status === 'Partially Received') {
              item.status = 'Ordered';
            }
            if (!item.inventory_item_id) {
              return { ...item, inventory_cost: 0, inventory_status: "Not Available" };
            }

            try {
              const inv = await InventoryItem.get(item.inventory_item_id);
              return {
                ...item,
                inventory_cost: inv?.unit_cost || 0,
                inventory_status:
                  inv?.quantity > 0 ? "In Stock" : "Out of Stock",
                inventory_available_qty: inv?.quantity || 0,
                project_only: item.project_only ?? true
              };
            } catch {
              return { ...item, inventory_cost: 0 };
            }
          })
        );

        orderData.line_items = updatedItems;
      }

      setMaterialOrder(orderData);

      // Fetch dynamic estimate limit from master data
      try {
        const [markupRes, me] = await Promise.all([
          masterDataService.getAll("markup"),
          localApi.getMe(),
        ]);
        const markups = Array.isArray(markupRes) ? markupRes : markupRes.data || [];
        if (markups.length > 0) {
          const entry =
            markups.find((m) => String(m.created_by) === String(me._id)) ||
            markups.find((m) => String(m.created_by) === String(me.created_by));
          if (entry && entry.estimate_amount) {
            setEstimateLimit(Number(entry.estimate_amount));
          }
        }
      } catch (err) {
        console.error("Failed to fetch markup settings:", err);
      }

      if (orderData.estimate_id) {
        try {
          const estimateData = await Estimate.get(orderData.estimate_id);
          setEstimate(estimateData);
        } catch (err) {
          console.error("Failed to load estimate:", err);
        }
      }

      if (orderData.project_id) {
        try {
          const projectData = await Project.get(orderData.project_id);
          setProject(projectData);
          setAttachments(projectData.file_attachments || []);
        } catch (projectError) {
          console.warn('Project not found for Material Order:', orderData.project_id);
          setProject(null);
        }
      } else {
        setProject(null);
      }
    } catch (orderError) {
      console.error('Failed to load material order:', orderError);
      setError('Failed to load material order details. It may have been deleted.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryItems();
  }, []);

  const loadInventoryItems = async () => {
    try {
      const items = await InventoryItem.list();
      setInventoryItems(items.data || []);
    } catch (err) {
      console.error("Failed to load inventory items:", err);
    }
  };

  const calculateOverallStatus = (lineItems) => {
    if (!lineItems || lineItems.length === 0) return 'Pending';

    const receivedItems = lineItems.filter(item => item.status === 'Received');
    const orderedItems = lineItems.filter(item => item.status === 'Ordered' || item.status === 'Partially Received');

    if (receivedItems.length === lineItems.length) {
      return 'Fulfilled';
    } else if (receivedItems.length > 0 || orderedItems.length > 0) {
      return 'Ordered';
    } else {
      return 'Pending';
    }
  };

  const updateLineItemStatus = async (itemIndex, newStatus) => {
    if (!materialOrder) return;
    const item = materialOrder.line_items[itemIndex];
    let finalStatus = newStatus;

    if (
      (newStatus === "Ordered" || newStatus === "Partially Received") &&
      item.inventory_item_id
    ) {
      const inv = await InventoryItem.get(item.inventory_item_id);

      if (!inv || Number(inv.quantity) <= 0) {
        Swal.fire({
          icon: "error",
          title: "Out of Stock",
          text: `${item.description} is out of stock. Cannot proceed with order.`,
        });
        return;
      }
    }

    setUpdatingItems(prev => new Set(prev).add(itemIndex));

    try {
      const updatedLineItems = [...materialOrder.line_items];
      let currentItem = { ...updatedLineItems[itemIndex] };

      if (newStatus === "Ordered") {
        const quantityOrdered = currentItem.quantity_ordered || currentItem.quantity || 0;
        let inventoryId = currentItem.inventory_item_id;

        // Auto-add "Not Available" item as project-only inventory item
        if (!inventoryId && currentItem.is_Upload_Toggle !== true) {
          currentItem.is_Upload_Toggle = true;
          currentItem.project_only = true;
          currentItem.received_date = currentItem.received_date || new Date().toISOString().split("T")[0];
        }

        let inv = null;
        if (inventoryId) {
          inv = await InventoryItem.get(inventoryId);
          const currentQty = Number(inv?.quantity || 0);

          if (quantityOrdered > currentQty && !currentItem.project_only) {
            // Already caught by stock check earlier if it was an existing item, 
            // but just to be safe if qty ordered > currentQty
          }

          if (currentQty >= quantityOrdered) {
            await InventoryItem.update(inventoryId, {
              quantity: currentQty - quantityOrdered,
            });
          }
        }

        if (materialOrder.project_id) {
          const projectData = await Project.get(materialOrder.project_id);
          const allocatedMaterials = projectData.allocated_materials || [];
          const existingIndex = allocatedMaterials.findIndex(mat =>
            mat.item_name?.toLowerCase().trim() === currentItem.description?.toLowerCase().trim()
          );

          if (existingIndex !== -1) {
            allocatedMaterials[existingIndex].quantity += quantityOrdered;
            allocatedMaterials[existingIndex].last_allocated_date = new Date().toISOString().split('T')[0];
          } else {
            allocatedMaterials.push({
              inventory_item_id: inventoryId,
              item_name: currentItem.description,
              quantity: quantityOrdered,
              unit: currentItem.unit,
              location: inv?.location || "main_warehouse",
              category: currentItem.category || 'materials',
              allocated_date: new Date().toISOString().split('T')[0],
              last_allocated_date: new Date().toISOString().split('T')[0],
              material_order_id: materialOrder._id
            });
          }

          await Project.update(materialOrder.project_id, {
            allocated_materials: allocatedMaterials
          });
        }

        currentItem.quantity_received = quantityOrdered;
        currentItem.received_date = new Date().toISOString().split('T')[0];
        finalStatus = 'Ordered';
      }

      currentItem.status = finalStatus;
      updatedLineItems[itemIndex] = currentItem;
      let newOverallStatus = materialOrder.order_status;

      // Only recalculate if order is not already approved/rejected
      if (
        materialOrder.order_status !== "Approved" &&
        materialOrder.order_status !== "Rejected"
      ) {
        newOverallStatus = calculateOverallStatus(updatedLineItems);
      }

      await MaterialOrder.update(orderId, {
        line_items: updatedLineItems,
        order_status: newOverallStatus,
      });

      loadOrderDetails();
    } catch (error) {
      console.error('Failed to update line item status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemIndex);
        return newSet;
      });
    }
  };

  const handleReceiveQuantity = async (itemIndex) => {
    if (!materialOrder) return;

    setUpdatingItems(prev => new Set(prev).add(itemIndex));

    try {
      const item = materialOrder.line_items[itemIndex];
      const receivedQty = parseFloat(receiveQuantities[itemIndex] || 0);
      if (receivedQty <= 0) {
        alert('Please enter a valid quantity received');
        setUpdatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemIndex);
          return newSet;
        });
        return;
      }

      if (item.is_Upload_Toggle === false && !item.inventory_item_id) {
        Swal.fire({
          icon: "warning",
          title: "Inventory Details Required",
          html: `
      <div style="text-align:left;">
        <p>Before receiving this item , please complete the inventory information:</p>
        <ol style="margin-top:10px; padding-left:20px;">
          <li>1.Go to <b>Actions</b> column.</li>
          <li>2.Click the <b>+</b> button.</li>
          <li>3.Enter inventory details and save.</li>
          <li>4.After saving, you can receive the delivery.</li>
        </ol>
      </div>
    `,
          confirmButtonText: "OK",
        });

        setUpdatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemIndex);
          return newSet;
        });

        return;
      }

      const quantityOrdered = item.quantity_ordered || item.quantity || 0;
      const newQuantityReceived = (item.quantity_received || 0) + receivedQty;
      if (newQuantityReceived > quantityOrdered) {
        Swal.fire({
          icon: "error",
          title: "Exceeds Ordered Quantity",
          text: `You ordered only ${quantityOrdered}`,
        });
        return;
      }
      let inv = null;
      if (item.inventory_item_id) {

        inv = await InventoryItem.get(item.inventory_item_id);
        const currentQty = Number(inv?.quantity || 0);

        if (receivedQty > currentQty) {
          Swal.fire({
            icon: "error",
            title: "Insufficient Stock",
            text: `Only ${inv.item_name} ${currentQty} available in inventory.`,
          });
          return;
        }
        await InventoryItem.update(item.inventory_item_id, {
          quantity: currentQty - receivedQty,
        });
      }
      if (materialOrder.project_id) {

        const projectData = await Project.get(materialOrder.project_id);
        const allocatedMaterials = projectData.allocated_materials || [];

        const existingIndex = allocatedMaterials.findIndex(mat =>
          mat.item_name?.toLowerCase().trim() === item.description?.toLowerCase().trim()
        );

        if (existingIndex !== -1) {
          allocatedMaterials[existingIndex].quantity += receivedQty;
          allocatedMaterials[existingIndex].last_allocated_date = new Date().toISOString().split('T')[0];
        } else {
          allocatedMaterials.push({
            inventory_item_id: item.inventory_item_id,
            item_name: item.description,
            quantity: receivedQty,
            unit: item.unit,
            location: inv?.location || "main_warehouse",
            category: item.category || 'materials',
            allocated_date: new Date().toISOString().split('T')[0],
            last_allocated_date: new Date().toISOString().split('T')[0],
            material_order_id: materialOrder._id
          });
        }

        await Project.update(materialOrder.project_id, {
          allocated_materials: allocatedMaterials
        });
      }
      let newStatus = 'Received';
      if (newQuantityReceived < quantityOrdered) {
        newStatus = 'Ordered';
      }

      const updatedLineItems = [...materialOrder.line_items];
      updatedLineItems[itemIndex] = {
        ...item,
        quantity_received: newQuantityReceived,
        status: newStatus,
        received_date: new Date().toISOString().split('T')[0],
      };

      let newOverallStatus = materialOrder.order_status;
      if (
        materialOrder.order_status !== "Approved" &&
        materialOrder.order_status !== "Rejected"
      ) {
        newOverallStatus = calculateOverallStatus(updatedLineItems);
      }
      await MaterialOrder.update(orderId, {
        line_items: updatedLineItems,
        order_status: newOverallStatus,
      });

      setReceiveQuantities(prev => ({ ...prev, [itemIndex]: '' }));
      loadOrderDetails();
    } catch (error) {
      console.error('Failed to receive quantity:', error);
      alert('Failed to receive quantity. Please try again.');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemIndex);
        return newSet;
      });
    }
  };

  const handleAllocationSuccess = async () => {
    if (!allocatingItem || !materialOrder) return;

    const itemIndex = allocatingItem.index;
    const item = materialOrder.line_items[itemIndex];

    try {
      const currentProject = await Project.get(materialOrder.project_id);
      const allocatedMaterials = currentProject.allocated_materials || [];

      const matchingMaterial = allocatedMaterials.find(mat =>
        mat.item_name?.toLowerCase().trim() === (item.item_name || item.description)?.toLowerCase().trim()
      );

      const allocatedQty = matchingMaterial ? matchingMaterial.quantity : 0;
      const quantityOrdered = parseFloat(item.quantity_ordered || item.quantity || 0);

      let newStatus = 'Not Ordered';
      if (allocatedQty > 0) {
        newStatus = 'Ordered';
      }

      const updatedLineItems = [...materialOrder.line_items];
      updatedLineItems[itemIndex] = {
        ...item,
        quantity_received: allocatedQty,
        status: newStatus,
        received_date: allocatedQty > 0 ? new Date().toISOString().split('T')[0] : item.received_date,
      };

      await MaterialOrder.update(orderId, {
        line_items: updatedLineItems,
        order_status: calculateOverallStatus(updatedLineItems),
      });

      setAllocatingItem(null);
      await loadOrderDetails();
    } catch (error) {
      console.error('Failed to update after allocation:', error);
    }
  };

  const handleOpenAllocation = (item, index) => {
    setAllocatingItem({ ...item, index });
  };
  const handleNavigateToMaterialOrders = (projectId) => {
  };

  const handleApprove = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/materialorders/${orderId}/approval-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            order_status: "Approved",
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to approve");
      }

      setShowApprovalPopup(true);
      await loadOrderDetails();

      window.dispatchEvent(
        new CustomEvent("materialOrderUpdated", {
          detail: { orderId, status: "Approved" },
        })
      );
    } catch (err) {
      console.error("Failed to approve order:", err);
    }
  };

  const handleApprove15K = async (approveAction = "Approved") => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/materialorders/${orderId}/approve-15k`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            action: approveAction,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `Failed to update ${estimateLimit / 1000}K approval`);
      }

      if (approveAction === "Approved") {
        setShowApprovalPopup(true);
        window.dispatchEvent(
          new CustomEvent("materialOrderUpdated", {
            detail: { orderId, status: "Approved" },
          })
        );
      }

      await Swal.fire({
        title: approveAction === "Approved" ? "Approved" : "Rejected",
        text: `${estimateLimit / 1000}K Approval has been ${approveAction.toLowerCase()} successfully.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      // Clear the action from URL to prevent loop/confusion
      const newUrl = window.location.pathname + window.location.search.replace(/&?action=(approve|reject)/g, "");
      window.history.replaceState({}, '', newUrl);
      setAction(null);

      await loadOrderDetails();
      
      if (approveAction === "Rejected") {
        navigate(createPageUrl("MaterialOrders"));
      }
    } catch (err) {
      console.error(`Failed to approve ${estimateLimit / 1000}K order:`, err);
      Swal.fire({
        title: "Error",
        text: err.message || "Failed to update internal approval.",
        icon: "error"
      });
    }
  };

  const handleReject = async (projectId, reason) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/materialorders/${orderId}/approval-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            order_status: "Rejected",
            rejection_reason: reason,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to reject");
      }

      setShowRejectPopup(false);

      await Swal.fire({
        title: "Rejected",
        text: "Material order has been rejected successfully.",
        icon: "success",
        confirmButtonText: "OK",
      });

      navigate(createPageUrl("MaterialOrders"));
    } catch (err) {
      console.error("Failed to reject order:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to reject the order. Please try again.",
        icon: "error",
      });
    }
  };

  const showRejectionReasonModal = () => {
    if (materialOrder?.rejection_reason) {
      setRejectionReason(materialOrder.rejection_reason);
      setShowReasonModal(true);
    }
  };

  const handleProjectOnlyToggle = async (checked, item, index) => {
    try {
      const updatedItems = [...materialOrder.line_items];
      updatedItems[index].project_only = checked;
      const quanttity_usage = item.quantity_ordered - item.quantity_received;

      let inventoryId = updatedItems[index].inventory_item_id;
      let isNewItemCreated = false;
      let isCostUpdated = false;

      if (!checked) {
        if (!inventoryId) {
          const created = await InventoryItem.create({
            item_name: item.description,
            description: item.description,
            category: item.category,
            quantity: quanttity_usage || 0,
            unit: item.unit,
            unit_cost: item.unit_price,
            location: "main_warehouse",
            supplier: item.supplier || "",
            reorder_level: item.reorder_level || 0,
            receipt: item.packing_slip || null,
            received_date:
              item.received_date ||
              new Date().toISOString().split("T")[0],
            notes: item.notes || "",
          });

          inventoryId =
            created?.data?._id || created?._id || created?.id;

          if (!inventoryId) {
            Swal.fire("Error", "Inventory ID not returned", "error");
            return;
          }

          updatedItems[index].inventory_item_id = inventoryId;
          isNewItemCreated = true;
        } else {
          const inv = await InventoryItem.get(inventoryId);

          if (Number(inv?.unit_cost) !== Number(item.unit_price)) {
            await InventoryItem.update(inventoryId, {
              unit_cost: item.unit_price
            });
            isCostUpdated = true;
          }
        }
      }

      await MaterialOrder.update(orderId, {
        line_items: updatedItems
      });

      await loadOrderDetails();

      // Success Messages
      if (isNewItemCreated) {
        Swal.fire({
          icon: "success",
          title: "New Item Created",
          text: "New inventory item created successfully.",
          timer: 1500,
          showConfirmButton: false
        });
      } else if (isCostUpdated) {
        Swal.fire({
          icon: "success",
          title: "Order Cost Updated",
          text: "Order cost updated successfully.",
          timer: 1500,
          showConfirmButton: false
        });
      }

    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Something went wrong", "error");
    }
  };

  const handlePreviewInventory = (item) => {
    const quantityOrdered = Number(item.quantity_ordered || 0);
    const quantityReceived = Number(item.quantity_received || 0);

    setPreviewItem({
      item_name: item.description,
      category: item.category,
      quantity_ordered: quantityOrdered,
      quantity_received: quantityReceived,
      unit: item.unit,
      unit_cost: item.unit_price,
      location: item.location || ""
    });
  };

  const customer = project?.customer_ids?.[0];

  const displayName = formatProjectName(project, customer);

  const isOrderRejected = materialOrder?.order_status === 'Rejected' || materialOrder?.requirement_status === 'Rejected';
  const isOrderApproved = materialOrder?.order_status === 'Approved' || materialOrder?.requirement_status === 'Approved';
  const isActionBlocked = isOrderRejected;

  if (loading) {
    return <TablePageSkeleton />;
  }

  if (error || !materialOrder) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <Package className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900temp">Material Order Not Found</h3>
          <p className="text-gray-500temp mt-2">{error || 'The requested material order could not be found.'}</p>
          <Button className="mt-4" onClick={() => window.history.back()} variant="outline">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const config = statusConfig[materialOrder.order_status] || statusConfig.Pending;
  const orderCost = Number(estimate?.total_amount) || 0;
  const isBlocked = orderCost >= estimateLimit;

  const showWaitingForApproval =
    materialOrder?.order_status === "Pending" &&
    isBlocked;

  const isAlreadyReviewed =
    ["Approved", "Rejected"].includes(materialOrder?.order_status);

  const canShowApprovalButtons =
    !isAlreadyReviewed &&
    materialOrder?.order_status === "Pending" &&
    isBlocked &&
    canApprove;

  const showActionButton = action === "approve" || action === "reject";
  const totalOrderedCost =
    materialOrder?.line_items?.reduce((sum, item) => {
      const qty = Number(item.quantity_ordered || item.quantity || 0);
      const price = Number(item.unit_price || 0);
      return sum + qty * price;
    }, 0) || 0;
  const formatCurrency = (value) => {
    const number = parseFloat(value || 0);
    return number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              {location.state?.from === 'material-order-report' ? (
                <Button variant="outline" size="sm" onClick={() => navigate('/material-order-report')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Material Order Report
                </Button>
              ) : (
                <Link to={createPageUrl('MaterialOrders')}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Material Orders
                  </Button>
                </Link>
              )}
            </div>

            <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Material Order Details</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {project ? (
                <>
                  Project: <Link
                    to={`${createPageUrl('Projects')}/${project.id}`}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                  >
                    {displayName || project?.project_name}
                  </Link>
                </>
              ) : estimate?.is_quick_estimate && estimate?.quick_customer?.project_name ? (
                <>
                  Project: <span className="font-semibold text-gray-900 dark:text-white">
                    {estimate.quick_customer.project_name}
                  </span>
                </>
              ) : (
                'Project: Information unavailable'
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={`${config.color} md:text-lg px-4 py-2`}>
              <config.icon className="w-3 h-3 md:w-5 md:h-5 mr-1 md:mr-2" />
              {materialOrder.order_status}
            </Badge>
            {isOrderRejected && materialOrder.rejection_reason && (
              <button
                onClick={showRejectionReasonModal}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="View rejection reason"
              >
                <MessageCircle className="w-5 h-5 text-red-600" />
              </button>
            )}
          </div>
        </div>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Material Order Details</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Material Line Items</CardTitle>
              <CardDescription>Manage the procurement and allocation of materials for this project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="rsp-table w-full text-sm">
                  <Thead className="bg-gray-50 border-b">
                    <Tr className="text-sm font-medium text-gray-600 md:dark:bg-[#1f2937] dark:text-gray-400">
                      <Th className="px-4 py-3 text-left">Description</Th>
                      <Th className="px-4 py-3 text-left whitespace-normal w-[90px]">Qty Ordered</Th>
                      <Th className="px-4 py-3 text-left whitespace-normal w-[100px]"> Qty Received</Th>
                      <Th className="px-4 py-3 text-left w-[70px]">Unit</Th>
                      <Th className="px-4 py-3 text-left w-[100px]"> Status</Th>
                      <Th className="px-4 py-3 text-left whitespace-normal w-[90px]"> Inv. Cost </Th>
                      <Th className="px-4 py-3 text-left whitespace-normal w-[110px]"> Ordered Cost </Th>
                      <Th className="px-4 py-3 text-left whitespace-normal w-[120px]"> Cost Difference </Th>
                      <Th className="px-4 py-3 text-left whitespace-normal w-[120px]"> Inventory Status </Th>
                      <Th className="px-4 py-3 text-left whitespace-normal w-[90px]"> Project-only </Th>
                      {/* <Th className="px-4 py-3 text-left whitespace-normal w-[120px]"> Receive Delivery </Th> */}
                      <Th className="px-4 py-3 text-left w-[80px]"> Actions </Th>
                    </Tr>
                  </Thead>
                  <Tbody>

                    {!materialOrder.line_items || materialOrder.line_items.length === 0 ? (

                      <Tr>
                        <Td colSpan="12" className="text-center py-8">
                          <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          No line items found
                        </Td>
                      </Tr>

                    ) : (

                      materialOrder.line_items.map((item, index) => {

                        const quantityOrdered = item.quantity_ordered || item.quantity || 0;
                        const quantityReceived = item.quantity_received || 0;
                        const statusCfg = lineItemStatusConfig[item.status] || lineItemStatusConfig['Not Ordered'];
                        const remainingQty = quantityOrdered - quantityReceived;

                        const inventoryCost = Number(item.inventory_cost || 0);
                        const orderedCost = Number(item.unit_price || 0);
                        const difference = orderedCost - inventoryCost;
                        const hasInventory = !!item.inventory_item_id;

                        const canAllocate = hasInventory && remainingQty > 0;
                        const isUpdating = updatingItems.has(index);
                        return (

                          <Tr key={item._id || index} className={index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}>

                            <Td data-label="Description" className="px-4 py-4 whitespace-pre-line break-words min-w-[250px]">{item.description}</Td>
                            <Td data-label="Qty Ordered" className="px-4 py-4">{quantityOrdered}</Td>
                            <Td data-label="Qty Received" className="px-4 py-4">
                              <div>
                                <div className="font-medium">{quantityReceived}</div>
                                {remainingQty > 0 && (
                                  <div className="text-sm text-orange-600">
                                    {remainingQty} remaining
                                  </div>
                                )}
                              </div>
                            </Td>
                            <Td data-label="Unit" className="px-4 py-4">{item.unit}</Td>
                            <Td data-label="Status" className="px-4 py-4">
                              <div className="w-[140px] md:w-40">
                                <Select
                                  value={item.status || "Not Ordered"}
                                  onValueChange={(value) => {
                                    if (value === "Not Ordered" && item.status && item.status !== "Not Ordered") {
                                      Swal.fire({
                                        icon: "warning",
                                        title: "Action Not Allowed",
                                        text: "Cannot change status back to Not Ordered.",
                                      });
                                      return;
                                    }

                                    if (orderCost >= estimateLimit && materialOrder?.requirement_status !== "Approved") {
                                      Swal.fire({
                                        icon: "warning",
                                        title: "Requirement Not Approved",
                                        text: "An approval user must approve this requirement before changing the item status.",
                                      });
                                      return;
                                    }

                                    if (
                                      !materialOrder?.project_id && 
                                      (value === "Ordered" || value === "Received")
                                    ) {
                                      Swal.fire({
                                        icon: "error",
                                        title: "Project Required",
                                        text: "Project information is not available. Cannot process order without a project.",
                                      });
                                      return;
                                    }

                                    if (value === "Received" && quantityReceived < quantityOrdered) {
                                      Swal.fire({
                                        icon: "warning",
                                        title: "Cannot Mark as Received",
                                        text: `Still ${quantityOrdered - quantityReceived} quantity remaining.`,
                                      });
                                      return;
                                    }

                                    if (
                                      quantityReceived >= quantityOrdered &&
                                      (value === "Ordered" || value === "Partially Received")
                                    ) {
                                      Swal.fire({
                                        icon: "info",
                                        title: "Already Fully Received",
                                        text: `All ${quantityOrdered} units already received.`,
                                      });
                                      return;
                                    }
                                    if (
                                      item.inventory_status === "Out of Stock" &&
                                      (value === "Ordered" || value === "Partially Received")
                                    ) {
                                      Swal.fire({
                                        icon: "error",
                                        title: "Out of Stock",
                                        text: `${item.description} is out of stock. Cannot proceed with order.`,
                                      });
                                      return;
                                    }

                                    const qtyOrd = Number(item.quantity_ordered) || Number(item.quantity) || 0;
                                    const qtyRec = Number(item.quantity_received) || 0;
                                    const hasRemaining = qtyOrd > qtyRec;

                                    if (
                                      item.inventory_item_id && 
                                      item.inventory_status === "In Stock" && 
                                      value === "Ordered" &&
                                      hasRemaining
                                    ) {
                                      handleOpenAllocation(item, index);
                                      return;
                                    }

                                    if (value === "Ordered" && item.status === "Not Ordered") {
                                      // Informing user is optional now since it auto receives, but keeping Swal if needed.
                                      // Actually, maybe we don't need this swal if we automatically mark as received.
                                      // I will just let updateLineItemStatus handle it.
                                    }

                                    updateLineItemStatus(index, value);
                                  }}
                                  disabled={isUpdating}
                                >
                                  <SelectTrigger className="w-full h-9 flex items-center justify-center overflow-hidden">
                                    <SelectValue asChild>
                                      <Badge className={`${statusCfg.color} whitespace-normal break-words text-center`}>
                                        {item.status || "Not Ordered"}
                                      </Badge>
                                    </SelectValue>
                                  </SelectTrigger>

                                  <SelectContent>
                                    <SelectItem value="Not Ordered">Not Ordered</SelectItem>
                                    <SelectItem 
                                      value="Ordered"
                                      onPointerUp={() => {
                                        const qtyOrd = Number(item.quantity_ordered) || Number(item.quantity) || 0;
                                        const qtyRec = Number(item.quantity_received) || 0;
                                        const hasRemaining = qtyOrd > qtyRec;

                                        if (item.status === "Ordered" && hasRemaining) {
                                          if (
                                            item.inventory_item_id && 
                                            item.inventory_status === "In Stock"
                                          ) {
                                            handleOpenAllocation(item, index);
                                          } else {
                                            updateLineItemStatus(index, "Ordered");
                                          }
                                        }
                                      }}
                                    >
                                      Ordered
                                    </SelectItem>
                                    {/* <SelectItem value="Partially Received">Partially Received</SelectItem> */}
                                    <SelectItem value="Received">Received</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </Td>

                            <Td data-label="Inventory Cost" className="px-4 py-4">
                              ${formatCurrency(inventoryCost)}
                            </Td>

                            <Td data-label="Ordered Cost" className="px-4 py-4">
                              ${formatCurrency(orderedCost)}
                            </Td>

                            <Td data-label="Cost Difference" className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                ${formatCurrency(difference)}

                                {difference > 0 && (
                                  <ArrowUp className="w-4 h-4 text-green-500" />
                                )}

                                {difference < 0 && (
                                  <ArrowDown className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </Td>

                            <Td data-label="Inventory Status" className="px-4 py-4">
                              <Badge
                                className={
                                  item.inventory_status === "In Stock"
                                    ? "bg-green-100 text-green-800"
                                    : item.inventory_status === "Out of Stock"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-600"
                                }
                              >
                                {item.inventory_status }
                              </Badge>
                            </Td>

                            <Td data-label="Project Only" className="px-4 py-4">
                              {(item.is_Upload_Toggle === true || item.inventory_item_id) && (
                                <Switch
                                  checked={item.project_only ?? true}
                                  disabled={item.project_only === false}
                                  onCheckedChange={(checked) => {
                                    if (isActionBlocked) {
                                      Swal.fire({
                                        icon: "warning",
                                        title: "Approval Required",
                                        text: "Cannot modify rejected order.",
                                      });
                                      return;
                                    }
                                    handleProjectOnlyToggle(checked, item, index);
                                  }}
                                />
                              )}
                            </Td>
                            {/* <Td data-label="Receive Delivery" className="px-4 py-4">
                              {item.status === "Ordered" || item.status === "Partially Received" ? (
                                <div className="flex flex-col gap-1">
                                  {item.inventory_available_qty > 0 && (
                                    <div className="text-xs text-blue-600">
                                      Available in Inventory: {item.inventory_available_qty} {item.unit}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      max={remainingQty}
                                      placeholder="Qty"
                                      value={receiveQuantities[index] || ""}
                                      onChange={(e) =>
                                        setReceiveQuantities((prev) => ({
                                          ...prev,
                                          [index]: e.target.value,
                                        }))
                                      }
                                      className="w-14 md:w-20"
                                    />

                                    <Button
                                      size="sm"
                                      onClick={() => handleReceiveQuantity(index)}
                                    >
                                      Receive
                                    </Button>
                                  </div>

                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </Td> */}
                            <Td data-label="Actions" className="px-4 py-4">
                              <div className="flex gap-2">

                                {/* Existing Allocate Button */}
                                {canAllocate && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenAllocation(item, index)}
                                    disabled={isUpdating || (orderCost >= estimateLimit ? !isOrderApproved : false)}
                                  >
                                    <Warehouse className="w-4 h-4" />
                                  </Button>
                                )}

                                {(item.is_Upload_Toggle === false && !hasInventory) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isActionBlocked}
                                    onClick={() => {
                                      if (isActionBlocked) {
                                        Swal.fire({
                                          icon: "warning",
                                          title: "Approval Required",
                                          text: "This order is rejected. Please approve to continue.",
                                        });
                                        return;
                                      }
                                      setSelectedOrderItem({ ...item, index });
                                      setShowInventoryForm(true);
                                    }}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                )}
                                {item.is_Upload_Toggle === true && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePreviewInventory(item)}
                                  >
                                    <Info className="w-4 h-4" />
                                  </Button>)}

                              </div>
                            </Td>

                          </Tr>

                        );
                      })

                    )}
                    <Tr>
                      <Td colSpan={6} className="hidden md:table-cell text-right font-semibold text-sm"> Total Ordered Cost :</Td>
                      <Td colSpan={6} className="hidden md:table-cell text-left font-semibold text-sm"> ${formatCurrency(totalOrderedCost)}</Td>
                      {/* Mobile view total cost row */}
                      <Td colSpan={12} className="md:hidden text-right font-semibold text-sm">
                        Total Ordered Cost : ${formatCurrency(totalOrderedCost)}
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </div>

            </CardContent>
          </Card>

          {
            materialOrder.notes && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{materialOrder.notes}</p>
                </CardContent>
              </Card>
            )
          }

          <div className="mt-6 flex justify-end gap-4">


            {canShowApprovalButtons && (
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="border-red-600 text-red-600 hover:bg-red-50"
                  onClick={() => setShowRejectPopup(true)}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Reject
                </Button>

                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleApprove}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}
          </div>

        </TabsContent>

        <TabsContent value="history">
          <MaterialOrderHistory materialOrderId={orderId} />
        </TabsContent>

        <TabsContent value="attachments">
          <MaterialOrderAttachments attachments={attachments} />
        </TabsContent>
      </Tabs>

      {
        allocatingItem && (
          <AllocateFromStockForm
            item={allocatingItem}
            project={project}
            projectId={materialOrder.project_id}
            onSuccess={handleAllocationSuccess}
            onCancel={() => setAllocatingItem(null)}
          />
        )
      }

      <ApprovalPopup
        isOpen={showApprovalPopup}
        onClose={() => setShowApprovalPopup(false)}
        projectName={displayName && displayName !== "—"
          ? displayName
          : project?.project_name ||
          materialOrder?.estimate_data?.quick_customer?.project_name ||
          materialOrder?.quick_customer?.project_name}
        projectId={project?.id}
        onNavigateToMaterialOrders={handleNavigateToMaterialOrders}
      />

      <RejectPopup
        isOpen={showRejectPopup}
        onClose={() => setShowRejectPopup(false)}
        projectName={displayName && displayName !== "—"
          ? displayName
          : project?.project_name ||
          materialOrder?.estimate_data?.quick_customer?.project_name ||
          materialOrder?.quick_customer?.project_name}
        projectId={materialOrder?.project_id}
        onReject={handleReject}
      />

      <InventoryPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />

      {
        showInventoryForm && selectedOrderItem && (
          <InventoryItemForm
            item={null}
            isProjectSpecific={true}
            inventoryItems={inventoryItems}
            prefillData={{
              item_name: selectedOrderItem.description,
              description: selectedOrderItem.description,
              quantity: selectedOrderItem.quantity_ordered || 0,
              unit_cost: selectedOrderItem.unit_price || 0,
              unit: selectedOrderItem.unit || "each",
              category: selectedOrderItem.category || "materials",
              location: "main_warehouse",
              received_date: new Date().toISOString().split("T")[0]
            }}
            onCancel={() => {
              setShowInventoryForm(false);
              setSelectedOrderItem(null);
            }}
            onSubmit={async (data) => {
              try {
                const updatedLineItems = [...materialOrder.line_items];
                const existingItem = updatedLineItems[selectedOrderItem.index];

                updatedLineItems[selectedOrderItem.index] = {
                  ...existingItem,
                  is_Upload_Toggle: true,
                  supplier: data.supplier || null,
                  received_date: data.received_date || null,
                  order_date: existingItem.order_date || new Date(),
                  location: data.location || null,
                  reorder_level: data.reorder_level || null,
                  unit: data.unit,
                  unit_price: data.unit_cost,
                  packing_slip: data.receipt || null,
                  notes: data.notes || null
                };

                await MaterialOrder.update(orderId, {
                  line_items: updatedLineItems,
                });

                await loadOrderDetails();
                setShowInventoryForm(false);
                setSelectedOrderItem(null);

              } catch (err) {
                console.error(err);
              }
            }}
          />
        )
      }

      {
        showReasonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-600">Rejection Reason</h3>
                <button
                  onClick={() => {
                    setShowReasonModal(false);
                    setRejectionReason('');
                  }}
                  className="text-gray-400temp hover:text-gray-600temp"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium">Order: {materialOrder?.estimate_id?.slice(-6) || orderId?.slice(-6)}</span>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-gray-700temp">{rejectionReason}</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    setShowReasonModal(false);
                    setRejectionReason('');
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
