import { useCallback } from "react";
import { Project, Customer, Estimate, Invoice, Payment, MaterialOrder, InventoryItem, LaborEntry, User } from "@/api/entities";
import api from "@/services/masterDataService.js";
import { getChecklists } from "@/services/checklistService";
import toast from "react-hot-toast";

export default function useProjectActions({
  projectId,
  setLoading,
  setProject,
  setAllCustomers,
  setEstimates,
  setAllEstimatesGlobal,
  setInvoices,
  setAllInvoicesGlobal,
  setPayments,
  setMaterialOrders,
  setProjectInventory,
  setLaborEntries,
  setAllProjects,
  setSubProjects,
  setProjectCustomers,
  setCustomer,
  setChecklists,
  setShowSubProjectForm,
  setShowLostModal,
  setLostReason,
  setCustomReason,
  setLoading1,
  projectPermissions,
  statusConfig,
}) {
  const loadChecklists = useCallback(async () => {
    try {
      const res = await getChecklists(projectId);
      setChecklists(res || []);
    } catch (err) {
      console.error("Failed to load checklist", err);
    }
  }, [projectId, setChecklists]);

  const loadProjectDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [
        proj,
        customersDataRes,
        allEstimatesRes,
        allInvoicesRes,
        allPaymentsRes,
        allMaterialOrdersRes,
        allProjectsDataRes,
      ] = await Promise.all([
        Project.get(projectId),
        Customer.list(),
        Estimate.list({ project_id: projectId, sort: '-createdAt', limit: 0 }),
        Invoice.list({ project_id: projectId, sort: '-createdAt', all: true }),
        Payment.list({ project_id: projectId, sort: '-createdAt' }),
        MaterialOrder.list({ project_id: projectId, sort: '-createdAt', all: true }),
        Project.list('-createdAt'),
      ]);

      // Extract data from paginated responses
      const customersData = Array.isArray(customersDataRes) ? customersDataRes : (customersDataRes.data || []);
      const allEstimates = Array.isArray(allEstimatesRes) ? allEstimatesRes : (allEstimatesRes.data || []);
      const allInvoices = Array.isArray(allInvoicesRes) ? allInvoicesRes : (allInvoicesRes.data || []);
      const allPayments = Array.isArray(allPaymentsRes) ? allPaymentsRes : (allPaymentsRes.data || []);
      const allMaterialOrders = Array.isArray(allMaterialOrdersRes) ? allMaterialOrdersRes : (allMaterialOrdersRes.data || []);
      const allProjectsData = Array.isArray(allProjectsDataRes) ? allProjectsDataRes : (allProjectsDataRes.data || []);

      try {
        const divisionsData = await api.getAll('divisions');
        const sorted = (divisionsData.data || divisionsData || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        // if consumer needs divisions they can fetch separately; not setting here to avoid coupling
      } catch (error) {
        console.error('Failed to load divisions:', error);
      }

      if (!proj) {
        setLoading(false);
        return;
      }

      const subProjectsData = await fetch(`${import.meta.env.VITE_API_BASE}/projects?parent_id=${projectId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const subProjResponse = subProjectsData.ok ? await subProjectsData.json() : [];
      const subProj = Array.isArray(subProjResponse) ? subProjResponse : (subProjResponse.data || []);
      const subProjectIds = subProj.map(sp => sp.id || sp._id);

      const filterByProject = (items = [], id, subIds = []) => {
        return (items || []).filter(item => {
          const pid = item.project_id || item.project || item.projectId || item.project_id;
          if (!pid) return false;
          const pidStr = typeof pid === 'object' ? (pid._id || pid.id || String(pid)) : String(pid);
          if (pidStr === String(id) || subIds.includes(pidStr)) return true;
          return false;
        });
      };

      const ests = filterByProject(allEstimates, projectId, subProjectIds);
      const invs = filterByProject(allInvoices, projectId, subProjectIds);
      const pays = filterByProject(allPayments, projectId, subProjectIds);
      const materialOrdersData = filterByProject(allMaterialOrders, projectId, subProjectIds);

      setProject(proj);
      setAllCustomers(customersData);
      setAllProjects(allProjectsData);
      setSubProjects(subProj);
      setAllEstimatesGlobal(allEstimates)
      setAllInvoicesGlobal(allInvoices);

      const projCustomers = [];
      if (proj.customer_ids && Array.isArray(proj.customer_ids)) {
        proj.customer_ids.forEach(custId => {
          const foundCustomer = (customersData || []).find(c =>
            c.id === custId ||
            c._id?.toString() === custId?.toString() ||
            c.id === custId?._id?.toString() ||
            c._id?.toString() === custId?._id?.toString()
          );
          if (foundCustomer) projCustomers.push(foundCustomer);
        });
      }
      setProjectCustomers(projCustomers);

      const cust = (customersData || []).find(c => c.id === proj.customer_id || c._id?.toString() === proj.customer_id?.toString());
      setCustomer(cust);

      setEstimates(ests);
      setInvoices(invs);
      setPayments(pays);
      setMaterialOrders(materialOrdersData);

    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, setProject, setAllCustomers, setEstimates, setInvoices, setPayments, setMaterialOrders, setAllProjects, setSubProjects, setProjectCustomers, setCustomer]);

  const confirmLost = useCallback(async ({ lostReasonLocal, customReason }) => {
    setLoading1(true);
    try {
      await Project.update(projectId, {
        status: 'lost',
        lost_reason: lostReasonLocal,
        lost_reason_note: customReason?.trim(),
        lost_date: new Date().toISOString(),
      });
      toast.success('Project marked as lost');
      setShowLostModal(false);
      setLostReason('');
      setCustomReason('');
      await loadProjectDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to mark project as lost');
    } finally {
      setLoading1(false);
    }
  }, [projectId, setLoading1, setShowLostModal, setLostReason, setCustomReason, loadProjectDetails]);

  const handleSubProjectSubmit = useCallback(async (subProjectData) => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/projects/${projectId}/sub-projects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subProjectData),
      });

      if (!response.ok) throw new Error('Failed to create sub-project');

      toast.success('Sub-project created successfully');
      if (typeof setShowSubProjectForm === 'function') setShowSubProjectForm(false);
      await loadProjectDetails();
    } catch (error) {
      console.error('Error creating sub-project:', error);
      toast.error('Failed to create sub-project');
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, loadProjectDetails, setShowSubProjectForm]);

  const handleDeleteSubProject = useCallback(async (subProjectId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE}/projects/${subProjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('Sub-project deleted successfully');
      await loadProjectDetails();
      return { ok: true };
    } catch (error) {
      console.error('Error deleting sub-project:', error);
      toast.error('Failed to delete sub-project');
      return { error };
    }
  }, [loadProjectDetails]);

  const handleProjectSubmit = useCallback(async (projectData) => {
    setLoading(true);
    try {
      await Project.update(projectId, projectData);
      await loadProjectDetails();
      return { ok: true };
    } catch (error) {
      console.error('Error updating project:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, loadProjectDetails]);

  const handleStatusChange = useCallback(async (newStatus, options = {}) => {
    setLoading(true);
    try {
      if (newStatus === 'bid_submitted') {
        // consumer can open bid submission UI
        return { action: 'open_bid_submission' };
      }
      if (newStatus === 'lost') {
        setShowLostModal(true);
        return { action: 'open_lost_modal' };
      }

      if (newStatus === 'reopen' && options.confirmReopen !== true) {
        return { action: 'confirm_reopen' };
      }

      if (newStatus === "completed") {
        const currentProject = await Project.get(projectId);

        const allowedStatuses = ["processing", "actively_working"];

        if (!allowedStatuses.includes(currentProject.status)) {
          toast.error(
            "You can only mark the project as completed when it is in 'Processing' or 'Actively Working' status."
          );
          return { blocked: true };
        }

        const checklistData = options?.checklists || [];

        if (!projectPermissions?.widgets?.Checklist?.view) {
          toast.error("You do not have permission to view or manage checklists.");
          return { blocked: true };
        }

        if (!checklistData.length) {
          toast.error("Please add at least one checklist before completing the project.");
          return { blocked: true };
        }

        const allValid = checklistData.every(
          (item) => item.status === "Completed" || item.status === "N/A"
        );

        if (!allValid) {
          toast.error("Complete all required checklist items before marking project as complete.");
          return { blocked: true };
        }
      }

      const updateData = { status: newStatus };
      if (newStatus === 'reopen') updateData.warranty_reopen_date = new Date().toISOString();

      await Project.update(projectId, updateData);
      toast.success(`Project status updated to "${statusConfig?.[newStatus]?.label || newStatus}"`);
      await loadProjectDetails();
      return { ok: true };
    } catch (error) {
      console.error('Failed to update project status:', error);
      toast.error('Something went wrong while updating project status.');
      return { error };
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, setShowLostModal, loadProjectDetails, projectPermissions]);

  const handlePriorityChange = useCallback(async (newPriority) => {
    setLoading(true);
    try {
      await Project.update(projectId, { priority: newPriority });
      await loadProjectDetails();
      return { ok: true };
    } catch (error) {
      console.error('Failed to update priority:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  }, [projectId, setLoading, loadProjectDetails]);

  const handleBidSubmit = async (bidData) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/bids`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bidData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit bid');
      }

      await Project.update(projectId, {
        status: 'bid_submitted',
        bid_submitted_date: new Date().toISOString()
      });

      toast.success('Bid submitted and project status updated successfully!');
      setShowBidSubmissionForm(false);
      loadProjectDetails();
    } catch (error) {
      console.error('Error submitting bid:', error);
      throw error;
    }
  };

  return {
    loadProjectDetails,
    loadChecklists,
    confirmLost,
    handleSubProjectSubmit,
    handleDeleteSubProject,
    handleProjectSubmit,
    handleStatusChange,
    handlePriorityChange,
    handleBidSubmit
  };
}
