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

### 🟡 Bug #2: Effective dates on support-staff % and wages were stored but ignored by the tip calculation
**Date Found:** 2026-09-20
**Severity:** High (incorrect calculations)
**Status:** ✅ RESOLVED
**Found By:** Product owner (config screen had no "as-of" date; asked whether wage dates were honored)

**Symptoms:**
- The support-staff config screen had no effective date, so a % change could only be made once the pay period ended.
- A future-dated change would have applied immediately, and any change applied to entries for past dates.

**Root Cause:**
- `buildCalcInput` took the latest `support_staff_config` row per role (sorted by effective date, no cap at the entry date)
  and the current `employee_role_rates` row for wages, never comparing effective dates to the entry's date.
  The `effectiveDate` columns and the wage dialog's date field existed but nothing read them.

**Fix:**
- New `pickAsOf` (services/effective-date.ts): newest record effective on/before the entry date; earliest record if the
  entry predates all of them (backfills); ties go to the most recently entered record.
- Support % now resolved via `supportConfigService.getAsOf(tenantId, entryDate)`; wages via `employee_rate_history`
  as of the entry date (falling back to the current per-role rate, then the legacy single rate).
- `POST /config/support-staff` accepts an `effectiveDate` per role; `GET` returns the % in force today (venue timezone).
- Config screen: per-role "Effective from" date, scheduled-change chip, change history.

**Files Modified:**
- `backend/src/services/{effective-date,support-config.service,tip-entry.service}.ts`, `backend/src/validation/tip.schema.ts`
- `frontend/src/pages/SupportConfigPage.tsx`, `frontend/src/api/support-config.ts`

**Test Added:**
- `tip-entry.test.ts` "Effective dates in the tip calculation" (busser % and server wage the day before / on / before the change)
- `support-config.test.ts` "effective dates", `services/__tests__/effective-date.test.ts`

**Prevention:**
- Any effective-dated setting must be resolved through `pickAsOf` with the entry date, never "latest row".
- Known nuance: the Employees page lists the most recently *entered* rate, even if it is future-dated; the calculation uses the dated history.

### 🟡 Bug #3: Employee "My Tips" history included unpublished (draft) entries
**Date Found:** 2026-09-20
**Severity:** High (staff could see tip amounts before the manager published them)
**Status:** ✅ RESOLVED
**Found By:** Code Review (while planning the payroll report)

**Symptoms:**
- `GET /api/v1/tips/my-history` returned an employee's tips for every non-deleted entry, including drafts that the
  manager had not yet published (drafts can still be corrected or deleted, and no email has been sent for them).

**Root Cause:**
- The query filtered on tenant, `isDeleted` and date only; it never checked `publishedAt`.

**Fix:**
- `tipController.myHistory` now requires `publishedAt: { not: null }`.

**Files Modified:**
- `backend/src/controllers/tip.controller.ts`

**Test Added:**
- `backend/src/__tests__/api/my-history.test.ts` (only published entries appear; nothing shown while all are drafts)

**Prevention:**
- Anything that shows numbers to staff or feeds payroll must be limited to published entries (as the payroll report is).
