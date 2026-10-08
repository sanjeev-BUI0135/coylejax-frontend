export const attachSubProjectTotals = (projects, subProjects) => {
    const projectsArray = Array.isArray(projects) ? projects : (projects?.data || []);
    const subProjectsArray = Array.isArray(subProjects) ? subProjects : (subProjects?.data || []);
    
    const map = {};

    subProjectsArray.forEach(sub => {
        if (!map[sub.parent_id]) map[sub.parent_id] = [];
        map[sub.parent_id].push(sub);
    });

    return projectsArray.map(project => {
        if (project.is_sub_project) return project;

        const subs = map[project.id] || [];
        const subTotal = subs.reduce(
            (sum, s) => sum + (s.estimated_value || 0),
            0
        );

        return {
            ...project,
            subProjectsTotal: subTotal,
            totalProjectValue: (project.estimated_value || 0) + subTotal,
            subProjectsCount: subs.length,
        };
    });
};
