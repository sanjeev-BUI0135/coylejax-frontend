import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import {
  Plus, Edit, FileText, DollarSign, CheckCircle, XCircle, Clock, AlertCircle, Printer, Mail, Eye,
  Trash, ChevronDown, Send, MessageSquare, Download
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import Swal from 'sweetalert2';
import { Checkbox } from '@/components/ui/checkbox';
import BulkEmailPopup from '../../estimates/BulkEmailPopup';
import EstimateSmsPopup from '../../estimates/EstimateSmsPopup';
import ConfirmationDialog from '../../estimates/ConfirmationDialog';
import { hasPermission } from '@/utils/hasPermission';
import { Estimate } from '@/api/entities';
import "../../../App.css";
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE;

const statusConfig = {
  draft: { label: "Draft", color: 'bg-gray-100 text-gray-800temp dark:bg-gray-700 ', icon: FileText },
  sent: { label: "Sent", color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300', icon: Clock },
  approved: { label: "Approved", color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs', icon: CheckCircle },
  rejected: { label: "Rejected", color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', icon: XCircle },
  // expired: { label: "Expired", color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300', icon: AlertCircle },
};

const markupStatusConfig = {
  draft: { label: "N/A", color: 'bg-gray-100 text-gray-800temp dark:bg-gray-700 text-xs', icon: FileText },
  pending: { label: "Pending", color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', icon: Clock },
  approved: { label: "Approved", color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', icon: CheckCircle },
  rejected: { label: "Rejected", color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', icon: XCircle },
};

const renderMarkupStatusBadge = (status) => {
  const config = markupStatusConfig[status] || markupStatusConfig.draft;
  const IconComponent = config.icon;

  return (
    <Badge className={`${config.color} cursor-default`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

// Main Component
export default function ProjectEstimates({
  estimates,
  allestimates,
  project,
  tabPermission,
  onNewEstimate,
  onEditEstimate,
  onStatusChange,
  onConvertToInvoice,
  onEstimateUpdate,
  onDeleteEstimate,
  material_markup,
}) {
  const [loadingStates, setLoadingStates] = useState({});
  const [selectedEstimates, setSelectedEstimates] = useState([]);
  const [showBulkEmailPopup, setShowBulkEmailPopup] = useState(false);
  const [showSmsPopup, setShowSmsPopup] = useState(false);
  const [bulkEmailType, setBulkEmailType] = useState('summary');
  const [bulkSmsType, setBulkSmsType] = useState('summary');
  const [isSingleEmailMode, setIsSingleEmailMode] = useState(false);
  const [isSingleSmsMode, setIsSingleSmsMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, estimate: null, type: null });

  const handleSelectEstimate = (estimateId, checked) => {
    setSelectedEstimates(prev => checked ? [...prev, estimateId] : prev.filter(id => id !== estimateId));
  };

  const loggedInUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = loggedInUser?.role_type?.toLowerCase() === "admin";
  const canUpdate = isAdmin || (tabPermission?.update ?? false);

  const handleStatusChange = async (estimate, newStatus) => {
    if (estimate.status === newStatus) return;
    try {
      Swal.fire({
        title: 'Updating Status...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });
      await Estimate.updateStatus(estimate.id || estimate._id, newStatus);
      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        timer: 1500,
        showConfirmButton: false
      });
      if (onEstimateUpdate) onEstimateUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: error.message || 'Failed to update status',
      });
    }
  };

  const selectableEstimates = estimates.filter(e => e.status === 'draft' || e.status === 'sent');

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedEstimates(selectableEstimates.map(e => e.id || e._id));
    } else {
      setSelectedEstimates([]);
    }
  };

  const handleBulkEmail = (type) => {
    if (selectedEstimates.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Estimates Selected', text: 'Please select at least one estimate.' });
      return;
    }
    setBulkEmailType(type);
    setIsSingleEmailMode(false);
    setShowBulkEmailPopup(true);
  };

  const handleBulkSms = () => {
    if (selectedEstimates.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Estimates Selected', text: 'Please select at least one estimate.' });
      return;
    }
    setBulkSmsType('summary');
    setIsSingleSmsMode(false);
    setShowSmsPopup(true);
  };

  const handleSingleEmail = (estimate, type) => {
    setSelectedEstimates([estimate.id || estimate._id]);
    setBulkEmailType(type);
    setIsSingleEmailMode(true);
    setShowBulkEmailPopup(true);
  };

  const handleSingleSms = (estimate) => {
    setSelectedEstimates([estimate.id || estimate._id]);
    setBulkSmsType('summary');
    setIsSingleSmsMode(true);
    setShowSmsPopup(true);
  };

  const selectedEstimateObjects = estimates.filter(e => selectedEstimates.includes(e.id) || selectedEstimates.includes(e._id));

  const handleDownloadClick = (estimate, downloadType) => {
    if (downloadType === 'details_pdf') {
      setConfirmDialog({ open: true, estimate, type: 'details_pdf' });
    } else if (downloadType === 'details_docx') {
      setConfirmDialog({ open: true, estimate, type: 'details_docx' });
    } else if (downloadType === 'summary_docx') {
      downloadDocx(estimate, 'summary');
    } else {
      downloadPdf(estimate, 'summary');
    }
  };

  const downloadDocx = async (estimate, type) => {
    try {
      Swal.fire({
        title: 'Generating Word Document...',
        html: 'Please wait while the Word document is being generated.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await fetch(`${API_BASE_URL}/functions/generate-estimate-docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          estimate_id: estimate.id || estimate._id,
          docx_type: type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate Word document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimate_${estimate.estimate_number}_${type}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      Swal.fire({
        icon: 'success',
        title: 'Download Successful!',
        text: `${type.charAt(0).toUpperCase() + type.slice(1)} Word document has been downloaded.`,
        timer: 3000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error downloading DOCX:', error);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: error.message || 'Failed to download Word document. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  };

  const downloadPdf = async (estimate, type) => {
    try {
      Swal.fire({
        title: 'Generating PDF...',
        html: 'Please wait while the PDF is being generated.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await fetch(`${API_BASE_URL}/functions/generate-estimate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          estimate_id: estimate.id,
          pdf_type: type
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimate_${estimate.estimate_number}_${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      Swal.fire({
        icon: 'success',
        title: 'Download Successful!',
        text: `${type.charAt(0).toUpperCase() + type.slice(1)} PDF has been downloaded.`,
        timer: 3000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error('Error downloading PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: error.message || 'Failed to download PDF. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  };

  const isWarrantyWork = project?.status === 'reopen';

  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const isCrewView = userData?.role_type === "Crew View";
  const getInvoicePercentage = (estimate) => {
    if (!estimate.total_amount || estimate.total_amount === 0) return 0;

    return ((estimate.invoiced_amount || 0) / estimate.total_amount) * 100;
  };

  if (!estimates || estimates.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Estimates</CardTitle>
          {tabPermission?.add && (<Button
            onClick={onNewEstimate}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Estimate
          </Button>)}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
            <h3 className="text-lg font-medium ">No Estimates</h3>
            <p className="text-gray-500temp mt-2">Create your first estimate for this project</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  const getMarkupStatus = (estimate) => estimate.markup_status || 'pending';

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Estimates</CardTitle>
            <div className="flex gap-2">
              {selectedEstimates.length > 0 && tabPermission?.update && !isWarrantyWork && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-2" /> Bulk Email ({selectedEstimates.length}) <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkEmail('summary')}><FileText className="w-4 h-4 mr-2" /> Send Summary </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkEmail('details')}><Eye className="w-4 h-4 mr-2" /> Send Details </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {selectedEstimates.length > 0 && tabPermission?.update && !isWarrantyWork && hasPermission(userData?.permissions, "Message", "view") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkSms()}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Bulk SMS ({selectedEstimates.length})
                </Button>
              )}
              {tabPermission?.add && (
                <Button onClick={onNewEstimate} size="sm">
                  <Plus className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">New Estimate</span>
                </Button>
              )}

            </div>
          </div>
          {isWarrantyWork && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-purple-800">
                <strong>Warranty Work Mode:</strong> Estimates can be created for cost tracking,
                but email notifications are disabled.
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table className="responsiveTable1">
            <Thead className="text-left border-b border-gray-200 ">
              <Tr>
                <Th className="w-12 hidden md:table-cell">
                  {tabPermission?.update && selectableEstimates.length > 0 && (
                    <Checkbox
                      className="hidden md:block"
                      checked={selectableEstimates.length > 0 && selectableEstimates.every(e => selectedEstimates.includes(e.id || e._id))}
                      onCheckedChange={handleSelectAll}
                    />
                  )}
                </Th>
                <Th className='font-medium text-muted-foreground text-sm py-3'>Estimate #</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Customer PO #</Th>
                <Th className='font-medium text-muted-foreground text-sm'>Status</Th>
                {/* <Th className='font-medium text-muted-foreground text-sm'>Mark Up Status</Th> */}
                {/* <Th className='font-medium text-muted-foreground text-sm'>Additional Mark Up</Th> */}
                {!isCrewView && (<Th className='font-medium text-muted-foreground text-sm'>Total Amount</Th>)}
                <Th className='font-medium text-muted-foreground text-sm'>Partial Invoicing</Th>
                {/* <Th className='font-medium text-muted-foreground text-sm'>Valid Until</Th> */}
                <Th className='font-medium text-muted-foreground text-sm'>Actions</Th>
              </Tr>
            </Thead>
            <Tbody className="text-left">
              {estimates.map((estimate, index) => {
                const config = statusConfig[estimate.status] || statusConfig.draft;
                const isLoading = loadingStates[estimate.id];
                const markupStatus = getMarkupStatus(estimate);
                const markupConfig = markupStatusConfig[markupStatus] || markupStatusConfig.pending;
                const canConvert = project?.status === 'reopen' || ((estimate.status === 'approved'));
                const percentage = getInvoicePercentage(estimate);
                const isFullyConverted = percentage >= 100;
                return (
                  <Tr key={estimate.id} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                    <Td className="w-12 hidden md:table-cell">
                      {tabPermission?.update && (estimate.status === 'draft' || estimate.status === 'sent') && (
                        <Checkbox
                          className="hidden md:block"
                          checked={selectedEstimates.includes(estimate.id) || selectedEstimates.includes(estimate._id)}
                          onCheckedChange={(checked) => handleSelectEstimate(estimate.id || estimate._id, checked)}
                        />
                      )}
                    </Td>
                    <Td className="font-medium text-sm px-2 py-3 md:py-4 md:px-0">
                      <Link
                        to={`/estimate/${estimate.id || estimate._id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >{estimate.estimate_number}</Link>
                      
                    </Td>
                    <Td className="text-sm px-2 py-3 md:py-0">
                      {estimate.customer_po_number || 'N/A'}
                    </Td>
                    <Td className="text-sm px-2 py-3 md:py-0">
                      {canUpdate && estimate.status !== 'approved' && estimate.status !== 'rejected' ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="outline-none">
                            <Badge className={`${config.color} cursor-pointer`}>
                              <config.icon className="w-3 h-3 mr-1" />
                              {config.label}
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {Object.entries(statusConfig).map(([statusKey, statusObj]) => (
                              <DropdownMenuItem key={statusKey} onClick={() => handleStatusChange(estimate, statusKey)}>
                                <statusObj.icon className="w-4 h-4 mr-2" />
                                {statusObj.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge className={`${config.color} cursor-default`}>
                          <config.icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      )}
                    </Td>
                    {/* <Td className="text-sm px-2 py-3 md:py-0">
                      {renderMarkupStatusBadge(estimate.markup_status)}
                    </Td> */}
                    {/* <Td>
                      {renderMarkupStatusBadge(estimate.additional_markup_status)}
                    </Td> */}
                    {!isCrewView && (
                      <Td className="text-sm px-2 py-3 md:py-0">
                        {formatCurrency(estimate.total_amount)}
                      </Td>
                    )}
                    <Td className="text-sm px-2 py-3 md:py-0">
                      {getInvoicePercentage(estimate).toFixed(2)}%
                    </Td>
                    {/* <Td className="text-sm px-2 py-3 md:py-0">
                      {estimate.valid_until
                        ? format(new Date(estimate.valid_until), 'MMM d, yyyy')
                        : 'N/A'
                      }
                    </Td> */}
                    <Td className="text-sm px-2 py-3 md:py-0">
                      <div className="flex flex-wrap md:gap-2">
                        {tabPermission?.update && (<Button
                          variant="outline"
                          size="sm"
                          onClick={() => { onEditEstimate(estimate); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>)}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {tabPermission?.update && !isCrewView && (<Button variant="outline" size="sm"><Printer className="w-4 h-4" /><ChevronDown className="w-4 h-4 ml-1" /></Button>)}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => handleDownloadClick(estimate, 'summary_pdf')}>
                              <Download className="w-4 h-4 mr-2" /> Summary PDF
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handleDownloadClick(estimate, 'details_pdf')}>
                              <Download className="w-4 h-4 mr-2" /> Details PDF
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handleDownloadClick(estimate, 'summary_docx')}>
                              <Download className="w-4 h-4 mr-2 text-blue-600" /> Summary Word
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => handleDownloadClick(estimate, 'details_docx')}>
                              <Download className="w-4 h-4 mr-2 text-blue-600" /> Details Word
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {(estimate.status === 'draft' || estimate.status === 'sent') && !isCrewView && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              {tabPermission?.update && !isWarrantyWork && (<Button variant="outline" size="sm" title={isWarrantyWork ? "Email disabled for warranty work" : ""}><Mail className="w-4 h-4" /><ChevronDown className="w-4 h-4 ml-1" /></Button>)}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleSingleEmail(estimate, 'summary')}><FileText className="w-4 h-4 mr-2" /> Summary</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSingleEmail(estimate, 'details')}><Eye className="w-4 h-4 mr-2" /> Details</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {(estimate.status === 'draft' || estimate.status === 'sent') && !isCrewView &&
                          hasPermission(userData?.permissions, "Message", "view") && (
                            <>
                              {tabPermission?.update && !isWarrantyWork && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isCrewView}
                                  onClick={() => handleSingleSms(estimate)}
                                  title="Send SMS"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}

                        {canConvert && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isFullyConverted}
                            onClick={() => onConvertToInvoice(estimate)}
                            title={isFullyConverted ? "Already fully converted" : ""}
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                        )}

                        {tabPermission?.delete && (<Button
                          variant="outline"
                          size="sm"
                          onClick={() => { onDeleteEstimate(estimate); }}
                          className="text-red-600 hover:text-black-800 border-black-200 hover:border-black-300"
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
        <BulkEmailPopup
          estimates={selectedEstimateObjects}
          type={bulkEmailType}
          onClose={() => { setShowBulkEmailPopup(false); setSelectedEstimates([]); }}
          onEmailSent={() => { if (onEstimateUpdate) onEstimateUpdate(); }}
          isSingleEmail={isSingleEmailMode}
        />
      )}
      {showSmsPopup && (
        <EstimateSmsPopup
          estimates={selectedEstimateObjects}
          type={bulkSmsType}
          onClose={() => {
            setShowSmsPopup(false);
            setSelectedEstimates([]);
          }}
          onSmsSent={() => {
            if (onEstimateUpdate) onEstimateUpdate();
          }}
          isSingleSms={isSingleSmsMode}
        />
      )}
      <ConfirmationDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, estimate: null, type: null })}
        onConfirm={() => {
          if (confirmDialog.type === 'details_docx') {
            downloadDocx(confirmDialog.estimate, 'details');
          } else {
            downloadPdf(confirmDialog.estimate, 'details');
          }
          setConfirmDialog({ open: false, estimate: null, type: null });
        }}
        title="Confirm Download Details"
        message="Are you sure you want to download the detailed estimate including all pricing information (unit prices, quantities, and amounts)?"
        type="detail"
      />
    </>
  );
}