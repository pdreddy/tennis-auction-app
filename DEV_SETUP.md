# Local Dev Setup

## Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB running locally (`mongod`) — or use MongoDB Atlas free tier and update `MONGO_URL` in `backend/.env`

## 1. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

Backend runs at http://localhost:8000

## 2. Start the frontend

```bash
cd frontend
npm install
npx expo start
```

- Press `i` to open iOS Simulator (requires Xcode on Mac)
- Press `a` to open Android emulator
- Scan QR code with **Expo Go** app on your phone (same WiFi)
- Press `w` to open in browser

## Environment files

- `backend/.env` — MongoDB URL, DB name, JWT secret
- `frontend/.env` — Backend URL (`EXPO_PUBLIC_BACKEND_URL`)

## Test account (auto-seeded on first start)
- Email: `test@auction.com`
- Password: `Test1234`
