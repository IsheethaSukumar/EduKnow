import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Send, Play, Pause, RotateCcw, MessageSquare, Timer } from 'lucide-react';

export default function StudyRoomsPage() {
    const { token, user } = useAuth();
    const [roomId, setRoomId] = useState('global-hackathon');
    const [joined, setJoined] = useState(false);

    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [activeUsers, setActiveUsers] = useState<string[]>([]);

    const [timeLeft, setTimeLeft] = useState(1500);
    const [timerActive, setTimerActive] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        // Local timer tick
        let interval: any;
        if (timerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setTimerActive(false);
        }
        return () => clearInterval(interval);
    }, [timerActive, timeLeft]);

    const joinRoom = () => {
        if (!token) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/rooms/${roomId}/ws?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onerror = (err) => {
            console.error("WebSocket Error:", err);
            alert("Failed to connect to study room. Ensure the backend server is running.");
            setJoined(false);
        };

        ws.onopen = () => {
            setJoined(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'init') {
                    setMessages(data.chat_history || []);
                    setActiveUsers(data.users || []);
                    setTimeLeft(data.timer?.timeLeft || 1500);
                    setTimerActive(data.timer?.active || false);
                } else if (data.type === 'system') {
                    setMessages(prev => [...prev, { system: true, text: data.text }]);
                    if (data.users) setActiveUsers(data.users);
                } else if (data.type === 'chat') {
                    setMessages(prev => [...prev, data.message]);
                } else if (data.type === 'timer_sync') {
                    if (data.timer) {
                        setTimeLeft(data.timer.timeLeft || 1500);
                        setTimerActive(data.timer.active || false);
                    }
                }
            } catch (err) {
                console.error("Error parsing WS message:", err);
            }
        };

        ws.onclose = () => {
            setJoined(false);
        };

        wsRef.current = ws;
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const sendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !wsRef.current) return;

        wsRef.current.send(JSON.stringify({ type: 'chat', text: input }));
        setInput('');
    };

    const toggleTimer = () => {
        const newState = !timerActive;
        setTimerActive(newState);
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'timer_update',
                timer: { active: newState, timeLeft, mode: 'focus' }
            }));
        }
    };

    const resetTimer = () => {
        setTimerActive(false);
        setTimeLeft(1500);
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'timer_update',
                timer: { active: false, timeLeft: 1500, mode: 'focus' }
            }));
        }
    };

    const formatTime = (seconds: number) => {
        if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (!joined) {
        return (
            <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Users size={64} color="var(--primary-color)" style={{ marginBottom: 24 }} />
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Collaborative Study Rooms</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32, textAlign: 'center', maxWidth: 400 }}>
                    Join a real-time study room to share a Pomodoro timer and chat with peers.
                </p>
                <div className="card" style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Room ID</label>
                    <input
                        className="input"
                        value={roomId}
                        onChange={e => setRoomId(e.target.value)}
                        placeholder="e.g. compsci-101"
                    />
                    <button className="btn btn-primary" onClick={joinRoom} style={{ width: '100%', padding: 12 }}>
                        Join Room
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container animate-fade-in" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Users size={24} color="var(--primary-color)" />
                        Room: {roomId}
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', marginRight: 6 }}></div>
                        {activeUsers.length} Online
                    </div>
                    <button className="btn btn-ghost" onClick={() => { wsRef.current?.close(); setJoined(false); }}>Leave</button>
                </div>
            </div>

            <div className="grid-2" style={{ flex: 1, minHeight: 0, gap: 24 }}>
                {/* Left Side: Timer & Users */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, flex: 1 }}>
                        <Timer size={48} color="var(--primary-color)" style={{ marginBottom: 24 }} />
                        <div style={{ fontSize: '5rem', fontWeight: 800, fontFamily: 'monospace', lineHeight: 1, marginBottom: 32, color: timerActive ? 'var(--primary-color)' : 'var(--text-primary)' }}>
                            {formatTime(timeLeft)}
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <button className={`btn ${timerActive ? 'btn-secondary' : 'btn-primary'}`} style={{ width: 120, padding: 16 }} onClick={toggleTimer}>
                                {timerActive ? <Pause size={20} /> : <Play size={20} />}
                                {timerActive ? 'Pause' : 'Start'}
                            </button>
                            <button className="btn btn-secondary" style={{ padding: 16 }} onClick={resetTimer}>
                                <RotateCcw size={20} />
                            </button>
                        </div>
                        <p style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                            Shared Pomodoro. Anyone can control it.
                        </p>
                    </div>

                    <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Present in Room</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {(activeUsers || []).map((name, i) => {
                                const userName = name || 'Unknown';
                                return (
                                    <div key={`user-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                                            {userName.charAt(0).toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{userName} {userName === user?.username ? '(You)' : ''}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Side: Chat */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)' }}>
                        <MessageSquare size={18} color="var(--text-secondary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Room Chat</h3>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(!messages || messages.length === 0) ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', margin: 'auto' }}>No messages yet. Say hi!</div>
                        ) : (
                            messages.map((msg, idx) => {
                                if (msg?.system) {
                                    return (
                                        <div key={`msg-${idx}`} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', margin: '4px 0' }}>
                                            {msg.text || ''}
                                        </div>
                                    );
                                }
                                const msgUser = msg?.username || 'Unknown';
                                const isMe = msgUser === user?.username;
                                return (
                                    <div key={`msg-${idx}`} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: 4, padding: '0 4px' }}>{msgUser}</span>
                                        <div style={{
                                            background: isMe ? 'var(--primary-color)' : 'var(--bg-secondary)',
                                            color: isMe ? 'white' : 'var(--text-primary)',
                                            padding: '8px 12px',
                                            borderRadius: 12,
                                            borderBottomRightRadius: isMe ? 4 : 12,
                                            borderBottomLeftRadius: !isMe ? 4 : 12,
                                            maxWidth: '80%',
                                            lineHeight: 1.5,
                                            fontSize: '0.9rem'
                                        }}>
                                            {msg?.text || ''}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={sendMessage} style={{ padding: 16, borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8, background: 'var(--bg-secondary)' }}>
                        <input
                            className="input"
                            style={{ flex: 1, background: 'var(--bg-card)' }}
                            placeholder="Message the room..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
