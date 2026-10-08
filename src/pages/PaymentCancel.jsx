import React from "react";
import { useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react"; 

export default function PaymentCancel() {
  const [searchParams] = useSearchParams();
  const amount = searchParams.get("amount");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray50-temp px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
        <XCircle className="mx-auto text-red-500" size={72} />
        <h1 className="text-3xl font-bold text-gray-900temp mt-4">
          Payment Canceled
        </h1>
        <p className="text-gray-600temp mt-2">
          Your payment was canceled. No amount has been charged.
        </p>
      </div>
    </div>
  );
}
