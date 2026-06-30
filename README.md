# Collaborative Research Management Platform (CRMP) - Frontend

This is the frontend application for the Collaborative Research Management Platform. It is a modern, responsive web application designed to facilitate academic and scientific research collaboration. The platform includes a real-time rich-text document editor, comprehensive project management, task tracking, and role-based access.

**Live URL**: [https://res-crmp.justinch.dev](https://res-crmp.justinch.dev)

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI & Styling**: React 19, Tailwind CSS v4, Custom CSS
- **Real-time Editor**: Quill JS & Quill-Cursors (for collaborative editing)
- **WebSockets**: Socket.IO Client (live collaboration & notifications)
- **Data Visualization**: Recharts
- **Icons**: Lucide React
- **Session Management**: JWT (jwt-decode)

## Key Features
- **Interactive Dashboard**: A personalized overview of active projects, assigned tasks, and notifications.
- **Project Workspaces**: Dedicated areas for each research project containing modules for Proposals, Tasks, Documents, Surveys, Outputs, and Members.
- **Live Collaborative Editor**: Google Docs-style real-time document editing using WebSockets and Quill. Includes live presence tracking (seeing other users' cursors) and document autosave.
- **Lifecycle Management**: A visual stage guide tracking projects from Draft -> Proposal -> In Progress -> Review -> Completed.
- **Dynamic Task Management**: Create, assign, and track tasks for team members.
- **Responsive Design**: Designed to work beautifully on both desktop and mobile devices.

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env.local` file in the root directory and add the backend API URL:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:3000/api"
   ```

3. **Running the Application:**
   - **Development**: `npm run dev`
   - **Production Build**: `npm run build`
   - **Start Production Server**: `npm run start`

## Project Structure
- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components (Modals, Charts, Alerts, etc.).
- `src/lib`: Core utilities including API fetch wrappers, WebSockets management (`socket.ts`), and API endpoints registry (`endpoints.ts`).
- `src/styles`: Global CSS, Tailwind configurations, and component-specific stylesheets (like `editor.css` and `project-mobile.css`).
