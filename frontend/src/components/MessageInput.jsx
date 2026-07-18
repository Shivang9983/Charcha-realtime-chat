import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { Send, X, Image, Loader2 } from 'lucide-react';
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
      {replyingToMessage && (
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
            className="text-slate-450 hover:text-slate-650 dark:hover:text-neutral-350 p-1 rounded-full hover:bg-slate-150 dark:hover:bg-neutral-850 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <form onSubmit={handleSend} className="flex items-center gap-2.5 p-4">
        {/* Attachment image button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 cursor-pointer rounded-xl border border-slate-200 dark:border-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-850 p-3 text-slate-500 dark:text-slate-400 transition-all hover:scale-105 active:scale-95 shadow-xs shrink-0"
          title="Share an image"
        >
          <Image className="h-4.5 w-4.5" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
          className="hidden"
        />

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

      {/* Image Preview and Upload Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 select-none">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-neutral-900">
              <h3 className="text-sm font-bold text-slate-800 dark:text-neutral-200">Preview Image</h3>
              <button
                onClick={handleCancelPreview}
                disabled={isUploading}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-neutral-900 text-slate-400 dark:text-neutral-500 cursor-pointer transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative aspect-video max-h-[220px] w-full rounded-2xl overflow-hidden bg-slate-50 dark:bg-neutral-955 flex items-center justify-center border border-slate-100 dark:border-neutral-900">
              <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
            </div>

            <div className="text-left text-[11px] leading-relaxed space-y-0.5 text-slate-500 dark:text-neutral-450">
              <p className="truncate"><span className="font-bold">File Name:</span> {selectedFile?.name}</p>
              <p><span className="font-bold">File Size:</span> {(selectedFile?.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>

            {/* Caption Input */}
            <input
              type="text"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isUploading}
              className="w-full rounded-xl border border-slate-200 dark:border-neutral-850 bg-slate-50 dark:bg-neutral-950 px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
            />

            {/* Uploading Progress */}
            {isUploading && (
              <div className="w-full space-y-1.5 animate-pulse text-left">
                <div className="flex justify-between text-[10px] font-bold text-indigo-500">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={handleCancelPreview}
                disabled={isUploading}
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-900 text-slate-550 dark:text-neutral-400 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSendImage}
                disabled={isUploading}
                className="px-4 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending
                  </>
                ) : (
                  'Send Image'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
