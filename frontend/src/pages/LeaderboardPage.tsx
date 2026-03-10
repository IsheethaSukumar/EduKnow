import { useState, useEffect } from 'react';
import { gamificationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Flame, Star, Crown } from 'lucide-react';

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await gamificationAPI.leaderboard('all_time', 20);
            setLeaderboard(res.data);
        } catch (err) {
            console.error('Leaderboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getAvatarColor = (name: string) => {
        const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];
        return colors[name.charCodeAt(0) % colors.length];
    };

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown size={16} color="#fbbf24" />;
        if (rank === 2) return <Medal size={16} color="#9ca3af" />;
        if (rank === 3) return <Medal size={16} color="#f97316" />;
        return null;
    };

    if (loading) {
        return (
            <div className="page-container animate-fade-in">
                <div className="page-header">
                    <div className="skeleton" style={{ height: 36, width: 250, marginBottom: 8 }}></div>
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 8 }}></div>
                ))}
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <h1>🏆 Leaderboard</h1>
                <p>Top contributors across the EduKno community</p>
            </div>

            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 32, alignItems: 'flex-end' }}>
                    {/* 2nd Place */}
                    <div className="card" style={{ textAlign: 'center', padding: '24px', width: 180 }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <div className="avatar avatar-lg" style={{ background: getAvatarColor(leaderboard[1].full_name), margin: '0 auto 8px' }}>
                                {leaderboard[1].full_name.charAt(0)}
                            </div>
                            <div className="rank-badge rank-2" style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, fontSize: '0.7rem' }}>2</div>
                        </div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>{leaderboard[1].full_name}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{leaderboard[1].role}</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-400)', marginTop: 4 }}>
                            {leaderboard[1].reputation_score} pts
                        </p>
                    </div>

                    {/* 1st Place */}
                    <div className="card" style={{ textAlign: 'center', padding: '32px 24px', width: 200, border: '2px solid var(--primary-400)', boxShadow: 'var(--shadow-glow)' }}>
                        <Crown size={24} color="#fbbf24" style={{ margin: '0 auto 8px' }} />
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <div className="avatar avatar-xl" style={{ background: getAvatarColor(leaderboard[0].full_name), margin: '0 auto 8px' }}>
                                {leaderboard[0].full_name.charAt(0)}
                            </div>
                            <div className="rank-badge rank-1" style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, fontSize: '0.8rem' }}>1</div>
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{leaderboard[0].full_name}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{leaderboard[0].role}</p>
                        <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fbbf24', marginTop: 4 }}>
                            {leaderboard[0].reputation_score} pts
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                            {Array(leaderboard[0].badge_count).fill(0).slice(0, 5).map((_, i) => (
                                <Star key={i} size={12} color="#fbbf24" fill="#fbbf24" />
                            ))}
                        </div>
                    </div>

                    {/* 3rd Place */}
                    <div className="card" style={{ textAlign: 'center', padding: '24px', width: 180 }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <div className="avatar avatar-lg" style={{ background: getAvatarColor(leaderboard[2].full_name), margin: '0 auto 8px' }}>
                                {leaderboard[2].full_name.charAt(0)}
                            </div>
                            <div className="rank-badge rank-3" style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, fontSize: '0.7rem' }}>3</div>
                        </div>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700 }}>{leaderboard[2].full_name}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{leaderboard[2].role}</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f97316', marginTop: 4 }}>
                            {leaderboard[2].reputation_score} pts
                        </p>
                    </div>
                </div>
            )}

            {/* Full Leaderboard */}
            <div className="card">
                <table className="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Badges</th>
                            <th>Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaderboard.map((entry) => (
                            <tr
                                key={entry.user_id}
                                style={entry.user_id === user?.id ? { outline: '2px solid var(--primary-400)', borderRadius: 8 } : {}}
                            >
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {entry.rank <= 3 ? (
                                            <div className={`rank-badge rank-${entry.rank}`}>{entry.rank}</div>
                                        ) : (
                                            <div className="rank-badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{entry.rank}</div>
                                        )}
                                        {getRankIcon(entry.rank)}
                                    </div>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="avatar avatar-sm" style={{ background: getAvatarColor(entry.full_name) }}>
                                            {entry.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                                {entry.full_name}
                                                {entry.user_id === user?.id && (
                                                    <span style={{ color: 'var(--primary-400)', fontSize: '0.7rem', marginLeft: 6 }}>(You)</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>@{entry.username}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{entry.role}</span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Trophy size={14} color="#f59e0b" />
                                        <span style={{ fontWeight: 600 }}>{entry.badge_count}</span>
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontWeight: 700, color: 'var(--primary-400)' }}>
                                        {entry.reputation_score.toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
