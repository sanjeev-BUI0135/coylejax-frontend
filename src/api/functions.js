import localApi from '../services/localApi';
import { formatDateUS } from '../utils/formatdate';

const API_BASE = import.meta.env.VITE_API_BASE;

// Helper to download files received as blobs
const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
};

// --- Converted Functions ---

export const acceptEstimate = (payload) => {
  return localApi.request(`/functions/accept-estimate`, { method: 'POST', body: JSON.stringify(payload) });
};

export const exportLaborToPdf = async ({ entry_ids, report_title, entries_data, export_type }) => {
  try {
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(report_title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${formatDateUS(new Date())}`, 14, 22);

    if (!entries_data || !Array.isArray(entries_data)) {
      throw new Error('No valid data provided for PDF generation');
    }

    let headers, tableData;
    let totalHours = 0;

    if (export_type === 'weekly_entries') {
      headers = ['Date', 'Project Name', 'Hours', 'Time Range'];

      tableData = entries_data.map(entry => [
        entry.date || 'N/A',
        entry.projectName || 'Unnamed Project',
        (entry.hours?.toFixed(1) || '0.0') + ' hrs',
        `${entry.startTime || 'N/A'} – ${entry.endTime || 'N/A'}`
      ]);
      totalHours = entries_data.reduce((sum, entry) => sum + (entry.hours || 0), 0);

    } else if (export_type === 'all_entries') {
      headers = ['Employee Name', 'Project Type', 'Project Name', 'Date', 'Worked'];

      tableData = entries_data.map(entry => {
        const workedHours = entry.total_hours || 0;

        const formatTimeForDisplay = (timeStr) => {
          if (!timeStr) return 'N/A';
          const [hours, minutes] = timeStr.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 || 12;
          return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
        };

        const timeRange = entry.start_time && entry.end_time
          ? `${formatTimeForDisplay(entry.start_time)} – ${formatTimeForDisplay(entry.end_time)} (${workedHours.toFixed(1)} hrs)`
          : 'N/A';

        return [
          entry.employee_name || 'Unknown Employee',
          entry.project_type || 'Unknown Type',
          entry.projectName || 'Unknown Project',
          entry.date || 'N/A',
          timeRange,
        ];
      });

      totalHours = entries_data.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);

    } else if (export_type === 'top_projects') {
      headers = ['Project Name', 'Total Hours'];

      tableData = entries_data.map(project => [
        project.projectName || 'Unnamed Project',
        (project.totalHours?.toFixed(1) || '0.0') + ' hrs'
      ]);
      totalHours = entries_data.reduce((sum, project) => sum + (project.totalHours || 0), 0);

    } else {
      throw new Error(`Unknown export type: ${export_type}`);
    }

    totalHours = totalHours || 0;

    doc.autoTable({
      startY: 30,
      head: [headers],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        cellWidth: 'wrap'
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { top: 30 },
      columnStyles: {
        5: { cellWidth: 'auto' },
        6: { cellWidth: 'auto' }
      }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Hours: ${totalHours.toFixed(1)} hrs`, 14, finalY);
    doc.text(`Total Entries: ${entries_data.length}`, 14, finalY + 7);

    const pdfBlob = doc.output('blob');

    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('Generated PDF is empty');
    }

    return pdfBlob;

  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`PDF export failed: ${error.message}`);
  }
};

const fetchLaborDataForExport = async (entry_ids) => {
  return {
    headers: ['Project Name', 'Date', 'Hours', 'Description'],
    rows: entry_ids.map(id => [
      id,
      `Project ${id}`,
      new Date().toISOString().split('T')[0],
      '8.0',
      'Work description'
    ])
  };
};

