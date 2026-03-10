import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAPI } from '../services/api';
import { Search as SearchIcon, Eye, ThumbsUp, FileText, Video, BookMarked, BookOpen, Presentation, Filter } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
    document: FileText, video: Video, article: BookMarked, course: BookOpen, presentation: Presentation,
};

const CONTENT_TYPES = ['All', 'document', 'video', 'article', 'course', 'presentation'];

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const navigate = useNavigate();

    const handleSearch = async (q?: string) => {
        const searchQuery = q || query;
        if (!searchQuery.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const params: any = {};
            if (activeFilter !== 'All') params.content_type = activeFilter;
            const res = await searchAPI.search(searchQuery, params);
            setResults(res.data.results);
            setTotal(res.data.total);
            setSuggestions(res.data.suggestions || []);
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <h1>🔍 Unified Search</h1>
                <p>Search across all knowledge resources with AI-powered relevance</p>
            </div>

            {/* Search Bar */}
            <div className="search-bar">
                <SearchIcon size={20} className="search-icon" />
                <input
                    className="input"
                    type="text"
                    placeholder="Search for courses, documents, articles, videos..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>

            {/* Filters */}
            <div className="search-filters">
                {CONTENT_TYPES.map((type) => (
                    <button
                        key={type}
                        className={`filter-chip ${activeFilter === type ? 'active' : ''}`}
                        onClick={() => { setActiveFilter(type); if (searched) handleSearch(); }}
                    >
                        {type === 'All' ? '📋 All' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                ))}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginRight: 8 }}>
                        Suggestions:
                    </span>
                    {suggestions.map((s) => (
                        <button
                            key={s}
                            className="chat-suggestion-btn"
                            style={{ marginRight: 8 }}
                            onClick={() => { setQuery(s); handleSearch(s); }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Results */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }}></div>
                    ))}
                </div>
            ) : searched ? (
                <>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Found <strong>{total}</strong> result{total !== 1 ? 's' : ''} for "{query}"
                    </p>
                    {results.length === 0 ? (
                        <div className="empty-state">
                            <SearchIcon size={48} />
                            <h3>No results found</h3>
                            <p>Try different keywords or remove filters</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {results.map((r: any) => {
                                const Icon = TYPE_ICONS[r.content.content_type] || FileText;
                                return (
                                    <div
                                        key={r.content.id}
                                        className="content-card"
                                        onClick={() => navigate(`/content/${r.content.id}`)}
                                        style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}
                                    >
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12,
                                            background: `rgba(99, 102, 241, 0.1)`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            <Icon size={24} color="#6366f1" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <h3 className="card-title">{r.content.title}</h3>
                                                <div className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                                                    {r.content.content_type}
                                                </div>
                                            </div>
                                            <p className="card-desc" style={{ WebkitLineClamp: 1 }}>
                                                {r.snippet || r.content.description}
                                            </p>
                                            <div className="card-meta">
                                                <span><Eye size={12} /> {r.content.views}</span>
                                                <span><ThumbsUp size={12} /> {r.content.upvotes}</span>
                                                <span>{r.content.category}</span>
                                                <span>
                                                    Score:
                                                    <div className="relevance-bar" style={{ marginLeft: 4 }}>
                                                        <div className="fill" style={{ width: `${Math.min(r.relevance_score * 10, 100)}%` }}></div>
                                                    </div>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-state">
                    <SearchIcon size={48} />
                    <h3>Start searching</h3>
                    <p>Type a query to search across all resources</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                        {['machine learning', 'exam preparation', 'python tutorial', 'research methods'].map((q) => (
                            <button
                                key={q}
                                className="chat-suggestion-btn"
                                onClick={() => { setQuery(q); handleSearch(q); }}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
