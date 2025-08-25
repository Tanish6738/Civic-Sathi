## Department & Category Management Roadmap

Purpose: Phased plan to harden and extend Department & Category domain (data integrity, lifecycle, permissions, auditing, UI). Mirrors style of `officer.md`. Progress columns start unchecked. Mark `[x]` as phases complete. Optional phases can be marked `[-]` if consciously deferred.

Legend:
- NEW = create file / module
- MOD = modify existing file

---
### Current State (Assessment Snapshot)
Implemented (from codebase):
- Category model: name (unique), description, keywords[], defaultOfficers[], createdAt timestamp only.
- Department model: name (unique), description, officers[], categories[], timestamps, index on categories.
- Controllers: Basic CRUD for both (create/list/get/update/delete). Category implements soft delete endpoint (sets `isDeleted`) though schema lacks the field. Department delete is hard delete.
- Frontend service layer wrappers exist (`category.services.js`, `department.services.js`).

Gaps / Issues Identified:
1. Category schema missing `isDeleted` field required by controller usage (soft delete has no schema field & no query filter index).
2. No role / auth guards on category & department routes (any user can mutate currently).
3. No validation that `defaultOfficers` / `officers` actually have officer or higher role; no de-duplication.
4. No referential consistency on Category soft delete (Category stays referenced inside Departments). No cascade / cleanup strategy.
5. Department deletion is hard; potential orphaned references (reports referencing category/department not addressed).
6. No audit logging for create/update/delete (AuditLog model exists but unused here).
7. No pagination / sorting controls (potential performance issue with large datasets).
8. No indexing for common queries beyond categories index; missing partial / compound indexes (e.g., `{ name:1, isDeleted:1 }`).
9. No change history (who changed officers/categories list, when).
10. No policy layer (canView / canManage) separate from controllers.
11. No optimistic or conditional update checks (race conditions overwriting concurrent modifications).
12. Lack of search relevance ranking (simple regex only for categories; none for departments beyond name regex).
13. Inconsistent HTTP semantics: Department `updateDepartment` uses PUT but partial update rules; Category uses PATCH.
14. No bulk operations (bulk import / export / reorder categories).
15. No automated tests or verification scripts dedicated to departments/categories.
16. No caching strategy for frequently-read static lists (e.g., categories) or ETag support.
17. No event / notification integration when structure changes (officers not notified when assigned as default to categories).
18. No data quality constraints: keyword normalization, max lengths, uniqueness inside arrays.
19. Missing `updatedAt` on Category (timestamps disabled for updates) reducing audit clarity.
20. No slug or stable identifier for categories (front-end currently uses DB id only). Optional enhancement.

---
### Phase 0 – Discovery & Architecture
Goals:
1. Confirm intended lifecycle (active / soft-deleted) for Category & Department.
2. Define role matrix (reporter / officer / admin / superadmin) for CRUD & listing.
3. Decide on cascade rules when categories or departments are removed / soft-deleted.

Tasks:
- Document state model: Category (active → soft_deleted → restored), Department (active → soft_deleted → restored) – no hard delete except irreversible purge job.
- Draft permission table (below).
- Choose cleanup strategy: (a) Prevent soft-delete if referenced by Reports, or (b) allow but hide & prevent new assignments.

Acceptance Criteria:
- Table of permissions & lifecycle added below.
- Decision on cascade + enforcement strategy recorded.

Artifacts:
- MOD `department_categories.md` (this file).

---
### Phase 1 – Schema & Index Integrity
Goals: Align schemas with controller logic & future queries.

Tasks:
- MOD `Backend/models/Category.js`:
  - Add `isDeleted: { type:Boolean, default:false, index:true }`.
  - Enable full timestamps `{ timestamps:true }` (keep createdAt & updatedAt).
  - Add `slug` (lowercased unique) generated pre-save from name (optional if name uniqueness stable).
  - Enforce array setters: keywords trimmed, unique, lowercase.
