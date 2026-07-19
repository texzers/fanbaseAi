# FanPulse AI — System Architecture

This document describes the architectural layout, modules, and key data flows for the FanPulse AI stadium operations and fan experience platform.

---

## Architecture Diagram

```
                 ┌──────────────────────────────────────┐
                 │          Client Application          │
                 │    React + Vite + TypeScript (Web)   │
                 └──────┬────────────┬───────────┬──────┘
                        │            │           │
           JSON/HTTPS   │            │           │   JSON/HTTPS
       Public Endpoints │            │           │   Role-Restricted
                        ▼            │           ▼
           ┌──────────────────────┐  │       ┌──────────────────────┐
           │   Fan Concierge API  │  │       │ Operations Admin API │
           │   - Chat Concierge   │  │       │ - Ops Chat           │
           │   - Wayfinding       │  │       │ - Incident Assist    │
           │   - Sustainability   │  │       │ - Briefings          │
           │   - Alerts / Crowd   │  │       └───────────┬──────────┘
           └──────────┬───────────┘  │                   │
                      │              │                   │
                      │              ▼                   │
                      │    ┌───────────────────┐         │
                      │    │   Auth Service    │         │
                      │    │   (Mock JWT)      │         │
                      │    └─────────┬─────────┘         │
                      │              │                   │
                      ▼              ▼                   ▼
                 ┌──────────────────────────────────────────┐
                 │           Express Application            │
                 │                 (Server)                 │
                 └───────────────────┬──────────────────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     ▼               ▼               ▼
             ┌───────────────┐ ┌───────────┐ ┌───────────────┐
             │ Crowd Sensor  │ │  SQLite   │ │  GenAI Client │
             │ Simulator     │ │ Database  │ │ (Claude Proxy)│
             └───────────────┘ └───────────┘ └───────┬───────┘
                                                     │
                                                     ▼
                                            ┌────────────────┐
                                            │ Anthropic API  │
                                            │ (Sonnet 3.5)   │
                                            └────────────────┘
```

---

## Core Components

### 1. Frontend Client (`apps/web`)
- **Single Page App**: Built with React, TypeScript, and Vite.
- **Mobile-First Design**: The **Fan App** layout is tailored for mobile browser viewports with focus-visible interactive states and screen-reader tags.
- **Operations Dashboard**: A desktop-optimized tabbed panel for volunteer/organizer tools.
- **A11y Engine**: Centralized settings provider (`A11yContext`) managing high-contrast themes, large text scaling (up to 200%), and plain-language simplification flags.

### 2. Backend Server (`apps/server`)
- **Express App**: Node.js + TypeScript REST API.
- **Security Middleware**:
  - `Helmet`: HTTP security headers.
  - `CORS`: Restricts access to allowed origin configurations.
  - `Rate Limiter`: Prevents API cost inflation and spam on AI endpoints.
  - `Zod Validator`: Sanitizes and parses request inputs before executing business logic.
- **Auth Provider**: JWT-based session security with server-side role checks (`requireRole('volunteer', 'organizer')`).

### 3. Crowd Simulator
- A background ticker (ticking on a setInterval) simulating stadium IoT turnstiles.
- Generates realistic density curves representing pre-match arrivals, match steady state, half-time restroom rushes, and post-match exits.

### 4. GenAI Client Wrapper (`src/ai/claudeClient.ts`)
- The single interface communicating with Anthropic.
- All prompts reside here as structured, named builder functions.
- Input data is enclosed in XML tags (`<user_input>`) with strict system instructions to ignore prompt injection attempts.

---

## Critical Data Flow Examples

### E.g., Crowd-Aware Wayfinding Request

```
[Fan Client]                          [Express Server]                    [Claude LLM]
     │                                       │                                 │
     │  POST /api/chat/wayfinding            │                                 │
     ├──────────────────────────────────────>│                                 │
     │  {from, to, preferStepFree}           │                                 │
     │                                       │                                 │
     │                                       │── Fetch Live Crowd Data         │
     │                                       │   from Simulator                │
     │                                       │                                 │
     │                                       │── Compile Ground Truth          │
     │                                       │   Wayfinding Prompt             │
     │                                       │                                 │
     │                                       │  SDK Invoke (Sonnet)            │
     │                                       ├────────────────────────────────>│
     │                                       │  System: "Only use crowd_data..."│
     │                                       │  User: <user_input>...          │
     │                                       │                                 │
     │                                       │  Prompt-Grounded Response       │
     │                                       │<────────────────────────────────┤
     │                                       │                                 │
     │  JSON Response                        │                                 │
     │  {directions, routeStatus, minutes}   │                                 │
     |<──────────────────────────────────────│                                 │
     │                                       │                                 │
```
