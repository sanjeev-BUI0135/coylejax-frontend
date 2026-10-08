import React, { useState, useEffect } from "react";
import { Customer, Estimate } from "@/api/entities";
import { Project } from "@/api/entities";
import { Payment, Invoice } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  DollarSign,
  TrendingDown,
  XCircle,
  Zap,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import EstimateForm from "@/components/estimates/EstimateForm";
import TablePageSkeleton from "../components/ui/tableskeleton";
import Swal from "sweetalert2";
import localApi from "@/services/localApi";
import { buildPermissionMap } from "../utils/buildPermissionMap";
import { renderTextWithLinks, linkifyHtml, handlePasteLink } from "../components/ui/renderTextWithLinks";
import { formatDateUTC } from "../utils/formatdate";
import masterDataService from "../services/masterDataService";
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";

const statusConfig = {
  open: { label: "Open", color: "bg-blue-100 text-blue-800" },
  bid_submitted: { label: "Bid Submitted", color: "bg-yellow-100 text-yellow-800" },
  awarded: { label: "Awarded", color: "bg-green-100 text-green-800" },
  processing: { label: "Processing", color: "bg-orange-100 text-orange-800" },
  actively_working: { label: "Actively Working", color: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Lost", color: "bg-gray-200 text-gray-800" },
};

const stripHtml = (html) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

export default function CustomerDetails() {
  const [customer, setCustomer] = useState(null);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [showEstimateForm, setShowEstimateForm] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [filteredEstimates, setFilteredEstimates] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [divisions, setDivisions] = useState([]);

  const [stats, setStats] = useState({
    totalProjects: 0,
    awardedProjects: 0,
    completedProjects: 0,
    lostProjects: 0,
    completedRevenue: 0,
    missedRevenue: 0,
  });

  const { id: paramId } = useParams();
  const queryId = new URLSearchParams(window.location.search).get("id");
  const customerId = paramId || queryId;

  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  const loadCustomerData = async () => {
    setLoading(true);
    try {
      const [
        customerData,
        projectsResponse,
        allPayments,
        invoicesRes,
        customersRes,
        estimatesRes,
        divisionsRes
      ] = await Promise.all([
        Customer.get(customerId),
        localApi.projects.getDashboardProjects(),
        Payment.list(),
        Invoice.list({ limit: 0 }),
        Customer.list(),
        Estimate.list({ limit: 0 }),
        masterDataService.getAll("divisions")
      ]);

      setCustomer(customerData);
      setNotes(customerData.billing_information || "");

      const allProjects = Array.isArray(projectsResponse)
        ? projectsResponse
        : projectsResponse.data || [];

      const customerProjects = allProjects.filter(
        (project) =>
          project.customer_ids &&
          project.customer_ids.some((c) => c._id === customerId)
      );

      setFilteredProjects(customerProjects);

      const completedProjects = customerProjects.filter(
        (p) => p.status === "completed"
      );
      const completedProjectIds = completedProjects.map((p) => p.id);

      const completedRevenue = allPayments
        .filter(
          (p) =>
            completedProjectIds.includes(p.project_id) &&
            p.status === "received"
        )
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const lostProjects = customerProjects.filter(
        (p) => p.status === "lost"
      );
      const missedRevenue = lostProjects.reduce(
        (sum, p) => sum + (p.estimated_value || 0),
        0
      );

      // Fetch and filter invoices for this customer's projects
      const allInvoices = Array.isArray(invoicesRes) ? invoicesRes : (invoicesRes.data || []);
      const projectIds = customerProjects.map(p => p.id || p._id);
      const customerInvoices = allInvoices.filter(inv => projectIds.includes(inv.project_id));
      setFilteredInvoices(customerInvoices);

      setStats({
        totalProjects: customerProjects.length,
        awardedProjects: customerProjects.filter((p) =>
          ["awarded", "processing", "completed"].includes(p.status)
        ).length,
        completedProjects: completedProjects.length,
        lostProjects: lostProjects.length,
        completedRevenue,
        missedRevenue,
      });

      setProjects(
        allProjects.filter(p => p.status !== 'inactive' && p.is_inactive !== true)
      );
      setCustomers(
        Array.isArray(customersRes) ? customersRes : customersRes.data || []
      );
      setEstimates(
        Array.isArray(estimatesRes) ? estimatesRes : estimatesRes.data || []
      );

      const currentUser = JSON.parse(localStorage.getItem("user"));
      const isAdmin = currentUser?.role_type === "admin";
      const companyId = isAdmin
        ? currentUser?._id || currentUser?.id
        : currentUser?.created_by;

      const list = Array.isArray(divisionsRes) ? divisionsRes : divisionsRes?.data || [];
      const filteredDivisions = list
        .filter(d => {
          if (d.status !== "active") return false;
          return String(d.created_by) === String(companyId);
        })
        .map(d => ({
          label: d.display_name,
          value: d.value
        }));

      setDivisions(filteredDivisions);

    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    if (!customer || estimates.length === 0) return;

    const customerEstimates = estimates.filter((est) => {

      if (typeof est.project_id === "string" && est.project_id !== "") {

        const project = projects.find(
          (p) =>
            p._id?.toString() === est.project_id.toString() ||
            p.id?.toString() === est.project_id.toString()
        );

        if (project?.customer_ids?.length > 0) {
          return project.customer_ids.some(
            (c) =>
              c._id?.toString() === customer._id?.toString() ||
              c.toString() === customer._id?.toString()
          );
        }
      }

      if (typeof est.project_id === "object" && est.project_id?.customer_ids) {
        return est.project_id.customer_ids.some(
          (c) =>
            c._id?.toString() === customer._id?.toString() ||
            c.toString() === customer._id?.toString()
        );
      }

      if (est.is_quick_estimate && est.quick_customer?.email_address) {
        return (
          est.quick_customer.email_address.toLowerCase() ===
          customer.email?.toLowerCase()
        );
      }

      return false;
    });

    setFilteredEstimates(customerEstimates);

  }, [estimates, customer, projects]);

  const onEstimateSubmit = async (formData) => {
    try {
      if (editingEstimate) {
        await Estimate.update(editingEstimate._id || editingEstimate.id, formData);
        Swal.fire("Success", "Estimate updated successfully", "success");
      } else {
        if (formData.is_quick_estimate) {
          await localApi.request("/estimates/quick", {
            method: "POST",
            body: JSON.stringify(formData),
          });
        } else {
          await Estimate.create(formData);
        }
        Swal.fire("Success", "Estimate created successfully", "success");
      }

      setShowEstimateForm(false);
      setEditingEstimate(null);
      loadCustomerData();
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
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);

      await Customer.update(customer._id || customer.id, {
        billing_information: notes,
      });

      Swal.fire("Success", "Notes updated successfully", "success");

      setCustomer((prev) => ({
        ...prev,
        billing_information: notes,
      }));
      setIsEditingNotes(false);
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Failed to update notes", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) return <TablePageSkeleton />;
  if (!customer) return <div className="p-6">Customer not found</div>;

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canview = buildPermissionMap(user.permissions, "Projects");

  return (
    <div>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Button variant="ghost" asChild className="mb-2">
            <Link
              to={createPageUrl("Customers")}
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Contacts
            </Link>
          </Button>

          <h1 className="text-xl md:text-3xl font-bold">{customer.company_name}</h1>
          <p className="text-gray-500">{customer.contact_name}</p>
        </div>

        {canview?.widgets?.Estimates?.add && <Button
          className="bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setShowEstimateForm(true)}
        >
          New Estimate
        </Button>}
      </div>

      {/* Stats Cards (unchanged) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Building2} title="Total Projects" value={stats.totalProjects} />
        <StatCard icon={Zap} title="Awarded" value={stats.awardedProjects} />
        <StatCard icon={CheckCircle} title="Completed" value={stats.completedProjects} />
        <StatCard icon={DollarSign} title="Completed Revenue" value={`$${stats.completedRevenue.toLocaleString()}`} />
        <StatCard icon={XCircle} title="Lost Projects" value={stats.lostProjects} />
        <StatCard icon={TrendingDown} title="Missed Revenue" value={`$${stats.missedRevenue.toLocaleString()}`} />
      </div>

      {/* Tabs */}
      <div className="bg-gray-100 rounded-lg p-1 mb-6 flex gap-2 overflow-x-auto whitespace-nowrap md:dark:bg-[#1f2937]">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${activeTab === "info" ? "bg-white shadow dark:bg-black" : "text-gray-600"
            }`}
        >
          Contact Info
        </button>

        <button
          onClick={() => setActiveTab("projects")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${activeTab === "projects" ? "bg-white shadow dark:bg-black" : "text-gray-600"
            }`}
        >
          Projects ({filteredProjects.length})
        </button>
        <button
          onClick={() => setActiveTab("estimates")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${activeTab === "estimates" ? "bg-white shadow dark:bg-black" : "text-gray-600"
            }`}
        >
          Estimates ({filteredEstimates.length})
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium ${activeTab === "invoices" ? "bg-white shadow dark:bg-black" : "text-gray-600"
            }`}
        >
          Invoices ({filteredInvoices.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 text-sm">

              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-gray-500">Company</p>
                  <p className="font-semibold">{customer.company_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-gray-500">Contact Person</p>
                  <p className="font-semibold">{customer.contact_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-semibold">{customer.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-semibold">{customer.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-gray-500">Address</p>
                  <p className="font-semibold">
                    {customer.address}{customer.city ? `, ${customer.city}` : ""}{customer.state ? `, ${customer.state}` : ""}{customer.zip_code ? ` ${customer.zip_code}` : ""}
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>


          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6 text-sm">

              <div>
                <p className="text-gray-500 mb-2">Contact Type</p>
                <Badge className="bg-green-100 text-green-800 capitalize">
                  {customer.customer_type || "N/A"}
                </Badge>
              </div>

              <div>
                <p className="text-gray-500 mb-2">Division</p>
                <p className="font-semibold">
                  {divisions.find(d => d.value === customer.division)?.label || "N/A"}
                </p>
              </div>

              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-500">Notes</p>

                  {!isEditingNotes ? (
                    <Button
                      size="sm"
                      onClick={() => setIsEditingNotes(true)}
                      className="bg-gray-200 hover:bg-gray-300 text-black"
                    >
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {savingNotes ? "Saving..." : "Save"}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingNotes(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-2 mt-2">
                  {!isEditingNotes ? (
                    notes ? (
                      <div 
                        className="p-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-md text-sm min-h-[80px] prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                        dangerouslySetInnerHTML={{ __html: linkifyHtml(notes) }}
                      />
                    ) : (
                      <div className="p-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-900 rounded-md text-sm min-h-[80px] text-gray-400">
                        No notes added
                      </div>
                    )
                  ) : (
                    <SunEditor
                      setContents={linkifyHtml(notes || "")}
                      onChange={(content) => setNotes(content)}
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
                        height: "120px",
                        resizingBar: false,
                        showPathLabel: false
                      }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {activeTab === "projects" && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredProjects.map((project) => (
                <Link key={project.id || project._id} to={(project.is_inactive || project.status === 'lost' || project.status === 'completed') ? `/inactive-projects/${project.id || project._id}` : `/projects/${project.id || project._id}`}>
                  <div className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition mb-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">
                          { project?.project_name }
                        </h4>

                        <div className="flex gap-4 text-sm text-gray-500 mt-2">
                          <span>
                            {formatDateUTC(
                              project.created_date || project.createdAt
                            )}
                          </span>

                          {project.estimated_value && (
                            <span>
                              ${project.estimated_value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <Badge
                        className={`${statusConfig[project.status]?.color}  px-2 py-0.5 text-xs rounded-md capitalize`}>
                        {statusConfig[project.status]?.label}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "estimates" && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Estimates</CardTitle>
          </CardHeader>

          <CardContent >
            <div className="space-y-4">

              {filteredEstimates.length === 0 && (
                <p className="text-center text-gray-500 py-6">
                  No estimates found for this customer.
                </p>
              )}

              {filteredEstimates.map((estimate) => (
                <Link key={estimate._id} to={`/estimate/${estimate._id}`}>
                  <div className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition mb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {estimate.estimate_number}
                        </h4>

                        <div className="flex gap-4 text-sm text-gray-500 mt-2">
                          <span>
                            {formatDateUTC(estimate.createdAt)}
                          </span>

                          <span>
                            ${estimate.total_amount?.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 capitalize">
                        {estimate.status}
                      </Badge>

                    </div>
                  </div>
                </Link>
              ))}

            </div>

          </CardContent>
        </Card>
      )}

      {activeTab === "invoices" && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredInvoices.length === 0 && (
                <p className="text-center text-gray-500 py-6">
                  No invoices found for this customer.
                </p>
              )}

              {filteredInvoices.map((invoice) => {
                const project = filteredProjects.find(p => (p.id || p._id) === invoice.project_id);
                return (
                  <Link key={invoice._id || invoice.id} to={`/invoices/${invoice.id || invoice._id}`}>
                    <div className="border dark:border-gray-700 rounded-xl p-6 hover:shadow-md dark:hover:bg-slate-800 transition-all mb-4 bg-white dark:bg-slate-900">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h4 className="font-bold text-xl text-blue-600 dark:text-blue-400">
                            Invoice #{invoice.invoice_number}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-300 font-medium">
                            {[customer?.company_name, project?.project_name, customer?.contact_name]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {formatDateUTC(invoice.issue_date || invoice.createdAt)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={`
                            ${invoice.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              invoice.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                invoice.status === 'overdue' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'} 
                            px-3 py-1 rounded-full text-sm font-medium capitalize border-none shadow-none`}>
                            {invoice.status}
                          </Badge>
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            ${(invoice.total_amount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {/* Estimate Form Modal */}
      {showEstimateForm && (
        <EstimateForm
          estimate={editingEstimate}
          projects={projects}
          customers={customers}
          estimates={estimates}
          initialCustomer={customer}
          onSubmit={onEstimateSubmit}
          onCancel={() => setShowEstimateForm(false)}
        />
      )}
    </div>
  );
}

const StatCard = ({ icon: Icon, title, value }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <Icon className="w-6 h-6 text-blue-500" />
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);