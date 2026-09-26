# Product Requirements Document (PRD)
## Tip Pooling Management System

**Document Version:** 1.1  
**Last Updated:** September 20, 2026  
**Product Owner:** [To be filled]  
**Status:** In pilot (Pieces parallel test)

> **Status legend:** `[x]` built and verified against the deployed app on 2026-09-20 · `[ ]` not built · *italic notes* mark items that were built differently from the original wording or only partly. Section 3.9 lists what was built beyond this PRD.

---

## 1. Executive Summary

### 1.1 Product Vision
A cloud-based tip pooling management system that automates the calculation and distribution of tips for restaurant and coffee shop employees, with multi-tenant support for scaling across multiple locations.

### 1.2 Business Objectives
- Eliminate manual tip calculation errors
- Provide transparent tip distribution to employees
- Enable audit trail for compliance and dispute resolution
- Scale to support multiple restaurant locations
- Reduce manager time spent on tip calculations by 80%

### 1.3 Success Metrics
- System processes daily tip calculations in < 5 seconds
- 100% accuracy in tip calculations
- Manager adoption rate > 90% within first month
- Employee satisfaction with tip transparency
- Zero data loss or security incidents

---

## 2. User Personas

### 2.1 Admin User
- **Who:** Restaurant owner or multi-location operator
- **Goals:** Configure system settings, manage employees, oversee all locations
- **Pain Points:** Managing different tip policies across locations, ensuring compliance

### 2.2 Manager User
- **Who:** Shift manager or general manager
- **Goals:** Quickly enter daily tip data, correct errors, access reports
- **Pain Points:** Manual calculations are error-prone and time-consuming

### 2.3 Employee User
- **Who:** Servers, bussers, expeditors
- **Goals:** View tip earnings, track income over time
- **Pain Points:** Lack of transparency in tip distribution, delayed information

---

## 3. Functional Requirements

### 3.1 User Authentication & Authorization

#### 3.1.1 Admin Role
- [x] Admin can create username and password for their account *(the account is provisioned for them and they set their own password at first sign-in)*
- [x] Admin can perform all Manager functions
- [ ] Admin can access all tenants/locations they manage - *Partial: one account per venue with the same email; no cross-venue switcher. **Deprioritized 2026-09-24**: this was scoped for the owner running several venues personally. Once venues belong to other establishments, their admins shouldn't have (or want) cross-venue access to each other's data, and the owner/vendor shouldn't hold standing access into customer data either. What may still be worth building later is a much thinner platform-support layer (tenant provisioning, resetting a locked-out customer admin) — and only once the current manual flow (Lambda admin action + shared secret, see RUNBOOK_ADD_TENANT.md) becomes a bottleneck.*
- [x] Admin can create and manage Manager accounts *(Staff page: create, reset password and remove managers and shift leads)*
- [ ] Admin session timeout after 30 minutes of inactivity - *Sessions expire after 8 hours; there is no inactivity timeout*

#### 3.1.2 Manager Role
- [x] Manager can create username and password for their account *(created by an admin; they set their own password at first sign-in)*
- [x] Manager can only access their assigned location
- [x] Manager can view and enter tip data
- [ ] Manager session timeout after 30 minutes of inactivity - *Sessions expire after 8 hours; there is no inactivity timeout*

#### 3.1.3 Employee Access
- [x] Employee can access tip history using their email address (passwordless/magic link)
- [x] Employee can only view their own data
- [x] Employee can view tips for past 30 days *(built as the last 90 days)*
- [ ] Employee session timeout after 15 minutes of inactivity - *Sessions expire after 8 hours; there is no inactivity timeout*
- [ ] **Magic Link Security:**
  - [x] System rate limits magic link requests to 3 per email address per hour
  - [x] System rate limits to 10 requests per IP address per hour (prevents abuse)
  - [ ] After 5 failed/invalid magic link attempts from same IP, system requires CAPTCHA - *Not built*
  - [ ] System logs suspicious activity (many requests for different emails from same IP) - *Requests are stored with their IP address, but nothing detects or reports suspicious patterns*
  - [x] Magic links expire after 15 minutes
  - [x] Magic links are single-use only (cannot be reused after first click)

### 3.2 Employee Management

