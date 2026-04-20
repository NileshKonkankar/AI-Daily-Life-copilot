<div align="center">
  
  # 🧠⚡ AI Daily Life Copilot

  <p>
    <strong>An intelligent personal productivity system for task prioritization, decision-making, and daily planning.</strong>
  </p>

  <p>
    <a href="#features"><img src="https://img.shields.io/badge/Features-✨-blue.svg?style=flat-square" alt="Features" /></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/React-19-blue.svg?style=flat-square&logo=react" alt="React 19" /></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/Tailwind-v4-06B6D4.svg?style=flat-square&logo=tailwindcss" alt="Tailwind CSS" /></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/Firebase-Auth_&_DB-FFCA28.svg?style=flat-square&logo=firebase" alt="Firebase" /></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/AI-Google_Gemini-8E75B2.svg?style=flat-square&logo=google" alt="Google Gemini API" /></a>
  </p>
  
  <br />
</div>

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Core Features](#-core-features)
- [Tech Stack](#-tech-stack)
- [Security](#-security)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
- [Roadmap](#-roadmap)

---

## 🧐 About the Project

Modern users face **task overload**, **poor prioritization**, **decision fatigue**, and a lack of structured daily planning. Most tools (like traditional to-do apps and static calendars) are passive—they don't think, prioritize, or guide.

**AI Daily Life Copilot** is a smart, actionable productivity assistant designed to fix this. It doesn't just store your tasks; it transforms a raw task list into an actionable strategy by understanding your context, analyzing strict deadlines, and providing AI-backed reasoning for what you should conquer next.

---

## ✨ Core Features

- **📝 Advanced Task Management**: Add, edit, and delete tasks with strict deadlines, priority levels, and customized categories.
- **🧠 AI Task Prioritization**: Instantly ranks your tasks and provides deep reasoning behind why specific items should be tackled first.
- **🎯 "What Should I Do Next?"**: A single-click decision engine that eliminates decision fatigue by suggesting the single best task to focus on immediately.
- **📅 Daily Summary Generator**: Automatically creates a structured daily plan, time-blocking suggestions, and focused recommendations based on your current load.
- **⚡ Smart Insights**: Passively detects overloaded schedules, flags missed deadlines, and identifies low-priority distractions.
- **🎨 Modern SaaS Dashboard**: A beautiful, pristine UI built with Shadcn, featuring a sidebar layout, grid system, and smooth Framer Motion animations.

---

## 🛠 Tech Stack

**Client:**
- **[React 19](https://react.dev/)**
- **[Vite](https://vitejs.dev/)**
- **[Tailwind CSS v4](https://tailwindcss.com/)**
- **[shadcn/ui](https://ui.shadcn.com/)**
- **[Framer Motion](https://www.framer.com/motion/)**

**Backend & Storage:**
- **[Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)** (API Layer)
- **[Firebase Authentication](https://firebase.google.com/products/auth)** (Google OAuth)
- **[Cloud Firestore](https://firebase.google.com/products/firestore)** (NoSQL Database)

**AI & Intelligence:**
- **[Google Gemini API](https://ai.google.dev/)** (`gemini-3.1-pro-preview` model integration)

---

## 🔒 Security Architecture

We take data privacy and API security extremely seriously:
- **Server-Side AI Execution**: The Gemini AI logic runs securely via an Express API backend container. Private AI API keys are **never** exposed to the client browser bundle.
- **Rule-Based Data Sandboxing**: Comprehensive **Firestore Security Rules** are deployed to enforce strict data isolation—meaning users can absolutely only read, create, update, or delete their own authorized documents.

---

## 🚀 Getting Started

To get a local development environment up and running, follow these steps.

### Prerequisites

You need [Node.js](https://nodejs.org/) installed along with an active [Firebase](https://firebase.google.com/) Project and a [Google Gemini](https://aistudio.google.com/) API Key.

### Environment Variables

Create a `.env` file in the root level of your project and assign your secrets:

```env
GEMINI_API_KEY="your_gemini_api_key_here"
```

> **Note**: An `.env.example` file is included in the repository for reference.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your_username/ai-daily-life-copilot.git
   cd ai-daily-life-copilot
   ```

2. **Install NPM packages**
   ```bash
   npm install
   ```

3. **Configure Firebase Client Application**
   Update or place your Firebase application payload inside `src/firebase-applet-config.json`:
   ```json
   {
     "apiKey": "AIzaSy...",
     "authDomain": "your-app.firebaseapp.com",
     "projectId": "your-app",
     "storageBucket": "your-app.appspot.com",
     "messagingSenderId": "123456789",
     "appId": "1:123456789:web:abcdef123456",
     "firestoreDatabaseId": "(default)"
   }
   ```

4. **Start the Express/Vite local server**
   ```bash
   npm run dev
   ```

---

## 🗺 Roadmap

- [ ] 📅 Full **Google Calendar** integration for smart scheduling/time-blocking.
- [ ] 🔔 Smart **Push Notifications** & personalized Reminders.
- [ ] 📊 Comprehensive **Productivity Analytics** Dashboard.
- [ ] 💪 Habit & Routine Tracking integration.

---

<div align="center">
  <i>Made with ❤️ using React, Firebase, and Gemini AI.</i>
</div>
