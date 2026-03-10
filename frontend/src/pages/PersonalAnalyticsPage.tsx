import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import { PieChart, Clock, BookOpen, FolderOpen, Bookmark, Flame, Trophy } from 'lucide-react';

export default function PersonalAnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const res = await analyticsAPI.personal();
            setData(res.data);
        } catch (err) { }
        finally { setLoading(false); }
    };

    const formatDuration = (s: number) => {
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    };

    const actionEmoji: Record<string, string> = {
        view: '👁️', search: '🔍', download: '⬇️', upvote: '👍',
        upload: '📤', chat: '💬', login: '🔑',
    };

    if (loading) {
        return (
            <div className="page-container animate-fade-in">
                <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 24 }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
                </div>
            </div>
        );
    }

    if (!data) return <div className="page-container"><p>Failed to load analytics.</p></div>;

    const maxDaily = Math.max(...(data.daily_study || []).map((d: any) => d.seconds), 1);
    const maxCat = Math.max(...(data.category_breakdown || []).map((c: any) => c.count), 1);

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <h1>📊 My Learning Analytics</h1>
                <p>Track your learning progress and study patterns</p>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div className="stat-card">
                    <Clock size={20} style={{ color: '#6366f1', marginBottom: 8 }} />
                    <div className="stat-value">{formatDuration(data.total_study_seconds)}</div>
                    <div className="stat-label">Total Study Time</div>
                </div>
                <div className="stat-card">
                    <BookOpen size={20} style={{ color: '#0ea5e9', marginBottom: 8 }} />
                    <div className="stat-value">{data.total_sessions}</div>
                    <div className="stat-label">Study Sessions</div>
                </div>
                <div className="stat-card">
                    <Bookmark size={20} style={{ color: '#10b981', marginBottom: 8 }} />
                    <div className="stat-value">{data.total_bookmarks}</div>
                    <div className="stat-label">Bookmarks</div>
                </div>
                <div className="stat-card">
                    <FolderOpen size={20} style={{ color: '#f59e0b', marginBottom: 8 }} />
                    <div className="stat-value">{data.total_collections}</div>
                    <div className="stat-label">Collections</div>
                </div>
                <div className="stat-card">
                    <PieChart size={20} style={{ color: '#8b5cf6', marginBottom: 8 }} />
                    <div className="stat-value">{data.total_notes}</div>
                    <div className="stat-label">Notes</div>
                </div>
                <div className="stat-card">
                    <Flame size={20} style={{ color: '#f43f5e', marginBottom: 8 }} />
                    <div className="stat-value">{data.streak_days} days</div>
                    <div className="stat-label">Streak 🔥</div>
                </div>
                <div className="stat-card">
                    <Trophy size={20} style={{ color: '#eab308', marginBottom: 8 }} />
                    <div className="stat-value">{data.reputation}</div>
                    <div className="stat-label">Reputation</div>
                </div>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
                {/* Study Time Chart */}
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📈 Study Time (Last 14 Days)</h3>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 120 }}>
                        {(data.daily_study || []).map((d: any, i: number) => {
                            const h = Math.max((d.seconds / maxDaily) * 100, 3);
                            const dayLabel = new Date(d.date).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2);
                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <div style={{
                                        width: '100%', height: h, borderRadius: 4, minHeight: 3,
                                        background: d.seconds > 0
                                            ? `linear-gradient(to top, #6366f1, #818cf8)`
                                            : 'var(--bg-tertiary)',
                                    }} title={`${d.date}: ${formatDuration(d.seconds)}`} />
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{dayLabel}</span>
                                    {d.seconds > 0 && (
                                        <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)' }}>{formatDuration(d.seconds)}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📚 Categories Studied</h3>
                    {(data.category_breakdown || []).length === 0 ? (
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No activity yet</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(data.category_breakdown || []).slice(0, 6).map((c: any, i: number) => {
                                const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
                                const width = (c.count / maxCat) * 100;
                                return (
                                    <div key={c.category}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 2 }}>
                                            <span>{c.category}</span>
                                            <span style={{ color: 'var(--text-tertiary)' }}>{c.count}</span>
                                        </div>
                                        <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${width}%`, borderRadius: 4,
                                                background: colors[i % colors.length], transition: 'width 0.5s ease',
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card" style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>🕒 Recent Activity</h3>
                {(data.recent_activity || []).length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No recent activity</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(data.recent_activity || []).slice(0, 10).map((a: any, i: number) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem',
                            }}>
                                <div>
                                    <span style={{ marginRight: 8 }}>{actionEmoji[a.action] || '📌'}</span>
                                    <strong style={{ textTransform: 'capitalize' }}>{a.action}</strong>
                                    {a.content_title && <span style={{ color: 'var(--text-secondary)' }}> — {a.content_title}</span>}
                                    {a.query && <span style={{ color: 'var(--text-secondary)' }}> — "{a.query}"</span>}
                                </div>
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                                    {a.timestamp && new Date(a.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
