import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { Package, Truck, CheckCircle, XCircle, ArrowRight, MessageCircle, X, Bell, Trash, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import RejectPopup from '../../approvalpopup/rejectPopup';
import MaterialReminderModal from '../../remaindermodal/MaterialReminderModal';
import { InventoryItem } from '@/api/entities';
import { UserService } from '../../../services/userservice';
import clientService from '../../../services/clientAddService';
import SendApprovalMailModal from "../../ui/SendApprovalMailModal";
import localApi from "../../../services/localApi";
import "../../../App.css";

const statusConfig = {
  Pending: { icon: Package, color: 'bg-yellow-100 text-yellow-800' },
  Ordered: { icon: Truck, color: 'bg-blue-100 text-blue-800' },
  'Partially Received': { icon: Truck, color: 'bg-orange-100 text-orange-800' },
  Fulfilled: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  Cancelled: { icon: XCircle, color: 'bg-red-100 text-red-800' },
};

const requirementStatusConfig = {
  Pending: { icon: Package, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  Approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Approved' },
  Rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' },
};

export default function ProjectMaterialOrders({ materialOrders, pendingMaterials, tabPermission, project, onUpdateRequirementStatus, systemConfig = { approvalThreshold: 15000 }, inventoryItems = [], onSendMail }) {
  const [ordersWithUsers, setOrdersWithUsers] = useState([]);
  const [localStatuses, setLocalStatuses] = useState({});
  const [showRejectPopup, setShowRejectPopup] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [projectDetails, setProjectDetails] = useState(null);
  const [ordersWithMatches, setOrdersWithMatches] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [openMailModal, setOpenMailModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [contacts, setContacts] = useState([]);

  const getMatchedLowStockOrders = async (orders, inventoryItems) => {
    try {
      const itemsArray = Array.isArray(inventoryItems)
        ? inventoryItems
        : Array.isArray(inventoryItems?.data)
          ? inventoryItems.data
          : [];

      const generalLowStockInventory = itemsArray.filter(item => {
        const hasNoProject = !item.project_id;
        const quantity = parseFloat(item.quantity) || 0;
        const reorderLevel = parseFloat(item.reorder_level) || 0;
        return hasNoProject && quantity <= reorderLevel;
      });

      if (generalLowStockInventory.length === 0) return [];

      return orders
        .filter(order => {
          const orderLineItems = order.line_items || [];

          return orderLineItems.some(lineItem =>
            generalLowStockInventory.some(invItem =>
              lineItem.inventory_item_id === invItem._id
            )
          );
        })
        .map(order => order._id || order.id);

    } catch (error) {
      console.error("Error matching materials:", error);
      return [];
    }
  };

  const fetchProjectDetails = async (projectId) => {
    if (!projectId) {
      return null;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const projectData = await response.json();
        return projectData;
      } else {
        console.error('Failed to fetch project:', response.status, response.statusText);
        return null;
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
      return null;
    }
  };

  const fetchApprovalUserName = async (userId) => {
    if (!userId) return "N/A";

    try {
      const userRes = await UserService.get(userId);
      const user = userRes?.data || userRes;

      const name =
        user?.full_name ||
        user?.name ||
        `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

      if (name) return name;
    } catch (err) {
      console.warn("Not a normal user, trying client...", err);
    }

    try {
      const clientRes = await clientService.getClientById(userId);
      const client = clientRes?.data || clientRes;

      const name =
        client?.full_name ||
        client?.name ||
        client?.client_name ||
        `${client?.firstName || ""} ${client?.lastName || ""}`.trim();

      if (name) return name;
    } catch (err) {
      console.error("Error fetching client/admin:", err);
    }

    return "N/A";
  };

  const fetchEstimateAmount = async (estimateId) => {
    if (!estimateId) {
      return 0;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/estimates/${estimateId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const estimateData = await response.json();
        return estimateData.total_amount || estimateData.totalAmount || 0;
      } else {
        console.error('Failed to fetch estimate:', response.status, response.statusText);
        return 0;
      }
    } catch (error) {
      console.error('Error fetching estimate data:', error);
      return 0;
    }
  };

  const fetchAllApprovalUsers = async () => {
    if (!materialOrders || materialOrders.length === 0) {
      setOrdersWithUsers([]);
      setOrdersWithMatches([]);
      return;
    }
    setLoading(false);
    try {
      const ordersWithUserNames = await Promise.all(
        materialOrders.map(async (order) => {
          let approvalUserName = 'N/A';
          let totalAmount = 0;

          if (order.approval_user && typeof order.approval_user === 'string' && !order.approval_user.match(/^[0-9a-fA-F]{24}$/)) {
            approvalUserName = order.approval_user;
          } else {
            const possibleUserId = order.approval_user_id ||
              order.approval_user ||
              order.approvalUserId ||
              order.approved_by ||
              order.created_by;
            if (possibleUserId) {
              approvalUserName = await fetchApprovalUserName(possibleUserId);
            }
          }
          if (order.total_amount !== undefined && order.total_amount !== null) {
            totalAmount = order.total_amount;
          } else if (order.estimate_id) {
            totalAmount = await fetchEstimateAmount(order.estimate_id);
          }
          const normalizedId = order._id || order.id;
          return {
            ...order,
            id: normalizedId,
            _id: normalizedId,
            approval_user: approvalUserName,
            total_amount: totalAmount,
          };
        })
      );
      const matchingOrderIds = await getMatchedLowStockOrders(ordersWithUserNames, inventoryItems);
      setOrdersWithUsers(ordersWithUserNames);
      setOrdersWithMatches(matchingOrderIds);

      const initStatuses = {};
      ordersWithUserNames.forEach((order) => {
        initStatuses[order._id] = order.requirement_status || 'Pending';
      });
      setLocalStatuses(initStatuses);
    } catch (error) {
      console.error('Error fetching approval users:', error);
      setOrdersWithUsers(materialOrders);
      const initStatuses = {};
      materialOrders.forEach((order) => {
        initStatuses[order._id] = order.requirement_status || 'Pending';
      });
      setLocalStatuses(initStatuses);
    }
  };

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

  useEffect(() => {
    const getProjectDetails = async () => {
      if (project) {
        const projectId = project._id || project.id || project.project_id;
        if (projectId) {
          const details = await fetchProjectDetails(projectId);
          setProjectDetails(details || project);
        } else {
          setProjectDetails(project);
        }
      }
    };

    getProjectDetails();
  }, [project]);

  useEffect(() => {
    fetchAllApprovalUsers();
  }, [materialOrders, inventoryItems]);

  const displayOrders = ordersWithUsers.length > 0 ? ordersWithUsers : materialOrders;

  const handleRequirementChange = async (_id, value, reason = null) => {
    try {
      setLocalStatuses((prev) => ({ ...prev, [_id]: value }));
      const requestBody = { requirement_status: value };
      if (value === 'Rejected' && reason) {
        requestBody.rejection_reason = reason;
      }
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/materialorders/${_id}/requirement-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(requestBody),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        console.error("Failed to update:", data);
        setLocalStatuses((prev) => ({ ...prev, [_id]: "Pending" }));
      } else {
        fetchAllApprovalUsers();
      }
      if (onUpdateRequirementStatus) {
        onUpdateRequirementStatus(_id, value);
      }
    } catch (error) {
      console.error("Error updating requirement status:", error);
    }
  };

  const fetchRejectionReason = async (orderId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/materialorders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data.rejection_reason || null;
      }
    } catch (error) {
      console.error('Error fetching rejection reason:', error);
    }
    return null;
  };

  const showRejectionReason = async (order) => {
    const reason = await fetchRejectionReason(order._id);
    setRejectionReason(reason || 'No reason provided');
    setSelectedOrder(order);
    setShowReasonModal(true);
  };

  const handleReject = async (orderId, reason) => {
    await handleRequirementChange(orderId, 'Rejected', reason);
    setShowRejectPopup(false);
    setSelectedOrder(null);
  };

  const openRejectPopup = (order) => {
    setSelectedOrder(order);
    setShowRejectPopup(true);
  };

  const handleStatusChange = (orderId, newStatus) => {
    if (newStatus === 'Rejected') {
      const order = displayOrders.find(o => o._id === orderId);
      openRejectPopup(order);
    } else {
      handleRequirementChange(orderId, newStatus);
    }
  };

  const handleApprovalClick = (order) => {
    setActiveOrder(order);
    setOpenMailModal(true);
  };

  const handleSendFromModal = async (emails) => {
    if (!activeOrder || !onSendMail) return;
    return onSendMail(
      activeOrder.id || activeOrder._id,
      activeOrder.estimate_id || "",
      emails
    );
  };

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const [meRes, allRes] = await Promise.all([
          localApi.getMe(),
          localApi.getAll()
        ]);

        const user = JSON.parse(localStorage.getItem("user")) || {};
        const filtered = (allRes || []).filter(
          u => u.created_by === user.id || u.created_by === meRes.created_by
        );

        const contactMap = new Map();

        filtered.forEach(item => {
          if (item?.email) {
            contactMap.set(item.email, {
              email: item.email,
              role_type: item.role_type || "User"
            });
          }
        });

        if (user?.role_type === "admin" && user?.email) {
          contactMap.set(user.email, {
            email: user.email,
            role_type: "Admin"
          });
        }

        setContacts(Array.from(contactMap.values()));

      } catch (error) {
        console.error("Contacts fetch error:", error);
      }
    };

    if (materialOrders?.length > 0) {
      fetchContacts();
    }
  }, [materialOrders]);

  const handleDeleteOrder = async (orderId) => {
    if (!orderId) return;
    setDeleting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/materialorders/${orderId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.status === 204 || response.ok) {
        setOrdersWithUsers(prev => prev.filter(order => order._id !== orderId));

        if (onUpdateRequirementStatus) {
          onUpdateRequirementStatus(orderId, "deleted");
        }


      } else {
        const text = await response.text();
        const errorData = text ? JSON.parse(text) : {};
        console.error("Failed to delete order:", errorData);
        alert("Failed to delete order. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error deleting order. Please try again.");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
    }
  };

  const openDeleteConfirm = (order) => {
    setOrderToDelete(order);
    setShowDeleteConfirm(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const openReminderModal = (order) => {
    setSelectedOrder(order);
    setShowReminderModal(true);
  };

  const handleReminderSubmit = (reminderData) => {
    // console.log('Reminder submitted:', reminderData);
  };

  if (!materialOrders || materialOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Material Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Material Orders</h3>
            <p className="text-gray-500temp mt-2">
              Approve an estimate to automatically create material orders
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Material Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-gray-500temp mt-2">Loading approval users...</p>
            </div>
          )}
          <Table>
            <Thead>
              <Tr className="text-left border-b border-gray-200">
                <Th className='font-medium text-muted-foreground text-sm py-4'>Status</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Estimate Ref</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Items</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Progress</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Requirement Status</Th>
                {user?.role_type !== "Crew View" && (<Th className='font-medium text-muted-foreground text-sm'>Total Amount</Th>)}
                {tabPermission?.update && <Th className='font-medium text-muted-foreground text-sm'>Reminder</Th>}
                <Th className='font-medium text-muted-foreground text-sm'>Approval User</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {displayOrders.map((order, index) => {
                const displayStatus = order.order_status === 'Partially Received' ? 'Ordered' : order.order_status;
                const config = statusConfig[displayStatus] || statusConfig.Pending;
                const isMaterialItem = (item) => {
                  if (!item.category) return true;
                  const category = item.category.toLowerCase().trim();
                  const isLabor = category.includes('labor') || category.includes('labour');
                  const isServiceFee = (category.includes('service') && category.includes('fee')) ||
                    category === 'service_fee' ||
                    category === 'service fee';
                  return !isLabor && !isServiceFee;
                };
                const totalItems = order.line_items?.filter(isMaterialItem).length || 0;
                const fulfilledItems = order.line_items?.filter(item => {
                  if (!isMaterialItem(item)) return false;
                  return (item.quantity_received ?? 0) >= (item.quantity_ordered ?? 0);
                }).length || 0;

                const currentStatus = localStatuses[order._id] || order.requirement_status || 'Pending';
                const requirementConfig = requirementStatusConfig[currentStatus] || requirementStatusConfig.Pending;
                const showReminderForThisOrder = ordersWithMatches.includes(order._id);
                return (
                  <Tr key={order._id} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                    <Td className="text-sm py-3 px-2">
                      <Badge className={config.color}>
                        <config.icon className="w-3 h-3 mr-1" />
                        {displayStatus}
                      </Badge>
                      {(() => {
                        const materialOrderCost = order.total_amount || 0;
                        const allItemsOutOfStock =
                          order.line_items?.length > 0 &&
                          order.line_items.every((item) => {
                            const itemId = typeof item.inventory_item_id === 'object'
                              ? (item.inventory_item_id?._id || item.inventory_item_id?.id)
                              : item.inventory_item_id;

                            if (!itemId) return false;
                            const inv = inventoryItems.find(i => (i.id || i._id) === itemId);
                            return inv && Number(inv.quantity) <= 0;
                          });

                        const isBlocked = materialOrderCost >= systemConfig.approvalThreshold && allItemsOutOfStock;
                        const showWaitingForApproval =
                          order.order_status === "Pending" &&
                          isBlocked &&
                          order.approvaldata15K !== "Approved";

                        if (showWaitingForApproval) {
                          return (
                            <p className="text-[10px] text-orange-600 mt-1 font-medium">
                              Requires Approval
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </Td>
                    <Td className="text-sm py-3 px-2">{order.estimate_id?.slice(-6) || 'N/A'}</Td>
                    <Td className="text-sm py-3 px-2">
                      {totalItems} items
                      {totalItems !== (order.line_items?.length || 0) && (
                        <span className="text-xs text-gray-500temp ml-1">
                          (materials only)
                        </span>
                      )}
                    </Td>

                    <Td className="text-sm py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: totalItems > 0 ? `${(fulfilledItems / totalItems) * 100}%` : '0%'
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500temp">
                          {fulfilledItems}/{totalItems}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-sm py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Badge className={`${requirementConfig.color}`}>
                          <requirementConfig.icon className="w-3 h-3 mr-1" />
                          {requirementConfig.label}
                        </Badge>

                        {currentStatus === 'Rejected' && (
                          <button
                            onClick={() => showRejectionReason(order)}
                            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                            title="View rejection reason"
                          >
                            <MessageCircle className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </Td>
                    {user?.role_type !== "Crew View" && (
                      <Td className="text-sm py-3 px-2">
                        <span className="font-medium">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </Td>
                    )}

                    {tabPermission?.update && (
                      <Td className="text-sm py-3 px-2">
                        {showReminderForThisOrder ? (
                          <button
                            onClick={() => openReminderModal(order)}
                            className="p-2 rounded-full hover:bg-blue-50 transition-colors"
                            title="Set material reminder"
                          >
                            <Bell className="w-5 h-5 text-blue-600" />
                          </button>
                        ) : (
                          <span className="text-gray-400temp text-sm">-</span>
                        )}
                      </Td>
                    )}

                    <Td className="text-sm py-3 px-2">
                      <span className={order.approval_user === 'N/A' ? 'text-gray-400temp' : 'text-gray-700temp'}>
                        {order.approval_user || 'N/A'}
                      </span>
                    </Td>

                    <Td className="text-sm py-3 px-2">
                      <div className="flex flex-wrap items-center md:gap-2">
                        {(() => {
                          const materialOrderCost = order.total_amount || 0;
                          const allItemsOutOfStock =
                            order.line_items?.length > 0 &&
                            order.line_items.every((item) => {
                              const itemId = typeof item.inventory_item_id === 'object'
                                ? (item.inventory_item_id?._id || item.inventory_item_id?.id)
                                : item.inventory_item_id;

                              if (!itemId) return false;
                              const inv = inventoryItems.find(i => (i.id || i._id) === itemId);
                              return inv && Number(inv.quantity) <= 0;
                            });

                          const isBlocked = materialOrderCost >= systemConfig.approvalThreshold && allItemsOutOfStock;
                          const showWaitingForApproval =
                            order.order_status === "Pending" &&
                            isBlocked &&
                            order.approvaldata15K !== "Approved";

                          if (showWaitingForApproval && tabPermission?.update) {
                            // return (
                            //   // <Button
                            //   //   size="sm"
                            //   //   variant="secondary"
                            //   //   className="bg-orange-100 text-orange-800 hover:bg-orange-200"
                            //   //   onClick={() => handleApprovalClick(order)}
                            //   // >
                            //   //   <Mail className="w-4 h-4 mr-1" />
                            //   //   Approval
                            //   // </Button>
                            // );
                          }
                          return null;
                        })()}
                        {tabPermission?.view && (
                          <Link to={createPageUrl(`MaterialOrderDetails?id=${order._id}`)}>
                            <Button variant="outline" size="sm">
                              View Order
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </Link>
                        )}
                        {tabPermission?.delete && (<Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-gray-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => openDeleteConfirm(order)}
                          title="Delete order permanently"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>)}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          {openMailModal && activeOrder && (
            <SendApprovalMailModal
              open={openMailModal}
              onClose={() => setOpenMailModal(false)}
              projectName={project?.project_name || 'Unknown Project'}
              contacts={contacts}
              onSend={handleSendFromModal}
            />
          )}
        </CardContent>
      </Card>

      <RejectPopup
        isOpen={showRejectPopup}
        onClose={() => {
          setShowRejectPopup(false);
          setSelectedOrder(null);
        }}
        projectName={project?.project_name || 'Unknown Project'}
        projectId={selectedOrder?._id}
        onReject={handleReject}
      />

      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-red-600">Rejection Reason</h3>
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setSelectedOrder(null);
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
                <span className="font-medium">Order: {selectedOrder?.estimate_id?.slice(-6)}</span>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-gray-700temp">{rejectionReason}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setShowReasonModal(false);
                  setSelectedOrder(null);
                  setRejectionReason('');
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReminderModal && selectedOrder && (
        <MaterialReminderModal
          isOpen={showReminderModal}
          onClose={() => {
            setShowReminderModal(false);
            setSelectedOrder(null);
          }}
          project={projectDetails || project}
          order={selectedOrder}
          onSubmit={handleReminderSubmit}
        />
      )}

      {showDeleteConfirm && orderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 md:w-96 md:max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-red-600">Delete Order</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                className="text-gray-400temp hover:text-gray-600temp"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Trash className="w-5 h-5 text-red-500" />
                <span className="font-medium dark:text-black">Order: {orderToDelete?.estimate_id?.slice(-6)}</span>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-gray-700temp">
                  Are you sure you want to delete this material order permanently? This action cannot be undone and all order data will be lost.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteOrder(orderToDelete._id)}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}