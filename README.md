# 🐾 Pet Home

<div align="center">

An AI-powered companion application for pet lovers, providing intelligent pet management and entertainment experiences through React and AI integration.

[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-purple.svg)](https://vitejs.dev/)
[![Lovable Cloud](https://img.shields.io/badge/Backend-Lovable%20Cloud-green.svg)](https://lovable.dev)

[✨ Features](#-features) | [🚀 Quick Start](#-quick-start) | [📚 Documentation](#-documentation)

</div>

## ✨ Features

### 🤖 AI-Powered Intelligence

- **🔍 Smart Pet Identification** - Upload a photo to instantly identify pet breeds and characteristics
- **💊 AI Health Advisor** - Professional pet health consultation and guidance with RAG-enhanced accuracy
- **📖 Story Creator** - AI-assisted creation of heartwarming pet stories and social media content
- **🖼️ Image Editor** - Apply AI-powered filters and effects to pet photos
- **✨ Agent Chat** - Unified intelligent assistant that integrates all AI capabilities

### 🎨 Practical Tools

- **📸 Pet Gallery** - Beautiful display and management of pet photos
- **🎯 Personalized Modes** - Multiple interface themes and interaction modes
- **🌐 Multi-language Support** - Interface available in multiple languages

### 🌟 User Experience

- **Responsive Design** - Perfect adaptation for desktop and mobile devices
- **Smooth Animations** - Carefully designed transitions and interactions
- **Fast Performance** - Optimized resource management and loading
- **Secure Authentication** - User accounts with data persistence

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** - Modern UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling

### Backend
- **Lovable Cloud** - Full-stack cloud platform powered by Supabase
- **Edge Functions** - Serverless backend logic
- **PostgreSQL** - Relational database for data persistence
- **Supabase Auth** - Secure authentication system

### AI Integration
- **Lovable AI Gateway** - Seamless access to AI models
- **Google Gemini 2.5 Flash** - Multi-modal AI for text and image understanding
- **Google Gemini 2.5 Flash Image** - AI image generation and editing
- **Perplexity API** - Intelligent search and information retrieval for health advice

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** or **yarn**

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/pet-home.git
cd pet-home
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Environment Setup
The project uses Lovable Cloud, which automatically configures the necessary environment variables. No manual setup required for:
- Database connection
- Authentication
- AI API keys
- Edge functions

### 4. Start Development Server
```bash
npm run dev
```

### 5. Open Browser
Visit [http://localhost:5173](http://localhost:5173) to start exploring!

## 📁 Project Structure

```
pet-home/
├── components/              # React components
│   ├── AgentMode.tsx       # AI agent chat interface
│   ├── PetIdentifier.tsx   # Pet identification
│   ├── PetHealthAdvisor.tsx # Health consultation
│   ├── PetStoryCreator.tsx # Story creation
│   ├── PetImageEditor.tsx  # Image editing
│   ├── PetGallery.tsx      # Pet gallery
│   └── ...
├── services/               # API services
│   ├── geminiService.ts    # Gemini AI service (legacy)
│   └── perplexityService.ts # Perplexity search (legacy)
├── supabase/
│   └── functions/          # Edge functions
│       ├── agent-chat/     # Agent chat backend
│       ├── pet-identify/   # Pet identification
│       ├── health-advice/  # Health consultation
│       ├── image-edit/     # Image editing
│       ├── image-generate/ # Image generation
│       └── story-caption/  # Story creation
├── src/
│   ├── contexts/           # React contexts
│   ├── pages/             # Page components
│   └── integrations/      # Third-party integrations
├── App.tsx                # Main application component
├── index.tsx              # Application entry point
└── vite.config.ts         # Vite configuration
```

## 🎯 Feature Details

### 🔍 Smart Pet Identification
- Supports multiple image formats
- Accurately identifies pet breeds, age, and characteristics
- Provides detailed pet information and care recommendations
- Uses Google Gemini's multi-modal capabilities

### 💊 AI Health Advisor
- Preliminary diagnosis based on symptom descriptions
- Emergency situation identification and handling suggestions
- Daily care and nutrition guidance
- RAG-enhanced responses with cited sources using Perplexity API
- **Important**: Includes medical disclaimer - not a substitute for professional veterinary care

### 📖 Story Creator
- AI-assisted creative writing
- Personalized story plot generation
- Supports various story styles and lengths
- Generates accompanying images for social media
- Voice input support (experimental)

### 🖼️ Image Editor
- Real-time filter and effect preview
- Pet photo enhancement tools
- AI-powered image generation and editing
- Quick social media sharing

### ✨ Agent Chat
- Unified conversational interface
- Automatically selects appropriate tools based on user intent
- Integrates all AI capabilities (identification, health advice, image editing, story creation)
- Conversation history with persistent storage

## 🔐 Authentication & Data

### User System
- **Sign Up / Sign In**: Email-based authentication
- **Auto-confirm**: Email verification automatically enabled for development
- **Profile Management**: Store and manage user preferences
- **Data Persistence**: All conversations and created content are saved

### Privacy & Security
- Row Level Security (RLS) policies on all database tables
- User data isolated and protected
- Secure API key management via Lovable Cloud secrets

## 📊 Database Schema

### Tables
- **`profiles`**: User profile information
- **`agent_messages`**: Agent chat conversation history with tool results
- **`agent_conversations`**: Conversation metadata and timestamps

## 🌐 Deployment

The application is automatically deployed through Lovable Cloud. Click the "Publish" button in the Lovable editor to deploy your changes.

### Custom Domain
Connect your own domain through Project Settings → Domains (requires paid plan)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a **Pull Request**

## 📝 Changelog

### v2.0.0 (2025-10-14)
- 🎉 Migrated to Lovable Cloud backend
- ✨ Added user authentication system
- 🔒 Implemented database with RLS policies
- 💬 Added conversation history persistence
- 🎨 Rebranded "AI Chat" to "Agent Chat" with new icon
- 🖼️ Enhanced image display in conversation history

### v1.0.0 (2025-09-26)
- 🎉 Initial release
- ✨ Core AI features implemented
- 🎨 User interface design completed
- 🔧 Performance and UX optimizations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- **Author**: Pet Home Team
- **Project Link**: [https://github.com/yourusername/pet-home](https://github.com/yourusername/pet-home)

## 🙏 Acknowledgments

Thanks to these excellent projects and services:
- [React](https://reactjs.org/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [Lovable](https://lovable.dev/) - Full-stack development platform
- [Google Gemini](https://ai.google.dev/) - AI capabilities
- [Perplexity](https://www.perplexity.ai/) - Search and retrieval
- [Supabase](https://supabase.com/) - Backend infrastructure

---

<div align="center">

**If this project helps you, please give it a ⭐ Star!**

Made with ❤️ for pet lovers everywhere

</div>
