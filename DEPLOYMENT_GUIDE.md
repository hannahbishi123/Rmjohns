# RMJohn's Eateries System - Deployment Guide

## Overview

This application uses a hybrid database architecture:
- **Local Database (XAMPP MySQL)**: Primary data storage (source of truth)
- **Firebase Realtime Database**: Live sync for real-time features and remote access
- **Firebase Hosting**: Frontend deployment at `https://rmjohns-eateries.web.app`

## Database Architecture

### Local Database (XAMPP)
- Database: `eateries_db`
- Host: `localhost:3306` (default XAMPP)
- User: `root` (default XAMPP)
- The local MySQL database is the **source of truth** for all data

### Firebase Database
- Project: `rmjohns-eateries`
- Database URL: `https://rmjohns-eateries-default-rtdb.firebaseio.com`
- Used for real-time sync and remote access
- Data syncs from MySQL → Firebase automatically when API runs

## Running Locally (Development)

### Prerequisites
1. **XAMPP** installed and MySQL running
2. **Node.js** installed (v18+ recommended)
3. Database imported: `database/eateries_db.sql`

### Steps

1. **Start XAMPP MySQL**
   - Open XAMPP Control Panel
   - Click START next to MySQL

2. **Start the Application**
   - Double-click `START.bat`
   - This will:
     - Start the backend API on port 3001
     - Start the Vite frontend on port 5173
     - Open your browser to `http://127.0.0.1:5173`

3. **Database Connection**
   - The API connects to local MySQL
   - Firebase syncs data in real-time (if enabled in `.env`)

### Configuration (.env)

Your `.env` file should have:
```env
# Local MySQL (XAMPP)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=eateries_db
API_PORT=3001

# CORS (for production)
CORS_ORIGINS=https://rmjohns-eateries.web.app

# Firebase (Backend - Admin SDK)
FIREBASE_DATABASE_URL=https://rmjohns-eateries-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT=./backend/firebase-service-account.json
FIREBASE_ENABLED=true

# Firebase (Frontend - Web SDK)
VITE_FIREBASE_API_KEY=your-actual-api-key
VITE_FIREBASE_AUTH_DOMAIN=rmjohns-eateries.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://rmjohns-eateries-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=rmjohns-eateries
VITE_FIREBASE_STORAGE_BUCKET=rmjohns-eateries.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id

# API Base URL (for production deployment)
VITE_API_BASE_URL=
```

## Deploying to Firebase Hosting

### Prerequisites
1. Firebase CLI installed (included in DEPLOY.bat)
2. Logged into Firebase (`firebase login`)
3. `.env` configured with correct Firebase values

### Deployment Methods

#### Method 1: Using DEPLOY.bat (Recommended)

1. Double-click `DEPLOY.bat`
2. The script will:
   - Check for Node.js and Firebase CLI
   - Install Firebase CLI if missing
   - Prompt you to log in to Firebase (if not logged in)
   - Install dependencies
   - Build the project
   - Deploy to Firebase Hosting
3. After deployment, your app will be live at `https://rmjohns-eateries.web.app`

#### Method 2: Manual Deployment

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Deploy:
   ```bash
   firebase deploy
   ```

Or use the npm script:
```bash
npm run deploy
```

## After Deployment

### Frontend (Firebase Hosting)
- URL: `https://rmjohns-eateries.web.app`
- Serves the static React build
- No backend included (backend runs separately)

### Backend Options

#### Option 1: Local Backend Only
- Keep running the backend locally with `START.bat`
- Frontend on Firebase Hosting connects to your local backend
- Requires:
  - Local MySQL running
  - Backend API running on port 3001
  - Port forwarding or local network access for remote users

#### Option 2: Deploy Backend to Cloud (Recommended for Production)
To make the app fully online, deploy the backend to a cloud service:

**Recommended Platforms:**
- **Railway** (easiest)
- **Render**
- **Vercel** (serverless)
- **Heroku**

