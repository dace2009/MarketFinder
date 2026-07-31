# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MarketFinder is a full-stack business prospecting tool that uses Google Places API to find independent businesses (non-chains) lacking an online presence — ideal leads for digital marketing services. The UI and business logic are Spanish-first, targeting the Mexican/Latin American market.

## Development Commands

### Frontend (React + Vite)
```
cd frontend
npm run dev       # Dev server at http://localhost:5173
npm run build     # Production build → backend/static/ (serves directly from FastAPI)
npm run preview   # Preview production build
```

### Backend (FastAPI + Python)
```
cd backend
pip install -r requirements.txt
python main.py    # API server at 127.0.0.1:8000
python run.py     # Desktop launcher: starts server + Ollama + opens browser (production mode)
```

The Vite dev server proxies `/api/*` → `http://localhost:8000`, so both must run simultaneously during development.

### WhatsApp Service (Node.js)
```
cd backend/whatsapp
npm install       # Install whatsapp-web.js + puppeteer-core + ws dependencies
```
Service runs as a subprocess (spawned by `main.py` on startup). Requires Node.js 18+ and Chrome/Edge installed on the system. Connect via WebSocket on `ws://127.0.0.1:11435`.

### Desktop Distribution (PyInstaller)
```
cd backend
pyinstaller MarketFinder.spec
cp backend/dist/MarketFinder.exe MarketFinder.exe   # also update root copy
```
Artifacts: `backend/build/` (intermediate), `backend/dist/MarketFinder.exe` (distributable). Always copy to the project root after building. Build sequence: `npm run build` → `pyinstaller` → `cp`.

**Important:** Before running PyInstaller, stop the WhatsApp Node process (port 11435) — otherwise the session Chrome cache files are locked and the build fails.

The spec bundles `whatsapp/` (server.js + node_modules, excluding `session/`) into the exe via a walk+exclude helper. When frozen, `get_whatsapp_dir()` finds the code in `sys._MEIPASS/whatsapp/` and the session persists to `%LOCALAPPDATA%/MarketFinder/whatsapp-session/`.

### E2E Testing (Playwright)
```
npx playwright test    # Run E2E tests (root package.json)
```
`playwright: ^1.60.0` is listed in root `package.json`. There is no `playwright.config.js` — tests run with Playwright defaults.

**No linting or formatting tooling is configured** (no ESLint, Prettier, or TypeScript). There are no unit tests beyond the E2E suite.

## Known pitfalls

- **`UserProfile` uses local draft state** — inputs are controlled by a local `draft` state that syncs from the `profile` prop on mount/prop-change. The `onChange` prop (`handleProfileChange` in App.jsx) is an async API call, not a React state setter, so it is only called `onBlur`. Never pass a functional updater to `onChange` from this component.
- **`POST /api/profiles` is a true upsert** — if the profile ID exists, it updates; if not found, it inserts (instead of returning 404). This prevents "Error al guardar el perfil" when `profiles.json` is out of sync with localStorage.
- **`handleSendToWhatsApp` sets `contacted: true`** on the lead automatically, so it appears in the ApproachChat contact list.
- **`ApproachChat` reads `pendingMessage` once on change** — the `useEffect` on `pendingMessage` selects the contact phone and fills `inputText`. It does not auto-send.
- **WhatsApp QR popup removed from App-level** — QR is only shown inside `UserProfile` (Detalles del perfil panel). The `WhatsAppQR` component is still used there via `waStatus`/`waQr` props.
- **PlaceDetail no longer owns its overlay** — App.jsx wraps it in `.modal-overlay > .modal-twin`. When `modalMessagePanelOpen` is true the twin renders two cards side by side (PlaceDetail + MessagePanel). Do not add a second `modal-overlay` inside PlaceDetail.
- **MessagePanel is stripped down** — tags, template-name input, and save/delete buttons were removed by design. It only has: template selector, message editor, AI generate, and Send-to-WhatsApp.

