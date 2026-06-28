# Frontend Product Requirements Document (PRD)

**Project:** Collaborative Research Management Platform (CRMP) - 
**Platform Type:** Centralized, Multi-tenant Web Application
**Frontend Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, SignalR Client

---

## 1. Product Overview

The frontend of the CRMP provides a unified, accessible, and frictionless user interface tailored to the academic research lifecycle. By leveraging Next.js, the application benefits from Server-Side Rendering (SSR) for faster initial loads and optimized routing, replacing fragmented generic tools with a purpose-built, high-performance workspace.
It enforces strict university tenancy while enabling a secure, discovery-based ecosystem for researchers to find projects and apply for collaboration.

## 2. User Roles & Interface Access (RBAC)

The UI must dynamically render components and restrict views based on the authenticated user's assigned role.

* **Principal Investigator (PI):** Creates and manages the project, invites team members, submits the proposal and final report, and oversees the entire research.
* **Co-Investigator:** Collaborates with the PI, contributes to literature review, data collection, analysis, and report writing, and can edit research documents.
* **Research Assistant / Student:** Uploads references and datasets, conducts literature searches, collects and organizes data, and assists with formatting. Cannot submit or approve the project.
* **Reviewer/Supervisor:** Reviews the proposal, approves or requests revisions, reviews the final submission, and issues the final certification/approval.

---

## 3. Application Architecture & Routing (Next.js App Router)

The frontend will utilize the Next.js App Router (`/app` directory) for clean layout management and nested routing.

| Route Path | File Structure | Rendering Strategy | Description |
| --- | --- | --- | --- |
| Route Path | File Structure | Rendering Strategy | Description |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | Server/Client | Landing page with university-scoped project discovery search. |
| `/login` | `app/(auth)/login/page.tsx` | Server/Client | Standard email/password authentication. |
| `/register` | `app/(auth)/register/page.tsx` | Server/Client | Account creation with University, Faculty, and Department selection. |
| `/dashboard` | `app/(dashboard)/page.tsx` | Server/Client | Grid view of assigned projects, University Project Discovery UI, and real-time activity feed. |
| `/projects/[id]` | `app/projects/[id]/page.tsx` | Server/Client | Project workspace featuring a unified 10-stage lifecycle UI, dynamic stage guides/recommendations, task list, and team members. |
| `/projects/[id]/proposal` | `app/projects/[id]/proposal/page.tsx` | Server/Client | Dedicated interface to collaboratively edit or upload the project proposal and submit for review. |
| `/projects/[id]/editor` | `app/projects/[id]/editor/page.tsx` | Client Component | Socket-backed real-time document annotation workspace. |
| `/projects/[id]/surveys` | `app/projects/[id]/surveys/page.tsx` | Client Component | Interface to design forms and view collected responses. |
| `/projects/[id]/outputs` | `app/projects/[id]/outputs/page.tsx` | Server/Client | Forms to log journal articles and research outputs. |
| `/reviewer` | `app/reviewer/page.tsx` | Server/Client | Dedicated queue for Reviewers to evaluate submitted proposals. |

---

## 4. Core Frontend Modules & Features

### Authentication & Tenancy
* **UI Requirements:** Clean interface for secure login and registration. Registration requires selecting University, Faculty, and Department (populated via JSON lookup).
* **Core Logic:** NextAuth.js or custom JWT management. On successful registration, users are automatically routed to the dashboard without needing to re-login.

### Project Discovery & Applications
* **UI Requirements:** Landing page search with animations returning project counts. Dashboard "Discover" section showing `UNIVERSITY_VISIBLE` projects.
* **Core Logic:** Users can click "Apply to Collaborate" and select a role. PIs can approve requests to instantly add the user to the project, triggering real-time updates and emails.

### Unified Lifecycle & Stage Guides
* **UI Requirements:** A unified 10-stage timeline on the project page. When specific stages (like Literature Review, Report Writing) are active, contextual recommendations based on the CSC 476 syllabus are rendered to guide researchers.

### Proposal Submission & Review
* **UI Requirements:** A dedicated workflow where teams can either collaboratively write or upload a proposal. Includes a Reviewer Dashboard for supervisors to approve or reject submissions.

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