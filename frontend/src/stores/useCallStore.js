import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { useToastStore } from './useToastStore';
import { createPeerConnection, getLocalMediaStream, hasMultipleCameras, stopStream } from '../lib/webrtc';

// Call lifecycle: idle -> outgoing|incoming -> connecting -> active -> idle
// ('ended'/'failed' are transient - the UI shows a message then auto-resets).
//
// MEDIA_RESET_STATE clears everything media/connection-related without
// touching `activeCall` - used when transitioning to the transient 'ended'
// screen, which still needs to show who the call was with. `activeCall` is
// only nulled out on the final reset back to true 'idle' (see IDLE_STATE).
const MEDIA_RESET_STATE = {
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  canSwitchCamera: false,
  peerMediaState: { audio: true, video: true }, // what the OTHER party has reported for their own mute/camera state
  connectedAt: null, // timestamp once the peer connection reaches 'connected', for the call timer
};

const IDLE_STATE = {
  ...MEDIA_RESET_STATE,
  callStatus: 'idle',
  activeCall: null, // { callId, conversationId, peer: { _id, username, avatar }, isCaller, callType: 'voice'|'video' }
  endReason: null, // shown briefly on the 'ended'/'failed' screen
};

// Non-serializable WebRTC objects and signaling-race buffers live outside
// React/Zustand state - they're plumbing, not UI state, and don't need to
// trigger re-renders on every mutation.
let peerConnection = null;
let pendingOffer = null;
let pendingIceCandidates = [];
let autoResetTimer = null;
let currentFacingMode = 'user';

const cleanupCallResources = () => {
  if (peerConnection) {
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.onconnectionstatechange = null;
    peerConnection.close();
    peerConnection = null;
  }
  pendingOffer = null;
  pendingIceCandidates = [];
  currentFacingMode = 'user';
  if (autoResetTimer) {
    clearTimeout(autoResetTimer);
    autoResetTimer = null;
  }
};

