# FanPulse AI
### GenAI-Powered Stadium Operations & Fan Experience Platform for FIFA World Cup 2026

FanPulse AI is a unified web platform that integrates a mobile-first **Fan App** and a venue-manager **Operations Dashboard** to optimize stadium experience and logistics for the FIFA World Cup 2026.

---

## 1. Chosen Vertical
FanPulse AI targets **Stadium Operations & Fan Experience** for large-scale sporting tournaments. It features key GenAI integrations addressing critical operational challenges:
- **Multilingual Fan Assistance**: AI Concierge chatbot providing gate, route, restroom, and safety information in the fan's preferred language (supporting BCP-47 tags).
- **Crowd-Aware Navigation**: Wayfinding assistant generating step-by-step directions grounded in simulated crowd turnstile data, automatically suggesting alternate routes if congested.
- **Cognitive Accessibility**: Plain-language simplification mode translating complex announcements or AI messages into simple, clear instructions.
- **Sustainability Transport Recommendation**: Carbon footprint estimation tool suggesting the greenest routes (metro, bus, cycling) with emissions comparisons versus solo driving.
- **Incident Response Co-pilot**: Staff note parser classifying incidents, drafting structured supervisor briefings, radio summaries, and public safety announcements.
- **Operational Decision Support**: Control room Ops Assistant answering natural-language queries grounded purely in live crowd data to avoid hallucinations.

---

## 2. Approach and Logic
- **Single GenAI Gateway**: All GenAI calls proxy securely through a dedicated backend controller (`src/ai/claudeClient.ts`). The client application never contacts the LLM directly, preventing API key exposure.
- **Grounded-Answer Strategy**: Operational questions are grounded in current, trusted server data (injected via structured system prompts). The model is instructed to refuse questions that cannot be answered using the provided dataset, preventing hallucination.
- **Separation of Concerns**: Clean monorepo structure separating shared types, server controllers, domain services, simulator threads, and web views.
- **Lightweight Crowd Simulator**: A background simulator generates dynamic turnstile inflow and gate queues, standing in for a physical IoT stream.
- **LRU Translation Caching**: Translations are cached to prevent redundant, expensive LLM calls, with static fallbacks for safety-critical notices.

---

## 3. How the Solution Works
### Architecture Overview
See [docs/ARCHITECTURE.md](file:///Users/arunkumar/.gemini/antigravity-ide/scratch/fanpulse-ai/docs/ARCHITECTURE.md) for full details. The frontend client communicates via REST JSON endpoints to the Express backend. The backend manages local persistence via SQLite and processes prompt templates using the Anthropic SDK.

### Monorepo Structure
- `apps/web`: React + Vite + TypeScript frontend.
- `apps/server`: Express + TypeScript backend.
- `packages/shared-types`: Common interfaces imported by both frontend and backend to prevent contract drift.
- `docs/`: Architecture documentation.

---

## 4. Setup & Run Instructions

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation
From the root directory:
```bash
npm install
```

### Environment Configuration
1. Copy the example env file in `apps/server/.env.example` to `.env`:
   ```bash
   cp apps/server/.env.example apps/server/.env
   ```
2. Open `apps/server/.env` and update configuration.
3. *Optional*: Add your `ANTHROPIC_API_KEY` to enable live Claude responses. If not provided, the server runs in **MOCK AI Mode** returning simulated responses for development convenience.

### Running the Application
To run both the server and web dev apps concurrently:
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Running Tests
To execute all backend services, Express API integration, and frontend component tests:
```bash
npm test
```

### Building for Production
```bash
npm run build
```

---

## 5. Assumptions Made
- **Simulated Inputs**: Crowd turnstile and IoT sensor flows are mock values generated programmatically.
- **Mock Authentication**: Auth uses JWTs but validates credentials against a pre-seeded mock database instead of a production identity provider (SSO).
- **Supported Languages**: BCP-47 codes are parsed, mapping to static safety templates for emergency announcements.

---

## 6. Security Notes
- **API Key Security**: The Anthropic API key is strictly server-side.
- **Input Validation**: All requests are validated against Zod schemas.
- **Prompt Injection Defense**: Inputs are wrapped in `<user_input>` XML tags with explicit instructions to ignore instructions found inside.
- **Rate Limiting**: Public chat and wayfinding endpoints are rate-limited.
- **Role-Based Access Control**: Sensitive operations (Ops chat, briefings, incident logs) are protected on the backend using JWT verification and role checks.

---

## 7. Known Limitations / Future Work
- **Static Graph Routing**: Current wayfinding estimates walk times heuristically. Production systems should integrate A* routing over a stadium grid.
- **Mock Auth Integration**: Exchange mock login with ticketing standard protocols (such as OAuth or OpenID Connect).
