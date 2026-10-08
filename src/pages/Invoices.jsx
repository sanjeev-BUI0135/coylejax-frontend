import React, { useState, useEffect, useMemo, useRef } from "react";
import { Invoice } from "@/api/entities";
import { Project } from "@/api/entities";
import { Customer } from "@/api/entities";
import { Payment } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileText, Filter, MoreVertical, RefreshCw, DollarSign, ChevronDown, Clock, Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import InvoiceListView from "../components/invoices/InvoiceListView";
import {DEFAULT_INVOICE_VISIBLE_COLUMNS, INVOICE_LIST_COLUMN_OPTIONS} from "../config/columnConfigs.js";
import InvoiceForm from "../components/invoices/InvoiceForm";
import ViewToggle from "../components/shared/ViewToggle";
import ColumnSelectMenu from "../components/shared/ColumnSelectMenu";
import localApi from "../services/localApi";
import useDebounce from "../hooks/useDebounce";
import TablePageSkeleton from "../components/ui/tableskeleton";
import Swal from "sweetalert2";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatedByUsers } from "../hooks/useCreatedByUsers";
import { formatDateUS, formatDateUTC } from "../utils/formatdate";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import HierarchyUserSelect from "@/components/shared/HierarchyUserSelect";
import { useHierarchyUsers } from "@/hooks/useHierarchyUsers";
import PaymentForm from "../components/invoices/PaymentForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

const getInvoiceColumnStorageKey = (user = {}) => {
  const userId = user.id || user._id || user.email || "default";
  const role = user.role_type || "user";
  return `invoiceListVisibleColumns:${role}:${userId}`;
};

const getAvailableInvoiceColumnKeys = (user = {}) => (
  INVOICE_LIST_COLUMN_OPTIONS
    .filter((column) => !column.hiddenForRoles?.includes(user.role_type))
    .map((column) => column.key)
);

const getDefaultInvoiceColumns = (user = {}) => {
  const availableKeys = getAvailableInvoiceColumnKeys(user);
  return DEFAULT_INVOICE_VISIBLE_COLUMNS.filter((key) => availableKeys.includes(key));
};

const readStoredInvoiceColumns = (user = {}) => {
  try {
    const stored = localStorage.getItem(getInvoiceColumnStorageKey(user));
    const parsed = stored ? JSON.parse(stored) : null;
    const availableKeys = getAvailableInvoiceColumnKeys(user);
    const visibleKeys = Array.isArray(parsed)
      ? parsed.filter((key) => availableKeys.includes(key))
      : [];

    return visibleKeys.length > 0 ? visibleKeys : getDefaultInvoiceColumns(user);
  } catch {
    return getDefaultInvoiceColumns(user);
  }
};

