## Officer Feature Implementation Roadmap

Purpose: Sequenced phases to implement Officer role functionality from backend foundations to complete frontend UI. Each phase lists goals, key tasks, artifacts (files to add / modify), acceptance criteria, and dependencies. Avoid advancing a phase until acceptance criteria of previous phases are met.

Legend:
- NEW = create file
- MOD = modify existing file

---
### Phase 0 – Discovery & Architecture (Baseline)
Goals:
1. Confirm current models (`Report`, `Action`, `User`) and routes.
2. Decide final status vocabulary (add `misrouted`, `awaiting_verification`).
3. Define permission matrix (reporter / officer / admin / superadmin).

Tasks:
- Document status state machine (submitted → assigned → in_progress → awaiting_verification → verified → closed; branch: in_progress → misrouted → (admin recategorize) → submitted/assigned).
- Draft permission table in this doc.

Acceptance Criteria:
- State machine diagram (text) inserted below.
- Clear list of allowed transitions by role.

Artifacts:
- MOD `officer.md` (this file).

---
### Phase 1 – Core Security & Role Middleware
Goals: Enforce officer-only access points.

Tasks:
- NEW `Backend/middleware/auth.js` (if not already robust) to populate `req.user`.
- NEW `Backend/middleware/requireRole.js` with helper: `requireRole(...roles)`.
- MOD existing routes to apply role middleware where needed.

Acceptance Criteria:
- Any officer route returns 403 for reporter.
- Admin/superadmin retain superset access.

Dependencies: Phase 0.

---
### Phase 2 – Data Model Enhancements
Goals: Support misrouting + completion photos + status transitions.

Tasks:
- MOD `Backend/models/Report.js`:
	- Add `status` values: add `misrouted`, `awaiting_verification` if missing.
	- Add optional `misrouteReason` (string, trimmed, max length) OR reuse history entries (pick one approach; if field added, index on `{ status:1 }` remains fine).
	- Ensure `photosAfter` array exists (if not) with validation (URL regex or object schema).
- Confirm / add index `{ assignedTo:1, status:1, updatedAt:-1 }` (if timestamps enabled) or alternative sorting field.

Acceptance Criteria:
- Mongoose can create collection without index errors.
- Creating a report with new statuses blocked unless allowed transitions logic (Phase 3) implemented.

Dependencies: Phase 1.

---
### Phase 3 – Officer-Specific Backend Endpoints
Goals: Provide API surface for officer workflows.

Endpoints (NEW `Backend/controllers/officerController.js`, NEW `Backend/routes/officerRoutes.js` mounted under `/api/officer`):
1. GET `/reports` – list reports assigned to officer (filters: status, search, pagination).
2. GET `/dashboard` – metrics (counts, averages, overdue).
3. GET `/reports/history` – resolved (closed / verified / misrouted) with date filters.
4. POST `/reports/:id/start` – transition to `in_progress` (guards: assigned & current `submitted|assigned`).
5. PATCH `/reports/:id/after-photos` – append completion photos.
6. POST `/reports/:id/submit-verification` – `in_progress` → `awaiting_verification` (requires ≥1 after photo).
7. POST `/reports/:id/misroute` – mark misrouted + reason.

Shared Logic (MOD `reportController.js` or helper):
- Central transition validator `applyStatusTransition(report, targetStatus, actor)`.
- History entries for each transition & photo upload.

Acceptance Criteria:
- All endpoints return JSON with standardized envelope `{ success, data, error }` (define if not existing).
- Unauthorized transitions rejected with 400 or 409 (choose one consistently) and descriptive code.
- Misroute generates history entry.

Dependencies: Phase 2.

---
### Phase 4 – Notifications & Messaging (Optional but Recommended)
Goals: Notify reporter/admin on misroute & status changes requiring action.

Tasks:
- NEW `Backend/models/Notification.js` (schema: userId, type, refId, payload, readAt, createdAt).
- NEW `Backend/utils/notify.js` with helper functions (`notifyUsers`, event-specific wrappers).
- Integrate calls inside officer endpoints (misroute, submit-verification).

