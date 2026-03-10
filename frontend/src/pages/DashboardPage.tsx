import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recommendAPI, analyticsAPI, gamificationAPI } from '../services/api';
import {
    BookOpen, Users, Search, TrendingUp, Upload, Eye, ThumbsUp,
    Zap, Award, ArrowUpRight, FileText, Video, Presentation, BookMarked
} from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
    document: FileText,
    video: Video,
    article: BookMarked,
    course: BookOpen,
    presentation: Presentation,
};

const TYPE_COLORS: Record<string, string> = {
    document: '#6366f1',
    video: '#f43f5e',
    article: '#0ea5e9',
    course: '#10b981',
    presentation: '#f59e0b',
};

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [trending, setTrending] = useState<any[]>([]);
    const [overview, setOverview] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [recRes, trendRes, overviewRes, statsRes] = await Promise.all([
                recommendAPI.getPersonalized(6),
                recommendAPI.getTrending(6),
                analyticsAPI.overview(),
                gamificationAPI.stats(),
            ]);
            setRecommendations(recRes.data.recommendations);
            setTrending(trendRes.data.recommendations);
            setOverview(overviewRes.data);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const roleMessages: Record<string, string> = {
        student: "Here's your personalized learning feed",
        faculty: "Your teaching tools and content insights",
        staff: "System overview and management tools",
        admin: "Full system metrics and controls",
        alumni: "Stay connected with your institution",
        parent: "Track academic progress and updates",
    };

    if (loading) {
        return (
            <div className="page-container animate-fade-in">
                <div className="page-header">
                    <div className="skeleton" style={{ height: 36, width: 300, marginBottom: 8 }}></div>
                    <div className="skeleton" style={{ height: 20, width: 250 }}></div>
                </div>
                <div className="grid-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }}></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <h1>{greeting()}, {user?.full_name?.split(' ')[0]}! 👋</h1>
                <p>{roleMessages[user?.role || 'student']}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid-4" style={{ marginBottom: 32 }}>
                <div className="stats-card">
                    <div className="icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                        <BookOpen size={24} color="#6366f1" />
                    </div>
                    <div className="stats-info">
                        <h3>{overview?.total_content || 0}</h3>
                        <p>Total Resources</p>
                        <div className="stats-trend up">
                            <ArrowUpRight size={12} /> +{overview?.content_uploaded_today || 0} today
                        </div>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="icon-wrapper" style={{ background: 'rgba(14, 165, 233, 0.1)' }}>
                        <Users size={24} color="#0ea5e9" />
                    </div>
                    <div className="stats-info">
                        <h3>{overview?.total_users || 0}</h3>
                        <p>Community Members</p>
                        <div className="stats-trend up">
                            <ArrowUpRight size={12} /> {overview?.active_users_today || 0} active today
                        </div>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                        <Award size={24} color="#10b981" />
                    </div>
                    <div className="stats-info">
                        <h3>{stats?.reputation_score || 0}</h3>
                        <p>Your Reputation</p>
                        <div className="stats-trend up">
                            <Zap size={12} /> Rank #{stats?.rank || '-'}
                        </div>
                    </div>
                </div>

                <div className="stats-card">
                    <div className="icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                        <TrendingUp size={24} color="#f59e0b" />
                    </div>
                    <div className="stats-info">
                        <h3>{stats?.streak_days || 0}</h3>
                        <p>Day Streak 🔥</p>
                        <div className="stats-trend up">
                            {stats?.badges_earned || 0}/{stats?.total_badges || 0} badges
                        </div>
                    </div>
                </div>
            </div>

            {/* Personalized Recommendations */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>📚 Recommended For You</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/search')}>
                        View All →
                    </button>
                </div>
                <div className="grid-3">
                    {recommendations.slice(0, 6).map((item: any) => {
                        const Icon = TYPE_ICONS[item.content_type] || FileText;
                        return (
                            <div
                                key={item.id}
                                className="content-card"
                                onClick={() => navigate(`/content/${item.id}`)}
                            >
                                <div className="card-header">
                                    <div className="badge badge-primary" style={{ background: `${TYPE_COLORS[item.content_type]}20`, color: TYPE_COLORS[item.content_type] }}>
                                        <Icon size={12} /> {item.content_type}
                                    </div>
                                </div>
                                <h3 className="card-title">{item.title}</h3>
                                <p className="card-desc">{item.description}</p>
                                <div className="card-meta">
                                    <span><Eye size={12} /> {item.views}</span>
                                    <span><ThumbsUp size={12} /> {item.upvotes}</span>
                                    <span>{item.category}</span>
                                </div>
                                {item.tags?.length > 0 && (
                                    <div className="card-tags">
                                        {item.tags.slice(0, 3).map((tag: string) => (
                                            <span key={tag} className="tag">{tag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Trending */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>🔥 Trending Now</h2>
                </div>
                <div className="grid-3">
                    {trending.slice(0, 6).map((item: any) => {
                        const Icon = TYPE_ICONS[item.content_type] || FileText;
                        return (
                            <div
                                key={item.id}
                                className="content-card"
                                onClick={() => navigate(`/content/${item.id}`)}
                            >
                                <div className="card-header">
                                    <div className="badge badge-primary" style={{ background: `${TYPE_COLORS[item.content_type]}20`, color: TYPE_COLORS[item.content_type] }}>
                                        <Icon size={12} /> {item.content_type}
                                    </div>
                                </div>
                                <h3 className="card-title">{item.title}</h3>
                                <p className="card-desc">{item.description}</p>
                                <div className="card-meta">
                                    <span><Eye size={12} /> {item.views}</span>
                                    <span><ThumbsUp size={12} /> {item.upvotes}</span>
                                    <span>{item.category}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
