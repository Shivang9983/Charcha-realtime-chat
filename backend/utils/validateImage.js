
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const DATA_URI_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/;
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
  const paddingLength = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
  const approxByteSize = (base64Data.length * 3) / 4 - paddingLength;

  if (approxByteSize > MAX_IMAGE_BYTES) {
    return { valid: false, error: 'Image is too large' };
  }

  return { valid: true };
};
