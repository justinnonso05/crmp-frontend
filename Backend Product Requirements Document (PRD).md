# Backend Product Requirements Document (PRD)

**Project:** Collaborative Research Management Platform (CRMP) - Group 11
**Platform Type:** Centralized, Multi-tenant Web Application


**Backend Tech Stack:** Node.js (Express), TypeScript, Prisma ORM, Socket.io, PostgreSQL **Architecture:** Modular Monolith (Microservices-ready), Clean Architecture 

---

## 1. Product Overview

The backend of the CRMP is engineered to securely manage the academic research lifecycle, process real-time collaboration events, and ensure data integrity across the platform. It serves as a decoupled, stateless REST API that powers the Next.js frontend, replacing fragmented institutional workflows with a unified, high-performance ecosystem.

## 2. Architecture & Infrastructure

The backend adheres to a modular structure to ensure scalability, making it easy to split into distinct microservices if deployed at a larger institutional scale later.

* **Clean Architecture Strategy:** Strict separation of concerns across Routes, Controllers, Services, and Data Access layers.
* **Stateless API Layer:** All REST endpoints must remain stateless, utilizing JWTs for session management to support horizontal scaling.
* 
**Containerization:** The Node.js application and PostgreSQL database must be fully containerized using Docker to guarantee parity across local, staging, and production environments.


* **ORM:** Prisma will be used to enforce type safety between the TypeScript backend and the PostgreSQL database.

---

## 3. Code Structure (Node.js + TypeScript)

The application follows a feature-based directory structure for maximum maintainability.

```text
CRMP-Backend/
├── prisma/
│   ├── schema.prisma          # Database schema and relations
│   └── migrations/            # Auto-generated SQL migrations
├── src/
│   ├── config/                # Environment variables, database connection config
│   ├── controllers/           # Route handlers (req, res logic)
│   │   ├── AuthController.ts
│   │   ├── ProjectController.ts
│   │   └── SurveyController.ts
│   ├── middlewares/           # Global logic
│   │   ├── authMiddleware.ts  # JWT verification
│   │   ├── rbacMiddleware.ts  # Role-Based Access Control logic
│   │   └── errorHandler.ts    # Global error handling
│   ├── routes/                # API route definitions
│   │   ├── authRoutes.ts
│   │   ├── projectRoutes.ts
│   │   └── documentRoutes.ts
│   ├── services/              # Core business logic and database queries
│   │   ├── AuthService.ts
│   │   ├── DocumentService.ts
│   │   └── OutputService.ts
│   ├── sockets/               # Real-time WebSockets event handlers
│   │   └── collaborationHandler.ts
│   ├── utils/                 # Helper functions (password hashing, validators)
│   └── server.ts              # Entry point, Express app initialization
├── Dockerfile
├── package.json
└── tsconfig.json

```

---

## 4. Database Schema Requirements (PostgreSQL via Prisma)

The relational database must be optimized for data integrity and complex academic queries. All schemas are normalized to the Third Normal Form (3NF).

* **User:** `id`, `email`, `passwordHash`, `firstName`, `lastName`, `createdAt`, `updatedAt`.
* **Project:** `id`, `title`, `description`, `status`, `ethicalClearanceStatus`, `createdAt`.
* 
**ProjectMember:** (Join Table) `projectId`, `userId`, `role` (Enum: PI, Co-Investigator, Assistant, Reviewer).


* **Task:** `id`, `projectId`, `assignedUserId`, `title`, `dueDate`, `isCompleted`.
* **Document:** `id`, `projectId`, `title`, `content` (JSON/Rich Text), `lastModifiedBy`, `updatedAt`.
* 
**Survey:** `id`, `projectId`, `title`, `schemaJson`, `isActive`.


* 
**ResearchOutput:** `id`, `projectId`, `outputType` (Enum: Journal, Conference, Report), `citation`, `fileUrl`.



---

## 5. REST API Routes

All endpoints (except `/api/auth/*`) require an `Authorization` header containing a valid Bearer JWT. The `rbacMiddleware` will intercept requests to ensure users only access resources permitted by their project role.

| HTTP Method | API Route | Controller | Description |
| --- | --- | --- | --- |
| **POST** | `/api/auth/login` | `Auth` | Validates credentials, returns JWT. |
| **POST** | `/api/auth/register` | `Auth` | Creates a new user record. |
| **GET** | `/api/projects` | `Project` | Returns a list of projects for the authenticated user. |
| **POST** | `/api/projects` | `Project` | Creates a new research project (PI role required). |
| **GET** | `/api/projects/:id` | `Project` | Returns project details, task lists, and member roster. |
| **POST** | `/api/projects/:id/members` | `Project` | Invites a user to a project with a specific role. |
| **GET** | `/api/projects/:id/tasks` | `Task` | Returns all tasks for a specific project. |
| **POST** | `/api/projects/:id/tasks` | `Task` | Creates a new task and assigns it to a user. |
| **PATCH** | `/api/tasks/:taskId/status` | `Task` | Updates task completion status (triggers activity feed). |
| **POST** | `/api/projects/:id/surveys` | `Survey` | Saves a new survey schema (JSON). |
| **POST** | `/api/projects/:id/outputs` | `Output` | Logs a new academic output or ethical clearance document. |

---

## 6. Real-Time Collaboration Service (Socket.io)

This service manages persistent WebSocket connections to enable live document editing and dashboard updates, fulfilling the synchronization requirements without relying on SignalR.

### Core Socket Events

* **`joinProjectRoom` / `leaveProjectRoom`:** * *Payload:* `{ projectId: string }`
* *Action:* Subscribes the authenticated client to a specific project's Socket room to receive isolated broadcast events.


* **`sendDocumentEdit`:**
* *Payload:* `{ projectId: string, documentId: string, delta: any }`
* 
*Action:* Receives operational transform (OT) or rich text changes from a user and immediately broadcasts `receiveDocumentEdit` to all other clients in the project room to prevent version conflicts.




* **`cursorMove`:**
* *Payload:* `{ documentId: string, userId: string, position: object }`
* *Action:* Broadcasts the user's cursor position so others can see where they are editing.


* **`broadcastActivity`:**
* *Payload:* `{ projectId: string, activityType: string, message: string }`
* 
*Action:* Pushes notifications (e.g., "User X completed Task Y") directly to the dashboard activity feed of all connected project members.





---

## 7. Performance & Security Benchmarks

To successfully pass the Phase 3 evaluation, the backend must meet these strict criteria:

* 
**Response Latency:** All REST API endpoints must consistently return responses in under **200 milliseconds** under simulated concurrent user loads.


* **Real-Time Stability:** The Socket.io server must maintain stable connections without dropping packets during simultaneous multi-user document editing.
* **Security:** Passwords must be hashed using `bcrypt` or `argon2`. Cross-Origin Resource Sharing (CORS) must be strictly configured to only accept requests from the Next.js frontend origin. Prisma naturally parametrizes all SQL queries to prevent SQL injection attacks.