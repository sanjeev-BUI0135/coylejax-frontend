import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Scale } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { formatDateUTC } from '../../../utils/formatdate';

export default function ProjectFinancials({ project, estimates, invoices, payments, laborEntries }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded shadow-lg text-sm text-gray-900 dark:text-gray-100">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name} : {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const financialSummary = useMemo(() => {
    const totalRevenue = (payments || [])
      .filter(p => p.status === 'received')
      .reduce((sum, p) => sum + (Number(p.amount || 0)), 0);

    const totalCosts = (estimates || [])
      .filter(est => est.status === 'approved')
      .reduce((sum, est) => sum + (est.total_amount || 0), 0);
    const profit = totalRevenue - totalCosts;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const costBreakdownData = [
      { name: 'Invoices Total', value: totalCosts }
    ];

    // Timeline data for revenue vs cost
    const timelineEvents = [];
    (payments || []).filter(p => p.status === 'received').forEach(p => {
      timelineEvents.push({ date: new Date(p.payment_date), revenue: Number(p.amount || 0), cost: 0 });
    });
    // (laborEntries || []).forEach(e => {
    //   timelineEvents.push({ date: new Date(e.date), revenue: 0, cost: e.total_cost || 0 });
    // });
    (invoices || [])
      .filter(inv => ['sent', 'paid', 'partial'].includes(inv.status))
      .forEach(inv => {
        timelineEvents.push({
          date: new Date(inv.issue_date),
          revenue: 0,
          cost: inv.total_amount || 0
        });
      });

    timelineEvents.sort((a, b) => a.date - b.date);

    let cumulativeRevenue = 0;
    let cumulativeCost = 0;
    const revenueVsCostData = timelineEvents.map(event => {
      cumulativeRevenue += event.revenue;
      cumulativeCost += event.cost;
      return {
        date: formatDateUTC(event.date),
        Revenue: cumulativeRevenue,
        Cost: cumulativeCost,
      };
    });

    // Deduplicate dates for chart
    const uniqueDateData = Array.from(new Map(revenueVsCostData.map(item => [item.date, item])).values());


    return { totalRevenue, totalCosts, profit, margin, costBreakdownData, revenueVsCostData: uniqueDateData };
  }, [estimates, invoices, payments, laborEntries]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">From {payments.length} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(financialSummary.totalCosts)}</div>
            <p className="text-xs text-muted-foreground">Estimated value</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialSummary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(financialSummary.profit)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue - Total Costs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialSummary.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {financialSummary.margin.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">Based on total revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>How project costs are distributed.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={financialSummary.costBreakdownData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatCurrency} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs. Cost Over Time</CardTitle>
            <CardDescription>Cumulative financial performance of the project.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={financialSummary.revenueVsCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis width={90}  tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="Revenue" stackId="1" stroke="#16a34a" fill="#dcfce7" />
                <Area type="monotone" dataKey="Cost" stackId="1" stroke="#dc2626" fill="#fee2e2" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
