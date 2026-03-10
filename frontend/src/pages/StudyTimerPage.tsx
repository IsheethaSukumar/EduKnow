import { useState, useEffect, useRef } from 'react';
import { studyAPI, contentAPI } from '../services/api';
import { Play, Pause, RotateCcw, Coffee, Brain, Clock, Zap } from 'lucide-react';

export default function StudyTimerPage() {
    const [mode, setMode] = useState<'focus' | 'break'>('focus');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [sessions, setSessions] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<any>(null);

    const FOCUS_TIME = 25 * 60;
    const BREAK_TIME = 5 * 60;

    useEffect(() => {
        loadData();
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, []);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(t => t - 1);
                setElapsed(e => e + 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            handleSessionComplete();
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isRunning, timeLeft]);

    const loadData = async () => {
        try {
            const [sessRes, statsRes] = await Promise.all([
                studyAPI.listSessions(7),
                studyAPI.getStats(7),
            ]);
            setSessions(sessRes.data);
            setStats(statsRes.data);
        } catch (err) { }
    };

    const handleSessionComplete = async () => {
        setIsRunning(false);
        if (elapsed > 10) {
            try {
                await studyAPI.createSession({
                    duration_seconds: elapsed,
                    session_type: mode,
                });
                loadData();
            } catch (err) { }
        }
        // Auto-switch mode
        if (mode === 'focus') {
            setMode('break');
            setTimeLeft(BREAK_TIME);
        } else {
            setMode('focus');
            setTimeLeft(FOCUS_TIME);
        }
        setElapsed(0);
    };

    const toggleTimer = () => setIsRunning(!isRunning);

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(mode === 'focus' ? FOCUS_TIME : BREAK_TIME);
        setElapsed(0);
    };

    const switchMode = (m: 'focus' | 'break') => {
        if (isRunning && elapsed > 10) {
            studyAPI.createSession({ duration_seconds: elapsed, session_type: mode }).then(loadData);
        }
        setIsRunning(false);
        setMode(m);
        setTimeLeft(m === 'focus' ? FOCUS_TIME : BREAK_TIME);
        setElapsed(0);
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const formatDuration = (s: number) => {
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    };

    const progress = mode === 'focus'
        ? ((FOCUS_TIME - timeLeft) / FOCUS_TIME) * 100
        : ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100;

    return (
        <div className="page-container animate-fade-in">
            <div className="page-header">
                <h1>🕒 Study Timer</h1>
                <p>Pomodoro technique: 25 min focus, 5 min breaks. Stay productive!</p>
            </div>

            <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* Timer */}
                <div className="card" style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                        <button
                            className={`btn ${mode === 'focus' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => switchMode('focus')}
                            style={{ border: mode !== 'focus' ? '1px solid var(--border-color)' : undefined }}
                        >
                            <Brain size={16} /> Focus
                        </button>
                        <button
                            className={`btn ${mode === 'break' ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => switchMode('break')}
                            style={{ border: mode !== 'break' ? '1px solid var(--border-color)' : undefined }}
                        >
                            <Coffee size={16} /> Break
                        </button>
                    </div>

                    {/* Circular progress */}
                    <div style={{ position: 'relative', width: 220, height: 220, margin: '0 auto 24px' }}>
                        <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="110" cy="110" r="100" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
                            <circle
                                cx="110" cy="110" r="100" fill="none"
                                stroke={mode === 'focus' ? '#6366f1' : '#10b981'}
                                strokeWidth="8" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 100}`}
                                strokeDashoffset={`${2 * Math.PI * 100 * (1 - progress / 100)}`}
                                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                            />
                        </svg>
                        <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'monospace' }}>
                                {formatTime(timeLeft)}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                                {mode === 'focus' ? '🧠 Focus Time' : '☕ Break Time'}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={toggleTimer} style={{ minWidth: 120 }}>
                            {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Start</>}
                        </button>
                        <button className="btn btn-ghost" onClick={resetTimer} style={{ border: '1px solid var(--border-color)' }}>
                            <RotateCcw size={18} />
                        </button>
                    </div>

                    {elapsed > 0 && (
                        <div style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Session elapsed: {formatDuration(elapsed)}
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div>
                    {stats && (
                        <div className="card" style={{ marginBottom: 16 }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>📊 This Week</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="stat-card">
                                    <div className="stat-value">{formatDuration(stats.total_seconds)}</div>
                                    <div className="stat-label">Total Study</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{stats.total_sessions}</div>
                                    <div className="stat-label">Sessions</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{stats.focus_sessions}</div>
                                    <div className="stat-label">Focus Sessions</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{stats.avg_session_minutes}m</div>
                                    <div className="stat-label">Avg Session</div>
                                </div>
                            </div>

                            {/* Mini bar chart */}
                            {stats.daily && (
                                <div style={{ marginTop: 20 }}>
                                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Daily Study Time</h4>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60 }}>
                                        {stats.daily.map((d: any, i: number) => {
                                            const max = Math.max(...stats.daily.map((x: any) => x.seconds), 1);
                                            const h = Math.max((d.seconds / max) * 50, 2);
                                            return (
                                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                    <div style={{
                                                        width: '100%', height: h, borderRadius: 4,
                                                        background: d.seconds > 0 ? '#6366f1' : 'var(--bg-tertiary)',
                                                    }} title={`${d.date}: ${formatDuration(d.seconds)}`} />
                                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                                                        {d.date.slice(-2)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="card">
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📋 Recent Sessions</h3>
                        {sessions.length === 0 ? (
                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No sessions yet. Start your first Pomodoro!</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {sessions.slice(0, 8).map((s: any) => (
                                    <div key={s.id} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem',
                                    }}>
                                        <div>
                                            <span style={{ marginRight: 8 }}>
                                                {s.session_type === 'focus' ? '🧠' : '☕'}
                                            </span>
                                            {s.content_title || s.session_type}
                                        </div>
                                        <span style={{ color: 'var(--text-tertiary)' }}>{formatDuration(s.duration_seconds)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
