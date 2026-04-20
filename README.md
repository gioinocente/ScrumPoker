# 🃏 Scrum Poker

A real-time, multiplayer Planning Poker app built with React and Firebase Realtime Database. Teams can join a shared room, vote on story points simultaneously, and reveal estimates together — no account required.

## ✨ Features

- **Real-time voting** — votes sync instantly across all participants via Firebase
- **Auto-generated rooms** — each session gets a unique URL you can share with your team
- **Spectator mode** — observers can watch the session without casting votes
- **Show / Reset votes** — the room creator (or when everyone has voted) can reveal all votes, then reset for the next story
- **Two card sets:**
  - **Fibonacci** (default): 1, 2, 3, 5, 8, 13, 21, ❓
  - **Sequential**: 1–10, ❓
- **Two layout views:** poker table view or compact list view
- **Presence detection** — users are automatically removed from the room when they disconnect
- **Persistent identity** — your name is stored in `localStorage` so you don't have to re-enter it on page reload

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite |
| Realtime DB | Firebase Realtime Database |
| Hosting | Firebase Hosting |
| Styling | CSS (vanilla) |

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm
- A Firebase project with **Realtime Database** enabled

### 1. Clone the repository

```bash
git clone https://github.com/gioinocente/ScrumPoker.git
cd ScrumPoker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your Firebase project credentials:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📦 Deployment

The project is configured for Firebase Hosting. To build and deploy:

```bash
npm run deploy
```

This runs `vite build` and then `firebase deploy`.

> Make sure you are logged in with the Firebase CLI (`firebase login`) and have selected the correct project (`firebase use <project-id>`).

## 🗂️ Project Structure

```
scrumpoker/
├── src/
│   ├── App.jsx          # Main application component (room logic, voting)
│   ├── firebase.js      # Firebase initialization (reads from .env)
│   ├── icons.jsx        # SVG icon components
│   ├── App.css          # Application styles
│   ├── index.css        # Global styles
│   └── main.jsx         # React entry point
├── public/              # Static assets
├── .env                 # Local environment variables (gitignored)
├── .env.example         # Environment variable template
├── database.rules.json  # Firebase Realtime Database security rules (gitignored)
├── firebase.json        # Firebase project configuration
└── vite.config.js       # Vite build configuration
```

## 🔒 Security Notes

- Firebase credentials are stored in `.env` and **never committed** to the repository
- `database.rules.json` is also gitignored to keep security rules private
- Use `.env.example` as a reference when setting up the project in a new environment

## 🎮 How to Use

1. Open the app — a unique room URL is generated automatically
2. Enter your name to join the room
3. Share the URL with your team
4. Each participant selects a card to cast their vote
5. Once everyone has voted (or the room creator decides), click **Show Votes** to reveal estimates
6. Click **Reset Votes** to start the next round
7. Toggle **Spectator** mode if you want to observe without voting
8. Switch between **Table View** and **List View** using the toolbar