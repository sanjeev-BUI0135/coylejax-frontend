import React from "react";
import { format } from "date-fns";
import { FileText, User, Briefcase, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateUTC } from "../../utils/formatdate";
import { formatProjectName } from "@/lib/utils";

export default function InvoiceDetailView({ invoice, project, customer }) {

  const displayName = formatProjectName(project, customer);
  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6">

      <div className="bg-white rounded-xl shadow border p-6  dark:bg-[#1f2937]">
        <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">
          Invoice Information
        </h3>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-500">Invoice Number</p>
            <p className="text-lg font-semibold">
              {invoice?.invoice_number}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Issue Date</p>
            <p className="text-lg font-semibold">
              {invoice?.issue_date
                ? formatDateUTC(invoice.issue_date)
                : "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Due Date</p>
            <p className="text-lg font-semibold">
              {invoice?.due_date
                ? formatDateUTC(invoice.due_date)
                : "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Project Manager</p>
            <p className="text-lg font-semibold">
              {invoice?.project_manager || project?.project_manager_name || "-"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border p-6  dark:bg-[#1f2937]">
        <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-white">
          Contact & Project Information
        </h3>

        <div className="space-y-6">

          <div className="flex gap-3 items-start">
            <FileText className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Company Name</p>
              <p className="text-lg font-semibold">
                {customer?.company_name}
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <User className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="text-lg font-semibold">
                {customer?.contact_name || "-"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <Briefcase className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Project Name</p>
              <p className="text-lg font-semibold text-blue-600">
                <Link
                  to={`/projects/${project?._id || project?.id}`}
                  className="hover:underline"
                >
                 {displayName || project?.project_name || "-"}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <MapPin className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm text-gray-500">Billing Address</p>
              <p className="text-lg font-semibold">
                {customer?.address
                  ? `${customer.address} ${customer.city || ""} ${customer.state || ""
                  } ${customer.zip_code || ""}`
                  : "-"}
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
