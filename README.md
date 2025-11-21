# Ad Console — README

This repository contains the Ad Console front-end application — a React app (Create React App) used to manage content, playlists and devices for digital signage.

**Primary goals:**
- Provide a compact admin UI to create and assign playlists.
- Manage devices, device-store mapping and monitor displays.
- Support scheduled/time-based triggers (and extensible trigger types).

**Tech stack:**
- React (Create React App)
- React Bootstrap + react-select
- IndexedDB (local browser DB) for persistence (`services/indexeddb.js`)
- Mock WebSocket / Mock backend utilities for development (`services/mockBackend.js`, `services/mockWebSocket.js`)

**Repository layout (key files & folders):**
- `src/`: application source
	- `components/`: reusable React components (Sidebar, Navbar, Cards, Simulators)
	- `pages/`: page-level views (AssignContent, ContentLibrary, DeviceManagement, Monitor, etc.)
	- `services/`: IndexedDB helpers, mock backend and websocket helpers
	- `data/`: sample/mock data (e.g. `storeList.js`)
	- `context/`: app-level context and providers (`AppContext.js`)
	- `utils/`: helper utilities
- `public/` and `build/`: static and build output
- `netlify.toml`: Netlify deployment hints (project includes Netlify configuration)

**How the app works — high level flow**
- User logs in (if auth is added) and navigates the admin console UI.
- Main flows:
	- Create playlists (`pages/AssignContent/AssignContent.jsx`): select content, set territory, scheduling/trigger options and assign to stores.
	- Manage content (`pages/ContentLibrary`): upload, preview, and organize media.
	- Device management (`pages/DeviceManagement`): add displays, map to stores, pair devices.
	- Monitor (`pages/Monitor`): view live preview/status of devices.

	**Data flow & persistence**
	- The app stores playlists, content metadata and device info in an IndexedDB database via `services/indexeddb.js`.
	- For development/demo, the project includes `services/mockBackend.js` and `services/mockWebSocket.js` to simulate server APIs and live device connections.
	- When a playlist is saved, it is written to the `playlists` ObjectStore (see `PLAYLIST_STORE` constant in `AssignContent.jsx`).

	**Playlist / Trigger design**
	- Playlists can be of type `regular` or `trigger`.
	- For `trigger` playlists the UI now shows a Trigger Type dropdown first (e.g. "Time-based trigger"). Only after selecting a trigger subtype (like `time`) are the time-related controls (interval, start/stop) shown. This keeps the model extensible for future trigger types (sensor/event).

	**Key components**
	- `src/components/common/AsideBar/AsideBar.jsx` — left nav with collapsed/expanded states; logo now uses an image for the brand.
	- `src/pages/AssignContent/AssignContent.jsx` — main playlist creation UI; handles validation, prefill for edit/clone flows and saving to IndexedDB.
	- `src/services/indexeddb.js` — IndexedDB helpers used across pages to persist playlists and content.

	**Development / Running locally**
	- Install dependencies and start the dev server:

	```powershell
	npm install
	npm start
	```

	- App will be available at `http://localhost:3000` by default.

	**Build / Deployment**
	- Create a production build:

	```powershell
	npm run build
	```

	- The `build/` folder is ready for static hosting. The project contains a `netlify.toml` file for deploying on Netlify; you can drag the build output to another static host if required.

	**Testing**
	- The project includes React test scaffolding. Run tests using:

	```powershell
	npm test
	```
**Notable behaviors & validations**
- Trigger interval: when using time-based triggers the interval is enforced to be >= 5 and rounded down to the nearest multiple of 5.
- Time window: the Start time must be strictly earlier than Stop (no crossing midnight allowed). The UI shows inline validation messages for invalid time windows.
- When editing an approved playlist, saving creates a draft instead of overwriting the approved record (the code sets `draftOf` / `disabledWhileEditing` fields accordingly).

**Local assets recommendation**
- In development we reference some images via external URLs. For production reliability, add images to `src/assets/images/` and import them (e.g. `import logo from 'src/assets/images/logo.png'`) so bundling includes them and avoids external network dependencies.

**Troubleshooting**
- If the dev server fails to start, run `npm install` then `npm start` and check the terminal for missing dependencies.
- IndexedDB errors generally mean schema mismatch — clear site data in the browser (Application → Clear Storage) while developing schema changes.

**Contributing / Next steps**
- Add unit tests for critical flows (AssignContent trigger validations, IndexedDB helpers).
- Implement real backend APIs and replace mock services in `services/` when a server is available.
- Add feature flags for trigger subtypes and implement sensor/event trigger UI when devices provide telemetry.

**Useful paths**
- App entry: `src/index.js`
- Playlist UI: `src/pages/AssignContent/AssignContent.jsx`
- IndexedDB helpers: `src/services/indexeddb.js`
- Mock backend: `src/services/mockBackend.js`
- Sidebar component: `src/components/common/AsideBar/AsideBar.jsx`

---

If you'd like, I can also:
- Generate a short architecture diagram or a developer quick-start checklist.
- Add a CONTRIBUTING.md and a PR template.

