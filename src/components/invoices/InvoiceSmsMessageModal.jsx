import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, MessageSquare, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import localApi from "../../services/localApi";
import { createPageUrl } from "@/utils/index";
import Swal from "sweetalert2";

export default function InvoiceSmsMessageModal({
    invoice,
    customer,
    project,
    user,
    onClose,
    onSuccess
}) {
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");

    const shareLink = `${window.location.origin}${createPageUrl(
        `PublicInvoice?token=${invoice.public_share_token}`
    )}`;

    useEffect(() => {
        // Initial message template
        const defaultMessage = `Your invoice #${invoice.invoice_number} from ${user?.companyName || "Coylejax"} is ready. \nView and pay here: ${shareLink}`;
        setMessage(defaultMessage);

        // Get primary phone number
        if (customer?.phone) {
            setPhoneNumber(customer.phone);
        }
    }, [invoice, customer, user, shareLink]);

    const handleSend = async () => {
        if (!phoneNumber) {
            toast.error("No phone number found for this customer.");
            return;
        }

        if (!message.trim()) {
            toast.error("Please enter a message.");
            return;
        }

        setIsSending(true);
        try {
            await localApi.functions.sendInvoiceSms(invoice._id, {
                phone_numbers: [phoneNumber],
                message: message.trim(),
                isWhatsApp: false // Default to SMS as per screenshot
            });

            Swal.fire({
                title: "Success!",
                text: "SMS sent successfully!",
                icon: "success",
                confirmButtonColor: "#27272a",
            });
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to send SMS:", error);
            Swal.fire({
                title: "Error!",
                text: error.message || "Failed to send SMS.",
                icon: "error",
                confirmButtonColor: "#27272a",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md"
            >
                <Card className="shadow-2xl border-none overflow-hidden rounded-2xl">
                    <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-4 dark:bg-[#111827]">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-gray-700 dark:text-white" />
                            Sent Message
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5 text-gray-500" />
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="message-desc" className="text-sm font-bold text-gray-700">
                                Message Description
                            </Label>
                            <Textarea
                                id="message-desc"
                                placeholder="Type your message here..."
                                className="min-h-[150px] resize-none border-gray-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex justify-between items-center gap-4 bg-gray-50/50 p-6">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 py-6 rounded-xl border-gray-200 font-semibold hover:bg-white flex items-center gap-2"
                        >
                            <XCircle className="w-5 h-5" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSend}
                            disabled={isSending}
                            className="flex-1 py-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold flex items-center gap-2"
                        >
                            {isSending ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Send
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