- MOD `Backend/models/Department.js`:
  - Add `isDeleted` soft delete flag.
  - Add compound index `{ name:1, isDeleted:1 }`.
  - Consider index `{ officers:1 }` for lookup by officer.
- Add partial unique index for Category name (unique where isDeleted:false) if frequent soft deletes expected.

Acceptance Criteria:
- Mongoose starts without index build errors.
- Soft delete field present & reflected in documents.

Dependencies: Phase 0.

---
### Phase 2 – Route Security & Policies
Goals: Restrict destructive ops to admin/superadmin, allow read to broader roles.

Tasks:
- MOD `Backend/routes/categoryRoutes.js` & `departmentRoutes.js` to apply `auth` + `requireRole('admin','superadmin')` for create/update/delete, and `auth` + `requireRole('officer','admin','superadmin')` for certain reads if restricted (or public read if intended).
- NEW `Backend/policies/structurePolicies.js` exporting:
  - `canViewCategory(user)` / `canManageCategory(user)`
  - `canViewDepartment(user)` / `canManageDepartment(user)`
- Controllers call policy helpers early; unify 403 responses.

Acceptance Criteria:
- Unauthorized user attempting POST /categories gets 403.
- Officer can list categories; reporter can list (if decided) but cannot mutate.

Dependencies: Phase 1.

---
### Phase 3 – Controller Hardening & Validation
Goals: Data cleanliness & resilience.

Tasks:
- MOD Category controller:
  - Validate `defaultOfficers` exist and role in ['officer','admin','superadmin'].
  - Enforce name length/max (e.g., 3–80 chars), description max length.
  - Duplicate keyword removal & limit (e.g., ≤25 keywords, each ≤40 chars).
  - Support pagination: `?page & limit & sort`.
  - Search improvements: case-insensitive, keyword scoring (optional simple weight).
  - Filter out soft-deleted by default; add `includeDeleted` flag for admins.
- MOD Department controller:
  - Validate officers roles.
  - Ensure all referenced categories exist & not soft-deleted.
  - Disallow removing a category if active reports in submitted|assigned referencing that category (or flag for migration as per Phase 0 decision).
  - Add soft delete endpoint (`DELETE` sets `isDeleted:true`).
- Standardize response envelope `{ success, data, errorCode, message, meta }` (meta for pagination) across both.
- Add central validator utilities (NEW `Backend/utils/validation.js`).

Acceptance Criteria:
- Pagination returns `meta.total` & `meta.page`.
- Invalid officer id in defaultOfficers yields 400 with errorCode.
- Soft-deleted category excluded from default list response.

Dependencies: Phase 2.

---
### Phase 4 – Referential Integrity & Cascade Handling
Goals: Prevent inconsistent references & manage lifecycle changes.

Tasks:
- NEW transition service `Backend/services/structureLifecycle.service.js` with functions:
  - `softDeleteCategory(id, options)` – remove id from Department.categories arrays atomically (multi-update) OR mark as deprecated reference field.
  - `softDeleteDepartment(id)` – marks department, optionally soft-deletes orphan categories (decision gated by Phase 0 policy).
- Add Mongo transactions (if replica set) or ordered operations with precondition checks.
- Add pre-save / pre-delete hooks that block hard delete if referenced by reports (unless forced purge script).

Acceptance Criteria:
- Soft-deleting a category removes it from all departments in one request.
- Departments referencing a soft-deleted category no longer show it in API output (filtered at population).

Dependencies: Phase 3.

---
### Phase 5 – Audit Logging & History
Goals: Track structural changes.

Tasks:
- Integrate `AuditLog` model: record actor, entityType (CATEGORY/DEPARTMENT), entityId, action (CREATE/UPDATE/SOFT_DELETE/RESTORE), diff snapshot.
- Wrap controllers with audit calls.
- Provide GET `/api/admin/audit/structure` filtered by entityType.