## Detailed Project Explanation and Diagrams

The following sections explain how this project is structured, how the main flows operate, and why certain design decisions (like IndexedDB and mock services) were made. The diagrams use Mermaid markup which renders on GitHub and many editors. If your editor doesn't render Mermaid, you can use online Mermaid live editors.

### 1) High-level architecture

This diagram describes the main runtime components and how they interact at a high level.

```mermaid
graph LR
	Browser[Browser: User UI] -->|React App| UI[React SPA]
	UI -->|IndexedDB read/write| DB[(IndexedDB)]
	UI -->|API calls (mock)| MockBackend[Mock Backend]
	MockBackend -->|notify| MockWebSocket[Mock WebSocket]
	MockWebSocket -->|emits| DeviceSimulator[Device / Simulator (Monitor & DisplayPlayer)]
	UI -->|Routes / Page components| Pages[AssignContent, ContentLibrary, Monitor, DeviceManagement]
```

Notes:
- The app is a client-side React Single Page App (SPA). For development and demo, it uses local mock services and local persistence in IndexedDB.
- `MockBackend` and `MockWebSocket` simulate server API behavior and streaming push notifications to devices.

### 2) Component and page relationship

This diagram shows the major components and where they are used in the page structure.

```mermaid
graph TD
	App[App (index.js)] --> Navbar
	App --> AsideBar
	App --> Router
	Router --> AssignContent[AssignContent Page]
	Router --> ContentLibrary[ContentLibrary Page]
	Router --> DeviceManagement[Device Management Page]
	AssignContent -->|Uses| FormComponents[Form Controls (react-select / Bootstrap)]
	AssignContent -->|Uses| PlaylistPreview[ScreenSimulator / SlideshowPlayer]
	ContentLibrary -->|Uses| CardComponents[ContentCard, List]
	DeviceManagement -->|Uses| DeviceComponents
```

### 3) Playlist lifecycle (data flow)

This sequence diagram shows a typical playlist creation and assignment flow with validation and save.

```mermaid
sequenceDiagram
	participant U as User
	participant B as Browser UI
	participant DB as IndexedDB
	participant MB as Mock Backend
	participant WS as Mock WebSocket
	participant D as Device

	U->>B: Open 'Create Playlist'
	U->>B: Fill form (name, content items, territory)
	B->>B: Validate inputs (playlist name, territory, time window if trigger)
	opt Time validation OK
		B->>DB: Save playlist (playlists store)
		DB-->>B: return id
		B->>MB: Notify backend of new playlist (mock)
		MB->>WS: Publish to WebSocket for devices
		WS->>D: Device receives update
		D-->>B: Device status (via WebSocket) for Monitor page
	else Time validation fails
		B-->>U: Show validation error message
	end
```

### 4) Trigger subtype and conditional UI behavior (time-based triggers)

Key points:
- When a playlist is `trigger` type, the UI shows a dropdown to select the trigger subtype (e.g., `time`).
- Only if the subtype is `time` do the UI controls for interval `triggerInterval` and Start/Stop times appear.
- Validation applies only for the time-based subtype: Start must be earlier than Stop and the interval must be at least 5 minutes.

### 5) Important files and roles

- `src/pages/AssignContent/AssignContent.jsx` — core page for creating playlists; handles:
	- Form inputs and validation
	- Trigger subtype logic and validation of time windows
	- Prefill logic for edit/clone flows and `view` permission
	- Save flow that writes to IndexedDB and optionally notifies mock backend
- `src/services/indexeddb.js` — wrapper functions for a simple IndexedDB interface; used across the app to persist and read content and playlists
- `src/services/mockBackend.js` — simulated backend API handlers used during development
- `src/services/mockWebSocket.js` — provides a WebSocket-like interface to send updates to device simulators
- `src/components/common/AsideBar/AsideBar.jsx` — site sidebar and navigation (collapsible)
- `src/components/common/Navbar/Navbar.jsx` — top bar (branding, user actions)

### 6) Common patterns and design decisions

- Use IndexedDB for local persistence to simulate real backend data and to make the developer experience offline-friendly.
- Mock backend and mock WebSocket provide realistic interactions so front-end workflows can be tested without a remote server.
- The app uses `react-select` for rich selects and `react-bootstrap` for general UI layout and components.
- Trigger subtype design allows adding more trigger types (e.g. `sensor`, `event`) later without major UI changes.

### 7) Device simulation / Monitor

- `src/pages/DisplayPlayer` and `src/components/ScreenSimulator` / `SlideshowPlayer` provide preview UI and simulated playback. These rely on the mock WebSocket to receive updates that would otherwise come from a real backend.

### 8) Developer workflow

- Start dev server:
```powershell
npm install
npm start
```
- Running the dev server serves the React app and provides hot-reload for UI changes.
- Tests: `npm test`, Build for production: `npm run build`.

---

If you’d like, I can also:
- Add SVG or PNG diagrams under `docs/` for non-Mermaid rendering editors
- Convert the Mermaid diagrams into PNG or SVG files and commit them under a new `docs/` folder
- Add a developer quick-start checklist for contribution and debugging common issues




