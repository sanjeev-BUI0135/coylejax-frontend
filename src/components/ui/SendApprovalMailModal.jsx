import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, X, Loader2 } from "lucide-react";
import TablePageSkeleton from "./tableskeleton";

export default function SendApprovalMailModal({
  open,
  onClose,
  contacts = [],
  projectName,
  onSend,
}) {
  const [localContacts, setLocalContacts] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);

  /* ---------- INIT EMAILS (ON OPEN) ---------- */
  useEffect(() => {
    if (!open) return;
    const uniqueEmails = Array.from(
      new Map(contacts.map(c => [c.email, c])).values()
    );

    setLocalContacts(uniqueEmails);
    setSelectedEmails(uniqueEmails.map(c => c.email));
    setError("");
  }, [contacts, open]);

  if (!open) return null;

  /* ---------- SELECT ALL ---------- */
  const allSelected =
    localContacts.length > 0 &&
    localContacts.every(c => selectedEmails.includes(c.email));

  const toggleSelectAll = () => {
    setSelectedEmails(
      allSelected ? [] : localContacts.map(c => c.email)
    );
  };

  const toggleEmail = (email) => {
    setSelectedEmails(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  /* ---------- SEND ---------- */
  const handleSend = async () => {
    if (!selectedEmails.length) {
      setError("Select at least one email");
      return;
    }

    try {
      setIsSending(true);
      setError("");
      await onSend(selectedEmails);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {isSending && <TablePageSkeleton />}
      <div 
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50" 
        onClick={!isSending ? onClose : undefined}
      >
        <div className="model-container" onClick={(e) => e.stopPropagation()}>
          <div className="model-header flex justify-between items-center">
            <h2 className="font-semibold text-lg">
              Send Summary Email – {projectName}
            </h2>
            <button onClick={onClose} disabled={isSending} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="model-body">
            {/* SELECT ALL */}
            {localContacts.length > 0 && (
              <label className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={isSending}
                  className="w-4 h-4 mr-3"
                />
                <span className="text-sm font-medium">
                  Select all ({localContacts.length})
                </span>
              </label>
            )}

            {/* EMAIL LIST */}
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {localContacts.length === 0 && (
                <p className="p-3 text-sm text-gray-500">
                  No emails found
                </p>
              )}

              {localContacts.map(contact => (
                <label
                  key={contact.email}
                  className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedEmails.includes(contact.email)}
                      onChange={() => toggleEmail(contact.email)}
                      disabled={isSending}
                      className="w-4 h-4 mr-3"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {contact.email}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {contact.role_type}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="model-footer">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSend}
              disabled={isSending || selectedEmails.length === 0}
              className="bg-blue-600 text-white"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-1" />
                  Send Summary ({selectedEmails.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
