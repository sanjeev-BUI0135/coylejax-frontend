import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InventoryItem } from '@/api/entities';
import { MaterialOrder } from '@/api/entities';
import { Project } from '@/api/entities';
import { X, Warehouse, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function AllocateFromStockForm({ item, project, projectId, onSuccess, onCancel }) {
  const [generalStock, setGeneralStock] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allocationQty, setAllocationQty] = useState(
    parseFloat(item.quantity_ordered - (item.quantity_received || 0)) || 0
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const inventoryOwnerId =
    currentUser.role_type === "admin"
      ? currentUser.id
      : currentUser.created_by;


  useEffect(() => {
    const fetchData = async () => {
      try {
        let resolvedProject = project;
        if (!resolvedProject && projectId) {
          resolvedProject = await Project.get(projectId);
        }
        setProjectData(resolvedProject);

        // Fetch general stock items
        const res = await InventoryItem.list();

        const allItems = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];

        // Filter for general stock (no project_id) matching the item
        const stockItems = allItems.filter(invItem => {
          const isGeneralStock = !invItem.project_id;

          const sameItem =
            invItem.item_name?.toLowerCase().trim() ===
            (item.item_name || item.description)?.toLowerCase().trim();

          const sameAdmin = invItem.created_by === inventoryOwnerId;

          return isGeneralStock && sameItem && sameAdmin;
        });

        if (stockItems.length > 0) {
          setGeneralStock(stockItems[0]);
        } else {
          setGeneralStock({ quantity: 0 });
        }
      } catch (err) {
        setError('Failed to fetch stock information.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [item.item_name, item.description, project, projectId]);

  const handleAllocate = async () => {
    if (!projectData) {
      setError('Project information is not available.');
      return;
    }

    setIsProcessing(true);
    setError('');

    const qtyToAllocate = parseFloat(allocationQty);
    if (isNaN(qtyToAllocate) || qtyToAllocate <= 0) {
      setError('Please enter a valid quantity.');
      setIsProcessing(false);
      return;
    }
    if (qtyToAllocate > generalStock.quantity) {
      setError('Cannot allocate more than available in general stock.');
      setIsProcessing(false);
      return;
    }

    const remainingNeeded = item.quantity_ordered - (item.quantity_received || 0);
    if (qtyToAllocate > remainingNeeded) {
      Swal.fire({
        icon: "error",
        title: "Exceeds Ordered Quantity",
        text: `You can only allocate up to ${remainingNeeded} ${item.unit}.`,
      });
      setIsProcessing(false);
      return;
    }

    try {
      const newGeneralStockQty = generalStock.quantity - qtyToAllocate;
      const inventoryItemId = generalStock.id || generalStock._id;
      if (inventoryItemId) {
        await InventoryItem.update(inventoryItemId, { quantity: newGeneralStockQty });
      }

      const currentProject = await Project.get(projectData.id || projectData._id);
      const allocatedMaterials = currentProject.allocated_materials || [];

      const existingItemIndex = allocatedMaterials.findIndex(
        mat => mat.item_name?.toLowerCase().trim() === (item.item_name || item.description)?.toLowerCase().trim()
      );

      if (existingItemIndex >= 0) {

        allocatedMaterials[existingItemIndex].quantity = (parseFloat(allocatedMaterials[existingItemIndex].quantity) || 0) + qtyToAllocate;
        allocatedMaterials[existingItemIndex].last_allocated_date = new Date().toISOString().split('T')[0];
      } else {
        allocatedMaterials.push({
          item_name: (item.item_name || item.description).trim(),
          description: item.description,
          quantity: qtyToAllocate,
          unit: generalStock.unit || item.unit,
          location: 'Project Site',
          category: item.category || generalStock.category || 'materials',
          allocated_date: new Date().toISOString().split('T')[0],
          last_allocated_date: new Date().toISOString().split('T')[0],
          source: 'General Stock',
          material_order_id: item.material_order_id || projectId || null
        });
      }

      await Project.update(projectData.id || projectData._id, {
        allocated_materials: allocatedMaterials,
        materials_status: 'Partially Received'
      });

      onSuccess();
    } catch (err) {
      setError(`Allocation failed: ${err.message}`);
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const remainingNeeded = item.quantity_ordered - (item.quantity_received || 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Allocate from Stock</CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel} disabled={isProcessing}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">{item.item_name || item.description}</h3>
            {item.description && item.item_name && (
              <p className="text-sm text-gray-500temp">{item.description}</p>
            )}
            <p className="text-sm text-gray-500temp">
              Needed: {remainingNeeded} {item.unit}
            </p>
            {projectData && (
              <p className="text-sm text-gray-500temp">
                Project: {projectData.project_name}
              </p>
            )}
            {
              projectData && (
                <p className='text-sm text-gray-500temp'>
                  Unit Cost: ${item.unit_price}
                </p>
              )
            }
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4 p-4 bg-gray50-temp rounded-lg">
              <div className="flex justify-between items-center">
                <Label>Available in General Stock:</Label>
                <span className="font-bold text-lg">{generalStock?.quantity || 0} {generalStock?.unit || item.unit}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="allocationQty">Quantity to Allocate</Label>
                <Input
                  id="allocationQty"
                  type="number"
                  value={allocationQty}
                  onChange={(e) => setAllocationQty(parseFloat(e.target.value) || 0)}
                  max={generalStock?.quantity || 0}
                  min="0"
                  placeholder="Enter quantity"
                />
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleAllocate}
              disabled={loading || isProcessing || !generalStock || generalStock.quantity === 0}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Warehouse className="w-4 h-4 mr-2" />
              )}
              Confirm Allocation
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}