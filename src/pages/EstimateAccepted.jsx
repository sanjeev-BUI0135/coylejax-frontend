import React from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function EstimateAccepted() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold text-gray-900temp dark:text-white">Estimate Approved!</CardTitle>
          <CardDescription className="text-lg text-gray-600temp dark:text-gray-400temp mt-2">
            Thank you for your confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700temp dark:text-gray-400temp mb-6">
            We have received your approval and will be in touch shortly to discuss the next steps for your project. A confirmation has been sent to the project manager.
          </p>
          <div className="space-y-4">
            <p className="text-sm text-gray-500temp dark:text-gray-400temp">
              You can now close this page. We will contact you soon to schedule the work.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}