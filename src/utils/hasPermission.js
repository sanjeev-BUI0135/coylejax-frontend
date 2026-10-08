export const hasPermission = (
  permissions,
  module,
  action,
  widget = null
) => {
  if (!permissions?.length) return false;
  const perm = permissions.find(p =>
    p.module === module &&
    (widget
      ? p.submenu_module === widget
      : !p.submenu_module)
  );

  if (!perm) return false;

  return {
    view: perm.canView,
    add: perm.canAdd,
    update: perm.canUpdate,
    delete: perm.canDelete
  }[action];
};
