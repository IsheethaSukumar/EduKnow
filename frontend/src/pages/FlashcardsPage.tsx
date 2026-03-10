import { useState, useEffect } from 'react';
import { flashcardsAPI } from '../services/api';
import { Brain, RefreshCw, Layers, CheckCircle, XCircle, ArrowRight, Loader, Plus, Trash2, BookOpen, X, Play } from 'lucide-react';

export default function FlashcardsPage() {
    const [allCards, setAllCards] = useState<any[]>([]);
    const [dueCards, setDueCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'overview' | 'review' | 'study'>('overview');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [reviewCards, setReviewCards] = useState<any[]>([]);
    const [form, setForm] = useState({ deck_name: 'General', front: '', back: '' });

    useEffect(() => {
        loadAll();
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [allRes, dueRes] = await Promise.all([
                flashcardsAPI.list(),
                flashcardsAPI.getDue(),
            ]);
            setAllCards(allRes.data);
            setDueCards(dueRes.data);
        } catch (err) {
            console.error('Error loading flashcards:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!form.front.trim() || !form.back.trim()) return;
        try {
            await flashcardsAPI.create(form);
            setForm({ deck_name: form.deck_name, front: '', back: '' });
            loadAll();
        } catch (err) {
            console.error('Error creating flashcard:', err);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await flashcardsAPI.delete(id);
            loadAll();
        } catch (err) {
            console.error('Error deleting flashcard:', err);
        }
    };

    const startReview = (cards: any[]) => {
        if (cards.length === 0) return;
        setReviewCards(cards);
        setCurrentIndex(0);
        setIsFlipped(false);
        setMode('review');
    };

    const startStudy = (deckName?: string) => {
        let cards = allCards;
        if (deckName) cards = allCards.filter(c => c.deck_name === deckName);
        if (cards.length === 0) return;
        setReviewCards(cards);
        setCurrentIndex(0);
        setIsFlipped(false);
        setMode('study');
    };

    const handleReview = async (quality: number) => {
        const currentCard = reviewCards[currentIndex];
        if (!currentCard) return;
        try {
            if (mode === 'review') {
                await flashcardsAPI.review(currentCard.id, quality);
            }
            const nextIndex = currentIndex + 1;
            if (nextIndex < reviewCards.length) {
                setCurrentIndex(nextIndex);
                setIsFlipped(false);
            } else {
                setMode('overview');
                loadAll();
            }
        } catch (err) {
            console.error('Error reviewing card:', err);
        }
    };

    // Get unique decks
    const decks = [...new Set(allCards.map(c => c.deck_name))];

    if (loading) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <Loader className="animate-spin" size={32} color="var(--primary-color)" />
            </div>
        );
    }

    // ─── Review / Study Mode ───
    if (mode === 'review' || mode === 'study') {
        const card = reviewCards[currentIndex];
        if (!card) { setMode('overview'); return null; }

        return (
            <div className="page-container animate-fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Brain size={28} color="var(--primary-color)" />
                            {mode === 'review' ? 'SRS Review' : 'Study Mode'}
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Card {currentIndex + 1} of {reviewCards.length} • {card.deck_name} deck
                        </p>
                    </div>
                    <button className="btn btn-ghost" onClick={() => { setMode('overview'); loadAll(); }} style={{ border: '1px solid var(--border-color)' }}>
                        <X size={16} /> Exit
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, marginBottom: 32 }}>
                    <div style={{ height: '100%', width: `${((currentIndex + 1) / reviewCards.length) * 100}%`, background: 'var(--primary-color)', borderRadius: 2, transition: 'width 0.3s ease' }} />
                </div>

                <div style={{ maxWidth: 550, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Flashcard */}
                    <div
                        style={{ perspective: 1000, height: 320, cursor: 'pointer' }}
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <div style={{
                            width: '100%', height: '100%', position: 'relative',
                            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                            transformStyle: 'preserve-3d',
                            transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)',
                        }}>
                            {/* Front */}
                            <div style={{
                                position: 'absolute', width: '100%', height: '100%',
                                backfaceVisibility: 'hidden', borderRadius: 16, padding: 32,
                                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                                color: 'white', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                                boxShadow: '0 15px 50px rgba(99,102,241,0.3)',
                            }}>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 600, lineHeight: 1.4 }}>{card.front}</h3>
                                <p style={{ position: 'absolute', bottom: 20, fontSize: '0.8rem', opacity: 0.7 }}>Click to flip</p>
                            </div>
                            {/* Back */}
                            <div style={{
                                position: 'absolute', width: '100%', height: '100%',
                                backfaceVisibility: 'hidden', transform: 'rotateX(180deg)',
                                borderRadius: 16, padding: 32,
                                background: 'var(--bg-card)', border: '2px solid var(--primary-color)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                justifyContent: 'center', textAlign: 'center',
                                boxShadow: '0 15px 50px rgba(99,102,241,0.15)',
                            }}>
                                <p style={{ fontSize: '1.15rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{card.back}</p>
                            </div>
                        </div>
                    </div>

                    {/* Rating buttons */}
                    {isFlipped && (
                        <div className="card animate-fade-in" style={{ padding: 20 }}>
                            <h4 style={{ textAlign: 'center', marginBottom: 14, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {mode === 'review' ? 'How well did you know this?' : 'Rate your recall'}
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                                {[
                                    { q: 1, label: 'Again', color: '#ef4444', icon: <XCircle size={22} /> },
                                    { q: 3, label: 'Hard', color: '#f59e0b', icon: <ArrowRight size={22} /> },
                                    { q: 4, label: 'Good', color: '#10b981', icon: <CheckCircle size={22} /> },
                                    { q: 5, label: 'Easy', color: '#3b82f6', icon: <CheckCircle size={22} /> },
                                ].map(btn => (
                                    <button
                                        key={btn.q}
                                        className="btn btn-ghost"
                                        style={{
                                            flexDirection: 'column', padding: '14px 8px', color: btn.color,
                                            border: `1px solid ${btn.color}30`, borderRadius: 10,
                                        }}
                                        onClick={e => { e.stopPropagation(); handleReview(btn.q); }}
                                    >
                                        {btn.icon}
                                        <span style={{ fontSize: '0.82rem', marginTop: 4 }}>{btn.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── Overview Mode ───
    return (
        <div className="page-container animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Brain size={32} color="var(--primary-color)" />
                        SRS Flashcards
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Spaced repetition powered by SuperMemo-2 • {allCards.length} total cards • {dueCards.length} due
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={loadAll} style={{ border: '1px solid var(--border-color)' }}>
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Add Card
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                <div className="card" style={{ padding: 20, textAlign: 'center', cursor: dueCards.length > 0 ? 'pointer' : 'default' }}
                    onClick={() => dueCards.length > 0 && startReview(dueCards)}>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: dueCards.length > 0 ? '#f59e0b' : '#10b981' }}>
                        {dueCards.length}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Due Today</p>
                    {dueCards.length > 0 && (
                        <button className="btn btn-primary" style={{ marginTop: 10, fontSize: '0.8rem', padding: '6px 16px' }}>
                            <Play size={14} /> Start Review
                        </button>
                    )}
                </div>
                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1' }}>{allCards.length}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Cards</p>
                </div>
                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: '#0ea5e9' }}>{decks.length}</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Decks</p>
                </div>
            </div>

            {/* Due cards CTA */}
            {dueCards.length > 0 && (
                <div style={{
                    padding: 20, borderRadius: 12, marginBottom: 24,
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                    border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div>
                        <h3 style={{ fontWeight: 700, marginBottom: 4 }}>🔔 {dueCards.length} cards due for review</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review them now to keep your SRS schedule on track!</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => startReview(dueCards)}>
                        <Play size={16} /> Review Now
                    </button>
                </div>
            )}

            {/* Decks */}
            {decks.length === 0 ? (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 48, textAlign: 'center' }}>
                    <Layers size={48} color="var(--text-tertiary)" style={{ marginBottom: 16 }} />
                    <h3 style={{ fontWeight: 600, marginBottom: 8 }}>No flashcards yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 16, maxWidth: 400 }}>
                        Create cards manually or use <strong>/flashcards &lt;topic&gt;</strong> in EduBot to generate them automatically!
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                        <Plus size={16} /> Create Your First Card
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {decks.map(deck => {
                        const deckCards = allCards.filter(c => c.deck_name === deck);
                        const deckDue = dueCards.filter(c => c.deck_name === deck);
                        return (
                            <div key={deck} className="card" style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>
                                            <Layers size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom', color: '#6366f1' }} />
                                            {deck}
                                        </h3>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {deckCards.length} cards{deckDue.length > 0 ? ` • ${deckDue.length} due` : ''}
                                        </p>
                                    </div>
                                </div>
                                {/* Preview first 2 cards */}
                                <div style={{ marginBottom: 12 }}>
                                    {deckCards.slice(0, 2).map(card => (
                                        <div key={card.id} style={{
                                            padding: '8px 12px', marginBottom: 6, borderRadius: 8,
                                            background: 'var(--bg-secondary)', fontSize: '0.82rem',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <span style={{ fontWeight: 500 }}>{card.front.length > 35 ? card.front.slice(0, 35) + '...' : card.front}</span>
                                            <button onClick={() => handleDelete(card.id)} style={{
                                                background: 'none', border: 'none', cursor: 'pointer', color: '#f43f5e', padding: 2,
                                            }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {deckCards.length > 2 && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', paddingLeft: 12 }}>
                                            +{deckCards.length - 2} more
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {deckDue.length > 0 && (
                                        <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.82rem', padding: '6px 12px' }}
                                            onClick={() => startReview(deckDue)}>
                                            <Play size={14} /> Review ({deckDue.length})
                                        </button>
                                    )}
                                    <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.82rem', padding: '6px 12px', border: '1px solid var(--border-color)' }}
                                        onClick={() => startStudy(deck)}>
                                        <BookOpen size={14} /> Study All
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Card Modal */}
            {showCreate && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                }} onClick={() => setShowCreate(false)}>
                    <div className="card" style={{ width: 440, padding: 28 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Plus size={20} color="var(--primary-color)" /> Add Flashcard
                        </h2>
                        <input
                            className="input"
                            placeholder="Deck name (e.g. Data Structures)"
                            value={form.deck_name}
                            onChange={e => setForm({ ...form, deck_name: e.target.value })}
                            style={{ marginBottom: 12 }}
                        />
                        <textarea
                            className="input"
                            placeholder="Front — question or term"
                            value={form.front}
                            onChange={e => setForm({ ...form, front: e.target.value })}
                            rows={3}
                            style={{ marginBottom: 12 }}
                        />
                        <textarea
                            className="input"
                            placeholder="Back — answer or definition"
                            value={form.back}
                            onChange={e => setForm({ ...form, back: e.target.value })}
                            rows={3}
                            style={{ marginBottom: 16 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" onClick={handleCreate} style={{ flex: 1 }}>
                                Add Card
                            </button>
                            <button className="btn btn-ghost" onClick={() => setShowCreate(false)} style={{ border: '1px solid var(--border-color)' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
