import { useState, useCallback } from "react";
import { Estimate, Project, Customer, User } from "@/api/entities";
import { formatProjectName } from "@/lib/utils";

export const useEstimateReportData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadEstimates = useCallback(async () => {
        setLoading(true);
        try {
            const [estRes, projRes, custRes, userRes] = await Promise.all([
                Estimate.list({ limit: 0 }),
                Project.list({ limit: 0 }),
                Customer.list({ limit: 0 }),
                User.list({ limit: 0 }),
            ]);

            const estimates = estRes.data || estRes || [];
            const projects = projRes.data || projRes || [];
            const customers = custRes.data || custRes || [];
            const users = userRes.data || userRes || [];
            // Create maps (fast lookup)
            const projectMap = {};
            const customerMap = {};

            projects.forEach(p => { projectMap[p._id || p.id] = p; });
            customers.forEach(c => { customerMap[c._id || c.id] = c; });
            const userMap = {};
            users.forEach(u => { userMap[u._id || u.id] = u; });

            // Attach customer + project info
            const finalData = estimates.map(e => {
                const project = projectMap[e.project_id];

                let divisionType = project?.project_type_name || project?.project_type?.replace(/_/g, " ");

                if (!divisionType && e.is_quick_estimate && e.quick_customer) {
                    divisionType = e.quick_customer.division_type?.replace(/_/g, " ");
                }

                divisionType = divisionType || "—";

                const user = userMap[e.created_by_user || e.created_by];
                const createdBy = user?.full_name || user?.name || "—";


                let customerName = "—";
                let customerId = null;
                let companyName = "—";

                const getStrId = (val) => (typeof val === 'string' ? val : val?._id || val?.id);
                // Normal estimate
                if (project?.customer_id || project?.customer_ids?.length) {
                    const custId = getStrId(project.customer_id) || getStrId(project.customer_ids?.[0]);
                    const customer = customerMap[custId];
                    customerName = customer?.contact_name || "—";
                    companyName = customer?.company_name || "—";
                    customerId = custId;
                }

                // Quick estimate
                if (e.is_quick_estimate && e.quick_customer) {
                    customerName = e.quick_customer.customer_name || "—";
                    companyName = e.quick_customer.company_name || "—";
                    customerId = null;
                }

                const customer = customerId ? customerMap[customerId] : (e.is_quick_estimate ? e.quick_customer : null);
                let projectName = "—";

                if (e.is_quick_estimate && e.quick_customer) {
                    projectName =
                        e.quick_customer.project_name ||
                        e.quick_customer.customer_name ||
                        "Quick Estimate";
                } else {
                    projectName =
                        project?.project_name ||
                        project?.name ||
                        "—";
                }


                return {
                    ...e,
                    project_name: projectName,
                    customer_name: customerName,
                    company_name: companyName,
                    customer_id: customerId,
                    division_type: divisionType,
                    created_by_name: createdBy,
                };
            });

            setData(finalData);
        } catch (err) {
            console.error("Estimate report load failed", err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { data, loading, loadEstimates };
};