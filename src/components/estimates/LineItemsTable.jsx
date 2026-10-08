import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import "../../App.css";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { Plus, Trash, Search, ArrowUp, ArrowDown, AlertCircle, Sparkles } from "lucide-react"
import { createPortal } from "react-dom"
import PlanScanAIModal from "../PlanscanAI/planscanModel"

export default function LineItemsTable({
    formData,
    inventoryCategories,
    isCrewView,
    showInventorySearch,
    setShowInventorySearch,
    inventorySearchTerm,
    setInventorySearchTerm,
    filteredInventoryItems,
    inputRefs,
    addLineItem,
    updateLineItem,
    selectInventoryItem,
    removeLineItem,
    filteredMarkupdata,
    divisionType,
    divisionTypes,
    onPlanScanSave,
    addSection,
}) {
    const [showPlanScan, setShowPlanScan] = useState(false);
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);

    const formatUSD = (value) => {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(value || 0));
    };
    const isMarkupAllowed = (categoryValue) => {
        const category = inventoryCategories.find(
            c => c.value === categoryValue
        );
        return category?.tax_added !== false;
    };

    const materialCategory = inventoryCategories.find((category) => {
        const value = String(category.value || "").toLowerCase();
        const displayName = String(category.display_name || "").toLowerCase();

        return value === "material" ||
            value === "materials" ||
            displayName === "material" ||
            displayName === "materials";
    }) || { value: "materials", display_name: "Materials" };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <div className="flex items-center gap-2">
                    {!isCrewView && (
                        <button
                            type="button"
                            onClick={() => setShowPlanScan(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-violet-300 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium transition-colors dark:bg-blue-900/20 dark:violet-blue-600 dark:violet-blue-300 dark:hover:bg-blue-900/40"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Glacier AI
                        </button>
                    )} 
                    <span
                        className="px-2 py-1.5 bg-gray-800 text-white rounded-md flex space-x-1 text-sm items-center cursor-pointer"
                        onClick={() => { addSection(selectedRowIndex); setSelectedRowIndex(null); }}
                    >
                        <Plus className="w-3 h-3 mr-2" />
                        Add Section
                    </span>
                    <span
                        className="px-2 py-1.5 bg-gray-800 text-white rounded-md flex space-x-1 text-sm items-center cursor-pointer"
                        onClick={() => { addLineItem(selectedRowIndex); setSelectedRowIndex(null); }}
                    >
                        <Plus className="w-3 h-3 mr-2" />
                        Add Item
                    </span>
                </div>
            </div>

            {showPlanScan && (
                <PlanScanAIModal
                    divisionType={divisionType}
                    divisionTypes={divisionTypes}
                    defaultCategory={materialCategory}
                    onClose={() => setShowPlanScan(false)}
                    onSave={(payload) => {
                        setShowPlanScan(false);
                        if (onPlanScanSave) onPlanScanSave(payload);
                    }}
                />
            )}

            <Table className="responsiveTable2">
                <Thead>
                    <Tr className="text-left border-b border-gray-200 ">
                        <Th className='font-medium text-muted-foreground text-sm py-2'>Category</Th>
                        <Th className='font-medium text-muted-foreground text-sm py-1'>Description</Th>
                        <Th className='font-medium text-muted-foreground text-sm py-1'>Qty</Th>
                        <Th className='font-medium text-muted-foreground text-sm py-1'>Unit</Th>
                        {!isCrewView && <Th className='font-medium text-muted-foreground text-sm py-1'>Price</Th>}
                        {!isCrewView && <Th className='font-medium text-muted-foreground text-sm py-1'>Markup %</Th>}
                        {!isCrewView && <Th className='font-medium text-muted-foreground text-sm py-1'>Total</Th>}
                        <Th></Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {(formData.line_items || []).map((item, index) => {
                        const isSelected = selectedRowIndex === index;
                        const rowClass = `border-b border-gray-200 ${isSelected ? "" : (index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d]" : "bg-white dark:bg-[#303a42]")}`;

                        if (item.is_section) {
                            return (
                                <Tr key={index} className={rowClass} onClick={() => setSelectedRowIndex(selectedRowIndex === index ? null : index)}>
                                    <Td colSpan={!isCrewView ? "7" : "4"} className="text-sm py-3 px-2">
                                        <Input
                                            value={item.description}
                                            onChange={e => updateLineItem(index, "description", e.target.value)}
                                            placeholder="Section Title"
                                            className="w-full font-semibold text-md text-left focus:ring-1 focus:ring-blue-500"
                                        />
                                    </Td>
                                    <Td>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            onClick={(e) => { e.stopPropagation(); removeLineItem(index); }}
                                        >
                                            <Trash className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </Td>
                                </Tr>
                            );
                        }

                        return (
                            <Tr key={index} className={rowClass} onClick={() => setSelectedRowIndex(selectedRowIndex === index ? null : index)}>
                                <Td className="text-sm py-3 px-1">
                                    <Select
                                        value={item.category}
                                        onValueChange={v =>
                                            updateLineItem(index, "category", v)
                                        }
                                    >
                                        <SelectTrigger className="md:w-32 h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {inventoryCategories.map(cat => (
                                                <SelectItem
                                                    key={cat.value}
                                                    value={cat.value}
                                                >
                                                    {cat.display_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Td>

                                <Td className="align-top text-sm py-3">
                                    <div className="relative w-full">
                                        <div className="flex items-center gap-2">
                                            <Textarea
                                            ref={el => (inputRefs.current[index] = el)}
                                            value={item.description}
                                            onChange={e =>
                                                updateLineItem(
                                                    index,
                                                    "description",
                                                    e.target.value
                                                )
                                            }
                                            onFocus={() => setShowInventorySearch(null)}
                                            placeholder="Description"
                                            className="w-full h-[35px] resize-none rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                            required
                                        />

                                        <span className="text-gray-400 border border-1.5 shadow border-gray-300 rounded-md p-2.5 cursor-pointer"
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setShowInventorySearch(
                                                    showInventorySearch === index
                                                        ? null
                                                        : index
                                                )
                                            }
                                            title="Search inventory"
                                        >
                                            <Search className="w-4 h-4" />
                                        </span>
                                    </div>

                                    {showInventorySearch === index &&
                                        createPortal(
                                            <div
                                                className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col w-[90%] sm:w-[400px]"
                                                style={{
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    maxHeight: 320
                                                }}
                                            >
                                                {/* Search Bar */}
                                                <div className="p-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                                    <Input
                                                        className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                                                        placeholder="Search inventory items..."
                                                        value={inventorySearchTerm}
                                                        onChange={e =>
                                                            setInventorySearchTerm(
                                                                e.target.value
                                                            )
                                                        }
                                                        autoFocus
                                                    />
                                                </div>

                                                {/* List */}
                                                <div className="max-h-52 overflow-y-auto">
                                                    {filteredInventoryItems.length >
                                                        0 ? (
                                                        filteredInventoryItems.map(i => (
                                                            <div
                                                                key={i._id || i.id}
                                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-700 last:border-b-0"
                                                                onClick={() =>
                                                                    selectInventoryItem(index, i)
                                                                }
                                                            >
                                                                {formData.line_items[index]?.category?.toLowerCase() ===
                                                                    "labor" ? (
                                                                    <>
                                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                                            {i.display_name}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                            Rate: ${i.hourly_rate}
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                                            {i.item_name}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                            {i.description && (
                                                                                <span>
                                                                                    {i.description} •{" "}
                                                                                </span>
                                                                            )}
                                                                            <span>
                                                                                Qty: {i.quantity}{" "}
                                                                                {i.unit || "unit"}
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                                                            No items found
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div className="p-2 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                                    <Button
                                                        className="w-full"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowInventorySearch(null)
                                                            setInventorySearchTerm("")
                                                        }}
                                                    >
                                                        Close
                                                    </Button>
                                                </div>
                                            </div>,
                                            document.body
                                        )}
                                </div>
                            </Td>

                            <Td className="text-sm py-3">
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={item.quantity}
                                    onChange={e =>
                                        updateLineItem(
                                            index,
                                            "quantity",
                                            e.target.value
                                        )
                                    }
                                    onFocus={() => setShowInventorySearch(null)}
                                    className="md:w-20"
                                />
                            </Td>

                            <Td className="text-sm py-3 ">
                                <Input
                                    value={item.unit}
                                    onChange={e =>
                                        updateLineItem(
                                            index,
                                            "unit",
                                            e.target.value
                                        )
                                    }
                                    className="md:w-20"
                                />
                            </Td>

                            {!isCrewView && (
                                <Td className="text-sm py-3">
                                    <div className="flex items-center gap-2 min-h-[36px]">
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={e =>
                                                updateLineItem(index, "unit_price", e.target.value)
                                            }
                                            className="md:w-24"
                                        />

                                        {item.original_unit_price != null &&
                                            item.unit_price > item.original_unit_price && (
                                                <ArrowUp className="w-4 h-4 text-green-500" />
                                            )}

                                        {item.original_unit_price != null &&
                                            item.unit_price < item.original_unit_price && (
                                                <ArrowDown className="w-4 h-4 text-red-500" />
                                            )}
                                    </div>
                                </Td>
                            )}

                            {!isCrewView && (
                                <Td className="text-sm py-3">
                                    {(() => {
                                        const isAllowed = isMarkupAllowed(item.category);
                                        const markup = parseFloat(item.markup_percentage) || 0;
                                        const isLowMarkup =
                                            (parseFloat(markup)) > 0 &&
                                            (parseFloat(markup)) < (filteredMarkupdata?.[0]?.markup_line_item);

                                        return (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={isAllowed ? item.markup_percentage : 0}
                                                    onChange={(e) =>
                                                        updateLineItem(index, "markup_percentage", e.target.value)
                                                    }
                                                    className={`w-20 
                                                            ${!isAllowed
                                                            ? "bg-gray-100 cursor-not-allowed"
                                                            : isLowMarkup
                                                                ? "border-yellow-500 bg-yellow-50"
                                                                : ""
                                                        }`}
                                                    disabled={!isAllowed}
                                                />

                                                {isLowMarkup && (
                                                    <AlertCircle
                                                        className="w-4 h-4 text-yellow-600"
                                                        title="Markup below 20%"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })()}
                                </Td>
                            )}

                            {!isCrewView && (
                                <Td className="text-sm py-3">
                                    ${formatUSD(item.total)}
                                </Td>
                            )}

                            {!isCrewView && (
                                <Td>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() =>
                                            removeLineItem(index)
                                        }
                                    >
                                        <Trash className="w-4 h-4 text-red-500" />
                                    </Button>
                                </Td>
                            )}
                        </Tr>
                    )})}
                </Tbody>
            </Table>
        </div>
    )
}
