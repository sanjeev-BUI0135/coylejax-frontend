import React, { useState, useEffect } from 'react';
import { XCircle, MessageSquare, Trash, Phone } from 'lucide-react';
import InputMask from "react-input-mask";
import Swal from 'sweetalert2';
import localApi from '../../services/localApi';

const EstimateSmsPopup = ({ estimates, type = 'summary', onClose, onSmsSent, isSingleSms = false }) => {
    const [contacts, setContacts] = useState([]);
    const [selected, setSelected] = useState({});
    const [selectAll, setSelectAll] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [newContact, setNewContact] = useState({ name: '', phone: '' });
    const [phoneError, setPhoneError] = useState("");

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                setIsLoading(true);

                const allCustomerContacts = [];

                for (const estimate of estimates) {

                    // Quick Estimate
                    if (
                        estimate.is_quick_estimate &&
                        estimate.quick_customer?.phone_number
                    ) {
                        allCustomerContacts.push({
                            name: `${estimate.quick_customer.customer_name || estimate.quick_customer.company_name} (Primary)`,
                            phone: estimate.quick_customer.phone_number,
                            type: "primary",
                        });

                        continue;
                    }

                    // Normal Estimate
                    const projectId = estimate.project_id;

                    if (!projectId) continue;

                    const projectResponse = await fetch(
                        `${import.meta.env.VITE_API_BASE}/projects/${projectId}`,
                        {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem("token")}`,
                            },
                        }
                    );

                    if (!projectResponse.ok) continue;

                    const projectData = await projectResponse.json();

                    let customerIds = [];

                    if (
                        projectData.customer_ids &&
                        Array.isArray(projectData.customer_ids)
                    ) {
                        customerIds = projectData.customer_ids.map((c) =>
                            typeof c === "string" ? c : c._id || c.id
                        );
                    }

                    for (const customerId of customerIds) {
                        try {
                            const customerResponse = await fetch(
                                `${import.meta.env.VITE_API_BASE}/customers/${customerId}`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                                    },
                                }
                            );

                            if (!customerResponse.ok) continue;

                            const customer = await customerResponse.json();

                            if (customer.phone) {
                                allCustomerContacts.push({
                                    name: `${customer.contact_name || customer.company_name} (Primary)`,
                                    phone: customer.phone,
                                    type: "primary",
                                });
                            }

                            if (
                                customer.additional_contacts &&
                                Array.isArray(customer.additional_contacts)
                            ) {
                                customer.additional_contacts.forEach((contact, index) => {
                                    if (contact.phone) {
                                        allCustomerContacts.push({
                                            name: `${contact.contact_name || `Additional Contact ${index + 1}`} (${customer.company_name})`,
                                            phone: contact.phone,
                                            type: "additional",
                                        });
                                    }
                                });
                            }
                        } catch (err) {
                            console.error(
                                `Error fetching customer ${customerId}:`,
                                err
                            );
                        }
                    }
                }

                const storedCustom = JSON.parse(
                    localStorage.getItem("customPhones") || "[]"
                );

                const mergedContacts = [
                    ...allCustomerContacts,
                    ...storedCustom,
                ];

                const uniqueContacts = Array.from(
                    new Map(mergedContacts.map((c) => [c.phone, c])).values()
                );

                setContacts(uniqueContacts);

                const initialSelected = {};

                uniqueContacts.forEach((c) => {
                    initialSelected[c.phone] = true;
                });

                setSelected(initialSelected);
                setSelectAll(uniqueContacts.length > 0);
            } catch (err) {
                console.error("Error fetching contacts:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContacts();
    }, [estimates]);

    const handleAddContact = () => {
        setPhoneError("");
        if (!newContact.name.trim() || !newContact.phone.trim()) return;
        const digitsOnly = newContact.phone.replace(/\D/g, "");

        if (digitsOnly.length !== 10 || newContact.phone.includes("_")) {
            setPhoneError("Please enter at least 10 digits.");
            return;
        }
        const phone = newContact.phone.trim();
        if (contacts.some(c => c.phone === phone)) {
            Swal.fire({ icon: 'warning', title: 'Duplicate Phone', text: 'This phone number is already in the list.' });
            return;
        }
        const customContact = { name: newContact.name.trim(), phone, type: 'custom' };
        setContacts(prev => [...prev, customContact]);
        setSelected(prev => {
            const updated = { ...prev, [phone]: true };
            const allSelected = contacts.length + 1 > 0 && [...contacts, customContact].every(c => updated[c.phone]);
            setSelectAll(allSelected);
            return updated;
        });

        const existing = JSON.parse(localStorage.getItem("customPhones") || "[]");
        localStorage.setItem("customPhones", JSON.stringify([...existing, customContact]));
        setNewContact({ name: '', phone: '' });
        setPhoneError("");
    };

    const handleRemoveContact = (phone) => {
        setContacts(prev => {
            const updatedContacts = prev.filter(c => c.phone !== phone);
            setSelected(prevSelected => {
                const updatedSelected = { ...prevSelected };
                delete updatedSelected[phone];
                const allSelected = updatedContacts.length > 0 && updatedContacts.every(c => updatedSelected[c.phone]);
                setSelectAll(allSelected);
                return updatedSelected;
            });
            return updatedContacts;
        });
        const existing = JSON.parse(localStorage.getItem("customPhones") || "[]");
        localStorage.setItem("customPhones", JSON.stringify(existing.filter(c => c.phone !== phone)));
    };

    const toggleSelect = (phone) => {
        setSelected(prev => {
            const updated = { ...prev, [phone]: !prev[phone] };
            const allSelected = contacts.length > 0 && contacts.every(c => updated[c.phone]);
            setSelectAll(allSelected);
            return updated;
        });
    };

    const toggleSelectAll = () => {
        const nextValue = !selectAll;
        const nextSelected = {};
        contacts.forEach(c => { nextSelected[c.phone] = nextValue; });
        setSelected(nextSelected);
        setSelectAll(nextValue);
    };

    const sendBulkSms = async () => {
        const phonesToSend = contacts.filter(c => selected[c.phone]).map(c => c.phone);
        if (phonesToSend.length === 0) {
            Swal.fire({ icon: 'warning', title: 'No Contacts Selected', text: 'Select at least one contact.' });
            return;
        }

        try {
            setIsLoading(true);
            Swal.fire({
                title: `Sending SMS...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            for (const estimate of estimates) {
                await localApi.functions.sendEstimateSms(estimate.id || estimate._id, {
                    phone_numbers: phonesToSend,
                    isWhatsApp: false,
                    sms_type: type
                });
            }

            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: `SMS sent successfully!`
            });
            if (onSmsSent) onSmsSent();
            onClose();
        } catch (err) {
            console.error('Error sending SMS:', err);
            Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Failed to send SMS.' });
        } finally {
            setIsLoading(false);
        }
    };

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="model-container w-[90%] max-w-md sm:max-w-lg md:max-w-xl mx-auto">
                <div className="model-header flex justify-between items-center">
                    <h2 className="font-semibold text-lg">
                        {isSingleSms
                            ? `Send ${typeLabel} Message - ${estimates[0]?.estimate_number}`
                            : `Send Bulk ${typeLabel} Messages (${estimates.length} estimates)`}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><XCircle className="w-5 h-5" /></button>
                </div>
                <div className="model-body">

                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
                        <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="w-4 h-4 mr-3" />
                        <span className="text-sm font-medium">Select all ({contacts.length})</span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                        {contacts.map((c) => (
                            <div key={c.phone} className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                <div className="flex items-center">
                                    <input type="checkbox" checked={selected[c.phone] || false} onChange={() => toggleSelect(c.phone)} className="w-4 h-4 mr-3" />
                                    <div>
                                        <div className="text-sm font-medium">{c.name}</div>
                                        <div className="text-xs text-gray-500">{c.phone}</div>
                                    </div>
                                </div>
                                {c.type === 'custom' && (
                                    <button onClick={() => handleRemoveContact(c.phone)} className="text-red-500"><Trash className="w-4 h-4" /></button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                        <h3 className="text-sm font-medium mb-3">Add Custom Phone</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="text" placeholder="Name" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} className="px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 rounded text-sm w-full" />
                            <InputMask
                                mask="(999) 999-9999"
                                value={newContact.phone}
                                onChange={(e) =>
                                    setNewContact({
                                        ...newContact,
                                        phone: e.target.value,
                                    })
                                }
                            >
                                {(inputProps) => (
                                    <input
                                        {...inputProps}
                                        type="tel"
                                        placeholder="123-456-7890"
                                        className="px-3 py-2 border dark:border-gray-700 dark:bg-gray-800 rounded text-sm w-full"
                                    />
                                )}
                            </InputMask>
                            {phoneError && (
                                <p className="text-red-500 text-xs mt-1">
                                    {phoneError}
                                </p>
                            )}
                        </div>
                        <button onClick={handleAddContact} className="mt-3 w-full py-2 bg-blue-600 text-white rounded text-sm">Add Phone</button>
                    </div>
                </div>
                <div className="model-footer flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 border rounded text-sm">Cancel</button>
                    <button onClick={sendBulkSms} disabled={isLoading || Object.values(selected).filter(Boolean).length === 0} className={`px-6 py-2 rounded text-sm text-white bg-blue-600`}>
                        Send SMS
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EstimateSmsPopup;
