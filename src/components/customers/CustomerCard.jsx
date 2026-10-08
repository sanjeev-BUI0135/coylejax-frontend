import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, MapPin, Edit, Trash, CreditCard, Paperclip } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { renderTextWithLinks } from "../ui/renderTextWithLinks";

const customerTypeColors = {
  residential: "bg-blue-100 text-blue-800",
  commercial: "bg-green-100 text-green-800",
  industrial: "bg-purple-100 text-purple-800"
};

const stripHtml = (html) => {
  if (!html) return "";
  return html.replace(/<[^>]*>?/gm, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
};

export default function CustomerCard({
  customer,
  onEdit,
  onDelete,
  canDelete,
  canUpdate,
  selectedItems = [],
  onSelectItem,
  totalFilteredCount
}) {
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalFilteredCount;
  const isSelected = selectedItems.includes(customer.id || customer._id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      <Card className="h-full hover:shadow-lg transition-all duration-300 flex flex-col bg-white border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1 min-w-0">
             {canDelete && <Checkbox
                indeterminate={someSelected}
                checked={isSelected}
                onCheckedChange={(checked) => onSelectItem(customer.id || customer._id, checked)}
                className="mt-1"
                onClick={(e) => e.stopPropagation()}
              />}
              <div className="flex-1 min-w-0">
                <Link
                  to={createPageUrl(`CustomerDetails?id=${customer.id || customer._id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CardTitle className="text-lg font-semibold text-blue-600 truncate hover:text-blue-600">
                    {customer.company_name}
                  </CardTitle>
                </Link>
                <p className="text-sm text-gray-500temp mt-1">{customer.contact_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={customerTypeColors[customer.customer_type]}>
                {customer.customer_type}
              </Badge>

              {canUpdate && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => onEdit(e)}
                  className="h-8 w-8"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}

              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => onDelete(e)}
                  className="h-8 w-8"
                >
                  <Trash className="w-4 h-4 text-red-600" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 flex-grow">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600temp">
              <Mail className="w-4 h-4" />
              <span className="truncate">{customer.email}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600temp">
              <Phone className="w-4 h-4" />
              <span>{customer.phone}</span>
            </div>

            {customer.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600temp">
                <MapPin className="w-4 h-4" />
                <span className="truncate">
                  {customer.address}
                  {customer.city && `, ${customer.city}`}
                  {customer.state && `, ${customer.state}`}
                </span>
              </div>
            )}

            {customer.billing_information && (
              <div className="flex items-center gap-2 text-sm text-gray-600temp pt-2 border-t">
                <CreditCard className="w-4 h-4" />
                <span className="truncate"> {renderTextWithLinks(stripHtml(customer.billing_information))}</span>
              </div>
            )}

            {customer.file_attachments && customer.file_attachments.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600temp pt-2 border-t">
                <Paperclip className="w-4 h-4" />
                <span>{customer.file_attachments.length} attachment(s)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}