export const exportLaborToCsv = async (payload) => {
  try {
    const { entries_data, export_type } = payload;

    if (entries_data && Array.isArray(entries_data)) {
      let headers, csvRows;

      if (export_type === 'weekly_entries') {
        headers = ['Date', '', 'Project Name', 'Hours', 'Start Time', 'End Time'];
        csvRows = [
          headers.join(','),
          ...entries_data.map(entry => [
            entry.date || '',
            `"${(entry.projectName || 'Unnamed Project').replace(/"/g, '""')}"`,
            entry.hours?.toFixed(1) || '0.0',
            entry.startTime || '',
            entry.endTime || ''
          ].join(','))
        ];
      } else if (export_type === 'all_entries') {
        headers = ['Employee Name', 'Project Type', 'Project Name', 'Date', 'Start Time', 'End Time', 'Hours', 'Work Description'];
        csvRows = [
          headers.join(','),
          ...entries_data.map(entry => {
            const workedHours = entry.total_hours || 0;
            return [
              `"${(entry.employee_name || 'Unknown Employee').replace(/"/g, '""')}"`,
              `"${(entry.project_type || 'Unknown Type').replace(/"/g, '""')}"`,
              `"${(entry.projectName || 'Unknown Project').replace(/"/g, '""')}"`,
              entry.date || '',
              entry.start_time || '',
              entry.end_time || '',
              workedHours.toFixed(1) || '0.0',
              `"${(entry.work_description || '').replace(/"/g, '""')}"`
            ].join(',');
          })
        ];
      } else {
        headers = ['Project Name', 'Total Hours'];
        csvRows = [
          headers.join(','),
          ...entries_data.map(project => [
            `"${(project.projectName || 'Unnamed Project').replace(/"/g, '""')}"`,
            project.totalHours?.toFixed(1) || '0.0'
          ].join(','))
        ];
      }

      const csvString = csvRows.join('\n');
      return new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    }

    // ... rest of your existing CSV function for API call
    const response = await localApi.request('/functions/export-labor-csv', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    let csvBlob;

    if (response instanceof Blob) {
      csvBlob = response;
    } else if (response?.data instanceof Blob) {
      csvBlob = response.data;
    } else if (typeof response === 'string') {
      csvBlob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
    } else if (response?.data && typeof response.data === 'string') {
      csvBlob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    } else {
      throw new Error('Unsupported response format from CSV API');
    }

    if (!csvBlob || csvBlob.size === 0) {
      throw new Error('Empty CSV data received');
    }

    return csvBlob;

  } catch (error) {
    console.error('CSV export error:', error);
    throw new Error(`CSV export failed: ${error.message}`);
  }
};

// Updated to support summary/details PDF type
export const generateEstimatePdf = async (payload) => {
  try {
    const { estimate_id, pdf_type = 'summary' } = payload;

    if (!estimate_id) {
      throw new Error('Estimate ID is required');
    }
    const blob = await localApi.request('/functions/generate-estimate-pdf', {
      method: 'POST',
      body: JSON.stringify({ estimate_id, pdf_type })
    });

    return { data: blob };
  } catch (error) {
    console.error('Error in generateEstimatePdf:', error);
    throw error;
  }
};

export const generateEstimateDocx = async (payload) => {
  try {
    const { estimate_id, docx_type = 'summary' } = payload;

    if (!estimate_id) {
      throw new Error('Estimate ID is required');
    }
    const blob = await localApi.request('/functions/generate-estimate-docx', {
      method: 'POST',
      body: JSON.stringify({ estimate_id, docx_type })
    });

    return { data: blob };
  } catch (error) {
    console.error('Error in generateEstimateDocx:', error);
    throw error;
  }
};

// Updated to support summary/details PDF type
export const generateInvoicePdf = async (payload) => {
  const { invoice_id, pdf_type = 'details' } = payload;
  const blob = await localApi.request('/functions/generate-invoice-pdf', {
    method: 'POST',
    body: JSON.stringify({ invoice_id, pdf_type })
  });
  downloadFile(blob, `invoice_${payload.invoice_number || 'download'}_${pdf_type}.pdf`);
};

export const generateInvoiceDocx = async (payload) => {
  const { invoice_id, docx_type = 'details' } = payload;
  const blob = await localApi.request('/functions/generate-invoice-docx', {
    method: 'POST',
    body: JSON.stringify({ invoice_id, docx_type })
  });
  downloadFile(blob, `invoice_${payload.invoice_number || 'download'}_${docx_type}.docx`);
};

export const generatePublicInvoicePdf = async (payload) => {
  const blob = await localApi.request('/functions/generate-public-invoice-pdf', { method: 'POST', body: JSON.stringify(payload) });
  downloadFile(blob, `invoice_${payload.invoice_number || 'download'}.pdf`);
};

export const getPublicInvoice = async (token, type, sig) => {
  try {
    const response = await fetch(`${API_BASE}/functions/get-public-invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, type, sig }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch invoice');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('API request error:', err);
    throw err;
  }
};

export const getPublicEstimate = async (token, type, sig) => {
  try {
    const response = await fetch(`${API_BASE}/functions/get-public-estimate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, type, sig }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch estimate');
    }

    const data = await response.json();
    return data; // { estimate, project, customer }
  } catch (err) {
    console.error('API request error (public estimate):', err);
    throw err;
  }
};