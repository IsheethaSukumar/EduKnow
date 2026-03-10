import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { gamificationAPI } from '../services/api';
import {
    Award, Flame, Star, Trophy, Target, Upload, Eye, Search,
    ThumbsUp, Zap, MessageCircle, BookOpen, Crown, Footprints, Microscope
} from 'lucide-react';

const BADGE_ICONS: Record<string, any> = {
    'upload': Upload, 'eye': Eye, 'search': Search, 'thumbs-up': ThumbsUp,
    'zap': Zap, 'bot': MessageCircle, 'crown': Crown, 'book-open': BookOpen,
    'star': Star, 'footprints': Footprints, 'message-circle': MessageCircle,
    'microscope': Microscope, 'award': Award,
};

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
    common: { label: 'Common', color: '#94a3b8' },
    uncommon: { label: 'Uncommon', color: '#10b981' },
    rare: { label: 'Rare', color: '#0ea5e9' },
    epic: { label: 'Epic', color: '#a855f7' },
    legendary: { label: 'Legendary', color: '#f59e0b' },
};

export default function ProfilePage() {
    const { user } = useAuth();
    const [badges, setBadges] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [badgesRes, statsRes] = await Promise.all([
                gamificationAPI.badges(),
                gamificationAPI.stats(),
            ]);
            setBadges(badgesRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Profile load error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container animate-fade-in">
                <div className="skeleton" style={{ height: 180, borderRadius: 16, marginBottom: 24 }}></div>
                <div className="skeleton" style={{ height: 300, borderRadius: 12 }}></div>
            </div>
        );
    }

    const earnedBadges = badges.filter(b => b.earned);
    const inProgressBadges = badges.filter(b => !b.earned);

    return (
        <div className="page-container animate-fade-in">
            {/* Profile Header */}
            <div className="profile-header">
                <div className="avatar avatar-xl" style={{ background: 'rgba(255,255,255,0.15)', fontSize: '2rem' }}>
                    {user?.full_name?.charAt(0)}
                </div>
                <div className="profile-info">
                    <h2>{user?.full_name}</h2>
                    <p>@{user?.username} · {user?.department}</p>
                    <p style={{ textTransform: 'capitalize', opacity: 0.7, fontSize: '0.8rem' }}>{user?.role}</p>
                    <div className="profile-stats">
                        <div className="stat">
                            <div className="stat-value">{stats?.reputation_score || 0}</div>
                            <div className="stat-label">Points</div>
                        </div>
                        <div className="stat">
                            <div className="stat-value">#{stats?.rank || '-'}</div>
                            <div className="stat-label">Rank</div>
                        </div>
                        <div className="stat">
                            <div className="stat-value">{stats?.streak_days || 0} 🔥</div>
                            <div className="stat-label">Streak</div>
                        </div>
                        <div className="stat">
                            <div className="stat-value">{stats?.badges_earned || 0}/{stats?.total_badges || 0}</div>
                            <div className="stat-label">Badges</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interests */}
            {user?.interests && user.interests.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8 }}>🎯 Interests</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {user.interests.map((interest: string) => (
                            <span key={interest} className="badge badge-primary">{interest}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Earned Badges */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>
                    🏅 Earned Badges ({earnedBadges.length})
                </h2>
                {earnedBadges.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 32 }}>
                        <Trophy size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <p style={{ color: 'var(--text-tertiary)' }}>No badges earned yet. Keep contributing!</p>
                    </div>
                ) : (
                    <div className="badge-grid">
                        {earnedBadges.map((badge) => {
                            const Icon = BADGE_ICONS[badge.icon] || Award;
                            const rarity = RARITY_LABELS[badge.rarity] || RARITY_LABELS.common;
                            return (
                                <div key={badge.id} className="badge-card earned animate-scale-in">
                                    <div className="badge-icon" style={{ background: `${badge.color}20` }}>
                                        <Icon size={28} color={badge.color} />
                                    </div>
                                    <div className="badge-name">{badge.name}</div>
                                    <div className="badge-desc">{badge.description}</div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: rarity.color }}>
                                        {rarity.label} · +{badge.points_value} pts
                                    </span>
                                    <div className="progress-ring" style={{ marginTop: 8 }}>
                                        <div className="fill" style={{ width: '100%', background: badge.color }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* In Progress Badges */}
            <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>
                    🎯 In Progress ({inProgressBadges.length})
                </h2>
                <div className="badge-grid">
                    {inProgressBadges.map((badge) => {
                        const Icon = BADGE_ICONS[badge.icon] || Award;
                        const rarity = RARITY_LABELS[badge.rarity] || RARITY_LABELS.common;
                        return (
                            <div key={badge.id} className="badge-card locked">
                                <div className="badge-icon" style={{ background: `${badge.color}10` }}>
                                    <Icon size={28} color={badge.color} style={{ opacity: 0.5 }} />
                                </div>
                                <div className="badge-name">{badge.name}</div>
                                <div className="badge-desc">{badge.description}</div>
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: rarity.color }}>
                                    {rarity.label} · +{badge.points_value} pts
                                </span>
                                <div className="progress-ring" style={{ marginTop: 8 }}>
                                    <div className="fill" style={{ width: `${badge.progress * 100}%`, background: badge.color }}></div>
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                                    {Math.round(badge.progress * 100)}% complete
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
