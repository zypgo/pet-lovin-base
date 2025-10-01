# Pet Home - AI Pet Companion

## Overview
Pet Home is a React + TypeScript + Vite application that provides AI-powered pet services using Google's Gemini AI. The app offers multiple features including pet identification, health advice, story creation, and image editing capabilities.

## Recent Changes - September 26, 2025
### Major Gemini Tool Calling Standards Upgrade  
- ⚡ **Latest 2025 Tool Calling Format**: Upgraded to latest Gemini tool calling standards using `parametersJsonSchema` instead of deprecated `parameters` format
- 🔄 **Complete Function Calling Loop**: Implemented full functionResponse flow - after tool execution, system sends functionResponse back to chat for AI's conversational follow-up
- 🤖 **AUTO Mode Integration**: Configured FunctionCallingConfigMode.AUTO allowing AI to intelligently choose when to use tools vs natural conversation
- ⚙️ **Centralized Configuration System**: Added AI_CONFIG, TOOL_NAMES, and SYSTEM_CONFIG constants for enhanced maintainability
- 🛡️ **Enhanced Error Handling**: Comprehensive null safety checks, graceful fallbacks, and improved user-facing error messages
- 📈 **Improved User Experience**: Better loading states, conversational AI responses, and specialized UI components for different tool results

### Previous Major Features (September 25, 2025)
- 🚀 **Upgraded Pet Identification with JSON Mode**: Completely revamped the pet identification feature to use Gemini AI's structured JSON output instead of raw markdown text
- 📊 **Structured Data Format**: Pet identification now returns comprehensive structured data including breed, species, confidence level, physical characteristics, temperament analysis, and care recommendations
- 🎨 **Beautiful UI Redesign**: Redesigned the pet identification interface with Averia Serif Libre font and a cute, warm theme featuring gradients, emojis, and friendly cards
- 🔧 **Enhanced Type Safety**: Added comprehensive TypeScript interfaces (PetIdentificationResult) for all pet data structures
- 📱 **Responsive Display Component**: Created a new PetInfoDisplay component that beautifully presents structured pet information in organized sections

### System Configuration
- Successfully imported and configured the project for Replit environment
- Updated Vite configuration to use port 5000 with host access enabled for Replit proxy
- Installed Node.js 20 and all project dependencies
- Configured Gemini AI integration for API key management
- Set up development workflow and deployment configuration

## User Preferences
- Prefers TypeScript for type safety
- Uses Vite for fast development builds
- Utilizes Tailwind CSS for styling via CDN
- Follows React functional component patterns with hooks

## Project Architecture

### Technology Stack
- **Frontend**: React 19.1.1 + TypeScript + Vite
- **Styling**: Tailwind CSS (CDN)
- **AI Services**: Google Gemini AI (@google/genai)
- **Build Tool**: Vite 6.2.0
- **Package Manager**: npm

### Project Structure
```
├── components/           # React components
│   ├── AgentMode.tsx    # Main agent interface
│   ├── Header.tsx       # App header
│   ├── Nav.tsx          # Navigation component
│   ├── PetIdentifier.tsx # Pet identification feature
│   ├── PetHealthAdvisor.tsx # Health advice feature
│   ├── HappyLifePage.tsx # Happy life features
│   └── ...              # Other components
├── services/
│   └── geminiService.ts # Gemini AI service integration
├── App.tsx              # Main application component
├── index.tsx            # Application entry point
├── types.ts             # TypeScript type definitions
└── vite.config.ts       # Vite configuration
```

### Key Features
1. **Pet Identification**: AI-powered breed and species identification from photos
2. **Health Advisor**: General pet health advice with veterinary disclaimers
3. **Story Creator**: Generate social media posts with AI-created images
4. **Image Editor**: AI-powered pet image editing capabilities
5. **Agent Mode**: Comprehensive AI assistant for pet-related queries

### Environment Configuration
- **Development Port**: 5000 (configured for Replit proxy)
- **Host**: 0.0.0.0 with allowedHosts: true
- **API Key**: Requires GEMINI_API_KEY environment variable

### Deployment
- **Target**: Autoscale deployment for stateless web application
- **Build Command**: npm run build
- **Run Command**: npm run preview
- **Port**: 5000 (frontend only)

### Dependencies Management
- All dependencies installed via npm
- Uses ES modules with TypeScript
- Gemini AI integration managed through Replit blueprints
- No additional system dependencies required

## Development Setup
1. Development server runs on port 5000
2. Hot reload enabled through Vite
3. TypeScript compilation with strict settings
4. Gemini API key required for AI features to function

## Next Steps
- User needs to add GEMINI_API_KEY to Replit secrets for full functionality
- All AI features will work once API key is configured
- Ready for deployment when user is satisfied with the application