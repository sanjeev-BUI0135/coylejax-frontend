import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, Info } from "lucide-react";
import MultiSelect from "@/components/ui/MultiSelect";

const EmailReport = ({
  formData,
  users,
  onChange,
  errors = {}
}) => {
  const handleFieldChange = (field, value) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 px-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-slate-900 shrink-0">
        <CardTitle className="text-base">Email Report</CardTitle>
      </CardHeader>
      <CardContent className="p-6 flex-1 flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          {/* Left Column */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="space-y-3">
              <Label className="text-sm">Report Interval <span className="text-red-500">*</span></Label>
              <RadioGroup
                value={formData.interval}
                onValueChange={(v) => handleFieldChange("interval", v)}
                className="flex flex-wrap gap-6"
              >
                {["Daily", "Weekly", "Monthly", "Yearly"].map(opt => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`int-${opt}`} className="text-blue-600 border-blue-600" />
                    <Label htmlFor={`int-${opt}`} className="font-normal">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.interval === "Weekly" && (
              <div className="space-y-2">
                <Label>Select Day <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.schedule_day}
                  onValueChange={(v) => handleFieldChange("schedule_day", v)}
                >
                  <SelectTrigger className={`bg-white dark:bg-slate-900 ${errors.schedule_day ? "border-red-500" : ""}`}><SelectValue placeholder="Select day" /></SelectTrigger>
                  <SelectContent>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.schedule_day && <p className="text-red-500 text-xs mt-1">{errors.schedule_day}</p>}
              </div>
              )}
              {formData.interval === "Monthly" && (
              <div className="space-y-2">
                <Label>Select Date <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.schedule_date}
                  onValueChange={(v) => handleFieldChange("schedule_date", v)}
                >
                  <SelectTrigger className={`bg-white dark:bg-slate-900 ${errors.schedule_date ? "border-red-500" : ""}`}><SelectValue placeholder="Select date" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.schedule_date && <p className="text-red-500 text-xs mt-1">{errors.schedule_date}</p>}
              </div>
              )}
              {formData.interval === "Yearly" && (
              <div className="space-y-2">
                <Label>Select Year <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.schedule_year || ""}
                  onValueChange={(v) => handleFieldChange("schedule_year", v)}
                >
                  <SelectTrigger className={`bg-white dark:bg-slate-900 ${errors.schedule_year ? "border-red-500" : ""}`}><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.schedule_year && (
                  <div className="flex items-start gap-1.5 mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded-md">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">
                      Report email will be sent on <strong>December 31, {formData.schedule_year}</strong> at the scheduled time.
                    </p>
                  </div>
                )}
                {errors.schedule_year && <p className="text-red-500 text-xs mt-1">{errors.schedule_year}</p>}
              </div>
              )}
              <div className="space-y-2">
                <Label>Select Time <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    type="time"
                    value={formData.schedule_time}
                    onChange={(e) => handleFieldChange("schedule_time", e.target.value)}
                    placeholder="Select Time"
                    className={`pl-10 bg-white dark:bg-slate-900 dark:[color-scheme:dark] ${errors.schedule_time ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                {errors.schedule_time && <p className="text-red-500 text-xs mt-1">{errors.schedule_time}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Users</Label>
              <MultiSelect
                options={users.map(u => ({ label: u.full_name || u.firstName || "User", value: u._id }))}
                selectedValues={formData.target_users}
                onChange={(v) => handleFieldChange("target_users", v)}
                placeholder="Select Users"
              />
            </div>

            <div className="flex flex-col space-y-2 flex-1">
              <Label>Additional Email (one per line)</Label>
              <textarea
                className="flex-1 w-full min-h-[100px] p-3 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Enter additional email"
                value={formData.additional_emails}
                onChange={(e) => handleFieldChange("additional_emails", e.target.value)}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col space-y-4 h-full">
            <div className="space-y-3">
              <Label>Attachment Type</Label>
              <RadioGroup
                value={formData.attachment_type}
                onValueChange={(v) => handleFieldChange("attachment_type", v)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Excel" id="att-excel" className="text-blue-600 border-blue-600" />
                  <Label htmlFor="att-excel" className="font-normal">Excel</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Email Subject</Label>
              <Input
                placeholder="Daily Automate Report"
                value={formData.email_subject}
                onChange={(e) => handleFieldChange("email_subject", e.target.value)}
              />
            </div>

            <div className="flex flex-col space-y-2 flex-1">
              <Label>Email Text</Label>
              <textarea
                className="flex-1 w-full min-h-[200px] p-3 rounded-md border border-gray-200 dark:border-gray-700 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-sans"
                placeholder="Enter email content..."
                value={formData.email_text}
                onChange={(e) => handleFieldChange("email_text", e.target.value)}
              />
            </div>


          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailReport;
