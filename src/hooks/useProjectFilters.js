import { useMemo } from "react";

export default function useProjectFilters({
    projects,
    customersById,
    searchTerm,
    filters,
    columnFilters,
    user,
    me,
    shouldShowProject,
    getProjectDisplayStatus
}) {

    return useMemo(() => {
        return projects.filter(project => {
            // created by check
            const createdByUser =
                project.created_by === user?.id ||
                project.created_by === me?._id ||
                project.created_by === me?.created_by;

            if (!createdByUser) return false;
            if (project.is_sub_project) return false;
            if (!shouldShowProject(project)) return false;

            const customer = customersById.get(project.customer_id);
            const search = (searchTerm || "").toLowerCase();
            const matchesSearch =
                (project.project_name || "").toLowerCase().includes(search) ||
                (project.description || "").toLowerCase().includes(search) ||
                (project.project_number || "").toLowerCase().includes(search);

            if (!matchesSearch) return false;

            const displayStatus = getProjectDisplayStatus(project);

            const matchesStatus = filters.status === "all" || displayStatus === filters.status;
            const matchesPriority = filters.priority === "all" || project.priority === filters.priority;
            const matchesType = filters.project_type === "all" || project.project_type === filters.project_type;

            if (!matchesStatus || !matchesPriority || !matchesType) return false;

            const matchesColumnFilters =
                (project.project_name || "").toLowerCase().includes((columnFilters.project_name || "").toLowerCase()) &&
                (project.project_number || "").toLowerCase().includes((columnFilters.project_number || "").toLowerCase()) &&
                (project.project_creation_type || "").toLowerCase().includes((columnFilters.project_creation_type || "").toLowerCase()) &&
                (customer?.company_name || "").toLowerCase().includes((columnFilters.customer || "").toLowerCase()) &&
                (project.project_type || "").toLowerCase().includes((columnFilters.project_type || "").toLowerCase()) &&
                (project.location || "").toLowerCase().includes((columnFilters.location || "").toLowerCase()) &&
                (() => {
                    if (!columnFilters.createdAt) return true;
                    if (!project.createdAt && !project.created_date) return false;

                    const projectDate = new Date(
                        project.createdAt || project.created_date
                    ).toISOString().split("T")[0];
                    return projectDate === columnFilters.createdAt;
                })() &&

                String(project.estimated_value || "").toLowerCase().includes((columnFilters.estimated_value || "").toLowerCase()) &&
                String(project.status || "").toLowerCase().includes((columnFilters.status || "").toLowerCase()) &&
                String(project.priority || "").toLowerCase().includes((columnFilters.priority || "").toLowerCase());

            return matchesColumnFilters;
        });
    }, [
        projects,
        customersById,
        searchTerm,
        filters,
        columnFilters,
        user?.id,
        me?._id,
        me?.created_by,
        shouldShowProject,
        getProjectDisplayStatus
    ]);
}
