import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface VideoMeetingProps {
    roomName: string;
    displayName: string;
    onClose: () => void;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

export const VideoMeeting: React.FC<VideoMeetingProps> = ({ roomName, displayName, onClose }) => {
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);
    const [audioMuted, setAudioMuted] = useState(true);
    const [videoMuted, setVideoMuted] = useState(true);
    const [apiReady, setApiReady] = useState(false);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = () => startMeeting();
        document.body.appendChild(script);

        return () => {
            if (apiRef.current) apiRef.current.dispose();
            document.body.removeChild(script);
        };
    }, []);

    const startMeeting = () => {
        if (!jitsiContainerRef.current) return;

        const domain = 'meet.jit.si';
        const options = {
            roomName: `EduKno-${roomName}`,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: displayName
            },
            interfaceConfigOverwrite: {
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat', 'recording',
                    'livestreaming', 'etherpad', 'sharedvideo', 'settings', 'raisehand',
                    'videoquality', 'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                    'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone',
                    'security'
                ],
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                SHOW_BRAND_WATERMARK: false,
                DEFAULT_REMOTE_DISPLAY_NAME: 'Student',
            },
            configOverwrite: {
                disableChallenge: true,
                startWithAudioMuted: true,
                startWithVideoMuted: true,
                prejoinPageEnabled: false,
            }
        };

        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current.addEventListeners({
            readyToClose: () => onClose(),
            videoConferenceLeft: () => onClose(),
            audioMuteStatusChanged: (muted: { muted: boolean }) => {
                setAudioMuted(muted.muted);
            },
            videoMuteStatusChanged: (muted: { muted: boolean }) => {
                setVideoMuted(muted.muted);
            },
            videoConferenceJoined: () => {
                setApiReady(true);
                setAudioMuted(true);
                setVideoMuted(true);
            },
        });
    };

    const toggleAudio = () => {
        if (apiRef.current && apiReady) {
            apiRef.current.executeCommand('toggleAudio');
        }
    };

    const toggleVideo = () => {
        if (apiRef.current && apiReady) {
            apiRef.current.executeCommand('toggleVideo');
        }
    };

    const hangUp = () => {
        if (apiRef.current && apiReady) {
            apiRef.current.executeCommand('hangup');
        }
        onClose();
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Controls overlay */}
            <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 100, display: 'flex', gap: 12, background: 'rgba(0,0,0,0.7)',
                padding: '10px 20px', borderRadius: 50, backdropFilter: 'blur(10px)',
            }}>
                <button
                    onClick={toggleAudio}
                    title={audioMuted ? 'Unmute' : 'Mute'}
                    style={{
                        width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: audioMuted ? '#ef4444' : 'rgba(255,255,255,0.2)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                >
                    {audioMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button
                    onClick={toggleVideo}
                    title={videoMuted ? 'Start Video' : 'Stop Video'}
                    style={{
                        width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: videoMuted ? '#ef4444' : 'rgba(255,255,255,0.2)',
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                >
                    {videoMuted ? <VideoOff size={18} /> : <Video size={18} />}
                </button>
                <button
                    onClick={hangUp}
                    title="Leave Call"
                    style={{
                        width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: '#ef4444', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                >
                    <PhoneOff size={18} />
                </button>
            </div>

            {/* Status badges */}
            {(audioMuted || videoMuted) && apiReady && (
                <div style={{
                    position: 'absolute', top: 12, left: 12,
                    zIndex: 100, display: 'flex', gap: 6,
                }}>
                    {audioMuted && (
                        <div style={{ background: 'rgba(239,68,68,0.85)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MicOff size={10} /> Muted
                        </div>
                    )}
                    {videoMuted && (
                        <div style={{ background: 'rgba(239,68,68,0.85)', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <VideoOff size={10} /> Cam Off
                        </div>
                    )}
                </div>
            )}

            <div
                ref={jitsiContainerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '500px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
            />
        </div>
    );
};
