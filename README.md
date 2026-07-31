<div align="center">

# 💬 Charcha

### Modern Real-Time Chat Application

A full-stack real-time messaging application built with the **MERN Stack**, **Socket.IO**, and **Zustand**, focused on performance, scalability, and a premium user experience.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socketdotio)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?logo=tailwindcss)

</div>

---

# 📖 Overview

**Charcha** is a modern real-time chat application inspired by popular messaging platforms. It enables users to communicate instantly with a fast, responsive, and production-inspired interface. The project emphasizes scalable architecture, efficient state management, and seamless real-time communication using Socket.IO.

---

# ✨ Features

### 🔐 Authentication
- Secure JWT Authentication
- User Registration & Login
- Protected Routes
- HTTP-only Cookie Authentication

### 💬 Messaging
- One-to-One Chat
- Group Conversations
- Real-Time Messaging
- Optimistic UI Updates
- Read Receipts
- Typing Indicators
- Smart Message Grouping
- Automatic Scroll to Latest Messages

### 👥 User Experience
- Online / Offline Status
- Responsive Mobile & Desktop UI
- Premium Loading Screen
- Modern Sidebar Navigation
- Conversation Search

### 🖼️ Media
- Image Sharing
- Cloudinary Integration

---

# 🎥 Demo

> 📹 **Project Demo Video**

https://github.com/user-attachments/assets/your-demo-video-link

*(Replace this with your GitHub video link after uploading your demo.)*

---

# 🛠 Tech Stack

## Frontend

- React 19
- Zustand
- Tailwind CSS
- Axios
- Socket.IO Client
- React Router DOM
- Lucide React

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT Authentication
- bcrypt
- Cloudinary

---

# 📂 Project Structure

```text
Charcha
│
├── backend
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── models
│   ├── routes
│   ├── utils
│   ├── socket
│   └── server.js
│
└── frontend
    ├── components
    ├── pages
    ├── store
    ├── hooks
    ├── lib
    ├── assets
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

MONGO_URI=your_mongodb_uri

JWT_SECRET=your_secret

CLIENT_URL=http://localhost:5173

NODE_ENV=development

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=
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

Linkdin:https://www.linkedin.com/in/shivang-kumar-snow/

---

# ⭐ Support

If you found this project useful, don't forget to **⭐ Star this repository**.