## Architecture

### Data Flow (current — Smart Search)
1. User picks business type + location in `SearchPanel` → calls `smartSearch()` in `api.js` → `POST /api/smart-search` (sends `profile` data if available)
2. Backend runs Places nearbysearch (up to 20 results), pre-filters obvious chains and **closed businesses** (`CLOSED_TEMPORARILY / CLOSED_PERMANENTLY`)
3. Place Details fetched in parallel (`asyncio.gather`); **re-filtered** using the more reliable `business_status` from the detail response
4. Social media found via DuckDuckGo site: searches + website scraping (semaphore-limited, 4s timeout)
5. Top 10 by opportunity score sent to Ollama in a single batch call; AI decides who is a prospect, assigns `servicios_sugeridos`, `mensaje_acercamiento`, `estado_operativo`. The Ollama prompt includes the user's profile (profesión, experiencia) to personalize the generated message. The prompt also instructs the AI not to use client names (the user doesn't know them).
6. Step 6 applies a final closed-business filter: discards any result where `estado_operativo` is `cerrado` or `posiblemente_cerrado` (covers cases Ollama catches that Google missed)
7. Results returned; frontend shows **map (top 38%) + 3-column card grid (bottom 62%)** simultaneously
8. Users save leads — synced to backend (`POST /api/leads/{profile_id}`) and cached in `localStorage` key `marketfinder_leads` via `SavedLeads`. Each lead has a `contacted` field (boolean) that tracks whether the user has started outreach.
9. After any `smartSearch()`, phone numbers from saved leads override new results (users may edit a lead's phone in Acercamiento — that edited number is preserved across searches)
10. **WhatsApp chat** — A Node.js sidecar (`backend/whatsapp/server.js`) wraps `whatsapp-web.js` and exposes a WebSocket server on port 11435. The frontend connects via WebSocket to send/receive messages in real-time. Auth is handled via QR code scanning (once, session persists). The `ApproachChat` component is a full two-panel chat interface (contact list + conversation).

### Backend (`backend/main.py`)
Single-file FastAPI app. Key sections:
- **`CHAIN_KEYWORDS` / `CHAIN_TYPES`**: chain detection lists
- **`CLOSED_STATUSES`**: `{"CLOSED_TEMPORARILY", "CLOSED_PERMANENTLY"}` — applied at step 2 (nearbysearch) and step 3 (Place Details re-check)
- **`_classify_website(url)`**: detects if a Google Places `website` field is actually a Facebook/Instagram URL; returns `{sitio_web, facebook_url, instagram_url}`. Prevents social links from counting as a real website.
- **`is_chain()`**: keyword + domain heuristic, returns confidence `alto`/`bajo`
- **`calculate_opportunity_score()`** (0–100): uses `_classify_website()` so only real websites affect the score
- **`parse_place()`**: normalizes raw Places data; calls `_classify_website()`, stores `business_status`, and stashes `_presocial_fb`/`_presocial_ig` for merging in step 4
- **`_fetch_detail()`**: fetches Place Details fields including `business_status`
- **`_social_quick()`**: DuckDuckGo `site:facebook.com` + `site:instagram.com` search per business
- **`_build_batch_messages(summaries, profile=None)`**: single Ollama prompt for up to 10 businesses; includes `business_status` in each summary; expects `{"prospectos":[...]}` wrapper JSON; explicitly instructs AI to discard `CLOSED_TEMPORARILY/PERMANENTLY` businesses. If `profile` is provided (with nombre, profesión, experiencia, etc.), it's injected into the system prompt so the AI personalizes messages. The prompt also instructs the AI not to use client names (the user doesn't know them).
- **`SmartSearchRequest.profile`**: optional `dict` with user profile fields (`tuNombre`, `tuProfesion`, `tuExperiencia`, `tuPortafolio`, `tuMail`, `tuTelefono`) — passed through to Ollama prompt
- **`smart_search` endpoint** (`POST /api/smart-search`): nearbysearch → pre-filter (chains + closed) → details + re-filter closed → social (DuckDuckGo + website scrape) → Ollama batch (includes profile) → discard non-prospects and `cerrado/posiblemente_cerrado` → sort by score
- **`/api/research`**: legacy single-business AI research (used by `PlaceDetail` modal for saved leads)
- **Endpoints**: `GET /api/business-types`, `POST /api/search`, `POST /api/search/paginate`, `GET /api/place/{place_id}`, `GET /api/ollama/status`, `POST /api/research`, `POST /api/smart-search`, `GET /api/profiles`, `POST /api/profiles`, `DELETE /api/profiles/{profile_id}`, `GET /api/leads/{profile_id}`, `POST /api/leads/{profile_id}`, `GET /api/templates`, `POST /api/templates`, `DELETE /api/templates/{id}`, `GET /api/tags`, `POST /api/tags`, `DELETE /api/tags/{id}`, `POST /api/generate-message`, `GET /api/whatsapp/status`

