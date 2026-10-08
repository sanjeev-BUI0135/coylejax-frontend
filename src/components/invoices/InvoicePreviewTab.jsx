import React from "react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import Bill from "@/assets/images/bill-to.png";
import Ship from "@/assets/images/ship-to.png";
import formatUSPhone from "@/utils/common/formatUSPhone.js";

export default function InvoicePreviewTab({ invoice, project, customer, user, me, markupData }) {
  if (!invoice) return null;

  const amountPaid = Number(Number(invoice.amount_paid || 0).toFixed(2));
  const balanceDue = Number(Math.max(0, (invoice.total_amount || 0) - amountPaid).toFixed(2));
  const additionalMarkupAmount = (invoice.material_markup_amount || 0);

  const capitalizeFirst = (value = "") =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

  const formatDivisionName = (val) => {
    if (!val) return 'N/A';
    return val
        .replace(/_/g, ' ')
        .replace(/client(\d+)/gi, 'Client $1')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  };

  const displayName = [project?.project_name].filter(Boolean).join(" - ");

  // user is clientData (the company/tenant)
  // me is the current logged-in user

  return (
    <div className="bg-white dark:bg-slate-900 dark:text-gray-200 shadow-md rounded-lg overflow-hidden border dark:border-gray-700">
      <div className="w-full bg-[#0c54aa] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-white rounded-lg p-2 w-auto">
          <img
            src={user?.logo ? `${import.meta.env.VITE_IMG}${user.logo}` : '/default-logo.png'}
            alt="Logo"
            className="h-12 w-auto"
          />
        </div>
        <div className="bg-white dark:bg-slate-800 text-[#195daf] dark:text-blue-400 rounded-lg px-4 py-2 shadow-md text-center w-auto">
          <p className="text-sm">Invoice Amount</p>
          <p className="text-xl font-bold">
            {formatCurrency(invoice.total_amount)}
          </p>
        </div>
        <div className="text-white w-full sm:w-auto md:text-right sm:text-right">
          <p className="text-xl font-semibold">Invoice</p>
          <p className="text-sm break-all">
            Invoice Number:{" "}
            <span className="font-bold">{invoice.invoice_number}</span>
          </p>
          <p className="text-sm">
            Date:{" "}
            <span className="font-bold">
              {invoice.issue_date ? format(new Date(invoice.issue_date), "MM/dd/yyyy") : "N/A"}
            </span>
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 pb-4">
        <div>
          <img src={Bill} alt="Bill To" className="md:me-0 mb-2 w-16 h-16 object-contain mb-4" />
          <h3 className="text-lg font-bold text-[#0c54aa] dark:text-blue-400">Project Information</h3>
          <p><span>Project Name:</span> <b>{displayName || 'N/A'}</b></p>
          <p><span>Company Name:</span> <b>{customer?.company_name || 'N/A'}</b></p>
          <p><span>Contact Name:</span> <b>{customer?.contact_name || 'N/A'}</b></p>
          <p><span>Company Email:</span> <b>{customer?.email || 'N/A'}</b></p>
          <p><span>Company Phone Number:</span> <b>{customer?.phone || 'N/A'}</b></p>
          <p><span>Project Address:</span> <b>{project?.location || 'N/A'}</b></p>
        </div>
        <div className="md:text-right">
          <img src={Ship} alt="Ship To" className="md:mx-auto md:me-0 mb-2 w-16 h-16 object-contain mb-4" />
          <h3 className="text-lg font-bold text-[#0c54aa] dark:text-blue-400">From </h3>
          <p>Client Name: <span><b>{user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'N/A'}</b></span></p>
          <p>Address: <span><b>{user?.address || 'N/A'}</b></span></p>
          <p>Phone: <span><b>{formatUSPhone(user?.companyPhone) || 'N/A'}</b></span></p>
          <p>
            <span>Created By:</span>{" "}
            <b>
              {me?.full_name ||
                [me?.firstName, me?.lastName]
                  .filter(Boolean)
                  .join(" ") ||
                "N/A"}
            </b>
          </p>
          <p><span>Email:</span>{" "}<span><b>{me?.email || 'N/A'}</b></span></p>
          <p><span>Division:</span>{" "}<span><b>{invoice?.divisionDisplayName || formatDivisionName(project?.project_type || 'N/A')}</b></span></p>
        </div>
      </div>

      <div className="px-6">
        <h3 className="text-lg font-bold text-[#0c54aa] dark:text-blue-400 mb-4">Line Items</h3>
        <table className="w-full border border-gray-300 dark:border-gray-600 text-sm ">
          <thead className="bg-[#0c54aa] text-white">
            <tr>
              <th className="border dark:border-gray-600 p-2 text-left">Category</th>
              <th className="border dark:border-gray-600 p-2 text-left">Description</th>
              <th className="border dark:border-gray-600 p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice?.line_items?.map((item, idx) => {
              if (item.is_section) {
                return (
                  <tr key={idx} className="bg-gray-100 dark:bg-slate-800">
                    <td colSpan={3} className="border dark:border-gray-600 p-2 text-left font-semibold text-gray-800 dark:text-white">
                      {capitalizeFirst(item?.description)}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={idx} className="bg-white dark:bg-slate-800">
                  <td className="border dark:border-gray-600 p-2 white-space break-all"> {capitalizeFirst((item?.category_display_name))}</td>
                  <td className="border dark:border-gray-600 p-2 whitespace-pre-line break-all">{capitalizeFirst(item?.description)}</td>
                  <td className="border dark:border-gray-600 p-2 text-right">{formatCurrency(item?.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-2 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2 bg-gray-50 dark:bg-slate-800 border dark:border-gray-700 rounded-lg p-4 md:col-start-2">
          
          <div className="flex justify-between ">
            <span>{markupData?.value ?? "Additional Markup"}</span>
            <span>{formatCurrency(additionalMarkupAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice?.subtotal)}</span>
          </div>

          <div className="flex justify-between">
            <span>Tax ({(invoice?.tax_rate * 100).toFixed(1)}%):</span>
            <span>{formatCurrency(invoice?.tax_amount)}</span>
          </div>

          <div className="flex justify-between font-bold text-lg border-t dark:border-gray-600 pt-3 mt-3">
            <span>Total:</span>
            <span>{formatCurrency(invoice?.total_amount)}</span>
          </div>
          <div className="flex justify-between text-green-600 font-semibold">
            <span>Amount Paid</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>
          <div className="flex justify-between border-t dark:border-gray-600 pt-3 text-red-600 font-bold">
            <span>Balance Due</span>
            <span>{formatCurrency(balanceDue)}</span>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {invoice?.Scope_of_work && (
            <div>
              <h3 className="text-lg font-bold text-[#0c54aa] dark:text-blue-400 mb-2">Scope of Work</h3>
              <div 
                className="bg-gray-50 dark:bg-slate-800 border dark:border-gray-700 rounded-lg p-4 text-sm text-black dark:text-gray-200 prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: invoice.Scope_of_work }}
              />
            </div>
          )}
        </div>
      </div>
      
      {balanceDue <= 0 && (
        <div className="px-6 pb-6 mt-4 text-center">
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 px-6 py-4 rounded-lg font-semibold text-lg">
            Invoice Fully Paid
          </div>
        </div>
      )}
    </div>
  );
}
