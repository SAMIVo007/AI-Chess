# ♟️ AI Chess

A premium, feature-rich chess application built with **React Native (Expo)**, featuring real-time online multiplayer, powerful offline AI analysis, and a stunning modern UI.

<div align="center">
  <img src="./assets/images/app-logo.png" alt="AI Chess Banner" width="100%" style="border-radius: 10px" />
</div>

## ✨ Features

### 🎮 Gameplay Modes

- **Offline vs AI**: Challenge the Stockfish engine with adjustable difficulty levels (800 - 2600 ELO).
- **Online Multiplayer**: Play real-time matches against friends or random opponents across the globe.

### 🧠 Smart Analysis

- **Stockfish Integration**: Real-time move analysis and evaluation.
- **Voice Feedback**: Text-to-speech move announcements for an immersive experience.
- **History & Replay**: detailed move history with forward/backward navigation to review matches.

### 🎨 Modern UI/UX

- **Premium Aesthetics**: A sleek dark theme and smooth animations.
- **Interactive Board**: Tap-to-move piece movement with valid move indicators.
- **Haptic Feedback**: Tactile response for button clicks all over the UI.
- **Player Profiles**: Custom avatars, usernames, and game statistics.

### 🔐 Authentication

- **Secure Login**: Powered by Supabase Auth with Email/Password and Google Sign-In support.
- **Profile Management**: Customize your player identity and track your game history.

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [NativeWind (Tailwind CSS)](https://www.nativewind.dev/) + Stylesheets
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime, Auth)
- **State Management**: React Hooks & Context API
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Chess Logic**: `chess.js` for rules, `stockfish` for AI
- **Animations**: `react-native-reanimated` & `lottie-react-native`

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

- Node.js (v18 or later)
- Expo Dev Client (Expo-Go won't work) on your physical device or Emulator

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/<your-username>/ai-chess.git
   cd ai-chess
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your keys:

   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_client_id
   ```

4. **Start the Development Server**

   ```bash
   npx expo run:android
   ```

## 📱 Project Structure

```
ai-chess/
├── app/                 # Expo Router pages (screens)
│   ├── auth.tsx         # Login/Signup screen
│   ├── (tabs)/          # Main tab navigation
│   ├── offline-game.tsx # Local AI game logic
│   └── online-game.tsx  # Multiplayer game logic
├── components/          # Reusable UI components
│   ├── chess/           # Chess-specific components (Board, Pieces)
│   └── ...
├── constants/           # App constants (Colors, Types)
├── utils/               # Helper functions (AI, Voice, Supabase)
└── assets/              # Images, fonts, and icons
```

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request for any bugs, improvements, or new features.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by Yuvraj Singh
</p>
