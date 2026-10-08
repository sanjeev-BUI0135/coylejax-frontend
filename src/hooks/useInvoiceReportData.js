import { useState, useCallback } from "react";
import { Invoice, Estimate, Project, Customer, User, Payment } from "@/api/entities";
import { formatProjectName } from "@/lib/utils";

export const useInvoiceReportData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const [invResProbe, estResProbe, projResProbe, custResProbe, userResProbe, payResProbe] = await Promise.all([
                Invoice.list({ limit: 1 }),
                Estimate.list({ limit: 1 }),
                Project.list({ limit: 1 }),
                Customer.list({ limit: 1 }),
                User.list({ limit: 1 }),
                Payment.list({ limit: 1 }),
            ]);

            const invTotal = invResProbe?.total || 1000;
            const estTotal = estResProbe?.total || 1000;
            const projTotal = projResProbe?.total || 1000;
            const custTotal = custResProbe?.total || 1000;
            const userTotal = userResProbe?.total || 1000;
            const payTotal = payResProbe?.total || 1000;

            const [invRes, estRes, projRes, custRes, userRes, payRes] = await Promise.all([
                Invoice.list({ limit: invTotal }),
                Estimate.list({ limit: estTotal }),
                Project.list({ limit: projTotal }),
                Customer.list({ limit: custTotal }),
                User.list({ limit: userTotal }),
                Payment.list({ limit: payTotal }),
            ]);


            const invoices = invRes.data || invRes || [];
            const estimates = estRes.data || estRes || [];
            const projects = projRes.data || projRes || [];
            const customers = custRes.data || custRes || [];
            const users = userRes.data || userRes || [];
            const payments = payRes.data || payRes || [];

            // Create maps
            const estimateMap = {};
            estimates.forEach(e => { estimateMap[e._id || e.id] = e; });

            const projectMap = {};
            projects.forEach(p => { projectMap[p._id || p.id] = p; });

            const customerMap = {};
            customers.forEach(c => { customerMap[c._id || c.id] = c; });

            const userMap = {};
            users.forEach(u => { userMap[u._id || u.id] = u; });

            const invoicePaymentsMap = {};
            payments.forEach(p => {
                if (p.invoice_id) {
                    if (!invoicePaymentsMap[p.invoice_id]) invoicePaymentsMap[p.invoice_id] = 0;
                    if (p.status === "received" || p.status === "paid") {
                        invoicePaymentsMap[p.invoice_id] += parseFloat(p.amount) || 0;
                    }
                }
            });

            const finalData = invoices.map(inv => {
                const estimate = estimateMap[inv.estimate_id];
                const project = projectMap[inv.project_id];
                const user = userMap[inv.created_by_user || inv.created_by];

                const getStrId = (val) => (typeof val === 'string' ? val : val?._id || val?.id);
                const invCustId = getStrId(inv.customer_id);
                const projCustId = getStrId(project?.customer_id) || getStrId(project?.customer_ids?.[0]);

                const customerId = invCustId || projCustId;
                const customer = customerMap[customerId];

                const totalAmount = parseFloat(inv.total_amount) || 0;
                const paidAmount = parseFloat(inv.amount_paid) || 0;
                const balanceAmount = Math.max(0, totalAmount - paidAmount);

                return {
                    ...inv,

                    estimate_number:
                        estimate?.estimate_number ||
                        inv.estimate_number ||
                        "—",

                    project_name:
                        project?.project_name ||
                        project?.name ||
                        "—",

                    company_name:
                        customer?.company_name ||
                        inv.company_name ||
                        "—",

                    customer_name:
                        customer?.contact_name ||
                        customer?.company_name ||
                        inv.customer_name ||
                        "—",

                    customer_id:
                        customerId,

                    created_by_name:
                        user?.full_name ||
                        user?.name ||
                        "—",

                    paid_amount:
                        paidAmount,

                    balance_amount:
                        balanceAmount,
                };
            });

            setData(finalData);
        } catch (err) {
            console.error("Invoice report load failed", err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, loadInvoices };
};
