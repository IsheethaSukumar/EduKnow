import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentAPI } from '../services/api';
import { Bookmark, Eye, ThumbsUp, FileText, Video, BookMarked, BookOpen, Presentation, ExternalLink } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
    document: FileText, video: Video, article: BookMarked, course: BookOpen, presentation: Presentation,
};

export default function BookmarksPage() {
    const navigate = useNavigate();
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadBookmarks(); }, []);

    const loadBookmarks = async () => {
        try {
            const res = await contentAPI.getBookmarks();
            setBookmarks(res.data);
        } catch (err) { }
        finally { setLoading(false); }
    };

    const handleUnbookmark = async (contentId: string) => {
        try {
            await contentAPI.unbookmark(contentId);
            setBookmarks(bookmarks.filter(b => b.content_id !== contentId));
        } catch (err) { }
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <h1>🔖 My Bookmarks</h1>
                <p>Your saved resources for quick access</p>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
                </div>
            ) : bookmarks.length === 0 ? (
                <div className="empty-state card">
                    <Bookmark size={48} style={{ color: '#6366f1', marginBottom: 12 }} />
                    <h3>No bookmarks yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Bookmark content from the search or content pages!</p>
                    <button className="btn btn-primary" onClick={() => navigate('/search')} style={{ marginTop: 12 }}>
                        Browse Content
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {bookmarks.map(bm => {
                        const c = bm.content;
                        const Icon = TYPE_ICONS[c.content_type] || FileText;
                        return (
                            <div key={bm.id} className="card content-card"
                                style={{ padding: 'var(--space-4)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                onClick={() => navigate(`/content/${c.id}`)}>
                                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 10,
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        <Icon size={20} color="#6366f1" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>{c.title}</h3>
                                        <div className="card-meta" style={{ display: 'flex', gap: 12, fontSize: '0.8rem' }}>
                                            <span className="badge badge-secondary">{c.content_type}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> {c.views}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ThumbsUp size={12} /> {c.upvotes}</span>
                                            <span>{c.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-ghost"
                                    style={{ padding: 8, color: '#f43f5e' }}
                                    onClick={(e) => { e.stopPropagation(); handleUnbookmark(c.id); }}
                                    title="Remove bookmark"
                                >
                                    <Bookmark size={18} fill="currentColor" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
