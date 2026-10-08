import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { formatDateUTC } from "../../utils/formatdate";

export default function InvoicePayments({ payments, onAddPayment }) {

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment History</h2>
      </div>

      <div className="space-y-3">
        {payments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-12 text-center text-gray-500 dark:text-gray-400">
            No payments recorded yet.
          </div>
        ) : (
          payments.map((p) => (
            <div key={p.id || p._id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-md md:text-lg font-bold text-gray-900 dark:text-white capitalize">
                      {p.payment_type || 'Payment'}
                    </span>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2.5 py-0.5 text-xs font-semibold rounded-md">
                      {p.status || 'Completed'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-[15px] text-gray-500 dark:text-gray-400">
                    <span>{formatDateUTC(p.payment_date)}</span>
                    <span className="capitalize">{p.payment_method?.replace('_', ' ')}</span>
                    {p.reference_number && (
                      <span className="text-gray-400 dark:text-gray-500 break-all">Ref: {p.reference_number}</span>
                    )}
                  </div>

                  <div className="text-[15px] text-gray-400 dark:text-gray-500 mt-1">
                    {p.notes || `Payment for Invoice`}
                  </div>
                </div>

                <div className="text-md md:text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(p.amount)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}