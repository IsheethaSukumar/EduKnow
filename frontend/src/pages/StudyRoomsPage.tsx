import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { VideoMeeting } from '../components/VideoMeeting';
import { getWSUrl } from '../services/api';
import { interactionAPI } from '../services/api';
import { 
    Users, Send, Play, Pause, RotateCcw, MessageSquare, Timer, 
    Video, VideoOff, Layers, ExternalLink, Flag, Phone, PhoneOff,
    Mic, MicOff, AlertTriangle, X, Circle
} from 'lucide-react';

// ─── Word Censorship ───
const BANNED_WORDS = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
    'idiot', 'stupid', 'moron', 'nigger', 'faggot', 'retard', 'whore',
    'slut', 'cunt', 'piss', 'cock', 'dick', 'pussy', 'ass',
];

function censorMessage(text: string): string {
    let censored = text;
    BANNED_WORDS.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        censored = censored.replace(regex, (match) => '*'.repeat(match.length));
    });
    return censored;
}

// ─── Report Modal ───
interface ReportModalProps {
    message: { username: string; text: string; userId?: string };
    roomId: string;
    onClose: () => void;
    currentUser: any;
}

function ReportModal({ message, roomId, onClose, currentUser }: ReportModalProps) {
    const [reason, setReason] = useState('Inappropriate content');
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const REASONS = [
        'Inappropriate content',
        'Harassment / Bullying',
        'Hate speech',
        'Spam',
        'Threats',
        'Other',
    ];

    const handleReport = async () => {
        setSubmitting(true);
        try {
            await interactionAPI.reportChatMessage({
                reported_user: message.username,
                reported_user_id: message.userId || null,
                room_id: roomId,
                message_text: message.text,
                reason,
            });
            setDone(true);
            setTimeout(onClose, 2000);
        } catch (err) {
            console.error('Report failed', err);
            alert('Failed to submit report');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content card" style={{ maxWidth: 420, width: '100%' }}>
                {done ? (
                    <div className="text-center p-8">
                        <AlertTriangle size={48} color="#f59e0b" style={{ margin: '0 auto 16px' }} />
                        <h3 className="font-bold text-lg mb-2">Report Submitted</h3>
                        <p className="text-secondary text-sm">Admins have been notified. Thank you for keeping the community safe.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex-between mb-6">
                            <h3 className="font-bold text-lg flex-center gap-2">
                                <Flag size={20} color="#ef4444" /> Report Message
                            </h3>
                            <button className="btn-close" onClick={onClose}>&times;</button>
                        </div>

                        <div className="card-minimal p-3 mb-4" style={{ background: 'rgba(239,68,68,0.08)', borderLeft: '3px solid #ef4444' }}>
                            <div className="text-xs text-secondary mb-1">Reported message from <strong>{message.username}</strong>:</div>
                            <p className="text-sm">{message.text}</p>
                        </div>

                        <div className="grid gap-3 mb-5">
                            <label className="text-sm font-semibold">Reason for reporting</label>
                            {REASONS.map(r => (
                                <label key={r} className="flex-center gap-3 cursor-pointer" style={{ padding: '8px 12px', borderRadius: 8, background: reason === r ? 'rgba(99,102,241,0.1)' : 'transparent', border: reason === r ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent' }}>
                                    <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                                    <span className="text-sm">{r}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button className="btn btn-secondary flex-1" onClick={onClose}>Cancel</button>
                            <button className="btn btn-primary flex-1" onClick={handleReport} disabled={submitting}>
                                {submitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function StudyRoomsPage() {
    const { token, user } = useAuth();
    const [roomId, setRoomId] = useState('global-hackathon');
    const [joined, setJoined] = useState(false);
    const [isVideoActive, setIsVideoActive] = useState(false);
    const [isAudioCall, setIsAudioCall] = useState(false);

    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [activeUsers, setActiveUsers] = useState<string[]>([]);

    const [timeLeft, setTimeLeft] = useState(1500);
    const [timerActive, setTimerActive] = useState(false);

    // Report state
    const [reportTarget, setReportTarget] = useState<any>(null);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [showRecordingToast, setShowRecordingToast] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
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

        const wsUrl = getWSUrl(`/rooms/${roomId}/ws?token=${token}`);
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
                    // Apply censorship to incoming messages
                    const msg = { ...data.message, text: censorMessage(data.message.text || '') };
                    setMessages(prev => [...prev, msg]);
                } else if (data.type === 'timer_sync') {
                    if (data.timer) {
                        setTimeLeft(data.timer.timeLeft || 1500);
                        setTimerActive(data.timer.active || false);
                    }
                } else if (data.type === 'recording_started') {
                    // Notify other users about recording
                    setShowRecordingToast(true);
                    setTimeout(() => setShowRecordingToast(false), 5000);
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

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    const sendMessage = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || !wsRef.current) return;
        const censored = censorMessage(input);
        wsRef.current.send(JSON.stringify({ type: 'chat', text: censored }));
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

    // ─── Recording Logic ───
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const mediaRecorder = new MediaRecorder(stream);
            recordingChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordingChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recording-${roomId}-${new Date().toISOString().slice(0, 10)}.webm`;
                a.click();
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);

            // Notify all room participants
            if (wsRef.current) {
                wsRef.current.send(JSON.stringify({
                    type: 'recording_started',
                    text: `${user?.full_name || user?.username} has started recording this session.`
                }));
            }

            // Show toast to self too
            setShowRecordingToast(true);
            setTimeout(() => setShowRecordingToast(false), 5000);
        } catch (err) {
            alert('Could not access microphone for recording.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    if (!joined) {
        return (
            <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Users size={64} color="var(--primary-color)" style={{ marginBottom: 24 }} />
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Collaborative Study Rooms</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32, textAlign: 'center', maxWidth: 400 }}>
                    Join a real-time study room to share a Pomodoro timer, chat, and video call with peers.
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
            {/* Recording Toast Notification */}
            {showRecordingToast && (
                <div style={{
                    position: 'fixed', top: 80, right: 24, zIndex: 9999,
                    background: 'rgba(239,68,68,0.95)', color: 'white',
                    padding: '12px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: '0 8px 30px rgba(239,68,68,0.3)', animation: 'slide-in 0.3s ease',
                    maxWidth: 360,
                }}>
                    <Circle size={12} fill="white" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        🔴 This session is being recorded
                    </span>
                    <button onClick={() => setShowRecordingToast(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: 'auto' }}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Report Modal */}
            {reportTarget && (
                <ReportModal
                    message={reportTarget}
                    roomId={roomId}
                    onClose={() => setReportTarget(null)}
                    currentUser={user}
                />
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Users size={24} color="var(--primary-color)" />
                        Room: {roomId}
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', marginRight: 6 }}></div>
                        {activeUsers.length} Online
                    </div>

                    {/* Recording Button */}
                    <button
                        className={`btn ${isRecording ? 'btn-secondary' : 'btn-ghost'}`}
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', border: isRecording ? '1px solid #ef4444' : undefined, color: isRecording ? '#ef4444' : undefined }}
                        title={isRecording ? 'Stop Recording' : 'Record Session'}
                    >
                        <Circle size={14} fill={isRecording ? '#ef4444' : 'currentColor'} color={isRecording ? '#ef4444' : 'currentColor'} />
                        {isRecording ? 'Stop Rec' : 'Record'}
                    </button>

                    {/* Audio Call */}
                    <button
                        className={`btn ${isAudioCall ? 'btn-secondary' : 'btn-ghost'}`}
                        onClick={() => { setIsAudioCall(!isAudioCall); setIsVideoActive(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        title="Audio Call"
                    >
                        {isAudioCall ? <PhoneOff size={18} /> : <Phone size={18} />}
                        {isAudioCall ? 'End Audio' : 'Audio Call'}
                    </button>

                    {/* Video Call */}
                    <button
                        className={`btn ${isVideoActive ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => { setIsVideoActive(!isVideoActive); setIsAudioCall(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        {isVideoActive ? <VideoOff size={18} /> : <Video size={18} />}
                        {isVideoActive ? 'End Video' : 'Video Call'}
                    </button>

                    {/* Complaint Section Link */}
                    <button 
                        className="btn btn-ghost" 
                        onClick={() => window.open('/complaints', '_blank')}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}
                        title="Submit a Complaint for review"
                    >
                        <AlertTriangle size={18} />
                        Complaint
                    </button>

                    <button className="btn btn-ghost" onClick={() => { wsRef.current?.close(); setJoined(false); }}>Leave</button>
                </div>
            </div>

            <div className="grid-2" style={{ flex: 1, minHeight: 0, gap: 24 }}>
                {/* Left Side: Video/Audio/Timer & Users */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: (isVideoActive || isAudioCall) ? 2 : 1 }}>
                    {isVideoActive ? (
                        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: 500, position: 'relative' }}>
                            <VideoMeeting
                                roomName={roomId}
                                displayName={user?.full_name || user?.username || 'Student'}
                                onClose={() => setIsVideoActive(false)}
                            />
                        </div>
                    ) : isAudioCall ? (
                        <AudioCallPanel
                            roomName={roomId}
                            displayName={user?.full_name || user?.username || 'Student'}
                            onClose={() => setIsAudioCall(false)}
                        />
                    ) : (
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
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={18} /> Present
                            </h3>
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

                        <div className="card" style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Layers size={18} /> Breakout Rooms
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {['Discussion Group A', 'Project Brainstorm', 'Exam Prep'].map((room) => (
                                    <button
                                        key={room}
                                        className="btn btn-secondary"
                                        style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}
                                        onClick={() => {
                                            setRoomId(room.toLowerCase().replace(/ /g, '-'));
                                            wsRef.current?.close();
                                            setTimeout(joinRoom, 100);
                                        }}
                                    >
                                        {room}
                                        <ExternalLink size={14} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Chat */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)' }}>
                        <MessageSquare size={18} color="var(--text-secondary)" />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Room Chat</h3>
                        <div style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            🛡️ Auto-moderated
                        </div>
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
                                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, flexDirection: isMe ? 'row-reverse' : 'row' }}>
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
                                            {!isMe && (
                                                <button
                                                    onClick={() => setReportTarget({ username: msgUser, text: msg?.text || '', userId: msg?.userId })}
                                                    title="Report this message"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', opacity: 0.5, padding: '2px 4px', borderRadius: 4, flexShrink: 0 }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.5'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'; }}
                                                >
                                                    <Flag size={12} />
                                                </button>
                                            )}
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
                            placeholder="Message the room... (auto-moderated)"
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

// ─── Audio Call Panel (Jitsi with audio only) ───
function AudioCallPanel({ roomName, displayName, onClose }: { roomName: string; displayName: string; onClose: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => {
            if (!containerRef.current) return;
            apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
                roomName: `EduKno-Audio-${roomName}`,
                width: '100%',
                height: '100%',
                parentNode: containerRef.current,
                userInfo: { displayName },
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: true,
                    disableVideo: true,
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: ['microphone', 'hangup', 'chat', 'raisehand', 'tileview'],
                    HIDE_INVITE_MORE_HEADER: true,
                },
            });
            apiRef.current.addEventListeners({ readyToClose: onClose, videoConferenceLeft: onClose });
        };
        document.body.appendChild(script);
        return () => {
            if (apiRef.current) apiRef.current.dispose();
            document.body.removeChild(script);
        };
    }, []);

    return (
        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', minHeight: 300 }}>
            <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone size={18} color="#10b981" />
                <span style={{ fontWeight: 700 }}>Audio Call — {roomName}</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', marginLeft: 4 }} />
                <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
                    <PhoneOff size={14} style={{ marginRight: 4 }} /> End Call
                </button>
            </div>
            <div ref={containerRef} style={{ width: '100%', height: '250px', background: '#1a1a1a' }} />
        </div>
    );
}
