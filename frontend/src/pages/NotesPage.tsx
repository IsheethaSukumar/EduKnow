import { useState, useEffect } from 'react';
import { notesAPI } from '../services/api';
import { Plus, Trash2, Edit3, Search, StickyNote, X, Save } from 'lucide-react';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

export default function NotesPage() {
    const [notes, setNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingNote, setEditingNote] = useState<any>(null);
    const [form, setForm] = useState({ title: '', text: '', color: '#6366f1' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadNotes(); }, []);

    const loadNotes = async (searchTerm?: string) => {
        try {
            setLoading(true);
            const params: any = {};
            if (searchTerm) params.search = searchTerm;
            const res = await notesAPI.list(params);
            setNotes(res.data);
        } catch (err) { }
        finally { setLoading(false); }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        loadNotes(search);
    };

    const openCreate = () => {
        setEditingNote(null);
        setForm({ title: '', text: '', color: '#6366f1' });
        setShowModal(true);
    };

    const openEdit = (note: any) => {
        setEditingNote(note);
        setForm({ title: note.title, text: note.text, color: note.color });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!form.text.trim()) {
            alert('Please write some text for your note.');
            return;
        }
        setSaving(true);
        try {
            if (editingNote) {
                await notesAPI.update(editingNote.id, form);
            } else {
                await notesAPI.create(form);
            }
            setShowModal(false);
            setForm({ title: '', text: '', color: '#6366f1' });
            loadNotes();
        } catch (err: any) {
            console.error('Save Note error:', err);
            alert('Failed to save note: ' + (err.response?.data?.detail || err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await notesAPI.delete(id);
            loadNotes();
        } catch (err) { }
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>📝 My Notes</h1>
                        <p>Personal notes, study annotations, and key takeaways</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> New Note
                    </button>
                </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-tertiary)' }} />
                        <input
                            className="input"
                            placeholder="Search notes..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: 36 }}
                        />
                    </div>
                </div>
            </form>

            {/* Notes Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 12 }} />)}
                </div>
            ) : notes.length === 0 ? (
                <div className="empty-state card">
                    <StickyNote size={48} style={{ color: '#6366f1', marginBottom: 12 }} />
                    <h3>No notes yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Create your first note to get started!</p>
                    <button className="btn btn-primary" onClick={openCreate} style={{ marginTop: 12 }}>
                        <Plus size={16} /> Create Note
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {notes.map(note => (
                        <div key={note.id} className="card" style={{
                            borderTop: `3px solid ${note.color || '#6366f1'}`,
                            position: 'relative',
                        }}>
                            {note.title && (
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8 }}>{note.title}</h3>
                            )}
                            <p style={{
                                color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.6,
                                whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden',
                            }}>
                                {note.text}
                            </p>
                            {note.content_title && (
                                <div style={{ marginTop: 8 }}>
                                    <span className="tag">📎 {note.content_title}</span>
                                </div>
                            )}
                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border-color)',
                            }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                    {note.updated_at && new Date(note.updated_at).toLocaleDateString()}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost" style={{ padding: 4 }} onClick={() => openEdit(note)}>
                                        <Edit3 size={14} />
                                    </button>
                                    <button className="btn btn-ghost" style={{ padding: 4, color: '#f43f5e' }} onClick={() => handleDelete(note.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowModal(false)}>
                    <div className="card" style={{ width: 500, maxHeight: '80vh', overflow: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{editingNote ? 'Edit Note' : 'New Note'}</h2>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <input
                            className="input"
                            placeholder="Note title (optional)"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            style={{ marginBottom: 12 }}
                        />
                        <textarea
                            className="input"
                            placeholder="Write your note..."
                            value={form.text}
                            onChange={e => setForm({ ...form, text: e.target.value })}
                            rows={8}
                            style={{ marginBottom: 12, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setForm({ ...form, color: c })}
                                    style={{
                                        width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                                        cursor: 'pointer', outline: form.color === c ? '2px solid white' : 'none',
                                        outlineOffset: 2,
                                    }}
                                />
                            ))}
                        </div>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
                            <Save size={16} /> {saving ? 'Saving...' : editingNote ? 'Update' : 'Save'} Note
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
