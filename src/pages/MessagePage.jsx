import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, CheckCircle2, MoreVertical, Plus, User, MessageCircle, ArrowLeft } from 'lucide-react';
import localApi from '../services/localApi';
import { Customer } from '@/api/entities';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from "react-hot-toast";
import { formatDateUS, formatDateUTC } from "../utils/formatdate";

const formatDateLabel = (date) => {
    const today = new Date();
    const msgDate = new Date(date);

    const isToday =
        msgDate.toDateString() === today.toDateString();

    if (isToday) return "Today";

    return format(msgDate, "MMM d, yyyy");
};

const MessagePage = () => {
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'customers'
    const [globalSearch, setGlobalSearch] = useState('');
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [allCustomers, setAllCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [isSmsEnabled, setIsSmsEnabled] = useState(true);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        fetchContacts();
        fetchAllCustomers();
        fetchSmsSettings();
        const interval = setInterval(fetchContacts, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedContact) {
            fetchHistory(selectedContact.phone);
        }
    }, [selectedContact]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchContacts = async () => {
        try {
            const data = await localApi.functions.getChatContacts();
            setContacts(data);
        } catch (err) {
            console.error('Error fetching contacts:', err);
        }
    };

    const fetchSmsSettings = async () => {
        try {
            const res = await localApi.functions.getSmsSettings();
            const settings = Array.isArray(res) ? res[0] : res;
            setIsSmsEnabled(settings?.enabled ?? false);
        } catch (err) {
            console.error("Error fetching SMS settings:", err);
            setIsSmsEnabled(false);
        }
    };

    const fetchAllCustomers = async () => {
        try {
            const response = await Customer.list({ limit: 1000 });
            const data = Array.isArray(response) ? response : (response?.data ?? []);
            setAllCustomers(data);
        } catch (err) {
            console.error('Error fetching all customers:', err);
        }
    };

    const fetchHistory = async (phone) => {
        try {
            setIsLoading(true);
            
            // Optimistically update local contacts to remove the badge immediately
            setContacts(prev => prev.map(c => 
                c.phone === phone ? { ...c, unreadCount: 0 } : c
            ));
            
            const data = await localApi.functions.getChatHistory(phone);
            setMessages(data);
            
            // Try to mark as read on backend if endpoint exists (ignoring errors if it doesn't)
            try {
                if (localApi.functions.markAsRead) {
                    await localApi.functions.markAsRead(phone);
                }
            } catch (e) {}

            // Refetch contacts to sync state from backend
            fetchContacts();
            
            // Dispatch event to force global hook to refresh
            window.dispatchEvent(new Event('messagesRead'));
        } catch (err) {
            console.error('Error fetching history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!isSmsEnabled) {
            toast.error("Please enable SMS settings");
            return;
        }
        if (!newMessage.trim() || !selectedContact) return;

        const messageData = {
            to: selectedContact.phone,
            body: newMessage.trim(),
            isWhatsApp: false
        };

        try {
            const sentMsg = await localApi.functions.sendChatMessage(messageData);
            setMessages([...messages, sentMsg]);
            setNewMessage('');
            fetchContacts();
        } catch (err) {
            console.error('Error sending message:', err);
            toast.error("Failed to send message");
        }
    };

    // const filteredContacts = contacts.filter(c => {
    //     const search = (sidebarSearch || globalSearch).toLowerCase();
    //     return (c.name?.toLowerCase() || "").includes(search) ||
    //         (c.phone || "").includes(search);
    // });

    // const filteredAllCustomers = allCustomers.filter(c => {
    //     const search = (sidebarSearch || globalSearch).toLowerCase();
    //     return (c.contact_name?.toLowerCase() || "").includes(search) ||
    //         (c.company_name?.toLowerCase() || "").includes(search) ||
    //         (c.phone || "").includes(search);
    // });

   const filteredContacts = contacts.filter(c => {
    const search = String(sidebarSearch || globalSearch || '').toLowerCase();
    return String(c.name ?? '').toLowerCase().includes(search) ||
        String(c.phone ?? '').includes(search);
});

const filteredAllCustomers = allCustomers.filter(c => {
    const search = String(sidebarSearch || globalSearch || '').toLowerCase();
    return String(c.contact_name ?? '').toLowerCase().includes(search) ||
        String(c.company_name ?? '').toLowerCase().includes(search) ||
        String(c.phone ?? '').includes(search);
});

    return (
        <div className="flex flex-col h-[calc(100vh-50px)] gap-4">
            {/* Top Header */}
            <div>
                <h1 className="text-xl md:text-2xl font-bold">Message</h1>
                <p className="text-sm text-gray-500">Manage Contacts Text Message</p>
            </div>

            {/* Global Search
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search Customer..."
                    className="w-full pl-12 pr-4 py-4 bg-white rounded-xl shadow-sm text-sm focus:outline-none border-none ring-1 ring-gray-200"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                />
            </div> */}

            <div className="flex-1 flex bg-white rounded-xl shadow-lg border dark:border-gray-700 overflow-hidden dark:bg-[#1f2937]">
                {/* Sidebar */}
                <div
                    className={cn(
                        "border-r dark:border-gray-700 flex flex-col bg-white dark:bg-[#1f2937]",
                        selectedContact ? "hidden md:flex md:w-80" : "w-full md:w-80"
                    )}
                >
                    <div className="p-4 border-b dark:border-gray-700 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none ring-1 ring-gray-100"
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                            />
                        </div>

                        <div className="flex border-b dark:border-gray-700">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-semibold transition-colors",
                                    activeTab === 'all' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                All Message
                            </button>
                            <button
                                onClick={() => setActiveTab('customers')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-semibold transition-colors",
                                    activeTab === 'customers' ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                Contacts
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {activeTab === 'all' ? (
                            filteredContacts.map((contact) => (
                                <div
                                    key={contact.phone}
                                    onClick={() => setSelectedContact(contact)}
                                    className={cn(
                                        "p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-3 dark:hover:bg-black",
                                        selectedContact?.phone === contact.phone && "bg-gray-50 dark:bg-black border-l-4 border-l-blue-600"
                                    )}
                                >
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                            <User className="w-6 h-6 text-gray-500" />
                                        </div>
                                        {contact.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                                {contact.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-sm font-semibold truncate">{contact.name}</h3>
                                            <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                                {contact.timestamp ? format(new Date(contact.timestamp), 'MMM d') : ''}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">{contact.lastMessage || 'No messages'}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            filteredAllCustomers.map((customer) => (
                                <div
                                    key={customer.id}
                                    onClick={() => {
                                        setSelectedContact({
                                            name: customer.contact_name || customer.company_name,
                                            phone: customer.phone,
                                            unreadCount: 0
                                        });
                                    }}
                                    className={cn(
                                        "p-4 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-black transition-colors flex items-center gap-3",
                                        selectedContact?.phone === customer.phone && "bg-blue-50 dark:bg-black border-l-4 border-l-blue-600"
                                    )}
                                >
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-semibold truncate">
                                            {customer.contact_name || customer.company_name}
                                        </h3>
                                        <p className="text-xs text-gray-500 truncate">{customer.phone}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                {selectedContact && (
                    <div className="flex-1 flex flex-col bg-gray-50 min-w-0 dark:bg-[#1f2937]">
                        <div className="p-4 bg-white border-b flex justify-between items-center dark:bg-[#1f2937] dark:border-gray-700">
                            <div className="flex items-center gap-3 ">
                                <button
                                    onClick={() => setSelectedContact(null)}
                                    className="md:hidden p-2 rounded-full hover:bg-gray-100"
                                >
                                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                                </button>
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold ">{selectedContact.name}</h3>
                                    <p className="text-xs text-gray-500">{selectedContact.phone}</p>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-gray-100 rounded-full">
                                <MoreVertical className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {messages.map((msg, idx) => {
                                const isOutbound = msg.direction === 'outbound';

                                const currentDate = new Date(msg.timestamp).toDateString();
                                const prevDate =
                                    idx > 0
                                        ? new Date(messages[idx - 1].timestamp).toDateString()
                                        : null;

                                const showDateHeader = currentDate !== prevDate;

                                return (
                                    <React.Fragment key={msg._id || idx}>
                                        {showDateHeader && (
                                            <div className="flex justify-center my-2">
                                                <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-full">
                                                    {formatDateUTC(msg.timestamp)}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            className={cn(
                                                "flex",
                                                isOutbound ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            {!isOutbound && (
                                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2 mt-auto">
                                                    <User className="w-4 h-4 text-white" />
                                                </div>
                                            )}

                                            <div className="max-w-[70%]">
                                                <div
                                                    className={cn(
                                                        "p-3 rounded-2xl text-sm break-words max-w-full",
                                                        isOutbound
                                                            ? "bg-blue-100 text-blue-900 rounded-br-none dark:bg-blue-700 dark:text-white"
                                                            : "bg-white text-gray-900 border rounded-bl-none shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                                                    )}
                                                >
                                                    {msg.body}

                                                    <div
                                                        className={cn(
                                                            "text-[10px] mt-1 flex items-center",
                                                            isOutbound
                                                                ? "text-blue-500 dark:text-blue-200 justify-end"
                                                                : "text-gray-400 dark:text-gray-400"
                                                        )}
                                                    >
                                                        {format(new Date(msg.timestamp), "h:mm a")}
                                                        {isOutbound && (
                                                            <CheckCircle2 className="w-3 h-3 ml-1 fill-current" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}

                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex items-center gap-2 dark:bg-[#1f2937] dark:border-gray-700">
                            <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <Plus className="w-5 h-5 text-gray-400" />
                            </button>
                            <input
                                type="text"
                                placeholder="Type your message"
                                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none dark:bg-black dark:text-white border dark:border-gray-700"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                )}
                {!selectedContact && (
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-[#1f2937]">
                        <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a customer to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagePage;
