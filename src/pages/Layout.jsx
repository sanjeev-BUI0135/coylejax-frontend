import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import localApi from "../services/localApi";
import Logo from "../assets/images/pm-w-logo.png";
import {
  LayoutDashboard, Building2, Users, Calculator, DollarSign, Menu, X, Package, Clock, Users2,
  FileCode2, LogOut, ChevronLeft, ChevronRight, Settings, ChevronDown, User, LogOutIcon, MessageSquare,
  FileBarChart, Circle, BarChart3, Wrench, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/themetoggle"
import clientService from "../services/clientAddService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { hasPermission } from "../utils/hasPermission";
import useGlobalMessages from "../hooks/useGlobalMessages.jsx";

const allNavigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard, permission: { module: "Dashboard" } },
  { title: "Leads", url: createPageUrl("Leads"), icon: Users, permission: { module: "Leads" } },
  { title: "Estimates", url: createPageUrl("Estimates"), icon: Calculator, permission: { module: "Projects", submenu: "Estimates" } },
  { title: "Projects", url: createPageUrl("Projects"), icon: Building2, permission: { module: "Projects" } },
  { title: "Material Orders", url: createPageUrl("MaterialOrders"), icon: Package, permission: { module: "Projects", submenu: "MaterialOrders" } },
  { title: "Inventory Management", url: createPageUrl("Inventory"), icon: Package, permission: { module: "Projects", submenu: "Inventory" } },
  { title: "Invoices", url: createPageUrl("Invoices"), icon: DollarSign, permission: { module: "Projects", submenu: "Invoices" } },
  {
    title: "Data", icon: FileBarChart,
    children: [
      { title: "Contacts", url: createPageUrl("Customers"), icon: Users, permission: { module: "Customers" } },
      { title: "Suppliers", url: createPageUrl("suppliers"), icon: Package, permission: { module: "Suppliers" } },
      { title: "User Management", url: createPageUrl("UserManagement"), icon: Users2, permission: { module: "User Management" } },
      { title: "Inactive Projects", url: createPageUrl("inactive-projects"), icon: Users2, permission: { module: "Inactive Projects" } },
    ],
  },
  {
    title: "Tools", icon: Wrench,
    children: [
      { title: "Time Entry", url: createPageUrl("TimeEntry"), icon: Clock, permission: { module: "Time Entry" } },
      { title: "Message", url: createPageUrl("Message"), icon: MessageSquare, permission: { module: "Message" } },
    ],
  },
  {
    title: "Reports", icon: FileBarChart,
    children: [
      { title: "Project Report", url: createPageUrl("project-report"), icon: Building2, permission: { module: "Reports", submenu: "ProjectReport" } },
      { title: "Estimate Report", url: createPageUrl("estimate-report"), icon: Calculator, permission: { module: "Reports", submenu: "EstimateReport" } },
      { title: "Invoice Report", url: createPageUrl("invoice-report"), icon: DollarSign, permission: { module: "Reports", submenu: "InvoiceReport" } },
      { title: "Inventory Log Report", url: createPageUrl("inventory-log-report"), icon: Package, permission: { module: "Reports", submenu: "InventoryLogReport" } },
      { title: "Material Order Report", url: createPageUrl("material-order-report"), icon: Package, permission: { module: "Reports", submenu: "MaterialOrderReport" } },
      { title: "Custom Reports", url: createPageUrl("custom-report"), icon: BarChart3, permission: { module: "Reports", submenu: "CustomReport" } },

    ],
  },
  {
    title: "Settings", icon: FileCode2,

    children: [
      { title: "SMS Settings", url: createPageUrl("sms-settings"), icon: MessageSquare, permission: { module: "SMS Settings" } },
      { title: "Payment Settings", url: createPageUrl("payment-settings"), icon: DollarSign, permission: { module: "Payment Settings" } },
      { title: "General Settings", url: createPageUrl("master-data-management"), icon: Settings, permission: { module: "Settings" } },
      { title: "Glacier AI", url: createPageUrl("glaciers-ai"), icon: Sparkles, permission: { module: "Glaciers AI" } },
    ],
  },
  { title: "Super Dashboard", url: createPageUrl("super-admin/dashboard"), icon: LayoutDashboard, roles: ["Superadmin"] },
  { title: "Tenant", url: createPageUrl("super-admin/Tenant"), icon: Users2, roles: ["Superadmin"] },
  { title: "Profile", url: createPageUrl("super-admin/profile"), icon: Users2, roles: ["Superadmin"] },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialRedirectDone, setInitialRedirectDone] = useState(false);
  const isPublicPage = currentPageName === "PublicInvoice";
  const [clientLogo, setClientLogo] = useState([])
  const { totalUnreadCount } = useGlobalMessages();
  useEffect(() => {
    if (isPublicPage) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const user = await localApi.getMe();
        const storedUserData = localStorage.getItem("user");
        if (storedUserData) {
          const storedUser = JSON.parse(storedUserData);
          if (storedUser.permissions) {
            user.permissions = storedUser.permissions;
          }
        }
        setCurrentUser(user);
      } catch (e) {
        console.error("Authentication error:", e);
        localStorage.removeItem("token");
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [isPublicPage, navigate]);

  useEffect(() => {
    if (
      location.pathname.startsWith("/customers") ||
      location.pathname.startsWith("/user-management") ||
      location.pathname.startsWith("/suppliers") ||
      location.pathname.startsWith("/inactive-projects")
    ) {
      if (!sidebarCollapsed) setSelectedItem("Data");
    } else if (
      location.pathname.startsWith("/master-data-management") ||
      location.pathname.startsWith("/payment-settings") ||
      location.pathname.startsWith("/sms-settings") ||
      location.pathname.startsWith("/glaciers-ai")
    ) {
      if (!sidebarCollapsed) setSelectedItem("Settings");
    } else if (
      location.pathname.startsWith("/project-report") ||
      location.pathname.startsWith("/estimate-report") ||
      location.pathname.startsWith("/invoice-report") ||
      location.pathname.startsWith("/inventory-log-report") ||
      location.pathname.startsWith("/material-order-report") ||
      location.pathname.startsWith("/custom-report")
    ) {
      if (!sidebarCollapsed) setSelectedItem("Reports");
    } else if (
      location.pathname.startsWith("/time-entry") ||
      location.pathname.startsWith("/message")
    ) {
      if (!sidebarCollapsed) setSelectedItem("Tools");
    } else {
      setSelectedItem(null);
    }
    
  }, [location.pathname, sidebarCollapsed]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) setSidebarCollapsed(saved === "true");
  }, []);

  const logoClient =
    currentUser?.role_type === "admin"
      ? null
      : currentUser?.created_by;

  const LoadClient = async () => {
    try {
      const res = await clientService.getClients()
      setClientLogo(res)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    LoadClient()
  }, [logoClient])
  const logoData = clientLogo.find(c => c._id === logoClient);
  useEffect(() => {
    if (!loading && currentUser && !initialRedirectDone) {
      const availableItems = allNavigationItems.filter(item => {

        if (!item.permission) return true;

        return hasPermission(
          currentUser?.permissions,
          item.permission.module,
          "view",
          item.permission.submenu
        );

      });


      if (availableItems.length > 0 && location.pathname === "/") {
        navigate(availableItems[0].url, { replace: true });
      }
      setInitialRedirectDone(true);
    }
  }, [loading, currentUser, location.pathname, navigate, initialRedirectDone]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("permissions");
    localStorage.removeItem("user");
    sessionStorage.clear();
    navigate("/login");
  };

  const goToProfile = () => {
    if (window.innerWidth < 720) {
      setSidebarOpen(false);
    }
    if (currentUser?.role_type !== "Superadmin") {
      navigate(`/userProfile/${currentUser?._id}`);
    } else {
      navigate("/super-admin/profile");
    }
  };

  const navigationItems = allNavigationItems
    .map(item => {

      // Role Check
      if (item.roles && !item.roles.includes(currentUser?.role_type)) {
        return null;
      }

      if (item.children) {
        const filteredChildren = item.children.filter(child => {
          if (!child.permission) return true;

          return hasPermission(
            currentUser?.permissions,
            child.permission.module,
            "view",
            child.permission.submenu
          );
        });

        if (filteredChildren.length === 0) return null;

        return { ...item, children: filteredChildren };
      }

      if (!item.permission) return item;

      const canView = hasPermission(
        currentUser?.permissions,
        item.permission.module,
        "view",
        item.permission.submenu
      );

      if (!canView) return null;

      return item;
    })
    .filter(Boolean);


  useEffect(() => {
    if (
      location.pathname.startsWith("/project-report") ||
      location.pathname.startsWith("/estimate-report") ||
      location.pathname.startsWith("/invoice-report") ||
      location.pathname.startsWith("/inventory-log-report") ||
      location.pathname.startsWith("/material-order-report") ||
      location.pathname.startsWith("/custom-report")
    ) {
      setSidebarCollapsed(true);
      localStorage.setItem("sidebarCollapsed", "true");
    }
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  const logourl = currentUser?.logo || logoData?.logo;
  return (
    <div className="flex h-screen bg-background text-foreground">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-theme shadow-xl transform transition-all duration-300 ease-in-out flex flex-col lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${sidebarCollapsed ? "lg:w-20" : "lg:w-64"} w-64`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <div
            className={`flex items-center gap-3 ${sidebarCollapsed ? "lg:justify-center lg:w-full" : ""
              }`}
          >
            {!sidebarCollapsed && (
              <Link to={currentUser?.role_type === "Superadmin" ? "/super-admin/dashboard" : "/dashboard"}>
                {logoData?.logo || currentUser.logo ? (
                  <img
                    src={
                      logoData?.logo
                        ? import.meta.env.VITE_IMG + logoData.logo
                        : currentUser?.logo
                          ? import.meta.env.VITE_IMG + currentUser.logo
                          : Logo
                    }
                    alt="Logo"
                    className="w-30 h-10 rounded-lg cursor-pointer object-contain"
                  />

                ) : (
                  <img
                    src={Logo}
                    className="w-48 rounded-lg cursor-pointer"
                    alt="CoyleJax Logo"
                  />
                )}
              </Link>
            )}
            {sidebarCollapsed && (
              <Link to={currentUser?.role_type === "Superadmin" ? "/super-admin/dashboard" : "/dashboard"} className="hidden lg:block">
                <img
                  src={
                    logoData?.logo
                      ? import.meta.env.VITE_IMG + logoData.logo
                      : currentUser?.logo
                        ? import.meta.env.VITE_IMG + currentUser.logo
                        : Logo
                  }
                  alt="Logo"
                  className="w-30 h-10 rounded-lg cursor-pointer object-contain"
                />
              </Link>
            )}
            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="hidden lg:block">
            <button
              onClick={() => { setSidebarCollapsed(prev => { localStorage.setItem("sidebarCollapsed", !prev); return !prev; }); }}
              className="p-2 rounded-full text-white"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-grow mt-5 px-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isParentActive = item.children
                ? item.children.some((c) => location.pathname.startsWith(c.url))
                : false;
              const isTopLevelActive = item.url === "/"
                ? location.pathname === "/"
                : location.pathname === item.url || location.pathname.startsWith(item.url + "/");
              const isActive = isTopLevelActive || isParentActive;

              return (
                <div
                  key={item.title}
                  className="relative"
                  data-item={item.title}
                >
                  {item.children ? (
                    <>
                      <div
                        onClick={() => {
                          if (sidebarCollapsed) {
                            const isOpening = selectedItem !== item.title;
                            setSelectedItem(isOpening ? item.title : null);
                            setShowDropdown(isOpening);
                          } else {
                            setSelectedItem(
                              selectedItem === item.title ? null : item.title
                            );
                          }
                        }}
                        className={`flex items-center justify-between gap-3 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${!sidebarCollapsed && isActive
                          ? "text-blue-700 font-semibold bg-blue-50 dark:bg-slate-800 dark:text-blue-400"
                          : "text-white hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                          } ${sidebarCollapsed && selectedItem === item.title
                            ? "bg-blue-600 dark:bg-slate-800"
                            : ""
                          }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="relative">
                            <item.icon className="w-4 h-4" />
                            {item.title === 'Tools' && totalUnreadCount > 0 && sidebarCollapsed && (
                              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</span>
                            )}
                          </div>
                          {!sidebarCollapsed && <span>{item.title}</span>}
                          {!sidebarCollapsed && item.title === 'Tools' && totalUnreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                            </span>
                          )}
                        </div>

                        {!sidebarCollapsed && (
                          <ChevronRight
                            className={`w-4 h-4 transform transition-transform duration-300  ${selectedItem === item.title ? "rotate-90" : ""
                              }`}
                          />
                        )}
                      </div>

                      {item.children &&
                        !sidebarCollapsed &&
                        selectedItem === item.title && (
                          <div className="ml-10 mt-1 space-y-1">
                            {item.children.map((child) => {
                              const isChildActive =
                                location.pathname.startsWith(child.url);
                              return (
                                <Link
                                  key={child.title}
                                  to={child.url}
                                  onClick={() => { setSelectedItem(null); setSidebarOpen(false); }}
                                  className={`flex items-center gap-3 px-4 py-2 rounded text-sm font-medium hover:bg-blue-100 hover:text-blue-800 dark:hover:bg-slate-800 dark:hover:text-blue-400 ${isChildActive
                                    ? "text-blue-700 font-semibold bg-blue-50 dark:bg-slate-800 dark:text-blue-400"
                                    : "text-white dark:text-gray-300"
                                    }`}
                                >
                                  <child.icon className="w-4 h-4" />
                                  <span className="flex-1">{child.title}</span>
                                  {child.title === 'Message' && totalUnreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                                      {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                    </>
                  ) : (
                    <div
                      onClick={(e) => {
                        if (sidebarCollapsed) {
                          e.preventDefault();
                          setSelectedItem(
                            selectedItem === item.title ? null : item.title
                          );
                          setShowDropdown(false);
                        }
                      }}
                      className={`cursor-pointer ${sidebarCollapsed && selectedItem === item.title
                        ? "bg-blue-600 rounded-lg"
                        : ""
                        }`}
                    >
                      <Link
                        to={item.url}
                        onClick={(e) => {
                          if (sidebarCollapsed) {
                            e.preventDefault();
                          }
                          setSelectedItem(null);
                          if (window.innerWidth < 720) {
                            setSidebarOpen(false);
                          }
                        }}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${isActive
                          ? "text-blue-700 font-semibold bg-blue-50 dark:bg-slate-800 dark:text-blue-400"
                          : "text-white hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
                          }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="relative">
                            <item.icon className="w-4 h-4" />
                            {item.title === 'Message' && totalUnreadCount > 0 && sidebarCollapsed && (
                              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full font-bold">{totalUnreadCount > 99 ? '99+' : totalUnreadCount}</span>
                            )}
                          </div>
                          {!sidebarCollapsed && <span>{item.title}</span>}
                          {!sidebarCollapsed && item.title === 'Message' && totalUnreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                            </span>
                          )}
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-theme-500">
          <div
            className={`flex items-center ${sidebarCollapsed ? "lg:justify-center" : "justify-between"
              }`}
          >
            <div
              onClick={goToProfile}
              className={`flex items-center gap-3 min-w-0 cursor-pointer ${sidebarCollapsed ? "lg:flex-col" : ""
                }`}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-sm">
                  {(
                    currentUser?.full_name ||
                    currentUser?.firstName ||
                    currentUser?.companyName ||
                    "U"
                  ).charAt(0).toUpperCase()}
                </span>
              </div>

              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white hover:underline">
                    {currentUser?.full_name ||
                      (currentUser?.firstName ? `${currentUser?.firstName} ${currentUser?.lastName}`.trim() : null) ||
                      currentUser?.companyName}
                  </p>
                  <p className="text-sm font-medium truncate text-white hover:underline">{currentUser?.role_type}</p>
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Settings"
                  className="text-white hover:bg-[rgb(239_246_255)]"
                >
                  <Settings className="w-4 h-4 transition-transform hover:rotate-90" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-32 p-1 text-sm"
              >
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <ThemeToggle />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={goToProfile}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {selectedItem && sidebarCollapsed && (() => {

        const selectedNavItem = navigationItems.find(
          (item) => item.title === selectedItem
        );
        const rectTop =
          document
            .querySelector(`[data-item="${selectedItem}"]`)
            ?.getBoundingClientRect().top ?? 0;
        return (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => {
                setSelectedItem(null);
                setShowDropdown(false);
              }}
            />

            <div
              className="fixed bg-[#0e54a7] dark:bg-slate-900 text-white dark:text-gray-200 dark:border dark:border-gray-700 rounded-r-lg shadow-lg z-50 hidden lg:block overflow-y-auto"
              style={{
                top: `${rectTop}px`,
                left: "5rem",
                ...(selectedNavItem?.children ? { bottom: "10px" } : {})
              }}
            >
              {selectedNavItem?.children ? (
                <div className="min-w-[200px]">
                  <div className="px-4 py-2 font-semibold border-b border-blue-400 dark:border-gray-700">
                    {selectedNavItem.title}
                  </div>
                  {selectedNavItem.children.map((child) => (
                    <Link
                      key={child.title}
                      to={child.url}
                      onClick={() => {
                        setSelectedItem(null);
                        setSidebarOpen(false);
                      }}
                      className="block px-4 py-2 hover:bg-blue-600 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{child.title}</span>
                        {child.title === 'Message' && totalUnreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  to={selectedNavItem?.url || "/"}
                  onClick={() => {
                    setSelectedItem(null);
                    setSidebarOpen(false);
                  }}
                  className="block px-4 py-2 hover:bg-blue-600"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{selectedNavItem?.title}</span>
                    {selectedNavItem?.title === 'Message' && totalUnreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              )}
            </div>
          </>
        );
      })()}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="lg:hidden bg-white border-b border-gray-200 z-30">
          <div className="flex items-center bg-theme-500 justify-between px-4 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-4 h-4 text-white dark:text-black" />
            </Button>
            <h1 className="text-lg font-semibold text-white flex-1 text-center flex items-center justify-start gap-2">
              <Link to={currentUser?.role_type === "Superadmin" ? "/super-admin/dashboard" : "/dashboard"}><img
                src={
                  logourl
                    ? `${import.meta.env.VITE_IMG}${logourl}`
                    : Logo
                }
                alt="logo"
                className="h-14 w-14 object-contain"
              /></Link>
              {currentUser?.companyName || logoData?.companyName || "Project Management"}
            </h1>
            <div className="w-10 h-10" />
          </div>
        </header>
        <main
          id="page-content"
          className="flex-1 overflow-y-auto bg-gray50-temp dark:bg-slate-900 dark:text-white lg:pt-0"
        >
          <div className="w-full px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
