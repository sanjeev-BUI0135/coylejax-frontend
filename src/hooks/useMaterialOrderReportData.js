import { useState, useCallback } from "react";
import { MaterialOrder, Customer, Estimate } from "@/api/entities";
import { formatProjectName } from "@/lib/utils";
import localApi from "../services/localApi";

export const useMaterialOrderReportData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, projectsRes, customersRes, estimateRes] = await Promise.all([
        MaterialOrder.list({ all: true }),
        localApi.projects.getDashboardProjects(),
        Customer.list({ all: true }),
        Estimate.list({ all: true })
      ]);

      const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data || []);
      const projects = Array.isArray(projectsRes) ? projectsRes : (projectsRes?.data || []);
      const customers = Array.isArray(customersRes) ? customersRes : (customersRes?.data || []);
      const estimates = Array.isArray(estimateRes) ? estimateRes : (estimateRes?.data || []);

      const projectMap = {};
      projects.forEach(p => {
        projectMap[p._id || p.id] = p;
      });

      const customerMap = {};
      customers.forEach(c => {
        customerMap[c._id || c.id] = c;
      });

      const estimateMap = {};

      estimates.forEach(est => {
        estimateMap[est._id || est.id] = est;
      });

      const reportData = [];

      orders.forEach(order => {
        const estimate = estimateMap[order.estimate_id];
        const project = projectMap[order.project_id];

        const lineItems = order.line_items || [];

        const customerId = project?.customer_id || project?.customer_ids?.[0]?._id || project?.customer_ids?.[0];
        const customer =
          typeof customerId === "string"
            ? customerMap[customerId]
            : (customerId || project?.customer_ids?.[0]);

        const ordered = lineItems.reduce(
          (sum, item) =>
            sum + Number(item.quantity_ordered || item.quantity || 0),
          0
        );

        const received = lineItems.reduce(
          (sum, item) =>
            sum + Number(item.quantity_received || 0),
          0
        );

        const total_amt =
          lineItems.reduce(
            (sum, item) =>
              sum +
              Number(item.quantity_ordered || item.quantity || 0) *
              Number(item.unit_price || 0),
            0
          ) || Number(order.total_cost || 0);

        const order_cost = lineItems.reduce((sum, item) => {
          const qty = Number(item.quantity_received || 0);
          const price = Number(item.unit_price || 0);

          return sum + qty * price;
        }, 0);

        // Default values from Project
        let projectName = project?.project_name || "—";
        let customerName = customer?.contact_name || customer?.company_name || "—";
        let projectNumber = project?.project_number || "—";
        let estimatedStartDate = project?.estimated_start_date || null;
        let quickCustomer = null;

        // Quick Estimate
        if (!project && estimate?.is_quick_estimate) {
          quickCustomer = estimate.quick_customer;
          projectName = estimate.quick_customer?.project_name || "—";
          customerName = estimate.quick_customer?.customer_name || estimate.quick_customer?.company_name || "—";
          projectNumber = estimate.estimate_number || "—";
          estimatedStartDate = estimate.createdAt || null;
        }

        reportData.push({
          _id: order._id || order.id,
          project_name: projectName,
          customer_name: customerName,
          project_number: projectNumber,
          estimated_start_date: estimatedStartDate,
          quick_customer: quickCustomer,
          customer_id: customer?._id,
          material: lineItems.map(item => item.description || "—").join(", ") || "—",
          materials: lineItems.map(item => ({
            description: item.description || "—",
            ordered: Number( item.quantity_ordered || item.quantity || 0 ),
            received: Number( item.quantity_received || 0 ),
            unit: item.unit || "each",
            unit_price: Number( item.unit_price || 0 ),
            order_cost: Number( item.quantity_ordered || item.quantity || 0 ) * Number(item.unit_price || 0)
          })),
          ordered,
          received,
          remaining: ordered - received,
          total_amt,
          order_cost,
          order_date: order.createdAt,
          status: order.order_status || "Pending",
          created_by: order.created_by,
          created_by_user: order.created_by_user,
          project_id: order.project_id,
          estimate_id: order.estimate_id
        });
      });

      setData(reportData);
    } catch (err) {
      console.error("Material Order Report load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, loadReport };
};
