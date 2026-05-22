# Responsive Design Spec

The contract every agent (human or otherwise) follows when making the app responsive. This is **not** a redesign. The goal is: every existing page works at every target width without changing what the page is.

---

## 1. Scope

**In scope**
- Layout, sizing, spacing, wrapping, overflow.
- Reflowing or restacking elements when the desktop layout can't fit on mobile (see §5 — "Reflow rules").
- Tailwind class changes on existing JSX.
- Adding responsive variants (`sm:`, `md:`, `lg:`, `xl:`) to existing classes.
- Replacing fixed pixel widths/heights with fluid/clamp/percentage values where they cause overflow.

**Out of scope — do not touch**
- **Content.** No adding, removing, renaming, or rewording buttons, links, headings, labels, copy, icons, or any user-visible text or feature. If the desktop page has 8 columns of data, the mobile page also has 8 columns of data (presented differently is fine — omitted is not).
- **Visual identity.** No changes to color tokens, fonts, font families, shadow scales, border-radius scale, or the existing palette in `globals.css`. You may change *sizes* (e.g. `text-lg` → `text-base` on mobile) but not introduce new colors or font stacks.
- **Component refactors.** Don't extract new components, don't rename props, don't restructure the file. Fix in place even if the file is `CourseLessonPanel.tsx` (1215 lines).
- **Accessibility work beyond tap-target size.** No ARIA sweeps, no contrast fixes, no keyboard-nav rework. Tracked separately.
- **Business logic.** No changes to hooks, server actions, queries, or anything outside JSX + className strings + the occasional inline style.
- **Component libraries / new dependencies.** Tailwind only. No `react-responsive`, no headless UI swaps.

---

## 2. Target breakpoints

Agents screenshot and verify at exactly these five widths. Height: 800px for all.

| Name | Width | Represents |
|---|---|---|
| `mobile-sm` | 375 | iPhone SE / smallest realistic phone |
| `mobile-lg` | 640 | Large phone / Tailwind `sm` boundary |
| `tablet` | 768 | iPad portrait / Tailwind `md` |
| `laptop` | 1024 | Small laptop / Tailwind `lg` |
| `desktop` | 1440 | Standard desktop / above Tailwind `xl` |

**Direction:** mobile-first. **Desktop (1440) is the baseline — assume it works.** Agents start at 375 and work upward, fixing breakage. If a fix at 375 would regress 1440, the fix is wrong; use a responsive variant instead.

---

## 3. Done criteria (the checklist)

A page is "done" when **all four** hold at **all five** breakpoints:

1. **No horizontal scroll on `<body>`.** `document.documentElement.scrollWidth <= window.innerWidth`. Intentional internal scroll containers (tables, calendars) are fine — the page itself must not scroll horizontally.
2. **No clipped or overlapping interactive elements.** Buttons, links, inputs, and text must be fully visible and not stacked on top of each other. Truncation with ellipsis is allowed for non-essential text; truncation that hides a button label is not.
3. **All interactive elements ≥ 44×44px at `mobile-sm` and `mobile-lg`.** Buttons, links, icon buttons, form controls. This is the only accessibility rule in scope.
4. **Tables, calendars, and modals remain usable** — see §4 for the specific patterns allowed.

If any of these fails at any breakpoint, the page is not done.

---

## 4. Specific component patterns

These are the recurring offenders. Use the listed pattern; don't invent new ones.

### Tables (admin pages, lesson lists)
- ≤ `tablet`: wrap the table in `overflow-x-auto` and let it scroll horizontally inside its container. Do not drop columns.
- ≥ `laptop`: render normally.
- Never use `display: block` on `<tr>`/`<td>` to stack — it breaks semantics and is harder to scan.

### FullCalendar (coach calendar, admin)
- ≤ `tablet`: switch the default view to `timeGridDay` (one day at a time). The week/month views genuinely don't fit and stacking them isn't possible without rewriting FullCalendar.
- ≥ `laptop`: keep the existing default view.
- The view-switcher buttons stay visible at all sizes.

