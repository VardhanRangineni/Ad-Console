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
