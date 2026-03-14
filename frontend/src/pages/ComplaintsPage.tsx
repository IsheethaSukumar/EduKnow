import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { interactionAPI } from '../services/api';
import { 
    MessageSquare, Send, CheckCircle, Clock, 
    AlertTriangle, Filter, Plus, ChevronDown 
} from 'lucide-react';

interface Complaint {
    id: string;
    title: string;
    description: string;
    category: string;
    status: 'open' | 'in_review' | 'resolved';
    priority: 'low' | 'medium' | 'high';
    created_at: string;
    resolved_at?: string;
    admin_response?: string;
}

const CATEGORIES = [
    'Technical Issue',
    'Content Quality',
    'Harassment / Bullying',
    'Inappropriate Content',
    'Account Issue',
    'Payment / Billing',
    'Feature Request',
    'Other',
];

const PRIORITY_COLORS: Record<string, string> = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
};

const STATUS_COLORS: Record<string, string> = {
    open: '#6366f1',
    in_review: '#f59e0b',
    resolved: '#10b981',
};

export default function ComplaintsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    
    // New state for tabs and chat reports
    const [activeTab, setActiveTab] = useState<'complaints' | 'reports'>('complaints');
    const [chatReports, setChatReports] = useState<any[]>([]);

    const [form, setForm] = useState({
        title: '',
        description: '',
        category: CATEGORIES[0],
        priority: 'medium' as 'low' | 'medium' | 'high',
    });

    useEffect(() => {
        loadComplaints();
        if (isAdmin) {
            loadChatReports();
        }
    }, [isAdmin]);

    const loadComplaints = async () => {
        try {
            const res = await interactionAPI.getComplaints();
            setComplaints(res.data);
        } catch (err) {
            console.error('Failed to load complaints', err);
            setComplaints([]);
        } finally {
            setLoading(false);
        }
    };

    const loadChatReports = async () => {
        try {
            const res = await interactionAPI.getChatReports();
            setChatReports(res.data);
        } catch (err) {
            console.error('Failed to load chat reports', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.description.trim()) return;
        setSubmitting(true);
        try {
            await interactionAPI.createComplaint(form);
            setSuccess(true);
            setShowForm(false);
            setForm({ title: '', description: '', category: CATEGORIES[0], priority: 'medium' });
            loadComplaints();
            setTimeout(() => setSuccess(false), 4000);
        } catch (err) {
            console.error('Failed to submit complaint', err);
            alert('Failed to submit complaint. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await interactionAPI.updateComplaintStatus(id, status);
            loadComplaints();
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    const handleWarnUser = async (reportId: string) => {
        try {
            const res = await interactionAPI.warnChatReport(reportId);
            alert(res.data.message || 'Action completed.');
            loadChatReports();
        } catch (err) {
            console.error('Failed to warn', err);
            alert('Failed to issue warning. User may not exist.');
        }
    };

    const filtered = complaints.filter(c => filterStatus === 'all' || c.status === filterStatus);
    const filteredReports = chatReports.filter(r => filterStatus === 'all' || r.status === filterStatus);

    const stats = {
        open: activeTab === 'complaints' 
            ? complaints.filter(c => c.status === 'open').length 
            : chatReports.filter(r => r.status === 'pending').length,
        in_review: activeTab === 'complaints'
            ? complaints.filter(c => c.status === 'in_review').length
            : 0,
        resolved: activeTab === 'complaints'
            ? complaints.filter(c => c.status === 'resolved').length
            : chatReports.filter(r => r.status === 'resolved').length,
    };

    return (
        <div className="page-container animate-fade-in">
            {/* Header */}
            <div className="flex-between mb-8">
                <div>
                    <h1 className="flex-center gap-3">
                        <MessageSquare size={32} color="var(--primary-color)" />
                        Complaints & Feedback
                    </h1>
                    <p className="text-secondary mt-1">
                        Submit issues, report problems, or provide feedback to administrators.
                    </p>
                </div>
                <button
                    className="btn btn-primary flex-center gap-2"
                    onClick={() => setShowForm(true)}
                >
                    <Plus size={20} />
                    New Complaint
                </button>
            </div>

            {/* Success Banner */}
            {success && (
                <div className="card-minimal flex-center gap-3 mb-6 animate-fade-in"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '14px 20px' }}>
                    <CheckCircle size={20} color="#10b981" />
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                        Your complaint has been submitted successfully. Our team will review it shortly.
                    </span>
                </div>
            )}

            {/* Stats */}
            <div className="grid-3 mb-8">
                {[
                    { label: 'Open', count: stats.open, color: '#6366f1', icon: AlertTriangle },
                    { label: 'In Review', count: stats.in_review, color: '#f59e0b', icon: Clock },
                    { label: 'Resolved', count: stats.resolved, color: '#10b981', icon: CheckCircle },
                ].map(stat => (
                    <div key={stat.label} className="card-glass text-center p-6">
                        <stat.icon size={28} style={{ color: stat.color, margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: stat.color }}>{stat.count}</div>
                        <div className="text-secondary text-sm">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs for Admin */}
            {isAdmin && (
                <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border-color)', marginBottom: 24 }}>
                    <button 
                        onClick={() => setActiveTab('complaints')}
                        style={{ padding: '12px 16px', fontWeight: 600, borderBottom: activeTab === 'complaints' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'complaints' ? 'var(--primary-color)' : 'var(--text-secondary)' }}
                    >
                        User Complaints
                    </button>
                    <button 
                        onClick={() => setActiveTab('reports')}
                        style={{ padding: '12px 16px', fontWeight: 600, borderBottom: activeTab === 'reports' ? '2px solid var(--primary-color)' : 'none', color: activeTab === 'reports' ? 'var(--primary-color)' : 'var(--text-secondary)' }}
                    >
                        Chat Reports
                    </button>
                </div>
            )}

            {/* Filter */}
            <div className="flex gap-3 mb-6">
                {['all', 'open', 'in_review', 'resolved'].map(s => {
                    // Chat reports use 'pending' instead of 'in_review'
                    let label = s === 'all' ? 'All' : s.replace('_', ' ');
                    if (activeTab === 'reports' && s === 'in_review') return null;
                    if (activeTab === 'reports' && s === 'open') { s = 'pending'; label = 'pending'; }
                    
                    return (
                        <button
                            key={s}
                            className={`btn ${filterStatus === s || (filterStatus === 'open' && s === 'pending') ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                            onClick={() => setFilterStatus(s)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Content List */}
            {loading ? (
                <div className="text-center p-12 text-secondary">Loading...</div>
            ) : activeTab === 'reports' ? (
                // Chat Reports View
                filteredReports.length === 0 ? (
                    <div className="card text-center p-12">
                        <MessageSquare size={64} className="text-secondary mb-4" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <h3 className="text-lg font-bold mb-2">No Chat Reports Found</h3>
                        <p className="text-secondary">No inappropriate messages have been reported matching the filter.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredReports.map(r => (
                            <div key={r.id} className="card hover-shadow animate-fade-in" style={{ borderLeft: r.status === 'pending' ? '4px solid #f59e0b' : '4px solid #10b981' }}>
                                <div className="flex-between mb-3">
                                    <div className="flex-center gap-3">
                                        <span className="font-bold text-lg">Reported: {r.reported_user}</span>
                                        <span style={{ background: r.status === 'pending' ? '#f59e0b20' : '#10b98120', color: r.status === 'pending' ? '#f59e0b' : '#10b981', padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                                            {r.status}
                                        </span>
                                    </div>
                                    <span className="text-xs text-secondary">{new Date(r.created_at).toLocaleString()}</span>
                                </div>
                                <div className="text-sm text-secondary mb-2 border p-3 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                                    <strong>Report Reason:</strong> {r.reason}
                                </div>
                                <div className="p-3 rounded mb-3" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <strong className="text-xs" style={{ color: '#ef4444' }}>Reported Message:</strong>
                                    <p className="mt-1">"{r.message_text}"</p>
                                </div>
                                {r.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button className="btn btn-primary btn-sm" onClick={() => handleWarnUser(r.id)}>
                                            ⚠️ Issue Warning / Strike
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            ) : filtered.length === 0 ? (
                <div className="card text-center p-12">
                    <MessageSquare size={64} className="text-secondary mb-4" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <h3 className="text-lg font-bold mb-2">No Complaints Found</h3>
                    <p className="text-secondary">
                        {filterStatus === 'all'
                            ? 'No complaints have been submitted yet.'
                            : `No complaints with status "${filterStatus.replace('_', ' ')}".`}
                    </p>
                    <button className="btn btn-primary mt-4" onClick={() => setShowForm(true)}>
                        Submit a Complaint
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filtered.map(c => (
                        <div key={c.id} className="card hover-shadow animate-fade-in">
                            <div className="flex-between mb-3">
                                <div className="flex-center gap-3">
                                    <span style={{
                                        background: `${PRIORITY_COLORS[c.priority]}20`,
                                        color: PRIORITY_COLORS[c.priority],
                                        padding: '3px 10px',
                                        borderRadius: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                    }}>
                                        {c.priority} priority
                                    </span>
                                    <span style={{
                                        background: `${STATUS_COLORS[c.status]}20`,
                                        color: STATUS_COLORS[c.status],
                                        padding: '3px 10px',
                                        borderRadius: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        textTransform: 'capitalize',
                                    }}>
                                        {c.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <span className="text-xs text-secondary">
                                    {new Date(c.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg mb-1">{c.title}</h3>
                            <span className="text-xs text-secondary mb-3" style={{ display: 'block' }}>
                                Category: {c.category}
                            </span>
                            <p className="text-secondary text-sm leading-relaxed mb-4">{c.description}</p>

                            {c.admin_response && (
                                <div className="card-minimal p-3 mb-3" style={{ background: 'rgba(99,102,241,0.08)', borderLeft: '3px solid #6366f1' }}>
                                    <div className="text-xs font-bold text-primary mb-1">Admin Response:</div>
                                    <p className="text-sm text-secondary">{c.admin_response}</p>
                                </div>
                            )}

                            {isAdmin && c.status !== 'resolved' && (
                                <div className="flex gap-2">
                                    {c.status === 'open' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStatus(c.id, 'in_review')}>
                                            Mark In Review
                                        </button>
                                    )}
                                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(c.id, 'resolved')}>
                                        Mark Resolved
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Submit Complaint Modal */}
            {showForm && (
                <div className="modal-overlay">
                    <div className="modal-content card max-w-lg w-full">
                        <div className="flex-between mb-6">
                            <h2 className="text-xl font-bold flex-center gap-2">
                                <MessageSquare size={24} color="var(--primary-color)" />
                                Submit Complaint
                            </h2>
                            <button className="btn-close" onClick={() => setShowForm(false)}>&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="grid gap-4">
                            <div className="grid gap-1">
                                <label className="text-sm font-semibold">Title *</label>
                                <input
                                    className="input"
                                    required
                                    placeholder="Brief description of the issue"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div className="grid-2 gap-4">
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold">Category</label>
                                    <select
                                        className="input"
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="grid gap-1">
                                    <label className="text-sm font-semibold">Priority</label>
                                    <select
                                        className="input"
                                        value={form.priority}
                                        onChange={e => setForm({ ...form, priority: e.target.value as any })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-1">
                                <label className="text-sm font-semibold">Description *</label>
                                <textarea
                                    className="input"
                                    rows={5}
                                    required
                                    placeholder="Please describe the issue in detail. Include any relevant information that could help us resolve it faster."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="card-minimal p-3" style={{ background: 'rgba(99,102,241,0.08)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                ℹ️ Your complaint will be reviewed by administrators. You'll receive a notification when there's an update.
                            </div>

                            <div className="flex gap-4">
                                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary flex-1 flex-center gap-2" disabled={submitting}>
                                    {submitting ? 'Submitting...' : <><Send size={16} /> Submit Complaint</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
