# TalkMaze — Code Quality Audit

**Overall Grade: C- / Needs Significant Work**
Built under time pressure with reasonable architecture but notable execution gaps.

---

## Security — CRITICAL

### 1. Secrets in Version Control
`.env.local` was committed with real API keys:
- Stripe secret key & webhook secret
- Teachworks API key
- LessonSpace API key
- Supabase access token

**Action: Rotate all keys immediately if repo was ever public.**

### 2. Missing Auth Checks on API Routes
These routes return data with no authentication:
- `app/api/admin/students/route.ts`
- `app/api/admin/employees/route.ts`
- `app/api/admin/courses/route.ts`

### 3. Admin RBAC Check Commented Out
`app/api/admin/create-admin/route.ts` has its role check commented out — **anyone authenticated can create an admin account.**

---

## Backend / API Quality — D+

### Error Handling (Poor)
- Multiple routes ignore Supabase `error` return values entirely and return success regardless
- Some routes log errors then continue as if nothing happened
- Silent failures throughout

### TypeScript / Validation (Poor)
- Zod is installed but **never used**
- 8+ `any` types across API routes
- `as any` casts in Stripe webhook handler (`app/api/webhooks/stripe/route.ts`)
- Inconsistent error response shapes — no standard contract

### Data Fetching (Poor)
- Classic N+1 query problem in `app/(protected)/message/[id]/page.tsx` — fetches account + student + coach records individually for every message
- Should use Supabase relational `select()` with joins

---

## Frontend Quality — D+

### God Components (Critical)

| File | Lines | Problem |
|------|-------|---------|
| `app/(protected)/admin/page.tsx` | **1,701** | Students, employees, courses, assignments, all modals in one file |
| `app/(protected)/admin/components/CourseLessonPanel.tsx` | **779** | Full CRUD + file uploads + form state |
| `app/(protected)/lesson/page.tsx` | **495** | 5 sub-components defined inline as memos |

### State Management (Poor)
- `app/(protected)/admin/page.tsx` has **23 separate `useState` hooks** for interdependent state
- Should use `useReducer` or custom hooks
- No shared state management (context, etc.)

### Code Duplication
- `ReviewLesson.tsx` and `UpNextLesson.tsx` are near-identical — should be one `LessonCard` with variant prop
- `StudentTable`, `EmployeeTable`, `CourseTable` share identical structure with no abstraction

### Dead Code & Debug Artifacts
- 40+ `console.log` / `console.error` calls left in production code
- 44 lines of commented-out `useEffect` in `app/(protected)/home/page.tsx` with no explanation
- TODO comments for unimplemented features (file attachments in messaging)
- Empty catch blocks that silently swallow errors (`app/(protected)/lesson/page.tsx`)
- `alert()` used for errors in admin page instead of UI notifications

### Accessibility (Near Zero)
- Modals missing `role="dialog"`, `aria-modal`, `aria-labelledby`
- Icon buttons have no `aria-label`
- Tables have no captions or `aria-label`
- No keyboard navigation support

### Type Safety (Poor)
- `any` types in components: `item: any`, `students: any[]`, `sessions: any[]`
- Typed props inconsistently applied

---

## Architecture — B- (Good Bones)

The overall structure is sound:
- Clean `(public)` vs `(protected)` route separation
- Middleware-based RBAC
- Server vs client component split exists (inconsistently applied)
- `lib/`, `utils/supabase/`, `app/api/` separation is logical

---

## Summary Scorecard

| Area | Grade | Top Issue |
|------|-------|-----------|
| Security | F | Secrets in git, missing auth on routes |
| API Error Handling | D | Ignores DB errors, returns success regardless |
| TypeScript / Validation | D+ | `any` everywhere, Zod unused |
| Component Size | D- | 1,700-line god components |
| State Management | D | 23 `useState` in one component |
| Data Fetching | D+ | N+1 queries, no joins |
| Code Duplication | C- | Multiple near-identical components |
| Accessibility | F | Almost no a11y attributes |
| Architecture/Structure | B- | Sound foundation, poor execution |

---

## Priority Fix List

1. **Rotate all API keys** that were in `.env.local`
2. **Add auth checks** to all API routes + uncomment admin RBAC check in `create-admin/route.ts`
3. **Break up `admin/page.tsx`** — unmaintainable at 1,700 lines
4. **Fix N+1 queries** in `message/[id]/page.tsx` using Supabase joins
5. **Strip all `console.log` calls** before production deployment
6. **Implement Zod validation** on all API route bodies
7. **Merge `ReviewLesson.tsx` / `UpNextLesson.tsx`** into single component
8. **Add basic a11y** — `role="dialog"`, `aria-label` on icon buttons
