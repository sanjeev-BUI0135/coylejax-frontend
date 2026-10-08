import { useMemo } from "react";

export default function useProjectData({ materialOrders = [], subProjects = [], project = {} } = {}) {
  const pendingMaterials = useMemo(() => {
    if (!materialOrders || materialOrders.length === 0) return [];
    return materialOrders.flatMap(order =>
      (order.line_items || [])
        .filter(i => (i.quantity_received || 0) < (i.quantity_ordered || 0))
        .map(i => ({
          ...i,
          needed: (i.quantity_ordered || 0) - (i.quantity_received || 0),
          orderId: order._id || order.id,
          estimateRef: order.estimate_id,
        }))
    );
  }, [materialOrders]);

  const fulfilledMaterials = useMemo(() => {
    if (!materialOrders || materialOrders.length === 0) return [];
    const fulfilledItems = [];
    materialOrders.forEach(order => {
      (order.line_items || []).forEach(item => {
        if ((item.quantity_received || 0) >= (item.quantity_ordered || 0) && (item.quantity_ordered || 0) > 0) {
          fulfilledItems.push({
            ...item,
            orderId: order._id || order.id,
            estimateRef: order.estimate_id
          });
        }
      });
    });
    return fulfilledItems;
  }, [materialOrders]);

  const subProjectsTotal = useMemo(() => (
    (subProjects || []).reduce((sum, sp) => sum + (sp.estimated_value || 0), 0)
  ), [subProjects]);

  const totalProjectValue = useMemo(() => (
    (project?.estimated_value || 0) + subProjectsTotal
  ), [project?.estimated_value, subProjectsTotal]);

  return {
    pendingMaterials,
    fulfilledMaterials,
    subProjectsTotal,
    totalProjectValue,
  };
}