The `langdetect` library detects language inside `parse_place()`. Static files from `backend/static/` are served for SPA routing (`index.html` fallback).

### WhatsApp Service
A Node.js sidecar (`backend/whatsapp/server.js`) wraps `whatsapp-web.js` with `puppeteer-core` (uses system Chrome/Edge) and exposes a WebSocket server on port 11435. Dependencies: `whatsapp-web.js`, `puppeteer-core`, `ws`, `qrcode`.

**WebSocket protocol:**
- Client → Server: `{ type: "send", phone: "521...", message: "..." }`, `{ type: "get-messages", phone: "..." }`, `{ type: "get-chats" }`
- Server → Client: `{ type: "qr", qr: "data:image/png;base64,..." }` (QR as PNG data URI), `{ type: "ready" }` (authenticated), `{ type: "message", from, body, timestamp, fromMe }` (real-time incoming), `{ type: "messages", phone, messages[] }`, `{ type: "chats", chats[] }`, `{ type: "auth-state", state }`

**QR code:** The `qr` event from `whatsapp-web.js` emits a raw text string. `server.js` converts it to a `data:image/png;base64,...` URI via the `qrcode` npm package before broadcasting — this is required because `WhatsAppQR.jsx` renders it as `<img src>`.

**Reconnect:** On `disconnected`, `server.js` calls `createClient()` after 5 s. `createClient()` already calls `client.initialize()` internally — do not call it again after `createClient()` (double-initialize bug).

**Startup:** `main.py` spawns `node server.js` as a subprocess on startup. `run.py` also starts it in production mode. Session persists in `backend/whatsapp/session/` (dev) or `%LOCALAPPDATA%/MarketFinder/whatsapp-session/` (frozen exe) — QR only needed once.

**`get_whatsapp_dir()` resolution order (frozen exe):** `sys._MEIPASS/whatsapp/` → `exe_dir/whatsapp/` → `exe_dir/backend/whatsapp/`. The fallback to `backend/whatsapp/` means the exe works when run from the project root during development.

**Frontend:** `useWhatsApp` hook connects to `ws://127.0.0.1:11435`. `ApproachChat` renders the two-panel UI. `WhatsAppQR` overlay shows the QR code on first auth.

### Smart Search result shape
Each item in `results[]` contains:
```
place_id, nombre, direccion, direccion_completa, coordenadas,
calificacion, total_resenas, telefono, sitio_web, tipos,
business_status,              ← OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
facebook, instagram,          ← null if not found
resenas[],                    ← up to 5 reviews
servicios_sugeridos[],        ← from Ollama (2-4 items)
mensaje_acercamiento,         ← from Ollama, editable in UI
estado_operativo,             ← always "activo" or "desconocido" (closed ones are filtered out)
oportunidad{puntaje,nivel}
```
Only `activo` and `desconocido` businesses reach the frontend — `cerrado` and `posiblemente_cerrado` are discarded server-side.

