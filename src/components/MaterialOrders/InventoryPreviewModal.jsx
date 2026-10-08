import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function InventoryPreviewModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle>Inventory Preview</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 text-sm">
          <p><strong>Name:</strong> {item.item_name}</p>
          <p><strong>Category:</strong> {item.category}</p>
          <p><strong>Quantity Orderd:</strong> {item.quantity_ordered || 0}</p>
          <p><strong>Quantity Received:</strong> {item.quantity_received || 0}</p>
          <p><strong>Unit:</strong> {item.unit}</p>
          <p><strong>Unit Cost:</strong> ${item.unit_cost}</p>
          <p><strong>Location:</strong> {item.location}</p>

          <div className="flex justify-end mt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}