# Frontend Product Requirements Document (PRD)

**Project:** Collaborative Research Management Platform (CRMP) - 
**Platform Type:** Centralized, Multi-tenant Web Application
**Frontend Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, SignalR Client

---

## 1. Product Overview

The frontend of the CRMP provides a unified, accessible, and frictionless user interface tailored to the academic research lifecycle. By leveraging Next.js, the application benefits from Server-Side Rendering (SSR) for faster initial loads and optimized routing, replacing fragmented generic tools with a purpose-built, high-performance workspace.

## 2. User Roles & Interface Access (RBAC)

The UI must dynamically render components and restrict views based on the authenticated user's assigned role.

* **Principal Investigator (PI):** Full administrative access to create projects, assign roles, approve outputs, and oversee compliance.
* **Co-Investigator:** High-level access for collaborative editing, dataset management, and survey building.
* **Research Assistant / Student:** Execution-level access for data upload, task completion, and document drafting.
* **Reviewer:** Read-only access with specific permissions granted for document annotation and commenting.

---

## 3. Application Architecture & Routing (Next.js App Router)

The frontend will utilize the Next.js App Router (`/app` directory) for clean layout management and nested routing.

| Route Path | File Structure | Rendering Strategy | Description |
| --- | --- | --- | --- |
| `/login` | `app/(auth)/login/page.tsx` | Static | Standard email/password authentication. |
| `/register` | `app/(auth)/register/page.tsx` | Static | Account creation with role selection. |
| `/dashboard` | `app/(dashboard)/page.tsx` | Server/Client | Grid view of assigned projects and global activity feed. |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | Server-rendered | Project-specific overview, task list, and team members. |
| `/projects/[id]/editor` | `app/projects/[id]/editor/page.tsx` | Client Component | SignalR-backed real-time document annotation workspace. |
| `/projects/[id]/surveys` | `app/projects/[id]/surveys/page.tsx` | Client Component | Interface to design forms and view collected responses. |
| `/projects/[id]/outputs` | `app/projects/[id]/outputs/page.tsx` | Server/Client | Forms to log journal articles and ethical compliance. |
| `/settings` | `app/settings/page.tsx` | Client Component | Profile management and notification preferences. |

---

## 4. Core Frontend Modules & Features

### Authentication & Role Selection

* **UI Requirements:** Clean, focused interface for secure login and registration.
* **Core Logic:** NextAuth.js or custom JWT management via HTTP-only cookies. Clear mechanism for selecting or assigning roles upon project creation or team invitation.

### Centralized Project Dashboard

* **UI Requirements:** A unified main screen displaying active projects with a focus on data clarity.
* **Core Logic:** Must feature a Real-Time Activity Feed that aggregates actions from all connected team members instantly using Server-Sent Events (SSE) or WebSockets.

### Real-Time Collaborative Editor

* **UI Requirements:** A workspace interface supporting live document annotation.
* **Core Logic:** Must strictly operate as a Client Component (`"use client"`) to utilize SignalR. Visually renders real-time, instantaneous updates and cursors from multiple users, eliminating version conflicts.

### Survey Builder UI

* **UI Requirements:** An integrated, visually intuitive drag-and-drop form builder.
* **Core Logic:** Automated state management to link collected participant responses directly to the project's centralized PostgreSQL dataset via the backend API.

### Task & Milestone Manager

* **UI Requirements:** Interactive visual tracking for assigning tasks and monitoring progress.
* **Core Logic:** Displays upcoming deadlines and pushes visual deadline notifications to the relevant users.

---

## 5. UX/UI & Aesthetics

To successfully validate the prototype and ensure high adoption rates among academic users, the frontend design must adhere to strict visual and performance guidelines.

* **Design System:** A modern, minimalistic aesthetic strictly avoiding gradients or complex visual clutter.
* **Color Palette:** A high-contrast dark mode theme utilizing deep black backgrounds, navy blue structural elements, and violet accents for interactive components and highlights.
* **Usability Standard:** The interface must achieve a System Usability Scale (SUS) mean score exceeding 68 during user testing.
* **Responsiveness:** Tailwind CSS must be implemented to ensure accessibility and clarity across diverse screen sizes, prioritizing readability.
* **Latency Handling:** Optimistic UI updates should be employed alongside Next.js loading UI (`loading.tsx`) to ensure real-time features feel completely seamless, masking any API response times near the 200ms threshold.

---

## 6. Out of Scope (For Current Iteration)

* Third-party API integrations (e.g., ORCID).
* Native Mobile Application support (React Native is excluded; focus remains on responsive web).
* Full multi-institutional deployment features.