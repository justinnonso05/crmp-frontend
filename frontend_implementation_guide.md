# Frontend Implementation & Synchronization Guide

This guide details the step-by-step implementation plan to build the remaining modules of the **Collaborative Research Management Platform (CRMP)** frontend and connect it with the backend API and Socket.io server.

---

## 🛠️ Architecture & Setup Tasks

- [x] **1. Install Dependencies**
  - Install dependencies required for state management, styling icons, and WebSocket synchronization.
  - **Command**: `npm install socket.io-client lucide-react jwt-decode`
  - **Dev Command**: `npm install -D @types/socket.io-client`

- [x] **2. Environment Variables Setup**
  - Create `c:/Projects/CRE/.env.local` to define backend URLs.
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3000
  NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
  ```

- [x] **3. Axios/Fetch Client Wrapper** — `src/lib/api.ts` + `src/lib/endpoints.ts` created
  - Implement `src/lib/api.ts` to attach JWT authorization headers dynamically to all requests.
  - Must intercept `401` errors and redirect users to `/login`.

- [x] **4. Socket.io Client Setup** — `src/lib/socket.ts` created
  - Implement `src/lib/socket.ts` to manage a single shared connection to the backend Socket.io workspace.

---

## 🔐 Module A: Authentication & Security

- [x] **1. Register Page (`src/app/(auth)/register/page.tsx`)** — created
  - Implement registration form matching the backend expected fields: `email`, `password`, `firstName`, `lastName`.
  - Add user feedback (errors for duplicate email, passwords too short).

- [x] **2. Login Page (`src/app/(auth)/login/page.tsx`)** — created
  - Implement login form sending `email` and `password` to `POST /api/auth/login`.
  - Store the returned JWT token securely in `localStorage` or cookies.

- [ ] **3. Auth Route Protection** — middleware to guard /dashboard, /projects/[id]/*, /settings
  - Protect routes: `/dashboard`, `/projects/[id]/*`, and `/settings` must redirect unauthenticated users back to `/login`.

---

## 📊 Module B: Centralized Project Dashboard

- [x] **1. Dashboard Page (`src/app/(dashboard)/dashboard/page.tsx`)** — created
  - Fetch user-assigned projects using `GET /api/projects`.
  - Display project cards highlighting title, description, and status tags (`ACTIVE`, `COMPLETED`, `ARCHIVED`).
  - Provide a "Create Project" modal (PI role allowed) hitting `POST /api/projects`.

- [x] **2. Global Activity Feed Component** — Socket.io `receive-activity` listener built into dashboard page
  - Create a side panel or card section displaying the real-time activity log.
  - Connect to Socket.io namespace and join project rooms using event `join-project` on mounts.
  - Listen to `receive-activity` socket events to update the feed on the fly without refreshing.

---

## 📁 Module C: Project Workspace & Detail View

- [x] **1. Project Workspace Detail (`src/app/projects/[id]/page.tsx`)** — created with tabbed layout
  - Fetch detailed project information (`GET /api/projects/:id`), returning:
    - Member list (PI, CO_INVESTIGATOR, ASSISTANT, REVIEWER).
    - Task list.
  - Render action tabs: **Milestones/Tasks**, **Document Editor**, **Surveys**, and **Outputs**.

- [x] **2. Team Member invites (PI role only)** — Add member modal in Members tab
  - UI form inputting User ID (or email search) and Role enum, sending to `POST /api/projects/:id/members`.

- [x] **3. Task Board & Milestone Manager** — task list with toggle + socket broadcast
  - Render list of tasks.
  - Add task creation modal (PI and Co-Investigators only) hitting `POST /api/projects/:id/tasks`.
  - Checkbox toggle to update task completion using `PATCH /api/tasks/:taskId/status` (notifying members via socket `broadcast-activity`).

---

## ✍️ Module D: Real-Time Collaborative Editor

- [ ] **1. Document Annotation Workspace (`src/app/projects/[id]/editor/page.tsx`)**
  - Must be a `"use client"` component.
  - Render text area or rich text editor (e.g., Quill or simple text synchronizer).
  - Socket integration checklist:
    - On mount: Send `join-document` socket event with `documentId` and `userId`.
    - On unmount: Send `leave-document` socket event.
    - Typing changes: Catch editor changes and emit `send-changes` with content deltas.
    - Receiving updates: Listen to `receive-changes` to update local document state instantly.
    - Mouse movement: Track cursor coordinates or active lines and emit `cursor-move`, while listening to `cursor-update` to render active user cursors.

---

## 📋 Module E: Drag-and-Drop Survey Builder

- [ ] **1. Survey Management Workspace (`src/app/projects/[id]/surveys/page.tsx`)**
  - Interface to display active surveys.
  - Include a visually beautiful Drag-and-Drop Survey builder for PIs and Co-Investigators.
  - Save survey configuration (JSON schemas containing input fields like text, radio, checkbox) by hitting `POST /api/projects/:id/surveys`.

- [ ] **2. Survey Participation / Responses View**
  - Accessible link to fill out the survey.
  - Form rendering logic reading the JSON schema dynamically.
  - Submit replies to `POST /api/surveys/:surveyId/responses` (referencing backend schema).

---

## 🎓 Module F: Research Outputs & Ethics Log

- [ ] **1. Outputs & Citation Feed (`src/app/projects/[id]/outputs/page.tsx`)**
  - List recorded publications and research results.
  - File upload component using backend route `POST /api/upload` (multipart form).
  - Output addition form logging type (`JOURNAL`, `CONFERENCE`, `REPORT`) and citation data, hitting `POST /api/projects/:id/outputs`.
  - Ethical clearance status badge/updater (PI role only) using `PUT /api/projects/:id/ethics`.

---

## ⚙️ Module G: Profile & Notification Settings

- [ ] **1. Settings Workspace (`src/app/settings/page.tsx`)**
  - Display personal details (First Name, Last Name, Email).
  - Profile customization interface matching design token styling.
