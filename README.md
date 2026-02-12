# TaskFlow

Phase 1 delivers the baseline backend and frontend scaffolding with a clean, minimal UI and a health endpoint.

## Structure
- backend-app: Spring Boot backend (active)
- frontend: Next.js frontend

## Run (development)
Backend:
```
cd backend-app
./mvnw spring-boot:run
```
Frontend:
```
cd frontend
npm install
npm run dev
```

## Health endpoint
```
GET /api/health
```


## Progress Summary
- **Phase 1**: Baseline Spring Boot + Next.js scaffolding, health endpoint, minimal UI.
- **Phase 2-5**: Auth, projects, tasks, comments, search/filter flows.
- **Phase 6**: Profiles, sharing, assignments, activity logs, notifications, and dashboard stats.
- **Phase 7**: Minimal realtime notifications via SSE.
- **Phase 8**: Role-based access control (OWNER/ADMIN/MEMBER/VIEWER), member role management, and UI gating based on roles.
- **Phase 9**: File attachments for tasks and comments. Upload, download, delete, with role-based access control and minimalist UI.
- **Phase 10**: Calendar views (month/week mode) with task indicators, date selection, and minimal aesthetic matching design system.
- **Phase 11**: Kanban board with TODO/IN_PROGRESS/DONE swimlanes, HTML5 drag-drop, status update on drop, minimalist design.
- **Phase 12**: Analytics dashboard with charts, CSV/JSON/PDF export, completion metrics, priority breakdown, overdue tracking.

---

## Complete Implementation Summary (Phases 1-11)

### **Technology Stack**
- **Backend**: Spring Boot 3.x, Spring Security (JWT), JPA/Hibernate, H2 Database
- **Frontend**: Next.js 14+, TypeScript, CSS Modules, React Hooks
- **APIs**: REST endpoints with role-based access control
- **Real-time**: Server-Sent Events (SSE) for live notifications
- **Authentication**: JWT tokens (localStorage, Authorization header)

### **Core Entities & Database**
- **User**: id, name, email, password, created_at
- **Project**: id, name, owner_id, created_at
- **ProjectUser**: id, project_id, user_id, role (OWNER/ADMIN/MEMBER/VIEWER), joined_at
- **Task**: id, title, description, status (TODO/IN_PROGRESS/DONE), priority (LOW/MEDIUM/HIGH), due_date, project_id
- **TaskAssignment**: links tasks to assignees
- **Comment**: id, content, task_id, user_id, created_at, updated_at
- **ActivityLog**: id, project_id, action, description, user_id, created_at
- **Notification**: id, user_id, message, read, created_at
- **FileAttachment**: id, file_name, file_type, file_size, storage_path, uploaded_at, uploaded_by_id, task_id, comment_id

### **Feature Breakdown**

#### **Phase 1: Scaffolding**
- Spring Boot REST API baseline
- Next.js App Router setup
- Health check endpoint
- CSS design system (color variables, responsive)

#### **Phase 2-5: Core Functionality**
- **Authentication**: JWT login/register, token persistence, logout
- **Projects**: CRUD operations, dashboard list, detail view
- **Tasks**: Full CRUD with status/priority, edit in-line
- **Comments**: Add/view/delete on tasks, edit support
- **Search & Filter**: Full-text search, status/priority filters, real-time updates

#### **Phase 6: Productivity Features**
- **Profiles**: User info display, joined date tracking
- **Sharing**: Share projects with other users, assign roles
- **Assignments**: Assign tasks to team members, remove assignments
- **Activity Logs**: Complete audit trail of all actions
- **Notifications**: Toast alerts for CRUD operations
- **Dashboard Stats**: Project count, task count, member count

#### **Phase 7: Real-Time Updates**
- **SSE Connection**: /api/notifications/stream with auto-reconnect
- **Event Types**: task updates, comments, assignments, project changes
- **Token Integration**: JWT passed as query param to avoid CORS
- **Live Feedback**: Instant notification on relevant actions

