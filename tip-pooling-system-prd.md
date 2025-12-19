# Product Requirements Document (PRD)
## Tip Pooling Management System

**Document Version:** 1.0  
**Last Updated:** November 9, 2025  
**Product Owner:** [To be filled]  
**Status:** Draft

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
- [ ] Admin can create username and password for their account
- [ ] Admin can perform all Manager functions
- [ ] Admin can access all tenants/locations they manage
- [ ] Admin can create and manage Manager accounts
- [ ] Admin session timeout after 30 minutes of inactivity

#### 3.1.2 Manager Role
- [ ] Manager can create username and password for their account
- [ ] Manager can only access their assigned location
- [ ] Manager can view and enter tip data
- [ ] Manager session timeout after 30 minutes of inactivity

#### 3.1.3 Employee Access
- [ ] Employee can access tip history using their email address (passwordless/magic link)
- [ ] Employee can only view their own data
- [ ] Employee can view tips for past 30 days
- [ ] Employee session timeout after 15 minutes of inactivity

### 3.2 Employee Management

#### 3.2.1 Employee CRUD Operations
- [ ] Admin can add new employees (name, email, role, hourly rate)
- [ ] Admin can edit employee information
- [ ] Admin can soft-delete/deactivate employees
- [ ] Admin can reactivate deactivated employees
- [ ] System maintains employee history (all versions)

#### 3.2.2 Employee Roles
- [ ] Support three employee types: Server, Busser, Expeditor
- [ ] System validates role assignment
- [ ] Employee can only have one role at a time

#### 3.2.3 Employee Compensation
- [ ] System stores hourly rate for each employee
- [ ] Hourly rate changes tracked with effective dates
- [ ] System displays current and historical hourly rates

### 3.3 System Configuration

#### 3.3.1 Shift Configuration
- [ ] Admin can define shift names (e.g., Breakfast, Brunch, Lunch, Dinner)
- [ ] Admin can add new shifts
- [ ] Admin can edit shift names
- [ ] Admin can deactivate shifts (soft delete)
- [ ] System supports minimum 2 shifts, maximum 10 shifts per day

#### 3.3.2 Support Staff Percentage Configuration
- [ ] Admin can set tip percentage for Busser role (global setting)
- [ ] Admin can set tip percentage for Expeditor role (global setting)
- [ ] Percentage changes tracked with effective date
- [ ] System applies correct percentage based on tip entry date
- [ ] Percentages must be between 0% and 50% (validation)

#### 3.3.3 Multi-Tenant Configuration
- [ ] System supports multiple independent tenants (restaurants/locations)
- [ ] Each tenant has isolated data (no cross-tenant data access)
- [ ] Admin can be assigned to multiple tenants
- [ ] Manager can only be assigned to one tenant
- [ ] Tenant configuration includes: name, address, timezone

### 3.4 Daily Tip Entry & Calculation

#### 3.4.1 Tip Entry Form
- [ ] Manager selects date for tip entry
- [ ] Manager enters starting drawer balance
- [ ] Manager enters closing drawer balance
- [ ] System calculates cash tips (closing - starting balance)
- [ ] Manager enters electronic tips from POS system
- [ ] System calculates total tip pool (cash + electronic)
- [ ] System automatically records manager name (logged-in user)
- [ ] System timestamps entry creation

#### 3.4.2 Employee Shift Entry
- [ ] Manager adds employees to the daily entry
- [ ] For each employee, manager enters:
  - [ ] Employee name (dropdown/search from active employees)
  - [ ] Role for that day (Server, Busser, Expeditor)
  - [ ] Shift(s) worked (multiple selection allowed)
  - [ ] Hours worked (decimal format, e.g., 4.5)
- [ ] System validates hours worked (0.5 to 16 hours)
- [ ] System allows same employee to work multiple shifts
- [ ] System validates at least one Server per shift

#### 3.4.3 Tip Calculation Logic - Server Tips
- [ ] System pools all tips for the day
- [ ] System calculates total server hours across all shifts
- [ ] System prorates tip pool to each server based on hours worked
  - Formula: `Server Tip = (Server Hours / Total Server Hours) × Total Tip Pool`
- [ ] System assigns calculated tip amount to each server
- [ ] System breaks down server tips by shift if server worked multiple shifts

#### 3.4.4 Tip Calculation Logic - Support Staff Tips
- [ ] For each support staff member (Busser/Expeditor):
  - [ ] System identifies which shifts they worked
  - [ ] System identifies servers who worked the same shift(s)
  - [ ] System calculates support staff tips from each server for shared shifts only
    - Formula: `Support Tip from Server = Server's Shift Tip × Support Staff %`
  - [ ] System sums all support staff tips from applicable servers
- [ ] System enforces cap: Support staff tip ≤ Highest earning server on their shift
- [ ] If cap exceeded, system adjusts support staff tip to equal highest server tip
- [ ] System supports up to 2 Bussers and 2 Expeditors per shift

#### 3.4.5 Total Compensation Calculation
- [ ] System calculates hourly wages: `Hourly Pay = Hourly Rate × Hours Worked`
- [ ] System calculates total pay: `Total Pay = Hourly Pay + Tips`
- [ ] System calculates effective hourly rate: `Effective Rate = Total Pay / Hours Worked`
- [ ] All calculations displayed to 2 decimal places

