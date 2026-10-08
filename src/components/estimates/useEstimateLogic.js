import { useState, useEffect, useRef } from "react"
import Swal from "sweetalert2"
import masterDataService from "../../services/masterDataService"
import localApi from "../../services/localApi"
import clientService from "../../services/clientAddService"
import { InventoryItem } from "@/api/entities"
import { format } from "date-fns"

const stripHtml = (html) => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

export default function useEstimateLogic({
  estimate,
  projectForNewEstimate,
  projects,
  estimates,
  onSubmit,
  onCancel,
  isQuickMode = false,
  quickCustomer = null,
  customers = []
}) {
  const [formData, setFormData] = useState({ line_items: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [leadsList, setLeadsList] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([])
  const [inventoryCategories, setInventoryCategories] = useState([])
  const [laborRoles, setLaborRoles] = useState([])
  const [client, setClient] = useState(null)
  const [showInventorySearch, setShowInventorySearch] = useState(null)
  const [inventorySearchTerm, setInventorySearchTerm] = useState("")
  const [divisionTypes, setDivisionTypes] = useState([])
  const [isDirty, setIsDirty] = useState(false);
  const [isTaxExemptToggle, setIsTaxExemptToggle] = useState(false); // true = tax exempt (no tax), false = taxable
  const userOverrideTax = useRef(false); // true when user manually toggled - skip auto-updates
  const inputRefs = useRef({})

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const [me, setMe] = useState({})
  const hasFetchedPo = useRef(false);

  // ================= INIT FORM =================
  const getInitialFormData = () => {
    const config = user?.project_number_config || {}
    const year = config?.new_project?.year
    const initials = config?.new_project?.prefix
    const allEstimates = estimates || []
    let nextSeq = 1
    const sequences = allEstimates
      .map(e => e.estimate_number)
      .filter(num => num?.startsWith(`EST-${year}`))
      .map(num => {
        const seq = num.replace(`EST-${year}`, "").slice(0, 4)
        return parseInt(seq, 10) || 0
      })

    nextSeq = sequences.length > 0 ? Math.max(...sequences) + 1 : 1

    const estimateNumber = `EST-${year}${String(nextSeq).padStart(4, "0")}${initials}`

    const exemptList = paymentSettings?.taxExemptCustomers || [];
    const exemptLeadsList = paymentSettings?.taxExemptLeads || [];
    let isExempt = false;
    if (isQuickMode) {
      if (quickCustomer?._lead_id && exemptLeadsList.some(id => id.toString() === quickCustomer._lead_id.toString())) {
        isExempt = true;
      } else if (quickCustomer?.email_address) {
        const email = quickCustomer.email_address.toLowerCase().trim();
        const customer = customers.find(c => c.email?.toLowerCase().trim() === email);
        if (customer) {
          const customerId = customer._id || customer.id;
          isExempt = exemptList.some(id => id.toString() === customerId?.toString());
        }
      }
    } else {
      let projectIdToUse = "";
      if (estimate) {
        projectIdToUse = typeof estimate.project_id === 'object' ? estimate.project_id?._id : estimate.project_id;
      } else if (projectForNewEstimate) {
        projectIdToUse = projectForNewEstimate._id || projectForNewEstimate.id;
      }
      
      if (projectIdToUse) {
        const project = projects.find(p => p.id === projectIdToUse || p._id === projectIdToUse);
        if (project && project.customer_ids && project.customer_ids.length > 0) {
          const customerId = project.customer_ids[0]?._id || project.customer_ids[0];
          isExempt = exemptList.some(id => id.toString() === customerId?.toString());
        }
      }
    }

    const defaultTax = paymentSettings?.taxRate != null ? paymentSettings.taxRate : 0.075;
    const initialTaxRate = isExempt ? 0 : defaultTax;

    // Initialize toggle: ON (exempt) if customer is exempt AND estimate has no tax
    // For new estimates: ON if customer is exempt, OFF otherwise
    // For existing estimates: ON if customer is exempt AND current tax_rate is 0
    const estimateTaxRate = estimate ? (estimate.tax_rate ?? defaultTax) : initialTaxRate;
    const initialToggle = isExempt ? (estimate ? estimateTaxRate === 0 : true) : false;
   
    const defaults = {
      estimate_number: '',
      customer_po_number: '',
      status: "draft",
      division_type: "",
      line_items: [],
      tax_rate: initialTaxRate,
      material_markup_amount: 0,
      notes: "",
      reject_reason: "",
      valid_until: "",
      file_attachments: [],
      project_location: "",
      project_id: "",
      Scope_of_work: "",
      is_quick_estimate: isQuickMode
    }

    let initialData = { ...defaults }

    if (estimate) {
      const mappedItems = (estimate.line_items || []).map(item => ({
        ...item,
        original_unit_price:
          item.original_unit_price != null
            ? item.original_unit_price
            : item.unit_price,
      }))
      initialData = { 
        ...defaults, 
        ...estimate, 
        notes: estimate.notes || "",
        line_items: mappedItems,
        // For existing estimates: keep stored tax_rate unless customer is exempt AND toggle would be ON
        // If customer is exempt and toggle=ON then tax=0, otherwise keep the stored value
        tax_rate: isExempt && initialToggle ? 0 : (estimate.tax_rate ?? initialTaxRate),
        // Preserve stored manual override flag
        tax_exempt_override: estimate.tax_exempt_override ?? false
      }
      if (initialData.valid_until) {
        try {
          initialData.valid_until = format(
            new Date(initialData.valid_until),
            "yyyy-MM-dd"
          )
        } catch {
          initialData.valid_until = ""
        }
      }
    } else if (projectForNewEstimate && !isQuickMode) {
      const projectId = projectForNewEstimate._id || projectForNewEstimate.id

      initialData.project_id = projectId
      initialData.project_location = projectForNewEstimate.location || ""
      initialData.project_name = projectForNewEstimate.project_name || ""
    } else if (isQuickMode && quickCustomer?.site_address) {
      initialData.project_location = quickCustomer.site_address
    }

    return initialData
  }

  // Helper: compute isExempt and initialToggle for the current form state
  const computeExemptState = (settings, currentFormData, currentEstimate) => {
    const exemptList = settings?.taxExemptCustomers || [];
    const exemptLeadsList = settings?.taxExemptLeads || [];
    const defaultTax = settings?.taxRate != null ? settings.taxRate : 0.075;
    let isExemptNow = false;

    if (isQuickMode) {
      if (quickCustomer?._lead_id && exemptLeadsList.some(id => id.toString() === quickCustomer._lead_id.toString())) {
        isExemptNow = true;
      } else if (quickCustomer?.email_address) {
        const email = quickCustomer.email_address.toLowerCase().trim();
        const customer = customers.find(c => c.email?.toLowerCase().trim() === email);
        if (customer) {
          isExemptNow = exemptList.some(id => id.toString() === (customer._id || customer.id)?.toString());
        }
      }
    } else if (currentFormData?.project_id) {
      const project = projects.find(p => p.id === currentFormData.project_id || p._id === currentFormData.project_id);
      if (project?.customer_ids?.length > 0) {
        const customerId = project.customer_ids[0]?._id || project.customer_ids[0];
        isExemptNow = exemptList.some(id => id.toString() === customerId?.toString());
      }
    }

    const estimateTaxRate = currentEstimate ? (currentEstimate.tax_rate ?? defaultTax) : defaultTax;
    const toggleState = isExemptNow ? (currentEstimate ? estimateTaxRate === 0 : true) : false;
    return { isExemptNow, toggleState };
  };

  // ================= LOAD USER / CLIENT =================
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const meRes = await localApi.getMe()
        setMe(meRes)
        const clientId = meRes.role_type === "admin" ? meRes.id : meRes.created_by
        if (clientId) {
          const clientRes = await clientService.getClientById(clientId)
          setClient(clientRes)
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchMe()
  }, [])

  // ================= LOAD PAYMENT SETTINGS =================
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await localApi.request("/payment-settings/stripe");
        setPaymentSettings(data);
      } catch (err) {
        console.error("Failed to load payment settings", err);
      }
    };
    fetchSettings();

    const fetchLeads = async () => {
      try {
        const res = await localApi.request("/leads?includeConverted=true&limit=10000");
        setLeadsList(Array.isArray(res) ? res : (res.data || []));
      } catch (err) {
        console.error("Failed to load leads", err);
      }
    };
    if (isQuickMode) {
      fetchLeads();
    }
  }, [isQuickMode]);

  // ================= TAX EXEMPTION WATCHER =================
  useEffect(() => {
    if (!paymentSettings) return;

    const defaultTax = paymentSettings.taxRate != null ? paymentSettings.taxRate : 0.075;
    const exemptList = paymentSettings.taxExemptCustomers || [];
    const exemptLeadsList = paymentSettings.taxExemptLeads || [];
    let isExempt = false;

    if (isQuickMode) {
      // First check by _lead_id (most reliable)
      if (quickCustomer?._lead_id && exemptLeadsList.some(id => id.toString() === quickCustomer._lead_id.toString())) {
        isExempt = true;
      } else if (quickCustomer?.email_address) {
        const email = quickCustomer.email_address.toLowerCase().trim();
        const customer = customers.find(c => c.email?.toLowerCase().trim() === email);
        if (customer) {
          const customerId = customer._id || customer.id;
          isExempt = exemptList.some(id => id.toString() === customerId?.toString());
        }
        // Always also check leadsList by email (covers leads not yet converted to customers)
        if (!isExempt) {
          const lead = leadsList.find(l => l.email?.toLowerCase().trim() === email);
          if (lead) {
            const leadId = lead._id || lead.id;
            isExempt = exemptLeadsList.some(id => id.toString() === leadId?.toString());
          }
        }
      }
    } else {
      if (formData.project_id) {
        const project = projects.find(p => p.id === formData.project_id || p._id === formData.project_id);
        if (project && project.customer_ids && project.customer_ids.length > 0) {
          const customerId = project.customer_ids[0]?._id || project.customer_ids[0];
          isExempt = exemptList.some(id => id.toString() === customerId?.toString());
        }
      }
    }

    const newTax = isExempt ? 0 : defaultTax;

    // Determine whether to update tax:
    // - Always update for new estimates (unless user has manually overridden)
    // - For existing estimates: update if customer is NOW exempt (force tax=0)
    //   or if project/customer changed (recalculate)
    // - Skip auto-update if user has manually toggled
    let shouldUpdateTax = false;

    if (userOverrideTax.current) {
      // User manually toggled - don't auto-override their choice
      shouldUpdateTax = false;
    } else if (!estimate) {
      shouldUpdateTax = true; // New estimate
    } else if (isExempt) {
      // If customer is exempt, enforce tax=0 unless user has already overridden
      shouldUpdateTax = true;
    } else if (!isQuickMode && formData.project_id !== (estimate.project_id?._id || estimate.project_id)) {
      shouldUpdateTax = true; // Changed project
    } else if (isQuickMode && quickCustomer?.email_address?.toLowerCase().trim() !== estimate.quick_customer?.email_address?.toLowerCase().trim()) {
      shouldUpdateTax = true; // Changed customer email in quick mode
    }

    if (shouldUpdateTax && formData.tax_rate !== newTax) {
      setFormData(prev => ({ ...prev, tax_rate: newTax }));
      setIsDirty(true);
    }

    // Sync toggle state from auto-update (only when not user-overridden)
    if (!userOverrideTax.current) {
      // For existing estimates: if customer is exempt, derive toggle from the stored tax_rate
      if (estimate) {
        const storedTaxRate = estimate.tax_rate ?? 0;
        setIsTaxExemptToggle(isExempt ? storedTaxRate === 0 : false);
      } else {
        setIsTaxExemptToggle(isExempt);
      }
    }
  }, [formData.project_id, isQuickMode, quickCustomer?._lead_id, quickCustomer?.email_address, paymentSettings, projects, customers, leadsList, estimate]);

  // ================= INIT FORM =================
  useEffect(() => {
    setFormData(prev => {
      const newData = getInitialFormData();
      setIsDirty(false);
      return {
        ...newData,
        customer_po_number: prev.customer_po_number || newData.customer_po_number,
        notes: prev.notes || newData.notes
      };
    });
    // Reset user override when switching estimates
    userOverrideTax.current = false;
    // Restore override state if this estimate was previously manually overridden
    if (estimate?.tax_exempt_override === true) {
      userOverrideTax.current = true;
      setIsTaxExemptToggle(estimate.tax_rate === 0);
    }
  }, [estimate, projectForNewEstimate, projects, estimates, isQuickMode, paymentSettings]);

  // ================= INVENTORY =================
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const items = await InventoryItem.filter({ project_id: null });
        const filtered = items?.data?.filter(
          i => i.created_by === user.id || i.created_by === me.created_by
        )
        setInventoryItems(filtered)
      } catch (err) {
        console.error("Inventory load error", err)
      }
    }
    if (user.id) loadInventory()
  }, [user.id, me.created_by])

  // ================= CATEGORIES =================
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await masterDataService.getAll("categories")
        const filtered = res.data.filter(
          c => (!c.created_by || c.created_by === user.id || c.created_by === me.created_by) && c.status === "active"
        )
        setInventoryCategories(filtered)
      } catch (err) {
        console.error("Category error", err)
      }
    }
    if (user.id) loadCategories()
  }, [user.id, me.created_by])

  // ================= DIVISION TYPES =================
  useEffect(() => {
    const loadDivisionTypes = async () => {
      try {
        const res = await masterDataService.getAll("divisions")
        const filtered = res.data.filter(div => {
          if (div.status !== "active") return false;

          const companyId = me.role_type === "admin" ? me._id : me.created_by;
          return String(div.created_by) === String(companyId);
        })
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

        setDivisionTypes(filtered)
      } catch (err) {
        console.error("Division type error", err)
      }
    }

    if (user.id) loadDivisionTypes()
  }, [user.id, me.created_by])

  useEffect(() => {

    const loadPoNumber = async () => {

      try {

        // =========================
        // PROJECT ESTIMATE
        // =========================
        if (projectForNewEstimate?.project_number) {

          setFormData(prev => ({
            ...prev,
            customer_po_number:
              prev.customer_po_number ||
              `PO-${projectForNewEstimate.project_number}`
          }));

          return;
        }

        // =========================
        // NORMAL / QUICK ESTIMATE
        // =========================
        const res = await localApi.request(
          "/estimates/next-po-number"
        );

        setFormData(prev => ({
          ...prev,
          customer_po_number:
            prev.customer_po_number ||
            res.customer_po_number ||
            ""
        }));

        hasFetchedPo.current = true;

      } catch (err) {
        console.error(err);
      }
    };

    if (!estimate && !hasFetchedPo.current) {
      loadPoNumber();
    }

  }, [estimate, projectForNewEstimate]);


  // ================= LABOR ROLES =================
  useEffect(() => {
    masterDataService
      .getAll("labor_roles")
      .then(res => {
        const active = res.data.filter(
          x => x.status === "active" && (x.created_by === user.id || x.created_by === me.created_by)
        )
        setLaborRoles(active)
      })
      .catch(err => console.error(err))
  }, [user.id, me.created_by])

  // ================= HELPERS =================
  const handleInputChange = (field, value) => {
    setFormData(prev => {
      if (prev[field] !== value) {
        setIsDirty(true);
      }

      return {
        ...prev,
        [field]: value
      };
    });
  };

  // ================= TAX EXEMPT TOGGLE =================
  // Called when user manually flips the tax exempt toggle in the form
  const handleTaxExemptToggle = (checked) => {
    userOverrideTax.current = true; // Mark as user-overridden
    setIsTaxExemptToggle(checked);
    const defaultTax = paymentSettings?.taxRate != null ? paymentSettings.taxRate : 0.075;
    const newTaxRate = checked ? 0 : defaultTax; // ON = exempt (0), OFF = apply default tax rate
    setFormData(prev => ({ 
      ...prev, 
      tax_rate: newTaxRate,
      tax_exempt_override: true  // Persist the override flag in formData so it saves to DB
    }));
    setIsDirty(true);
  };

  // ================= LINE ITEMS =================
  const addLineItem = (insertIndex = null) => {
    const defaultCat = inventoryCategories[0];
    setIsDirty(true);
    setFormData(prev => {
      const newItem = {
        category: defaultCat?.value || "materials",
        category_display_name: defaultCat?.display_name || "materials",
        description: "",
        quantity: 1,
        unit: "each",
        unit_price: 0,
        markup_percentage: 0,
        original_unit_price: null,
        total: 0,
        inventory_item_id: null,
        is_new: prev.status === "approved",
        isNew: prev.status === "approved"
      };
      
      const newLineItems = [...prev.line_items];
      if (insertIndex !== null && insertIndex !== undefined) {
        newLineItems.splice(insertIndex + 1, 0, newItem);
      } else {
        newLineItems.push(newItem);
      }

      return {
        ...prev,
        line_items: newLineItems
      };
    });
  };

  const addSection = (insertIndex = null) => {
    setIsDirty(true);
    setFormData(prev => {
      const newItems = [...prev.line_items];
      const sectionItem = {
        category: "section",
        category_display_name: "Section",
        description: "",
        quantity: 0,
        unit: "",
        unit_price: 0,
        markup_percentage: 0,
        original_unit_price: null,
        total: 0,
        inventory_item_id: null,
        is_new: prev.status === "approved",
        isNew: prev.status === "approved",
        is_section: true
      };

      if (insertIndex !== null && insertIndex >= 0 && insertIndex < newItems.length) {
        newItems.splice(insertIndex + 1, 0, sectionItem);
      } else {
        newItems.push(sectionItem);
      }

      return {
        ...prev,
        line_items: newItems
      };
    });
  };



  const updateLineItem = (index, field, value) => {
    const newItems = [...formData.line_items]
    const item = { ...newItems[index] }
    setIsDirty(true);
    if (field === "category") {
      const selectedCategory = inventoryCategories.find(
        (c) => c.value === value
      );

      item.category = value;
      item.category_display_name =
        selectedCategory?.display_name || value;

      item.description = "";
      item.unit = "each";
      item.unit_price = 0;
      item.markup_percentage = 0;
      item.inventory_item_id = null;
      item.original_unit_price = null;
      item.total = 0;

      newItems[index] = item;
      setFormData(prev => ({ ...prev, line_items: newItems }));
      return;
    }

    if (field === "unit_price") {
      const newVal = parseFloat(value) || 0
      const oldVal = parseFloat(item.unit_price) || 0
      if (oldVal > 0 && newVal !== oldVal) {
        item.previous_unit_price = oldVal
      }
      item.unit_price = newVal
    } else if (field === "quantity" || field === "markup_percentage") {
      item[field] = parseFloat(value) || 0
    } else {
      item[field] = value
      if (field === "description" && item.inventory_item_id) {
        item.inventory_item_id = null;
      }
    }

    const base = item.quantity * item.unit_price
    const markup = base * ((item.markup_percentage || 0) / 100)
    item.total = base + markup
    newItems[index] = item
    setFormData(prev => ({ ...prev, line_items: newItems }))
  }

  const selectInventoryItem = (index, item) => {
    setIsDirty(true);
    const newItems = [...formData.line_items]
    const current = { ...newItems[index] }

    let basePrice = 0

    if (current.category?.toLowerCase() === "labor") {
      basePrice = parseFloat(item.hourly_rate) || 0
      current.description = item.display_name
      current.unit = "hour"
    } else {
      basePrice = parseFloat(item.unit_cost) || 0
      current.description = item.item_name
      current.unit = item.unit || "each"
    }

    current.unit_price = basePrice
    current.original_unit_price = basePrice
    current.inventory_item_id = item._id || item.id

    const base = current.quantity * current.unit_price
    const markup = base * ((current.markup_percentage || 0) / 100)
    current.total = base + markup

    newItems[index] = current
    setFormData(prev => ({ ...prev, line_items: newItems }))
    setShowInventorySearch(null)
    setInventorySearchTerm("")
  }

  const removeLineItem = index => {
    setIsDirty(true);
    const itemToRemove = formData.line_items?.[index];
    const associatedNote = itemToRemove?.associated_note;

    setFormData(prev => {
      let nextNotes = prev.notes || "";
      if (associatedNote) {
        nextNotes = nextNotes.replace(associatedNote, "").replace(/\n\s*\n/g, "\n").trim();
      }

      return {
        ...prev,
        notes: nextNotes,
        line_items: prev.line_items.filter((_, i) => i !== index)
      };
    });
  }

  // ================= FILTER INVENTORY =================
  const filteredInventoryItems = (() => {
    const item = formData.line_items?.[showInventorySearch]
    if (!item) return []
    if (item.category?.toLowerCase() === "labor") {
      return laborRoles.filter(r =>
        r.display_name?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
      )
    }
    return inventoryItems.filter(i => {
      const catMatch = i.category?.toLowerCase() === item.category?.toLowerCase()
      const search =
        i.item_name?.toLowerCase().includes(inventorySearchTerm.toLowerCase()) ||
        i.description?.toLowerCase().includes(inventorySearchTerm.toLowerCase())
      return catMatch && search
    })
  })()

  // ================= TOTALS =================
  const itemsWithTotals =
    formData.line_items?.map(i => {
      const base = i.quantity * i.unit_price
      const markup = base * ((i.markup_percentage || 0) / 100)
      return { ...i, total: Number((base + markup).toFixed(2)) }
    }) || []

  const lineItemsTotal = itemsWithTotals.reduce((s, i) => s + (i.total || 0), 0)
  const additionalMarkup = Number(formData.material_markup_amount) || 0
  const subtotal = Number((lineItemsTotal + additionalMarkup).toFixed(2))

  const taxableLineItemsTotal = itemsWithTotals
    .filter(i => i.category?.toLowerCase() === "materials")
    .reduce((s, i) => s + (i.total || 0), 0)

  const taxableAmount = taxableLineItemsTotal
  const tax_amount = Number((taxableAmount * (formData.tax_rate || 0)).toFixed(2))
  const total_amount = Number((subtotal + tax_amount).toFixed(2))

  // ================= SUBMIT =================
  const handleSubmit = async (e, quickCustomerData, isQuick) => {
    e.preventDefault()

    // Prevent double-submit
    if (isSubmitting) return;

    if (estimate && !isDirty) {
      if (onCancel) {
        onCancel();
      }
      return Swal.fire({
        icon: "info",
        title: "No Changes Detected",
        text: "No changes were made to the estimate.",
        timer: 2000,
        showConfirmButton: false
      });
    }

    const token = localStorage.getItem("token")
    const config = user?.project_number_config || {};

    if (!token) {
      return Swal.fire({ icon: "error", title: "Login required" })
    }

    const scopeText = stripHtml(formData.Scope_of_work)?.trim();
    if (!scopeText) {
      return Swal.fire({
        icon: "error",
        title: "Required Field Missing",
        text: "Scope of Work is required"
      });
    }

    // Validate quick mode requirements
    if (isQuick) {
      const missingFields = []

      if (!quickCustomerData?.company_name) missingFields.push("Company Name")
      if (!quickCustomerData?.customer_name) missingFields.push("Customer Name")
      if (!quickCustomerData?.email_address) missingFields.push("Email")
      if (!quickCustomerData?.division_type) missingFields.push("Division Type")

      // Phone number validation: must be 10 digits
      const phoneDigits = (quickCustomerData?.phone_number || "").replace(/\D/g, "")
      if (!phoneDigits) {
        missingFields.push("Phone Number")
      } else if (phoneDigits.length !== 10) {
        return Swal.fire({
          icon: "error",
          title: "Invalid Phone Number",
          text: "Phone number must be exactly 10 digits"
        })
      }

      if (missingFields.length > 0) {
        return Swal.fire({
          icon: "error",
          title: "Required Fields Missing",
          text: `${missingFields.join(", ")} ${missingFields.length > 1 ? "are" : "is"
            } required for quick estimates`
        })
      }
    }

    setIsSubmitting(true);
    Swal.fire({
      title: estimate ? "Updating Estimate..." : "Creating Estimate...",
      text: "Please wait",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formattedAttachments = (formData.file_attachments || []).map(file => ({
        file_name: file.file_name,
        file_url: file.file_url,

        uploaded_by: user?.full_name || me?.full_name,
        uploaded_by_id: user?.id || me?._id,

        uploaded_by_model:
          user?.role_type === "admin" ? "Client" : "User",

        createdAt: file.createdAt || new Date()
      }));
      const isCompletedProject = estimate?.project?.status?.toLowerCase() === "completed";
      const submitData = {
        ...formData,
        status: estimate
          ? (
            isDirty
              ? (estimate.status === "approved" && isCompletedProject ? "approved" : "draft")
              : (formData.status || estimate.status)
          )
          : "draft",
        file_attachments: formattedAttachments,
        line_items: itemsWithTotals.map(item => {
          const selectedCategory = inventoryCategories.find(
            c => c.value === item.category
          );

          return {
            ...item,
            category_display_name: selectedCategory?.display_name || item.category
          };
        }),
        subtotal,
        tax_amount,
        total_amount,
        is_quick_estimate: isQuick,
        created_by_user: user?.id || me?.id,
        // Tell backend to respect user's manually chosen tax_rate (not override from payment settings)
        tax_exempt_override: userOverrideTax.current ? true : undefined
      }

      // Add quick customer data if in quick mode   
      if (isQuick) {
        submitData.quick_customer = quickCustomerData
        submitData.project_name = quickCustomerData?.project_name || submitData.project_name || ""
      } else if (projectForNewEstimate) {
        submitData.project_name = projectForNewEstimate.project_name || submitData.project_name || ""
      }

      if (quickCustomerData?._lead_id) {
        submitData.lead_id = quickCustomerData._lead_id;
      }

      await onSubmit(submitData, token)

      Swal.fire({
        icon: "success",
        title: estimate ? "Estimate Updated!" : "Estimate Created!",
        text: estimate ? "The estimate has been updated successfully." : "The estimate has been created successfully.",
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error("Submit error:", error)
      Swal.close();
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "An error occurred while saving";
      Swal.fire({
        icon: "error",
        title: "Save failed",
        text: errorMessage
      })
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    formData,
    client,
    inventoryCategories,
    inventoryItems,
    laborRoles,
    divisionTypes,
    me,
    user,
    showInventorySearch,
    setShowInventorySearch,
    inventorySearchTerm,
    setInventorySearchTerm,
    inputRefs,
    filteredInventoryItems,
    subtotal,
    tax_amount,
    total_amount,
    handleInputChange,
    addLineItem,
    addSection,
    updateLineItem,
    selectInventoryItem,
    removeLineItem,
    handleSubmit,
    isSubmitting,
    setIsDirty,
    isTaxExemptToggle,
    setIsTaxExemptToggle,
    handleTaxExemptToggle,
    paymentSettings
  }
}