Acceptance Criteria:
- Creating category writes audit entry with initial document snapshot.
- Updating department records changed fields only (before/after pairs).

Dependencies: Phase 3.

---
### Phase 6 – Caching & Performance
Goals: Reduce latency for frequent reads (categories list shown on forms, etc.).

Tasks:
- Add in-memory cache layer (e.g., simple LRU) or Redis (if infrastructure) for category list.
- ETag / Last-Modified headers using updatedAt; support conditional GET (304).
- Cache invalidation on create/update/delete/restore.

Acceptance Criteria:
- Repeated GET /categories hits cache (log indicator) and returns under target latency threshold (define locally, e.g., <10ms server-side after warm).

Dependencies: Phase 3.

---
### Phase 7 – Bulk Operations & Tooling
Goals: Admin efficiency.

Tasks:
- NEW endpoint POST `/api/categories/bulk` to import array (validate & upsert by name).
- NEW endpoint POST `/api/departments/bulk-assign` to add categories/officers in batch with rollback on partial failure (transaction).
- Export endpoint `/api/categories/export` (CSV / JSON) for offline editing.

Acceptance Criteria:
- Bulk import rejects row with duplicate name & continues (or aborts atomically depending on chosen semantics; document behavior).

Dependencies: Phase 3.

---
### Phase 8 – Frontend UI Enhancements
Goals: Rich admin management screens.

Tasks:
- Add management pages (if not present) with: searchable table, pagination, soft-delete toggle, inline edit of keywords, officer assignment modal.
- Visual diff / history panel (Phase 5 audit feed) for each entity.
- Multi-select bulk actions (soft delete, assign officer to many categories).

Acceptance Criteria:
- Category list reflects soft-deleted items only when filter toggled.
- Officer assignment modal prevents non-officer selection.

Dependencies: Phases 3,5.

---
### Phase 9 – Notifications & Event Hooks (Optional)
Goals: Alert stakeholders to structural changes impacting assignments.

Tasks:
- Emit events on category added to department, officer added to category.
- Use existing notification system (`notify.js`) to inform newly assigned officers.
- Reporter-facing notifications not required unless category removal impacts open reports (optional stub).

Acceptance Criteria:
- Adding officer to a category triggers notification to that officer.

Dependencies: Phase 5.

---
### Phase 10 – Data Quality & Analytics
Goals: Maintain high quality taxonomy & usage insights.

Tasks:
- Add metrics counters: category usage count (reports referencing), average resolution time per category (if available from reports), officer load per department.
- Scheduled job to flag unused categories (no reports in last N days) for pruning.
- Keyword collision detection (two categories with highly overlapping keyword sets) – suggestion report.

Acceptance Criteria:
- Metrics endpoint returns counts per category.
- Unused category job produces log or notification summary.

Dependencies: Earlier core phases.

---
### Phase 11 – Testing & Verification
Goals: Confidence in transitions & permissions.

Tasks:
- Add unit tests for policies, validation, and lifecycle operations.
- Add integration tests: soft delete cascade, restore, pagination, audit logging.
- Negative tests: unauthorized mutation, invalid officer id, deleting category with active reports (if blocked policy).
- NEW scripts: `scripts/verify-structure-phaseX.js` mirroring officer verification style.

Acceptance Criteria:
- All new tests pass; coverage for controllers ≥ critical paths (create/update/delete/list) with success & failure cases.
- Verification script outputs PASS summary.

Dependencies: Phases 1–5 minimal; more coverage as features land.

---
### Phase 12 – Observability & Ops (Optional)
Goals: Insight into structural change operations.

Tasks:
- Structured logs with correlation id for category/department mutations.
- Dashboard panels: categories count, soft-deleted count, average officers per department.
- Alert on spike in soft deletes (possible misuse).

Acceptance Criteria:
- Log search can filter by `entityType:Category` or `entityType:Department`.
- Alert triggers when soft deletes > threshold in 1 hour.

