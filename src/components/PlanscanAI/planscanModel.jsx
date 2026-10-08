import { createPortal } from "react-dom";
import { Loader2, Scan, FolderOpen, Layers, CheckSquare, AlertTriangle, KeyRound, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { STYLES } from "./planscanStyles";
import InlineSelect from "./InlineSelect";
import usePlanscanData from "./usePlanscanData";

export default function PlanScanAIModal({ defaultCategory, divisionType, divisionTypes = [], onClose, onSave }) {
  const navigate = useNavigate();
  const {
    selectedDivisions,
    selectedProjectId,
    selectedProject,
    loadingItems,
    checkedItemIds,
    filteredItems,
    filteredProjects,
    masterDivisionOptions,
    projectOptions,
    canSave,
    scanning,
    scanProgress,
    loadingProjects,
    projectsError,

    showCsiCode, setShowCsiCode,
    showItemName, setShowItemName,
    showDescription, setShowDescription,

    handleProjectChange,
    handleDivisionChange,
    toggleItem,
    toggleAll,
    buildDescription,
  } = usePlanscanData({ divisionTypes, defaultDivision: divisionType });

  const handleSave = () => {
    if (!selectedProject || checkedItemIds.length === 0) return;

    const itemsToLoad = filteredItems.filter((item, index) =>
      checkedItemIds.includes(item.id || item._id || index)
    );

    const lineItems = itemsToLoad.map((item) => {
      const qty = Number(item.quantity || item.qty || 1);
      const price = Number(item.estimatedRate || 0);
      const total = qty * price;
      return {
        category: defaultCategory?.value || "Materials",
        category_display_name: defaultCategory?.display_name || "Materials",
        description: buildDescription(item),
        quantity: qty,
        unit: item.unit || item.unit_of_measure || "EA",
        unit_price: price,
        markup_percentage: 0,
        total,
        original_unit_price: price > 0 ? price : null,
        inventory_item_id: null,
        imported_via_planscan: true,
      };
    });

    const notes = itemsToLoad.map((i) => i.notes || i.note || "").filter(Boolean).join("\n");

    onSave({
      projectName: selectedProject.name || selectedProject.project_name || selectedProject.title || "",
      lineItems,
      notes,
      divisions: selectedDivisions,
    });
  };

  // ── Error icon helper ──────────────────────────────────────────────────────
  const ErrorIcon = () => {
    if (projectsError?.type === "no_key")
      return <KeyRound style={{ width: 26, height: 26, color: "#f59e0b" }} />;
    if (projectsError?.type === "network")
      return <WifiOff style={{ width: 26, height: 26, color: "#3b82f6" }} />;
    return <AlertTriangle style={{ width: 26, height: 26, color: "#ef4444" }} />;
  };

  const errorIconBg =
    projectsError?.type === "no_key"
      ? "rgba(245,158,11,0.12)"
      : projectsError?.type === "network"
        ? "rgba(59,130,246,0.12)"
        : "rgba(239,68,68,0.12)";

  const errorTitle = {
    no_key: "API Key Not Configured",
    invalid_key: "Invalid API Key",
    network: "Connection Failed",
    unknown: "Something Went Wrong",
  }[projectsError?.type] || "Error";

  // ── Render ─────────────────────────────────────────────────────────────────
  return createPortal(
    <>
      <style>{STYLES}</style>
      <div
        className="psai-modal"
        style={{
          position: "fixed", inset: 0, zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        }}
      >
        <div
          style={{
            width: "100%", maxWidth: 520,
            height: projectsError ? "auto" : 600,
            background: "#fff", borderRadius: 16,
            boxShadow: "0 24px 64px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.06)",
            display: "flex", flexDirection: "column",
            overflow: "visible", position: "relative",
          }}
        >

          {/* ── Header ── */}
          <div
            style={{
              padding: "18px 24px 16px",
              borderBottom: "1px solid #f1f5f9",
              flexShrink: 0,
              borderRadius: "16px 16px 0 0",
              background: "linear-gradient(135deg, #f8faff 0%, #fdf4ff 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
                }}
              >
                <Scan style={{ width: 18, height: 18, color: "#fff" }} />
              </div>
              <div>
                <h2
                  style={{
                    margin: 0, fontSize: 17,
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em",
                  }}
                >
                  Glacier AI
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", marginTop: 1 }}>
                  Select line items from your project to import
                </p>
              </div>
            </div>
          </div>

          {/* ── Error Panel ── */}
          {projectsError ? (
            <div
              style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                textAlign: "center", padding: "36px 24px 32px",
                gap: 14,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 60, height: 60, borderRadius: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: errorIconBg,
                }}
              >
                <ErrorIcon />
              </div>

              {/* Title */}
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                {errorTitle}
              </div>

              {/* Message */}
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, maxWidth: 340 }}>
                {projectsError.message}
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
                {(projectsError.type === "no_key" || projectsError.type === "invalid_key") && (
                  <button
                    onClick={() => { onClose(); navigate("/glaciers-ai"); }}
                    style={{
                      padding: "10px 20px", borderRadius: 8, border: "none",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
                    }}
                  >
                    Go to Glacier AI Settings
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    padding: "10px 20px", borderRadius: 8,
                    border: "1.5px solid #e2e8f0",
                    background: "#fff", color: "#64748b",
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Body ── */}
              <div
                style={{
                  flex: 1, minHeight: 0,
                  padding: "18px 20px 0",
                  display: "flex", flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                {/* Step 1: Division */}
                <div style={{ marginBottom: 14, flexShrink: 0, position: "relative", zIndex: 10 }}>
                  <label
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontSize: 12, fontWeight: 600, marginBottom: 7,
                      color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em",
                    }}
                  >
                    <Layers style={{ width: 13, height: 13 }} />
                    Division
                  </label>
                  <InlineSelect
                    options={masterDivisionOptions}
                    value={selectedDivisions[0] || ""}
                    onChange={(val) => handleDivisionChange([val])}
                    placeholder="Select division"
                  />
                </div>

                {/* Step 2: Project */}
                <div style={{ marginBottom: 14, flexShrink: 0, position: "relative", zIndex: 5 }}>
                  <label
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      fontSize: 12, fontWeight: 600, marginBottom: 7,
                      color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em",
                    }}
                  >
                    <FolderOpen style={{ width: 13, height: 13 }} />
                    Project
                    {filteredProjects.length > 0 && scanning && (
                      <span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8", marginLeft: 4 }}>
                        ({filteredProjects.length} found…)
                      </span>
                    )}
                  </label>

                  {loadingProjects ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#94a3b8", padding: "10px 0" }}>
                      <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                      Loading projects…
                    </div>
                  ) : scanning ? (
                    <div style={{ paddingTop: 4 }}>
                      <div style={{ height: 4, borderRadius: 99, background: "#e2e8f0", overflow: "hidden", marginBottom: 8 }}>
                        <div
                          style={{
                            height: "100%", borderRadius: 99,
                            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                            width: `${scanProgress}%`,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                        Scanning projects for selected division… {scanProgress}%
                      </div>
                      {filteredProjects.length > 0 && (
                        <InlineSelect
                          value={selectedProjectId}
                          onChange={handleProjectChange}
                          options={projectOptions}
                          placeholder={`Select a project (${filteredProjects.length} match${filteredProjects.length > 1 ? "es" : ""} found)`}
                        />
                      )}
                      {filteredProjects.length === 0 && (
                        <div style={{ fontSize: 12, color: "#cbd5e1", padding: "6px 0" }}>Searching…</div>
                      )}
                    </div>
                  ) : (
                    <>
                      <InlineSelect
                        value={selectedProjectId}
                        onChange={handleProjectChange}
                        options={projectOptions}
                        placeholder={
                          selectedDivisions.length > 0
                            ? projectOptions.length === 0
                              ? "No projects found for this division"
                              : "Select a project"
                            : "Select a project"
                        }
                      />
                      {selectedDivisions.length > 0 && projectOptions.length > 0 && (
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                          {projectOptions.length} project{projectOptions.length > 1 ? "s" : ""} found for this division
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Step 3: Line Items */}
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexShrink: 0 }}>
                    <label
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        fontSize: 12, fontWeight: 600,
                        color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em",
                      }}
                    >
                      <CheckSquare style={{ width: 13, height: 13 }} />
                      Line Items
                    </label>
                    {filteredItems.length > 0 && (
                      <button
                        onClick={toggleAll}
                        style={{ background: "none", border: "none", fontSize: 12, color: "#6366f1", cursor: "pointer", fontWeight: 500 }}
                      >
                        {checkedItemIds.length === filteredItems.length ? "Deselect All" : "Select All"}
                      </button>
                    )}
                  </div>

                  {/* Field toggles */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 10, flexShrink: 0, flexWrap: "wrap" }}>
                    {[
                      { label: "CSI Code", checked: showCsiCode, toggle: () => setShowCsiCode((v) => !v) },
                      { label: "Item", checked: showItemName, toggle: () => setShowItemName((v) => !v) },
                      { label: "Description", checked: showDescription, toggle: () => setShowDescription((v) => !v) },
                    ].map((field) => (
                      <label
                        key={field.label}
                        onClick={field.toggle}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          fontSize: 11.5, fontWeight: 500, cursor: "pointer", userSelect: "none",
                          color: field.checked ? "#4f46e5" : "#94a3b8",
                          transition: "color 0.15s",
                        }}
                      >
                        <div
                          style={{
                            width: 15, height: 15, borderRadius: 3,
                            border: `1.5px solid ${field.checked ? "#6366f1" : "#cbd5e1"}`,
                            background: field.checked ? "#6366f1" : "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}
                        >
                          {field.checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        {field.label}
                      </label>
                    ))}
                  </div>

                  {/* Items list */}
                  <div className="psai-list-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 8 }}>
                    {loadingItems ? (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 120 }}>
                        <div style={{ textAlign: "center" }}>
                          <Loader2 style={{ width: 22, height: 22, color: "#6366f1", margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
                          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Loading line items…</p>
                        </div>
                      </div>
                    ) : !selectedProjectId ? (
                      <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 13 }}>
                        Select a project to view its line items.
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 13 }}>
                        No items found for the selected division and project.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {filteredItems.map((item, i) => {
                          const itemId = item.id || item._id || i;
                          const isSelected = checkedItemIds.includes(itemId);
                          const csiCode = item.csiCode || item.csi_code || "";
                          const itemName = item.itemName || item.item_name || item.name || "";
                          const itemDesc = item.description || item.title || "";
                          const estimatedPrice = Number(item.estimatedRate || 0);

                          return (
                            <label
                              key={itemId}
                              className={`psai-row psai-item-enter ${isSelected ? "active" : ""}`}
                              style={{ animationDelay: `${i * 0.02}s` }}
                              onClick={() => toggleItem(itemId)}
                            >
                              <div className="psai-checkbox">
                                <svg className="psai-checkmark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </div>
                              <div style={{ flex: 1, overflow: "hidden" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  {showCsiCode && csiCode && (
                                    <span
                                      style={{
                                        fontSize: 11, fontWeight: 600,
                                        color: "#6366f1",
                                        background: isSelected ? "rgba(99,102,241,0.1)" : "#f1f5f9",
                                        padding: "1px 6px", borderRadius: 4, flexShrink: 0,
                                      }}
                                    >
                                      {csiCode}
                                    </span>
                                  )}
                                  {showItemName && (
                                    <span
                                      style={{
                                        fontSize: 13, fontWeight: 500,
                                        color: isSelected ? "#4338ca" : "#334155",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                      }}
                                    >
                                      {itemName || "—"}
                                    </span>
                                  )}
                                  {estimatedPrice > 0 && (
                                    <span
                                      style={{
                                        fontSize: 11, fontWeight: 600,
                                        color: isSelected ? "#16a34a" : "#15803d",
                                        background: isSelected ? "rgba(22,163,74,0.1)" : "#f0fdf4",
                                        border: "1px solid",
                                        borderColor: isSelected ? "rgba(22,163,74,0.3)" : "#bbf7d0",
                                        padding: "1px 6px", borderRadius: 4, flexShrink: 0, marginLeft: "auto",
                                      }}
                                    >
                                      ${estimatedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                                {showDescription && itemDesc && (
                                  <span style={{ display: "block", fontSize: 11, color: "#94a3b8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {itemDesc}
                                  </span>
                                )}
                                {!showCsiCode && !showItemName && !showDescription && (
                                  <span style={{ fontSize: 13, fontWeight: 500, color: isSelected ? "#4338ca" : "#334155" }}>
                                    {itemName || csiCode || "—"}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              <div
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 20px", borderTop: "1px solid #f1f5f9",
                  background: "#fafafa", flexShrink: 0, borderRadius: "0 0 16px 16px",
                }}
              >
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  {checkedItemIds.length > 0
                    ? `${checkedItemIds.length} item${checkedItemIds.length !== 1 ? "s" : ""} selected`
                    : ""}
                </span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={onClose}
                    style={{
                      padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                      border: "1.5px solid #e2e8f0", background: "#fff", color: "#475569",
                      cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.color = "#0f172a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!canSave}
                    onClick={handleSave}
                    style={{
                      padding: "8px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: "none", cursor: canSave ? "pointer" : "not-allowed",
                      background: canSave ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#e2e8f0",
                      color: canSave ? "#fff" : "#94a3b8",
                      boxShadow: canSave ? "0 4px 12px rgba(99,102,241,0.35)" : "none",
                      transition: "opacity 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => { if (canSave) e.currentTarget.style.opacity = "0.9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    Import Data
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>,
    document.body
  );
}
