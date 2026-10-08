import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { DollarSign, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import "../../../App.css";
import { formatDateUTC } from '../../../utils/formatdate';

const statusConfig = {
  pending: { label: "Pending", color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  received: { label: "Received", color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: "Failed", color: 'bg-red-100 text-red-800', icon: XCircle },
  refunded: { label: "Refunded", color: 'bg-gray-100 text-gray-800temp', icon: RotateCcw },
};

const paymentTypeLabels = {
  deposit: "Deposit",
  progress: "Progress Payment",
  final: "Final Payment",
  change_order: "Change Order"
};

export default function ProjectPayments({
  payments,
  invoices,
  projectTotal,
  onNewPayment
}) {
  const totalReceived = payments
    .filter(p => p.status === 'received')
    .reduce((sum, p) => sum + (Number(p.amount || 0)), 0);

  if (!payments || payments.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payments</CardTitle>
          {/* <Button onClick={() => onNewPayment()} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Record Payment
          </Button> */}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Payments</h3>
            <p className="text-gray-500temp mt-2">Record your first payment for this project</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Payments</CardTitle>
          <div className="text-sm text-gray-500temp mt-1">
            Total Received: ${totalReceived.toLocaleString()}
            {projectTotal > 0 && (
              <span> of ${projectTotal.toLocaleString()}</span>
            )}
          </div>
        </div>
        {/* <Button onClick={() => onNewPayment()} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Record Payment
        </Button> */}
      </CardHeader>
      <CardContent>
        <Table>
          <Thead className="text-left border-b border-gray-200">
            <Tr className="">
              <Th className='font-medium text-muted-foreground text-sm py-3'>Amount</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Method</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Date</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Status</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Reference</Th>
            </Tr>
          </Thead>
          <Tbody>
            {payments.map((payment, index) => {
              const config = statusConfig[payment.status] || statusConfig.pending;

              return (
                <Tr key={payment.id} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white text-left dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white text-left dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                  <Td className="font-medium text-sm px-2 py-3 md:py-2">
                    ${(Number(payment.amount || 0)).toLocaleString()}
                  </Td>
                  <Td className="capitalize text-sm px-2 py-3 md:py-4">
                    {payment.payment_method?.replace('_', ' ')}
                  </Td>
                  <Td className="text-sm px-2 py-3 md:py-0">
                    {payment.payment_date
                      ? formatDateUTC(payment.payment_date)
                      : 'N/A'
                    }
                  </Td>
                  <Td className="text-sm px-2 py-3 md:py-0">
                    <Badge className={config.color}>
                      <config.icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </Td>
                  <Td className="text-sm px-2 py-3 md:py-0">
                    {payment.reference_number || 'N/A'}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </CardContent>
    </Card>
  );
}