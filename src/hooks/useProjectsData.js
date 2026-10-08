import { useState, useCallback } from "react";
import api from "@/services/masterDataService";
import { attachSubProjectTotals } from "@/utils/projectCalculations";

export const useProjectsData = () => {
    const [projects, setProjects] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [divisions, setDivisions] = useState([])
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
    const loadData = useCallback(async (page = 1, limit = 25, created_by_user = "", search = "", filters = {}, columnFilters = {}) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const params = new URLSearchParams({
                page,
                limit,
                sort: "-updatedAt",
            });
            if (search?.trim()) { params.append("search", search); }
            if (filters.company && filters.company !== "all") { params.append("company", filters.company); }
            if (filters.customer && filters.customer !== "all") { params.append("customer", filters.customer); }
            if (filters.project && filters.project !== "all") { params.append("project", filters.project); }
            if (filters.status && filters.status !== "all") { params.append("status", filters.status); }
            if (filters.division && filters.division !== "all") { params.append("division", filters.division); }
            // HEADER FILTERS
            if (columnFilters.company_name?.trim()) { params.append( "company_name", columnFilters.company_name);}
            if (columnFilters.customer_name?.trim()){ params.append("customer_name",columnFilters.customer_name);}
            if (columnFilters.project_name?.trim()) { params.append("project_name",columnFilters.project_name);}
            if (columnFilters.project_number?.trim()) {params.append("project_number",columnFilters.project_number);}
            if (columnFilters.project_type?.trim()) {params.append("project_type",columnFilters.project_type);}
            if (columnFilters.project_creation_type?.trim()) {params.append("project_creation_type",columnFilters.project_creation_type);}
            if (columnFilters.status?.trim()) {params.append("status", columnFilters.status);}
            if (columnFilters.estimated_value?.trim()) {params.append("estimated_value",columnFilters.estimated_value);}
            if (columnFilters.createdAt?.trim()) {params.append( "createdAt", columnFilters.createdAt);}
            if (created_by_user) { params.append("created_by_user", created_by_user); }

            const [projectsRes, customersRes, divisionsRes, subProjectsRes] =
                await Promise.all([

                    fetch(`${import.meta.env.VITE_API_BASE}/projects?${params.toString()}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(r => r.json()),

                    fetch(`${import.meta.env.VITE_API_BASE}/customers`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(r => r.json()),

                    api.getAll("divisions"),

                    fetch(`${import.meta.env.VITE_API_BASE}/projects?is_sub_project=true`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(r => r.json())
                ]);

            const projectsData = Array.isArray(projectsRes) ? projectsRes : (projectsRes.data || []);
            const subProjectsData = Array.isArray(subProjectsRes) ? subProjectsRes : (subProjectsRes.data || []);
            const paginationInfo = !Array.isArray(projectsRes) ? {
                page: projectsRes.page || 1,
                limit: projectsRes.limit || 25,
                total: projectsRes.total || 0,
                pages: projectsRes.pages || 0
            } : { page: 1, limit: 25, total: 0, pages: 0 };

            setProjects(
                attachSubProjectTotals(projectsData, subProjectsData)
            );
            setPagination(paginationInfo);
            setCustomers(customersRes);
            setDivisions(
                (divisionsRes.data || []).filter(d => d.status === "active")
            );
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    }, []);

    return { projects, customers, divisions, loading, initialLoading, loadData, setProjects, pagination };
};