### Frontend (`frontend/src/`)
State is centralized in `App.jsx`. No external state management library.

| File | Responsibility |
|---|---|
| `App.jsx` | Root state: `center`, `smartResults`, `loading`, `phase`, `savedLeads`, `profile`, `accounts`, `selectedPlace` (for detail modal), `page` (`'search'` | `'leads'`), `resultsCollapsed` (toggles card grid visibility), `leadsSection`, `templates`, `tags`, `messagePanelLead`, `pendingMessage`. Two-page navigation: "Buscar" (sidebar + map + results) and "Leads" (sidebar + content). Shows `OnboardingModal` on first launch. Passes `profile` to `smartSearch()`. Manages multi-account switching, logout, delete. Loads/syncs leads with backend via `loadLeads`/`syncLeads`. `handleViewDetail`/`handleViewSmartResult` use saved/result data directly, with a fallback to `fetchPlaceDetail` + `researchWithAI` for non-saved leads. After `smartSearch()`, phone numbers from saved leads with edits override new results. Destructures `getMessages: waGetMessages` from `useWhatsApp` and passes it as `onWAGetMessages` to `LeadsPage`. |
| `api.js` | Fetch wrapper: `fetchBusinessTypes`, `smartSearch`, `fetchPlaceDetail`, `researchWithAI`, `fetchProfiles`, `saveProfile`, `deleteProfile`, `fetchLeads`, `saveLeads`, `fetchTemplates`, `saveTemplate`, `deleteTemplate`, `fetchTags`, `saveTag`, `deleteTag`, `generateMessage`. `smartSearch()` sends `profile` data to backend. Legacy/unused: `searchPlaces()`, `paginateSearch()` (from old `POST /api/search` flow). |
| `components/SearchPanel.jsx` | Business type selector, radius slider, location display |
| `components/SmartResultCard.jsx` | Prospect card: name/status, contact info, address→Google Maps link, social pills, reviews, service tags. Clicking the card opens `PlaceDetail` modal. |
| `components/MapView.jsx` | Leaflet map with draggable center marker + radius circle + result markers |
| `components/LeadsPage.jsx` | Main container for the Leads section. Sidebar with sections (Detalles del perfil, Prospectos, Acercamiento, Mensajes) + content area. Sidebar collapses on mobile with hamburger toggle. Sections defined as an array for easy extension. Passes `onUpdateLeadPhone` and `onWAGetMessages` (both from `App.jsx`) down to `ApproachChat`. Also passes `waStatus`/`waQr` to `UserProfile` for the QR panel in Detalles del perfil. |
| `components/SavedLeads.jsx` | Reads/manages leads from state, opens `PlaceDetail` modal. Each card shows contacted toggle (○/✓) and badge "Contactado ✓". |
| `components/ApproachChat.jsx` | Full two-panel WhatsApp chat client. Left: contact list from leads with `contacted === true`, synced with `waChats`. Right: conversation view with real-time chat bubbles (sent/received via WebSocket), message input, send button, inline phone editing. Key behaviors: (1) `handleSavePhone` updates `selectedPhone` to the new numeric value so the conversation stays visible after a phone edit. (2) A `useEffect` on `selectedPhone` calls `onGetMessages(phone)` to fetch message history from the WhatsApp service whenever the active contact changes. Uses `whatsapp-web.js` behind the scenes — messages are sent/received within the app, no external redirect. |
| `components/PlaceDetail.jsx` | Detail modal for any lead (smart result or saved): reviews, AI data, editable outreach message with Copy + WhatsApp. Has "✏️ Planear mensaje" button that opens `MessagePanel` sidebar. Shows "Contactado ✓" badge if lead is contacted. |
| `components/UserProfile.jsx` | Edits profile (6 fields: nombre, profesión, experiencia, portafolio, mail, teléfono), lists accounts for switching, logout, delete |
| `components/OnboardingModal.jsx` | Full-screen blocker on first launch. Collects all 6 profile fields. Cannot be dismissed without saving. Supports `new` and `add` modes for first-time vs. additional account creation. |
| `components/MessageStudio.jsx` | Full message template management — two-panel layout. Left: searchable, tag-filterable template list. Right: editor with name input, `MessageEditor`, tag selector, AI generation, save/delete. |
| `components/MessagePanel.jsx` | Slide-in overlay panel next to `PlaceDetail`. Template selector, tag filter, AI generation, text editor. "📤 Enviar a WhatsApp" saves the message to the lead and navigates to Acercamiento. |
| `components/MessageEditor.jsx` | Shared text editor with placeholder insertion dropdown (`[Negocio]`, `[Tu Nombre]`, etc.) and character count. |
| `components/TagManager.jsx` | Modal overlay for creating/editing/deleting tags with color picker. |
| `components/WhatsAppQR.jsx` | Modal overlay showing the QR code for WhatsApp Web auth. Displays steps to scan. Auto-closes when status is `ready`. |
| `hooks/useWhatsApp.js` | Custom hook managing the WebSocket connection to the WhatsApp service. Returns `status`, `qr`, `messagesByChat`, `chats`, `sendMessage()`, `getMessages()`, `refreshChats()`, `reconnect`. Auto-reconnects on disconnect with 5s delay. `sendMessage()` does an **optimistic update** — appends the message to `messagesByChat[phone]` immediately (with a temp id) before the WebSocket response, so the UI updates instantly. |
| `messages.js` | Three exports: `TYPE_LABELS` (maps business-type IDs → Spanish display names), `MESSAGE_BANK` (array of ~20 pre-written outreach templates), and `fillMessage(template, place, profile)` (replaces `[Negocio]`, `[Tu Nombre]`, `[Tu Profesión]`, etc. with live values). Called client-side — no backend involvement. |
| `components/ErrorBoundary.jsx` | Standard React error boundary. Wraps the app root in `main.jsx` to catch render errors. |
| `components/ResultsList.jsx` | **Legacy/unused** — older card list for the `POST /api/search` flow. Not imported anymore. |

