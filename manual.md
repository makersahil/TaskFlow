# TaskFlow - Local Run Manual

## Overview
TaskFlow is a full-stack app with a Spring Boot backend and a Next.js frontend.

## Prerequisites
- Windows, macOS, or Linux
- Java 17+ (for the backend)
- Node.js 18+ and npm
- Git

## Project Structure
- backend-app: Spring Boot backend
- frontend: Next.js frontend

## Configure Environment
No required env vars. Defaults:
- Backend API base: http://localhost:9090/api
- Frontend dev server: http://localhost:3000

If you want a custom backend URL for the frontend, set:
- NEXT_PUBLIC_API_BASE_URL (example: http://localhost:9090/api)

## Run Backend (Spring Boot)
From the repository root:

1) Build (optional but recommended):
```
cd backend-app
./mvnw -DskipTests package
```

2) Run:
```
cd backend-app
./mvnw spring-boot:run
```

Backend will start on http://localhost:9090.

## Run Frontend (Next.js)
From the repository root:

1) Install dependencies:
```
cd frontend
npm install
```

2) Start dev server:
```
cd frontend
npm run dev
```

Frontend will start on http://localhost:3000.

## Build Frontend (Optional)
```
cd frontend
npm run build
npm run start
```

## Common Issues
- 401/403 after restart: The backend uses an in-memory H2 database by default, so users/projects reset on restart. Log out and log back in to get a new token.
- Port conflicts: Make sure ports 9090 and 3000 are free.

## Smoke Test
1) Open http://localhost:3000
2) Register and log in
3) Create a project
4) Create tasks and comments
5) Delete the project to verify cleanup

## Notes
- The backend uses JWT auth; the frontend stores the token in localStorage.
- SSE notifications use the same token (query param) when enabled.
