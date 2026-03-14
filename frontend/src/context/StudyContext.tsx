import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { studyAPI } from '../services/api';

interface StudyContextType {
    mode: 'focus' | 'break';
    timeLeft: number;
    isRunning: boolean;
    elapsed: number;
    toggleTimer: () => void;
    resetTimer: () => void;
    switchMode: (m: 'focus' | 'break') => void;
    formatTime: (s: number) => string;
    formatDuration: (s: number) => string;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<'focus' | 'break'>('focus');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<any>(null);

    const FOCUS_TIME = 25 * 60;
    const BREAK_TIME = 5 * 60;

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

    const handleSessionComplete = async () => {
        setIsRunning(false);
        const currentElapsed = elapsed;
        const currentMode = mode;
        
        if (currentElapsed > 10) {
            try {
                await studyAPI.createSession({
                    duration_seconds: currentElapsed,
                    session_type: currentMode,
                });
            } catch (err) {
                console.error("Failed to save study session:", err);
            }
        }
        
        // Auto-switch mode
        if (currentMode === 'focus') {
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
            studyAPI.createSession({ duration_seconds: elapsed, session_type: mode }).catch(e => console.error(e));
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

    return (
        <StudyContext.Provider value={{
            mode, timeLeft, isRunning, elapsed,
            toggleTimer, resetTimer, switchMode,
            formatTime, formatDuration
        }}>
            {children}
        </StudyContext.Provider>
    );
};

export const useStudy = () => {
    const context = useContext(StudyContext);
    if (!context) throw new Error('useStudy must be used within a StudyProvider');
    return context;
};
