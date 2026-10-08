import { formatCurrency } from "@/lib/utils";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import "../../App.css";

export default function InvoiceLineItems({
  invoice,
  categories,
  filteredMarkupdata,
  additionalMarkupAmount,
  balanceDue,
  amountPaid
}) {
  const getCategoryName = (value) => {
    const found = categories?.find((c) => c.value === value);
    return found?.display_name || value;
  };
  return (
    <div className="bg-white rounded-xl shadow border p-6 mt-4  dark:bg-[#1f2937]">

      <h2 className="text-xl font-semibold mb-6">Invoice Line Items</h2>

      {/* ===== RESPONSIVE TABLE ===== */}
      <div className="rounded-lg overflow-hidden">
        <Table className="rsp-table w-full">

          <Thead className="bg-blue-600 text-white">
            <Tr>
              <Th className="px-4 py-3 text-left">Category</Th>
              <Th className="px-4 py-3 text-left">Description</Th>
              <Th className="px-4 py-3 text-right">Total</Th>
            </Tr>
          </Thead>

          <Tbody>
            {invoice?.line_items?.map((item, index) => {
              if (item.is_section) {
                return (
                  <Tr key={index} className="bg-gray-100 dark:bg-slate-800">
                    <Td colSpan={3} className="px-4 py-3 text-left font-semibold text-gray-800 dark:text-white">
                      {item.description}
                    </Td>
                  </Tr>
                );
              }

              return (
                <Tr key={index} className="bg-white dark:bg-slate-800 dark:text-slate-200">
  
                  <Td data-label="Category" className="px-4 py-3 whitespace-normal break-all">
                   {getCategoryName(item.category)}
                  </Td>
  
                  <Td data-label="Description" className="px-4 py-3 whitespace-pre-line break-words">
                    {item.description}
                  </Td>
  
                  <Td
                    data-label="Total"
                    className="px-4 py-3 text-right font-semibold"
                  >
                    {formatCurrency(item.total)}
                  </Td>
  
                </Tr>
              );
            })}
          </Tbody>

        </Table>
      </div>

      {/* ===== TOTALS ===== */}
      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-sm space-y-3">

          <div className="flex justify-between border-b dark:border-slate-700 pb-2">
            <span className="text-gray-600 dark:text-gray-300">
              {filteredMarkupdata?.[0]?.value ?? "Additional Markup"} :
            </span>
            <span className="font-semibold dark:text-white">
              {formatCurrency(additionalMarkupAmount)}
            </span>
          </div>

          <div className="flex justify-between border-b dark:border-slate-700 pb-2">
            <span className="text-gray-600 dark:text-gray-300">Subtotal :</span>
            <span className="font-semibold dark:text-white">
              {formatCurrency(invoice?.subtotal)}
            </span>
          </div>

          <div className="flex justify-between border-b dark:border-slate-700 pb-2">
            <span className="text-gray-600 dark:text-gray-300">
              Tax ({((invoice?.tax_rate || 0) * 100).toFixed(1)}%)
            </span>
            <span className="font-semibold dark:text-white">
              {formatCurrency(invoice?.tax_amount)}
            </span>
          </div>

          <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-900/20 px-4 rounded-lg">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">Total :</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(invoice?.total_amount)}
            </span>
          </div>

          <div className="flex justify-between text-green-600 font-bold">
            <span>Amount Paid</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>

          <div className="flex justify-between text-red-600 font-bold">
            <span>Balance Due</span>
            <span>{formatCurrency(balanceDue)}</span>
          </div>

        </div>
      </div>

    </div>
  );
}