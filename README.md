# AI Daily Life Copilot 🧠⚡

An AI-powered personal productivity system for task prioritization, decision-making, and daily planning.

![AI Daily Life Copilot UI](https://via.placeholder.com/1200x600.png?text=AI+Daily+Life+Copilot)

## 🧩 Problem Statement
Modern users face task overload, poor prioritization, decision fatigue, and a lack of structured daily planning. Most tools (to-do apps, calendars) are passive—they don't think or guide.

## 💡 Solution
AI Daily Life Copilot is an intelligent productivity assistant that:
- Understands user tasks and context.
- Prioritizes work using reasoning.
- Suggests the next best action.
- Generates structured daily plans.

It transforms a task list into an actionable strategy.

## 🎯 Core Features
- **📝 Task Management**: Add, edit, and delete tasks with deadlines, priorities, and categories.
- **🧠 AI Task Prioritization**: Ranks tasks and provides reasoning behind the order using Gemini.
- **🎯 "What Should I Do Next?"**: Single-click decision engine that suggests the next best task and why it matters now.
- **📅 Daily Summary Generator**: Generates a plan for the day, time suggestions, and focus recommendations.
- **⚡ Smart Insights**: Detects overloaded schedules, missed deadlines, and low-priority distractions.
- **🎨 Modern SaaS Dashboard**: Clean, responsive UI with a sidebar, top navigation, and smooth animations.

## 🏗️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui, Framer Motion
- **Backend/Database**: Firebase (Authentication & Firestore)
- **AI Layer**: Google Gemini API (`gemini-3.1-pro-preview`) via `@google/genai`

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Firebase Project
- Gemini API Key

### Installation
1. Clone the repository.
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Set up environment variables in \`.env\`:
   \`\`\`env
   GEMINI_API_KEY=your_api_key_here
   \`\`\`
4. Configure Firebase in \`src/firebase-applet-config.json\`.
5. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## 🔐 Security
- API key protection (server-side/environment variables).
- Firebase Security Rules enforce user-specific data access (users can only read/write their own tasks).

## 📈 Future Enhancements
- Google Calendar integration
- Smart reminders
- Productivity analytics dashboard
- Habit tracking
