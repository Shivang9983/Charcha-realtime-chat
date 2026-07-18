import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';

import { connectDB } from './config/db.js';
import { app, server } from './socket.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import messageRoutes from './routes/message.routes.js';

dotenv.config();

const PORT = process.env.PORT || 5001;
const __dirname = path.resolve();

// Middleware configuration
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

app.use(
  cors({
    origin: isProduction
      ? 'https://charcha-ivory.vercel.app'
      : 'http://localhost:5173',
    credentials: true,
  })
);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

app.get('/', (req, res) => {
  res.send('Charcha Backend API is running successfully!');
});

// Listen to port and establish database connection
server.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
