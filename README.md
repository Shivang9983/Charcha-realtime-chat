# Real-time Chat Website

A simple MERN chat app with authentication, one-to-one chat, group chat, typing indicators, and read receipts.

## Stack

- React + Vite
- Tailwind CSS
- Zustand
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO

## Run locally

1. Install dependencies from the project root: `npm install`
2. Install app dependencies:
   `cd backend && npm install`
   `cd ../frontend && npm install`
3. Create `backend/.env` using `backend/.env.example`
4. Start both apps from the root: `npm run dev`

Frontend runs on `http://localhost:5173` and backend runs on `http://localhost:5001`.

## Environment variables

Use these values in `backend/.env`:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `NODE_ENV`
- `CLIENT_URL`

## Scripts

- Root: `npm run dev`
- Backend: `npm run dev`
- Frontend: `npm run dev`
- Frontend build: `npm run build`
- Frontend lint: `npm run lint`