#### 3.2.1 Employee CRUD Operations
- [x] Admin can add new employees (name, email, role, hourly rate) *(each role can have its own rate)*
- [x] Admin can edit employee information
- [x] Admin can soft-delete/deactivate employees
- [x] Admin can reactivate deactivated employees *(Employees screen: Active/Inactive toggle; reactivating requires the role and every hourly rate to be entered again, nothing carries over)*
- [x] System maintains employee history (all versions) *(through the audit log)*

#### 3.2.2 Employee Roles
- [x] Support three employee types: Server, Busser, Expeditor *(four types: Server, Shift Lead, Busser, Expeditor)*
- [x] System validates role assignment
- [ ] Employee can only have one role at a time - *Superseded: an employee can hold several roles, each with its own rate, and a day can be split across them*

#### 3.2.3 Employee Compensation
- [x] System stores hourly rate for each employee *(one rate per role)*
- [x] Hourly rate changes tracked with effective dates *(the rate in force on the entry date is used in the calculation)*
- [ ] System displays current and historical hourly rates - *Current rates are shown; history is available through the API only*

### 3.3 System Configuration

#### 3.3.1 Shift Configuration *(removed from the product: tip entry is by day, not by shift)*
- [ ] ~~Admin can define shift names (e.g., Breakfast, Brunch, Lunch, Dinner)~~ - *Removed: there are no shifts*
- [ ] ~~Admin can add new shifts~~ - *Removed: there are no shifts*
- [ ] ~~Admin can edit shift names~~ - *Removed: there are no shifts*
- [ ] ~~Admin can deactivate shifts (soft delete)~~ - *Removed: there are no shifts*
- [ ] ~~System supports minimum 2 shifts, maximum 10 shifts per day~~ - *Removed: there are no shifts*

#### 3.3.2 Support Staff Percentage Configuration
- [x] Admin can set tip percentage for Busser role (global setting)
- [x] Admin can set tip percentage for Expeditor role (global setting)
- [x] Percentage changes tracked with effective date *(each role has its own effective date)*
- [x] System applies correct percentage based on tip entry date *(chosen by the tip entry date)*
- [x] Percentages must be between 0% and 50% (validation)

