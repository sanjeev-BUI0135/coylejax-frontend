export const filterByProject = (items, projectId, subIds = []) =>
    items.filter(i =>
        i.project_id === projectId ||
        subIds.includes(i.project_id)
    );
