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

export const getLocalAudioStream = () => {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
};

export const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};
