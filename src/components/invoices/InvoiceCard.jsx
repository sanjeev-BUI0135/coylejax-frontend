import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Calendar, FileText, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateUTC } from '../../utils/formatdate';

const statusColors = {
  draft: 'bg-gray-200 text-gray-800temp',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  void: 'bg-red-100 text-red-800',
};

export default function InvoiceCard({ invoice, project }) {
  const balance = invoice.status === 'paid' ? 0 : Math.max(0, (invoice.total_amount || 0) - (invoice.amount_paid || 0));
  const user = JSON.parse(localStorage.getItem('user'));
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      <Link to={createPageUrl(`InvoiceDetails?id=${invoice.id || invoice._id}`)} className="h-full block">
        <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-300 bg-white cursor-pointer">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-gray-900temp truncate">
                  {invoice.invoice_number}
                </CardTitle>
                <p className="text-sm text-gray-500temp mt-1 truncate">
                  {project ? project.project_name : 'Unknown Project'}
                </p>
              </div>
              <Badge className={statusColors[invoice.status]}>{invoice.status}</Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0 flex-grow flex flex-col justify-between">
            <div>
              <div className="text-center p-4 mb-4 bg-gray50-temp rounded-lg">
                <p className="text-sm text-gray-500temp">Balance Due</p>
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900temp">
                  {formatCurrency(balance)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600temp">
                  <DollarSign className="w-4 h-4" />
                  <span>
                    Total Amount: {formatCurrency(invoice.total_amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600temp">
                  <DollarSign className="w-4 h-4" />
                  <span>
                    Paid: {formatCurrency(invoice.amount_paid)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600temp">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {formatDateUTC(invoice.due_date)}</span>
                </div>
                {invoice.customer_po_number && (
                  <div className="flex items-center gap-2 text-sm text-gray-600temp">
                    <FileText className="w-4 h-4" />
                    <span className="truncate">{invoice.customer_po_number}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end text-sm text-blue-600 font-medium pt-4">
              View Details <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}