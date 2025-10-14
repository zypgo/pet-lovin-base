# 🐾 Pet Home - AI-Powered Pet Companion Application

<div align="center">

An intelligent web application providing comprehensive AI-driven pet care assistance, built with React and powered by advanced AI technologies.

[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-purple.svg)](https://vitejs.dev/)
[![Lovable Cloud](https://img.shields.io/badge/Backend-Lovable%20Cloud-green.svg)](https://lovable.dev)

[✨ Features](#-features) | [🚀 Quick Start](#-quick-start) | [📖 Documentation](#-documentation)

</div>

---

## ✨ Features

### 🤖 Agent Chat - Unified AI Assistant
- **Intelligent Tool Selection**: Automatically selects appropriate tools based on user intent
- **Multi-modal Input**: Supports both text and image inputs
- **Conversation History**: Persistent chat history with conversation management
- **RAG-Enhanced Memory**: Retrieves relevant context from past conversations using vector similarity search
- **Function Calling**: Integrates pet identification, health advice, image editing, and story creation capabilities

### 🔍 Smart Pet Identification
- **Breed Detection**: Accurately identifies pet species and breed from uploaded images
- **Comprehensive Analysis**: Provides detailed information including physical characteristics, temperament, care requirements, and health considerations
- **Powered by**: Google Gemini 2.5 Flash vision model

### 💊 AI Health Advisor
- **Dual Search Modes**: Standard mode with Perplexity citations, or Deep Research mode with comprehensive analysis
- **Consultation History**: Automatically saves all health consultations
- **Citation Support**: Displays source URLs for credibility
- **Medical Disclaimer**: Appropriate warnings included

### 🎨 Creative Pet Playground
- **AI Image Editing**: Transform pet photos with text prompts
- **Before/After Comparison**: Side-by-side display
- **Gallery Integration**: Auto-save to private gallery
- **Powered by**: Lovable AI Gateway with Gemini 2.5 Flash Image Preview

### 📖 Pet Story Creator
- **Two-Stage Generation**: AI-generated caption + artwork
- **Voice Input**: Experimental speech-to-text support
- **Auto-Save**: Stories saved to database

### 🖼️ Pet Gallery
- **Dual Gallery System**: Private and community galleries
- **Social Features**: Likes, sharing, user attribution
- **Quick Edit**: Direct editing from gallery

---

## 🛠️ Tech Stack

### Frontend
- **React 19.1.1** with TypeScript 5.8.2
- **Vite 6.2.0** for fast development
- **Tailwind CSS** with custom design system
- **DOMPurify** and **Marked.js** for safe markdown rendering

### Backend
- **Lovable Cloud** (powered by Supabase)
- **PostgreSQL** with pgvector extension
- **Edge Functions** (Deno runtime)
- **Supabase Auth** and **Storage**
- **Row Level Security** policies

### AI Integration
- **Lovable AI Gateway**: Gemini 2.5 Flash Image Preview
- **Google Gemini 2.5 Flash**: Vision, function calling, embeddings
- **Perplexity API**: Web search with citations
- **OpenRouter API**: Image generation

---

## 🚀 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourusername/pet-home.git
cd pet-home

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open browser
# Visit http://localhost:5173
```

Environment variables are auto-configured by Lovable Cloud.

---

## 📁 Project Structure

```
pet-home/
├── components/              # React components
│   ├── AgentMode.tsx       # Agent chat with RAG
│   ├── PetIdentifier.tsx   # Breed identification
│   ├── PetHealthAdvisor.tsx # Health consultation
│   ├── PetImageEditor.tsx  # Image editing
│   ├── PetStoryCreator.tsx # Story generator
│   ├── PetGallery.tsx      # Dual gallery
│   └── ...
├── services/               # API service layers
├── supabase/functions/     # Edge functions
│   ├── agent-chat/         # Main orchestrator
│   ├── pet-identify/       # Pet identification
│   ├── health-advice/      # Health consultation
│   ├── image-edit/         # Image editing
│   └── ...
├── src/
│   ├── contexts/           # React contexts
│   ├── pages/             # Page components
│   └── integrations/      # Supabase client
└── App.tsx                # Main app
```

---

## 🎯 Core Features

### Agent Chat Architecture
**Flow**: User input → RAG retrieval → Gemini function calling → Tool execution → Gemini synthesis → Save with embeddings

**Available Tools**: Pet identification, health advice (standard/deep), image editing, story creation, web research, memory saving

### RAG Implementation
- Embeddings: Gemini text-embedding-004 (768 dimensions)
- Storage: PostgreSQL pgvector
- Search: Cosine similarity on `agent_messages` and `user_memories` tables
- Context injection into system prompts

### Database Schema
- `profiles`: User information
- `agent_conversations`: Conversation metadata
- `agent_messages`: Messages with embeddings and tool results
- `user_memories`: Explicit saved memories with embeddings
- `pet_identifications`, `health_consultations`, `pet_stories`: Feature-specific data
- `gallery_images`: Private and public image storage

All tables protected by RLS policies.

---

## 🌐 Deployment

Click **Publish** in Lovable editor for automatic deployment to `*.lovable.app`.

Custom domains available on paid plans.

---

## 📝 Changelog

### v3.0.0 (2025-10-14)
- Rebranded to "Agent Chat" with Sparkles icon
- Implemented RAG memory system
- Added dual gallery and consultation history
- Enhanced image editor with comparisons

### v2.0.0 (2025-10-14)
- Migrated to Lovable Cloud
- Added authentication and RLS
- Conversation persistence

### v1.0.0 (2025-09-26)
- Initial release

---

## 📄 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

[React](https://reactjs.org/) • [Vite](https://vitejs.dev/) • [Lovable](https://lovable.dev/) • [Google Gemini](https://ai.google.dev/) • [Perplexity](https://www.perplexity.ai/) • [OpenRouter](https://openrouter.ai/) • [Supabase](https://supabase.com/)

---

<div align="center">

**⭐ Star this project if it helps you!**

Made with ❤️ for pet lovers everywhere 🐾

</div>
