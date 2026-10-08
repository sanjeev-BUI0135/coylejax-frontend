import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { PlanScanService } from "@/services/planscanService";

/** Extract division number: "Division 08 - Openings" → 8, "09" → 9 */
export const extractDivNumber = (str) => {
  if (!str) return null;
  const match = String(str).match(/division\s*0*(\d+)/i);
  if (match) return parseInt(match[1], 10);
  const numOnly = String(str).match(/^0*(\d+)$/);
  if (numOnly) return parseInt(numOnly[1], 10);
  return null;
};

const extractProjects = (res) => {
  const envelope = res?.data;                         
  const glacierPayload = envelope?.data;              

  if (Array.isArray(glacierPayload?.projects))  return glacierPayload.projects;  
  if (Array.isArray(glacierPayload))            return glacierPayload;           
  if (Array.isArray(envelope?.projects))        return envelope.projects;        
  if (Array.isArray(envelope))                  return envelope;                 
  return [];
};

const extractItems = (res) => {
  const envelope = res?.data;                          
  const glacierPayload = envelope?.data;               

  if (Array.isArray(glacierPayload?.items))   return glacierPayload.items;   
  if (Array.isArray(envelope?.items))         return envelope.items;         
  if (Array.isArray(glacierPayload))          return glacierPayload;         
  if (Array.isArray(envelope))               return envelope;                
  return [];
};

/** Get division number from a Glacier AI item */
const getItemDivNum = (item) => {
  const divStr = item.csiDivision || item.csi_division || item.division_type || item.division || "";
  return extractDivNumber(divStr);
};