### Layout
The app has two-page navigation (header buttons: "Buscar" / "Leads").

**Search page** — When results exist the main area (`map-area`) shows a **split view**:
- **Top 38%**: `split-map` — Leaflet map with prospect markers
- **Bottom 62%**: `split-results` — scrollable 3-column card grid

When no results: full-width map only. Loading state: centered spinner with phase label.

**Leads page** — Full-page sidebar + content layout. Sidebar has sections (Detalles del perfil, Prospectos, Acercamiento, Mensajes). Collapses on mobile with hamburger toggle.

The `split-view` uses `position: absolute; inset: 0; flex-direction: column` so both halves fill the parent correctly without relying on percentage height chains.

### CSS height chain (important)
`.map-area` has `position: relative` which establishes the containing block. `.smart-loading` and `.split-view` use `position: absolute; inset: 0` to fill it. `.split-results` uses `flex: 1; min-height: 0` and `.smart-cards-grid` uses `flex: 1; min-height: 0; overflow-y: auto`.

**Card height rules:**
- Cards (`smart-card`) must NOT have `overflow: hidden` — it collapses grid row height to ~76px (the header only).
- `.smart-cards-grid` uses the default `align-items: stretch` so all cards in a row are the same height.
- Address links in cards use `https://www.google.com/maps/place/?q=place_id:{place_id}` for direct Google Maps navigation.

**ApproachChat layout:** `.approach-chat` uses `flex-direction: row` (explicit) so the contact sidebar and chat main area sit side by side. Do NOT add a second `.approach-chat` block anywhere in `App.css` — a duplicate with `flex-direction: column` (from the old design) would silently override the row layout since `flex-direction` would only be set in the first rule and not overridden by the second.

