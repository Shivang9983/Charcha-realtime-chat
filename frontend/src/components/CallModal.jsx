import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from 'lucide-react';
import { useCallStore } from '../stores/useCallStore';

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

function CallTimer({ connectedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!connectedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - connectedAt) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [connectedAt]);

  return <span className="tabular-nums">{formatDuration(elapsed)}</span>;
}

const STATUS_LABEL = {
  outgoing: 'Calling...',
  incoming: 'Incoming call',
  connecting: 'Connecting...',
  reconnecting: 'Reconnecting...',
};

export default function CallModal() {
  const callStatus = useCallStore((state) => state.callStatus);
  const activeCall = useCallStore((state) => state.activeCall);
  const remoteStream = useCallStore((state) => state.remoteStream);
  const isMuted = useCallStore((state) => state.isMuted);
  const endReason = useCallStore((state) => state.endReason);
  const connectedAt = useCallStore((state) => state.connectedAt);
  const acceptCall = useCallStore((state) => state.acceptCall);
  const rejectCall = useCallStore((state) => state.rejectCall);
  const cancelCall = useCallStore((state) => state.cancelCall);
  const endCall = useCallStore((state) => state.endCall);
  const toggleMute = useCallStore((state) => state.toggleMute);

  const remoteAudioRef = useRef(null);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  if (callStatus === 'idle') return null;

  const peer = activeCall?.peer;
  const peerName = peer?.username || 'Unknown';
  const peerAvatar = peer?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${peerName}`;
  const isActive = callStatus === 'active' || callStatus === 'reconnecting';
  const isEnded = callStatus === 'ended';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Voice call"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative">
          <img
            src={peerAvatar}
            alt={peerName}
            className={`h-28 w-28 rounded-3xl object-cover border-2 border-neutral-800 shadow-2xl ${
              callStatus === 'incoming' || callStatus === 'outgoing' ? 'animate-pulse-glow' : ''
            }`}
          />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-white tracking-wide">{peerName}</h2>
          <p
            className={`text-sm font-semibold tracking-wide ${
              isEnded ? 'text-rose-400' : isActive ? 'text-emerald-400' : 'text-neutral-400'
            }`}
          >
            {isEnded ? endReason : isActive ? <CallTimer connectedAt={connectedAt} /> : STATUS_LABEL[callStatus]}
          </p>
        </div>

        {(callStatus === 'connecting' || callStatus === 'reconnecting') && (
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        )}

        {!isEnded && (
          <div className="flex items-center gap-5 mt-2">
            {callStatus === 'incoming' ? (
              <>
                <button
                  onClick={rejectCall}
                  className="flex items-center justify-center h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-lg transition-all cursor-pointer"
                  title="Decline"
                  aria-label="Decline call"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
                <button
                  onClick={acceptCall}
                  className="flex items-center justify-center h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-lg transition-all cursor-pointer"
                  title="Accept"
                  aria-label="Accept call"
                >
                  <Phone className="h-6 w-6" />
                </button>
              </>
            ) : (
              <>
                {isActive && (
                  <button
                    onClick={toggleMute}
                    className={`flex items-center justify-center h-14 w-14 rounded-full border transition-all cursor-pointer active:scale-95 ${
                      isMuted
                        ? 'bg-white text-neutral-900 border-white'
                        : 'bg-neutral-800/80 text-white border-neutral-700 hover:bg-neutral-750'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </button>
                )}
                <button
                  onClick={callStatus === 'outgoing' ? cancelCall : endCall}
                  className="flex items-center justify-center h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-lg transition-all cursor-pointer"
                  title="End call"
                  aria-label="End call"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
