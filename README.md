# RMJohn's Eateries System

React/Vite frontend with a local Express API and MySQL persistence, with Firebase real-time sync and hosting.

## Quick Start

### Local Development
1. Double-click `START.bat` (after running `SETUP.bat` once)
2. Opens at `http://127.0.0.1:5173`
3. Requires XAMPP MySQL running

### Deploy to Firebase Hosting
1. Double-click `DEPLOY.bat`
2. Deploys to `https://rmjohns-eateries.web.app`

## Database Architecture

This system uses a hybrid database approach:

- **Local MySQL (XAMPP)**: Primary data storage (source of truth)
- **Firebase Realtime Database**: Real-time sync for live updates
- **Firebase Hosting**: Frontend deployment

## XAMPP setup

1. XAMPP is installed at `C:\xampp4` on the verified development machine. If setting up another machine, install XAMPP first.
2. Open the XAMPP Control Panel and start **MySQL**. Start **Apache** as well if you want to use phpMyAdmin from XAMPP.
3. Open `http://localhost/phpmyadmin`, choose **Import**, select `database/eateries_db.sql`, and run the import. The script creates the `eateries_db` database and its tables without dropping existing databases or records.
4. Copy `.env.example` to `.env`. Its defaults match XAMPP's usual local MySQL setup: `localhost:3306`, user `root`, and an empty password. Change `DB_PASSWORD` if your MySQL root account has a password.
5. From the project directory, run `npm install` if dependencies have not been installed, then `npm run dev`.
6. Open the Vite URL printed in the terminal (normally `http://127.0.0.1:5173`). The API checks MySQL before starting; the frontend displays a database error rather than using unsaved mock data if the connection fails.

The API also serves a production build on `API_PORT` (default `3001`) after `npm run build` and `npm start`. For development, `npm run dev` starts the API and Vite together and proxies `/api` requests to the API.

## Database

- Database: `eateries_db`
- SQL import file: `database/eateries_db.sql`
- Backend code: `backend/` (`index.js` starts the API, `database.js` configures the MySQL pool, `config.js` reads `.env`).
- Centralized connection settings: `.env` (template: `.env.example`).
- The first API startup inserts the existing demo catalog and example records only into empty tables. Importing `database/eateries_db.sql` by itself does not delete or seed records.
- Demo sign-in accounts are created on first startup when `user_accounts` is empty. Each uses its matching role email/username and password `demo1234`. Customer sign-up stores a bcrypt password hash.

Tables created by the SQL file:

`menu_items`, `customers`, `staff`, `user_accounts`, `orders`, `order_items`, `payments`, `rewards`, `promotions`, `loyalty_transactions`, `notifications`, `attendance_events`, `app_profiles`, and `app_state`.

Menu/catalog, customer, staff, order, payment, rewards, promotion, loyalty, notification, attendance, profile, reservation, and preference state is loaded from and saved to MySQL. Orders and payments are persisted together with their relational records, and database writes use prepared statements and transactions.

## Scripts

- `npm run dev` — start the local API and Vite development server.
- `npm run build` — create the frontend production build.
- `npm start` — start the API and (if present) serve the production build.
- `npm run lint` — run ESLint.