#### 3.4.6 Calculation Results Display
- [ ] System displays summary of calculations after submission
- [ ] Summary includes: Total tips distributed, total hours, server count, support staff count
- [ ] System displays individual breakdown for each employee:
  - [ ] Name, Role, Shifts worked, Hours
  - [ ] Hourly pay, Tips earned, Total pay, Effective hourly rate
- [ ] Manager can review before final confirmation
- [ ] System saves calculations to database upon confirmation

### 3.5 Data Management & History

#### 3.5.1 View Historical Entries
- [ ] Manager can view list of all tip entries for their location
- [ ] Manager can filter entries by date range
- [ ] Manager can search entries by employee name
- [ ] List displays: Date, Manager who entered, Total tips, Employee count, Status (Active/Deleted)

#### 3.5.2 Edit Historical Entries
- [ ] Manager can select and edit any historical entry
- [ ] Edit form pre-populates with existing data
- [ ] Manager can modify any field
- [ ] System recalculates tips upon save
- [ ] System creates new record with updated data
- [ ] System soft-deletes previous record (marks as deleted, retains data)
- [ ] System maintains link between old and new records (audit trail)
- [ ] System records: who edited, when edited, what changed

#### 3.5.3 Audit Trail
- [ ] System maintains complete history of all changes
- [ ] Admin can view audit log showing:
  - [ ] Original entry timestamp and manager
  - [ ] All edits with timestamps and managers
  - [ ] Fields changed in each edit
- [ ] Audit log cannot be modified or deleted
- [ ] Audit log retained for 7 years

### 3.6 Employee Self-Service

#### 3.6.1 Employee Login
- [ ] Employee enters email address
- [ ] System sends magic link to employee email
- [ ] Link valid for 15 minutes
- [ ] Employee clicks link to access their dashboard
- [ ] System creates temporary session

#### 3.6.2 Employee Dashboard
- [ ] Employee sees their tip history for past 30 days
- [ ] Display shows for each day/shift:
  - [ ] Date
  - [ ] Shift(s) worked
  - [ ] Hours worked
  - [ ] Tips earned
  - [ ] Hourly pay
  - [ ] Total pay
  - [ ] Effective hourly rate
- [ ] Employee can filter by date range (within 30-day window)
- [ ] Employee can see monthly summary (total tips, total hours, average effective rate)

### 3.7 Reporting & Exports

#### 3.7.1 Export Functionality
- [ ] Manager can export tip data to CSV format
- [ ] Manager can specify date range for export
- [ ] Export includes all employee tip details for selected range
- [ ] CSV includes columns: Date, Employee Name, Role, Shift(s), Hours, Hourly Rate, Hourly Pay, Tips, Total Pay, Effective Rate, Manager (who entered)
- [ ] System generates CSV file for download
- [ ] Export limited to 1 year of data per request

#### 3.7.2 Reports
- [ ] Manager can view daily summary report (total tips, total hours, employee count)
- [ ] Manager can view weekly summary report
- [ ] Manager can view monthly summary report
- [ ] Reports include visual charts (tips over time, hours distribution)

### 3.8 Data Retention & Archival

#### 3.8.1 Active Data
- [ ] System maintains current calendar year data in active database
- [ ] Employee 30-day view uses active data only
- [ ] Manager can access all current year data

#### 3.8.2 Data Archival
- [ ] System automatically archives previous year data on January 31st
- [ ] Archived data moved to separate archive storage
- [ ] Archived data remains accessible to Admin (read-only)
- [ ] Archive retention period: 7 years for compliance

---

## 4. Non-Functional Requirements

### 4.1 Performance
- [ ] Tip calculation completes in < 5 seconds for up to 50 employees
- [ ] Page load time < 2 seconds on 4G connection
- [ ] System supports 100 concurrent users
- [ ] Database queries optimized with proper indexing

### 4.2 Security
- [ ] All data encrypted in transit (TLS 1.3)
- [ ] All data encrypted at rest (AES-256)
- [ ] Password requirements: minimum 12 characters, uppercase, lowercase, number, special character
- [ ] Failed login attempts locked after 5 tries (15-minute lockout)
- [ ] Magic link for employees single-use only
- [ ] Regular security audits and penetration testing

### 4.3 Scalability
- [ ] System designed for multi-tenant architecture
- [ ] Database sharding strategy for tenant isolation
- [ ] Support for 100+ tenants initially
- [ ] Horizontal scaling capability for future growth

### 4.4 Availability
- [ ] System uptime: 99.5% (excluding planned maintenance)
- [ ] Planned maintenance window: Sundays 2-4 AM (tenant timezone)
- [ ] Automated backups every 6 hours
- [ ] Point-in-time recovery capability (30 days)

### 4.5 Usability
- [ ] Mobile-responsive design (works on phones, tablets, desktops)
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
- [ ] System sends email to each employee after daily tips calculated
- [ ] Email contains: Date, shifts worked, tips earned, total pay
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
- [ ] Payroll system integration (export for payroll processing)
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
- [ ] User acceptance testing completed with 3 pilot restaurants
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
