import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import localApi from "../services/localApi";
import Swal from "sweetalert2";
import { MessageSquare, ShieldAlert, Key, Phone, Trash2 } from "lucide-react";
import TablePageSkeleton from "../components/ui/tableskeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SmsSettingsPage() {
    const [enabled, setEnabled] = useState(true);
    const [accountSid, setAccountSid] = useState("");
    const [authToken, setAuthToken] = useState("");
    const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
    const [accountName, setAccountName] = useState("");
    const [hasAuthToken, setHasAuthToken] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));

    const modules = user.permissions || [];
    const permission = modules.find(m => m.module === 'SMS Settings') || {};
    const canView = permission.canView;
    const canAdd = permission.canAdd;
    const canUpdate = permission.canUpdate;
    const canDelete = permission.canDelete;

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await localApi.functions.getSmsSettings();
            if (data) {
                setEnabled(data.enabled);
                setAccountSid(data.accountSid || "");
                setTwilioPhoneNumber(data.twilioPhoneNumber || "");
                setAccountName(data.accountName || "");
                setHasAuthToken(data.hasAuthToken || false);
                setAuthToken(data.hasAuthToken ? "********" : "");
            }
        } catch (err) {
            console.error("Failed to load SMS settings", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!accountSid || !twilioPhoneNumber || (!hasAuthToken && !authToken)) {
            Swal.fire({
                icon: "warning",
                title: "Missing Information",
                text: "Please fill in all required fields.",
                confirmButtonColor: "#2563eb",
            });
            return;
        }

        setSaving(true);
        try {
            await localApi.functions.saveSmsSettings({
                enabled,
                accountSid,
                authToken: authToken.includes("*") ? undefined : authToken,
                twilioPhoneNumber,
                accountName,
            });

            await Swal.fire({
                icon: "success",
                title: "Saved!",
                text: "SMS settings saved successfully.",
                confirmButtonColor: "#2563eb",
            });
            loadSettings();
        } catch (err) {
            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to save SMS settings.",
                confirmButtonColor: "#2563eb",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDisconnect = async () => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: "This will remove your Twilio configurations and disable SMS features for your account.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, disconnect",
        });

        if (result.isConfirmed) {
            setSaving(true);
            try {
                await localApi.functions.deleteSmsSettings();
                setAccountSid("");
                setAuthToken("");
                setTwilioPhoneNumber("");
                setAccountName("");
                setHasAuthToken(false);
                setEnabled(false);

                await Swal.fire({
                    icon: "success",
                    title: "Disconnected",
                    text: "Twilio account disconnected successfully.",
                    confirmButtonColor: "#2563eb",
                });
            } catch (err) {
                await Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Failed to disconnect account.",
                    confirmButtonColor: "#2563eb",
                });
            } finally {
                setSaving(false);
            }
        }
    };

    if (!canView) {
        return (
            <div className="p-6 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-red-700">Access Denied</h2>
                <p className="text-gray-600temp mt-2">You do not have permission to view this page.</p>
            </div>
        );
    }

    if (loading) return <TablePageSkeleton />;

    return (
        <div className=" mx-auto">
            <div className="mb-8">
                <h1 className="text-xl md:text-2xl font-bold mb-2">SMS Settings</h1>
                <p className="text-gray-500">Configure your Twilio account for SMS notifications and messaging.</p>
            </div>

            {!enabled && hasAuthToken && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800">
                    <ShieldAlert className="w-5 h-5 text-amber-600" />
                    <div>
                        <p className="text-sm font-semibold">SMS is currently disabled</p>
                        <p className="text-xs">Messaging features are turned off. Your customers will not receive any SMS or WhatsApp notifications.</p>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden dark:bg-[#1f2937]">
                <div className="p-6 border-b bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">{accountName || "Twilio Account"}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-900">
                                {hasAuthToken ? "Your account is connected and ready." : "Connect your Twilio account."}
                            </p>
                        </div>
                    </div>
                    {hasAuthToken && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse dark:bg-white"></div>
                            <span className="text-sm font-medium text-green-600 dark:text-white">Connected</span>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                Twilio Account Name
                            </label>
                            <Input
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="e.g. My Business SMS"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Key className="w-4 h-4" /> Account SID
                            </label>
                            <Input
                                value={accountSid}
                                onChange={(e) => setAccountSid(e.target.value)}
                                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4" /> Auth Token
                            </label>
                            <Input
                                type="password"
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                placeholder={hasAuthToken ? "********" : "Enter your authToken"}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Phone className="w-4 h-4" /> Twilio Phone Number
                            </label>
                            <Input
                                value={twilioPhoneNumber}
                                onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                                placeholder="+1507765XXXX"
                            />
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Label className="text-sm font-medium">SMS Service Status</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={enabled ? "default" : "outline"}
                                className={`${enabled
                                        ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600"
                                        : "border-gray-200 dark:border-gray-600 dark:text-gray-300"
                                    }`}
                                onClick={() => setEnabled(true)}
                            >
                                ON
                            </Button>
                            <Button
                                type="button"
                                variant={!enabled ? "default" : "outline"}
                                className={`${!enabled
                                        ? "bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600"
                                        : "border-gray-200 dark:border-gray-600 dark:text-gray-300"
                                    }`}
                                onClick={() => setEnabled(false)}
                            >
                                OFF
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                            {enabled
                                ? "SMS features are active. Notifications will be sent to customers."
                                : "SMS features are paused. No messages will be sent from your account."}
                        </p>
                    </div>

                    <div className="pt-6 border-t flex flex-wrap items-center justify-between gap-3">
                        {hasAuthToken && canDelete ? (
                            <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={handleDisconnect}
                                disabled={saving}
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Disconnect Account
                            </Button>
                        ) : <div></div>}

                        <div className="flex gap-3">
                            {(canAdd || canUpdate) && (
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                                >
                                    {saving ? "Saving..." : "Save Settings"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-800 mb-1">Important Note:</h3>
                <p className="text-xs text-blue-600">
                    Make sure your Twilio account has a valid "Messaging Service" or a phone number enabled with SMS/WhatsApp capabilities.
                    You can find your Credentials in the Twilio Console under "Account Summary".
                </p>
            </div>
        </div>
    );
}
