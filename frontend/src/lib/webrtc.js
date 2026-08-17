// STUN-only for now (portfolio/small-user scale). A TURN server can be added
// later purely by extending this array - no signaling or call-state changes
// needed, since ICE server config is the only thing RTCPeerConnection reads it from.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Thin wrapper around RTCPeerConnection. Kept independent of call state/UI so
 * it's easy to test and swap ICE config without touching signaling logic.
 */
export const createPeerConnection = ({ onIceCandidate, onTrack, onConnectionStateChange }) => {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  pc.onicecandidate = (event) => {
    if (event.candidate) onIceCandidate(event.candidate);
  };

  pc.ontrack = (event) => {
    onTrack(event.streams[0]);
  };

  pc.onconnectionstatechange = () => {
    onConnectionStateChange(pc.connectionState);
  };

  return pc;
};

/**
 * Requests local media for a call. Video calls ask for a specific facingMode
 * (front/'user' by default) so switchCamera-style flows have a starting point
 * to flip from; voice calls never touch the camera at all.
 */
export const getLocalMediaStream = (callType, facingMode = 'user') => {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === 'video' ? { facingMode } : false,
  });
};

export const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

/**
 * Whether the current device exposes more than one camera - used to decide
 * whether a "switch camera" control makes sense to show at all (most desktops
 * have zero or one, most phones have at least two).
 */
export const hasMultipleCameras = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length > 1;
  } catch {
    return false;
  }
};
