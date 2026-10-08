import { useState, useCallback } from "react";
import { Project, Invoice, Payment } from "@/api/entities";
import { promise } from "zod";

export const useProjectReportData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [projectsRes, invoicesRes, paymentsRes] = await Promise.all([
        Project.list({ all: true }),
        Invoice.list({ all: true }),
        Payment.list({ limit: 0 }),
      ])

      const projects = projectsRes.data || projectsRes || [];
      const invoices = invoicesRes.data || invoicesRes || [];
      const payments = paymentsRes.data || paymentsRes || [];

      const invoiceMap = {};
      const paymentMap = {};

      invoices.forEach(inv => {
        const pid = inv.project_id;
        if (!invoiceMap[pid]) invoiceMap[pid] = [];
        invoiceMap[pid].push(inv);
      });

      payments.forEach(pay => {
        const pid = pay.project_id;
        if (!paymentMap[pid]) paymentMap[pid] = [];
        paymentMap[pid].push(pay);
      });

      const finalData = projects.map(p => {
        const pid = p._id || p.id;

        const projectInvoices = invoiceMap[pid] || [];
        const projectPayments = paymentMap[pid] || [];

        const totalRevenue = projectPayments
          .filter(p => p.status === "received")
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        const totalCost = projectInvoices
          .filter(inv => ['draft', 'sent', 'paid', 'partial'].includes(inv.status))
          .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        return {
          ...p,
          total_revenue: totalRevenue,
          total_cost: totalCost,
          net_profit: totalRevenue - totalCost
        };
      });

      setData(finalData);

    } catch (err) {
      console.error("Report load failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, loadReport };
};