import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { Send, X, Image, Loader2, Smile, Trash2, RefreshCw } from 'lucide-react';
import { compressImage } from '../lib/imageCompressor';

export default function MessageInput() {
  const [content, setContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const sendMessage = useChatStore((state) => state.sendMessage);
  const selectedConversation = useChatStore((state) => state.selectedConversation);
  const replyingToMessage = useChatStore((state) => state.replyingToMessage);
  const setReplyingToMessage = useChatStore((state) => state.setReplyingToMessage);
  const authUser = useAuthStore((state) => state.authUser);
  const socket = useAuthStore((state) => state.socket);
  const { addToast } = useToastStore();

  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Freeze/unfreeze body scroll when the composer is open
  useEffect(() => {
    if (previewUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (isTypingRef.current && socket && selectedConversation) {
        socket.emit('stopTyping', {
          conversationId: selectedConversation._id,
          userId: authUser._id,
        });
      }
      isTypingRef.current = false;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [selectedConversation, socket, authUser]);

  const handleInputChange = (e) => {
    setContent(e.target.value);

    if (!socket || !selectedConversation) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', {
        conversationId: selectedConversation._id,
        userId: authUser._id,
        username: authUser.username,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stopTyping', {
        conversationId: selectedConversation._id,
        userId: authUser._id,
      });
      isTypingRef.current = false;
    }, 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      addToast('Invalid file format. Please select an image (JPG, PNG, WEBP, or GIF).', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      addToast('File too large. Maximum allowed size is 5MB.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Clean up previous preview url if switching
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setCaption('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendImage = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Compress the image before uploading
      const compressed = await compressImage(selectedFile);
      
      const fileData = {
        image: compressed.base64,
        width: compressed.width,
        height: compressed.height,
      };

      const messageContent = caption.trim();
      const previewToRevoke = previewUrl;
      
      // Close preview immediately so user sees optimistic UI in chat feed
      setSelectedFile(null);
      setPreviewUrl('');
      setCaption('');
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Send message via store using our new parameters
      await sendMessage(messageContent, fileData, (progress) => {
        setUploadProgress(progress);
      });

      if (previewToRevoke) {
        URL.revokeObjectURL(previewToRevoke);
      }
    } catch (err) {
      addToast('Failed to send image. You can retry from the chat feed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    const messageContent = content;
    setContent('');

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current && socket && selectedConversation) {
      socket.emit('stopTyping', {
        conversationId: selectedConversation._id,
        userId: authUser._id,
      });
      isTypingRef.current = false;
    }

    await sendMessage(messageContent);
  };

  return (
    <div className="flex flex-col border-t border-slate-200/85 dark:border-neutral-900 bg-white/90 dark:bg-black/30 backdrop-blur-md animate-in fade-in duration-200">
      {replyingToMessage && !previewUrl && (
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-150/70 dark:border-neutral-900 bg-slate-50/50 dark:bg-neutral-955/20 text-xs animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex flex-col border-l-3 border-indigo-650 dark:border-indigo-500 pl-3 min-w-0">
            <span className="font-bold text-indigo-650 dark:text-indigo-400">
              Replying to {replyingToMessage.sender?.username || 'User'}
            </span>
            <span className="text-slate-500 dark:text-neutral-400 truncate max-w-[280px] sm:max-w-[480px]">
              {replyingToMessage.content || (replyingToMessage.image ? '📷 Photo' : '')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingToMessage(null)}
            className="text-slate-455 hover:text-slate-650 dark:hover:text-neutral-350 p-1 rounded-full hover:bg-slate-150 dark:hover:bg-neutral-855 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Hide regular text input when preview composer is open */}
      {!previewUrl && (
        <form onSubmit={handleSend} className="flex items-center gap-2.5 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 animate-in fade-in duration-150">
          {/* Attachment image button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 cursor-pointer rounded-xl border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-850 p-3 text-slate-500 dark:text-slate-400 transition-all hover:scale-105 active:scale-95 shadow-xs shrink-0"
            title="Share an image"
          >
            <Image className="h-4.5 w-4.5" />
          </button>
          
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Type a message..."
              value={content}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 px-4 py-3 pr-12 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 shadow-xs"
            />
          </div>
          <button
            type="submit"
            disabled={!content.trim()}
            className="flex-shrink-0 cursor-pointer rounded-xl bg-indigo-600 p-3 text-white transition-all duration-200 hover:scale-105 hover:bg-indigo-500 hover:shadow-md active:scale-95 disabled:opacity-40 shadow-sm shrink-0"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
        className="hidden"
      />

      {/* Fullscreen Image Composer Modal (WhatsApp Web Style) */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950/98 backdrop-blur-md animate-in fade-in duration-200 select-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b border-neutral-900/60 bg-neutral-950/40 text-neutral-200">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancelPreview}
                disabled={isUploading}
                className="p-1.5 rounded-full hover:bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer transition-colors disabled:opacity-50"
                title="Discard attachment"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="text-left">
                <p className="text-xs font-bold text-neutral-100 truncate max-w-[200px] sm:max-w-xs">{selectedFile?.name}</p>
                <p className="text-[10px] text-neutral-500 font-semibold mt-0.5">{(selectedFile?.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
          </div>

          {/* Centered Image Preview Area */}
          <div className="flex-1 flex items-center justify-center p-6 min-h-0 bg-neutral-950/20">
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[60vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-neutral-900/30"
              />
            </div>
          </div>

          {/* Bottom WhatsApp-Style Composer */}
          <div className="w-full border-t border-neutral-900/60 bg-neutral-950/80 px-6 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] flex flex-col gap-4">
            
            {/* Upload progress if sending */}
            {isUploading && (
              <div className="w-full space-y-1.5 animate-pulse text-left max-w-3xl mx-auto">
                <div className="flex justify-between text-[10px] font-bold text-indigo-500">
                  <span>Uploading image...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 max-w-3xl w-full mx-auto">
              
              {/* Remove attachment */}
              <button
                type="button"
                onClick={handleCancelPreview}
                disabled={isUploading}
                className="p-3 text-neutral-400 hover:text-rose-500 hover:bg-neutral-900/50 rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0"
                title="Remove image"
              >
                <Trash2 className="h-5 w-5" />
              </button>

              {/* Replace attachment */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-3 text-neutral-400 hover:text-white hover:bg-neutral-900/50 rounded-xl transition-all cursor-pointer disabled:opacity-40 shrink-0"
                title="Replace image"
              >
                <RefreshCw className="h-5 w-5" />
              </button>

              {/* Emoji UI button */}
              <button
                type="button"
                disabled={isUploading}
                className="p-3 text-neutral-400 hover:text-white hover:bg-neutral-900/50 rounded-xl transition-all cursor-default disabled:opacity-40 shrink-0"
                title="Emojis"
              >
                <Smile className="h-5 w-5" />
              </button>

              {/* Caption Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Add a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  disabled={isUploading}
                  className="w-full rounded-2xl border border-neutral-850 bg-neutral-900/90 py-3 px-5 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all shadow-inner"
                />
              </div>

              {/* Circular Send Button */}
              <button
                onClick={handleSendImage}
                disabled={isUploading}
                className="p-3.5 bg-indigo-600 hover:bg-indigo-550 active:scale-95 text-white rounded-full shadow-lg transition-all cursor-pointer disabled:opacity-40 shrink-0"
                title="Send"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5 translate-x-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