export default function Invoices() {
  const navigate = useNavigate();

  // -------------------- STATE --------------------
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showGeneralPaymentModal, setShowGeneralPaymentModal] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [staticLoading, setStaticLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("invoicesViewMode") || "list");
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [invoiceStatus, setInvoiceStatus] = useState("all");
  const [searchInput, setSearchInput] = useState(
    () => localStorage.getItem("invoiceSearch") || ""
  );
  const debouncedSearch = useDebounce(searchInput, 500);
  const staticDataLoaded = useRef(false);
  const uniqueCustomers = useMemo(() => {
    const map = new Map();

    projects.forEach((project) => {
      (project.customer_ids || []).forEach((customer) => {
        if (customer?._id || customer?.id) {
          map.set(
            customer._id || customer.id,
            customer
          );
        }
      });
    });

    return Array.from(map.values());
  }, [projects]);

  const uniqueCompanies = useMemo(() => {
    return Array.from(
      new Set(
        projects
          .flatMap((p) => p.customer_ids || [])
          .map((c) => c.company_name)
          .filter(Boolean)
      )
    );
  }, [projects]);

  useEffect(() => {
    localStorage.setItem("invoiceSearch", searchInput);
  }, [searchInput]);

  useEffect(() => {
    localStorage.setItem("invoicesViewMode", viewMode);
  }, [viewMode]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("-updatedAt");

  const [user] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const [visibleInvoiceColumns, setVisibleInvoiceColumns] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    return readStoredInvoiceColumns(storedUser);
  });
  const [me, setMe] = useState(null);
  const [creatorFilter, setCreatorFilter] = useState(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const sessionVal = sessionStorage.getItem("invoices_creatorFilter");
    if (sessionVal !== null) return sessionVal;

    return storedUser._id || storedUser.id || "";
  });

  useEffect(() => {
    sessionStorage.setItem("invoices_creatorFilter", creatorFilter);
  }, [creatorFilter]);
  const [allInvoices, setAllInvoices] = useState([]);
  const hierarchyUsers = useHierarchyUsers(user);

  useEffect(() => {
    const fetchAllInvoices = async () => {
      try {
        const probeResp = await Invoice.list({ limit: 1 });
        const total = probeResp?.total || 1000;
        const invoicesResp = await Invoice.list({ limit: total });
        const data = Array.isArray(invoicesResp) ? invoicesResp : (invoicesResp?.data || []);
        setAllInvoices(data);
      } catch (err) {
        console.error("Failed to fetch all invoices for dropdown", err);
      }
    };
    fetchAllInvoices();
  }, []);

  const createdByMap = useCreatedByUsers(allInvoices);
  const creatorDropdownUsers = useMemo(() => {
    return [
      ...new Set(
        allInvoices
          .map((i) => {
            const u = i.created_by_user || i.created_by;
            return typeof u === 'object' && u ? (u._id || u.id) : u;
          })
          .filter(Boolean)
      ),
    ]
      .filter(id => typeof id === 'string' && createdByMap[id] && createdByMap[id] !== "—" && createdByMap[id] !== "Deleted User")
      .map(id => ({ _id: id, full_name: createdByMap[id] }));
  }, [allInvoices, createdByMap]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCompany && selectedCompany !== "all") count++;
    if (selectedProject && selectedProject !== "all") count++;
    if (selectedCustomer && selectedCustomer !== "all") count++;
    if (invoiceStatus && invoiceStatus !== "all") count++;
    return count;
  }, [selectedCompany, selectedProject, selectedCustomer, invoiceStatus]);

  // -------------------- PERMISSIONS --------------------
  const modules = user.permissions || [];
  const invoiceTabPermission = modules.find(
    p =>
      p.module?.toLowerCase() === "projects" &&
      p.submenu_module?.toLowerCase() === "invoices"
  );
  const canView = invoiceTabPermission?.canView ?? false;
  const canAdd = invoiceTabPermission?.canAdd ?? false;
  const canUpdate = invoiceTabPermission?.canUpdate ?? false;
  const canDelete = invoiceTabPermission?.canDelete ?? false;

  useEffect(() => {
    localStorage.setItem(
      getInvoiceColumnStorageKey(user),
      JSON.stringify(visibleInvoiceColumns)
    );
  }, [user, visibleInvoiceColumns]);

  // -------------------- HELPERS --------------------
  const normalizeId = (id) => String(id || "");

  const ownerId = useMemo(() => {
    if (user.role_type === "admin") {
      return normalizeId(user.id);
    }
    return normalizeId(me?.created_by);
  }, [user, me]);

  // -------------------- FETCH ME --------------------
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await localApi.getMe();
        setMe(res);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setViewMode("grid");
    }
  }, [isMobile]);

  // -------------------- LOAD DATA --------------------

  // Load projects & customers only once (they don't change on search/filter)
  const loadStaticData = async () => {
    if (staticDataLoaded.current) {
      setStaticLoading(false);
      return;
    }
    setStaticLoading(true);
    try {
      const [projectsData, customersData] = await Promise.all([
        Project.list(),
        Customer.list()
      ]);
      const projectsArray = Array.isArray(projectsData) ? projectsData : (projectsData.data || []);
      const customersArray = Array.isArray(customersData) ? customersData : (customersData.data || []);
      setProjects(projectsArray);
      setCustomers(customersArray);
      staticDataLoaded.current = true;
    } catch (error) {
      console.error("Error loading static data:", error);
    } finally {
      setStaticLoading(false);
    }
  };

  // Load only invoices — triggered on filter / search / page changes
  const loadData = async () => {
    if (initialLoading) {
      setLoading(true);
    }
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage,
        limit: pageSize,
        sort: sortBy,
        search: debouncedSearch,
        ...(selectedProject !== "all" && {
          project_id: selectedProject
        }),
        ...(selectedCompany !== "all" && {
          company_name: selectedCompany
        }),
        ...(selectedCustomer !== "all" && {
          customer: selectedCustomer
        }),
        ...(invoiceStatus !== "all" && {
          status: invoiceStatus
        }),
        ...(creatorFilter && {
          created_by_user: creatorFilter
        })
      });
      const invoicesRes = await fetch(`${import.meta.env.VITE_API_BASE}/invoices?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      }).then(r => r.json());

      const invoicesArray = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes.data || []);
      setInvoices(invoicesArray);
      setTotalCount(invoicesRes.total || invoicesArray.length);
    } catch (error) {
      console.error("Error loading invoices:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Fetch projects & customers once on mount
  useEffect(() => {
    if (canView) loadStaticData();
  }, [canView]);

  // Fetch invoices whenever filters / debounced search / page changes
  useEffect(() => {
    if (canView) loadData();
  }, [canView, currentPage, pageSize, sortBy, creatorFilter, debouncedSearch, selectedProject, selectedCompany, selectedCustomer, invoiceStatus]);

  const normalize = (str) =>
    (str || "")
      .toLowerCase()
      .replace(/[-_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Client-side search and filtering
  const filteredInvoices = invoices;

  // -------------------- ACTIONS --------------------
  const handleSubmit = async (invoiceData) => {
    try {
      if (editingInvoice) {
        await Invoice.update(editingInvoice._id, invoiceData);

        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Invoice updated successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await Invoice.create(invoiceData);

        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "Invoice created successfully.",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      setShowForm(false);
      setEditingInvoice(null);
      loadData();
    } catch (error) {
      console.error("Error saving invoice:", error);

      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Something went wrong while saving the invoice";

      Swal.fire({
        icon: "error",
        title: "Oops!",
        text: errorMessage,
      });
    }
  };


  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleInvoiceClick = (invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleTakePaymentClick = () => {
    if (selectedItems.length === 1) {
      const selectedInvoice = invoices.find(inv => (inv.id || inv._id) === selectedItems[0]);
      if (selectedInvoice) {
        if (selectedInvoice.status === "paid") {
          Swal.fire({
            icon: "info",
            title: "Already Paid",
            text: "This invoice is already fully paid.",
            confirmButtonColor: "#1d4ed8",
          });
          return;
        }
        setPaymentInvoice(selectedInvoice);
        setShowPaymentModal(true);
        return;
      }
    }
    // Default to general/advance payment modal directly
    setShowGeneralPaymentModal(true);
  };

  const handlePaymentHistoryClick = () => {
    if (selectedItems.length === 1) {
      navigate(`/invoices/${selectedItems[0]}?tab=payments`);
      return;
    }
    // Navigate to dedicated page instead of modal
    navigate("/payment-history");
  };

  const handleGeneralPaymentSubmit = async (paymentData) => {
    try {
      setIsSubmittingPayment(true);

      // Create payment on the backend directly
      await Payment.create({
        amount: paymentData.amount,
        processing_fee: paymentData.payment_method === "card" ? Number((paymentData.amount * 0.03).toFixed(2)) : 0,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        reference_number: paymentData.reference_number,
        notes: paymentData.notes || "General Payment (No Invoice)",
        customer_id: paymentData.customer_id,
        status: "received"
      });

      setShowGeneralPaymentModal(false);
      await loadData(); // refresh list!

      Swal.fire({
        title: "Success!",
        text: "General Payment has been recorded successfully.",
        icon: "success",
        confirmButtonColor: "#1d4ed8",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text: err.message || "Failed to record general payment",
        icon: "error",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handlePaymentSubmit = async (paymentData) => {
    try {
      setIsSubmittingPayment(true);
      
      const projectData = projects.find(p => (p.id || p._id) === paymentInvoice.project_id);
      const customerRaw = projectData?.customer_ids?.[0];
      const customerId = typeof customerRaw === "object" ? customerRaw?._id || customerRaw?.id : customerRaw;

      // Make sure the share token exists, if not generate it
      let finalInvoice = paymentInvoice;
      if (!paymentInvoice.public_share_token) {
        const token = crypto.randomUUID();
        finalInvoice = await Invoice.update(paymentInvoice.id || paymentInvoice._id, {
          ...paymentInvoice,
          public_share_token: token,
        });
      }

      await Payment.create({
        ...paymentData,
        invoice_id: finalInvoice.id || finalInvoice._id,
        project_id: typeof finalInvoice.project_id === "object" ? finalInvoice.project_id._id || finalInvoice.project_id.id : finalInvoice.project_id,
        customer_id: customerId,
        status: "received"
      });

      const newAmountPaid = Number(((finalInvoice.amount_paid || 0) + paymentData.amount).toFixed(2));
      const isPaidFull = newAmountPaid >= Number((finalInvoice.total_amount || 0).toFixed(2));

      await Invoice.update(finalInvoice.id || finalInvoice._id, {
        ...finalInvoice,
        amount_paid: newAmountPaid,
        status: isPaidFull ? "paid" : "partial"
      });

      setShowPaymentModal(false);
      setPaymentInvoice(null);
      await loadData(); // refresh list!

      Swal.fire({
        title: "Success!",
        text: "Payment has been recorded successfully.",
        icon: "success",
        confirmButtonColor: "#1d4ed8",
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Error",
        text: err.message || "Failed to record payment",
        icon: "error",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const availableInvoiceColumnOptions = INVOICE_LIST_COLUMN_OPTIONS.filter(
    (column) => !column.hiddenForRoles?.includes(user.role_type)
  );

  const resetInvoiceColumns = () => {
    setVisibleInvoiceColumns(getDefaultInvoiceColumns(user));
  };

  if (initialLoading || staticLoading) return <TablePageSkeleton />;

  // -------------------- UI --------------------
  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Invoices</h1>
            <p className="text-gray-600 mt-1">Manage all customer invoices.</p>
          </div>
          <div className="flex items-center gap-3">

            {/* Desktop Buttons */}
            {!isMobile && (
              <>
                <Button
                  variant={showSearch ? "default" : "outline"}
                  size="icon"
                  onClick={() => { setSelectedItems([]); setShowSearch(!showSearch) }}
                  className={`relative ${showSearch ? "border-2 border-transparent" : ""}`}
                >
                  <Filter className="w-4 h-4" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>

                <div className="w-[180px] hidden md:block">
                  <HierarchyUserSelect
                    users={creatorDropdownUsers}
                    value={creatorFilter}
                    onChange={(value) => {
                      setCreatorFilter(value === "all" ? "" : value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                <ColumnSelectMenu
                  columns={availableInvoiceColumnOptions}
                  visibleColumnKeys={visibleInvoiceColumns}
                  onVisibleColumnKeysChange={setVisibleInvoiceColumns}
                  onReset={resetInvoiceColumns}
                />

                <ViewToggle view={viewMode} onViewChange={setViewMode} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium animate-in fade-in"
                    >
                      <DollarSign className="w-4 h-4" />
                      Take Payment
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleTakePaymentClick}>
                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                      Take Payment
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePaymentHistoryClick}>
                      <Clock className="w-4 h-4 mr-2 text-blue-600" />
                      Payment History
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {canAdd && (
                  <Button
                    onClick={() => {
                      setSelectedItems([]);
                      if (canAdd) setShowForm(true);
                      else alert("You do not have permission to create invoices.");
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Invoice
                  </Button>
                )}
              </>
            )}

            {/* Mobile Dropdown */}
            {isMobile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">

                  <div className="px-2 py-1.5">
                    <Button
                      variant="outline"
                      className="w-full justify-start relative"
                      onClick={() => { setSelectedItems([]); setShowSearch(!showSearch) }}
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                      {activeFiltersCount > 0 && (
                        <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </div>

                  <DropdownMenuItem onClick={handleTakePaymentClick}>
                    <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                    Take Payment
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handlePaymentHistoryClick}>
                    <Clock className="w-4 h-4 mr-2 text-blue-600" />
                    Payment History
                  </DropdownMenuItem>

                  {canAdd && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedItems([]);
                        if (canAdd) setShowForm(true);
                        else alert("You do not have permission to create invoices.");
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Invoice
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSearch && (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-2 shadow-sm flex flex-wrap gap-2 items-start mb-6">
            {/* Project */}
            <div className="w-[180px]">
              <Select
                value={selectedProject}
                onValueChange={(value) => {
                  setSelectedProject(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Select Project</SelectItem>

                  {Array.from(
                    new Map(
                      projects.map((p) => [
                        p.id || p._id,
                        p
                      ])
                    ).values()
                  ).map((p) => (
                    <SelectItem
                      key={p.id || p._id}
                      value={p.id || p._id}
                    >
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company */}
            <div className="w-[180px]">
              <Select
                value={selectedCompany}
                onValueChange={(value) => {
                  setSelectedCompany(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Company" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Select Company</SelectItem>

                  {uniqueCompanies.map((company) => (
                    <SelectItem
                      key={company}
                      value={company}
                    >
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Customer */}
            <div className="w-[180px]">
              <Select
                value={selectedCustomer}
                onValueChange={(value) => {
                  setSelectedCustomer(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select Contact" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">Select Contact</SelectItem>

                  {uniqueCustomers.map((c) => (
                    <SelectItem
                      key={c._id || c.id}
                      value={c._id || c.id}
                    >
                      {c.contact_name || c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="w-[180px]">
              <Select
                value={invoiceStatus}
                onValueChange={(value) => {
                  setInvoiceStatus(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Reset */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCurrentPage(1);
                setSearchInput("");
                setSelectedProject("all");
                setSelectedCustomer("all");
                setSelectedCompany("all");
                setInvoiceStatus("all");
                setCreatorFilter("");
                localStorage.removeItem("invoiceSearch");
              }}
              className="h-10"
            >
              <RefreshCw />
            </Button>
          </div>
        )}
      </AnimatePresence>
      <div className="relative flex-1 min-w-[220px] mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400temp" />
        <Input
          value={searchInput}
          onChange={(e) => {
            setSelectedItems([]);
            setCurrentPage(1);
            setSearchInput(e.target.value);
          }}
          placeholder="Search invoice, PO, project..."
          className="pl-10"
        />
      </div>
      <AnimatePresence>
        {showForm && (
          <InvoiceForm
            invoice={editingInvoice}
            projects={projects}
            invoices={invoices}
            customers={customers}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingInvoice(null);
            }}
          />
        )}
      </AnimatePresence>

      <InvoiceListView
        invoices={filteredInvoices}
        projects={projects}
        onInvoiceClick={handleInvoiceClick}
        onEdit={handleEdit}
        canUpdate={canUpdate}
        canDelete={canDelete}
        viewMode={isMobile ? "grid" : viewMode}
        currentPage={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        loadData={loadData}
        clientSidePagination={!!debouncedSearch}
        currentSort={sortBy}
        onSortChange={setSortBy}
        selectedItems={selectedItems}
        setSelectedItems={setSelectedItems}
        visibleColumnKeys={visibleInvoiceColumns}
      />

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-400temp mb-3" />
          <p className="text-gray-600temp">No invoices found</p>
        </div>
      )}

      {paymentInvoice && (
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-5xl p-0 bg-transparent border-none overflow-y-auto max-h-[90vh] hide-scrollbar">
            <PaymentForm
              invoice={paymentInvoice}
              balanceDue={Math.max(0, Number(((paymentInvoice.total_amount || 0) - (paymentInvoice.amount_paid || 0)).toFixed(2)))}
              onSubmit={handlePaymentSubmit}
              onCancel={() => {
                setShowPaymentModal(false);
                setPaymentInvoice(null);
              }}
              publicShareToken={paymentInvoice.public_share_token}
              loading={isSubmittingPayment}
            />
          </DialogContent>
        </Dialog>
      )}

      {showGeneralPaymentModal && (
        <Dialog open={showGeneralPaymentModal} onOpenChange={setShowGeneralPaymentModal}>
          <DialogContent className="max-w-5xl p-0 bg-transparent border-none overflow-y-auto max-h-[90vh] hide-scrollbar">
            <PaymentForm
              invoice={null}
              balanceDue={0}
              onSubmit={handleGeneralPaymentSubmit}
              onCancel={() => {
                setShowGeneralPaymentModal(false);
              }}
              isGeneral={true}
              customers={customers}
              loading={isSubmittingPayment}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
