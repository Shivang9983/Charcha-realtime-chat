import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    groupName: {
      type: String,
      default: '',
    },
    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    latestMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  { timestamps: true }
);

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
