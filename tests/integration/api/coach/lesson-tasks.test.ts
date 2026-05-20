/**
 * Ownership tests for PATCH /api/coach/lesson-tasks.
 *
 * Role-gate assertions live in tests/integration/api/_auth-matrix.test.ts.
 *
 * The route uses FormData (multipart), not JSON. The current `call()` helper
 * in tests/helpers/request.ts only sends JSON bodies, so ownership tests are
 * pending a FormData helper — tracked here as todos.
 */
import { describe, it } from "vitest";

describe("PATCH /api/coach/lesson-tasks — auth only", () => {
  it.todo("returns 403 for a regular user (ownership check needs FormData helper)");
  it.todo("returns 403 when a coach updates tasks for a student they don't own");
});
