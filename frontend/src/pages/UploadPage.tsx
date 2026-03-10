import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentAPI } from '../services/api';
import { Upload, FileText, Video, BookMarked, BookOpen, Presentation, Check, Plus, X } from 'lucide-react';

const TYPES = [
    { value: 'document', label: 'Document', icon: FileText, color: '#6366f1' },
    { value: 'video', label: 'Video', icon: Video, color: '#f43f5e' },
    { value: 'article', label: 'Article', icon: BookMarked, color: '#0ea5e9' },
    { value: 'course', label: 'Course', icon: BookOpen, color: '#10b981' },
    { value: 'presentation', label: 'Presentation', icon: Presentation, color: '#f59e0b' },
];

const CATEGORIES = [
    'Computer Science', 'Mathematics', 'Physics', 'Biology', 'Chemistry',
    'Engineering', 'English', 'History', 'Business', 'Art', 'General',
    'Environmental Science', 'Philosophy', 'Economics', 'Administration'
];

export default function UploadPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const [form, setForm] = useState({
        title: '',
        description: '',
        content_type: 'document',
        category: 'General',
        tags: [] as string[],
        source_system: 'internal',
        file_url: '',
    });

    const addTag = () => {
        if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
            setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setForm({ ...form, tags: form.tags.filter(t => t !== tag) });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setLoading(true);
        try {
            await contentAPI.create(form);
            setSuccess(true);
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            console.error('Upload error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="page-container animate-scale-in" style={{ textAlign: 'center', paddingTop: 100 }}>
                <div style={{
                    width: 80, height: 80, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                }}>
                    <Check size={40} color="#10b981" />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8 }}>Content Uploaded! 🎉</h2>
                <p style={{ color: 'var(--text-secondary)' }}>You earned +5 reputation points. Redirecting to dashboard...</p>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <h1>📤 Upload Content</h1>
                <p>Share knowledge with the community and earn reputation points</p>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
                <form onSubmit={handleSubmit}>
                    <div className="card">
                        {/* Content Type Selection */}
                        <div className="input-group">
                            <label>Content Type</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        className={`filter-chip ${form.content_type === t.value ? 'active' : ''}`}
                                        onClick={() => setForm({ ...form, content_type: t.value })}
                                        style={form.content_type === t.value ? { background: t.color, borderColor: t.color } : {}}
                                    >
                                        <t.icon size={14} style={{ marginRight: 4 }} /> {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Title *</label>
                            <input
                                className="input"
                                type="text"
                                placeholder="Give your content a descriptive title"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label>Description</label>
                            <textarea
                                className="input"
                                placeholder="Describe what this resource covers..."
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={4}
                            />
                        </div>

                        <div className="grid-2">
                            <div className="input-group">
                                <label>Category</label>
                                <select
                                    className="input"
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Source</label>
                                <select
                                    className="input"
                                    value={form.source_system}
                                    onChange={(e) => setForm({ ...form, source_system: e.target.value })}
                                >
                                    <option value="internal">Internal Upload</option>
                                    <option value="lms">LMS (Moodle)</option>
                                    <option value="library">Library Catalog</option>
                                    <option value="google_drive">Google Drive</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Tags</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Add a tag..."
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                />
                                <button type="button" className="btn btn-secondary" onClick={addTag}>
                                    <Plus size={16} />
                                </button>
                            </div>
                            {form.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                    {form.tags.map(tag => (
                                        <span key={tag} className="tag" style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)}>
                                            {tag} <X size={10} />
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="input-group">
                            <label>File URL (optional)</label>
                            <input
                                className="input"
                                type="url"
                                placeholder="https://drive.google.com/..."
                                value={form.file_url}
                                onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                            />
                        </div>

                        <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
                            <Upload size={18} /> {loading ? 'Uploading...' : 'Upload Content'}
                        </button>
                    </div>
                </form>

                {/* Tips Sidebar */}
                <div className="card" style={{ height: 'fit-content' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 12 }}>💡 Upload Tips</h3>
                    <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 16 }}>
                        <li>Use descriptive titles for better searchability</li>
                        <li>Add relevant tags (e.g., "exam prep", "python")</li>
                        <li>Choose the correct content type and category</li>
                        <li>Write a detailed description for AI-powered search</li>
                        <li>You earn <strong>+5 reputation</strong> per upload! 🎯</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
