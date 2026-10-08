import React from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();

  const amount = searchParams.get("amount");

  return (
 <div className="flex flex-col items-center justify-center min-h-screen bg-gray50-temp px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
        <CheckCircle className="mx-auto text-green-500" size={72} />
        <h1 className="text-3xl font-bold text-gray-900temp mt-4">
          Payment Successful
        </h1>
        <p className="text-gray-600temp mt-2">
          Thank you for your payment. Your invoice has been marked as <b>Paid</b>.
        </p>
        </div>
        </div>

  );
}
