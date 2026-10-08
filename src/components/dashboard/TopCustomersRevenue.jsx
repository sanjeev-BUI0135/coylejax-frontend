import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function TopCustomersRevenue({
  customers = [],
  projects = [],
}) {
  const topCustomers = useMemo(() => {
    const data = customers
      .map((customer) => {
        const revenue = projects
          .filter(
            (p) =>
              p.customer_id === customer.id ||
              p.customer_ids?.some(
                (c) => c._id === customer.id
              )
          )
          .reduce(
            (sum, p) =>
              sum + Number(p.estimated_value || 0),
            0
          );

        return {
          name:
            customer.company_name ||
            customer.contact_name,
          revenue,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return data;
  }, [customers, projects]);

  const maxRevenue =
    topCustomers[0]?.revenue || 1;

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-1">
          Top Contacts by Revenue
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-[200px] text-xs font-normal">Top 5 customers ranked by total estimated value of their projects.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>

        <Link
          to="/customers"
          className="text-sm font-semibold text-blue-600"
        >
          View
        </Link>
      </CardHeader>

      <CardContent className="space-y-6">
        {topCustomers.map((customer) => (
          <div key={customer.name}>
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-gray-800">
                {customer.name}
              </span>

              <span className="font-bold">
                $
                {customer.revenue.toLocaleString()}
              </span>
            </div>

            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${(customer.revenue /
                      maxRevenue) *
                    100
                    }%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}