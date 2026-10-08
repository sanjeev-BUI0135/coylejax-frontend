import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Package, Truck, CheckCircle, ArrowRight, XCircle, Mail, Calendar, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { ca } from 'date-fns/locale';
import SendApprovalMailModal from "../ui/SendApprovalMailModal";
import localApi from '../../services/localApi';
import { formatDateUTC } from '../../utils/formatdate';

const statusConfig = {
  Pending: { icon: Package, color: 'bg-yellow-100 text-yellow-800', order: 1 },
  Sent: { icon: Mail, color: 'bg-blue-100 text-blue-800', order: 2 },
  Ordered: { icon: Truck, color: 'bg-blue-100 text-blue-800', order: 3 },
  'Partially Received': { icon: Truck, color: 'bg-orange-100 text-orange-800', order: 4 },
  Fulfilled: { icon: CheckCircle, color: 'bg-green-100 text-green-800', order: 5 },
  Cancelled: { icon: XCircle, color: 'bg-red-100 text-red-800', order: 6 },
  Approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', order: 7 },
  Rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', order: 8 },
};

export default function MaterialOrderCard({
  order,
  projectName,
  materialOrderCost,
  requiresApproval,
  systemConfig,
  onSendMail,
  selectedItems = [],
  onSelectItem,
  totalFilteredCount,
  canUpdate,
  canDelete,
  inventoryItems = [],
}) {
  const [openMailModal, setOpenMailModal] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [me, setMe] = useState(null);
  const [client, setClient] = useState(null);
  const config = statusConfig[order.order_status] || statusConfig.Pending;
  const allItemsOutOfStock =
    order.line_items?.length > 0 &&
    order.line_items.some((item) => {
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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const handleApprovalClick = () => {
    setActiveOrder(order);
    setOpenMailModal(true);
  };

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const [meRes, allRes] = await Promise.all([
          localApi.getMe(),
          localApi.getAll()
        ]);

        setMe(meRes);

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

    fetchContacts();
  }, []);

  const getTotalItems = () => {
    if (!order.line_items || !Array.isArray(order.line_items)) return 0;
    return order.line_items.length;
  };

  const getReceivedItems = () => {
    if (!order.line_items || !Array.isArray(order.line_items)) return 0;
    return order.line_items.filter(item =>
      item.quantity_received >= item.quantity_ordered
    ).length;
  };

  const someSelected = selectedItems.length > 0 && selectedItems.length < selectedItems.length;
  const isSelected = selectedItems.includes(order.id || order._id);
  const user = JSON.parse(localStorage.getItem("user")) || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-300 bg-white border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1">
              {canDelete && <Checkbox
                indeterminate={someSelected}
                checked={isSelected}
                onCheckedChange={(checked) => onSelectItem(order.id || order._id, checked)}
                className="mt-1"
              />}
              <div className={`p-3 rounded-full ${config.color.split(' ')[0]}`}>
                <config.icon className={`w-6 h-6 ${config.color.split(' ')[1]}`} />
              </div>
            </div>
            <Badge className={config.color}>{order.order_status}</Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 flex flex-col h-full">
          <div className="mb-4 flex-grow">
            <h3 className="font-semibold text-lg text-gray-900temp mb-2">
              {projectName}
            </h3>
            <p className="text-sm text-gray-500temp">
              Estimate Ref: {order.estimate_id ? order.estimate_id.slice(-6) : 'N/A'}
            </p>
          </div>

          {/* Order Details */}
          <div className="space-y-3 mb-4 pt-3 border-t">
            {user?.role_type !== "Crew View" && (<div className="flex items-center gap-2 text-sm text-gray-600temp">
              <DollarSign className="w-4 h-4" />
              <span className="font-medium">
                {formatCurrency(materialOrderCost)}
              </span>
            </div>)}

            <div className="flex items-center gap-2 text-sm text-gray-600temp">
              <Calendar className="w-4 h-4" />
              <span>{formatDateUTC(order.createdAt || order.created_date)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600temp">
              <Package className="w-4 h-4" />
              <span>
                {getReceivedItems()} / {getTotalItems()} items received
              </span>
            </div>

            {showWaitingForApproval && (
              <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                <Mail className="w-4 h-4" />
                <span>Requires Approval</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-auto">
            {showWaitingForApproval && canUpdate && (
              <Button
                variant="secondary"
                className="w-full bg-orange-100 text-orange-800 hover:bg-orange-200"
                onClick={handleApprovalClick}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send for Approval
              </Button>
            )}

            {openMailModal && activeOrder && (
              <SendApprovalMailModal
                open={openMailModal}
                onClose={() => setOpenMailModal(false)}
                projectName={projectName}
                contacts={contacts}
                onSend={(emails) =>
                  onSendMail(
                    activeOrder.id || activeOrder._id,
                    activeOrder.estimate_id || "",
                    emails
                  )
                }
              />
            )}

            {canUpdate && <Link to={createPageUrl(`MaterialOrderDetails?id=${order.id || order._id}`)} className="w-full">
              <Button variant="outline" className="w-full">
                View Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>}
          </div>

          {order.notes && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500temp line-clamp-2">
                <span className="font-medium">Notes:</span> {order.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}