**Steps for Railway:**
1. Create a Railway account
2. Create a new project
3. Deploy the backend as a Node.js service
4. Add a MySQL database (or use their managed MySQL)
5. Import `database/eateries_db.sql` to the cloud database
6. Update `.env` with cloud database credentials
7. Update `VITE_API_BASE_URL` in `.env` to your Railway backend URL
8. Redeploy frontend with `npm run deploy`

**Example Railway .env:**
```env
DB_HOST=your-railway-mysql-host.railway.app
DB_PORT=3306
DB_USER=railway
DB_PASSWORD=your-railway-password
DB_NAME=railway
```

## Database Sync Architecture

### How It Works

1. **Local Development:**
   - Frontend → API (localhost:3001) → MySQL (localhost:3306)
   - API → Firebase Realtime Database (sync)
   - Firebase → Real-time updates to connected clients

2. **Production (Cloud Backend):**
   - Frontend (Firebase Hosting) → API (Railway/Render) → MySQL (Cloud)
   - API → Firebase Realtime Database (sync)
   - Firebase → Real-time updates to connected clients

### Sync Flow

```
MySQL (Source of Truth)
    ↓
Backend API (reads/writes to MySQL)
    ↓
Firebase Realtime Database (syncs for real-time features)
    ↓
Connected Clients (real-time updates)
```

## Troubleshooting

### Local Development Issues

**"Database error" on screen:**
- Make sure XAMPP MySQL is running
- Check `.env` database credentials
- Verify database is imported via phpMyAdmin

**"npm is not recognized":**
- Run `SETUP.bat` to install Node.js
- Or install Node.js manually from https://nodejs.org

**Port 3001 already in use:**
- Close the backend terminal window
- Or kill the process: `taskkill /F /IM node.exe`

### Deployment Issues

**"Firebase login required":**
- Run `firebase login` and authenticate in browser
- Make sure you have access to the `rmjohns-eateries` project

**"Build failed":**
- Check for errors in the build output
- Ensure all dependencies are installed: `npm install`
- Check for syntax errors in your code

**"Deploy failed":**
- Verify you're logged in: `firebase login`
- Check Firebase project is accessible
- Ensure `.firebaserc` has correct project ID: `rmjohns-eateries`

### Firebase Configuration Issues

**"Firebase not connected":**
- Check `FIREBASE_ENABLED=true` in `.env`
- Verify `firebase-service-account.json` exists in `backend/`
- Check Firebase project is active
- Verify database URL is correct

**"CORS errors" in browser:**
- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Example: `CORS_ORIGINS=https://rmjohns-eateries.web.app,http://127.0.0.1:5173`

## Getting Firebase Configuration

To get your Firebase Web SDK configuration:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `rmjohns-eateries`
3. Click the gear icon → Project Settings
4. Scroll to "Your apps" section
5. If you don't have a web app, click `</>` to add one
6. Copy the configuration values to your `.env` file

Required values:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## Demo Accounts

All accounts use password: `demo1234`

| Role | Username | Email |
|------|----------|-------|
| Admin | admin | admin@rmjohns.com |
| Staff | staff | staff@rmjohns.com |
| Customer | maureen.santos@email.com | maureen.santos@email.com |

## File Reference

| File | Purpose |
|------|---------|
| `START.bat` | Start local development (frontend + backend) |
| `DEPLOY.bat` | Deploy frontend to Firebase Hosting |
| `SETUP.bat` | One-time setup (install Node.js, dependencies, import DB) |
| `.env` | Environment configuration (database, Firebase) |
| `.env.example` | Template for `.env` file |
| `firebase.json` | Firebase Hosting configuration |
| `.firebaserc` | Firebase project ID (`rmjohns-eateries`) |
| `backend/firebase-service-account.json` | Firebase Admin SDK credentials |
| `database/eateries_db.sql` | MySQL database schema and initial data |

## Summary

- **Local Dev**: Use `START.bat` → runs on `http://127.0.0.1:5173`
- **Deploy Frontend**: Use `DEPLOY.bat` → deploys to `https://rmjohns-eateries.web.app`
- **Local Database**: XAMPP MySQL (must be running for local dev)
- **Firebase Database**: Real-time sync (configured in `.env`)
- **Production Backend**: Deploy to Railway/Render for full online access
