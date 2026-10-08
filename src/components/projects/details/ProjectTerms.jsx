import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info, FileText } from "lucide-react";

export default function ProjectTerms({ project, divisions }) {
  const projectType = project?.project_type;

  const matchingDivision = divisions.find(
    (div) =>
      div.status === "active" &&
      (
        div.value?.toLowerCase() === projectType?.toLowerCase() ||
        div.display_name?.toLowerCase() === projectType?.toLowerCase()
      ) &&
      div.created_by === project.created_by
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Terms and Conditions
        </CardTitle>
      </CardHeader>

      <CardContent>
        {!matchingDivision && (
          <div className="border rounded-lg p-4 bg-yellow-50 text-yellow-800">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5" />
              <strong>No Division Found</strong>
            </div>
            <p className="text-sm">
              No active division found for project type:{" "}
              <strong>{projectType || "Not Set"}</strong>
            </p>
            <p className="text-xs mt-2 text-yellow-700">
              Go to Master Data Management → Divisions to add this division.
            </p>
          </div>
        )}

        {matchingDivision &&
          (!matchingDivision.terms_and_conditions ||
            matchingDivision.terms_and_conditions.trim() === "") && (
            <div className="border rounded-lg p-4 bg-blue-50 text-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5" />
                <strong>Terms Not Set</strong>
              </div>
              <p className="text-sm">
                Division: <strong>{matchingDivision.display_name}</strong>
              </p>
              <p className="text-xs mt-2 text-blue-700">
                Edit this division in Master Data Management to add terms and
                conditions.
              </p>
            </div>
          )}

        {matchingDivision?.terms_and_conditions && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm border-b pb-2">
              <div>
                Division:{" "}
                <strong>{matchingDivision.display_name}</strong>
              </div>
              <div className="text-xs">
                Internal Value: {matchingDivision.value}
              </div>
            </div>

            <div className="border rounded-lg p-5 bg-white dark:bg-gray-900">
              <div
                className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-line"
                dangerouslySetInnerHTML={{
                  __html: matchingDivision.terms_and_conditions,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
