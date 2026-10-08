import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import "../../../App.css";
import { useState, useEffect } from 'react';
import api from "../../../services/masterDataService";
import { formatDateUTC } from '../../../utils/formatdate';
import { InventoryItem } from '@/api/entities';

const categoryColors = {
  materials: "bg-blue-100 text-blue-800",
  equipment: "bg-green-100 text-green-800",
  tools: "bg-purple-100 text-purple-800",
  supplies: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-800temp"
};

export default function ProjectInventory({ project }) {
  // Get allocated materials from project data
  const allocatedMaterials = project?.allocated_materials || [];

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [catRes, locRes, invRes] = await Promise.all([
          api.getAll("categories"),
          api.getAll("locations"),
          InventoryItem.list()
        ]);

        setCategories(catRes.data);
        setLocations(locRes.data);
        setInventoryItems(Array.isArray(invRes) ? invRes : Array.isArray(invRes?.data) ? invRes.data : []);

      } catch (err) {
        console.error(err);
      }
    };

    loadMasterData();
  }, []);

  const getMasterName = (list, value) => {
    const found = list.find((i) => i.value === value);
    return found?.display_name || value;
  };

  if (!allocatedMaterials || allocatedMaterials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Inventory Allocated</h3>
            <p className="text-gray-500temp mt-2">
              Fulfill items from material orders to allocate them to this project.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Inventory ({allocatedMaterials.length} items)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <Thead>
            <Tr className="text-left border-b border-gray-200">
              <Th className='font-medium text-muted-foreground text-sm py-4'>Item Name</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Description</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Category</Th>
              <Th className="font-medium text-muted-foreground text-sm">Quantity</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Unit</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Location</Th>
              <Th className='font-medium text-muted-foreground text-sm'>Allocated Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {allocatedMaterials.map((material, index) => (
              <Tr key={index} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                <Td className="font-medium text-sm py-3 px-2">{material.item_name}</Td>
                <Td className="text-sm text-gray-600temp py-3 px-2">
                  {(() => {
                    const itemId = typeof material.inventory_item_id === 'object' && material.inventory_item_id !== null
                      ? (material.inventory_item_id?._id || material.inventory_item_id?.id)
                      : material.inventory_item_id;
                      
                    if (itemId) {
                      return inventoryItems.find(i => i._id === itemId)?.description || material.description || '-';
                    }
                    return material.description || '-';
                  })()}
                </Td>
                <Td className="text-sm py-3 px-2">
                  <Badge className={categoryColors[material.category] || categoryColors.other}>
                     {getMasterName(categories, material.category)}
                  </Badge>
                </Td>
                <Td className="text-center text-sm font-semibold py-3 px-2">{material.quantity}</Td>
                <Td className="text-sm py-3 px-2">{material.unit}</Td>
                <Td className="text-sm py-3 px-2">{getMasterName(locations, material.location) || "Project Site"}</Td>
                <Td className="text-sm text-gray-600temp py-3 px-2">
                  {material.allocated_date
                    ? formatDateUTC(material.allocated_date)
                    : '-'
                  }
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </CardContent>
    </Card>
  );
}