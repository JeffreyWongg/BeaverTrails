# BeaverTrails
AI-powered Canadian travel itinerary planner with immersive 360° experiences  
Discover hidden gems across Canada with AI-generated routes, interactive 3D maps, and VR-ready panoramic views  

---

## Overview

Planning a trip across Canada is overwhelming. Generic travel sites show you the same tourist traps, and piecing together a multi-day itinerary with hidden gems, logical routing, and accurate information takes hours of research.  
That's why we built **BeaverTrails**: an AI-powered travel planning platform that generates personalized Canadian itineraries, helps you discover lesser-known destinations, and lets you experience locations in immersive 360° views before you go.

beavertrails uses advanced AI models (Google Gemini via OpenRouter) to analyze your travel preferences and generate complete multi-day itineraries with accurate coordinates, logical routing, and detailed descriptions. The platform features an interactive 3D globe visualization, real-time AI assistant (Beav) that can modify your itinerary on the fly, immersive Street View experiences with AI-generated 360° panoramas, procedural ambient music, and WebXR support for VR headsets. Experience your trip before you book it.

---

## Features

- **AI-powered itinerary generation** using Google Gemini models via OpenRouter
- **Interactive 3D globe visualization** with react-globe.gl and Mapbox integration
- **Real-time AI travel assistant (Beav)** that can modify itineraries based on user requests
- **Immersive 360° experiences** with Google Street View and AI-generated panoramas via World Labs
- **WebXR VR support** for Meta Quest headsets with head tracking
- **Procedural ambient music** generated dynamically based on location type
- **AI voice narration** using ElevenLabs text-to-speech with location-specific descriptions
- **Voice and text Q&A** in immersive view with real-time AI responses
- **PDF itinerary export** with QR codes, packing lists, and cost estimates
- **Smart routing logic** that minimizes flights and optimizes travel paths
- **Hidden gem discovery** - AI prioritizes lesser-known, authentic Canadian destinations
- **Automatic geocoding** with province-specific queries for accurate coordinates
- **Street View coverage detection** to show available immersive views
- **Mobile gyroscope support** for tilt-to-look in panoramic views

---

## How to Run 

To run this project locally, simply execute the following commands in your terminal:

1. Install the required dependencies:
   ```bash
   npm i
   npm run dev
   ```

---

## Architecture

**Itinerary Generation Pipeline**  
User Survey → AI Analysis (Gemini) → Preference Extraction → Itinerary Generation (Gemini) → Geocoding (Mapbox) → Coordinate Validation → Route Optimization  

**Immersive Experience Pipeline**  
Stop Selection → Street View Check → Google Maps API / Mapbox Fallback → Ambient Music Generation → AI Narration (ElevenLabs) → 360° Rendering (Three.js)  

**AI Assistant Pipeline**  
User Query → Context Injection (Itinerary + Profile) → OpenRouter API → Streaming Response → Real-time Itinerary Modification  

**World Generation Pipeline**  
User Prompt → World Labs API → Panorama Generation → Equirectangular Image → Three.js Sphere Rendering → WebXR Session (Optional)  

**Audio Pipeline**  
Location Context → Procedural Generation (Web Audio API) → Layered Oscillators + Filtered Noise → LFO Modulation → Spatial Audio  

---

## Tech Stack

| Category | Technologies |
|---------|--------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| 3D Visualization | Three.js, react-globe.gl, WebXR API |
| Maps | Mapbox GL JS, Google Maps JavaScript API |
| AI/ML | OpenRouter API, Google Gemini 3.1 Pro, Google Gemini 2.5 Pro |
| Text-to-Speech | ElevenLabs API |
| Computer Vision | World Labs Marble API (360° panorama generation) |
| State Management | Zustand |
| Audio | Web Audio API (procedural generation), Howler.js |
| PDF Generation | @react-pdf/renderer |
| Animation | Framer Motion |
| Geocoding | Mapbox Geocoding API |

---

## How It Works

1. User completes a travel survey about preferences, interests, and travel style.
2. AI analyzes survey responses to extract traveler archetype and preferences.
3. AI generates a complete multi-day itinerary with stops, hotels, airports, and travel methods.
4. Mapbox Geocoding API validates and corrects all location coordinates.
5. Interactive 3D globe displays the route with clickable markers.
6. User can click any stop to enter immersive 360° view (Street View or AI-generated).
7. Procedural ambient music plays based on location type (nature, urban, historic, etc.).
8. AI voice narration describes the location with sensory details.
9. User can chat with Beav (AI assistant) to ask questions or modify the itinerary.
10. Beav can update stops, add locations, or answer questions in real-time.
11. "Imagine This" feature generates custom 360° panoramas from text prompts via World Labs.
12. WebXR support enables VR headset experiences for immersive viewing.
13. Finalized itinerary can be exported as PDF with QR codes and travel details.

---

## Future Roadmap

- Enhanced mobile app experience with native gyroscope controls
- Multi-language support for international travelers
- Social features - share itineraries and discover routes from other users
- Real-time weather integration for better trip planning
- Booking integration with hotels, flights, and activities
- Offline mode for accessing itineraries without internet
- Advanced route optimization with traffic and seasonal considerations
- Collaborative trip planning with multiple travelers
- Integration with Canadian tourism boards for verified information
- Enhanced VR experiences with spatial audio and haptic feedback

---

## Team

| Member |
|---------
| Abdullah Khalid |
| Jeremy Liu |
| Jeffrey Wong |
| Ethan Yang |

---

## Links


- Devpost submission: coming soon
