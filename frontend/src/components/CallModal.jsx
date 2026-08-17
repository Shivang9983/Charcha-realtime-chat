import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, SwitchCamera, Maximize, Minimize, Loader2 } from 'lucide-react';
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
  const localStream = useCallStore((state) => state.localStream);
  const remoteStream = useCallStore((state) => state.remoteStream);
  const isMuted = useCallStore((state) => state.isMuted);
  const isVideoOff = useCallStore((state) => state.isVideoOff);
  const canSwitchCamera = useCallStore((state) => state.canSwitchCamera);
  const peerMediaState = useCallStore((state) => state.peerMediaState);
  const endReason = useCallStore((state) => state.endReason);
  const connectedAt = useCallStore((state) => state.connectedAt);
  const acceptCall = useCallStore((state) => state.acceptCall);
  const rejectCall = useCallStore((state) => state.rejectCall);
  const cancelCall = useCallStore((state) => state.cancelCall);
  const endCall = useCallStore((state) => state.endCall);
  const toggleMute = useCallStore((state) => state.toggleMute);
  const toggleVideo = useCallStore((state) => state.toggleVideo);
  const switchCamera = useCallStore((state) => state.switchCamera);

  const remoteAudioRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isVideoCall = activeCall?.callType === 'video';

  useEffect(() => {
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = isVideoCall ? null : remoteStream || null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = isVideoCall ? remoteStream || null : null;
    if (localVideoRef.current) localVideoRef.current.srcObject = isVideoCall ? localStream || null : null;
  }, [remoteStream, localStream, isVideoCall]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    // Leave fullscreen automatically once the call ends so it never lingers.
    if (callStatus === 'idle' && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [callStatus]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current?.requestFullscreen().catch(() => {});
    }
  };

  if (callStatus === 'idle') return null;

  const peer = activeCall?.peer;
  const peerName = peer?.username || 'Unknown';
  const peerAvatar = peer?.avatar || `https://api.dicebear.com/8.x/adventurer/svg?seed=${peerName}`;
  const isActive = callStatus === 'active' || callStatus === 'reconnecting';
  const isEnded = callStatus === 'ended';
  const showLocalPreview = isVideoCall && localStream && !isEnded;
  const showRemoteVideo = isVideoCall && remoteStream && isActive && peerMediaState.video;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={isVideoCall ? 'Video call' : 'Voice call'}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Remote video fills the call surface; falls back to nothing (avatar UI shows through) if unavailable or peer's camera is off */}
      {isVideoCall && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${showRemoteVideo ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        />
      )}

      {/* Local preview - small PiP, mirrored like a selfie camera */}
      {showLocalPreview && (
        <div className="absolute top-[calc(1.5rem+env(safe-area-inset-top))] right-6 h-36 w-24 sm:h-44 sm:w-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-neutral-900 z-10">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover scale-x-[-1] ${isVideoOff ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
              <VideoOff className="h-5 w-5 text-neutral-500" />
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-col items-center gap-6 px-6 text-center z-[5]">
        {/* Peer avatar - hidden once their video is actually showing */}
        {!showRemoteVideo && (
          <div className="relative">
            <img
              src={peerAvatar}
              alt={peerName}
              className={`h-28 w-28 rounded-3xl object-cover border-2 border-neutral-800 shadow-2xl ${
                callStatus === 'incoming' || callStatus === 'outgoing' ? 'animate-pulse-glow' : ''
              }`}
            />
            {isVideoCall && isActive && !peerMediaState.video && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 text-[10px] font-bold text-neutral-300 whitespace-nowrap">
                <VideoOff className="h-3 w-3" /> Camera off
              </span>
            )}
          </div>
        )}

        <div className={`space-y-1.5 ${showRemoteVideo ? 'absolute top-[calc(2rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2' : ''}`}>
          <h2 className={`text-xl font-bold tracking-wide ${showRemoteVideo ? 'text-white drop-shadow-lg' : 'text-white'}`}>{peerName}</h2>
          <p
            className={`text-sm font-semibold tracking-wide drop-shadow-lg ${
              isEnded ? 'text-rose-400' : isActive ? 'text-emerald-400' : 'text-neutral-300'
            }`}
          >
            {isEnded ? endReason : isActive ? <CallTimer connectedAt={connectedAt} /> : (isVideoCall ? `Video ${STATUS_LABEL[callStatus]?.toLowerCase()}` : STATUS_LABEL[callStatus])}
          </p>
        </div>

        {(callStatus === 'connecting' || callStatus === 'reconnecting') && (
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
        )}

        {!isEnded && (
          <div
            className={`flex items-center gap-4 mt-2 flex-wrap justify-center ${
              showRemoteVideo ? 'absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm rounded-2xl px-5 py-4' : ''
            }`}
          >
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
                    className={`flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full border transition-all cursor-pointer active:scale-95 ${
                      isMuted
                        ? 'bg-white text-neutral-900 border-white'
                        : 'bg-neutral-800/80 text-white border-neutral-700 hover:bg-neutral-750'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Mic className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </button>
                )}

                {isActive && isVideoCall && (
                  <button
                    onClick={toggleVideo}
                    className={`flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full border transition-all cursor-pointer active:scale-95 ${
                      isVideoOff
                        ? 'bg-white text-neutral-900 border-white'
                        : 'bg-neutral-800/80 text-white border-neutral-700 hover:bg-neutral-750'
                    }`}
                    title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                    aria-label={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5 sm:h-6 sm:w-6" /> : <Video className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </button>
                )}

                {isActive && isVideoCall && canSwitchCamera && (
                  <button
                    onClick={switchCamera}
                    className="flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full border bg-neutral-800/80 text-white border-neutral-700 hover:bg-neutral-750 transition-all cursor-pointer active:scale-95"
                    title="Switch camera"
                    aria-label="Switch camera"
                  >
                    <SwitchCamera className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                )}

                {isActive && isVideoCall && (
                  <button
                    onClick={toggleFullscreen}
                    className="hidden sm:flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full border bg-neutral-800/80 text-white border-neutral-700 hover:bg-neutral-750 transition-all cursor-pointer active:scale-95"
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? <Minimize className="h-5 w-5 sm:h-6 sm:w-6" /> : <Maximize className="h-5 w-5 sm:h-6 sm:w-6" />}
                  </button>
                )}

                <button
                  onClick={callStatus === 'outgoing' ? cancelCall : endCall}
                  className="flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-lg transition-all cursor-pointer"
                  title="End call"
                  aria-label="End call"
                >
                  <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
