import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import localApi from '../services/localApi';

const useGlobalMessages = () => {
    const unreadCountsRef = useRef({});
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();
    
    // Play a short notification beep using the Web Audio API
    const playNotificationSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // Notification sound parameters (short, pleasant beep)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // Pitch (A5)
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); 
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05); // Volume up
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); // Fade out
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (error) {
            console.log('Audio play failed:', error);
        }
    };

    useEffect(() => {
        const checkForNewMessages = async () => {
            try {
                if (!localStorage.getItem('token')) return;

                const contacts = await localApi.functions.getChatContacts();
                let hasNewMessage = false;
                
                const currentCounts = {};
                let currentTotal = 0;
                
                const isInitialLoad = Object.keys(unreadCountsRef.current).length === 0;

                const contactsData = Array.isArray(contacts) ? contacts : (contacts?.data || []);
                contactsData.forEach(contact => {
                    if (!contact.phone) return;
                    
                    const prevCount = Number(unreadCountsRef.current[contact.phone]) || 0;
                    const currentCount = Number(contact.unreadCount) || 0;
                    currentTotal += currentCount;
                    
                    if (!isInitialLoad && currentCount > prevCount) {
                        hasNewMessage = true;
                        
                        toast((t) => (
                            <div 
                                className="flex flex-col gap-1 cursor-pointer" 
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    if (location.pathname !== '/message') {
                                        navigate('/message');
                                    }
                                }}
                            >
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                    New Message from {contact.name || contact.phone}
                                </span>
                                <span className="text-xs text-gray-500 line-clamp-1">
                                    {contact.lastMessage || 'New text message received'}
                                </span>
                            </div>
                        ), { 
                            duration: 5000, 
                            position: 'top-right',
                            icon: '💬',
                        });
                    }
                    currentCounts[contact.phone] = currentCount;
                });
                
                setTotalUnreadCount(currentTotal);
                
                if (hasNewMessage) {
                    playNotificationSound();
                }
                
                unreadCountsRef.current = currentCounts;
                
            } catch (error) {
                console.error('Error checking for new messages:', error);
            }
        };

        checkForNewMessages();
        const intervalId = setInterval(checkForNewMessages, 10000);
        
        // Listen for manual read events from MessagePage
        window.addEventListener('messagesRead', checkForNewMessages);
        
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('messagesRead', checkForNewMessages);
        };
    }, [location.pathname, navigate]);

    return { totalUnreadCount };
};

export default useGlobalMessages;
