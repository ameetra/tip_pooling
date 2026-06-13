# Bug Log — Gratify

## Resolved Bugs

### 🟠 Bug #1: API error messages shown as raw "Request failed with status code N"
**Date Found:** 2026-06-13
**Severity:** Medium (UX)
**Status:** ✅ RESOLVED
**Found By:** Playwright E2E (invalid-login scenario)

**Symptoms:**
- Submitting wrong login credentials showed `Request failed with status code 401` instead of
  the API's `Invalid email or password.` Same applied to any non-2xx API response.

**Root Cause:**
- The axios response interceptor in `frontend/src/api/client.ts` only had an `onFulfilled`
  handler, which unwraps the `{ success, data }` envelope for 2xx responses. HTTP errors
  (4xx/5xx) are *rejected* by axios and bypassed that handler, so the raw axios `Error`
  (`Request failed with status code N`) surfaced to the UI instead of `error.response.data.error.message`.

**Fix:**
- Added an `onRejected` handler to the interceptor that extracts `error.response.data.error`
  ({ message, code, details }) and throws a clean `Error`, with a shared `apiError()` helper used
  by both the envelope-error and HTTP-error paths.

**Files Modified:**
- `frontend/src/api/client.ts`

**Verified:**
- Playwright: invalid login now shows `Invalid email or password.` (re-tested after HMR).

**Prevention:**
- Centralized error normalization in the client; any consumer reading `err.message` now gets the
  API's human message for both error shapes.