export default function usePlanscanData({ divisionTypes = [], defaultDivision }) {
  // All projects fetched from GET /projects
  const [projects, setProjects]               = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectsError, setProjectsError]     = useState(null); // null | { type, message }

  // Division selection
  const [selectedDivisions, setSelectedDivisions] = useState(
    defaultDivision ? [defaultDivision] : []
  );

  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject]     = useState(null);

  // Items for selected project
  const [projectItems, setProjectItems]   = useState([]);
  const [loadingItems, setLoadingItems]   = useState(false);

  // Checked items for import
  const [checkedItemIds, setCheckedItemIds] = useState([]);

  // Field visibility toggles
  const [showCsiCode, setShowCsiCode]         = useState(false);
  const [showItemName, setShowItemName]        = useState(true);
  const [showDescription, setShowDescription] = useState(false);

  // Per-project export cache: { [projectId]: items[] }
  const itemCacheRef = useRef({});

  // Division-filter scanning state
  // Set of projectIds confirmed to have items in the selected division
  const [matchedProjectIds, setMatchedProjectIds] = useState(null); 
  const [scanProgress, setScanProgress]           = useState(0);    
  const [scanning, setScanning]                   = useState(false);
  const scanCancelRef = useRef(false);

  
  const masterDivisionOptions = useMemo(() =>
    divisionTypes.map((d) => ({
      value: d.value,
      label: d.display_name || d.value,
    })),
  [divisionTypes]);

  /** Selected division numbers (e.g. [9, 10]) */
  const selectedDivNums = useMemo(() => {
    return selectedDivisions.map((div) => {
      const opt = masterDivisionOptions.find((o) => o.value === div);
      const label = opt?.label || div;
      return extractDivNumber(label) ?? extractDivNumber(div);
    }).filter((n) => n !== null);
  }, [selectedDivisions, masterDivisionOptions]);


  // ── Step 1: Fetch project list on mount ───────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProjects(true);
      setProjectsError(null);

      try {
        const LS_KEY = "glaciers_ai_settings";
        let apiKey = "";
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) apiKey = JSON.parse(raw)?.apiKey || "";
        } catch {}

        // If localStorage is empty, fetch from DB and sync it
        if (!apiKey) {
          try {
            const API_BASE = import.meta.env.VITE_API_BASE;
            const token = localStorage.getItem("token") || "";
            const dbRes = await fetch(`${API_BASE}/settings/glaciers-ai`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (dbRes.ok) {
              const dbData = await dbRes.json();
              apiKey = dbData?.apiKey || "";
              if (apiKey) {
                // Sync to localStorage so subsequent calls are instant
                localStorage.setItem(LS_KEY, JSON.stringify({ apiKey }));
              }
            }
          } catch {
            // DB unreachable — fall through to no_key error below
          }
        }

        if (!apiKey) {
          if (!cancelled) setProjectsError({ type: "no_key", message: "No Glacier AI API key configured. Go to Settings → Glacier AI to add your key." });
          return;
        }
        const res = await PlanScanService.getProjects();
        const list = extractProjects(res);
        if (!cancelled) setProjects(list);

      } catch (e) {
        if (cancelled) return;
        const serverMsg =
          e?.response?.data?.message?.message ||
          e?.response?.data?.message ||
          e?.message || "";
        const msgLower = String(serverMsg).toLowerCase();
        if (msgLower.includes("invalid api key") || msgLower.includes("unauthorized") || msgLower.includes("forbidden")) {
          setProjectsError({ type: "invalid_key", message: "Invalid Glacier AI API key. Please update it in Settings → Glacier AI." });
        } else if (msgLower.includes("network") || msgLower.includes("failed to fetch")) {
          setProjectsError({ type: "network", message: "Could not reach the server. Check your network connection." });
        } else {
          setProjectsError({ type: "unknown", message: serverMsg || "Failed to load projects. Please try again." });
        }
        console.error("GlacierAI getProjects error:", e);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Step 2: When division changes, scan all projects for matching items ───

  const scanProjectsForDivision = useCallback(async (projectList, divNums) => {
    if (!projectList.length || !divNums.length) {
      setMatchedProjectIds(null);
      setScanProgress(0);
      return;
    }

    scanCancelRef.current = false;
    setScanning(true);
    setMatchedProjectIds(new Set()); 
    setScanProgress(0);

    const matched = new Set();
    const total = projectList.length;
    let done = 0;

    for (let i = 0; i < projectList.length; i += 3) {
      if (scanCancelRef.current) break;
      const chunk = projectList.slice(i, i + 3);

      await Promise.all(chunk.map(async (p) => {
        const pid = p.id || p._id;
        try {
          let items = itemCacheRef.current[pid];
          if (!items) {
            const res = await PlanScanService.getProjectItems(pid);
            items = extractItems(res);
            itemCacheRef.current[pid] = items;
          }

          // Does this project have any item in the selected division?
          const hasMatch = items.some((item) => {
            const n = getItemDivNum(item);
            return n !== null && divNums.includes(n);
          });

          if (hasMatch) {
            matched.add(pid);
            // Update matched set progressively so projects appear as soon as found
            setMatchedProjectIds((prev) => {
              const next = new Set(prev);
              next.add(pid);
              return next;
            });
          }
        } catch {
          // Skip project if export fails
        }

        done++;
        setScanProgress(Math.round((done / total) * 100));
      }));
    }

    if (!scanCancelRef.current) {
      setMatchedProjectIds(new Set(matched));
      setScanProgress(100);
      setScanning(false);
    }
  }, []);

  // Trigger scan when division selection changes (and projects are loaded)
  useEffect(() => {
    scanCancelRef.current = true; 
    setMatchedProjectIds(null);
    setScanProgress(0);
    setScanning(false);

    if (!selectedDivisions.length || !projects.length) return;

    // Small debounce so rapid division changes don't fire multiple scans
    const t = setTimeout(() => {
      scanProjectsForDivision(projects, selectedDivNums);
    }, 100);
    return () => { clearTimeout(t); scanCancelRef.current = true; };
  }, [selectedDivisions, projects, selectedDivNums, scanProjectsForDivision]);


  const filteredProjects = useMemo(() => {
    if (!selectedDivisions.length) return projects;         
    if (matchedProjectIds === null) return [];              
    return projects.filter((p) => matchedProjectIds.has(p.id || p._id));
  }, [projects, selectedDivisions, matchedProjectIds]);

  // Project dropdown options — show progressively as scan finds matches
  const projectOptions = useMemo(() =>
    filteredProjects.map((p) => ({
      value: p.id || p._id,
      label: p.name || p.project_name || p.title || p.id || p._id,
    })),
  [filteredProjects]);

  const handleProjectChange = async (projectId) => {
    setSelectedProjectId(projectId);
    const proj = projects.find((p) => (p.id || p._id) === projectId);
    setSelectedProject(proj || null);
    setProjectItems([]);
    setCheckedItemIds([]);

    if (!projectId) return;
    const cached = itemCacheRef.current[projectId];
    if (cached) {
      setProjectItems(cached);
      return;
    }

    setLoadingItems(true);
    try {
      const res = await PlanScanService.getProjectItems(projectId);
      const items = extractItems(res);
      itemCacheRef.current[projectId] = items;
      setProjectItems(items);
    } catch (e) {
      console.error("GlacierAI getProjectItems error:", e);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleDivisionChange = (values) => {
    setSelectedDivisions(values);
    setSelectedProjectId("");
    setSelectedProject(null);
    setProjectItems([]);
    setCheckedItemIds([]);
  };

  // Clear selected project if it's no longer valid after scan completes
  useEffect(() => {
    if (!scanning && matchedProjectIds && selectedProjectId) {
      if (!matchedProjectIds.has(selectedProjectId)) {
        setSelectedProjectId("");
        setSelectedProject(null);
        setProjectItems([]);
        setCheckedItemIds([]);
      }
    }
  }, [scanning, matchedProjectIds, selectedProjectId]);


  const filteredItems = useMemo(() => {
    if (!projectItems.length) return [];
    if (!selectedDivisions.length) return projectItems;
    return projectItems.filter((item) => {
      const n = getItemDivNum(item);
      return n !== null && selectedDivNums.includes(n);
    });
  }, [projectItems, selectedDivisions, selectedDivNums]);


  const toggleItem = (itemId) => {
    setCheckedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleAll = () => {
    if (checkedItemIds.length === filteredItems.length && filteredItems.length > 0) {
      setCheckedItemIds([]);
    } else {
      setCheckedItemIds(filteredItems.map((item, i) => item.id || item._id || i));
    }
  };


  const buildDescription = (item) => {
    const csiCode  = item.csiCode  || item.csi_code  || "";
    const itemName = item.itemName || item.item_name || item.name || "";
    const itemDesc = item.description || item.title || "";
    const parts = [];
    if (showCsiCode    && csiCode)  parts.push(csiCode);
    if (showItemName   && itemName) parts.push(itemName);
    if (showDescription && itemDesc) parts.push(itemDesc);
    return parts.join(" - ") || itemName || csiCode || itemDesc || "";
  };

  const isProjectLoading = loadingProjects || scanning;

  const canSave = selectedProjectId && checkedItemIds.length > 0;

  return {
    projects,
    filteredProjects,
    projectOptions,
    selectedDivisions,
    selectedProjectId,
    selectedProject,
    projectItems,
    filteredItems,
    masterDivisionOptions,
    checkedItemIds,
    projectsError,
    loadingProjects,
    loadingItems,
    isProjectLoading,
    scanning,
    scanProgress,
    loadingFilteredProjects: scanning,
    allItemsFetched: !scanning && matchedProjectIds !== null,
    showCsiCode,    setShowCsiCode,
    showItemName,   setShowItemName,
    showDescription, setShowDescription,
    canSave,
    handleProjectChange,
    handleDivisionChange,
    toggleItem,
    toggleAll,
    buildDescription,
  };
}