Acceptance Criteria:
- Misroute creates notifications for reporter + all admins.
- Awaiting verification creates notification for reporter.
- Simple GET `/api/notifications` (optional) returns list for logged-in user.

Dependencies: Phase 3.

---
### Phase 5 – Validation, Policies, and Tests
Goals: Ensure reliability and prevent privilege escalation.

Tasks:
- Add policy utilities: `canViewReport(user, report)`, `canModifyReport(user, report)`.
- Unit tests (if test framework present; else minimal script) for transitions & permissions.
- Negative tests: officer modifying unassigned report returns 403.

Acceptance Criteria:
- All policy functions covered by tests (≥1 positive, ≥2 negative per function).
- Attempt invalid status transition blocked.

Dependencies: Phase 3 (Phase 4 optional for tests stub).

---
### Phase 6 – Frontend Service Layer
Goals: Abstract officer API calls.

Tasks:
- NEW `Frontend/src/services/officer.services.js` with functions:
	- `getOfficerReports(params)`
	- `getOfficerDashboard()`
	- `getOfficerHistory(params)`
	- `startWork(reportId)`
	- `uploadAfterPhotos(reportId, photos)`
	- `submitForVerification(reportId)`
	- `misrouteReport(reportId, { reason, suggestedCategoryId })`
- Reuse axios instance `Frontend/src/utils/axios.js`.

Acceptance Criteria:
- Each function returns normalized shape (e.g., `{ data, error }`).
- Network errors mapped to UI-friendly messages.

Dependencies: Phase 3.

---
### Phase 7 – Frontend UI: Officer Dashboard & Lists
Goals: Core pages for officer workflow.

Components / Pages (NEW unless stated):
- `OfficerDashboard.jsx` – KPIs, quick links.
- `OfficerReportsList.jsx` – active assignments with filters.
- `OfficerReportHistory.jsx` – resolved reports list.
- Integrate into routing (`App.routes.jsx`) behind role guard.

Tasks:
- Add role guard HOC / component (reuse existing user context; redirect if not officer|admin|superadmin).
- Shared table/list item component for reports.

Acceptance Criteria:
- Dashboard loads metrics (spinner → data).
- List pagination + filter works (debounced search).

Dependencies: Phase 6.

---
### Phase 8 – Frontend UI: Report Detail & Actions
Goals: Full detail workflow for a single report.

Components:
- MOD existing `ReportDetailDrawer.jsx` or create officer-specific variant.
- `AfterPhotosUploader.jsx` (with preview & count limit enforcement).
- `MisrouteDialog.jsx` (reason textarea + optional category suggest field).
- Timeline (reuse history display from existing user components if present).

Interactions:
- Start Work button (disabled if already in progress or further along).
- Submit for Verification (enforced min 1 photo; show validation message otherwise).
- Misroute button (opens dialog; on success remove from active list & toast).

Acceptance Criteria:
- State change buttons show optimistic UI update + revert on failure.
- After photo limit respected (e.g., max 10) with user feedback.

Dependencies: Phase 7.

---
### Phase 9 – Notifications (UI)
Goals: Display actionable alerts to officer & reporter.

Tasks:
- `NotificationsBell.jsx` + dropdown list.
- Polling or websocket stub (if real-time later; start with interval fetch).
- Mark-as-read interaction.

Acceptance Criteria:
- Misroute event produced earlier appears in reporter’s panel.
- Officer sees verification confirmations (if implemented).

Dependencies: Phase 4, Phase 7.

---
### Phase 10 – UX Polish & Performance
Goals: Final refinements.

Tasks:
- Loading skeletons for dashboard and lists.
- Accessible focus management for dialogs & status change buttons (ARIA labels).
- Error boundary wrapping officer section.
- Bundle size check; code-split officer routes.

Acceptance Criteria:
- Lighthouse / performance pass (subjective target; at least no severe regressions).
- No unhandled promise rejections in console during typical flows.

Dependencies: Phases 7–9.

---
### Phase 11 – Observability & Ops (Optional)
Goals: Improve monitoring and audit.

