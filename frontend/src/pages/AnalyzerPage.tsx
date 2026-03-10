import { useState, useRef, useEffect } from 'react';
import { analyzerAPI, flashcardsAPI } from '../services/api';
import { UploadCloud, FileText, Loader, CheckCircle, BrainCircuit, Activity, BookOpen, History, Trash2, Clock, ChevronRight } from 'lucide-react';

interface HistoryItem {
    id: string;
    filename: string;
    summary_preview: string;
    created_at: string;
}

export default function AnalyzerPage() {
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [savingFlashcards, setSavingFlashcards] = useState(false);
    const [savedFlashcards, setSavedFlashcards] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // History state
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
    const [loadingHistoryItem, setLoadingHistoryItem] = useState(false);
    const [historyFilename, setHistoryFilename] = useState<string | null>(null);

    // Load history on mount
    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await analyzerAPI.getHistory();
            setHistory(res.data);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            if (selected.type !== 'application/pdf') {
                setError('Please upload a PDF file.');
                setFile(null);
                return;
            }
            setFile(selected);
            setError('');
            setResult(null);
            setSavedFlashcards(false);
            setActiveHistoryId(null);
            setHistoryFilename(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setAnalyzing(true);
        setError('');
        setActiveHistoryId(null);
        setHistoryFilename(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await analyzerAPI.analyzeDocument(formData);
            setResult(res.data.analysis);
            // Refresh history to include the new entry
            fetchHistory();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to analyze document.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleLoadHistoryItem = async (item: HistoryItem) => {
        setLoadingHistoryItem(true);
        setActiveHistoryId(item.id);
        setError('');
        try {
            const res = await analyzerAPI.getHistoryItem(item.id);
            setResult({
                summary: res.data.summary,
                key_concepts: res.data.key_concepts,
                flashcards: res.data.flashcards,
            });
            setHistoryFilename(res.data.filename);
            setSavedFlashcards(false);
            setFile(null);
        } catch (err: any) {
            setError('Failed to load history item.');
            setActiveHistoryId(null);
        } finally {
            setLoadingHistoryItem(false);
        }
    };

    const handleDeleteHistory = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await analyzerAPI.deleteHistoryItem(id);
            setHistory(prev => prev.filter(h => h.id !== id));
            if (activeHistoryId === id) {
                setResult(null);
                setActiveHistoryId(null);
                setHistoryFilename(null);
            }
        } catch (err) {
            console.error('Failed to delete history item:', err);
        }
    };

    const handleSaveFlashcards = async () => {
        if (!result || !result.flashcards) return;
        setSavingFlashcards(true);
        try {
            const deckName = historyFilename
                ? historyFilename.replace('.pdf', '')
                : file
                    ? file.name.replace('.pdf', '')
                    : "AI Generated";
            for (const card of result.flashcards) {
                await flashcardsAPI.create({
                    deck_name: deckName,
                    front: card.front,
                    back: card.back
                });
            }
            setSavedFlashcards(true);
        } catch (err) {
            console.error('Error saving flashcards:', err);
            alert('Failed to save flashcards');
        } finally {
            setSavingFlashcards(false);
        }
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' \u2022 ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="page-container animate-fade-in">
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <BrainCircuit size={32} color="var(--primary-color)" />
                    AI Document Analyzer
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Upload a PDF document and instantly generate summaries, key concepts, and flashcards using Groq Llama-3.
                </p>
            </div>

            <div className="grid-2">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Upload Card */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div
                            style={{
                                border: '2px dashed var(--border-color)',
                                borderRadius: 12,
                                padding: 48,
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: file ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                borderColor: file ? 'var(--primary-color)' : 'var(--border-color)'
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                accept="application/pdf"
                                style={{ display: 'none' }}
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            {file ? (
                                <>
                                    <FileText size={48} color="var(--primary-color)" style={{ margin: '0 auto 16px' }} />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</h3>
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 8 }}>
                                        {(file.size / 1024 / 1024).toFixed(2)} MB &bull; Ready to analyze
                                    </p>
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 16px' }} />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Click to upload PDF</h3>
                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: 8 }}>
                                        Max file size: 10MB
                                    </p>
                                </>
                            )}
                        </div>

                        {error && (
                            <div style={{ padding: 16, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 8, fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}
                            disabled={!file || analyzing}
                            onClick={handleAnalyze}
                        >
                            {analyzing ? (
                                <><Loader className="animate-spin" size={20} /> Analyzing with Groq...</>
                            ) : (
                                <><BrainCircuit size={20} /> Generate Study Materials</>
                            )}
                        </button>
                    </div>

                    {/* Search History Panel */}
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            marginBottom: 16
                        }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                                <History size={20} color="var(--primary-color)" />
                                Search History
                                {history.length > 0 && (
                                    <span style={{
                                        background: 'var(--primary-color)',
                                        color: '#fff',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        borderRadius: 999,
                                        padding: '2px 9px',
                                        marginLeft: 4,
                                        lineHeight: '1.6',
                                    }}>{history.length}</span>
                                )}
                            </h3>
                        </div>

                        {loadingHistory ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                                <Loader className="animate-spin" size={24} color="var(--primary-color)" />
                            </div>
                        ) : history.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '24px 16px',
                                color: 'var(--text-tertiary)', fontSize: '0.9rem',
                                border: '1px dashed var(--border-color)', borderRadius: 8
                            }}>
                                <Clock size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                <p style={{ margin: 0 }}>No analysis history yet.<br />Upload a document to get started.</p>
                            </div>
                        ) : (
                            <div style={{
                                maxHeight: 320, overflowY: 'auto',
                                display: 'flex', flexDirection: 'column', gap: 8,
                                paddingRight: 4,
                            }}>
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => handleLoadHistoryItem(item)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 14px',
                                            border: activeHistoryId === item.id
                                                ? '1.5px solid var(--primary-color)'
                                                : '1px solid var(--border-color)',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                            background: activeHistoryId === item.id
                                                ? 'rgba(99, 102, 241, 0.07)'
                                                : 'var(--bg-secondary)',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <FileText size={18} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontWeight: 600, fontSize: '0.9rem',
                                                color: 'var(--text-primary)',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                {item.filename}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                {item.created_at ? formatDate(item.created_at) : ''}
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteHistory(e, item.id)}
                                            title="Delete history item"
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                padding: 4, borderRadius: 6, display: 'flex',
                                                color: 'var(--text-tertiary)',
                                                transition: 'color 0.15s ease',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                        <ChevronRight size={15} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Column */}
                <div>
                    {(analyzing || loadingHistoryItem) && (
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400 }}>
                            <Loader className="animate-spin" size={48} color="var(--primary-color)" style={{ marginBottom: 24 }} />
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>
                                {analyzing ? 'Extracting Knowledge' : 'Loading History'}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                                {analyzing
                                    ? 'Llama-3 is reading your document, extracting key concepts, and building flashcards...'
                                    : 'Fetching your previous analysis results...'
                                }
                            </p>
                        </div>
                    )}

                    {!analyzing && !loadingHistoryItem && result && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Source badge if loaded from history */}
                            {historyFilename && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 16px',
                                    background: 'rgba(99, 102, 241, 0.08)',
                                    borderRadius: 10,
                                    fontSize: '0.85rem',
                                    color: 'var(--primary-color)',
                                    fontWeight: 600,
                                }}>
                                    <History size={16} />
                                    Loaded from history: {historyFilename}
                                </div>
                            )}

                            <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginBottom: 16 }}>
                                    <BookOpen size={20} color="var(--primary-color)" /> Summary
                                </h3>
                                <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>{result.summary}</p>
                            </div>

                            <div className="card animate-fade-in" style={{ animationDelay: '0.2s' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem', marginBottom: 16 }}>
                                    <Activity size={20} color="#10b981" /> Key Concepts
                                </h3>
                                <ul style={{ marginLeft: 20, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    {result.key_concepts?.map((c: string, i: number) => (
                                        <li key={i} style={{ marginBottom: 8 }}>{c}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="card animate-fade-in" style={{ animationDelay: '0.3s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2rem' }}>
                                        <CheckCircle size={20} color="#f59e0b" /> Generated Flashcards ({result.flashcards?.length})
                                    </h3>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSaveFlashcards}
                                        disabled={savingFlashcards || savedFlashcards}
                                        style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                                    >
                                        {savingFlashcards ? 'Saving...' : savedFlashcards ? <><CheckCircle size={14} style={{ marginRight: 4 }} /> Saved!</> : 'Save All to Deck'}
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {result.flashcards?.map((card: any, i: number) => (
                                        <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Q: {card.front}</div>
                                            <div style={{ color: 'var(--text-secondary)' }}>A: {card.back}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {!analyzing && !loadingHistoryItem && !result && (
                        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, border: '1px dashed var(--border-color)', background: 'transparent' }}>
                            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center' }}>
                                Upload a document to see the AI magic.<br />Results will appear here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
