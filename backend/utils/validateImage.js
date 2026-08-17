// Allowed image MIME types - kept in sync with the client-side check in
// frontend/src/components/MessageInput.jsx.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// Generous ceiling for the decoded image payload. The client compresses images
// to a max 1600px dimension before sending, so real uploads land far below this;
// it exists purely to bound worst-case abuse, independent of what the client claims.
// Kept meaningfully under the express.json({ limit: '10mb' }) body cap in
// server.js so this validator - not a generic body-parser 413 - is what actually
// rejects an oversized payload, with a clean JSON error instead of an HTML page.
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const DATA_URI_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/;

/**
 * Validates a client-supplied image payload before it's handed to Cloudinary.
 * The client's own type/size checks (MessageInput.jsx) are only a UX nicety -
 * anyone can call the API directly, so the server must never trust them.
 *
 * Returns { valid: true } or { valid: false, error: string }.
 */
export const validateImagePayload = (image) => {
  if (typeof image !== 'string') {
    return { valid: false, error: 'Invalid image payload' };
  }

  const match = DATA_URI_PATTERN.exec(image);
  if (!match) {
    return { valid: false, error: 'Invalid image format' };
  }

  const [, mimeType, base64Data] = match;
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return { valid: false, error: 'Unsupported image format. Allowed: JPG, PNG, WEBP, GIF' };
  }

  // Base64 encodes 3 bytes as 4 characters; padding chars don't add real data.
  const paddingLength = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
  const approxByteSize = (base64Data.length * 3) / 4 - paddingLength;

  if (approxByteSize > MAX_IMAGE_BYTES) {
    return { valid: false, error: 'Image is too large' };
  }

  return { valid: true };
};
