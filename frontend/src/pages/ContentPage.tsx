import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { contentAPI, recommendAPI, collectionsAPI, notesAPI } from '../services/api';
import {
    Eye, ThumbsUp, Download, ArrowLeft, Calendar, User, Tag,
    FileText, Video, BookMarked, BookOpen, Presentation, Clock,
    Bookmark, ExternalLink, FolderPlus, StickyNote, X, Save
} from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
    document: FileText, video: Video, article: BookMarked, course: BookOpen, presentation: Presentation,
};

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

export default function ContentPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [content, setContent] = useState<any>(null);
    const [related, setRelated] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Modal states
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteForm, setNoteForm] = useState({ title: '', text: '', color: '#6366f1' });
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [collections, setCollections] = useState<any[]>([]);

    useEffect(() => {
        if (id) loadContent(id);
    }, [id]);

    const loadContent = async (contentId: string) => {
        setLoading(true);
        try {
            const [contentRes, relatedRes, bookmarkRes] = await Promise.all([
                contentAPI.get(contentId),
                recommendAPI.getTrending(4),
                contentAPI.bookmarkStatus(contentId),
            ]);
            setContent(contentRes.data);
            setRelated(relatedRes.data.recommendations.filter((r: any) => r.id !== contentId).slice(0, 3));
            setIsBookmarked(bookmarkRes.data.bookmarked);
            // Record view
            contentAPI.recordView(contentId);
        } catch (err) {
            console.error('Content load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpvote = async () => {
        if (!id) return;
        try {
            const res = await contentAPI.upvote(id);
            setContent({ ...content, upvotes: res.data.upvotes });
        } catch (err) { }
    };

    const handleDownload = async () => {
        if (!id) return;
        setDownloading(true);
        try {
            const res = await contentAPI.download(id);
            setContent({ ...content, downloads: res.data.downloads });
            if (res.data.file_url) {
                window.open(res.data.file_url, '_blank');
            }
        } catch (err) { }
        finally { setDownloading(false); }
    };

    const handleBookmark = async () => {
        if (!id) return;
        try {
            if (isBookmarked) {
                await contentAPI.unbookmark(id);
                setIsBookmarked(false);
            } else {
                await contentAPI.bookmark(id);
                setIsBookmarked(true);
            }
        } catch (err) { }
    };

    // Note actions
    const handleSaveNote = async () => {
        if (!id || !noteForm.text.trim()) return;
        try {
            await notesAPI.create({ ...noteForm, content_id: id });
            setShowNoteModal(false);
            setNoteForm({ title: '', text: '', color: '#6366f1' });
        } catch (err) {
            console.error('Note save error:', err);
        }
    };

    // Collection actions
    const openCollectionModal = async () => {
        try {
            const res = await collectionsAPI.list();
            setCollections(res.data);
            setShowCollectionModal(true);
        } catch (err) {
            console.error('Collection modal error:', err);
        }
    };

    const addToCollection = async (collectionId: string) => {
        if (!id) return;
        try {
            await collectionsAPI.addItem(collectionId, id);
            setShowCollectionModal(false);
            alert('Added to collection successfully!');
        } catch (err: any) {
            if (err.response?.status === 400) {
                alert('Item is already in this collection.');
            } else {
                console.error('Add to collection error:', err);
            }
        }
    };

    if (loading) {
        return (
            <div className="page-container animate-fade-in">
                <div className="skeleton" style={{ height: 32, width: 100, marginBottom: 24 }}></div>
                <div className="skeleton" style={{ height: 200, borderRadius: 12, marginBottom: 16 }}></div>
                <div className="skeleton" style={{ height: 400, borderRadius: 12 }}></div>
            </div>
        );
    }

    if (!content) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <h3>Content not found</h3>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>Go Back</button>
                </div>
            </div>
        );
    }

    const Icon = TYPE_ICONS[content.content_type] || FileText;

    return (
        <div className="page-container animate-fade-in">
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
                <ArrowLeft size={16} /> Back
            </button>

            <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
                {/* Main Content */}
                <div>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: 'rgba(99, 102, 241, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Icon size={24} color="#6366f1" />
                            </div>
                            <div>
                                <div className="badge badge-primary" style={{ marginBottom: 4 }}>{content.content_type}</div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{content.source_system}</span>
                            </div>
                        </div>

                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 12, lineHeight: 1.3 }}>
                            {content.title}
                        </h1>

                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
                            {content.description}
                        </p>

                        {content.tags?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                                {content.tags.map((tag: string) => (
                                    <span key={tag} className="tag">
                                        <Tag size={10} /> {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={handleUpvote}>
                                <ThumbsUp size={16} /> Upvote ({content.upvotes})
                            </button>
                            <button className="btn btn-secondary" onClick={handleDownload} disabled={downloading}>
                                {content.file_url ? (
                                    <><ExternalLink size={16} /> {downloading ? 'Opening...' : 'Open Resource'}</>
                                ) : (
                                    <><Download size={16} /> Download ({content.downloads})</>
                                )}
                            </button>
                            <button
                                className={`btn ${isBookmarked ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={handleBookmark}
                                style={isBookmarked ? {} : { border: '1px solid var(--border-color)' }}
                            >
                                <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                            </button>

                            {/* New Actions */}
                            <button className="btn btn-ghost" style={{ border: '1px solid var(--border-color)' }} onClick={() => setShowNoteModal(true)}>
                                <StickyNote size={16} /> Add Note
                            </button>
                            <button className="btn btn-ghost" style={{ border: '1px solid var(--border-color)' }} onClick={openCollectionModal}>
                                <FolderPlus size={16} /> Add to Collection
                            </button>
                        </div>
                    </div>

                    {/* Related Content */}
                    {related.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Related Resources</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {related.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="content-card"
                                        onClick={() => navigate(`/content/${item.id}`)}
                                        style={{ padding: 'var(--space-4)' }}
                                    >
                                        <h4 className="card-title" style={{ fontSize: '0.875rem' }}>{item.title}</h4>
                                        <div className="card-meta">
                                            <span>{item.content_type}</span>
                                            <span><Eye size={12} /> {item.views}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Info */}
                <div>
                    <div className="card" style={{ marginBottom: 16 }}>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 16 }}>Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Eye size={14} /> Views
                                </span>
                                <strong>{content.views}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ThumbsUp size={14} /> Upvotes
                                </span>
                                <strong>{content.upvotes}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Download size={14} /> Downloads
                                </span>
                                <strong>{content.downloads}</strong>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <User size={14} /> Author
                                </span>
                                <strong>{content.author_name || 'Unknown'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Tag size={14} /> Category
                                </span>
                                <strong>{content.category}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={14} /> Version
                                </span>
                                <strong>v{content.version}</strong>
                            </div>
                            {content.created_at && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={14} /> Created
                                    </span>
                                    <strong>{new Date(content.created_at).toLocaleDateString()}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Note Modal */}
            {showNoteModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowNoteModal(false)}>
                    <div className="card" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add Note to Resource</h2>
                            <button className="btn btn-ghost" onClick={() => setShowNoteModal(false)}><X size={18} /></button>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                            Linked to: <strong>{content.title}</strong>
                        </p>
                        <input className="input" placeholder="Note title (optional)" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} style={{ marginBottom: 12 }} />
                        <textarea className="input" placeholder="Write your note..." value={noteForm.text} onChange={e => setNoteForm({ ...noteForm, text: e.target.value })} rows={5} style={{ marginBottom: 12, resize: 'vertical' }} />
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {COLORS.map(c => (
                                <button key={c} onClick={() => setNoteForm({ ...noteForm, color: c })} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: noteForm.color === c ? '2px solid white' : 'none', outlineOffset: 2 }} />
                            ))}
                        </div>
                        <button className="btn btn-primary" onClick={handleSaveNote} style={{ width: '100%' }}>
                            <Save size={16} /> Save Note
                        </button>
                    </div>
                </div>
            )}

            {/* Collection Modal */}
            {showCollectionModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCollectionModal(false)}>
                    <div className="card" style={{ width: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Add to Collection</h2>
                            <button className="btn btn-ghost" onClick={() => setShowCollectionModal(false)}><X size={18} /></button>
                        </div>
                        {collections.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>You don't have any collections yet. Go to your Collections page to create one!</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
                                {collections.map(c => (
                                    <button key={c.id} className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: 12, border: '1px solid var(--border-color)', borderLeft: `4px solid ${c.color || '#6366f1'}` }} onClick={() => addToCollection(c.id)}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{c.item_count} items</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
