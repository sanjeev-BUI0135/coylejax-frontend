import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import ProjectFinancials from './ProjectFinancials';
import SubProjectsTab from './SubProjectsTab';
const ProjectEstimates = React.lazy(() => import('./ProjectEstimates'));
const ProjectInvoices = React.lazy(() => import('./ProjectInvoices'));
const ProjectPayments = React.lazy(() => import('./ProjectPayments'));
const ProjectMaterialOrders = React.lazy(() => import('./ProjectMaterialOrders'));
const ProjectInventory = React.lazy(() => import('./ProjectInventory'));
const ProjectChecklist = React.lazy(() => import('./ProjectChecklist'));
const ProjectHistory = React.lazy(() => import('./ProjectHistory'));
import FileAttachments from '@/components/projects/details/FileAttachments';
import ProjectInfoTab from '@/components/projects/details/ProjectInfoTab';
import ProjectTerms from "@/components/projects/details/ProjectTerms.jsx";
import TablePageSkeleton from '../../ui/tableskeleton';

export default function ProjectTabs(props) {
  const {
    activeTab,
    setActiveTab,
    project,
    user,
    subProjects,
    estimates,
    invoices,
    payments,
    materialOrders,
    projectInventory,
    laborEntries,
    checklists,
    setChecklists,
    fulfilledMaterials,
    pendingMaterials,
    handleEditEstimate,
    handleNewEstimate,
    handleEstimateStatusChange,
    handleConvertToInvoice,
    handleDeleteEstimate,
    handleNewInvoice,
    handleEditInvoice,
    handleDeleteInvoice,
    handleNewPayment,
    handleUpdateRequirementStatus,
    handleAttachmentsUpdate,
    divisions,
    allProjects,
    allCustomers,
    projectId,
    projectPermissions,
  } = props;

  const containerRef = useRef(null);
  const [visibleTabs, setVisibleTabs] = useState([]);
  const [hiddenTabs, setHiddenTabs] = useState([])
  const tabRefs = useRef([]);
  const allTabs = React.useMemo(() => [
    { key: "details", label: "Details" },
    { key: "estimates", label: `Estimates (${estimates?.length || 0})` },
    { key: "checklist", label: `Checklist (${checklists?.length || 0})` },
    { key: "material_orders", label: `Material Orders (${materialOrders?.length})` },
    { key: "inventory", label: "Project Inventory" },
    { key: "sub_projects", label: `Sub-Projects (${subProjects?.length || 0})` },
    { key: "financials", label: "Financials" },
    { key: "invoices", label: `Invoices (${invoices?.length || 0})` },
    { key: "payments", label: `Payments (${payments?.length || 0})` },
    { key: "history", label: "History" },
    { key: "files", label: `Files (${project.file_attachments?.length || 0})` },
    { key: "terms", label: "Terms & Conditions" },
  ], [
    subProjects,
    estimates,
    invoices,
    payments,
    materialOrders,
    checklists,
    project.file_attachments
  ]);

  const filteredTabs = React.useMemo(() => {
  return allTabs.filter((tab) => {
    switch (tab.key) {
      case "details":
        return projectPermissions?.widgets?.Details?.view;

      case "estimates":
        return projectPermissions?.widgets?.Estimates?.view;

      case "checklist":
        return projectPermissions?.widgets?.Checklist?.view;

      case "material_orders":
        return projectPermissions?.widgets?.MaterialOrders?.view;

      case "inventory":
        return projectPermissions?.widgets?.Inventory?.view;

      case "sub_projects":
        return (
          projectPermissions?.widgets?.SubProjects?.view &&
          !project.is_sub_project
        );

      case "financials":
        return (
          projectPermissions?.widgets?.Financials?.view &&
          user?.role_type !== "Crew View"
        );

      case "invoices":
        return projectPermissions?.widgets?.Invoices?.view;

      case "payments":
        return (
          projectPermissions?.widgets?.Payments?.view &&
          user?.role_type !== "Crew View"
        );

      case "files":
        return projectPermissions?.widgets?.Files?.view;

      case "terms":
        return projectPermissions?.widgets?.Termsandconditions?.view;

      case "history":
        return true;

      default:
        return true;
    }
  });
}, [allTabs, projectPermissions, user]);

  const handleResize = () => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;

    let usedWidth = 0;
    const visible = [];
    const hidden = [];

    filteredTabs.forEach((tab, index) => {
      const tabWidth = tabRefs.current[index]?.offsetWidth || 100;

      if (usedWidth + tabWidth < containerWidth - 50) {
        visible.push(tab);
        usedWidth += tabWidth;
      } else {
        hidden.push(tab);
      }
    });

    setVisibleTabs(visible);
    setHiddenTabs(hidden);
  };

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [filteredTabs]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div ref={containerRef} className="flex items-center gap-2">
        <TabsList className="flex flex-nowrap overflow-x-auto whitespace-nowrap gap-1 h-auto flex-1 px-1 justify-center scroll-smooth">
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="text-xs shrink-0"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {hiddenTabs.length > 0 && (<DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-md hover:bg-gray-100">
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="bottom" align="end">
            {hiddenTabs.map((tab) => (
              <DropdownMenuItem
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>)}

      </div>

      <TabsContent value="details" className="mt-4">
        <ProjectInfoTab project={project} customer={props.customer} projectCustomers={props.projectCustomers} onAwardedDateChange={props.onAwardedDateChange} tabPermission={projectPermissions?.widgets?.Details} />
      </TabsContent>

      {!project.is_sub_project && (
        <TabsContent value="sub_projects" className="mt-4">
          <SubProjectsTab
            subProjects={subProjects || []}
            tabPermission={projectPermissions?.widgets?.SubProjects}
            onCreateSubProject={props.onCreateSubProject}
            onDeleteSubProject={props.onDeleteSubProject}
            onViewSubProject={(id) => { window.location.href = `/projects/${id}`; }}
            statusConfig={props.statusConfig}
            priorityColors={props.priorityColors}
          />
        </TabsContent>
      )}

      {user?.role_type !== "Crew View" && (<TabsContent value="financials" className="mt-4">
        <ProjectFinancials
          project={project}
          estimates={estimates}
          invoices={invoices}
          payments={payments}
          laborEntries={laborEntries}
        />
      </TabsContent>)}

      <TabsContent value="estimates" className="mt-4">
        <Suspense fallback={<TablePageSkeleton />}>
          <ProjectEstimates
            estimates={estimates}
            project={project}
            tabPermission={projectPermissions?.widgets?.Estimates}
            projects={[project, ...subProjects]}
            subProjects={subProjects}
            allProjects={allProjects}
            onNewEstimate={handleNewEstimate}
            onEditEstimate={handleEditEstimate}
            onStatusChange={handleEstimateStatusChange}
            onEstimateUpdate={props.onEstimateUpdate}
            onConvertToInvoice={handleConvertToInvoice}
            onDeleteEstimate={handleDeleteEstimate}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="invoices" className="mt-4">
        {activeTab === "invoices" && (
          <Suspense fallback={<TablePageSkeleton />}>
            <ProjectInvoices
              invoices={invoices}
              estimates={estimates}
              project={project}
              tabPermission={projectPermissions?.widgets?.Invoices}
              onNewInvoice={handleNewInvoice}
              onEditInvoice={handleEditInvoice}
              onDeleteInvoice={handleDeleteInvoice}
            />
          </Suspense>
        )}
      </TabsContent>

      {user?.role_type !== "Crew View" && (<TabsContent value="payments" className="mt-4">
        <Suspense fallback={<TablePageSkeleton />}>
          <ProjectPayments
            payments={payments}
            invoices={invoices}
            projectTotal={project.final_value || project.estimated_value || 0}
            onNewPayment={handleNewPayment}
          />
        </Suspense>
      </TabsContent>)}

      <TabsContent value="material_orders" className="mt-4">
        {fulfilledMaterials.length > 0 && (
          <div className="mb-6">
            {/* simplified fulfilled materials card handled at page-level if desired */}
          </div>
        )}
        <Suspense fallback={<TablePageSkeleton />}>
          <ProjectMaterialOrders
            materialOrders={materialOrders}
            pendingMaterials={pendingMaterials}
            tabPermission={projectPermissions?.widgets?.MaterialOrders}
            project={project}
            onUpdateRequirementStatus={handleUpdateRequirementStatus}
            systemConfig={props.systemConfig}
            inventoryItems={props.inventoryItems}
            onSendMail={props.onSendMail}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="inventory" className="mt-4">
        <Suspense fallback={<TablePageSkeleton />}>
          <ProjectInventory project={project} materialOrders={materialOrders} />
        </Suspense>
      </TabsContent>

      <TabsContent value="checklist" className="mt-4">
        <Suspense fallback={<TablePageSkeleton />}>
          <ProjectChecklist projectId={projectId} checklists={checklists} setChecklists={setChecklists} tabPermission={projectPermissions?.widgets?.Checklist} />
        </Suspense>
      </TabsContent>

      <TabsContent value="files" className="mt-4">
        <FileAttachments project={project} onUpdate={handleAttachmentsUpdate} tabPermission={projectPermissions?.widgets?.Files} />
      </TabsContent>

      <TabsContent value="terms" className="mt-4">
        <ProjectTerms project={project} divisions={divisions} />
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <Suspense fallback={<TablePageSkeleton />}>
          <ProjectHistory projectId={projectId} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
