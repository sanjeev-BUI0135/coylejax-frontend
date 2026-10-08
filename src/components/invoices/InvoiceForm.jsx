import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import InputMask from "react-input-mask";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import "../../App.css";
import { X, Save, Plus, Trash, RefreshCw, Search, ArrowDown, AlertCircle, ArrowUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import CustomDatePicker from '../ui/CustomDatePicker';
import { InventoryItem } from '@/api/entities';
import { createPortal } from 'react-dom';
import masterDataService from '../../services/masterDataService.js';
import localApi from '../../services/localApi.js';
import clientService from '../../services/clientAddService.js';
import api from "../../services/masterDataService.js";
import { renderTextWithLinks, linkifyHtml, handlePasteLink } from "@/components/ui/renderTextWithLinks";
import { useHierarchyUsers } from "@/hooks/useHierarchyUsers";

const getRemainingData = (sourceEstimate) => {
  const estimateTotal = sourceEstimate.total_amount || 0;
  const invoicedAmount = sourceEstimate.invoiced_amount || 0;

  const remainingAmount = estimateTotal - invoicedAmount;

  const ratio = remainingAmount / estimateTotal;

  const newItems = JSON.parse(JSON.stringify(sourceEstimate.line_items));

  newItems.forEach(item => {
    item.quantity = (item.quantity || 0) * ratio;

    const base = item.quantity * item.unit_price;
    const markup = base * ((item.markup_percentage || 0) / 100);

    item.total = parseFloat((base + markup).toFixed(2));
  });

  const totalMarkup = sourceEstimate.material_markup_amount || 0;

  const alreadyInvoicedMarkup =
    estimateTotal > 0
      ? totalMarkup * (invoicedAmount / estimateTotal)
      : 0;

  const remainingMarkup = totalMarkup - alreadyInvoicedMarkup;

  return {
    items: newItems,
    markup: parseFloat(remainingMarkup.toFixed(2))
  };
};

export default function InvoiceForm({ invoice, sourceEstimate, onSubmit, onCancel, project, projects, customers, invoices }) {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
  const [showInventorySearch, setShowInventorySearch] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const inputRefs = useRef({});
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [inventoryCategories, setInventoryCategories] = useState([]);
  const [laborRoles, setLaborRoles] = useState([]);
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const [me, setMe] = useState([]);
  const [client, setClient] = useState(null);
  // Tax Exempt toggle state
  const [isTaxExemptToggle, setIsTaxExemptToggle] = useState(false);
  const userOverrideTax = useRef(false);

  const [markupData, setMarkUpData] = useState([])
  const [user] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "{}")
  );
  const allUsers = useHierarchyUsers(user);
  
  const isCrewView = userData?.role_type === "Crew View";
  const hideMarkupForCategory = (category) => {
    return ["labor", "permits", "other"].includes(category);
  };
  const getUnitPriceChangeIndicator = (item) => {
    if (!item.unit_price || item.unit_price <= 0) return null;

    if (
      item.previous_unit_price === undefined ||
      item.previous_unit_price === null ||
      item.previous_unit_price === "" ||
      isNaN(parseFloat(item.previous_unit_price))
    ) {
      return null;
    }

    const previousPrice = parseFloat(item.previous_unit_price);
    const currentPrice = parseFloat(item.unit_price) || 0;

    if (previousPrice > 0 && currentPrice !== previousPrice) {
      return currentPrice > previousPrice ? "increase" : "decrease";
    }

    return null;
  };

  const getTotalChangeIndicator = (item) => {
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const meRes = await localApi.getMe();
        setMe(meRes);

        const clientId =
          meRes.role_type === "admin"
            ? meRes.id
            : meRes.created_by;

        if (clientId) {
          const clientRes = await clientService.getClientById(clientId);
          setClient(clientRes);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);



  useEffect(() => {
    const loadPoNumber = async () => {
      try {

        let url = "/invoices/next-po-number";

        const estimateId = sourceEstimate?.id || sourceEstimate?._id;

        const projectId = project?.id || project?._id;
        if (estimateId) {
          url += `?estimate_id=${estimateId}`;
        } else if (projectId) {
          url += `?project_id=${projectId}`;
        }

        const res = await localApi.request(url);

        setFormData(prev => ({
          ...prev,
          customer_po_number:
            res.customer_po_number || ""
        }));

      } catch (err) {
        console.error(err);
      }
    };

    if (!invoice) {
      loadPoNumber();
    }
  }, [invoice, sourceEstimate?._id, sourceEstimate?.id, project?._id, project?.id]);

  let type = "markup"
  const load = useCallback(async () => {
    try {
      const res = await api.getAll(type);
      setMarkUpData(res.data)
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Could not fetch data", "error");
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredMarkupdata = markupData.filter((f =>
    f?.created_by === me?._id ||
    f?.created_by === user?.id ||
    f?.created_by === me?.created_by))

  const getProjectDisplayName = (project) => {
    return project?.project_name || "Unnamed Project";
  };

  useEffect(() => {
    const loadInventoryItems = async () => {
      try {
        const items = await InventoryItem.filter({ project_id: null });
        const filter = items.data.filter((f => f.created_by === user.id || f.created_by === me.created_by))
        setInventoryItems(filter);
      } catch (error) {
        console.error("Error loading inventory items:", error);
      }
    };
    loadInventoryItems();
  }, [user.id, me.created_by]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await masterDataService.getAll("categories");

        const userCategories = res.data.filter((cat) => {
          if (cat.created_by) {
            return cat.created_by === user.id || cat.created_by === me.created_by;
          }
          return true;
        });

        const activeCategories = userCategories
          .map((cat) => cat.value?.trim())
          .filter(Boolean);

        setInventoryCategories(userCategories);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    if (user.id) {
      loadCategories();
    }
  }, [user.id, me.created_by]);

  const calculateTotals = (items, taxRate, materialMarkupAmount = 0) => {
    const normalizedItems = items.map(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const markupPct = Number(item.markup_percentage) || 0;

      const base = qty * price;
      const markup = base * (markupPct / 100);
      const total = Number((base + markup).toFixed(2));

      return { ...item, total };
    });

    const lineItemsTotal = normalizedItems.reduce(
      (sum, item) => sum + (item.total || 0),
      0
    );

    const additionalMarkup = Number(materialMarkupAmount) || 0;

    const subtotal = Number((lineItemsTotal + additionalMarkup).toFixed(2));

    //  Only MATERIALS category should be taxed
    const taxableLineItemsTotal = normalizedItems
      .filter(i => (i.category || "").trim().toLowerCase() === "materials")
      .reduce((sum, item) => sum + (item.total || 0), 0);

    const taxableAmount = taxableLineItemsTotal;

    const tax_amount = Number((taxableAmount * (Number(taxRate) || 0)).toFixed(2));

    const total_amount = Number((subtotal + tax_amount).toFixed(2));

    return {
      line_items: normalizedItems,
      subtotal,
      material_markup_amount: additionalMarkup,
      tax_amount,
      total_amount
    }
  }

  const formatDateForInput = (dateStr) => {
    return dateStr ? new Date(dateStr).toISOString().slice(0, 10) : "";
  };
  const [formData, setFormData] = useState(() => {
    const today = new Date();
    const due_date_30_days = new Date();
    due_date_30_days.setDate(due_date_30_days.getDate() + 30);

    const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");

    const defaults = {
      invoice_number: "",
      customer_po_number: "",
      project_manager: "",
      project_location: project?.location || "",
      project_id: project?._id?.toString() || project?.id?.toString() || "",
      status: "draft",
      issue_date: formatDateForInput(new Date()),
      due_date: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      line_items: [],
      subtotal: 0,
      tax_rate: 0.075,
      material_markup: 0,
      material_markup_amount: 0,
      tax_amount: 0,
      total_amount: 0,
      amount_paid: 0,
      notes: "",
      Scope_of_work: ""
    };

    if (invoice) {
      return {
        ...defaults, ...invoice, issue_date: formatDateForInput(invoice.issue_date),
        due_date: formatDateForInput(invoice.due_date)
      };
    }

    if (sourceEstimate) {
      const lineItems = sourceEstimate.line_items ? JSON.parse(JSON.stringify(sourceEstimate.line_items)) : [];
      // Use ?? so that tax_rate=0 (Tax Exempt) is preserved — || would wrongly fallback to 0.075
      const inheritedTaxRate = sourceEstimate.tax_rate ?? 0.075;
      const totals = calculateTotals(lineItems, inheritedTaxRate, sourceEstimate.material_markup_amount || 0);
      return {
        ...defaults,
        invoice_number: "",
        issue_date: today.toISOString().slice(0, 10),
        due_date: due_date_30_days.toISOString().slice(0, 10),
        customer_po_number: "",
        project_manager: sourceEstimate.project_manager || defaults.project_manager,
        project_location: sourceEstimate.project_location || defaults.project_location,
        project_id: sourceEstimate.project_id,
        estimate_id: sourceEstimate.id,
        line_items: lineItems,
        notes: sourceEstimate.notes || '',
        Scope_of_work: sourceEstimate.Scope_of_work || '',
        amount_paid: 0,
        material_markup: sourceEstimate.material_markup || 0,
        material_markup_amount: sourceEstimate.material_markup_amount || 0,
        tax_rate: inheritedTaxRate,
        // Inherit the manual override flag from the source estimate
        tax_exempt_override: sourceEstimate.tax_exempt_override || false,
        ...totals,
      };
    }
    return defaults;
  });

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
  }, []);

  // Restore manual override state from stored invoice/sourceEstimate on load
  useEffect(() => {
    userOverrideTax.current = false;
    if (invoice?.tax_exempt_override === true) {
      // Editing an existing invoice that was manually overridden
      userOverrideTax.current = true;
      setIsTaxExemptToggle(invoice.tax_rate === 0);
    } else if (!invoice && sourceEstimate?.tax_exempt_override === true) {
      // Creating new invoice from an estimate with a manual tax override.
      // Inherit the estimate's toggle so payment settings watcher doesn't override it.
      userOverrideTax.current = true;
      setIsTaxExemptToggle(sourceEstimate.tax_rate === 0);
    }
  }, [invoice?.tax_exempt_override, invoice?.tax_rate, sourceEstimate?.tax_exempt_override, sourceEstimate?.tax_rate]);

  useEffect(() => {
    if (!paymentSettings) return;

    const defaultTax = paymentSettings.taxRate != null ? paymentSettings.taxRate : 0.075;
    const exemptList = paymentSettings.taxExemptCustomers || [];

    let isExempt = false;

    // Check the project's customer against the exempt list
    const projectToCheck = formData.project_id
      ? ((projects || []).find(p => p._id?.toString() === formData.project_id || p.id?.toString() === formData.project_id) || project)
      : project;

    if (projectToCheck && projectToCheck.customer_ids && projectToCheck.customer_ids.length > 0) {
      const customerId = projectToCheck.customer_ids[0]?._id || projectToCheck.customer_ids[0];
      isExempt = exemptList.some(id => id.toString() === customerId?.toString());
    }

    const newTax = isExempt ? 0 : defaultTax;

    // Don't auto-update if user manually overrode the toggle
    if (userOverrideTax.current) return;

    let shouldUpdateTax = false;

    if (!invoice) {
      shouldUpdateTax = true; // New invoice
    } else if (isExempt) {
      // If customer is exempt, always enforce tax=0 even on existing invoices
      shouldUpdateTax = true;
    } else if (formData.project_id !== (invoice.project_id?._id || invoice.project_id)) {
      shouldUpdateTax = true; // Changed project
    }

    // Always sync the toggle with the exempt state when no manual override is active.
    // This ensures the toggle shows correctly even when tax_rate is already 0.
    setIsTaxExemptToggle(isExempt);

    if (shouldUpdateTax && formData.tax_rate !== newTax) {
      setFormData(prev => {
        const updated = { ...prev, tax_rate: newTax };
        const totals = calculateTotals(
          updated.line_items || [],
          updated.tax_rate,
          updated.material_markup_amount
        );
        return { ...updated, ...totals };
      });
    }
  }, [formData.project_id, paymentSettings, projects, project, customers, invoice]);

  useEffect(() => {
    if (!formData.project_manager && project) {
      let pmName = project?.project_manager_name || project?.manager || "";
      if (!pmName && (project?.created_by_user || project?.created_by) && allUsers.length > 0) {
        let cid = project.created_by_user || project.created_by;
        if (typeof cid === 'object' && cid !== null) {
          cid = cid.$oid || cid._id || cid.id || cid;
        }
        const foundUser = allUsers.find(u => String(u._id || u.id) === String(cid));
        if (foundUser) {
          pmName = foundUser.full_name || foundUser.name || `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
        }
      }
      
      if (pmName) {
        setFormData(prev => ({ ...prev, project_manager: pmName }));
      }
    }
  }, [allUsers, project, formData.project_manager]);

  useEffect(() => {
    if (sourceEstimate && !invoice) {
      const { items, markup } = getRemainingData(sourceEstimate);

      setFormData(prev => {
        const updated = {
          ...prev,
          line_items: items,
          material_markup_amount: markup
        };

        const totals = calculateTotals(
          updated.line_items,
          updated.tax_rate,
          updated.material_markup_amount
        );

        return { ...updated, ...totals };
      });
    }
  }, [sourceEstimate]);
  useEffect(() => {
    let pmName = "";
    
    if (project && allUsers.length > 0) {
      let pname = project.project_manager_name || project.manager;
      if (!pname && (project.created_by_user || project.created_by)) {
        let cid = project.created_by_user || project.created_by;
        if (typeof cid === 'object' && cid !== null) {
          cid = cid.$oid || cid._id || cid.id || cid;
        }
        const foundUser = allUsers.find(u => String(u._id || u.id) === String(cid));
        if (foundUser) {
          pname = foundUser.full_name || foundUser.name || `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
        }
      }
      if (pname) {
        pmName = pname;
      }
    }

    if (pmName) {
      setFormData(prev => ({
        ...prev,
        project_manager: (!invoice && !sourceEstimate && !prev.project_manager) ? pmName : prev.project_manager
      }));
    }
  }, [project, allUsers, invoice, sourceEstimate]);

  const [invoiceType, setInvoiceType] = useState('percent');
  const [partialValue, setPartialValue] = useState('100');

  useEffect(() => {
    if (sourceEstimate && !invoice) {
      const remainingOnEst = (sourceEstimate.total_amount || 0) - (sourceEstimate.invoiced_amount || 0);
      if (remainingOnEst <= 0) {
        setInvoiceType('percent');
        setPartialValue('100');
      } else {
        setInvoiceType('remaining');
        setPartialValue('');
      }
    }
  }, [sourceEstimate, invoice]);

  const resolveStatus = (currentStatus, totalAmount, amountPaid) => {
    if (currentStatus === 'void') return 'void';
    if (totalAmount > 0 && amountPaid >= totalAmount) return 'paid';
    if (amountPaid > 0 && amountPaid < totalAmount) return 'partial';
    if (amountPaid === 0 && (currentStatus === 'paid' || currentStatus === 'partial')) return 'draft';
    return currentStatus || 'draft';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const config = user?.project_number_config || {};
    
    const total_amount = parseFloat(formData.total_amount) || 0;
    const amount_paid = parseFloat(formData.amount_paid) || 0;
    const resolvedStatus = resolveStatus(formData.status, total_amount, amount_paid);

    const submitData = {
      ...formData,
      status: resolvedStatus,
      line_items: (formData.line_items || []).map(item => {
        const selectedCategory = inventoryCategories.find(
          c => c.value === item.category
        );

        return {
          ...item,
          category_display_name:
            selectedCategory?.display_name || item.category
        };
      }),
      invoice_year: config?.new_project?.year,
      invoice_prefix: config?.new_project?.prefix || '',
      tax_rate: parseFloat(formData.tax_rate) || 0,
      material_markup: parseFloat(formData.material_markup) || 0,
      material_markup_amount: parseFloat(formData.material_markup_amount) || 0,
      total_amount: total_amount,
      amount_paid: amount_paid,
      created_by_user: user?.id || me?._id || me?.id,
      // Tell backend to respect user's manually chosen tax_rate
      tax_exempt_override: userOverrideTax.current ? true : (formData.tax_exempt_override || undefined)
    };
    onSubmit(submitData);
  };

  // Tax Exempt toggle handler
  const handleTaxExemptToggle = (checked) => {
    userOverrideTax.current = true;
    setIsTaxExemptToggle(checked);
    const defaultTax = paymentSettings?.taxRate != null ? paymentSettings.taxRate : 0.075;
    const newTaxRate = checked ? 0 : defaultTax;
    setFormData(prev => {
      const updated = { ...prev, tax_rate: newTaxRate, tax_exempt_override: true };
      const totals = calculateTotals(
        updated.line_items || [],
        updated.tax_rate,
        updated.material_markup_amount
      );
      
      const newStatus = resolveStatus(updated.status, totals.total_amount, Number(updated.amount_paid) || 0);
      return { ...updated, ...totals, status: newStatus };
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }

      if (
        field === "line_items" ||
        field === "tax_rate" ||
        field === "material_markup_amount"
      ) {
        const totals = calculateTotals(
          updated.line_items || [],
          updated.tax_rate || 0,
          updated.material_markup_amount || 0
        )

        const newStatus = resolveStatus(updated.status, totals.total_amount, Number(updated.amount_paid) || 0);
        return { ...updated, ...totals, status: newStatus }
      }

      return updated
    })
  }

  const addLineItem = (insertIndex = null) => {
    const defaultCat = inventoryCategories[0];
    
    const newItem = {
      category: defaultCat?.value || "materials",
      category_display_name: defaultCat?.display_name || "materials",
      description: "",
      quantity: 1,
      unit: "each",
      unit_price: 0,
      markup_percentage: 0,
      total: 0,
      inventory_item_id: null
    };

    const newItems = [...(formData.line_items || [])];
    if (insertIndex !== null && insertIndex !== undefined) {
      newItems.splice(insertIndex + 1, 0, newItem);
    } else {
      newItems.push(newItem);
    }

    handleInputChange('line_items', newItems);
  };

  const addSection = (insertIndex = null) => {
    const newItems = [...(formData.line_items || [])];
    const sectionItem = {
      category: "section",
      category_display_name: "Section",
      description: "",
      quantity: 0,
      unit: "",
      unit_price: 0,
      markup_percentage: 0,
      total: 0,
      inventory_item_id: null,
      is_section: true
    };

    if (insertIndex !== null && insertIndex >= 0 && insertIndex < newItems.length) {
      newItems.splice(insertIndex + 1, 0, sectionItem);
    } else {
      newItems.push(sectionItem);
    }

    handleInputChange('line_items', newItems);
  };

  const updateLineItem = (index, field, value) => {

    const newItems = [...(formData.line_items || [])];
    const currentItem = { ...newItems[index] };

    if (field === 'category') {
      currentItem.inventory_item_id = null;
      const selectedCategory = inventoryCategories.find(
        (c) => c.value === value
      );

      currentItem.category = value;
      currentItem.category_display_name =
        selectedCategory?.display_name || value;
    }

    if (field === "quantity" || field === "unit_price" || field === "markup_percentage") {
      currentItem[field] = parseFloat(value) || 0;
    } else {
      currentItem[field] = value;
      if (field === "description" && currentItem.inventory_item_id) {
        currentItem.inventory_item_id = null;
      }
    }

    const baseTotal = (currentItem.quantity || 0) * (currentItem.unit_price || 0);
    const markupAmount = baseTotal * ((currentItem.markup_percentage || 0) / 100);
    currentItem.total = baseTotal + markupAmount;

    newItems[index] = currentItem;
    handleInputChange('line_items', newItems);
  };

  const selectInventoryItem = (index, item) => {
    const newItems = [...formData.line_items];
    const currentItem = { ...newItems[index] };

    const selectedCategory = currentItem.category?.toLowerCase();
    if (selectedCategory === "labor") {
      currentItem.description = item.display_name;
      currentItem.unit = "hour";
      currentItem.unit_price = parseFloat(item.hourly_rate) || 0;
      currentItem.inventory_item_id = item._id;

      currentItem.previous_unit_price = null;

      const baseTotal = (currentItem.quantity || 0) * currentItem.unit_price;
      const markupAmount =
        baseTotal * ((currentItem.markup_percentage || 0) / 100);
      currentItem.total = baseTotal + markupAmount;

      newItems[index] = currentItem;
      handleInputChange("line_items", newItems);
      setShowInventorySearch(null);
      setInventorySearchTerm("");
      return;
    }

    const oldPrice = parseFloat(currentItem.unit_price) || 0;
    const newPrice = parseFloat(item.unit_cost) || 0;

    currentItem.description = item.item_name;
    currentItem.unit = item.unit || "each";
    currentItem.unit_price = newPrice;
    currentItem.inventory_item_id = item.id || item._id;

    if (
      item.previous_unit_cost !== undefined &&
      item.previous_unit_cost !== null &&
      !isNaN(parseFloat(item.previous_unit_cost))
    ) {
      currentItem.previous_unit_price = parseFloat(item.previous_unit_cost);
    } else if (oldPrice > 0 && oldPrice !== newPrice) {
      currentItem.previous_unit_price = oldPrice;
    } else {
      currentItem.previous_unit_price = null;
    }

    const baseTotal = (currentItem.quantity || 0) * currentItem.unit_price;
    const markupAmount =
      baseTotal * ((currentItem.markup_percentage || 0) / 100);
    currentItem.total = baseTotal + markupAmount;

    newItems[index] = currentItem;
    handleInputChange("line_items", newItems);
    setShowInventorySearch(null);
    setInventorySearchTerm("");
  };

  const removeLineItem = (index) => {
    const newItems = (formData.line_items || []).filter((_, i) => i !== index);
    handleInputChange('line_items', newItems);
  };
  useEffect(() => {
    masterDataService
      .getAll("labor_roles")
      .then((res) => {
        const active = res.data.filter((x) => x.status === "active" && (x.created_by === user.id || x.created_by === me.created_by));
        setLaborRoles(active);
      })
      .catch((err) => console.error("Failed to load labor roles:", err));
  }, [user.id, me.created_by]);

  useEffect(() => {
    // Skip if coming from estimate (already handled)
    if (sourceEstimate) return;

    if (!project || !customers?.length) return;

    const customerId =
      project.customer_ids?.[0]?._id ||
      project.customer_ids?.[0];

    if (!customerId) return;

    const customer = customers.find(
      (c) =>
        c._id?.toString() === customerId?.toString() ||
        c.id?.toString() === customerId?.toString()
    );

    if (!formData.notes && customer?.billing_information) {
      handleInputChange("notes", customer.billing_information);
    }

  }, [project, customers]);

  const currentLineItem = formData.line_items?.[showInventorySearch] || null;
  const filteredInventoryItems = (() => {
    if (!currentLineItem) return [];

    if (currentLineItem.category?.toLowerCase() === "labor") {
      return laborRoles.filter((role) =>
        role.display_name
          ?.toLowerCase()
          .includes(inventorySearchTerm.toLowerCase())
      );
    }

    return inventoryItems.filter((item) => {
      const normalize = (str) => str?.toLowerCase().trim().replace(/s$/, "");

      const lineCat = normalize(currentLineItem.category);
      const invCat = normalize(item.category);

      if (lineCat !== invCat) return false;

      const search = inventorySearchTerm.toLowerCase();
      return (
        item.item_name?.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    });
  })();

  const applyPartialInvoicing = () => {
    if (!sourceEstimate) return;

    const { items: baseItems, markup: baseMarkup } = getRemainingData(sourceEstimate);

    let ratio = 1;

    const remainingAmount =
      (sourceEstimate.total_amount || 0) -
      (sourceEstimate.invoiced_amount || 0);

    if (invoiceType === 'percent') {
      ratio = parseFloat(partialValue) / 100;
    }
    else if (invoiceType === 'fixed') {
      const targetAmount = parseFloat(partialValue);
      ratio = remainingAmount > 0 ? targetAmount / remainingAmount : 0;
    }
    else if (invoiceType === 'remaining') {
      ratio = 1;
    }

    const newItems = baseItems.map(item => {
      const newQty = (item.quantity || 0) * ratio;

      const baseTotal = newQty * (item.unit_price || 0);
      const markupAmount = baseTotal * ((item.markup_percentage || 0) / 100);

      return {
        ...item,
        quantity: newQty,
        total: baseTotal + markupAmount
      };
    });

    const newMarkup = parseFloat((baseMarkup * ratio).toFixed(2));

    setFormData(prev => {
      const updated = {
        ...prev,
        line_items: newItems,
        material_markup_amount: newMarkup
      };

      let totals = calculateTotals(
        updated.line_items,
        updated.tax_rate,
        updated.material_markup_amount
      );
      if (invoiceType === "fixed") {
        const target = parseFloat(partialValue);
        const diff = parseFloat((target - totals.total_amount).toFixed(2));

        if (Math.abs(diff) > 0) {
          const lastIndex = updated.line_items.length - 1;

          if (lastIndex >= 0) {
            updated.line_items[lastIndex].total = parseFloat(
              (updated.line_items[lastIndex].total + diff).toFixed(2)
            );
          }

          totals = calculateTotals(
            updated.line_items,
            updated.tax_rate,
            updated.material_markup_amount
          );
        }
      }

      return { ...updated, ...totals };
    });
  };

  const resetToOriginal = () => {
    if (!sourceEstimate) return;

    const { items, markup } = getRemainingData(sourceEstimate);

    setFormData(prev => {
      const updated = {
        ...prev,
        line_items: items,
        material_markup_amount: markup
      };

      let totals = calculateTotals(
        updated.line_items,
        updated.tax_rate,
        updated.material_markup_amount
      );
      if (invoiceType === "fixed") {
        const target = parseFloat(partialValue);
        const diff = parseFloat((target - totals.total_amount).toFixed(2));

        if (Math.abs(diff) > 0) {
          const lastIndex = updated.line_items.length - 1;

          if (lastIndex >= 0) {
            updated.line_items[lastIndex].total = parseFloat(
              (updated.line_items[lastIndex].total + diff).toFixed(2)
            );
          }

          totals = calculateTotals(
            updated.line_items,
            updated.tax_rate,
            updated.material_markup_amount
          );
        }
      }

      return { ...updated, ...totals };
    });
    if (invoiceType === "percent") {
      setPartialValue("");
    } else if (invoiceType === "fixed") {
      setPartialValue("");
    }
  };

  const hasInventoryForCategory = (category) => {
    if (!category) return false;
    return inventoryItems.some(
      item => item.category?.toLowerCase() === category.toLowerCase()
    );
  };

  const isMarkupAllowed = (categoryValue) => {
    const category = inventoryCategories.find(
      c => c.value === categoryValue
    );
    return category?.tax_added !== false;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {invoice ? "Edit Invoice" : "Create New Invoice"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <div className="mb-8 text-center border-b pb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {client?.companyName}
            </h1>
            <div className="text-gray-600 dark:text-gray-400 mt-2">
              {client?.address}
            </div>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={(e) => {
            if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
              e.preventDefault();
            }
          }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number || ""}
                  onChange={(e) => handleInputChange("invoice_number", e.target.value)}
                  placeholder="Auto generated"
                  required
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_po_number">Customer PO Number{!formData.customer_po_number && <span className="text-red-500"> *</span>}</Label>
                <Input
                  id="customer_po_number"
                  value={formData.customer_po_number || ""}
                  onChange={(e) => handleInputChange("customer_po_number", e.target.value)}
                  placeholder="Enter customer PO number"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_id">Project</Label>
              <Select
                value={formData.project_id || ""}
                onValueChange={async (value) => {

                  const selectedProject =
                    (projects || []).find(
                      p =>
                        p._id?.toString() === value ||
                        p.id?.toString() === value
                    ) || project;

                  let poNumber = "";

                  try {

                    const res = await localApi.request(
                      `/invoices/next-po-number?project_id=${value}`
                    );

                    poNumber = res.customer_po_number || "";

                  } catch (err) {
                    console.error(err);
                  }

                  let pmName = selectedProject?.project_manager_name || selectedProject?.manager;
                  if (!pmName && (selectedProject?.created_by_user || selectedProject?.created_by)) {
                    let cid = selectedProject.created_by_user || selectedProject.created_by;
                    if (typeof cid === 'object' && cid !== null) {
                      cid = cid.$oid || cid._id || cid.id || cid;
                    }
                    const foundUser = allUsers.find(u => String(u._id || u.id) === String(cid));
                    if (foundUser) {
                      pmName = foundUser.full_name || foundUser.name || `${foundUser.first_name || ''} ${foundUser.last_name || ''}`.trim();
                    }
                  }

                  setFormData(prev => ({
                    ...prev,
                    project_id: value,
                    customer_po_number: poNumber,
                    project_manager: pmName || "",
                    project_location:
                      selectedProject?.location || ""
                  }));

                  if (selectedProject?.customer_ids?.length > 0) {

                    const customerId =
                      selectedProject.customer_ids[0]?._id ||
                      selectedProject.customer_ids[0];

                    const customer = customers.find(
                      (c) =>
                        c._id?.toString() === customerId?.toString() ||
                        c.id?.toString() === customerId?.toString()
                    );

                    if (!formData.notes && customer?.billing_information) {
                      handleInputChange(
                        "notes",
                        customer.billing_information
                      );
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" sideOffset={4} avoidCollisions={false} portal={false} className="max-h-60 overflow-y-auto">
                  {(projects && projects.length ? projects : [project] || []).map((p, i) => (
                    <SelectItem key={p._id || p.id || i} value={(p._id || p.id)?.toString()}>
                      {getProjectDisplayName(p) || p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_manager">Project Manager</Label>
                <Input
                  id="project_manager"
                  value={formData.project_manager || ""}
                  onChange={(e) => handleInputChange("project_manager", e.target.value)}
                  placeholder="Enter project manager name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_location">Site Address{!formData.project_location && <span className="text-red-500"> *</span>}</Label>
                <Input
                  id="project_location"
                  value={formData.project_location || ""}
                  onChange={(e) => handleInputChange("project_location", e.target.value)}
                  placeholder="Project location"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status || "draft"}
                  onValueChange={(value) => handleInputChange("status", value)}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="void">Void</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issue_date">Issue Date</Label>
                  <CustomDatePicker
                    id="issue_date"
                    value={formData.issue_date || ""}
                    minDate={new Date().toISOString().split("T")[0]}
                    onChange={(value) => handleInputChange("issue_date", value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <CustomDatePicker
                    id="due_date"
                    value={formData.due_date || ""}
                    minDate={new Date().toISOString().split("T")[0]}
                    onChange={(value) => handleInputChange("due_date", value)}
                    required
                  />
                </div>
              </div>
            </div>

            {sourceEstimate && (
              <div className="p-4 bg-blue-50 rounded-lg dark:bg-gray-900">
                <h3 className="font-semibold mb-3">Partial Invoicing Options</h3>
                <div className="space-y-4">
                  <RadioGroup value={invoiceType} onValueChange={(value) => {
                    setInvoiceType(value);
                    if (value === "percent") {
                      setPartialValue("");
                    } else if (value === "fixed") {
                      setPartialValue("");
                    } else if (value === "remaining") {
                      setPartialValue("");
                    }
                  }}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="percent" id="percent" />
                      <Label htmlFor="percent">Invoice by percentage</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed" id="fixed" />
                      <Label htmlFor="fixed">Invoice fixed amount</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="remaining" id="remaining" />
                      <Label htmlFor="remaining">Invoice remaining amount</Label>
                    </div>
                  </RadioGroup>

                  <div className="flex items-center gap-2">
                    {invoiceType === 'percent' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={partialValue}
                          onChange={(e) => {
                            let value = e.target.value;

                            // Convert to number
                            let num = Number(value);

                            // Prevent negative
                            if (num < 0) num = 0;

                            // Prevent above 100
                            if (num > 100) num = 100;

                            setPartialValue(num);
                          }}
                          className="w-20"
                        />
                        <span>%</span>
                      </div>
                    )}
                    {invoiceType === 'fixed' && (
                      <div className="flex items-center gap-2">
                        <span>$</span>
                        <Input
                          type="number"
                          min="0"
                          max={(sourceEstimate.total_amount || 0) - (sourceEstimate.invoiced_amount || 0)}
                          step="0.01"
                          value={partialValue}
                          onChange={(e) => {
                            let value = parseFloat(e.target.value) || 0;

                            const remaining =
                              (sourceEstimate.total_amount || 0) -
                              (sourceEstimate.invoiced_amount || 0);

                            if (value > remaining) value = remaining;

                            setPartialValue(value);
                          }}
                          className="w-20"
                        />
                      </div>
                    )}
                    {invoiceType === 'remaining' && (
                      <span className="text-sm text-gray-600temp">
                        Remaining: {formatCurrency((sourceEstimate.total_amount || 0) - (sourceEstimate.invoiced_amount || 0))}
                      </span>
                    )}
                    <Button type="button" onClick={applyPartialInvoicing} variant="outline" className="p-2 sm:p-3 md:p-4">
                      Apply
                    </Button>
                    <Button type="button" onClick={resetToOriginal} variant="outline" className="p-2 sm:p-3 md:p-4">
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { addSection(selectedRowIndex); setSelectedRowIndex(null); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { addLineItem(selectedRowIndex); setSelectedRowIndex(null); }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="overflow-hidden">
                <Table className='responsiveTable2 '>
                  <Thead>
                    <Tr className="text-left border-b border-gray-200">
                      <Th className='font-medium text-muted-foreground text-sm'>Category</Th>
                      <Th className='font-medium text-muted-foreground text-sm'>Description</Th>
                      <Th className='font-medium text-muted-foreground text-sm'>Qty</Th>
                      <Th className='font-medium text-muted-foreground text-sm'>Unit</Th>
                      {!isCrewView && <Th className='font-medium text-muted-foreground text-sm'>Unit Price</Th>}
                      {!isCrewView &&
                        formData.line_items.some(
                          (item) => !hideMarkupForCategory(item.category)
                        ) && <Th className='font-medium text-muted-foreground text-sm'>Mark Up %</Th>}
                      {!isCrewView && <Th className='font-medium text-muted-foreground text-sm'>Total</Th>}
                      <Th className="w-12"></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {formData.line_items.map((item, index) => {
                      const priceChange = getUnitPriceChangeIndicator(item);
                      const totalChange = getTotalChangeIndicator(item);
                      const isAllowed = isMarkupAllowed(item.category);
                      const isLowMarkup =
                        (parseFloat(item.markup_percentage)) > 0 &&
                        (parseFloat(item.markup_percentage)) < (filteredMarkupdata?.[0]?.markup_line_item);

                      const isSelected = selectedRowIndex === index;
                      const rowClass = `border-b border-gray-200 dark:border-gray-700 ${isSelected ? "" : (item.isNew ? "bg-yellow-100 dark:bg-yellow-900/30" : (index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-slate-800 md:dark:bg-slate-800" : "bg-white dark:bg-slate-800"))}`;

                      if (item.is_section) {
                          return (
                              <Tr key={index} className={`border-b border-gray-200 dark:border-gray-700 ${isSelected ? "" : "bg-white dark:bg-slate-800"}`} onClick={() => setSelectedRowIndex(selectedRowIndex === index ? null : index)}>
                                  <Td colSpan={!isCrewView ? (formData.line_items.some(i => !hideMarkupForCategory(i.category)) ? "7" : "6") : "4"} className="px-4 py-3 text-left font-semibold">
                                      <Input
                                          value={item.description}
                                          onChange={e => updateLineItem(index, "description", e.target.value)}
                                          placeholder="Section Title"
                                          className="w-full font-semibold text-md text-left focus:ring-1 focus:ring-blue-500"
                                      />
                                  </Td>
                                  <Td>
                                      <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          onClick={(e) => { e.stopPropagation(); removeLineItem(index); }}
                                      >
                                          <Trash className="w-4 h-4 text-red-500" />
                                      </Button>
                                  </Td>
                              </Tr>
                          );
                      }

                      return (
                        <Tr
                          key={index}
                          className={rowClass}
                          onClick={() => setSelectedRowIndex(selectedRowIndex === index ? null : index)}
                        >
                          <Td className="text-sm py-3 px-2">
                            <Select
                              value={item.category || ""}
                              onValueChange={(value) =>
                                updateLineItem(index, "category", value)
                              }
                            >
                              <SelectTrigger className="md:w-32">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {inventoryCategories.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Td>
                          <Td className="text-sm py-3 px-2">
                            <div className="relative">
                              <div className="flex items-center gap-2">
                                <Textarea
                                  ref={(el) => (inputRefs.current[index] = el)}
                                  value={item.description}
                                  onChange={(e) =>
                                    updateLineItem(
                                      index,
                                      "description",
                                      e.target.value
                                    )
                                  }
                                  onFocus={() => setShowInventorySearch(null)}
                                  placeholder="Description"
                                  className="w-full line-item-textarea resize-none"
                                  required
                                />

                                {(item.category?.toLowerCase() === "labor" || hasInventoryForCategory(item.category)) && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setShowInventorySearch(showInventorySearch === index ? null : index)
                                    }
                                    title="Search inventory"
                                  >
                                    <Search className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>

                              {showInventorySearch === index &&
                                createPortal(
                                  <div
                                    className="fixed z-50 bg-white border border-gray-300 dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col w-[90%] sm:w-[400px]"
                                    style={{
                                      top: "50%",
                                      left: "50%",
                                      transform: "translate(-50%, -50%)",
                                      maxHeight: "320px",
                                    }}
                                  >
                                    <div className="p-2 border-b bg-gray50-temp dark:bg-gray-900">
                                      <Input
                                        placeholder="Search inventory items..."
                                        value={inventorySearchTerm}
                                        onChange={(e) =>
                                          setInventorySearchTerm(e.target.value)
                                        }
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto no-scrollbar">
                                      {filteredInventoryItems.length > 0 ? (
                                        filteredInventoryItems.map(
                                          (inventoryItem) => {
                                            return (
                                              <div
                                                key={inventoryItem._id}
                                                className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 dark:text-white hover:dark:bg-gray-900"
                                                onClick={() =>
                                                  selectInventoryItem(
                                                    index,
                                                    inventoryItem
                                                  )
                                                }
                                              >
                                                {currentLineItem?.category?.toLowerCase() ===
                                                  "labor" ? (
                                                  <>
                                                    <div className="font-medium">
                                                      {inventoryItem.display_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500temp dark:text-white">
                                                      Rate: {formatCurrency(inventoryItem.hourly_rate)}
                                                    </div>
                                                  </>
                                                ) : (
                                                  <>
                                                    <div className="font-medium">
                                                      {inventoryItem.item_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500temp dark:text-white">
                                                      {inventoryItem.description && (
                                                        <span>
                                                          {
                                                            inventoryItem.description
                                                          }{" "}
                                                          •{" "}
                                                        </span>
                                                      )}
                                                      <span>
                                                        Qty:{" "}
                                                        {inventoryItem.quantity}{" "}
                                                        {inventoryItem.unit}
                                                      </span>
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            )
                                          }
                                        )
                                      ) : (
                                        <div className="p-2 text-center text-sm text-gray-500temp ">
                                          No items found
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-2 border-t bg-gray50-temp dark:bg-gray-900">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setShowInventorySearch(null);
                                          setInventorySearchTerm("");
                                        }}
                                        className="w-full"
                                      >
                                        Close
                                      </Button>
                                    </div>
                                  </div>,
                                  document.body
                                )}
                            </div>
                          </Td>
                          <Td className="text-sm py-3 px-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity.toFixed(2)}
                              onChange={(e) =>
                                updateLineItem(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className="md:w-20"
                              disabled={item.category === "labor"}
                              required
                            />
                          </Td>
                          <Td className="text-sm py-3 px-2">
                            <Input
                              min="0"
                              // step="1"
                              value={item.unit}
                              onChange={(e) =>
                                updateLineItem(index, "unit", e.target.value)
                              }
                              placeholder="Unit"
                              className="md:w-20"
                              disabled={item.category === "labor"}
                              required
                            />
                          </Td>

                          {!isCrewView && (
                            <Td className="text-sm py-3 px-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) =>
                                    updateLineItem(
                                      index,
                                      "unit_price",
                                      e.target.value
                                    )
                                  }
                                  className="md:w-24"
                                  required
                                />
                                {priceChange === "increase" && (
                                  <ArrowUp
                                    className="w-4 h-4 text-green-600 flex-shrink-0"
                                    title={`Previous: ${parseFloat(
                                      item.previous_unit_price ||
                                      getInventoryItemPrice(
                                        item.inventory_item_id
                                      ) ||
                                      0
                                    ).toFixed(2)}`}
                                  />
                                )}
                                {priceChange === "decrease" && (
                                  <ArrowDown
                                    className="w-4 h-4 text-red-600 flex-shrink-0"
                                    title={`Previous: ${parseFloat(
                                      item.previous_unit_price ||
                                      getInventoryItemPrice(
                                        item.inventory_item_id
                                      ) ||
                                      0
                                    ).toFixed(2)}`}
                                  />
                                )}
                              </div>
                            </Td>
                          )}

                          {!isCrewView && (
                            <Td className="text-sm py-3 px-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={isAllowed ? item.markup_percentage : 0}
                                  onChange={(e) =>
                                    updateLineItem(
                                      index,
                                      "markup_percentage",
                                      e.target.value
                                    )
                                  }
                                  onWheel={(e) => e.target.blur()}
                                  className={`md:w-20 ${isLowMarkup && item.category !== "labor"
                                    ? "border-yellow-500 bg-yellow-50"
                                    : ""
                                    }`}
                                  placeholder="0"
                                  disabled={!isAllowed}
                                />
                                {isLowMarkup && item.category !== "labor" && (
                                  <AlertCircle
                                    className="w-4 h-4 text-yellow-600"
                                    title="Markup below 20%"
                                  />
                                )}
                              </div>
                            </Td>
                          )}

                          {!isCrewView && (
                            <Td className="text-sm py-3 px-2">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">
                                  {formatCurrency(item.total)}
                                </span>
                                {totalChange === "increase" && (
                                  <ArrowUp className="w-4 h-4 text-green-600 flex-shrink-0" />
                                )}
                                {totalChange === "decrease" && (
                                  <ArrowDown className="w-4 h-4 text-red-600 flex-shrink-0" />
                                )}
                              </div>
                            </Td>
                          )}
                          {!isCrewView && (
                            <Td className="text-sm py-3 px-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeLineItem(index)}
                              >
                                <Trash className="w-4 h-4 text-red-500" />
                              </Button>
                            </Td>
                          )}
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Row 1: Notes (left) & Tax Fields (right) */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <SunEditor
                  setContents={linkifyHtml(formData.notes || "")}
                  onChange={(content) => handleInputChange("notes", content)}
                  onClick={(e) => {
                    const target = e.target.closest('a');
                    if (target && target.href) {
                      window.open(target.href, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  onPaste={handlePasteLink}
                  setOptions={{
                    buttonList: [
                      ["undo", "redo", "bold", "underline", "italic", "strike", "link"]
                    ],
                    defaultTag: "div",
                    height: "100px",
                    resizingBar: false,
                    showPathLabel: false
                  }}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Tax Rate</Label>
                    {!isCrewView && (
                      <div className="flex items-center gap-2">
                        <Switch
                          id="invoice-tax-exempt-toggle"
                          checked={isTaxExemptToggle}
                          onCheckedChange={handleTaxExemptToggle}
                        />
                        <label
                          htmlFor="invoice-tax-exempt-toggle"
                          className={`text-sm font-medium cursor-pointer select-none transition-colors ${
                            isTaxExemptToggle
                              ? "text-green-600 dark:text-green-400"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {isTaxExemptToggle ? "Tax Exempt" : "Taxable"}
                        </label>
                      </div>
                    )}
                  </div>
                  <Input
                    id="tax_rate"
                    type="number"
                    min="0"
                    max="1"
                    step="0.001"
                    value={formData.tax_rate !== undefined && formData.tax_rate !== null ? formData.tax_rate : 0.075}
                    disabled={true}
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material_markup_amount">
                    {filteredMarkupdata?.[0]?.value ?? "Additional Tax"}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="material_markup_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      className="pl-8"
                      value={formData.material_markup_amount || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "material_markup_amount",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="Enter markup amount"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Scope of Work (left) & Summary Card (right) */}
              <div className="space-y-2">
                <Label htmlFor="Scope_of_work">
                  Scope of Work
                  {!formData.Scope_of_work && (
                    <span className="text-red-500"> *</span>
                  )}
                </Label>
                <SunEditor
                  setContents={formData.Scope_of_work || ""}
                  onChange={(content) => handleInputChange("Scope_of_work", content)}
                  onClick={(e) => {
                    const target = e.target.closest('a');
                    if (target && target.href) {
                      window.open(target.href, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  onPaste={handlePasteLink}
                  setOptions={{
                    buttonList: [
                      ["undo", "redo", "bold", "underline", "italic", "strike", "link"]
                    ],
                    defaultTag: "div",
                    height: "100px",
                    resizingBar: false,
                    showPathLabel: false
                  }}
                />
              </div>

              <div className="p-4 rounded-lg space-y-2 border bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between">
                  <span>{filteredMarkupdata?.[0]?.value ?? "Additional Tax"}</span>
                  <span>{formatCurrency(formData.material_markup_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(formData.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({((formData.tax_rate || 0) * 100).toFixed(1)}%)</span>
                  <span>{formatCurrency(formData.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-1">
                  <span>Total</span>
                  <span>{formatCurrency(formData.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                {invoice ? "Update Invoice" : "Create Invoice"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}