<div align="center">

# 💬 Charcha – Real-Time Chat Application

</div>

<div align="center">

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-black?logo=socketdotio)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-Styling-38BDF8?logo=tailwindcss)

### 🚀 A modern full-stack real-time chat application built with the MERN Stack.

</div>

---

## 📌 Overview

**Charcha** is a full-stack real-time chat application that enables users to communicate instantly using Socket.IO.

The application supports secure authentication, one-to-one messaging, group conversations, typing indicators, read receipts, emoji reactions, online user tracking, and a responsive modern UI.

The project was built to explore real-time communication, state management, and scalable MERN architecture.

---

## ✨ Features

- 🔐 Secure JWT Authentication
- 👤 User Registration & Login
- 💬 One-to-One Chat
- 👥 Group Chat Support
- ⚡ Real-Time Messaging with Socket.IO
- ✍️ Live Typing Indicator
- ✅ Read Receipts
- 😀 Emoji Reactions
- 📋 Copy Message
- 🔗 Automatic Link Detection
- 🟢 Online Users Status
- 📅 Date Separators
- 📌 Smart Message Grouping
- 🔄 Auto Scroll
- 🌙 Light & Dark Theme
- 🖼️ User Profile & Avatar
- 📱 Fully Responsive Design

---

# 🛠 Tech Stack

## Frontend

- React.js
- Zustand
- Tailwind CSS
- Axios
- Socket.IO Client
- Lucide React

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT Authentication
- bcrypt

---

# 📂 Project Structure

```text
Charcha/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── socket.js
│   └── server.js
│
└── frontend/
    ├── components/
    ├── pages/
    ├── stores/
    ├── lib/
    └── App.jsx
```

---

# ⚙️ How It Works

### Authentication

- User signs up or logs in.
- Passwords are securely hashed using bcrypt.
- JWT token is generated and stored in HTTP-only cookies.
- Protected routes verify authentication before granting access.

### Messaging

1. User sends a message.
2. Backend stores the message in MongoDB.
3. Conversation is updated with the latest message.
4. Socket.IO instantly broadcasts the message.
5. Both users receive updates without refreshing the page.

---

# 🗄 Database Collections

### Users

Stores:

- Username
- Email
- Password
- Avatar

### Conversations

Stores:

- Participants
- Group Information
- Latest Message
- Updated Time

### Messages

Stores:

- Sender
- Conversation ID
- Message Content
- Read Status
- Created Time

---

# 📦 State Management

The application uses **Zustand** for global state management.

### useAuthStore

Manages:

- Authentication
- Logged-in User
- Socket Connection
- Online Users

### useChatStore

Manages:

- Conversations
- Messages
- Selected Chat
- Typing Status
- Read Receipts
- Real-Time Socket Events

---

# 🔄 Real-Time Features

- Instant Message Delivery
- Socket Rooms
- Typing Indicator
- Read Receipts
- Online User Tracking
- Live Conversation Updates

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/Shivang9983/Charcha-realtime-chat.git
```

```bash
cd Charcha-realtime-chat
```

## Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

---

# 🔑 Environment Variables

### Backend (.env)

```env
PORT=5001

MONGO_URI=your_mongodb_connection

JWT_SECRET=your_secret_key

CLIENT_URL=http://localhost:5173

NODE_ENV=development
```

---

# ▶️ Run Project

Backend

```bash
npm run dev
```

Frontend

```bash
npm run dev
```

---

# 🚀 Future Improvements

- 📞 Audio Calling
- 🎥 Video Calling
- 📎 File Sharing
- 🔍 Message Search
- 🗑 Delete for Everyone
- 🔒 End-to-End Encryption
- 🔔 Push Notifications

---

# 👨‍💻 Developer

**Shivang Kumar**

Full Stack Developer

GitHub: https://github.com/Shivang9983

---

# ⭐ Support

If you found this project useful, don't forget to **⭐ Star this repository**.
