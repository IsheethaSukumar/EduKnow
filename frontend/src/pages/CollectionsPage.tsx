import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collectionsAPI } from '../services/api';
import { Plus, Trash2, FolderOpen, X, Eye } from 'lucide-react';

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899'];

export default function CollectionsPage() {
    const navigate = useNavigate();
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [viewCollection, setViewCollection] = useState<any>(null);
    const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });

    useEffect(() => { loadCollections(); }, []);

    const loadCollections = async () => {
        try {
            const res = await collectionsAPI.list();
            setCollections(res.data);
        } catch (err) { }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!form.name.trim()) return;
        try {
            await collectionsAPI.create(form);
            setShowCreate(false);
            setForm({ name: '', description: '', color: '#6366f1' });
            loadCollections();
        } catch (err) { }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await collectionsAPI.delete(id);
            loadCollections();
            if (viewCollection?.id === id) setViewCollection(null);
        } catch (err) { }
    };

    const openCollection = async (id: string) => {
        try {
            const res = await collectionsAPI.get(id);
            setViewCollection(res.data);
        } catch (err) { }
    };

    const removeFromCollection = async (contentId: string) => {
        if (!viewCollection) return;
        try {
            await collectionsAPI.removeItem(viewCollection.id, contentId);
            openCollection(viewCollection.id);
            loadCollections();
        } catch (err) { }
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>📂 Collections</h1>
                        <p>Organize resources into customized learning paths</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> New Collection
                    </button>
                </div>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: viewCollection ? '1fr 1fr' : '1fr' }}>
                {/* Collections List */}
                <div>
                    {loading ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
                        </div>
                    ) : collections.length === 0 ? (
                        <div className="empty-state card">
                            <FolderOpen size={48} style={{ color: '#6366f1', marginBottom: 12 }} />
                            <h3>No collections yet</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Create a collection to organize your resources!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: viewCollection ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                            {collections.map(coll => (
                                <div key={coll.id} className="card content-card" onClick={() => openCollection(coll.id)}
                                    style={{
                                        borderLeft: `4px solid ${coll.color || '#6366f1'}`,
                                        cursor: 'pointer',
                                        background: viewCollection?.id === coll.id ? 'rgba(99, 102, 241, 0.1)' : undefined,
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{coll.name}</h3>
                                            {coll.description && (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 8 }}>
                                                    {coll.description}
                                                </p>
                                            )}
                                            <span className="badge badge-secondary">{coll.item_count} items</span>
                                        </div>
                                        <button className="btn btn-ghost" style={{ padding: 4, color: '#f43f5e' }}
                                            onClick={(e) => handleDelete(coll.id, e)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Collection Detail */}
                {viewCollection && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                {viewCollection.name}
                            </h2>
                            <button className="btn btn-ghost" onClick={() => setViewCollection(null)}><X size={18} /></button>
                        </div>
                        {viewCollection.description && (
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.85rem' }}>
                                {viewCollection.description}
                            </p>
                        )}
                        {viewCollection.items?.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                This collection is empty. Add content from the content pages!
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {viewCollection.items?.map((item: any) => (
                                    <div key={item.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: 12, borderRadius: 8, background: 'var(--bg-secondary)',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.content.title}</h4>
                                            <span className="badge badge-secondary" style={{ marginTop: 4 }}>
                                                {item.content.content_type}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="btn btn-ghost" style={{ padding: 4 }}
                                                onClick={() => navigate(`/content/${item.content_id}`)}>
                                                <Eye size={14} />
                                            </button>
                                            <button className="btn btn-ghost" style={{ padding: 4, color: '#f43f5e' }}
                                                onClick={() => removeFromCollection(item.content_id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowCreate(false)}>
                    <div className="card" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>New Collection</h2>
                        <input
                            className="input"
                            placeholder="Collection name"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            style={{ marginBottom: 12 }}
                        />
                        <textarea
                            className="input"
                            placeholder="Description (optional)"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={3}
                            style={{ marginBottom: 12 }}
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
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1 }}>Create</button>
                            <button className="btn btn-ghost" onClick={() => setShowCreate(false)} style={{ border: '1px solid var(--border-color)' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
