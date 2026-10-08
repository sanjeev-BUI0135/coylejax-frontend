import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  subMonths,
  startOfMonth,
  format,
  isSameMonth,
} from "date-fns";
import { formatSafeDate } from "@/utils/dateUtils";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

export default function RevenueChart({ payments = [], loading = false }) {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [tempMonth, setTempMonth] = useState(selectedMonth);
  useEffect(() => {
    setTempMonth(selectedMonth);
  }, [selectedMonth]);


  const chartData = useMemo(() => {
    const months = [];
    const baseDate = selectedMonth;

    for (let i = 5; i >= 0; i--) {
      const date = startOfMonth(subMonths(baseDate, i));
      months.push({
        month: formatSafeDate(date, "MMM yyyy"),
        revenue: 0,
        date,
      });
    }

    payments.forEach((payment) => {
      if (payment.status === "received" && payment.payment_date) {
        const paymentDate = new Date(payment.payment_date);
        const monthData = months.find((m) => isSameMonth(m.date, paymentDate));
        if (monthData) {
          monthData.revenue += Number(payment.amount) || 0;
        }
      }
    });

    return months;
  }, [payments, selectedMonth]);

  const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-white p-2 rounded shadow">
        <p className="text-sm font-semibold dark:text-black">
          {label}
        </p>
        <p className="text-blue-500 dark:text-black">
          Revenue: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue Trend</CardTitle>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedMonth, "MMM yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="end">
            <Calendar
              mode="single"
              selected={selectedMonth}
              onSelect={(date) => {
                if (date) {
                  setSelectedMonth(date);
                }
              }}
              disabled={(date) => date > new Date()}
              className="rounded-md border"
            />
          </PopoverContent>
        </Popover>
      </CardHeader>

      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}