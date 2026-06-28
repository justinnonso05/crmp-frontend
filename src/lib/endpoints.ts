// src/lib/endpoints.ts
// ─────────────────────────────────────────────────────────────────
// Single source of truth for all API endpoint paths.
// Import from this file on every page — never hardcode URLs.
// ─────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

// ── Authentication ────────────────────────────────────────────────
export const AUTH = {
  LOGIN:    `${BASE}/api/auth/login`,
  REGISTER: `${BASE}/api/auth/register`,
} as const;

// ── Users ─────────────────────────────────────────────────────────
export const USERS = {
  SEARCH: (query: string) => `${BASE}/api/users?q=${encodeURIComponent(query)}`,
  PROFILE: `${BASE}/api/users/profile`,
} as const;

// ── Activities ────────────────────────────────────────────────────
export const ACTIVITIES = {
  RECENT: `${BASE}/api/activities`,
} as const;

// ── Projects ──────────────────────────────────────────────────────
export const PROJECTS = {
  LIST:          `${BASE}/api/projects`,
  CREATE:        `${BASE}/api/projects`,
  DETAIL:        (id: string) => `${BASE}/api/projects/${id}`,

  ADD_MEMBER:    (id: string) => `${BASE}/api/projects/${id}/members`,
  REMOVE_MEMBER: (id: string, userId: string) => `${BASE}/api/projects/${id}/members/${userId}`,
  UPDATE_STATUS: (id: string) => `${BASE}/api/projects/${id}/status`,
} as const;

// ── Proposals ─────────────────────────────────────────────────────
export const PROPOSAL = {
  DRAFT:  (id: string) => `${BASE}/api/projects/${id}/proposal`,
  SUBMIT: (id: string) => `${BASE}/api/projects/${id}/proposal/submit`,
  REVIEW: (id: string) => `${BASE}/api/projects/${id}/proposal/review`,
} as const;

// ── Applications ──────────────────────────────────────────────────
export const APPLICATIONS = {
  LIST:   (projectId: string) => `${BASE}/api/projects/${projectId}/applications`,
  REVIEW: (appId: string)     => `${BASE}/api/applications/${appId}`,
} as const;

// ── Discovery ─────────────────────────────────────────────────────
export const DISCOVERY = {
  SEARCH_COUNT: (query: string) => `${BASE}/api/discover/search/count?q=${encodeURIComponent(query)}`,
  UNIVERSITY: `${BASE}/api/discover/university`,
  APPLY: (id: string) => `${BASE}/api/discover/apply/${id}`,
} as const;

// ── Tasks ─────────────────────────────────────────────────────────
export const TASKS = {
  LIST:   (projectId: string) => `${BASE}/api/projects/${projectId}/tasks`,
  CREATE: (projectId: string) => `${BASE}/api/projects/${projectId}/tasks`,
  STATUS: (taskId: string)    => `${BASE}/api/tasks/${taskId}/status`,
} as const;

// ── Documents ─────────────────────────────────────────────────────
export const DOCUMENTS = {
  LIST:   (projectId: string)                    => `${BASE}/api/projects/${projectId}/documents`,
  CREATE: (projectId: string)                    => `${BASE}/api/projects/${projectId}/documents`,
  DETAIL: (documentId: string)                   => `${BASE}/api/documents/${documentId}`,
  SAVE:   (documentId: string)                   => `${BASE}/api/documents/${documentId}`,
} as const;

// ── Surveys ───────────────────────────────────────────────────────
export const SURVEYS = {
  LIST:             (projectId: string) => `${BASE}/api/projects/${projectId}/surveys`,
  CREATE:           (projectId: string) => `${BASE}/api/projects/${projectId}/surveys`,
  DETAIL:           (surveyId: string)  => `${BASE}/api/surveys/${surveyId}`,
  SUBMIT_RESPONSE:  (surveyId: string)  => `${BASE}/api/surveys/${surveyId}/responses`,
  GET_RESPONSES:    (surveyId: string)  => `${BASE}/api/surveys/${surveyId}/responses`,
} as const;

// ── Outputs ───────────────────────────────────────────────────────
export const OUTPUTS = {
  LIST:   (projectId: string) => `${BASE}/api/projects/${projectId}/outputs`,
  CREATE: (projectId: string) => `${BASE}/api/projects/${projectId}/outputs`,
} as const;

// ── File Upload ───────────────────────────────────────────────────
export const UPLOAD = {
  FILE: `${BASE}/api/upload`,
} as const;

// ── Health ────────────────────────────────────────────────────────
export const HEALTH = `${BASE}/api/health`;
