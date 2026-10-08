import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import Swal from 'sweetalert2';
import { renderTextWithLinks, linkifyHtml } from '../../ui/renderTextWithLinks';

const stripHtml = (html) => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
};

export default function ProjectInfoTab({ project, customer, projectCustomers, onAwardedDateChange, tabPermission }) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  const userRole = user.role_type?.toLowerCase() || '';
  const canManageBids = ['admin', userRole].includes(userRole);

  useEffect(() => {
    if (project?.id) loadBids();
  }, [project?.id, project?.status]);

  const loadBids = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/bids/project/${project.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to load bids');
      const data = await res.json();
      setBids(data);
      const awardedBid = data.find(b => b.status === "accepted");
      if (awardedBid && onAwardedDateChange) {
        onAwardedDateChange(awardedBid.reviewed_at);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptBid = async (bidId) => {
    const confirm = await Swal.fire({
      title: 'Accept Bid?',
      text: 'This will mark the project as awarded and notify the customer.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, accept it!',
    });
    if (!confirm.isConfirmed) return;

    try {
      Swal.fire({ title: 'Processing...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/bids/${bidId}/accept`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewed_by: user.email || user.name }),
      });
      await loadBids();
      Swal.fire('Success!', 'Bid accepted and customer notified via email.', 'success');
      window.location.reload();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to accept bid', 'error');
    }
  };

  const handleRejectBid = async (bidId) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Bid',
      input: 'textarea',
      inputLabel: 'Reason for rejection (optional)',
      inputPlaceholder: 'Enter reason for rejection...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Reject Bid',
    });
    if (reason === undefined) return;

    try {
      Swal.fire({ title: 'Processing...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/bids/${bidId}/reject`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reviewed_by: user.email || user.name, rejection_reason: reason }),
      });
      if (!res.ok) throw new Error('Failed to reject bid');
      await loadBids();
      Swal.fire('Rejected', 'Bid rejected and customer notified via email.', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to reject bid', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const icons = {
      pending: <Clock className="w-3 h-3" />,
      accepted: <CheckCircle className="w-3 h-3" />,
      rejected: <XCircle className="w-3 h-3" />,
    };
    return (
      <Badge className={`flex items-center gap-1 ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Project Location */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground">Site Address</h4>
            <p className="mt-1 text-foreground whitespace-pre-wrap">
              {project.location || 'No project location provided.'}
            </p>
          </div>

          {/* Contact Location */}
          <div className="md:text-right">
            <h4 className="text-sm font-medium text-muted-foreground">Billing Address</h4>
            <div className="mt-1 text-foreground whitespace-pre-wrap">
              {projectCustomers?.length > 0 ? (
                <ul className="list-none space-y-2">
                  {projectCustomers.map((c, idx) => (
                    <li key={c._id || idx}>
                      {c.address ? `${c.address}${c.city ? `, ${c.city}` : ''}${c.state ? `, ${c.state}` : ''}${c.zip ? ` ${c.zip}` : ''}` : 'No contact location provided.'}
                    </li>
                  ))}
                </ul>
              ) : customer ? (
                <p>
                  {customer.address ? `${customer.address}${customer.city ? `, ${customer.city}` : ''}${customer.state ? `, ${customer.state}` : ''}${customer.zip ? ` ${customer.zip}` : ''}` : 'No contact location provided.'}
                </p>
              ) : (
                <p>No contact location provided.</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="border-t pt-6 dark:border-gray-700">
          <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
          <p className="mt-1 text-foreground whitespace-pre-wrap">
            {project.description || 'No description provided.'}
          </p>
        </div>

        {/* Scope of Work */}
        <div className="border-t pt-6 dark:border-gray-700">
          <h4 className="text-sm font-medium text-muted-foreground">Scope of Work</h4>
          {project.requirements ? (
            <div
              className="mt-1 text-foreground prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: project.requirements }}
            />
          ) : (
            <p className="mt-1 font-bold text-foreground">No scope of work specified.</p>
          )}
        </div>

        {/* Notes */}
        <div className="border-t pt-6 dark:border-gray-700">
          <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
          {project.special_instructions ? (
            <div
              className="mt-1 text-foreground prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: linkifyHtml(project.special_instructions) }}
            />
          ) : (
            <p className="mt-1 font-bold text-foreground">No notes.</p>
          )}
        </div>

        {/* Reason for Loss */}
        {project.status === 'lost' && project.lost_reason && (
          <div className="border-t pt-6 dark:border-gray-700">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Reason for Loss</h4>
            <div className="p-3 rounded-lg dark:border-red-800">
              <p className="text-red-700 dark:text-red-400 font-medium capitalize">
                {project.lost_reason.replace(/_/g, ' ')}
                {project.lost_reason_note ? ` : ${project.lost_reason_note}` : ''}
              </p>
              {project.lost_reason_details && (
                <p className="text-red-600 dark:text-red-300 mt-2 text-sm whitespace-pre-wrap">
                  {project.lost_reason_details}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