### Modals / dialogs
- ≤ `mobile-lg`: full-screen or near-full-screen (`inset-2`, max-h with internal scroll). Close button must remain visible without scrolling.
- ≥ `tablet`: centered with max-width, as today.

### Side navigation (parent / coach / admin shells)
- ≤ `tablet`: collapse to a top bar with a menu button. The menu opens as a drawer or a full-screen sheet — pick whichever the shell already leans toward and stay consistent within a shell.
- ≥ `laptop`: persistent side nav, as today.

### Forms (signup, onboarding, profile editors)
- ≤ `mobile-lg`: single column, full-width inputs, labels above inputs.
- Multi-column form layouts collapse to single column below `tablet`.

### Cards / grid layouts
- Default: `grid-cols-1` at `mobile-sm`, `sm:grid-cols-2`, `lg:grid-cols-3` or whatever the desktop count is. Never more than 1 column below `sm`.

### Tiptap rich-text editor (lessons)
- Toolbar wraps on mobile; do not hide buttons. If the toolbar is taller than one row on mobile, that's acceptable.

---

## 5. Reflow rules — when restacking is allowed

Sometimes a desktop layout (side-by-side panels, multi-column header) can't shrink enough to fit on mobile. Restacking **is** allowed in that case, but only under these constraints:

- **Reading order must stay intuitive.** Top-to-bottom on mobile should match left-to-right then top-to-bottom on desktop. Don't reorder content into "what fits best" — reorder into "what a user expects to see first."
- **Nothing disappears.** If a sidebar exists on desktop, it appears below (or above) the main content on mobile, not removed.
- **Don't introduce hover-only interactions.** If desktop reveals something on hover, mobile must reveal it on tap with an obvious affordance.
- **Sticky/fixed positioning is allowed on mobile** for headers and primary action buttons, as long as the sticky element is < 20% of viewport height.

If a reflow requires a judgment call about what's "primary" content, leave a comment in the JSX explaining the choice — one line, no essay.

---

## 6. How to fix — the playbook

The order of operations agents follow for each page:

1. Load the page at all five breakpoints. Capture screenshots.
2. Run the §3 checklist against each screenshot. Note every failure with the breakpoint and the specific element.
3. For each failure, apply the smallest possible class change that fixes the failure without regressing larger breakpoints.
4. Prefer this hierarchy:
   - Add a responsive variant (`md:flex-row` on an existing `flex-col`).
   - Replace fixed widths with `w-full max-w-*` or `min-w-0`.
   - Add `flex-wrap` or `flex-shrink`.
   - Add `overflow-x-auto` to an internal container.
   - Apply a §4 pattern.
   - Reflow per §5 — last resort.
5. Re-screenshot all five breakpoints. Re-run the checklist. The fix is done when all five pass.
6. Do **not** edit anything outside the JSX of the page and its colocated `_components/`. If a fix requires editing a shared component in `src/components/`, stop and flag it — that's a shared-infra change and goes through a different agent.

---

## 7. What an agent reports back

For each page worked:
- Path (e.g. `/coach/calendar`).
- Before/after screenshots at all five breakpoints.
- One-line description of the failure(s) found and the fix applied.
- Files changed.
- Anything punted (e.g. "shared `Modal` component needs a `fullScreenOnMobile` prop — out of scope for this slice").

No prose summaries. No "I improved the design" — this isn't a design pass.

---

## 8. Sanity checks before declaring done

- `npm run lint` passes.
- `npm run build` passes.
- Desktop (1440) screenshot is **visually unchanged** from the pre-change baseline. If desktop looks different, the change is wrong — responsive variants should leave the desktop unaffected.
- No new files created in `src/components/` or `src/lib/`.
- Diff is className-only or near-it. A diff that touches imports, hooks, or props is a smell — review it.
