import { useState, useEffect } from 'react';
import { interactionAPI } from '../services/api';
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    link?: string;
    created_at: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const res = await interactionAPI.getNotifications();
            setNotifications(res.data);
        } catch (err) {
            console.error("Failed to load notifications", err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await interactionAPI.readNotification(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-success" />;
            case 'warning': return <AlertTriangle size={20} className="text-warning" />;
            case 'study': return <Clock size={20} className="text-primary" />;
            default: return <Info size={20} className="text-info" />;
        }
    };

    if (loading) return <div className="page-container">Loading...</div>;

    return (
        <div className="page-container animate-fade-in">
            <div className="flex-between mb-8">
                <div>
                    <h1 className="flex-center gap-3">
                        <Bell size={32} color="var(--primary-color)" />
                        Notifications
                    </h1>
                    <p className="text-secondary mt-1">Stay updated with your study progress and community activities.</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto">
                {notifications.length === 0 ? (
                    <div className="card text-center p-12 opacity-50">
                        <Bell size={48} className="mx-auto mb-4" />
                        <h3>All caught up!</h3>
                        <p>No new notifications at the moment.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {notifications.map(n => (
                            <div 
                                key={n.id} 
                                className={`card notification-card ${!n.is_read ? 'unread' : ''}`}
                                style={{ 
                                    display: 'flex', 
                                    gap: 16, 
                                    alignItems: 'flex-start',
                                    borderLeft: !n.is_read ? '4px solid var(--primary-color)' : 'none'
                                }}
                            >
                                <div className="mt-1">{getIcon(n.type)}</div>
                                <div style={{ flex: 1 }}>
                                    <div className="flex-between mb-1">
                                        <h4 className="font-bold">{n.title}</h4>
                                        <span className="text-xs text-secondary">{new Date(n.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-secondary mb-3">{n.message}</p>
                                    <div className="flex gap-4">
                                        {n.link && (
                                            <a href={n.link} className="text-xs font-bold text-primary hover-underline">View Details</a>
                                        )}
                                        {!n.is_read && (
                                            <button 
                                                className="text-xs font-bold text-secondary hover-text-primary flex-center gap-1"
                                                onClick={() => markAsRead(n.id)}
                                            >
                                                <Check size={12} /> Mark as Read
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