#### 3.3.3 Multi-Tenant Configuration
- [x] System supports multiple independent tenants (restaurants/locations)
- [x] Each tenant has isolated data (no cross-tenant data access)
- [ ] Admin can be assigned to multiple tenants - *Same as above: one account per venue. Deprioritized, see 3.1.1.*
- [x] Manager can only be assigned to one tenant
- [x] Tenant configuration includes: name, address, timezone *(name, address and timezone are stored; dates are shown in the browser's local time)*

### 3.4 Daily Tip Entry & Calculation

#### 3.4.1 Tip Entry Form
- [ ] **Timezone Handling:**
  - [ ] System displays current date in tenant's configured timezone - *The browser's local date is used*
  - [ ] Entry date defaults to current date in tenant's timezone - *The browser's local date is used*
  - [ ] Manager can select past dates (up to 30 days back) - *Not enforced: any past date is accepted*
  - [ ] Manager can select future dates (up to 2 days ahead for pre-entry) - *Not enforced*
  - [x] All dates stored in database as DATE type (timezone-agnostic)
  - [x] All timestamps (created_at, updated_at) stored in UTC
  - [ ] All display dates/times converted to tenant's timezone - *The browser's local time is used*
- [x] Manager selects date for tip entry
- [x] System checks if tip entry already exists for selected date
- [ ] If entry exists, system displays warning and prompts manager to edit existing entry - *Shows an 'entry already exists' error; corrections are made by deleting the entry and entering it again*
- [ ] Manager can override warning with explicit confirmation (for correction scenarios) - *The API has an admin-only override; the screen does not offer it*
- [ ] Manager enters starting drawer balance - *Not needed: the float is removed before counting, so the form asks for Cash in Register instead*
- [x] Manager enters closing drawer balance *(built as Cash in Register (after removing the starting float))*
- [x] Manager enters cash sales (from POS system or daily report)
- [x] System calculates cash tips: `Cash Tips = Closing Drawer - Starting Drawer - Cash Sales` *(built as Cash in Register minus Cash Sales plus Cash Tips (jar))*
- [ ] System validates closing drawer is greater than or equal to (starting drawer + cash sales) - *Not enforced: a short register is allowed; only the total pool must be zero or more*
- [x] System shows calculated cash tips to manager for verification *(Drawer Overage and Cash Tips Total update as you type)*
- [x] Manager enters electronic tips from POS system *(POS Tips)*
- [x] System calculates total tip pool (cash tips + electronic tips)
- [x] System automatically records manager name (logged-in user) *(recorded in the audit log)*
- [x] System timestamps entry creation (UTC, displayed in tenant timezone)

**Cash Tips Calculation Notes:**
- **Why cash sales?** The cash drawer contains starting float + cash sales + cash tips. To isolate tips, we subtract both starting float and cash sales.
- **Example:** Starting drawer $500, closing drawer $1,800, cash sales $1,000 → Cash tips = $1,800 - $500 - $1,000 = $300
- **Credit card only?** If restaurant doesn't accept cash payments, enter $0 for cash sales. Formula becomes: Closing - Starting = Cash Tips
- **Separate tip jar?** If tips are collected separately (not in register), enter starting = $0, closing = total tips collected, cash sales = $0

> **Update:** the form now asks for **Cash in Register** (float already removed), **Cash Sales**, **Cash Tips (jar)** and **POS Tips**. The pool is (Cash in Register - Cash Sales) + Cash Tips (jar) + POS Tips.

#### 3.4.2 Employee Shift Entry
- [x] Manager adds employees to the daily entry
- [x] For each employee, manager enters: *(no shifts)*
  - [x] Employee name (dropdown/search from active employees)
  - [x] Role for that day (Server, Busser, Expeditor)
  - [ ] ~~Shift(s) worked (multiple selection allowed)~~ - *Removed: there are no shifts*
  - [x] Hours worked (decimal format, e.g., 4.5)
- [x] System validates hours worked (0.5 to 24 hours)
- [x] System allows same employee to work multiple shifts *(built as one row per role for the same person)*
- [x] System validates at least one Server per shift *(checked per day: at least one Server or Shift Lead)*

#### 3.4.3 Tip Calculation Logic - Server Tips
- [x] System pools all tips for the day (single pool across all shifts)
- [x] System calculates total server hours across all shifts
- [x] System prorates tip pool to each server based on hours worked
  - Formula: `Server Tip = (Server Hours / Total Server Hours) × Total Tip Pool`
- [x] System assigns calculated tip amount to each server
- [x] **Multi-Shift Proration:** Tips are pooled across ALL shifts for the day
  - Servers earn tips based on total hours worked, regardless of which shifts
  - Example: Total tips $1000, Server A works 4 hrs lunch + 4 hrs dinner (8 hrs total), Server B works 8 hrs dinner only (8 hrs total) → Both earn $500 (equal hours = equal tips)
  - System does NOT calculate separate tip pools per shift
  - For display purposes only, if server worked multiple shifts, tips are divided evenly across their shifts

#### 3.4.4 Tip Calculation Logic - Support Staff Tips *(built differently: see the note at the end of this section)*
- [ ] For each support staff member (Busser/Expeditor): - *Superseded: see the built behavior below*
  - [ ] ~~System identifies which shifts they worked~~ - *Removed: there are no shifts; superseded by the built behavior below*
  - [ ] ~~System identifies servers who worked the same shift(s)~~ - *Removed: there are no shifts; superseded by the built behavior below*
  - [ ] ~~System calculates support staff tips from each server for shared shifts only~~ - *Superseded by the built behavior below*
    - Formula: `Support Tip from Server = Server's Shift Tip × Support Staff %`
  - [ ] ~~System sums all support staff tips from applicable servers~~ - *Superseded by the built behavior below*
- [x] System enforces cap: Support staff tip ≤ Highest earning server on their shift
- [x] If cap exceeded, system adjusts support staff tip to equal highest server tip
- [x] System supports up to 2 Bussers and 2 Expeditors per shift *(there is no fixed limit)*
- [x] **Built (owner decision, 2026-09-20):** each support role receives its configured percentage of the whole day's tip pool, split by hours among that role's staff; servers and shift leads share the remainder by hours. Because there are no shifts, support staff are not tied to particular servers.
- [x] **Per-tenant fork (2026-09-26): `supportSplitMode`.** The 2026-09-20 behavior above (now called `POOLED`) remains the default for every tenant except Pieces. Real Pieces data showed their actual rule is "each server gives 10% to *each* busser, 3% to each expo" — i.e. two bussers get 20% of the pool between them, not a shared 10% — so a `PER_PERSON` mode was added, scoped to Pieces via a `Tenant.supportSplitMode` flag:
  - `POOLED` *(baseline, all other tenants, unchanged)*: a role's % of the pool is split among that role's staff by hours.
  - `PER_PERSON` *(Pieces only)*: each support worker gets the *full* role % individually, prorated by their own hours against a manually-entered **"Total Shift Hours"** value for that entry (not total tipped hours — validated against 37 real Pieces shifts, ties to the penny). Added `TipEntry.shiftHours` (entry-form field, auto-filled from a per-day-of-week default) and `Tenant.shiftHours{Sun..Sat}` (defaults, editable on the Support Config page — only rendered for `PER_PERSON` tenants).
  - **Status:** code deployed to prod, migrated, and Pieces flipped to `PER_PERSON` (2026-09-26). Pieces's day-of-week shift-hours defaults are **not yet set** — until they are, a new Pieces tip entry will fail with `MISSING_SHIFT_HOURS` unless the manager enters "Total Shift Hours" by hand on that entry. Baseline (`POOLED`) tenants are fully unaffected and need no follow-up.

#### 3.4.5 Total Compensation Calculation
- [x] System calculates hourly wages: `Hourly Pay = Hourly Rate × Hours Worked`
- [x] System calculates total pay: `Total Pay = Hourly Pay + Tips`
- [x] System calculates effective hourly rate: `Effective Rate = Total Pay / Hours Worked`
- [x] All calculations displayed to 2 decimal places
- [ ] **Rounding Rules:**
  - [ ] All monetary calculations use standard rounding (round half up) - *Uses JavaScript rounding to cents, which can differ from strict half-up on some values*
  - [ ] Rounding performed at final step (not intermediate calculations) - *Each person's amount is rounded to cents as it is calculated*
  - [ ] Example: $10.125 rounds to $10.13, $10.124 rounds to $10.12
  - [x] Rounding remainders from tip distribution added to highest earner
  - [x] Example: $10.00 ÷ 3 = $3.33, $3.33, $3.34 (highest earner gets extra penny)
  - [x] System ensures total distributed equals exact tip pool amount (no money lost/created)
  - [x] Validation: Sum of all final tips must equal total tip pool (within $0.01 tolerance)

#### 3.4.6 Live Calculation Preview
- [ ] System shows live preview of tip calculations as manager enters data - *Built as an on-demand Preview Tips button; Drawer Overage, Cash Tips Total and Total Pool update as you type*
- [ ] Preview updates in real-time when:
  - [ ] Drawer balances change
  - [ ] Electronic tips amount changes
  - [ ] Employees are added/removed
  - [ ] Employee hours change
  - [ ] Employee shifts change
- [ ] Preview displays:
  - [x] Total tip pool (cash + electronic) *(Total Pool chip)*
  - [ ] Number of employees by role (servers, bussers, expeditors) - *Not shown*
  - [ ] Total hours worked - *Not shown; hours are listed per employee*
  - [x] Preview breakdown for each employee (name, role, estimated tips) *(name, roles, hours, wages, tips, total pay and effective rate)*
- [ ] Preview clearly marked as "PREVIEW - Not Saved" to avoid confusion - *Labelled Preview, without the words 'Not Saved'*
- [x] Preview helps manager catch errors before submission

#### 3.4.7 Calculation Results Display & Confirmation
- [x] System displays final summary of calculations after submission *(the entry page shows the pool and each person's result)*
- [ ] Summary includes: Total tips distributed, total hours, server count, support staff count - *No totals for hours or head counts*
- [ ] System displays individual breakdown for each employee:
  - [x] Name, Role, Shifts worked, Hours *(no shifts)*
  - [ ] Hourly pay, Tips earned, Total pay, Effective hourly rate - *The entry page has no separate hourly-pay column; Preview shows wages*
- [x] Manager reviews calculations and confirms accuracy *(publishing asks for confirmation)*
- [ ] Manager can go back to edit if errors found - *Not built after saving: delete the draft and enter it again*
- [x] System saves calculations to database only upon explicit confirmation *(saved when the manager clicks Save Tip Entry; emails go out only on Publish)*
- [ ] System displays success message with entry ID and timestamp - *Shows 'Published! N email(s) sent' and the published date, but no entry ID*

### 3.5 Data Management & History

#### 3.5.1 View Historical Entries
- [x] Manager can view list of all tip entries for their location *(newest first, from a chosen date (default: the last 14 days))*
- [ ] Manager can filter entries by date range - *A 'Show entries from' date only*
- [ ] Manager can search entries by employee name - *Not built*
- [ ] List displays: Date, Manager who entered, Total tips, Employee count, Status (Active/Deleted) - *Shows date, cash figures, POS tips and status*

#### 3.5.2 Edit Historical Entries *(API only; corrections are made by deleting an entry and entering it again)*
- [ ] Manager can select and edit any historical entry
- [ ] Edit form pre-populates with existing data
- [ ] Manager can modify any field
- [x] System recalculates tips upon save *(API)*
- [x] System creates new record with updated data *(API)*
- [x] System soft-deletes previous record (marks as deleted, retains data) *(API)*
- [x] System maintains link between old and new records (audit trail) *(API)*
- [x] System records: who edited, when edited, what changed *(API, in the audit log)*

#### 3.5.3 Audit Trail
- [x] System maintains complete history of all changes *(creates, deletes, publishes, edits, rate and percentage changes are logged)*
- [ ] Admin can view audit log showing: - *API only (GET /api/v1/audit); there is no screen*
  - [ ] Original entry timestamp and manager
  - [ ] All edits with timestamps and managers
  - [ ] Fields changed in each edit
- [x] Audit log cannot be modified or deleted *(no API can change or delete it)*
- [x] Audit log retained for 7 years *(records are never purged)*

### 3.6 Employee Self-Service

#### 3.6.1 Employee Login
- [x] Employee enters email address
- [x] System validates email against employee database
- [x] System checks rate limits (3 requests per email per hour, 10 per IP per hour)
- [ ] If rate limit exceeded, system displays error message with retry time - *The message says to try again later, without the time*
- [x] System sends magic link to employee email *(delivered through Amazon SES; verified 2026-09-20)*
- [x] Link valid for 15 minutes
- [x] Link is single-use only
- [x] Employee clicks link to access their dashboard
- [x] System validates link (not expired, not used, exists in database)
- [x] System marks link as used
- [ ] System creates temporary session (15-minute expiry) - *Sessions last 8 hours*

#### 3.6.2 Employee Dashboard
- [x] Employee sees their tip history for past 30 days *(built as the last 90 days)*
- [x] Display shows for each day/shift: *(no shifts)*
  - [x] Date
  - [ ] ~~Shift(s) worked~~ - *Removed: there are no shifts*
  - [x] Hours worked
  - [x] Tips earned
  - [x] Hourly pay *(shown as Wages)*
  - [x] Total pay
  - [x] Effective hourly rate
- [ ] Employee can filter by date range (within 30-day window) - *Not built*
- [ ] Employee can see monthly summary (total tips, total hours, average effective rate) - *Shows total tips and total pay for the 90-day window*

### 3.7 Reporting & Exports

#### 3.7.0 Payroll Report (built)
- [x] Admin/Manager picks a start and end date (max 1 year) on the Payroll page
- [x] Shows total tips per employee (cash + card combined) from **published** entries only, with days worked and hours
- [x] Warns about unpublished entries in the range (excluded from totals)
- [x] Download CSV: Employee, Email, Days Worked, Hours, Total Tips

#### 3.7.1 Export Functionality (totals CSV built; per-day detail export not built)
- [x] Manager can export tip data to CSV format *(the Payroll Report CSV)*
- [x] Manager can specify date range for export *(start and end date on the Payroll page)*
- [ ] Export includes all employee tip details for selected range - *The CSV has totals per employee, not per-day detail*
- [ ] CSV includes columns: Date, Employee Name, Role, Shift(s), Hours, Hourly Rate, Hourly Pay, Tips, Total Pay, Effective Rate, Manager (who entered) - *Not built; the CSV has Employee, Email, Days Worked, Hours and Total Tips*
- [x] System generates CSV file for download
- [x] Export limited to 1 year of data per request

#### 3.7.2 Reports
- [ ] Manager can view daily summary report (total tips, total hours, employee count)
- [ ] Manager can view weekly summary report
- [ ] Manager can view monthly summary report
- [ ] Reports include visual charts (tips over time, hours distribution)

### 3.8 Data Retention & Archival

#### 3.8.1 Active Data
- [x] System maintains current calendar year data in active database *(there is no archival yet, so all data is active)*
- [x] Employee 30-day view uses active data only
- [x] Manager can access all current year data

#### 3.8.2 Data Archival
- [ ] System automatically archives previous year data on January 31st
- [ ] Archived data moved to separate archive storage
- [ ] Archived data remains accessible to Admin (read-only)
- [ ] Archive retention period: 7 years for compliance

### 3.9 Built Beyond the Original PRD

- [x] **Shift Lead role:** a staff login that can only enter tips (the app shows them no wage or pay figures)
- [x] Shift leads are also a tipped role: they pool tips with servers by hours
- [x] Several roles per employee, each with its own hourly rate and effective-dated rate history
- [x] Deactivated employees are listed under **Inactive** on the Employees screen and can be reactivated (role and rates re-entered); adding a duplicate email explains where the existing record is
- [x] Tip entry by day (shifts removed) with Cash in Register, Cash Sales, Cash Tips (jar) and POS Tips inputs
- [x] **Draft and Published entries:** publishing locks the entry and emails each employee their summary
- [x] Corrections: delete an entry (with a warning when it is published) and enter it again for the same date
- [x] **Payroll Report** (Admin/Manager): total tips per employee for a chosen date range from published entries, with CSV download
- [x] **Tip Entries** list defaults to the trailing 14 days and warns about older unpublished entries
- [x] Tip email and Tip History show wages, tips, total pay and effective hourly rate, plus tips by role when two roles were worked
- [x] Role-based access: each login type can open only its own pages (enforced in the app and the API); employee logins carry an EMPLOYEE role
- [x] Support staff percentages with a separate effective date per role, applied by tip entry date
- [x] Staff management page: Admins manage Managers and Shift Leads; Managers manage Shift Leads
- [x] Multi-venue paths (`/<venue>`), per-venue branding and forced password change at first sign-in
- [x] Email sent as Gratify through Amazon SES with DKIM signing and a DMARC policy

---

## 4. Non-Functional Requirements

### 4.1 Performance
- [x] Tip calculation completes in < 5 seconds for up to 50 employees *(measured at about 0.1 ms for 50 employees)*
- [ ] Page load time < 2 seconds on 4G connection
- [ ] System supports 100 concurrent users
- [x] Database queries optimized with proper indexing *(indexes on the main lookup columns)*

### 4.2 Security
- [ ] All data encrypted in transit (TLS 1.3) - *HTTPS only, with a minimum of TLS 1.2*
- [x] All data encrypted at rest (AES-256) *(the database has storage encryption enabled)*
- [ ] Password requirements: minimum 12 characters, uppercase, lowercase, number, special character - *12+ characters with upper case, lower case and a number; a special character is not required*
- [ ] Failed login attempts locked after 5 tries (15-minute lockout) - *Login is limited to 10 attempts per IP address per 15 minutes*
- [x] Magic link for employees single-use only
- [ ] Regular security audits and penetration testing - *One security review done 2026-06-13*

### 4.3 Scalability
- [x] System designed for multi-tenant architecture
- [ ] Database sharding strategy for tenant isolation - *A shared database with tenant scoping is used instead*
- [ ] Support for 100+ tenants initially
- [ ] Horizontal scaling capability for future growth

### 4.4 Availability
- [ ] System uptime: 99.5% (excluding planned maintenance)
- [ ] Planned maintenance window: Sundays 2-4 AM (tenant timezone)
- [ ] Automated backups every 6 hours - *Automated daily backups with 7-day retention*
- [ ] Point-in-time recovery capability (30 days) - *Configured for 7 days*

### 4.5 Usability
- [ ] Mobile-responsive design (works on phones, tablets, desktops) - *Employee pages and emails work on phones; the manager menu is a fixed side panel*
- [ ] Intuitive UI requiring < 5 minutes training
- [ ] Accessibility compliance (WCAG 2.1 Level AA)
- [ ] Support for modern browsers (Chrome, Firefox, Safari, Edge - last 2 versions)

### 4.6 Compliance
- [ ] FLSA (Fair Labor Standards Act) compliance for tip pooling
- [ ] PCI DSS compliance not required (no payment processing)
- [ ] GDPR compliance for data privacy (if applicable)
- [ ] SOC 2 Type II compliance (future requirement)

---

## 5. Future Enhancements (Phase 2)

### 5.1 Email Notifications
- [x] System sends email to each employee after daily tips calculated *(sent when an entry is published)*
- [x] Email contains: Date, shifts worked, tips earned, total pay *(date, role(s), hours, wages, tips, total pay, effective rate and tips by role)*
- [ ] Employee can opt-in/opt-out of email notifications
- [ ] Customizable email templates

### 5.2 Advanced Reporting
- [ ] Predictive analytics for tip trends
- [ ] Employee performance metrics
- [ ] Comparative analysis across locations (for multi-location operators)

### 5.3 Mobile App
- [ ] Native iOS and Android apps for employees
- [ ] Push notifications for tip updates
- [ ] Biometric authentication

### 5.4 Integrations
- [ ] POS system integration (automatic electronic tip import)
- [x] Payroll system integration (export for payroll processing) *(the Payroll Report and CSV; totals are typed into Square by hand, there is no direct integration)*
- [ ] Accounting software integration (QuickBooks, Xero)

---

## 6. Technical Constraints

### 6.1 Browser Support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- No Internet Explorer support

### 6.2 Data Limits
- Maximum 50 employees per daily entry
- Maximum 10 shifts per day
- Maximum 365 days of data visible to managers at once

### 6.3 File Size Limits
- CSV export maximum 10 MB (approximately 50,000 rows)

---

## 7. Assumptions & Dependencies

### 7.1 Assumptions
- Managers have reliable internet access during tip entry
- Employees have email addresses
- All employees within a tenant are paid in the same currency
- Tips are calculated and distributed at end of day (not real-time)

### 7.2 Dependencies
- AWS account with appropriate service limits
- Amazon SES verified domain/email for sending emails
- SSL certificate via AWS Certificate Manager (ACM)
- Domain name for custom domain (optional but recommended)

---

## 8. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss due to system failure | High | Low | Automated backups every 6 hours, point-in-time recovery |
| Calculation errors | High | Medium | Comprehensive unit tests, user acceptance testing, audit trail |
| Security breach | High | Low | Encryption, regular security audits, access controls |
| Manager data entry errors | Medium | High | Edit capability, validation rules, confirmation screens |
| Poor user adoption | Medium | Medium | Training materials, intuitive UI, responsive support |
| Scalability issues | Medium | Low | Cloud-native architecture, load testing |

---

## 9. Success Criteria

### 9.1 Launch Criteria
- [ ] All P0 (critical) requirements implemented and tested
- [ ] Security audit passed
- [ ] User acceptance testing completed with 3 pilot restaurants - *In progress: Pieces is running in parallel with the old system*
- [ ] Documentation completed (user guides, admin guides)
- [ ] Support process established

### 9.2 Post-Launch Metrics (30 days)
- 90% of managers enter tips daily without support requests
- Zero calculation errors reported
- < 1% of entries require correction
- 80% employee satisfaction score
- 99% system uptime

---

## 10. Out of Scope (for v1.0)

- Real-time tip tracking during shifts
- Employee scheduling integration
- Time clock integration
- Cash register/POS integration
- Multi-currency support
- Tax withholding calculations
- Direct deposit / payment processing
- Customer tip suggestions or feedback
- Inventory management
- Employee performance reviews

---

## 11. Glossary

**Tip Pool:** Combined total of all tips (cash + electronic) collected during a business day

**Proration:** Division of tip pool based on proportional hours worked

**Support Staff:** Bussers and Expeditors who receive a percentage of server tips

**Soft Delete:** Marking a record as deleted without physically removing it from database

**Magic Link:** Time-limited authentication link sent via email (passwordless login)

**Tenant:** An independent restaurant or coffee shop location using the system

**Effective Hourly Rate:** Total compensation (hourly wages + tips) divided by hours worked

**Audit Trail:** Complete historical record of all data changes and user actions

**Shift Lead:** Staff role that enters tips for the day and also shares the server tip pool

**Draft / Published Entry:** A saved entry is a draft until a manager publishes it; publishing emails each employee and counts the entry in payroll

**Effective Date:** The day a rate or percentage change starts to apply; calculations use the value in force on the tip entry date

---

## 12. Approval & Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| Business Stakeholder | | | |

---

**Document End**

*This PRD serves as the single source of truth for the Tip Pooling Management System. All features must be checked off upon implementation completion. Any changes to requirements must be documented via formal change request process.*
