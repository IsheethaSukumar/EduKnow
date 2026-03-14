import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudy } from '../context/StudyContext';
import {
    LayoutDashboard, Search, Upload, MessageCircle, BarChart3,
    Trophy, User, LogOut, ChevronLeft, ChevronRight, Sun, Moon,
    BookOpen, GraduationCap, Timer, StickyNote, FolderOpen, PieChart, Bookmark, BrainCircuit, Brain, Users, MessageSquare
} from 'lucide-react';

import { LucideIcon } from 'lucide-react';

interface NavItem {
    path: string;
    label: string;
    icon: LucideIcon;
    badge?: string;
}

interface NavSection {
    section: string;
    items: NavItem[];
}

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle, theme, onThemeToggle }: SidebarProps) {
    const { user, logout } = useAuth();
    const { isRunning, timeLeft, formatTime } = useStudy();

    const getNavItems = (role: string = 'student'): NavSection[] => {
        const isAdmin = role === 'admin';

        const items: NavSection[] = [
            {
                section: 'Main', items: [
                    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
                    { path: '/search', label: 'Search', icon: Search },
                    { path: '/notifications', label: 'Notifications', icon: BookOpen },
                    { path: '/upload', label: 'Upload', icon: Upload },
                ]
            },
        ];

        if (isAdmin) {
            items.push({
                section: 'AI & Insights', items: [
                    { path: '/chatbot', label: 'EduBot', icon: MessageCircle },
                    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
                ]
            });
        } else {
            items.push({
                section: 'AI & Insights', items: [
                    { path: '/chatbot', label: 'EduBot', icon: MessageCircle },
                    { path: '/analyzer', label: 'AI Analyzer', icon: BrainCircuit },
                    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
                    { path: '/my-analytics', label: 'My Analytics', icon: PieChart },
                ]
            });
        }

        if (!isAdmin) {
            items.push({
                section: 'Study Tools', items: [
                    {
                        path: '/study-timer',
                        label: 'Study Timer',
                        icon: Timer,
                        badge: isRunning ? formatTime(timeLeft) : undefined
                    },
                    { path: '/rooms', label: 'Study Rooms', icon: Users },
                    { path: '/notes', label: 'My Notes', icon: StickyNote },
                    { path: '/collections', label: 'Collections', icon: FolderOpen },
                    { path: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
                    { path: '/flashcards', label: 'SRS Flashcards', icon: Brain },
                    { path: '/assignments', label: 'Assignments', icon: GraduationCap },
                ]
            });
        }

        items.push({
            section: 'Community', items: [
                { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
                { path: '/profile', label: 'Profile', icon: User },
                { path: '/complaints', label: 'Complaints', icon: MessageSquare },
            ]
        });

        return items;
    };

    const getAvatarColor = (name: string) => {
        const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
        const idx = name.charCodeAt(0) % colors.length;
        return colors[idx];
    };

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #818cf8, #38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <GraduationCap size={20} color="white" />
                </div>
                {!collapsed && <span className="logo-text">EduKno</span>}
            </div>

            <nav className="sidebar-nav">
                {getNavItems(user?.role).map((section: NavSection) => (
                    <div className="nav-section" key={section.section}>
                        {!collapsed && <div className="nav-section-title">{section.section}</div>}
                        {section.items.map((item: NavItem) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                title={collapsed ? (item.badge ? `${item.label} (${item.badge})` : item.label) : undefined}
                            >
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <item.icon size={20} />
                                    {item.badge && collapsed && (
                                        <div style={{
                                            position: 'absolute', top: -4, right: -4, width: 8, height: 8,
                                            borderRadius: '50%', backgroundColor: '#6366f1', border: '2px solid var(--bg-secondary)'
                                        }} />
                                    )}
                                </div>
                                {!collapsed && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span>{item.label}</span>
                                        {item.badge && (
                                            <span style={{
                                                fontSize: '0.7rem', padding: '2px 6px', borderRadius: 10,
                                                backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', fontWeight: 600
                                            }}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item" onClick={onThemeToggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
                </button>
                <button className="nav-item" onClick={onToggle}>
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    {!collapsed && <span>Collapse</span>}
                </button>
                <button className="nav-item" onClick={logout} title="Logout">
                    <LogOut size={20} />
                    {!collapsed && <span>Logout</span>}
                </button>
                {user && (
                    <div className="sidebar-user">
                        <div
                            className="avatar"
                            style={{ background: getAvatarColor(user.full_name) }}
                        >
                            {user.full_name.charAt(0)}
                        </div>
                        {!collapsed && (
                            <div className="user-info">
                                <h4>{user.full_name}</h4>
                                <p style={{ textTransform: 'capitalize' }}>{user.role}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
