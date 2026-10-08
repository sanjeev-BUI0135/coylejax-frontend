import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Plus, Edit, DollarSign, FileText, CheckCircle, AlertCircle, Trash, ShieldAlert, Printer, ChevronDown, Eye, Mail, Send, MessageSquare, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import InvoiceEmailPopup from '../../invoices/InvoiceEmailPopup';
import InvoiceSmsPopup from '../../invoices/InvoiceSmsPopup';
import { hasPermission } from '@/utils/hasPermission';
import "../../../App.css";
import { formatDateUTC } from '../../../utils/formatdate';

const statusConfig = {
  draft: { label: "Draft", color: 'bg-gray-100 text-gray-800temp', icon: FileText },
  sent: { label: "Sent", color: 'bg-blue-100 text-blue-800', icon: FileText },
  paid: { label: "Paid", color: 'bg-green-100 text-green-800', icon: CheckCircle },
  partial: { label: "Partial", color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  void: { label: "Void", color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

export default function ProjectInvoices({
  invoices,
  estimates,
  project,
  tabPermission,
  onNewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onInvoiceUpdate
}) {
  const token = localStorage.getItem('token');
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [showBulkEmailPopup, setShowBulkEmailPopup] = useState(false);
  const [showSmsPopup, setShowSmsPopup] = useState(false);
  const [bulkEmailType, setBulkEmailType] = useState('summary');
  const [bulkSmsType, setBulkSmsType] = useState('summary');
  const [isSingleEmailMode, setIsSingleEmailMode] = useState(false);
  const [isSingleSmsMode, setIsSingleSmsMode] = useState(false);

  const handleSelectInvoice = (invoiceId, checked) => {
    setSelectedInvoices(prev => checked ? [...prev, invoiceId] : prev.filter(id => id !== invoiceId));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedInvoices(invoices.map(inv => inv._id || inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleBulkEmail = (type) => {
    if (selectedInvoices.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Invoices Selected', text: 'Please select at least one invoice.' });
      return;
    }
    setBulkEmailType(type);
    setIsSingleEmailMode(false);
    setShowBulkEmailPopup(true);
  };

  const handleBulkSms = () => {
    if (selectedInvoices.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Invoices Selected', text: 'Please select at least one invoice.' });
      return;
    }
    setBulkSmsType('summary');
    setIsSingleSmsMode(false);
    setShowSmsPopup(true);
  };

  const handleSingleEmail = (invoice, type) => {
    setSelectedInvoices([invoice._id || invoice.id]);
    setBulkEmailType(type);
    setIsSingleEmailMode(true);
    setShowBulkEmailPopup(true);
  };

  const handleSingleSms = (invoice) => {
    setSelectedInvoices([invoice._id || invoice.id]);
    setBulkSmsType('summary');
    setIsSingleSmsMode(true);
    setShowSmsPopup(true);
  };

  const selectedInvoiceObjects = invoices.filter(inv => selectedInvoices.includes(inv._id) || selectedInvoices.includes(inv.id));

  const handlePrintPdf = async (invoice, pdf_type = 'summary') => {
    try {
      Swal.fire({
        title: 'Generating PDF...',
        html: `Preparing ${pdf_type} invoice...`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/functions/generate-invoice-pdf`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ invoice_id: invoice._id || invoice.id, pdf_type })
        }
      );

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoice.invoice_number}_${pdf_type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      Swal.fire({
        icon: 'success',
        title: 'Download Successful!',
        html: `Invoice <strong>${invoice.invoice_number}</strong> (${pdf_type}) has been downloaded.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: err.message || 'Failed to download PDF. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  };

  const handlePrintDocx = async (invoice, docx_type = 'summary') => {
    try {
      Swal.fire({
        title: 'Generating Word Document...',
        html: `Preparing ${docx_type} invoice...`,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE}/functions/generate-invoice-docx`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ invoice_id: invoice._id || invoice.id, docx_type })
        }
      );

      if (!response.ok) throw new Error("Failed to generate Word document");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoice.invoice_number}_${docx_type}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      Swal.fire({
        icon: 'success',
        title: 'Download Successful!',
        html: `Invoice <strong>${invoice.invoice_number}</strong> (${docx_type}) has been downloaded.`,
        timer: 2500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error generating DOCX:', err);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'Failed to download Word document. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  };

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          {tabPermission?.add && (<Button
            onClick={() => { onNewInvoice(); }}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>)}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Invoices</h3>
            <p className="text-gray-500temp mt-2">Create your first invoice for this project</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Invoices</CardTitle>
            <div className="flex gap-2">
              {selectedInvoices.length > 0 && tabPermission?.update && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-2" /> Bulk Email ({selectedInvoices.length}) <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkEmail('summary')}>
                      <FileText className="w-4 h-4 mr-2" /> Send Summary
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkEmail('details')}>
                      <Eye className="w-4 h-4 mr-2" /> Send Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {selectedInvoices.length > 0 && tabPermission?.update && hasPermission(user?.permissions, "Message", "view") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkSms()}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Bulk SMS ({selectedInvoices.length})
                </Button>
              )}
              {tabPermission?.add && <Button
                onClick={() => { onNewInvoice(); }}
                size="sm"
              >
                <Plus className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">New Invoice</span>
              </Button>
              }
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table className="responsiveTable1">
            <Thead className="text-left border-b border-gray-200">
              <Tr>
                <Th className="w-12 hidden md:table-cell">
                  {tabPermission?.update && (<Checkbox className="hidden md:block"
                    checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                    onCheckedChange={handleSelectAll}

                  />)}
                </Th>
                <Th className='font-medium text-muted-foreground text-sm py-3'>Invoice #</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Status</Th>
                {user?.role_type !== "Crew View" && (<Th className='font-medium text-muted-foreground text-sm'>Total Amount</Th>)}
                {user?.role_type !== "Crew View" && (<Th className='font-medium text-muted-foreground text-sm'>Amount Paid</Th>)}
                {user?.role_type !== "Crew View" && (<Th className='font-medium text-muted-foreground text-sm'>Balance Due</Th>)}
                <Th className='font-medium text-muted-foreground text-sm'>Due Date</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {invoices.map((invoice, index) => {
                const config = statusConfig[invoice.status] || statusConfig.draft;
                const outstandingAmount = (invoice.total_amount || 0) - (invoice.amount_paid || 0);
                return (
                  <Tr key={invoice._id || invoice.id} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                    <Td className="w-12 hidden md:table-cell">
                      {tabPermission?.update && <Checkbox className="hidden md:block"
                        checked={selectedInvoices.includes(invoice._id) || selectedInvoices.includes(invoice.id)}
                        onCheckedChange={(checked) => handleSelectInvoice(invoice._id || invoice.id, checked)}
                      />}
                    </Td>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0">
                      <Link
                        to={`/invoices/${invoice._id || invoice.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </Td>
                    <Td className="text-sm px-2 py-3 md:py-0">
                      <Badge className={config.color}>
                        <config.icon className="w-3 h-3 mr-1" />
                        {config.label}
                      </Badge>
                    </Td>
                    {user?.role_type !== "Crew View" && (
                      <Td className="text-sm px-2 py-3 md:py-0">
                        ${(invoice.total_amount || 0).toLocaleString()}
                      </Td>
                    )}
                    {user?.role_type !== "Crew View" && (
                      <Td className="text-sm px-2 py-3 md:py-0">
                        ${(invoice.amount_paid || 0).toLocaleString()}
                      </Td>
                    )}
                    {user?.role_type !== "Crew View" && (
                      <Td className="text-sm px-2 py-3 md:py-0 text-red-600 font-medium">
                        ${outstandingAmount.toLocaleString()}
                      </Td>
                    )}
                    <Td className="text-sm px-2 py-3 md:py-0">
                      {invoice.due_date
                        ? formatDateUTC(invoice.due_date)
                        : 'N/A'}
                    </Td>
                    <Td className="text-sm px-2 py-3 md:py-0">
                      <div className="flex flex-wrap md:gap-2">
                        {tabPermission?.update && (<Button
                          variant="outline"
                          size="sm"
                          onClick={() => { onEditInvoice(invoice); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {tabPermission?.update && (<Button
                              variant="outline"
                              size="sm"
                              title="Download Invoice"
                            >
                              <Printer className="w-4 h-4" />
                              <ChevronDown className="w-4 h-4 ml-1" />
                            </Button>)}
                          </DropdownMenuTrigger>

                          <DropdownMenuContent className="w-56">
                            <DropdownMenuItem onClick={() => handlePrintPdf(invoice, 'summary')}>
                              <Download className="w-4 h-4 mr-2" /> Summary PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintPdf(invoice, 'details')}>
                              <Download className="w-4 h-4 mr-2" /> Details PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintDocx(invoice, 'summary')}>
                              <Download className="w-4 h-4 mr-2 text-blue-600" /> Summary Word
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrintDocx(invoice, 'details')}>
                              <Download className="w-4 h-4 mr-2 text-blue-600" /> Details Word
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {(invoice.status === 'draft' || invoice.status === 'sent' || invoice.status === 'partial') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              {tabPermission?.update && (<Button variant="outline" size="sm" title="Email Invoice">
                                <Mail className="w-4 h-4" />
                                <ChevronDown className="w-4 h-4 ml-1" />
                              </Button>)}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleSingleEmail(invoice, 'summary')}>
                                <FileText className="w-4 h-4 mr-2" /> Summary
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSingleEmail(invoice, 'details')}>
                                <Eye className="w-4 h-4 mr-2" /> Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {(invoice.status === 'draft' || invoice.status === 'sent'|| invoice.status === 'partial') && hasPermission(user?.permissions, "Message", "view") && (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Send SMS"
                            onClick={() => handleSingleSms(invoice)}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        )}

                        {tabPermission?.delete && (<Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => { onDeleteInvoice(invoice); }}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>)}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      {showBulkEmailPopup && (
        <InvoiceEmailPopup
          invoices={selectedInvoiceObjects}
          type={bulkEmailType}
          onClose={() => {
            setShowBulkEmailPopup(false);
            setSelectedInvoices([]);
          }}
          onEmailSent={() => {
            if (onInvoiceUpdate) onInvoiceUpdate();
          }}
          isSingleEmail={isSingleEmailMode}
        />
      )}

      {showSmsPopup && (
        <InvoiceSmsPopup
          invoices={selectedInvoiceObjects}
          type={bulkSmsType}
          onClose={() => {
            setShowSmsPopup(false);
            setSelectedInvoices([]);
          }}
          onSmsSent={() => {
            if (onInvoiceUpdate) onInvoiceUpdate();
          }}
          isSingleSms={isSingleSmsMode}
        />
      )}
    </>
  );
}