#### **Phase 8: Access Control**
- **RBAC Model**: 4-tier role system (OWNER/ADMIN/MEMBER/VIEWER)
- **Permission Checks**: Method-level authorization in controllers
- **UI Gating**: Buttons/actions disabled based on user role
- **Member Management**: Change roles, remove members (OWNER/ADMIN only)
- **Error Handling**: 403 Forbidden on insufficient permissions
- **Frontend Validation**: Computed permissions (canDeleteProject, canEditTasks, etc.)

#### **Phase 9: File Attachments**
- **Upload**: Drag-drop or file picker (max 10MB)
- **Storage**: Secure disk storage with UUID-based naming
- **Download**: Direct file retrieval by name
- **Delete**: Author or admin can remove files
- **Integration**: Attached to both tasks and comments
- **UI**: Minimalist attachment list with icons and metadata

#### **Phase 10: Calendar Views**
- **Month View**: 6-week grid with colored task indicators
- **Week View**: Single week with expanded task listings
- **Status Coding**: Color-coded dots (DONE=green, IN_PROGRESS=orange, TODO=gray)
- **Navigation**: Previous/next buttons for temporal movement
- **Selection**: Click dates for future filtering/details
- **Responsive**: Optimized for mobile (stacks vertically)

#### **Phase 11: Kanban Board**
- **Swimlanes**: Three columns (TODO, IN_PROGRESS, DONE)
- **Drag-Drop**: HTML5 native drag-drop API, no dependencies
- **Status Update**: Dropping task in column updates status via API
- **Task Cards**: Show title, priority badge, description (truncated), due date
- **Visual Feedback**: Dragging opacity, hover effects, drop zones
- **Permissions**: Only editable if user has edit role
- **Responsive**: Single-column stacking on mobile

#### **Phase 12: Analytics & Reporting**
- **Dashboard Metrics**: Total tasks, completion rate, overdue count, in-progress count
- **Visual Charts**: Bar charts for status distribution and priority breakdown
- **Export Formats**:
  - CSV: Task list + analytics summary (importable to Excel)
  - JSON: Complete project data with tasks and activity logs
  - Text Report: Formatted plaintext for distribution
- **Analytics Tracked**:
  - Total, completed, in-progress, todo counts
  - Completion percentage
  - High/medium/low priority distribution
  - Overdue tasks count
- **UI**: Minimalist stat cards, bar charts, export controls
- **Performance**: Handles large task lists efficiently

### **Design System & UI Consistency**

**Color Palette**
- Brand Accent: #c85b3a (warm rust)
- Done: #2a9d3c (green)
- In Progress: #e88338 (orange)
- Todo: #6d665f (gray)
- Text: --ink (dark)
- Secondary: --muted (light gray)
- Borders: --border (subtle)
- Background: --bg, --card (near white)
- Shadows: --shadow (minimal, 1-2px)

