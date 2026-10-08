import React from "react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash, GitBranch, Plus } from "lucide-react";
import Swal from "sweetalert2";
import "../../../App.css";

const SubProjectsTab = ({
  subProjects,
  tabPermission,
  onCreateSubProject,
  onDeleteSubProject,
  onViewSubProject,
  statusConfig,
  priorityColors,
}) => {

  const user = JSON.parse(localStorage.getItem("user"));

  const handleDelete = async (subProjectId) => {
    if (!tabPermission?.delete) {
      return Swal.fire({
        title: 'Permission Denied',
        text: 'You do not have permission to delete sub-projects.',
        icon: 'warning',
      });
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this sub-project?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      onDeleteSubProject(subProjectId);
    }
  };

  if (subProjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sub-Projects</CardTitle>
          <CardDescription>Manage sub-projects under this main project</CardDescription>
        </CardHeader>
        <CardContent>
          {
            tabPermission?.add && <div className="text-center py-8">
              <GitBranch className="w-12 h-12 text-gray-400temp mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900temp">No Sub-Projects</h3>
              <p className="text-gray-500temp mt-2">Create sub-projects to organize work packages</p>
              <Button onClick={onCreateSubProject} className="mt-4">
                <Plus className="w-4 h-4 mr-2" /> Create First Sub-Project
              </Button>
            </div>
          }
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Sub-Projects</CardTitle>
            <CardDescription>Manage sub-projects under this main project</CardDescription>
          </div>
          {tabPermission?.add && (
            <Button onClick={onCreateSubProject}>
              <Plus className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Create Sub-Project</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <Thead className="text-left border-b border-gray-200">
            <Tr>
              <Th className="h-10 font-medium text-muted-foreground text-sm py-4">Project Number</Th>
              <Th className="h-10 font-medium text-muted-foreground text-sm">Sub-Project Name</Th>
              <Th className="h-10 font-medium text-muted-foreground text-sm">Status</Th>
              <Th className="h-10 font-medium text-muted-foreground text-sm">Priority</Th>
              {user?.role_type !== "Crew View" && (<Th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-sm">Estimated Value </Th>)}
              <Th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground text-sm">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {subProjects.map((subProj, index) => {
              const subConfig = statusConfig[subProj.status] || statusConfig.open_bids;
              return (
                <Tr key={subProj._id || subProj.id || index} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-blue-50 md:bg-white align-middle dark:bg-[#383b3d] md:dark:bg-[#1f2937]" : "bg-white align-middle dark:bg-[#303a42] md:dark:bg-[#1f2937]"}`}>
                  <Td className="font-medium text-sm py-3 px-3 md:py-4">{subProj.project_number}</Td>
                  <Td className="text-sm py-3 px-3">{subProj.sub_project_name}</Td>
                  <Td className="text-sm px-3 py-3">
                    <Badge className={subConfig.color}>
                      {subConfig.icon && <subConfig.icon className="w-3 h-3 mr-1 " />}
                      {subConfig.label}
                    </Badge>
                  </Td>
                  <Td className="text-sm px-3 py-3">
                    <Badge className={priorityColors[subProj.priority] || priorityColors.low}>
                      {subProj.priority || 'low'}
                    </Badge>
                  </Td>
                  {user?.role_type !== "Crew View" && (<Td className="text-sm align-middle py-3 px-3 md:py-0"> {formatCurrency(subProj.estimated_value)}</Td>)}
                  <Td className="text-sm py-3 md:py-0">
                    <div className="flex gap-2">
                      {tabPermission?.view && <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewSubProject(subProj._id || subProj.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>}
                      {tabPermission?.delete && <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(subProj._id || subProj.id)}

                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SubProjectsTab;