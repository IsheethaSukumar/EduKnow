import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Pause } from 'lucide-react';
import { chatbotAPI } from '../services/api';

interface AudioRecorderProps {
    onTranscription: (text: string) => void;
    placeholder?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscription, placeholder }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await handleTranscription(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const handleTranscription = async (blob: Blob) => {
        setIsTranscribing(true);
        try {
            // Convert Blob to File for the API
            const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
            const response = await chatbotAPI.transcribe(file);

            if (response.data && response.data.text) {
                onTranscription(response.data.text);
            } else {
                throw new Error('No text returned from transcription');
            }
        } catch (err) {
            console.error('Transcription error:', err);
            alert('Failed to transcribe audio. Ensure GROQ_API_KEY is set in backend.');
        } finally {
            setIsTranscribing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="audio-recorder" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isRecording ? (
                <button
                    onClick={startRecording}
                    disabled={isTranscribing}
                    className="btn-voice"
                    title="Record voice"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        color: '#818cf8',
                        cursor: 'pointer'
                    }}
                >
                    {isTranscribing ? <Loader2 className="animate-spin" size={20} /> : <Mic size={20} />}
                </button>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239, 68, 68, 0.1)', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div className="record-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 500 }}>{formatTime(recordingTime)}</span>
                    <button
                        onClick={stopRecording}
                        style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                    >
                        <Square size={16} fill="currentColor" />
                    </button>
                </div>
            )}
            {isRecording && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Recording...</span>}
            {isTranscribing && <span style={{ fontSize: '0.75rem', color: '#6366f1' }}>Transcribing...</span>}
        </div>
    );
};
