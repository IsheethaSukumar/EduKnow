import { useState, useEffect } from 'react';
import { analyticsAPI } from '../services/api';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Users, BookOpen, Search, Activity, TrendingUp } from 'lucide-react';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, ArcElement, Title, Tooltip, Legend, Filler
);

export default function AnalyticsPage() {
    const [overview, setOverview] = useState<any>(null);
    const [contentData, setContentData] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [searchData, setSearchData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [o, c, u, s] = await Promise.all([
                analyticsAPI.overview(),
                analyticsAPI.content(),
                analyticsAPI.users(),
                analyticsAPI.search(),
            ]);
            setOverview(o.data);
            setContentData(c.data);
            setUserData(u.data);
            setSearchData(s.data);
        } catch (err) {
            console.error('Analytics load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const chartColors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#14b8a6'];

    if (loading) {
        return (
            <div className="page-container animate-fade-in">
                <div className="page-header">
                    <div className="skeleton" style={{ height: 36, width: 250, marginBottom: 8 }}></div>
                    <div className="skeleton" style={{ height: 20, width: 300 }}></div>
                </div>
                <div className="grid-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }}></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <h1>📊 Analytics Dashboard</h1>
                <p>Real-time insights into platform usage, content engagement, and community health</p>
            </div>

            {/* Overview Stats */}
            {overview && (
                <div className="grid-4" style={{ marginBottom: 32 }}>
                    {[
                        { label: 'Total Users', value: overview.total_users, icon: Users, color: '#6366f1' },
                        { label: 'Total Content', value: overview.total_content, icon: BookOpen, color: '#0ea5e9' },
                        { label: 'Total Searches', value: overview.total_searches, icon: Search, color: '#10b981' },
                        { label: 'Interactions', value: overview.total_interactions, icon: Activity, color: '#f59e0b' },
                    ].map((stat) => (
                        <div className="stats-card" key={stat.label}>
                            <div className="icon-wrapper" style={{ background: `${stat.color}15` }}>
                                <stat.icon size={24} color={stat.color} />
                            </div>
                            <div className="stats-info">
                                <h3>{stat.value.toLocaleString()}</h3>
                                <p>{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Content by Type */}
                {contentData && (
                    <div className="chart-card">
                        <h3>📁 Content by Type</h3>
                        <div style={{ maxHeight: 300 }}>
                            <Doughnut
                                data={{
                                    labels: Object.keys(contentData.by_type),
                                    datasets: [{
                                        data: Object.values(contentData.by_type),
                                        backgroundColor: chartColors,
                                        borderWidth: 0,
                                    }],
                                }}
                                options={{
                                    responsive: true,
                                    plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-secondary)', padding: 16 } } },
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Users by Role */}
                {userData && (
                    <div className="chart-card">
                        <h3>👥 Users by Role</h3>
                        <div style={{ maxHeight: 300 }}>
                            <Doughnut
                                data={{
                                    labels: Object.keys(userData.by_role),
                                    datasets: [{
                                        data: Object.values(userData.by_role),
                                        backgroundColor: chartColors.slice(0).reverse(),
                                        borderWidth: 0,
                                    }],
                                }}
                                options={{
                                    responsive: true,
                                    plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-secondary)', padding: 16 } } },
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid-2" style={{ marginBottom: 24 }}>
                {/* Activity Timeline */}
                {userData && userData.activity_timeline && (
                    <div className="chart-card">
                        <h3>📈 Activity (Last 7 Days)</h3>
                        <Line
                            data={{
                                labels: userData.activity_timeline.map((d: any) => {
                                    const date = new Date(d.date);
                                    return date.toLocaleDateString('en', { weekday: 'short' });
                                }),
                                datasets: [{
                                    label: 'Interactions',
                                    data: userData.activity_timeline.map((d: any) => d.count),
                                    borderColor: '#6366f1',
                                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                    fill: true,
                                    tension: 0.4,
                                    pointRadius: 4,
                                    pointBackgroundColor: '#6366f1',
                                }],
                            }}
                            options={{
                                responsive: true,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: 'var(--text-tertiary)' } },
                                    x: { grid: { display: false }, ticks: { color: 'var(--text-tertiary)' } },
                                },
                            }}
                        />
                    </div>
                )}

                {/* Content by Category */}
                {contentData && (
                    <div className="chart-card">
                        <h3>📂 Content by Category</h3>
                        <Bar
                            data={{
                                labels: Object.keys(contentData.by_category).slice(0, 8),
                                datasets: [{
                                    label: 'Resources',
                                    data: Object.values(contentData.by_category).slice(0, 8) as number[],
                                    backgroundColor: chartColors,
                                    borderRadius: 6,
                                }],
                            }}
                            options={{
                                responsive: true,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.1)' }, ticks: { color: 'var(--text-tertiary)' } },
                                    x: { grid: { display: false }, ticks: { color: 'var(--text-tertiary)', maxRotation: 45 } },
                                },
                            }}
                        />
                    </div>
                )}
            </div>

            <div className="grid-2">
                {/* Popular Searches */}
                {searchData && (
                    <div className="chart-card">
                        <h3>🔍 Popular Searches</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {searchData.popular_queries.map((q: any, i: number) => (
                                <span
                                    key={i}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 20,
                                        background: `rgba(99, 102, 241, ${0.1 + (q.count / 50) * 0.3})`,
                                        color: 'var(--primary-400)',
                                        fontSize: `${Math.min(0.7 + q.count * 0.03, 1.1)}rem`,
                                        fontWeight: 600,
                                    }}
                                >
                                    {q.query} ({q.count})
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trending Tags */}
                {contentData && (
                    <div className="chart-card">
                        <h3>🏷️ Trending Tags</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {contentData.trending_tags.slice(0, 15).map((t: any, i: number) => (
                                <span key={i} className="tag" style={{ fontSize: `${Math.min(0.65 + t.count * 0.02, 0.9)}rem` }}>
                                    #{t.tag} <span style={{ color: 'var(--primary-400)', marginLeft: 4 }}>{t.count}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Top Contributors */}
            {userData && userData.top_contributors && (
                <div className="chart-card" style={{ marginTop: 24 }}>
                    <h3>⭐ Top Contributors</h3>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                        {userData.top_contributors.slice(0, 8).map((u: any, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--bg-tertiary)', borderRadius: 12 }}>
                                <div className="avatar avatar-sm" style={{ background: chartColors[i % chartColors.length] }}>
                                    {u.full_name.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{u.full_name}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{u.reputation} pts · {u.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
