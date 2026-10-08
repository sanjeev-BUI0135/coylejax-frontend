import React, { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import { getChecklists, deleteChecklist } from "../../../services/checklistService";
import UploadModal from "../../../components/projects/details/FileUploadModal";
import AddChecklistForm from "../../../components/projects/details/AddChecklistModal";
import EditChecklistForm from "../../../components/projects/details/EditChecklistForm";
import { Upload, Eye, Edit, Trash, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import "../../../App.css";

const Checklist = forwardRef(({ projectId, checklists, setChecklists, tabPermission }, ref) => {
  const [showUploadModal, setShowUploadModal] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Fetch checklist data and update parent state
  const fetchData = async () => {
    if (!projectId) return;
    const res = await getChecklists(projectId);
    setChecklists(res); 
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  // Delete checklist item
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      await deleteChecklist(id);
      fetchData();
      Swal.fire("Deleted!", "Your checklist has been deleted.", "success");
    }
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getChecklists: () => checklists,
    refreshChecklists: fetchData,
  }));

  const getStatusStyle = (status) => {
    if (status === "Completed") return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
    if (status === "Processing") return "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300";
    if (status === "N/A") return "bg-gray-100 text-gray-800temp dark:bg-gray-700 ";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Checklist</CardTitle>
        {tabPermission?.add && <Button
          onClick={() => { projectId && setShowAddForm(true); }}
          size="sm"
          className="bg-black hover:bg-gray-700"
          disabled={!projectId}
        >
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Add Checklist</span>
        </Button>
        }
      </CardHeader>

      <CardContent>
        {checklists?.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
            <h3 className="text-lg font-medium">No Checklist</h3>
            <p className="text-gray-500temp mt-2">Create your first Checklist for this project</p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden">
            <Table>
              <Thead>
                <Tr className="text-left border-b border-gray-200">
                  <Th className='font-medium text-muted-foreground text-sm py-4'>S.No</Th>
                  <Th className='font-medium text-muted-foreground text-sm'>Checklist Name</Th>
                  <Th className='font-medium text-muted-foreground text-sm'>Checklist Status</Th>
                  <Th className='font-medium text-muted-foreground text-sm'>Upload Files</Th>
                  <Th className='font-medium text-muted-foreground text-sm'>Action</Th>
                </Tr>
              </Thead>

              <Tbody>
                {checklists?.map((item, index) => (
                  <Tr key={item._id} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                    <Td className="text-sm py-3 px-2">{index + 1}</Td>

                    <Td className="text-sm py-3 px-2">{item.name}</Td>

                    <Td className="text-sm py-3 px-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium ${getStatusStyle(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </Td>

                    <Td className="text-sm py-3 px-2">
                      <div className="flex items-center gap-2">
                        {tabPermission?.update && (
                          <Button
                            variant="outline"
                            onClick={() => setShowUploadModal({ id: item._id, mode: "upload" })}
                            className="p-2 border border-gray-200 rounded-lg"
                            title="Upload"
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        )}

                        {tabPermission?.update && (<Button
                          variant="outline"
                          onClick={() => setShowUploadModal({ id: item._id, mode: "view" })}
                          className="p-2 border border-gray-200 rounded-lg"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>)}
                      </div>
                    </Td>

                    <Td className="text-sm py-3 px-2">
                      <div className="flex items-center gap-2">
                        {tabPermission?.update && (
                          <Button
                            variant="outline"
                            onClick={() => setEditItem(item)}
                            className="p-2 border border-gray-200 rounded-lg"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}

                        {tabPermission?.delete && (
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(item._id)}
                            className="p-2 border border-gray-200 rounded-lg text-red-600"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </CardContent>

      {showUploadModal && (
        <UploadModal
          checklistId={showUploadModal.id}
          mode={showUploadModal.mode}
          onClose={() => setShowUploadModal(null)}
        />
      )}

      {showAddForm && (
        <AddChecklistForm
          projectId={projectId}
          onClose={() => setShowAddForm(false)}
          refresh={fetchData}
        />
      )}

      {editItem && (
        <EditChecklistForm
          checklist={editItem}
          onClose={() => setEditItem(null)}
          refresh={fetchData}
        />
      )}
    </Card>
  );
});

export default Checklist;