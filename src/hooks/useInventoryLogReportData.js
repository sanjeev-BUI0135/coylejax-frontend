import { useState, useCallback } from "react";
import { InventoryItem, MaterialOrder, Project } from "../api/entities";

export const useInventoryLogReportData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadReport = useCallback(async () => {
        setLoading(true);
        try {
            const [invProbe, orderProbe, projectProbe] = await Promise.all([
                InventoryItem.list({ limit: 1 }),
                MaterialOrder.list({ limit: 1 }),
                Project.list({ limit: 1 }),
            ]);
            const totalInv = invProbe?.total || 1000;
            const totalOrders = orderProbe?.total || 1000;
            const totalProjects = projectProbe?.total || 1000;

            const [invRes, orderRes, projectRes] = await Promise.all([
                InventoryItem.list({ limit: totalInv }),
                MaterialOrder.list({ limit: totalOrders }),
                Project.list({ limit: totalProjects }),
            ]);

            const inventoryItems = invRes.data || invRes || [];
            const materialOrders = orderRes.data || orderRes || [];
            const projects = projectRes.data || projectRes || [];

            // Track issued quantities per item name from projects
            const issuedMap = {};
            projects.forEach(project => {
                if (project.allocated_materials && Array.isArray(project.allocated_materials)) {
                    project.allocated_materials.forEach(item => {
                        const name = (item.item_name || item.description || "").trim().toLowerCase();
                        if (name) {
                            const qty = parseFloat(item.quantity) || 0;
                            issuedMap[name] = (issuedMap[name] || 0) + qty;
                        }
                    });
                }
            });

            // Track received from material orders (PO-based receipts only)
            const receivedFromOrdersMap = {};
            materialOrders.forEach(order => {
                if (order.line_items && Array.isArray(order.line_items)) {
                    order.line_items.forEach(item => {
                        const name = (item.item_name || item.description || "").trim().toLowerCase();
                        if (name) {
                            const qty = parseFloat(item.quantity_received) || 0;
                            receivedFromOrdersMap[name] = (receivedFromOrdersMap[name] || 0) + qty;
                        }
                    });
                }
            });

            const processedData = inventoryItems.map(item => {
                const name = (item.item_name || "").trim().toLowerCase();
                const available = parseFloat(item.quantity) || 0;
                const issued = issuedMap[name] || 0;
                const receivedFromOrders = receivedFromOrdersMap[name] || 0;

                let opening_stock, received_qty;

                if (item.opening_stock != null) {
                    // ✅ Best case: opening_stock is explicitly stored on the item
                    opening_stock = parseFloat(item.opening_stock) || 0;
                    // Received = everything added after opening (direct edits + PO receipts)
                    received_qty = available - opening_stock + issued;
                } else {
                    // Fallback: use PO-based received only
                    received_qty = receivedFromOrders;
                    opening_stock = available - received_qty + issued;
                }

                // Clamp negatives to 0 for display safety
                received_qty = Math.max(0, received_qty);
                opening_stock = Math.max(0, opening_stock);

                return {
                    ...item,
                    opening_stock,
                    received_qty,
                    issued_qty: issued,
                    available_qty: available,
                    total_value: available * (parseFloat(item.unit_cost) || 0),
                };
            });

            setData(processedData);
        } catch (error) {
            console.error("Failed to fetch inventory log report data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, loadReport };
};