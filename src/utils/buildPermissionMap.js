export const buildPermissionMap = (permissions, moduleName) => {

  const result = {
    module: {
      view: false,
      add: false,
      update: false,
      delete: false
    },
    widgets: {}
  };

  permissions?.forEach(p => {

    if (p.module !== moduleName) return;

    // ✅ MODULE PERMISSION
    if (!p.submenu_module) {

      result.module = {
        view: p.canView,
        add: p.canAdd,
        update: p.canUpdate,
        delete: p.canDelete
      };

    }

    // ✅ WIDGET PERMISSION
    else {

      result.widgets[p.submenu_module] = {
        view: p.canView,
        add: p.canAdd,
        update: p.canUpdate,
        delete: p.canDelete
      };

    }

  });

  return result;
};