### Profile System
Profiles persist on the backend via JSON file (`backend/profiles/profiles.json`) so they survive app restarts (the desktop browser uses a persistent profile dir in `%LOCALAPPDATA%/MarketFinder/browser-profile/` but localStorage is still temporary). localStorage stores the active account ID as a cache.

**Fields (6):**
| Key | Label | Required |
|---|---|---|
| `tuNombre` | Tu nombre | ✓ |
| `tuProfesion` | Tu profesión | ✓ |
| `tuExperiencia` | Experiencia de trabajo | |
| `tuPortafolio` | Portafolio / Sitio web | |
| `tuMail` | Correo electrónico | |
| `tuTelefono` | Teléfono / WhatsApp | |

**Multi-account endpoints:**
| Endpoint | Method | Description |
|---|---|---|
| `/api/profiles` | GET | Returns array of all saved profiles |
| `/api/profiles` | POST | Creates new (no `id`) or updates existing (with `id`) profile. Returns saved profile. |
| `/api/profiles/{id}` | DELETE | Deletes a profile by ID |

**Onboarding flow:**
- First launch → `App.jsx` calls `GET /api/profiles` → if empty, shows `OnboardingModal` (blocking, no dismiss without saving)
- After saving → `POST /api/profiles` → modal closes → profile in state + localStorage
- Subsequent launches → loads profiles from backend, restores last active from `localStorage.marketfinder_active_id`
- "Cerrar sesión" → clears active profile, shows onboarding
- "Cambiar de cuenta" → switches to another profile from the list
- "Agregar cuenta" → shows onboarding in `add` mode, saves as new profile
- "Borrar cuenta" → `DELETE /api/profiles/{id}`, switches to another or shows onboarding
- Profile is sent to `POST /api/smart-search` → backend passes it to Ollama → AI generates personalized `mensaje_acercamiento` considering user's profession and experience
- `fillMessage()` in `messages.js` replaces placeholders (`[Tu Profesión]`, `[Tu Experiencia]`, etc.) in message templates client-side. Messages are **impersonal** — no `[Nombre]` placeholder since the user doesn't know the client's name.

**`UserProfile.jsx`** (full-page panel): shows edit form for the 6 fields, lists other accounts for quick switching, and has buttons for: Agregar cuenta, Cerrar sesión, Borrar cuenta (with confirmation).

### Leads Persistence
Leads are persisted per-profile on the backend (`backend/leads/leads.json`) so they survive app restarts (temporary browser user-data dir destroys localStorage on close).

| Endpoint | Method | Description |
|---|---|---|
| `/api/leads/{profile_id}` | GET | Returns lead array for the profile |
| `/api/leads/{profile_id}` | POST | Replaces the lead array for the profile |

**Flow:**
- On mount (after profile loads): `loadLeads(profile.id)` → `GET /api/leads/{id}` → sets state + localStorage cache
- On save/remove lead: updates state + localStorage + calls `POST /api/leads/{id}` with the full array
- On account switch: `loadLeads(newProfile.id)` fetches that profile's leads
- On clear all: syncs empty array to backend
- localStorage key: `marketfinder_leads` (fallback cache if backend unreachable)

### Environment
`backend/.env` (or root `.env`) must contain:
```
GOOGLE_MAPS_API_KEY=...
OLLAMA_HOST=http://localhost:11434   # optional, this is the default
OLLAMA_MODEL=qwen2.5:7b             # optional, this is the default
```
Backend uses a multi-path env loader: tries script dir → cwd → `backend/` subdir → PyInstaller frozen exe dir.

### Desktop Distribution
`run.py` + PyInstaller produce `MarketFinder.exe`. The launcher suppresses all logs, attempts to start Ollama in a background thread, finds an available browser (Edge > Chrome > Firefox), and opens the app as a pseudo-desktop window via `--app=` flag (kiosk-style). A persistent browser profile is stored in `%LOCALAPPDATA%/MarketFinder/browser-profile/` so the same window is reused across sessions (not a new browser each time) and settings are preserved.