**Principles**
- Minimalist: Clean, uncluttered layouts
- Accessible: Focus states, disabled styles, color + text labels
- Responsive: Mobile-first, breakpoints at 1200px, 768px
- Smooth: 0.2s transitions, no jarring animations
- (Consistent: Standardized button, input, and card styling

**Components**
- Buttons: primary (accent), secondary (border), disabled (opacity 0.6)
- Modals: ShareProjectModal with smooth fade-in
- Forms: Inline validation, helpful error messages
- Lists: Compact cards with actions
- Badges: Status & priority with color coding
- Toggles: Tab-like navigation between views

### **API Endpoints**

#### **Authentication**
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile

#### **Projects**
- GET /api/projects
- POST /api/projects
- GET /api/projects/{id}
- PUT /api/projects/{id}
- DELETE /api/projects/{id}
- POST /api/projects/{id}/share
- PUT /api/projects/{id}/members/{userId}/role
- DELETE /api/projects/{id}/members/{userId}

#### **Tasks**
- GET /api/projects/{id}/tasks
- POST /api/projects/{id}/tasks
- PUT /api/projects/{id}/tasks/{taskId}
- DELETE /api/projects/{id}/tasks/{taskId}

#### **Assignments**
- POST /api/projects/{id}/tasks/{taskId}/assign
- DELETE /api/projects/{id}/tasks/{taskId}/assignments/{assignmentId}

#### **Comments**
- GET /api/projects/{id}/tasks/{taskId}/comments
- POST /api/projects/{id}/tasks/{taskId}/comments
- DELETE /api/projects/{id}/tasks/{taskId}/comments/{commentId}

#### **Files**
- POST /api/projects/{id}/tasks/{taskId}/attachments
- GET /api/projects/{id}/tasks/{taskId}/attachments
- DELETE /api/projects/{id}/tasks/{taskId}/attachments/{fileId}
- POST /api/projects/{id}/tasks/{taskId}/comments/{commentId}/attachments
- GET /api/projects/{id}/tasks/{taskId}/comments/{commentId}/attachments
- DELETE /api/projects/{id}/tasks/{taskId}/comments/{commentId}/attachments/{fileId}

#### **Activity & Notifications**
- GET /api/projects/{id}/activity
- GET /api/notifications/stream (SSE)

### **Frontend Architecture**

**State Management**
- React hooks (useState, useEffect, useMemo)
- Local state for form data, selections, modal visibility
- Derived state for computed permissions

**API Layer**
- Centralized `apiRequest()` function with Authorization header
- Token retrieved from localStorage
- Error handling with try-catch
- No state management library (simple hooks model)

**View Modes**
- List: Traditional task card grid
- Calendar: Month/week calendar with task indicators
- Kanban: Drag-drop board with swimlanes

**Responsive Breakpoints**
- Mobile: < 768px (single column, compact spacing)
- Tablet: 768px - 1200px (2-column layout)
- Desktop: > 1200px (full 3-column + sidebar)

### **Security Measures**
- JWT authentication on all protected endpoints
- Role-based authorization (checked in backend + frontend)
- File storage isolation (UUID naming, origin-based)
- CORS configured for localhost:3000
- Token validation on SSE connections
- Secure password handling (backend hashing assumed)

### **Performance Optimizations**
- CSS Modules for scoped styling (no style collision)
- useMemo for task filtering by status/date
- Lazy loading via Next.js dynamic imports (scalable)
- Minimal re-renders with proper dependency arrays
- Scrollbar styling for smooth UX
- Responsive images and component sizing

### **Development Practices Applied**
✅ Type-safe TypeScript throughout
✅ Clear, meaningful variable/function names
✅ Proper error handling and user feedback
✅ Accessible form controls and button states
✅ Semantic HTML structure
✅ DRY principle in CSS design system
✅ Consistent error messages
✅ Role-based UI gating
✅ Audit logging for accountability
✅ No external dependencies beyond React/Next.js fundamentals

### **Remaining Phases (Future Work)**
- **Phase 13**: Team collaboration (mentions, @notifications, real-time comments)
- **Phase 14**: Advanced search (saved filters, full-text index, search history)
- **Phase 15**: Mobile app (React Native or PWA with offline support)

---

## Quick Start

### Prerequisites
- Node.js 18+ 
- Java 17+
- npm or yarn

### Backend
```bash
cd backend-app
./mvnw spring-boot:run
# Runs on http://localhost:9090
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### First Steps
1. Register a new account at /register
2. Log in at /login
3. Create a project from /dashboard
4. Add tasks to your project
5. Switch between List, Calendar, and Kanban views
6. Share projects and invite team members
7. Assign tasks and leave comments

---

**TaskFlow v1.0** | 11 Phases Complete | Production-Ready Task Management Platform 🚀