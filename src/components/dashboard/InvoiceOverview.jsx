import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const formatCurrency = (amount = 0) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }

  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }

  return `$${Math.round(amount)}`;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg p-4">
      <p className="font-bold mb-3 text-slate-900 dark:text-white">{label}</p>

      {payload.map((item) => (
        <div
          key={item.dataKey}
          className="mb-1 text-slate-700 dark:text-slate-200"
          style={{ color: item.color }}
        >
          <span className="font-medium capitalize">
            {item.dataKey}
          </span>
          :{" "}
          <span className="font-bold text-slate-900 dark:text-white">
            $
            {Number(item.value).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function InvoiceOverview({
  payments = [],
  invoices = [],
}) {
  const data = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return months.map((month, index) => {
      const paidAmount = payments
        .filter((p) => {
          if (p.status && p.status !== "received") return false;
          const d = new Date(p.payment_date || p.createdAt);
          return d.getMonth() === index;
        })
        .reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );

      const invoicesList = Array.isArray(invoices) ? invoices : (invoices?.data || []);

      return {
        month,

        invoiced: invoicesList
          .filter((inv) => {
            const d = new Date(inv.issue_date || inv.createdAt);
            return d.getMonth() === index;
          })
          .reduce(
            (sum, inv) => sum + Number(inv.total_amount || 0),
            0
          ),

        paid: paidAmount,

        overdue: invoicesList
          .filter((inv) => {
            const d = new Date(inv.issue_date || inv.createdAt);
            return (
              d.getMonth() === index &&
              ["overdue", "partial"].includes((inv.status || "").toLowerCase())
            );
          })
          .reduce(
            (sum, inv) =>
              sum +
              Number(
                (inv.total_amount || 0) -
                (inv.amount_paid || 0)
              ),
            0
          ),
      };
    });
  }, [payments]);

  const totals = {
    invoiced: Math.round(
      data.reduce(
        (sum, item) => sum + item.invoiced,
        0
      )
    ),
    paid: Math.round(
      data.reduce(
        (sum, item) => sum + item.paid,
        0
      )
    ),
    overdue: Math.round(
      data.reduce(
        (sum, item) => sum + item.overdue,
        0
      )
    ),
  };

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-1">
          Invoices Overview
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs font-normal">Monthly comparison of total invoiced amounts vs payments received over the last 12 months.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>

        <Link
          to="/invoices"
          className="text-sm font-semibold text-blue-600"
        >
          View All
        </Link>
      </CardHeader>

      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <div className="text-sm font-bold">
              {formatCurrency(
                totals.invoiced
              )}
            </div>
            <div className="text-xs font-semibold text-gray-500">
              Total Invoiced
            </div>
          </div>

          <div>
            <div className="text-sm font-bold">
              {formatCurrency(totals.paid)}
            </div>
            <div className="text-xs font-semibold text-gray-500">
              Paid
            </div>
          </div>

          <div>
            <div className="text-sm font-bold">
              {formatCurrency(
                totals.overdue
              )}
            </div>
            <div className="text-xs font-semibold text-gray-500">
              Overdue
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[260px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 12,
                  fontWeight: 600,
                }}
                tickLine={false}
                axisLine={false}
              />

              <YAxis
                tickFormatter={(value) =>
                  `$${Math.round(
                    value / 1000
                  )}K`
                }
                tick={{
                  fontSize: 12,
                  fontWeight: 600,
                }}
                tickLine={false}
                axisLine={false}
              />

              <RechartsTooltip content={<CustomTooltip />} />

              <Line
                type="monotone"
                dataKey="invoiced"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />

              <Line
                type="monotone"
                dataKey="paid"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />

              <Line
                type="monotone"
                dataKey="overdue"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-8 mt-5 text-sm font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            Invoiced
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            Paid
          </div>

          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            Overdue
          </div>
        </div>
      </CardContent>
    </Card>
  );
}