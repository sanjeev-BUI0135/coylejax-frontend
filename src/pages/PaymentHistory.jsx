import React, { useState, useEffect } from "react";
import { Payment } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowLeft, Loader2, Search, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import TablePageSkeleton from "../components/ui/tableskeleton";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/shared/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateUS } from "@/utils/formatdate";

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await Payment.list({ sort: "-createdAt" });
      const paymentsArray = Array.isArray(data) ? data : (data.data || []);
      setPayments(paymentsArray);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Helper to extract customer details and invoice number with fallbacks
  const extractDetails = (pay) => {
    let companyName = pay.company_name || pay.customer_id?.company_name || "";
    let contactName = pay.customer_name || pay.customer_id?.contact_name || "";
    let email = pay.customer_email || pay.customer_id?.email || "";
    let phone = pay.customer_phone || pay.customer_id?.phone || "";
    let invoiceNum = pay.invoice_id?.invoice_number || pay.invoice_number || "";

    // Fallbacks by parsing notes (e.g., "Online card payment from kkk for Inv #IN299000")
    if (pay.notes) {
      if (!invoiceNum) {
        const invMatch = pay.notes.match(/(?:for Inv #|Inv #|Invoice #)\s*([A-Za-z0-9_-]+)/i);
        if (invMatch) invoiceNum = invMatch[1];
      }
      if (!contactName && !companyName) {
        const fromMatch = pay.notes.match(/payment from (.*?)(?: for Inv #|$|\()/i);
        if (fromMatch && fromMatch[1]) {
          contactName = fromMatch[1].trim();
        }
      }
    }

    return {
      companyName: companyName || "-",
      contactName: contactName || "-",
      email: email || "-",
      phone: phone || "-",
      invoiceNum: invoiceNum || "-"
    };
  };

  const filteredPayments = payments.filter((pay) => {
    // Only show payments without an invoice (general payments)
    if (pay.invoice_id) return false;

    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;

    const details = extractDetails(pay);
    const projName = (pay.project_id?.project_name || "").toLowerCase();
    const refNum = (pay.reference_number || "").toLowerCase();
    const notesStr = (pay.notes || "").toLowerCase();
    const methodStr = (pay.payment_method || "").toLowerCase();

    return (
      details.contactName.toLowerCase().includes(term) ||
      details.companyName.toLowerCase().includes(term) ||
      details.email.toLowerCase().includes(term) ||
      details.phone.toLowerCase().includes(term) ||
      details.invoiceNum.toLowerCase().includes(term) ||
      projName.includes(term) ||
      refNum.includes(term) ||
      notesStr.includes(term) ||
      methodStr.includes(term)
    );
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  if (loading) return <TablePageSkeleton />;

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/invoices")}
                className="h-8 w-8"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Payment History
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Manage and audit all customer payments, advance deposits, and transactions.
            </p>
          </div>
        </div>
      </div>

      <div className="relative flex-1 min-w-[220px] mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400temp" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search payments by customer, email, phone, invoice #, method, ref..."
          className="pl-10 h-10"
        />
      </div>

      {filteredPayments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-lg p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No payment history records found.</p>
        </div>
      ) : (
        <>
          <div className="table-listrow-divstyle">
            <Table className="text-sm">
              <TableHeader className="bg-gray50-temp text-gray-700temp font-medium dark:bg-gray-900">
                <TableRow>
                  <TableHead className="px-4 py-3 text-left">Date</TableHead>
                  <TableHead className="px-4 py-3 text-left">Company Name</TableHead>
                  <TableHead className="px-4 py-3 text-left">Contact</TableHead>
                  <TableHead className="px-4 py-3 text-left">Email</TableHead>
                  <TableHead className="px-4 py-3 text-left">Phone</TableHead>
                  <TableHead className="px-4 py-3 text-left">Invoice # / Project</TableHead>
                  <TableHead className="px-4 py-3 text-left">Method</TableHead>
                  <TableHead className="px-4 py-3 text-left">Reference #</TableHead>
                  <TableHead className="px-4 py-3 text-left">Notes</TableHead>
                  <TableHead className="px-4 py-3 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.map((pay) => {
                  const details = extractDetails(pay);
                  const projName = pay.project_id?.project_name || "-";

                  return (
                    <TableRow
                      key={pay.id || pay._id}
                      className="hover:bg-gray-50-temp dark:hover:bg-gray-700 transition border-b"
                    >
                      <TableCell className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                        {formatDateUS(pay.payment_date || pay.createdAt)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-900 dark:text-white">
                        {details.companyName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-900 dark:text-white">
                        {details.contactName}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {details.email}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                        {details.phone}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {details.invoiceNum !== "-" ? (
                          <span className="text-gray-900 dark:text-white">
                            {details.invoiceNum}
                          </span>
                        ) : projName !== "-" ? (
                          <span className="text-gray-600 dark:text-gray-400">{projName}</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 italic">
                            Advance Payment
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap capitalize">
                        {pay.payment_method?.toLowerCase() === "us_bank_account" || pay.payment_method?.toLowerCase() === "ach"
                          ? "ACH"
                          : pay.payment_method === "cheque"
                            ? "cheque"
                            : pay.payment_method}
                      </TableCell>
                      <TableCell className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">
                        {pay.reference_number || "-"}
                      </TableCell>
                      <TableCell
                        className="px-4 py-3 text-gray-500 max-w-[200px] truncate"
                        title={pay.notes}
                      >
                        {pay.notes || "-"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 whitespace-nowrap text-base">
                        {formatCurrency(pay.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredPayments.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(limit) => {
              setItemsPerPage(limit);
              setCurrentPage(1);
            }}
          />
        </>
      )}
    </div>
  );
}
