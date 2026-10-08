import React, { useState, useEffect } from 'react';
import { XCircle, Mail, Trash } from 'lucide-react';
import Swal from 'sweetalert2';

const API_BASE_URL = import.meta.env.VITE_API_BASE;

const InvoiceEmailPopup = ({ invoices, type, onClose, onEmailSent, isSingleEmail = false }) => {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState({});
  const [selectAll, setSelectAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '' });
  const [initialized, setInitialized] = useState(false);

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.email.trim()) return;
    const email = newContact.email.trim().toLowerCase();
    if (contacts.some(contact => contact.email.toLowerCase() === email)) {
      Swal.fire({ icon: 'warning', title: 'Duplicate Email', text: 'This email is already in the contact list.' });
      return;
    }
    const customContact = { name: newContact.name.trim(), email: email, type: 'custom' };
    setContacts(prev => [...prev, customContact]);
     setSelected(prev => { const updated = { ...prev, [email]: true }; setSelectAll(Object.values(updated).every(Boolean)); return updated;});
    const existing = JSON.parse(localStorage.getItem("customEmails") || "[]");
    const exists = existing.some(c => c.email === email);
    if (!exists) {
      localStorage.setItem(
        "customEmails",
        JSON.stringify([...existing, customContact])
      );
    }
    setNewContact({ name: '', email: '' });
  };

  const handleRemoveContact = (email) => {
    setContacts(prev => {
      const updatedContacts = prev.filter(contact => contact.email !== email);
      setSelected(prevSelected => {
        const updatedSelected = { ...prevSelected };
        delete updatedSelected[email];
        setSelectAll(updatedContacts.length > 0 && updatedContacts.every(c => updatedSelected[c.email]));
        return updatedSelected;
      });
      return updatedContacts;
    });
    const existing = JSON.parse(localStorage.getItem("customEmails") || "[]");
    const updated = existing.filter(c => c.email !== email);
    localStorage.setItem("customEmails", JSON.stringify(updated));
  };

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setIsLoading(true);
        const allCustomerContacts = [];
        const projectIds = [...new Set(invoices.map(inv => inv.project_id))];

        for (const projectId of projectIds) {
          const projectResponse = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          if (!projectResponse.ok) continue;
          const projectData = await projectResponse.json();
          let customerIds = [];
          if (projectData.customer_ids && Array.isArray(projectData.customer_ids)) {
            customerIds = projectData.customer_ids.map(c => typeof c === 'string' ? c : (c._id || c.id));
          }
          for (const customerId of customerIds) {
            try {
              const customerResponse = await fetch(`${API_BASE_URL}/customers/${customerId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
              });
              if (!customerResponse.ok) continue;
              const customer = await customerResponse.json();

              if (customer.email) {
                allCustomerContacts.push({
                  name: `${customer.contact_name || customer.company_name} (Primary)`,
                  email: customer.email,
                  type: 'primary',
                  companyName: customer.company_name,
                  customerId: customer.id || customer._id
                });
              }
              if (customer.additional_contacts && Array.isArray(customer.additional_contacts)) {
                customer.additional_contacts.forEach((contact, index) => {
                  if (contact.email) {
                    allCustomerContacts.push({
                      name: `${contact.contact_name || `Additional Contact ${index + 1}`} (${customer.company_name})`,
                      email: contact.email,
                      type: 'additional',
                      companyName: customer.company_name,
                      customerId: customer.id || customer._id
                    });
                  }
                });
              }
            } catch (customerError) {
              console.error(`Error fetching customer ${customerId}:`, customerError);
            }
          }
        }
        const storedCustom = JSON.parse(localStorage.getItem("customEmails") || "[]");
        const mergedContacts = [...allCustomerContacts, ...storedCustom];
        const uniqueContacts = Array.from(new Map(mergedContacts.map(c => [c.email, c])).values());
        setContacts(uniqueContacts);
        const initialSelected = {};
        uniqueContacts.forEach(c => { if (c.email) initialSelected[c.email] = false; });
        setSelected(initialSelected);
        setSelectAll(false);
      } catch (err) {
        console.error('Error fetching customer contacts:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load customer contacts.' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchContacts();
  }, [invoices]);

  useEffect(() => {
  if (!initialized && contacts.length > 0) {
    const initialSelected = {};

    contacts.forEach(c => {
      initialSelected[c.email] = true;
    });

    setSelected(initialSelected);
    setSelectAll(true);
    setInitialized(true);
  }
}, [contacts, initialized]);


  const toggleSelect = (email) => {
    setSelected(prev => {
      const newState = { ...prev, [email]: !prev[email] };
      const allSelected = Object.values(newState).every(Boolean);
      setSelectAll(allSelected);
      return newState;
    });
  };

  const toggleSelectAll = () => {
    const newState = {};
    contacts.forEach(c => newState[c.email] = !selectAll);
    setSelected(newState);
    setSelectAll(!selectAll);
  };



  const sendBulkEmail = async () => {
    const emailsToSend = contacts.filter(c => selected[c.email]).map(c => c.email);

    if (emailsToSend.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Contacts Selected', text: 'Please select at least one contact to send email.' });
      return;
    }

    try {
      setIsLoading(true);
      Swal.fire({
        title: 'Sending Emails...',
        html: `Sending ${type} email${emailsToSend.length > 1 ? 's' : ''} to ${emailsToSend.length} contact${emailsToSend.length > 1 ? 's' : ''}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      for (const invoice of invoices) {
        const emailData = {
          email_type: type,
          emails: emailsToSend,
          project_id: invoice.project_id,
          customer_id: invoice.customer_id
        };
        const response = await fetch(`${API_BASE_URL}/invoices/${invoice._id}/send-email`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(emailData)
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to send email');
        }
      }

      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `${isSingleEmail ? 'Email' : 'Bulk emails'} sent successfully for ${invoices.length} invoice${invoices.length > 1 ? 's' : ''} to ${emailsToSend.length} contact${emailsToSend.length > 1 ? 's' : ''}!`
      });
      if (onEmailSent) onEmailSent();
      onClose();
    } catch (err) {
      console.error('Error sending emails:', err);
      Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Failed to send emails.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="model-container">
        <div className="model-header">
          <h2 className="font-semibold">
            {isSingleEmail
              ? `Send ${type === 'summary' ? 'Summary' : 'Details'} Email - ${invoices[0]?.invoice_number}`
              : `Send Bulk ${type === 'summary' ? 'Summary' : 'Details'} Emails (${invoices.length} invoices)`
            }
          </h2>
        </div>
        <div className="model-body">
          {isLoading && contacts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 animate-spin border-3 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-3" />
              <p className="">Loading contacts...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center p-3 bg-gray50-temp rounded-lg mb-4 dark:bg-gray-900">
                <input type="checkbox" id="select-all-bulk" checked={selectAll} onChange={toggleSelectAll} className="w-4 h-4 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" disabled={isLoading} />
                <label htmlFor="select-all-bulk" className="ml-3 text-sm font-medium  cursor-pointer"> Select all ({contacts.length} contacts) </label>
              </div>

              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium mb-1">No contacts available</p>
                  <p className="text-sm">Add contacts using the form below.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="grid grid-cols-12 gap-4 px-3 py-2 text-sm font-medium border-b mb-2">
                      <div className="col-span-1"></div>
                      <div className="col-span-4">Name</div>
                      <div className="col-span-6">Email</div>
                      <div className="col-span-1">Action</div>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {contacts.map((contact, index) => (
                        <div key={contact.email} className="grid grid-cols-12 gap-4 items-center p-3 hover:bg-gray50-temp rounded-lg border border-gray-200">
                          <div className="col-span-1">
                            <input type="checkbox" id={`bulk-contact-${index}`} checked={selected[contact.email] || false} onChange={() => toggleSelect(contact.email)} className="w-4 h-4  bg-gray-100 border-gray-300 rounded focus:ring-blue-500" disabled={isLoading} />
                          </div>
                          <div className="col-span-4">
                            <label htmlFor={`bulk-contact-${index}`} className="text-sm font-medium cursor-pointer block truncate">
                              {contact.name || 'Unnamed Contact'}
                            </label>
                          </div>
                          <div className="col-span-6">
                            <p className="text-sm truncate">{contact.email}</p>
                          </div>
                          <div className="col-span-1">
                            {contact.type === 'custom' && (
                              <button onClick={() => handleRemoveContact(contact.email)} className="text-red-500 hover:text-red-700">
                                <Trash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-sm">
                      {Object.values(selected).filter(Boolean).length} of {contacts.length} selected
                    </div>
                  </div>
                </>
              )}

              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4 dark:bg-gray-900">
                <h3 className="text-sm font-medium mb-3">Add New Contact</h3>
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <label className="block text-xs font-medium mb-1">Name</label>
                    <input type="text" placeholder="Enter name" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={newContact.name} onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))} />
                  </div>
                  <div className="col-span-5">
                    <label className="block text-xs font-medium mb-1">Email</label>
                    <input type="email" placeholder="Enter email" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" value={newContact.email} onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <button onClick={handleAddContact} disabled={!newContact.name.trim() || !newContact.email.trim()} className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <div className="model-footer">
          <button onClick={onClose} disabled={isLoading} className="px-6 py-2 text-sm font-medium text-gray-700temp bg-white border border-gray-300 rounded-lg hover:bg-gray50-temp">
            Cancel
          </button>
          <button onClick={sendBulkEmail} disabled={isLoading || contacts.length === 0 || Object.values(selected).filter(Boolean).length === 0} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                Sending...
              </div>
            ) : (
              isSingleEmail
                ? `Send ${type.charAt(0).toUpperCase() + type.slice(1)} (${Object.values(selected).filter(Boolean).length})`
                : `Send Bulk ${type.charAt(0).toUpperCase() + type.slice(1)} (${Object.values(selected).filter(Boolean).length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEmailPopup;