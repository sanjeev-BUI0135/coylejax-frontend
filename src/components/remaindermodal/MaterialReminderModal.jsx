import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Bell, X, ChevronDown } from 'lucide-react';
import { InventoryItem } from '@/api/entities';
import { MaterialOrder } from '@/api/entities';
import { toast } from "react-hot-toast";
import CustomDatePicker from '../ui/CustomDatePicker';
import masterDataService from '@/services/masterDataService';

const MaterialReminderModal = ({
  isOpen,
  onClose,
  project,
  order,
  onSubmit
}) => {
  const [reminderData, setReminderData] = useState({
    projectName: '',
    projectNo: '',
    materialName: '',
    reminderDate: '',
    reminderHour: '12',
    reminderMinute: '00',
    reminderAmPm: 'AM'
  });
  const [matchedLowStockMaterials, setMatchedLowStockMaterials] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const loadMasterData = async () => {
        try {
          const catRes = await masterDataService.getAll("categories");
          const locRes = await masterDataService.getAll("locations");

          setCategories(catRes.data || []);
          setLocations(locRes.data || []);
        } catch (err) {
          console.error("Failed to load categories/locations:", err);
        }
      };
      loadMasterData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && order) {
      loadMatchedLowStockMaterials();
    }
  }, [isOpen, order]);

  useEffect(() => {
    if (isOpen && project) {
      // Correctly fetch project_name field
      const projectName = project.project_name || '';

      // Correctly fetch project_number field (as shown in database image)
      const projectNo = project.project_number || '';

      const defaultTime = getDefaultTime();

      setReminderData({
        projectName: projectName,
        projectNo: projectNo,
        materialName: '',
        reminderDate: '',
        reminderHour: defaultTime.hour,
        reminderMinute: defaultTime.minute,
        reminderAmPm: defaultTime.ampm
      });
    }
  }, [isOpen, order, project]);

  const loadMatchedLowStockMaterials = async () => {
    setLoadingInventory(true);
    try {
      // Get all inventory items and material orders
      const [inventoryRes, ordersRes] = await Promise.all([
        InventoryItem.list(),
        MaterialOrder.list()
      ]);

      const itemsArray = Array.isArray(inventoryRes) ? inventoryRes : Array.isArray(inventoryRes?.data) ? inventoryRes.data : [];
      const ordersArray = Array.isArray(ordersRes) ? ordersRes : Array.isArray(ordersRes?.data) ? ordersRes.data : [];

      // Filter for general inventory (no project_id) AND low stock items
      const generalLowStockInventory = itemsArray.filter(item => {
        const hasNoProject = !item.project_id;
        const quantity = parseFloat(item.quantity) || 0;
        const reorderLevel = parseFloat(item.reorder_level) || 0;
        return hasNoProject && quantity <= reorderLevel;
      });

      // Find the current material order from all orders
      const currentOrder = ordersArray.find(o =>
        (o._id || o.id) === (order._id || order.id)
      );

      if (!currentOrder) {
        setMatchedLowStockMaterials([]);
        setLoadingInventory(false);
        return;
      }

      // Get line items from the current order
      const orderLineItems = currentOrder.line_items || [];

      // Match inventory items with order line items
      const matchedMaterials = [];

      generalLowStockInventory.forEach(invItem => {
        const invItemName = invItem.item_name?.toLowerCase().trim();
        if (!invItemName) return;

        // Find matching line items in the order
        const matchingLineItems = orderLineItems.filter(lineItem => {
          return lineItem.inventory_item_id === invItem._id;
        });

        // If there's a match, add to matched materials
        if (matchingLineItems.length > 0) {
          matchedMaterials.push({
            ...invItem,
            matchingLineItems: matchingLineItems
          });
        }
      });

      setMatchedLowStockMaterials(matchedMaterials);
    } catch (error) {
      console.error("Error loading matched materials:", error);
      setMatchedLowStockMaterials([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleSubmit = async () => {
    if (!reminderData.projectName || !reminderData.projectNo || !reminderData.materialName ||
      !reminderData.reminderDate || !reminderData.reminderHour) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Convert 12-hour time to 24-hour format
      let hour24 = parseInt(reminderData.reminderHour);

      if (reminderData.reminderAmPm === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (reminderData.reminderAmPm === 'AM' && hour24 === 12) {
        hour24 = 0;
      }

      const reminderTime = `${String(hour24).padStart(2, '0')}:${reminderData.reminderMinute}`;

      const response = await fetch(`${import.meta.env.VITE_API_BASE}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          projectName: reminderData.projectName,
          projectNo: reminderData.projectNo,
          materialName: reminderData.materialName,
          reminderDate: reminderData.reminderDate,
          reminderTime: reminderTime,
          orderId: order._id || order.id,
          estimateId: order.estimate_id || '',
          projectId: project?._id || project?.id || '',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Reminder set successfully!");
        if (onSubmit) {
          onSubmit(reminderData);
        }
        handleClose();
      } else {
        toast.error(data.message || "Failed to set reminder");
      }
    } catch (error) {
      console.error('Error setting reminder:', error);
      toast.error("Error setting reminder. Please try again.");
    }
  };

  const handleClose = () => {
    setReminderData({
      projectName: '',
      projectNo: '',
      materialName: '',
      reminderDate: '',
      reminderHour: '12',
      reminderMinute: '00',
      reminderAmPm: 'AM'
    });
    setSearchTerm('');
    setIsDropdownOpen(false);
    onClose();
  };

  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeFor12Hour = (date) => {
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return { hours: String(hours).padStart(2, '0'), ampm };
  };

  const getDefaultTime = () => {
    const now = new Date();
    const { hours, ampm } = formatTimeFor12Hour(now);
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return { hour: hours, minute: minutes, ampm };
  };

  const handleMaterialSelect = (itemName) => {
    setReminderData({ ...reminderData, materialName: itemName });
    setSearchTerm('');
    setIsDropdownOpen(false);
  };

  const filteredItems = matchedLowStockMaterials.filter(item =>
    item.item_name && item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryName = (value) => {
    if (!value) return "";
    const cat = categories.find(c => c.value === value);
    return cat?.display_name || value;
  };

  const getLocationName = (value) => {
    if (!value) return "";
    const loc = locations.find(l => l.value === value);
    return loc?.display_name || value;
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ backdropFilter: '', margin: 0, padding: 0, top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 9999 }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-80 md:w-[500px] max-w-md shadow-xl" style={{ position: 'relative', zIndex: 10000 }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Set Material Reminder
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project Name  {!reminderData.projectName && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <input
              type="text"
              value={reminderData.projectName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              placeholder="Project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Project No  {!reminderData.projectNo && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <input
              type="text"
              value={reminderData.projectNo}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
              placeholder="Project number"
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Material Name (Matched Low Stock)  {!reminderData.materialName && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={isDropdownOpen ? searchTerm : reminderData.materialName}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Select Matched Low Stock Material"
                disabled={loadingInventory}
              />
              <ChevronDown
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              />
            </div>
            {loadingInventory && (
              <p className="text-xs text-gray-500 mt-1">Loading matched materials...</p>
            )}

            {!loadingInventory && matchedLowStockMaterials.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">No matched low stock materials found for this order</p>
            )}

            {isDropdownOpen && !loadingInventory && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9998
                  }}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setSearchTerm('');
                  }}
                />
                <div
                  className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-[200px] overflow-y-auto"
                  style={{
                    top: '100%',
                    zIndex: 9999
                  }}
                >
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => {
                      const quantity = parseFloat(item.quantity) || 0;
                      const reorderLevel = parseFloat(item.reorder_level) || 0;

                      return (
                        <div
                          key={item.id || item._id}
                          onClick={() => handleMaterialSelect(item.item_name)}
                          className="px-3 py-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {item.item_name}
                          </div>
                          <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                            Low Stock: {quantity} / {reorderLevel} {item.unit || ''}
                            {item.category && ` • ${getCategoryName(item.category)}`}
                            {item.location && ` • ${getLocationName(item.location)}`}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                      {matchedLowStockMaterials.length === 0
                        ? 'No matched materials in inventory'
                        : 'No materials found'}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reminder Date   {!reminderData.reminderDate && (<span className="text-red-500">*</span>)}
            </label>
            <CustomDatePicker
              id="reminder-date"
              value={reminderData.reminderDate}
              minDate={getTodayDate()}
              onChange={(val) =>
                setReminderData({ ...reminderData, reminderDate: val })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reminder Time {(!reminderData.reminderHour ||
                !reminderData.reminderMinute ||
                !reminderData.reminderAmPm) && (
                  <span className="text-red-500"> *</span>
                )}
            </label>
            <div className="flex gap-2">
              <select
                value={reminderData.reminderHour}
                onChange={(e) => setReminderData({ ...reminderData, reminderHour: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const hour = String(i + 1).padStart(2, '0');
                  return (
                    <option key={hour} value={hour}>{hour}</option>
                  );
                })}
              </select>
              <span className="flex items-center text-gray-500 font-semibold">:</span>
              <select
                value={reminderData.reminderMinute}
                onChange={(e) => setReminderData({ ...reminderData, reminderMinute: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 60 }, (_, i) => {
                  const minute = String(i).padStart(2, '0');
                  return (
                    <option key={minute} value={minute}>{minute}</option>
                  );
                })}
              </select>
              <select
                value={reminderData.reminderAmPm}
                onChange={(e) => setReminderData({ ...reminderData, reminderAmPm: e.target.value })}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={matchedLowStockMaterials.length === 0}
          >
            Set Reminder
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default MaterialReminderModal;