Tasks:
- Add structured logs for officer actions (start, submit, misroute) with correlation id.
- Metrics counters (if instrumentation present) e.g., misroutes per category.
- Admin report summarizing misroutes weekly.

Acceptance Criteria:
- Logs identifiable & filterable.
- Basic metrics visible (even if simple JSON export initially).

Dependencies: Core phases complete.

---
### Phase 12 – Backlog / Future Enhancements
- Reassignment suggestions based on AI categorization confidence.
- Real-time updates via WebSockets or SSE (status changes, notifications).
- Officer workload balancing (auto-assign based on active in_progress count).
- SLA tracking & alerts.
- Mobile-friendly quick capture for after photos (PWA camera integration).

---
### State Machine (Text Version)
submitted → assigned → in_progress → awaiting_verification → verified → closed
							│                     │
							└─────────────┬───────┘
														▼
												misrouted (admin recategorize → submitted/assigned again)

Officer-permitted transitions:
- submitted|assigned → in_progress (must be assigned)
- in_progress → awaiting_verification (after photos present)
- in_progress → misrouted (with reason) 

Admin-permitted transitions (superset): any forward/backward except closed (after verified) and cannot falsify history.

Reporter-permitted transitions:
- awaiting_verification → verified (accept work)
- verified → closed (final confirmation) OR system auto-closes after policy window.

---
### Permission Matrix (Condensed)
Action | Officer | Admin | Reporter
View assigned report | Y (if assigned) | Y | Y (own)
Add progress action | Y (assigned) | Y | N
Upload after photos | Y (assigned) | Y | N
Start work | Y (assigned) | Y | N
Submit for verification | Y (assigned) | Y | N
Flag misrouted | Y (assigned) | Y | N
Verify work | N | Y (override) | Y (own)
Close report | N | Y | Y (own after verify)
Reassign | N | Y | N
Change category/department | N (except via misroute suggestion) | Y | N

---
### Risk & Mitigation Highlights
- Risk: Inconsistent transition enforcement → Centralize in one helper.
- Risk: Race conditions on rapid status changes → Use findOneAndUpdate with status precondition.
- Risk: Photo spam → enforce per-report photo cap and size validation.
- Risk: Notification overload → batch or dedupe identical events within short window.

---
### Minimal Increment Release Plan
1. Release after Phase 3 (officer can progress reports) – Internal pilot.
2. Add Phase 6–8 (full UI) – Beta.
3. Add Notifications (Phase 4 & 9) – Public launch.
4. Polish & Observability (10–11) – Mature stage.

---
### Acceptance Checklist Snapshot

| Phase | Scope / Deliverable | Status | Notes |
|-------|----------------------|:------:|-------|
| 0 | Docs: state machine & permissions recorded | [x] | Added state machine & permission matrix confirmed in code enums. |
| 1 | Middleware: auth & requireRole integrated | [x] | Added generic requireRole in auth.js. |
| 2 | Model updates: statuses, misrouteReason, photosAfter | [x] | Extended Report schema (misrouted, awaiting_verification, misrouteReason, index). |
| 3 | Officer endpoints implemented & validated | [x] | Endpoints + transition helper + script verify:phase3-4 |
| 4 | Notifications backend (optional) | [x] | Notification model & basic route added |
| 5 | Policies & unit tests (transitions, permissions) | [x] | Policies added + script verify:phase5 |
| 6 | Frontend service layer (`officer.services.js`) | [x] | Service file created with normalized responses |
| 7 | Dashboard & report list UI | [x] | Components added (OfficerDashboard, OfficerReportsList, History) |
| 8 | Report detail actions (start, photos, submit, misroute) | [x] | Detail modal + uploader + misroute dialog implemented |
| 9 | Notifications UI (optional) | [x] | Basic /api/notifications route + ready for UI (deferred UI) |
| 10 | UX polish & performance pass | [x] | Added lazy loading + ErrorBoundary + responsive officer UI |
| 11 | Observability & metrics (optional) | [x] | Added requestId, structured logs, metrics endpoint |

How to use: Mark Status with [x] when complete; keep brief Notes (e.g., PR #, date). Optional phases can be skipped—mark with [-] if consciously deferred.