Dependencies: Phase 5.

---
### Phase 13 – Future / Backlog
- Hierarchical categories (parent/child) & inheritance of officers.
- Tagging system separate from strict categories.
- AI-assisted keyword suggestion (integrate existing `aiCategorizer.js`).
- Multi-tenancy support (city/region scoping) if expansion planned.
- Internationalization of names/descriptions.
- Category deprecation workflow (mark deprecated → replace suggestions).

---
### Permission Matrix (Initial Draft)
Action | Reporter | Officer | Admin | Superadmin
View categories | Y | Y | Y | Y
View departments (basic details) | Y | Y | Y | Y
Create / Update Category | N | N | Y | Y
Delete / Restore Category | N | N | Y | Y
Create / Update Department | N | N | Y | Y
Delete / Restore Department | N | N | Y | Y
Assign Officers to Category | N | N | Y | Y
Assign Officers to Department | N | N | Y | Y
Bulk Operations | N | N | Y | Y
View Audit History | N | N | Y | Y

---
### Risk & Mitigation Highlights
Risk | Mitigation
Inconsistent soft delete filtering | Central query helpers & default scopes.
Dangling references after delete | Transactional cascade removal & integrity checks.
Performance degradation with regex search | Add indexes & sanitized prefix search or text index.
Privilege escalation (non-admin modifications) | Central policy layer + route middleware tests.
Race conditions overwriting officer/category lists | Conditional updates (match current version) or Mongoose versionKey.

---
### Minimal Increment Release Plan
1. Release after Phase 3 (secure + validated CRUD).
2. Add Phase 4–5 (referential integrity + audit) – Beta.
3. Add Phase 6–8 (performance + UI enhancements) – Public.
4. Add remaining optional phases for maturity.

---
### Acceptance Checklist Snapshot

| Phase | Scope / Deliverable | Status | Notes |
|-------|----------------------|:------:|-------|
| 0 | Docs: lifecycle + permissions decided | [x] | Cascade: prevent soft-delete if active reports reference category (Phase 3 enforcement) |
| 1 | Schema updates & indexes | [x] | Added isDeleted, slug, indexes, partial uniques |
| 2 | Route security + policies | [x] | Policies + middleware applied |
| 3 | Validation + pagination + responses | [x] | Added pagination & validation + response envelope |
| 4 | Referential integrity & cascade | [x] | Soft delete cascade + active report guards |
| 5 | Audit logging integration | [x] | Create/update/delete audit entries added |
| 6 | Caching & ETag | [ ] |  |
| 7 | Bulk operations | [x] | Endpoints bulk import/export, bulk-assign added (Phase 7) |
| 8 | Admin UI enhancements | [ ] | Category & Department manager tabs added (needs audit diff view & officer assignment modal) |
| 9 | Notifications (optional) | [ ] |  |
| 10 | Data quality metrics | [ ] |  |
| 11 | Tests & verification scripts | [ ] |  |
| 12 | Observability dashboards | [ ] |  |
| 13 | Backlog items triaged | [ ] |  |

How to use: Mark Status with [x] when complete; keep Notes short (PR #, date). Optional phases mark with [-] if consciously skipped.

---
### Quick Diff Targets (When Implementing)
- Models: Add missing fields & indexes first to avoid migration conflicts later.
- Controllers: Refactor to shared helpers before layering pagination & policies.
- Tests: Introduce early for validation & policies (Phase 2–3) to reduce regressions downstream.

---
### Open Questions (Fill During Phase 0)
1. Should reporters see full department officer lists or just department names? (privacy)
2. Are categories localized (multi-language names) needed now or later? (affects schema)
3. How to handle category rename impacts on existing reports (store historical name snapshot?).
4. Maximum allowable officers per category / categories per department for performance guardrails.
5. Is Redis or external cache available (decides Phase 6 path)?

---
End of document.
