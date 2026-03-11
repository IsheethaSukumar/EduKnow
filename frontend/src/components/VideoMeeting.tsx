import React, { useEffect, useRef } from 'react';

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

    useEffect(() => {
        // Load Jitsi Script
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
            },
            configOverwrite: {
                disableChallenge: true,
                startWithAudioMuted: true,
                startWithVideoMuted: true,
            }
        };

        apiRef.current = new window.JitsiMeetExternalAPI(domain, options);
        apiRef.current.addEventListeners({
            readyToClose: () => onClose(),
            videoConferenceLeft: () => onClose()
        });
    };

    return (
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
    );
};