export const useCallStore = create((set, get) => ({
  ...IDLE_STATE,

  _endCall: (reason, { notifyServer = false } = {}) => {
    const { activeCall, localStream } = get();
    const socket = useAuthStore.getState().socket;

    if (notifyServer && activeCall && socket) {
      socket.emit('call:end', { callId: activeCall.callId });
    }

    stopStream(localStream);
    cleanupCallResources();

    // Keep activeCall (peer name/avatar) so the "ended" screen can still say
    // who the call was with - only the media/connection state resets here.
    set({ ...MEDIA_RESET_STATE, callStatus: 'ended', endReason: reason });

    autoResetTimer = setTimeout(() => {
      set({ ...IDLE_STATE });
    }, 2500);
  },

  startCall: async (conversationId, peer, callType = 'voice') => {
    const socket = useAuthStore.getState().socket;
    if (!socket || get().callStatus !== 'idle') return;

    set({
      callStatus: 'outgoing',
      activeCall: { callId: null, conversationId, peer, isCaller: true, callType },
    });

    let localStream;
    try {
      localStream = await getLocalMediaStream(callType);
    } catch (error) {
      console.error('Media access failed:', error.message);
      const deniedMessage = callType === 'video' ? 'Camera/microphone permission denied' : 'Microphone permission denied';
      set({ ...MEDIA_RESET_STATE, callStatus: 'ended', endReason: deniedMessage });
      autoResetTimer = setTimeout(() => set({ ...IDLE_STATE }), 3000);
      return;
    }

    set({ localStream });
    if (callType === 'video') {
      hasMultipleCameras().then((canSwitch) => set({ canSwitchCamera: canSwitch }));
    }

    socket.emit('call:invite', { conversationId, calleeId: peer._id, callType }, (response) => {
      if (get().callStatus !== 'outgoing') return; // call was cancelled/ended while waiting

      if (response?.error) {
        stopStream(localStream);
        const messages = {
          offline: `${peer.username} is offline`,
          busy: `${peer.username} is busy`,
          not_found: 'Conversation not found',
        };
        const message = messages[response.error] || response.message || 'Could not start call';
        useToastStore.getState().addToast(message, 'error');
        set({ ...IDLE_STATE });
        return;
      }

      set((state) => ({
        activeCall: { ...state.activeCall, callId: response.callId },
      }));
    });
  },

  // Callee accepted, server confirmed and told the caller - now create the
  // peer connection and send the SDP offer.
  _handleCallAccepted: async ({ callId }) => {
    const { activeCall, localStream } = get();
    if (!activeCall || activeCall.callId !== callId || !localStream) return;

    const socket = useAuthStore.getState().socket;

    peerConnection = createPeerConnection({
      onIceCandidate: (candidate) => socket.emit('call:ice-candidate', { callId, candidate }),
      onTrack: (stream) => set({ remoteStream: stream }),
      onConnectionStateChange: (state) => get()._handleConnectionStateChange(state),
    });

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    set({ callStatus: 'connecting' });

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('call:sdp', { callId, description: offer });
    } catch (error) {
      console.error('Error creating call offer:', error.message);
      get()._endCall('Call failed', { notifyServer: true });
    }
  },

  _handleCallRejected: ({ callId }) => {
    if (get().activeCall?.callId !== callId) return;
    get()._endCall('Call declined');
  },

  // An incoming call notification arrived. Media permission is requested only
  // once the user actually accepts, not before.
  _handleIncomingCall: ({ callId, conversationId, callType, caller }) => {
    if (get().callStatus !== 'idle') {
      // Already on a call/ringing elsewhere - let the caller's request time out
      // rather than silently dropping it with no explanation.
      return;
    }
    set({
      callStatus: 'incoming',
      activeCall: { callId, conversationId, peer: caller, isCaller: false, callType: callType || 'voice' },
    });
  },

  acceptCall: async () => {
    const { activeCall } = get();
    if (!activeCall || get().callStatus !== 'incoming') return;
    const socket = useAuthStore.getState().socket;
    const callType = activeCall.callType || 'voice';

    let localStream;
    try {
      localStream = await getLocalMediaStream(callType);
    } catch (error) {
      console.error('Media access failed:', error.message);
      const deniedMessage = callType === 'video' ? 'Camera/microphone permission denied' : 'Microphone permission denied';
      socket.emit('call:respond', { callId: activeCall.callId, accept: false });
      set({ ...MEDIA_RESET_STATE, callStatus: 'ended', endReason: deniedMessage });
      autoResetTimer = setTimeout(() => set({ ...IDLE_STATE }), 3000);
      return;
    }

    set({ localStream, callStatus: 'connecting' });
    if (callType === 'video') {
      hasMultipleCameras().then((canSwitch) => set({ canSwitchCamera: canSwitch }));
    }

    peerConnection = createPeerConnection({
      onIceCandidate: (candidate) => socket.emit('call:ice-candidate', { callId: activeCall.callId, candidate }),
      onTrack: (stream) => set({ remoteStream: stream }),
      onConnectionStateChange: (state) => get()._handleConnectionStateChange(state),
    });

    localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

    socket.emit('call:respond', { callId: activeCall.callId, accept: true }, async (response) => {
      if (response?.error) {
        get()._endCall('Call no longer available');
        return;
      }

      // The offer may have already arrived and been queued while we were
      // waiting on getUserMedia/ack - process it now that the peer connection exists.
      if (pendingOffer) {
        await get()._applyOffer(pendingOffer);
        pendingOffer = null;
      }
    });
  },

  rejectCall: () => {
    const { activeCall } = get();
    if (!activeCall) return;
    const socket = useAuthStore.getState().socket;
    socket?.emit('call:respond', { callId: activeCall.callId, accept: false });
    set({ ...IDLE_STATE });
  },

  cancelCall: () => {
    // Caller hangs up before the callee responds.
    get()._endCall(null, { notifyServer: true });
  },

  endCall: () => {
    get()._endCall(null, { notifyServer: true });
  },

  _emitMediaState: () => {
    const { activeCall, isMuted, isVideoOff } = get();
    const socket = useAuthStore.getState().socket;
    if (!activeCall?.callId || !socket) return;
    socket.emit('call:media-state', { callId: activeCall.callId, audio: !isMuted, video: !isVideoOff });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = isMuted; // currently muted -> enable; currently unmuted -> disable
    });
    set({ isMuted: !isMuted });
    get()._emitMediaState();
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = isVideoOff; // currently off -> enable; currently on -> disable
    });
    set({ isVideoOff: !isVideoOff });
    get()._emitMediaState();
  },

  // Flips between front and back camera mid-call by requesting a fresh video
  // track and swapping it into both the outgoing peer connection sender and
  // the local preview stream - no renegotiation needed.
  switchCamera: async () => {
    const { localStream, activeCall } = get();
    if (!localStream || !peerConnection || activeCall?.callType !== 'video') return;

    const nextFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    let newStream;
    try {
      newStream = await getLocalMediaStream('video', nextFacingMode);
    } catch (error) {
      console.error('Failed to switch camera:', error.message);
      useToastStore.getState().addToast('Could not switch camera', 'error');
      return;
    }

    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return;

    const sender = peerConnection.getSenders().find((s) => s.track && s.track.kind === 'video');
    if (sender) await sender.replaceTrack(newVideoTrack);

    const oldVideoTrack = localStream.getVideoTracks()[0];
    if (oldVideoTrack) {
      localStream.removeTrack(oldVideoTrack);
      oldVideoTrack.stop();
    }
    newVideoTrack.enabled = !get().isVideoOff;
    localStream.addTrack(newVideoTrack);

    // Stop the rest of the throwaway stream (its own audio track) - only the
    // video track from it is actually used, cloned into the existing stream.
    newStream.getAudioTracks().forEach((t) => t.stop());

    currentFacingMode = nextFacingMode;
    // localStream's identity is unchanged (same object, tracks swapped in
    // place), so the <video> element bound to it keeps working without a
    // re-render - this set() just keeps any state consumers in sync.
    set({ localStream });
  },

  _handlePeerMediaState: ({ callId, audio, video }) => {
    if (get().activeCall?.callId !== callId) return;
    set({ peerMediaState: { audio, video } });
  },

  _applyOffer: async ({ callId, description }) => {
    if (!peerConnection) {
      pendingOffer = { callId, description };
      return;
    }
    const socket = useAuthStore.getState().socket;

    await peerConnection.setRemoteDescription(new RTCSessionDescription(description));

    for (const candidate of pendingIceCandidates) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingIceCandidates = [];

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('call:sdp', { callId, description: answer });
  },

  _handleSdp: async ({ callId, description }) => {
    const { activeCall } = get();
    if (!activeCall || activeCall.callId !== callId) return;

    try {
      if (description.type === 'offer') {
        await get()._applyOffer({ callId, description });
      } else if (description.type === 'answer') {
        if (!peerConnection) return;
        await peerConnection.setRemoteDescription(new RTCSessionDescription(description));
        for (const candidate of pendingIceCandidates) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingIceCandidates = [];
      }
    } catch (error) {
      console.error('Error handling SDP:', error.message);
      get()._endCall('Call failed', { notifyServer: true });
    }
  },

  _handleIceCandidate: async ({ candidate }) => {
    if (!peerConnection || !peerConnection.remoteDescription) {
      pendingIceCandidates.push(candidate);
      return;
    }
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error.message);
    }
  },

  _handleConnectionStateChange: (connectionState) => {
    const currentStatus = get().callStatus;
    if (connectionState === 'connected' && (currentStatus === 'connecting' || currentStatus === 'reconnecting')) {
      set((state) => ({ callStatus: 'active', connectedAt: state.connectedAt || Date.now() }));
    } else if (connectionState === 'failed') {
      get()._endCall('Connection failed', { notifyServer: true });
    } else if (connectionState === 'disconnected' && currentStatus === 'active') {
      // Give ICE a chance to recover before treating it as a hard failure.
      set({ callStatus: 'reconnecting' });
    }
  },

  _handleCallEnded: ({ callId, reason }) => {
    if (get().activeCall?.callId !== callId) return;
    const reasonMessages = {
      timeout: 'No answer',
      hangup: 'Call ended',
      'peer-disconnected': 'Call ended',
    };
    get()._endCall(reasonMessages[reason] || 'Call ended');
  },

  subscribeToCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    get().unsubscribeFromCallEvents();

    socket.on('call:incoming', get()._handleIncomingCall);
    socket.on('call:accepted', get()._handleCallAccepted);
    socket.on('call:rejected', get()._handleCallRejected);
    socket.on('call:sdp', get()._handleSdp);
    socket.on('call:ice-candidate', get()._handleIceCandidate);
    socket.on('call:media-state', get()._handlePeerMediaState);
    socket.on('call:ended', get()._handleCallEnded);
  },

  unsubscribeFromCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off('call:incoming');
    socket.off('call:accepted');
    socket.off('call:rejected');
    socket.off('call:sdp');
    socket.off('call:ice-candidate');
    socket.off('call:media-state');
    socket.off('call:ended');
  },
}));
