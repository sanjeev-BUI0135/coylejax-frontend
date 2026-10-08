import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Phone, MapPin, Edit, Trash } from "lucide-react";

export default function SupplierCard({ 
  supplier, 
  onEdit, 
  onDelete, 
  canDelete, 
  canUpdate,
  selectedItems = [],
  onSelectItem,
  totalFilteredCount
}) {
  const someSelected = selectedItems.length > 0 && selectedItems.length < totalFilteredCount;
  const isSelected = selectedItems.includes(supplier._id);

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
                onCheckedChange={(checked) => onSelectItem(supplier._id, checked)}
                className="mt-1"
                onClick={(e) => e.stopPropagation()}
              />}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold text-gray-900temp truncate">
                  {supplier.company_name}
                </CardTitle>
                <p className="text-sm text-gray-500temp mt-1">{supplier.contact_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
              <span className="truncate">{supplier.email}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600temp">
              <Phone className="w-4 h-4" />
              <span>{supplier.phone}</span>
            </div>
            
            {supplier.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600temp">
                <MapPin className="w-4 h-4" />
                <span className="break-all min-w-0">{supplier.address}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}