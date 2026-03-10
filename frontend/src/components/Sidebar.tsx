import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Search, Upload, MessageCircle, BarChart3,
    Trophy, User, LogOut, ChevronLeft, ChevronRight, Sun, Moon,
    BookOpen, GraduationCap, Timer, StickyNote, FolderOpen, PieChart, Bookmark, BrainCircuit, Brain, Users
} from 'lucide-react';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
}

const navItems = [
    {
        section: 'Main', items: [
            { path: '/', label: 'Dashboard', icon: LayoutDashboard },
            { path: '/search', label: 'Search', icon: Search },
            { path: '/upload', label: 'Upload', icon: Upload },
        ]
    },
    {
        section: 'AI & Insights', items: [
            { path: '/chatbot', label: 'EduBot', icon: MessageCircle },
            { path: '/analyzer', label: 'AI Analyzer', icon: BrainCircuit },
            { path: '/analytics', label: 'Analytics', icon: BarChart3 },
            { path: '/my-analytics', label: 'My Analytics', icon: PieChart },
        ]
    },
    {
        section: 'Study Tools', items: [
            { path: '/study-timer', label: 'Study Timer', icon: Timer },
            { path: '/rooms', label: 'Study Rooms', icon: Users },
            { path: '/notes', label: 'My Notes', icon: StickyNote },
            { path: '/collections', label: 'Collections', icon: FolderOpen },
            { path: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
            { path: '/flashcards', label: 'SRS Flashcards', icon: Brain },
        ]
    },
    {
        section: 'Community', items: [
            { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
            { path: '/profile', label: 'Profile', icon: User },
        ]
    },
];

export default function Sidebar({ collapsed, onToggle, theme, onThemeToggle }: SidebarProps) {
    const { user, logout } = useAuth();

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
                {navItems.map((section) => (
                    <div className="nav-section" key={section.section}>
                        {!collapsed && <div className="nav-section-title">{section.section}</div>}
                        {section.items.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                title={collapsed ? item.label : undefined}
                            >
                                <item.icon size={20} />
                                {!collapsed && <span>{item.label}</span>}
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
