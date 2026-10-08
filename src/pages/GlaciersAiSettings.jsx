import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import localApi from "../services/localApi";
import Swal from "sweetalert2";
import {
  Sparkles,
  Key,
  Save,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import TablePageSkeleton from "../components/ui/tableskeleton";

const LS_KEY = "glaciers_ai_settings";

function getStoredKey() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.apiKey || "";
    }
  } catch {}
  return "";
}

export default function GlaciersAiSettings() {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | "ok" | "fail"
  const [storageMode, setStorageMode] = useState("local"); // "local" | "db"
  const [dbAvailable, setDbAvailable] = useState(false);

  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const modules = user.permissions || [];
  const permission = modules.find((m) => m.module === "Glaciers AI") || {};
  const isAdmin = user.role_type === "Superadmin" || user.role_type === "admin";
  const canView = isAdmin || permission.canView;
  const canSave = isAdmin || permission.canUpdate || permission.canAdd;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const data = await localApi.request("/settings/glaciers-ai");
      const key = data?.apiKey || "";
      setApiKey(key);
      setStorageMode("db");
      setDbAvailable(true);
      // Sync to localStorage so planscanService picks it up immediately
      localStorage.setItem(LS_KEY, JSON.stringify({ apiKey: key }));
    } catch {
      // Backend route missing or network error — fall back to localStorage
      setDbAvailable(false);
      setStorageMode("local");
      setApiKey(getStoredKey());
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Swal.fire({ icon: "warning", title: "API Key Required", text: "Please enter your Glacier AI API key before saving.", confirmButtonColor: "#4f46e5" });
      return;
    }

    setSaving(true);
    try {
      await localApi.request("/settings/glaciers-ai", {
        method: "POST",
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      // Sync to localStorage so planscanService picks it up immediately
      localStorage.setItem(LS_KEY, JSON.stringify({ apiKey: apiKey.trim() }));
      setStorageMode("db");
      setDbAvailable(true);
      await Swal.fire({ icon: "success", title: "Saved", text: "Glacier AI API key saved securely in the database.", confirmButtonColor: "#4f46e5" });
    } catch {
      // DB unavailable — save to localStorage only
      localStorage.setItem(LS_KEY, JSON.stringify({ apiKey: apiKey.trim() }));
      setStorageMode("local");
      await Swal.fire({ icon: "info", title: "Saved Locally", text: "API key saved in browser storage (database unavailable).", confirmButtonColor: "#4f46e5" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      Swal.fire({ icon: "warning", title: "Enter API Key", text: "Please enter an API key to test.", confirmButtonColor: "#4f46e5" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      // Test via our backend proxy (avoids CORS and validates end-to-end)
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}/planscan/projects`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            "x-api-key": apiKey.trim(),
          },
        }
      );
      setTestResult(res.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    Swal.fire({
      title: "Clear API Key?",
      text: "This will remove the Glacier AI API key from all storage.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#4f46e5",
      confirmButtonText: "Yes, clear",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setApiKey("");
        setTestResult(null);
        localStorage.removeItem(LS_KEY);
        try {
          await localApi.request("/settings/glaciers-ai", { method: "DELETE" });
        } catch {}
        Swal.fire("Cleared", "Glacier AI API key has been removed.", "success");
      }
    });
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert className="w-14 h-14 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Access Denied</h2>
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) return <TablePageSkeleton />;

  return (
    <div className="mx-auto px-4">

      {/* ── Header ── */}
      <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-6 text-white shadow-xl">
        {/* glow blobs */}
        <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-40 h-40 rounded-full bg-purple-400/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold leading-tight">Glacier AI</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur uppercase tracking-wider">
                Integration
              </span>
            </div>
            <p className="text-sm text-indigo-100 leading-relaxed">
              Connect your Glacier AI account by entering your API key below.
              All Glacier AI features will use this key automatically.
            </p>
          </div>
        </div>
      </div>

      {/* ── Storage Mode Badge ── */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
            storageMode === "db"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
          }`}
        >
          {storageMode === "db" ? (
            <><Database className="w-3.5 h-3.5" /> Stored in Database</>
          ) : (
            <><HardDrive className="w-3.5 h-3.5" /> Stored in Browser</>
          )}
        </div>

        <button
          onClick={loadSettings}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh stored settings"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* ── API Key Card ── */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center">
            <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Glacier AI API Key</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Required to access projects and export items</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Input field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                API Key
              </label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors"
              >
                {showApiKey
                  ? <><EyeOff className="w-3.5 h-3.5" /> Hide</>
                  : <><Eye className="w-3.5 h-3.5" /> Show</>}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder="ps_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                className="w-full pr-4 font-mono text-sm"
                disabled={!canSave}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {/* Test result banner */}
            {testResult === "ok" && (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Connection successful! Projects API responded correctly.
              </div>
            )}
            {testResult === "fail" && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Connection failed. Please check the API key and try again.
              </div>
            )}

            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Your key is sent securely with every Glacier AI request.
              {storageMode === "local"
                ? " Currently stored in browser localStorage — connect the backend endpoint to persist it in the database."
                : " Persisted securely in the database and loaded on each session."}
            </p>
          </div>
        </div>

        {/* Actions */}
        {canSave && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={saving || testing || !apiKey}
              className="text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 font-medium disabled:opacity-40 transition-colors"
            >
              Clear Key
            </button>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing || saving || !apiKey.trim()}
                className="flex items-center gap-2 text-sm"
              >
                {testing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing…</>
                  : "Test Connection"}
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving || testing || !apiKey.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
              >
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Save className="w-4 h-4" /> Save Key</>}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── How it works ── */}
      <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          How this works
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
          <li>Enter your <span className="font-medium text-gray-700 dark:text-gray-300">Glacier AI API key</span> above.</li>
          <li>Click <span className="font-medium text-gray-700 dark:text-gray-300">Test Connection</span> to verify the key works.</li>
          <li>Click <span className="font-medium text-gray-700 dark:text-gray-300">Save Key</span> — it is stored {dbAvailable ? "in the database" : "in browser storage"} and applied to all Glacier AI calls automatically.</li>
          <li>Open any Estimate and click <span className="font-medium text-gray-700 dark:text-gray-300">Glacier AI</span> to import line items from your Glacier AI projects.</li>
        </ol>
      </div>

    </div>
  );
}
