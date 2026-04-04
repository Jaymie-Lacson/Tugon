# TUGON — Full UI/UX Design & Redesign Analysis
**Prepared for AI-powered redesign tools (Google Stitch / v0 / Locofy)**
**Date:** 2026-03-28 | **Analyst Role:** Senior UI/UX Engineer & Product Designer
**Live URL:** https://tugon-rho.vercel.app/

---

## TABLE OF CONTENTS
1. [Sitemap](#1-sitemap)
2. [Page Breakdown](#2-page-breakdown)
3. [Component Inventory](#3-component-inventory)
4. [Design System](#4-design-system)
5. [UX Flows](#5-ux-flows)
6. [Issues & Weaknesses](#6-issues--weaknesses)
7. [Redesign Blueprint](#7-redesign-blueprint)

---

## 1. SITEMAP

```
tugon-rho.vercel.app/
│
├── / ................................ Landing Page (Public)
├── /community-map .................. Public Community Map
│
├── /auth/
│   ├── /login ...................... Phone + Password Login
│   ├── /register ................... New User Registration
│   ├── /verify ..................... OTP Verification (post-register)
│   ├── /create-password ............ Initial Password Setup
│   └── /forgot-password ............ Password Reset Flow
│
├── /citizen/ ........................ [ROLE: CITIZEN only]
│   ├── /citizen ..................... Citizen Dashboard (Home)
│   ├── /citizen/report .............. Submit Incident Report
│   ├── /citizen/my-reports .......... View My Submitted Reports
│   └── /citizen/verification ........ Upload ID / Verification Status
│
├── /app/ ............................ [ROLE: OFFICIAL + SUPER_ADMIN]
│   ├── /app ......................... Official Dashboard
│   ├── /app/incidents ............... Incidents Management List
│   ├── /app/map ..................... Interactive Incident Map
│   ├── /app/analytics ............... Analytics & Charts
│   ├── /app/reports ................. Reports Management
│   ├── /app/verifications ........... Citizen ID Review [OFFICIAL only]
│   └── /app/settings ................ Account Settings
│
└── /superadmin/ ..................... [ROLE: SUPER_ADMIN only]
    ├── /superadmin .................. System Overview Dashboard
    ├── /superadmin/map .............. Barangay Map Monitor
    ├── /superadmin/analytics ........ System-Wide Analytics
    ├── /superadmin/users ............ User Management
    ├── /superadmin/audit-logs ....... Audit Logs
    └── /superadmin/settings ......... System Settings
```

**Total Pages:** 21 distinct pages across 4 portals (Public, Citizen, Official, Super Admin)

---

## 2. PAGE BREAKDOWN

---

### 2.1 Landing Page — `/`

**Purpose:** Public-facing marketing and information page. Entry point for all users. Drives registrations and communicates the system's mission.

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  NAVBAR  [Logo | Nav Links | CTA]   │
├─────────────────────────────────────┤
│  HERO SECTION                       │
│  Headline + Subtext + CTA Buttons   │
├─────────────────────────────────────┤
│  FEATURES SECTION (3–4 columns)     │
├─────────────────────────────────────┤
│  HOW IT WORKS (3-step flow)         │
├─────────────────────────────────────┤
│  MAP PREVIEW / CTA BANNER           │
├─────────────────────────────────────┤
│  FOOTER [Links | Contact | Branding]│
└─────────────────────────────────────┘
```

**Key UI Components:**
- Top navigation bar with logo, nav links, Login & Register CTAs
- Full-width hero with headline, supporting text, two CTA buttons (Register / View Map)
- Feature cards (icon + title + description)
- Step-by-step process section
- Footer with barangay codes and contact info

**Content Hierarchy:**
1. Brand identity (logo + name "TUGON")
2. Problem/solution headline
3. Primary CTA (Register)
4. Feature benefits
5. Community map teaser
6. Footer

---

### 2.2 Public Community Map — `/community-map`

**Purpose:** Allows unauthenticated visitors to view incident pins on a map without logging in.

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  MINIMAL NAVBAR                     │
├─────────────────────────────────────┤
│  FULL-SCREEN MAP                    │
│  [Incident Pins + Barangay Layers]  │
│  [Legend Panel - bottom or side]    │
└─────────────────────────────────────┘
```

**Key UI Components:**
- Full-screen Leaflet/Mapbox map
- Incident marker pins with severity colors
- Barangay boundary overlays
- Legend panel (severity/type key)
- Back to Home link

---

### 2.3 Login — `/auth/login`

**Purpose:** Authenticate existing users (Citizen, Official, Super Admin) via phone number + password.

**Layout Structure:**
```
┌────────────┬────────────────────────┐
│ LEFT PANEL │  RIGHT PANEL           │
│ (440px)    │  (flex)                │
│            │  ┌──────────────────┐  │
│  Aerial    │  │   FORM CARD      │  │
│  Tondo     │  │   Logo           │  │
│  Photo +   │  │   Welcome title  │  │
│  Gradient  │  │   Phone input    │  │
│  Overlay   │  │   Password input │  │
│  +         │  │   Forgot PW link │  │
│  Brand     │  │   Login button   │  │
│  Quote     │  │   Register link  │  │
│            │  └──────────────────┘  │
└────────────┴────────────────────────┘
```

**Key UI Components:**
- Two-column layout (photo panel + form panel)
- Logo at top of form card
- Phone number input (with country code prefix)
- Password input (with show/hide toggle)
- "Forgot Password" text link
- Primary blue CTA button — "Log In"
- "Don't have an account? Register" link
- Form validation error states (red border + message)

**Content Hierarchy:**
1. Logo / branding
2. "Welcome back" heading
3. Phone + Password fields
4. Login button
5. Forgot password
6. Register redirect

---

### 2.4 Register — `/auth/register`

**Purpose:** New user registration. Collects phone number and barangay code to initiate OTP verification.

**Layout Structure:** Same two-column pattern as Login.

**Key UI Components:**
- Full name input
- Phone number input
- Barangay code selector/input (251, 252, 256)
- "Send OTP" / Continue button
- Already have account → Login link
- Inline form validation

**Content Hierarchy:**
1. "Create your account" heading
2. Name, Phone, Barangay fields
3. Submit button
4. Login redirect

---

### 2.5 OTP Verify — `/auth/verify`

**Purpose:** Verify the user's phone number via a one-time password sent via SMS.

**Layout Structure:** Same two-column auth layout, minimal form.

**Key UI Components:**
- 6-digit OTP input (segmented boxes or single input)
- Countdown timer for resend
- Resend OTP button (disabled during countdown)
- Submit/Verify button
- Back link

---

### 2.6 Create Password — `/auth/create-password`

**Purpose:** First-time password setup after OTP verification.

**Layout Structure:** Same two-column auth layout.

**Key UI Components:**
- Password input (with strength indicator)
- Confirm password input
- Password rules list
- Submit button ("Set Password")

---

### 2.7 Forgot Password — `/auth/forgot-password`

**Purpose:** Multi-step password reset flow: enter phone → verify OTP → set new password.

**Layout Structure:** Same two-column auth layout, step-based form.

**Key UI Components:**
- Step indicator (Step 1 of 3)
- Phone input (Step 1)
- OTP input (Step 2)
- New password + confirm (Step 3)
- Back button between steps

---

### 2.8 Citizen Dashboard — `/citizen`

**Purpose:** Home view for citizens. Shows nearby incidents, verification status prompt, and a map tab.

**Layout Structure:**
```
┌─────────────────────────────────────────┐
│  HEADER  [Logo | Live Time | Bell | Avi]│
├─────────────────────────────────────────┤
│  VERIFICATION PROMPT BANNER             │
│  (if not verified: yellow/red bar)      │
├─────────────────────────────────────────┤
│  TAB NAV: Home | Report | Map | Reports │
├─────────────────────────────────────────┤
│  CONTENT AREA (based on active tab)     │
│                                         │
│  HOME TAB:                              │
│  ┌──────────────┐ ┌──────────────┐      │
│  │ Stat Card    │ │ Stat Card    │      │
│  └──────────────┘ └──────────────┘      │
│  ┌───────────────────────────────┐      │
│  │ Recent Incidents List         │      │
│  └───────────────────────────────┘      │
├─────────────────────────────────────────┤
│  MOBILE BOTTOM NAV BAR                  │
└─────────────────────────────────────────┘
```

**Key UI Components:**
- Sticky top header with notification bell + avatar
- Verification prompt banner (color-coded by status):
  - Blue: "Verify your account" (not submitted)
  - Yellow: "Verification submitted" (pending)
  - Red: "Action needed: re-upload your ID" (rejected)
  - Green badge: "Verified Citizen" (approved)
- Tab navigation (Home, Report, Map, My Reports, Profile)
- Stat summary cards (total incidents nearby, active count)
- Scrollable incident feed (card per incident with severity badge)
- Mobile bottom navigation bar (fixed)

---

### 2.9 Submit Incident Report — `/citizen/report`

**Purpose:** Citizen form to report a community incident.

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  PAGE HEADER  [Back arrow + Title]  │
├─────────────────────────────────────┤
│  REPORT FORM                        │
│  ┌───────────────────────────────┐  │
│  │  Incident Type Selector       │  │
│  │  Severity Dropdown            │  │
│  │  Description Textarea         │  │
│  │  Location Input / Map Pin     │  │
│  │  Photo Upload                 │  │
│  │  [Submit Report Button]       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Key UI Components:**
- Page back arrow + "Report Incident" heading
- Incident type select (flood, accident, medical, crime, etc.)
- Severity radio/select (Low, Medium, Critical)
- Description textarea (multiline, char count)
- Location: address text input + map pin picker
- Photo upload (drag-and-drop + preview)
- Disabled state if user is not verified
- Submit button (green)
- Success/error feedback toast

---

### 2.10 My Reports — `/citizen/my-reports`

**Purpose:** Citizen's personal report history. Shows status of each submitted report.

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  PAGE HEADER                        │
├─────────────────────────────────────┤
│  FILTER BAR  [Status Filter Tabs]   │
├─────────────────────────────────────┤
│  REPORT CARD LIST                   │
│  ┌───────────────────────────────┐  │
│  │ [Type Icon] Title             │  │
│  │ Date | Severity Badge         │  │
│  │ Status Badge (active/closed)  │  │
│  └───────────────────────────────┘  │
│  ... (more cards)                   │
└─────────────────────────────────────┘
```

**Key UI Components:**
- Status filter tabs (All, Active, Resolved)
- Report cards with: type icon, title, date, severity badge, status badge
- Empty state illustration + CTA when no reports
- Pull-to-refresh on mobile

---

### 2.11 Citizen Verification — `/citizen/verification`

**Purpose:** Upload a government-issued ID for identity verification. View current verification status.

**Layout Structure:**
```
┌─────────────────────────────────────┐
│  PAGE HEADER                        │
├─────────────────────────────────────┤
│  STATUS CARD                        │
│  (Current verification status)      │
├─────────────────────────────────────┤
│  UPLOAD SECTION                     │
│  [Drag & Drop zone / file picker]   │
│  [ID Preview if already uploaded]   │
├─────────────────────────────────────┤
│  [Submit / Re-upload Button]        │
└─────────────────────────────────────┘
```

**Key UI Components:**
- Status display card (Pending/Approved/Rejected with color)
- Rejection reason display (if rejected)
- File upload dropzone (image preview)
- Submit button (disabled when approved)
- Informational text about ID requirements

---

### 2.12 Official Dashboard — `/app`

**Purpose:** Primary command center for barangay officials. Shows live incidents, heatmap, and quick stats.

**Layout Structure:**
```
┌──────────┬──────────────────────────────────┐
│ SIDEBAR  │  TOP HEADER                      │
│ (240px)  │  [Breadcrumb | Clock | Bell | Av]│
│          ├──────────────────────────────────┤
│ Logo     │  ALERT BANNER (if any alerts)    │
│ Nav Menu ├──────────────────────────────────┤
│          │  STAT CARDS ROW (4 cards)        │
│ [Active] │  [Total | Active | Responding |  │
│          │   Resolved]                      │
│ Settings ├──────────────────────────────────┤
│          │  ┌─────────────┐ ┌────────────┐  │
│ Profile  │  │ INCIDENT    │ │  HEATMAP   │  │
│          │  │ FEED LIST   │ │  (Map View)│  │
└──────────┘  └─────────────┘ └────────────┘  │
             ├──────────────────────────────────┤
             │  RECENT REPORTS TABLE           │
             └──────────────────────────────────┘
```

**Key UI Components:**
- Dark blue sidebar (240px) with logo, nav links, profile section
- Top header: breadcrumb, live PH time clock, date, notification bell, avatar menu
- Alert banner (critical incident callout)
- 4 summary stat cards (icon + number + label)
- Incident feed list (latest incidents with severity/status badges)
- Map/heatmap widget (mini map with incident overlay)
- Recent reports summary table

---

### 2.13 Incidents — `/app/incidents`

**Purpose:** Full list of all incidents with filtering, sorting, and status management.

**Layout Structure:**
```
┌──────────┬──────────────────────────────────┐
│ SIDEBAR  │  PAGE HEADER + SEARCH + FILTERS  │
│          ├──────────────────────────────────┤
│          │  INCIDENTS TABLE                 │
│          │  [Col: Type|Severity|Status|     │
│          │   Location|Date|Reported By|     │
│          │   Actions]                       │
│          ├──────────────────────────────────┤
│          │  PAGINATION                      │
└──────────┴──────────────────────────────────┘
```

**Key UI Components:**
- Search input bar
- Filter dropdowns: Severity, Status, Type, Barangay, Date range
- Data table with sortable columns
- Status badges (Active/Responding/Resolved)
- Severity badges (Critical/Medium/Low) with color dots
- Row action buttons (View, Assign, Update Status)
- Pagination controls
- Empty state

---

### 2.14 Official Map — `/app/map`

**Purpose:** Full-screen interactive map showing all incidents geographically.

**Layout Structure:**
```
┌──────────┬──────────────────────────────────┐
│ SIDEBAR  │  MAP CONTROLS BAR                │
│          ├──────────────────────────────────┤
│          │                                  │
│          │    FULL-SCREEN MAP               │
│          │    [Incident Pins]               │
│          │    [Barangay Boundaries]         │
│          │    [Cluster Markers]             │
│          │                                  │
│          │  ┌─────────────┐                 │
│          │  │ LEGEND PANEL│                 │
│          │  └─────────────┘                 │
└──────────┴──────────────────────────────────┘
```

**Key UI Components:**
- Filter by severity/type/barangay controls
- Incident marker pins (color-coded by severity)
- Barangay overlay polygons
- Clickable pins → incident detail popover
- Legend panel
- Zoom/layer controls

---

### 2.15 Analytics — `/app/analytics`

**Purpose:** Visual analytics dashboard for barangay officials to monitor trends and patterns.

**Layout Structure:**
```
┌──────────┬──────────────────────────────────┐
│ SIDEBAR  │  PAGE HEADER + DATE RANGE FILTER │
│          ├──────────────────────────────────┤
│          │  STAT SUMMARY CARDS (top row)    │
│          ├──────────────────────────────────┤
│          │  ┌──────────────┐ ┌───────────┐  │
│          │  │ LINE CHART   │ │ BAR CHART │  │
│          │  │ (trends)     │ │ (by type) │  │
│          │  └──────────────┘ └───────────┘  │
│          ├──────────────────────────────────┤
│          │  ┌──────────────┐ ┌───────────┐  │
│          │  │ PIE CHART    │ │ TABLE     │  │
│          │  │ (categories) │ │ (top locs)│  │
│          │  └──────────────┘ └───────────┘  │
└──────────┴──────────────────────────────────┘
```

**Key UI Components:**
- Date range picker/filter
- Stat cards (total this week, most common type, peak time)
- Line chart (incident trend over time)
- Bar chart (incidents by type/severity)
- Pie/donut chart (category distribution)
- Top locations table

---

### 2.16 Reports — `/app/reports`

**Purpose:** Manage citizen-submitted reports. Review, filter, and update report statuses.

**Layout Structure:** Similar to Incidents page — search bar, filter bar, data table, pagination.

**Key UI Components:**
- Search bar
- Status filter tabs
- Reports data table (Reporter name, type, date, status, actions)
- View report detail modal/drawer
- Approve/Reject/Flag action buttons

---

### 2.17 Verifications — `/app/verifications` [OFFICIAL only]

**Purpose:** Review citizen ID verification submissions. Approve, reject, or request re-upload.

**Layout Structure:**
```
┌──────────┬──────────────────────────────────┐
│ SIDEBAR  │  PAGE HEADER + FILTER            │
│          ├──────────────────────────────────┤
│          │  VERIFICATION CARDS GRID         │
│          │  ┌────────┐ ┌────────┐ ┌──────┐  │
│          │  │ User   │ │ User   │ │ User │  │
│          │  │ ID img │ │ ID img │ │ ...  │  │
│          │  │ Actions│ │ Actions│ │      │  │
│          │  └────────┘ └────────┘ └──────┘  │
└──────────┴──────────────────────────────────┘
```

**Key UI Components:**
- Filter tabs (Pending, Approved, Rejected, All)
- Verification request cards (user name, ID image thumbnail, submission date)
- Action buttons: Approve (green), Reject (red), Request Re-upload (gold)
- Rejection reason textarea modal
- Status badges

---

### 2.18 Settings — `/app/settings`

**Purpose:** User account settings — update profile, change password, notification preferences.

**Layout Structure:**
```
┌──────────┬──────────────────────────────────┐
│ SIDEBAR  │  PAGE HEADER                     │
│          ├──────────────────────────────────┤
│          │  ┌──────────────────────────┐    │
│          │  │ PROFILE SECTION          │    │
│          │  │ [Avatar | Name | Role]   │    │
│          │  │ Edit name button         │    │
│          │  └──────────────────────────┘    │
│          │  ┌──────────────────────────┐    │
│          │  │ SECURITY SECTION         │    │
│          │  │ Change Password form     │    │
│          │  └──────────────────────────┘    │
└──────────┴──────────────────────────────────┘
```

**Key UI Components:**
- Profile card (avatar, full name, phone, role badge)
- Editable name field with save button
- Change password form (current, new, confirm)
- Save/cancel buttons

---

### 2.19 Super Admin Overview — `/superadmin`

**Purpose:** Bird's-eye view of the entire system: all barangays, user counts, incident totals, system health.

**Layout Structure:**
```
┌──────────┬──────────────────────────────────┐
│ SA       │  PAGE HEADER                     │
│ SIDEBAR  ├──────────────────────────────────┤
│          │  SYSTEM STAT CARDS (6 cards)     │
│          │  [Users|Officials|Reports|...]   │
│  [Bgy    ├──────────────────────────────────┤
│   Monitor│  ┌──────────────┐ ┌───────────┐  │
│   Panel] │  │ BARANGAY     │ │ ACTIVITY  │  │
│          │  │ STATUS LIST  │ │ FEED      │  │
│          │  └──────────────┘ └───────────┘  │
└──────────┴──────────────────────────────────┘
```

**Key UI Components:**
- Super Admin sidebar with barangay monitoring panel (color-coded incident counts: Green <5, Orange 5–9, Red 10+)
- System-wide stat cards
- Per-barangay status list (251, 252, 256 with active incident counts)
- Recent activity feed
- System health indicators

---

### 2.20 Super Admin Users — `/superadmin/users`

**Purpose:** Manage all users: view, ban, unban, change roles, filter by barangay/role.

**Layout Structure:** Search + filter bar + users data table + action modals.

**Key UI Components:**
- Search bar (name/phone)
- Role filter (Citizen/Official/All)
- Barangay filter
- Users table (Name, Phone, Role, Barangay, Status, Actions)
- Status badge (Active/Banned)
- Ban/Unban toggle button
- Role change dropdown
- Confirmation modal for destructive actions

---

### 2.21 Super Admin Audit Logs — `/superadmin/audit-logs`

**Purpose:** View timestamped system event logs for accountability and compliance.

**Layout Structure:** Date filter + logs table/timeline.

**Key UI Components:**
- Date range picker
- Event type filter
- Logs table (Timestamp, Actor, Action, Target, IP)
- Monospaced/code-like log entry formatting
- Export button (CSV/PDF)

---

## 3. COMPONENT INVENTORY

### 3.1 Navigation Components

| Component | Usage | Notes |
|-----------|-------|-------|
| `Layout.tsx` Sidebar | Official/Admin portal | 240px dark blue (#1E3A8A), icon + label nav items |
| `SuperAdminLayout.tsx` Sidebar | Super Admin portal | Same structure + barangay monitor panel |
| `CitizenDesktopNav.tsx` | Citizen desktop tab bar | Horizontal tab navigation below header |
| `CitizenMobileMenu.tsx` | Citizen mobile | Hamburger → dropdown panel |
| Mobile Bottom Nav Bar | Citizen mobile | Fixed bottom, 5 icons |
| Top Header Bar | Official + SA portals | 56px, breadcrumb + clock + bell + avatar |
| Citizen Header | Citizen portal | Logo + notifications + avatar |
| Notification Bell | All portals | Badge with unread count |
| Avatar Menu | All portals | Dropdown: profile, sign out |
| Breadcrumb | Official + SA | Shows current page path |

### 3.2 Input Components

| Component | Variants | Notes |
|-----------|----------|-------|
| Text Input | Default, Focused, Error, Disabled | Custom auth-input-container style |
| Password Input | With show/hide toggle | Eye icon button inside input |
| Phone Input | With country code prefix (+63) | Custom left adornment |
| Textarea | With char count | Report description |
| Select / Dropdown | Standard select | Incident type, severity, barangay |
| OTP Input | 6-digit segmented | Phone verification |
| File Upload | Drag & drop zone + preview | ID and photo upload |
| Date Range Picker | Calendar popover | Analytics filters |
| Search Bar | With icon prefix | Incidents/Users/Reports pages |
| Checkbox | Standard | Filter options |
| Radio Group | Severity selection | Report form |

### 3.3 Display Components

| Component | Variants | Notes |
|-----------|----------|-------|
| Card | Default, stat, report, verification | `rounded-xl border bg-card` |
| Badge | Default, Secondary, Destructive, Outline | Used for severity + status labels |
| Stat Card | Icon + number + label | Dashboard overview tiles |
| Data Table | Sortable, paginated | Incidents, users, reports, logs |
| Incident Card | Feed item with severity dot | Dashboard + citizen home |
| Verification Card | ID image + user + actions | Verifications page grid |
| Map Widget | Mini embedded map | Dashboard heatmap widget |
| Full-Screen Map | Interactive Leaflet map | `/app/map`, `/community-map` |
| Chart: Line | Trend over time | Analytics |
| Chart: Bar | By category/type | Analytics |
| Chart: Pie/Donut | Distribution | Analytics |
| Empty State | Illustration + CTA text | Tables/lists with no data |
| Skeleton Loader | Card/table/text skeletons | Loading states |
| Avatar | Initials or image | Header, user cards |

### 3.4 Feedback Components

| Component | Variants | Notes |
|-----------|----------|-------|
| Alert Banner | Default, Destructive | `rounded-lg border` — dashboard warning |
| Toast / Notification | Success, Error, Info | Post-submit feedback |
| Modal / Dialog | Confirmation, Form, Info | Reject reason, ban confirm |
| Verification Prompt | Blue, Yellow, Red | Citizen layout banner |
| Loading Spinner | Inline, full-page | API loading states |
| Error Message | Inline (below field) | Form validation errors |
| Confirmation Dialog | Two-action modal | Ban user, approve/reject |
| Countdown Timer | Text with seconds | OTP resend cooldown |

### 3.5 Design Inconsistencies Identified

1. **Button color palette fragmentation:** Auth pages use custom `.auth-btn` color classes (blue/green/gold/red) while the app uses Tailwind `bg-primary` variant — two separate button systems.
2. **Card border-radius mismatch:** Auth form card uses `border-radius: 20px` (custom CSS) while UI cards use `rounded-xl` (14px via Tailwind).
3. **Input styling split:** Auth inputs use a custom `.auth-input-container` CSS class; app inputs use Tailwind's `bg-input/30 border-input` classes — visually different.
4. **No unified icon library declaration** — icons appear to mix Lucide React and potentially custom SVGs.
5. **Spacing inconsistencies:** Some components use inline `style={{marginBottom: '28px'}}` alongside Tailwind classes like `mb-6`.
6. **Verification prompt banner** uses three separate hardcoded inline color objects; could be a single variant-based component.
7. **Mobile nav** for Official portal uses a hamburger dropdown while Citizen portal uses a fixed bottom tab bar — inconsistent mobile navigation patterns between portals.

---

## 4. DESIGN SYSTEM

### 4.1 Color Palette

#### Core Semantic Colors (CSS Custom Properties)

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#030213` (Deep Navy Black) | Primary buttons, text on light |
| `--primary-foreground` | `#ffffff` | Text on primary bg |
| `--secondary` | `oklch(0.95 0.0058 264.53)` ≈ `#EEF0FA` (Light Purple-Gray) | Secondary actions |
| `--background` | `#ffffff` | Page background |
| `--foreground` | `oklch(0.145 0 0)` ≈ `#1C1C1C` | Body text |
| `--card` | `#ffffff` | Card background |
| `--muted` | `#ECECF0` | Muted backgrounds |
| `--muted-foreground` | `#717182` | Placeholder, secondary text |
| `--accent` | `#E9EBEF` | Hover states |
| `--destructive` | `#d4183d` | Error/delete actions |
| `--border` | `rgba(0,0,0,0.1)` | Card and input borders |
| `--input-background` | `#f3f3f5` | Input fill |

#### Brand-Specific Hard-Coded Colors

| Usage | Hex | Where Used |
|-------|-----|------------|
| Navy Blue (brand primary) | `#1E3A8A` | Sidebar, auth button, scrollbar |
| Navy Blue hover | `#1E40AF` | Hover states |
| Navy gradient dark | `#0F172A` | Auth left panel overlay |
| Auth BG gradient | `#DBEAFE` → `#D7E3FF` → `#C7D4F2` | Auth page backgrounds |
| Critical red text | `#B91C1C` | Severity labels |
| Critical red bg | `#FEE2E2` | Severity badge bg |
| Amber/gold | `#B4730A` | Medium severity |
| Amber bg | `#FEF3C7` | Medium severity badge |
| Success green | `#065F46` / `#059669` | Low severity, approved |
| Green bg | `#D1FAE5` | Low severity badge |
| Citizen bg | `#F4F7FC` | Citizen portal page bg |
| Pending yellow | `#FFFBEB` / `#FDE68A` | Verification pending |
| Rejected red light | `#FEF2F2` / `#FECACA` | Verification rejected |

#### Chart Colors

| Chart Token | Approximate Color |
|-------------|------------------|
| `--chart-1` | Orange `#E67E22` |
| `--chart-2` | Cyan `#1ABC9C` |
| `--chart-3` | Purple-Blue `#3B5998` |
| `--chart-4` | Yellow `#F1C40F` |
| `--chart-5` | Gold `#D4AC0D` |

#### Incident Category Colors

| Category | Color |
|----------|-------|
| Pollution | `#0F766E` (Teal) |
| Noise | `#7C3AED` (Purple) |
| Crime | `#1E3A8A` (Navy) |
| Road Hazard | `#B4730A` (Gold) |
| Other | `#475569` (Slate) |

---

### 4.2 Typography

**Font Family:** `Roboto`, `Helvetica Neue`, Arial, sans-serif

| Element | Size Token | Weight | Line Height |
|---------|------------|--------|-------------|
| h1 | `text-2xl` (24px) | 500 (Medium) | 1.5 |
| h2 | `text-xl` (20px) | 500 (Medium) | 1.5 |
| h3 | `text-lg` (18px) | 500 (Medium) | 1.5 |
| h4 / label | `text-base` (16px) | 500 (Medium) | 1.5 |
| Body / input | `text-base` (16px) | 400 (Normal) | 1.5 |
| Button | `text-sm` (14px) | 500 (Medium) | — |
| Badge | `text-xs` (12px) | 500 (Medium) | — |
| Muted text | `text-sm` (14px) | 400 (Normal) | — |

**Letter-spacing:** `-0.004em` on citizen portal (tighter default)

---

### 4.3 Spacing & Layout Patterns

**Border Radius Scale:**
- `--radius-sm`: 6px — small elements, tags
- `--radius-md`: 8px — inputs, small cards
- `--radius`: 10px — standard cards, buttons
- `--radius-lg`: 10px — default rounded-lg
- `--radius-xl`: 14px — large cards

**Common Gap Values:** 4px, 6px, 8px, 12px, 16px, 24px
**Common Padding:** 8px, 12px, 16px, 24px, 32px, 36px, 40px

**Layout Grid:**
- Sidebar: 240px fixed, content: fluid
- Auth panels: 440px + flex
- Citizen max-width: 560px (mobile), 1260px (desktop)
- Cards use CSS Grid for responsive reflow

**Breakpoints:**
- Mobile: ≤ 768px
- Tablet: 769px – 900px
- Desktop: ≥ 901px

---

### 4.4 Button Styles

#### Tailwind Variant System (App)

| Variant | Background | Text | Hover |
|---------|-----------|------|-------|
| `default` | `bg-primary` (#030213) | `text-white` | `bg-primary/90` |
| `destructive` | `bg-destructive` (#d4183d) | `text-white` | `bg-destructive/90` |
| `outline` | `bg-background` | `text-foreground` | `bg-accent` |
| `secondary` | `bg-secondary` | `text-secondary-foreground` | `bg-secondary/80` |
| `ghost` | transparent | `text-foreground` | `bg-accent` |
| `link` | transparent | `text-primary` | underline |

#### Custom Auth Button Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| Blue | `#1E3A8A` | Primary auth actions (Login, Register, Send OTP) |
| Green | `#059669` | Success/confirm actions (Set Password) |
| Gold | `#B4730A` | Warning actions |
| Red | `#B91C1C` | Destructive auth actions |

**Button Sizes:**
- `sm`: h-8 (32px), `px-3`
- `default`: h-9 (36px), `px-4`
- `lg`: h-10 (40px), `px-6`
- `icon`: 36px square

---

### 4.5 Shadow & Elevation

| Level | Value | Usage |
|-------|-------|-------|
| Subtle | `0 1px 5px rgba(15,23,42,0.06)` | Default card hover |
| Card | `0 8px 40px rgba(30,58,138,0.10), 0 1px 3px rgba(0,0,0,0.05)` | Auth form card |
| Button | `0 2px 8px rgba(30,58,138,0.18)` | Auth primary button |
| Button hover | `0 6px 20px rgba(30,58,138,0.28)` | Auth button hover |

---

### 4.6 Icon Usage

- **Library:** Lucide React (primary)
- **Usage pattern:** Icons appear beside nav labels, inside buttons (`[&_svg]:size-4`), as stat card icons, and as incident type indicators
- **Sizing:** Default `size-4` (16px), headers `size-5` (20px), empty states larger decorative icons

---

## 5. UX FLOWS

### 5.1 Citizen Registration & Verification Flow
```
Landing (/)
  → Register (/auth/register) — Enter name, phone, barangay
    → OTP Verify (/auth/verify) — Enter 6-digit code
      → Create Password (/auth/create-password)
        → Citizen Dashboard (/citizen)
          → [Verification Prompt Banner visible]
            → Citizen Verification (/citizen/verification)
              → Upload ID photo
                → [PENDING state — banner turns yellow]
                  → Official reviews at /app/verifications
                    → [APPROVED] → Banner becomes "Verified Citizen" (green)
                    → [REJECTED] → Banner turns red, re-upload CTA
                      → Re-upload → back to PENDING
```

**Friction Points:**
- Verification is required to submit a report but the prompt is a passive banner — users may not realize it's blocking their report submission until they try.
- No inline explanation of what "barangay code" means during registration.

---

### 5.2 Citizen Report Submission Flow
```
Citizen Dashboard (/citizen)
  → "Report" tab or bottom nav icon
    → Report Form (/citizen/report)
      → Select type → severity → description → location → optional photo
        → Submit
          → [If not verified] — Form disabled / blocked with message
          → [If verified] — POST to API
            → Success Toast → redirect to My Reports
            → Error Toast → stay on form (fields preserved)
```

**Friction Points:**
- If unverified, the report form is disabled but the reason may not be prominently shown.
- Location input may be confusing — unclear if GPS auto-detect is available.

---

### 5.3 Official Incident Management Flow
```
Login (/auth/login)
  → Official Dashboard (/app)
    → View incoming alert banner
    → Scan stat cards for critical count
    → Click incident in feed OR navigate to /app/incidents
      → Filter/search incidents
        → Click incident row → View Detail Modal
          → Update status (Active → Responding → Resolved)
          → Add notes / assign responders
            → Changes reflected in dashboard stats
```

---

### 5.4 Official Verification Review Flow
```
Official Dashboard (/app)
  → Navigate to /app/verifications
    → See "Pending" tab (default)
    → View citizen's uploaded ID photo
      → [Approve] → Citizen gets verified status
      → [Reject] → Fill rejection reason → submitted
        → Citizen banner turns red with rejection reason
      → [Request Re-upload] → Citizen notified to re-upload
```

---

### 5.5 Super Admin User Management Flow
```
Super Admin Login
  → /superadmin (Overview)
    → Navigate to /superadmin/users
      → Search / filter users
        → Select user row
          → [Ban] → Confirmation modal → User banned
          → [Change Role] → Dropdown → Confirm
          → [View Activity] → Redirect to audit logs filtered by user
```

---

### 5.6 Password Reset Flow
```
Login page (/auth/login)
  → "Forgot password?" link
    → /auth/forgot-password [Step 1: Enter phone]
      → SMS OTP sent
        → [Step 2: Enter OTP]
          → OTP verified
            → [Step 3: Enter new password + confirm]
              → Password reset
                → Redirect to Login with success message
```

---

## 6. ISSUES & WEAKNESSES

### 6.1 Visual & Hierarchy Issues

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 1 | **Two separate design languages**: Auth pages have a fully custom CSS system (auth-layout.css) while the app uses Tailwind + shadcn/ui. The visual styles diverge noticeably. | Auth pages vs. App pages | High |
| 2 | **Inconsistent button styling**: Auth uses `#1E3A8A` hard-coded buttons; app uses `bg-primary` which resolves to `#030213` (near-black). Same role, very different visual appearance. | Sitewide | High |
| 3 | **Card radius inconsistency**: Auth card = 20px; App cards = 14px (`rounded-xl`). Feels like two different products. | Sitewide | Medium |
| 4 | **Mixed inline styles with Tailwind**: Several components use inline `style={{}}` for spacing alongside Tailwind utilities, making maintenance difficult. | Multiple pages | Medium |
| 5 | **No visual page transitions**: Navigation between pages lacks animation, giving an abrupt, disconnected feel. | All portals | Low |

### 6.2 Navigation & Wayfinding Issues

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 6 | **Inconsistent mobile navigation patterns**: Citizen portal uses a fixed bottom tab bar (standard app pattern); Official portal uses a hamburger dropdown from the top header. These are two separate paradigms in the same product. | Mobile | High |
| 7 | **No breadcrumbs in citizen portal**: The official portal has breadcrumbs in the header but the citizen portal offers no wayfinding cues on nested pages. | Citizen portal | Medium |
| 8 | **Active nav item not clearly distinguished**: Sidebar active state relies only on color change. No left-border accent or background block to clearly anchor the current location. | Sidebar | Medium |
| 9 | **Super Admin sidebar barangay monitor panel** may feel cluttered and out of place as a navigation sub-item. | SA Sidebar | Low |

### 6.3 UX & Interaction Issues

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| 10 | **Blocked report form with no clear upfront warning**: Unverified citizens navigate to the report form only to find it disabled. This friction point should be resolved before they enter the form flow. | `/citizen/report` | High |
| 11 | **Passive verification prompt**: The verification banner in the citizen dashboard is informational but does not urgently drive action for a critical blocker. | Citizen Dashboard | Medium |
| 12 | **No onboarding flow for new citizens**: After registration, users land on the dashboard with no guidance on what to do first (verify ID → then report). | Post-registration | High |
| 13 | **Barangay code input on registration**: Most citizens won't know their barangay code (251, 252, 256). Using a name-based selector would be far more intuitive. | `/auth/register` | High |
| 14 | **OTP countdown UX**: If the countdown timer is not prominently displayed, users may become confused and repeatedly tap "Resend." | `/auth/verify` | Medium |
| 15 | **No loading skeleton on map pages**: If map tiles or incident data load slowly, users see a blank white area with no feedback. | Map pages | Medium |

### 6.4 Accessibility Issues

| # | Issue | Severity |
|---|-------|----------|
| 16 | Color is the sole differentiator for severity levels (red/amber/green) — no icons or text patterns for colorblind users. | High |
| 17 | Focus ring uses `#fcd34d` (yellow) which may not be visible on all backgrounds. | Medium |
| 18 | Auth left panel background (aerial photo) uses heavy text over it — contrast may be insufficient for vision-impaired users. | Medium |
| 19 | Map-only views (incident map) are inaccessible to screen readers or keyboard navigation without alternative incident lists. | High |
| 20 | Small touch targets on mobile: icon-only buttons may be below 44px minimum touch target size on some pages. | Medium |

### 6.5 Layout & Spacing Issues

| # | Issue | Severity |
|---|-------|----------|
| 21 | Dashboard stat cards lack visual breathing room on mobile — likely overflow or wrap awkwardly on small screens. | Medium |
| 22 | Data tables are not optimized for mobile — horizontal scrolling on small screens is an anti-pattern unless handled with card view fallback. | High |
| 23 | Auth form card has very large padding (`36px 32px`) which on small devices means very little visible form content. | Medium |

---

## 7. REDESIGN BLUEPRINT

### 7.1 Clean Improved Sitemap

```
tugon.app/
│
├── / ................................ Landing Page
├── /map .............................. Public Map (renamed from /community-map)
│
├── /login ........................... Login (simplified URL)
├── /register ........................ Register (simplified URL)
│   ├── /register/verify ............. OTP Step
│   ├── /register/password ........... Password Step
│   └── /register/welcome ............ NEW: Onboarding Welcome Screen
├── /forgot-password ................. Password Reset (flattened URL)
│
├── /citizen/ ........................ Citizen Portal
│   ├── / ............................ Dashboard (Home)
│   ├── /report ...................... Submit Report
│   ├── /reports ..................... My Reports (renamed for clarity)
│   ├── /verify ...................... ID Verification (renamed)
│   └── /profile ..................... NEW: Dedicated Profile Page
│
├── /official/ ....................... Official Portal
│   ├── / ............................ Dashboard
│   ├── /incidents ................... Incidents
│   ├── /map ......................... Map
│   ├── /analytics ................... Analytics
│   ├── /reports ..................... Reports
│   ├── /verifications ............... Verifications
│   └── /settings ................... Settings
│
└── /admin/ .......................... Super Admin Portal
    ├── / ............................ Overview
    ├── /map ......................... Barangay Map
    ├── /analytics ................... Analytics
    ├── /users ....................... Users
    ├── /logs ........................ Audit Logs (renamed)
    └── /settings ................... Settings
```

---

### 7.2 Suggested Layout Improvements Per Page

#### Landing Page `/`
- **Hero**: Full-viewport, bold typographic headline with animated incident counter ("X incidents reported this month")
- **Split feature grid**: 3-column icon cards with hover lift effect
- **Live map teaser**: Embedded mini-map (non-interactive preview) with "View Live Map" CTA overlay
- **Social proof**: Barangay logos, official count, citizen count stats
- **Sticky navbar**: Transparent on hero, solid on scroll

#### Auth Pages
- **Unify the two design languages**: Replace the custom `auth-layout.css` with Tailwind-based components using the same `--primary` and card styles as the app
- **Keep the split-panel layout** but make the photo panel optional/hidden on tablet (not just mobile)
- **Replace inline styles** with consistent utility classes
- **Add a stepper indicator** for multi-step flows (Register, Forgot Password)
- **Barangay registration**: Replace code input with a searchable dropdown of barangay names

#### Citizen Portal
- **Onboarding modal**: On first login, show a 3-step onboarding overlay: (1) Welcome, (2) Verify your ID (prompt with CTA), (3) How to report
- **Verification blocker**: Instead of a passive banner, show a sticky action card with a progress indicator: "Complete your account: 1 step remaining"
- **Report Form**: Add GPS "Use my location" button prominently; add a visual incident type picker (icon grid, not just a dropdown)
- **My Reports**: Add status timeline per report (Submitted → Acknowledged → Resolved)
- **Unified mobile navigation**: Adopt the bottom tab bar for ALL portals on mobile (not just citizen)

#### Official Dashboard
- **Streamlined stat row**: Reduce to 3 key metrics with trend arrows (vs. prior period)
- **Incident feed + map side by side**: Two-column split on desktop
- **Alert banner**: Make it dismissible with a timestamp; show only critical alerts
- **Quick action bar**: "Assign", "Update Status", "View Map" as floating action strip

#### Super Admin
- **Move barangay monitor out of sidebar**: Place it as a persistent widget at the top of the overview page
- **Cleaner sidebar**: Remove clutter; use the same sidebar design as the Official portal
- **User management table**: Add bulk actions (bulk ban, bulk role change)
- **Audit logs**: Add export as CSV button and advanced filters

---

### 7.3 Recommended UI Components (for Google Stitch)

```
COMPONENT LIBRARY: shadcn/ui + Tailwind CSS v4
ICON LIBRARY: Lucide React (unified — no SVG mixing)
CHART LIBRARY: Recharts (already implied by chart color tokens)
MAP LIBRARY: Leaflet.js + React-Leaflet
```

**New / Improved Components Needed:**

| Component | Purpose | Style Notes |
|-----------|---------|-------------|
| `StepperForm` | Multi-step auth flows | Numbered steps, active line connector |
| `OnboardingModal` | First-login citizen guidance | Slide-based, 3 steps |
| `VerificationStatusCard` | Prominent verification prompt | Progress bar style, not just a banner |
| `IncidentTypePicker` | Visual grid of incident type icons | 2x3 grid of icon+label tiles |
| `ReportTimeline` | Status history per report | Vertical timeline, color-coded steps |
| `MapWidget` | Reusable embedded map | Preview mode + fullscreen mode |
| `SeverityChip` | Icon + color + label | Add icon alongside color (accessibility) |
| `BarangaySelector` | Searchable dropdown | Name-based, not code-based |
| `StatCard` | Number + trend arrow | Show % change from prior period |
| `ConfirmDialog` | Destructive action confirmation | Standard modal with reason field |
| `AuditLogRow` | Timestamped event entry | Monospaced actor/action/target |
| `BulkActionBar` | Table bulk actions | Appears when rows are selected |

---

### 7.4 Hierarchy Recommendations Per Page

**Citizen Dashboard:**
```
Priority 1: Verification status (if incomplete)
Priority 2: Quick action — "Report an Incident" button
Priority 3: Nearby active incidents feed
Priority 4: Community map (secondary tab)
```

**Official Dashboard:**
```
Priority 1: Critical incident alert (if present)
Priority 2: 3 key metrics (active, responding, new today)
Priority 3: Incidents feed (latest 5–8)
Priority 4: Heatmap widget
```

**Super Admin Overview:**
```
Priority 1: System health (all-green vs. any alerts)
Priority 2: Per-barangay incident status (3 cards)
Priority 3: Total users / total reports this week
Priority 4: Recent activity feed
```

---

### 7.5 Suggested Design Style

**Style Direction: Civic-Modern / Trustworthy**

| Attribute | Current | Recommended |
|-----------|---------|-------------|
| **Tone** | Functional, utilitarian | Civic authority with approachable warmth |
| **Primary Color** | Split: `#030213` (app) / `#1E3A8A` (auth) | **Unified: `#1E3A8A`** as brand primary across all portals |
| **Background** | White (`#FFF`) / Citizen `#F4F7FC` | Soft cool gray `#F1F5F9` for app, white for auth |
| **Typography** | Roboto (sans-serif) | Keep Roboto but add Inter as alternative; tighten hierarchy with more varied weight usage |
| **Corner Radius** | Inconsistent (6px–20px) | **Unified: 12px** for cards, 8px for inputs, 6px for badges |
| **Shadows** | Heavy auth card shadows, flat app | Consistent soft elevation: `0 2px 12px rgba(0,0,0,0.07)` |
| **Severity System** | Color only | **Color + Icon + Short Label** (e.g., red flame icon + "Critical") |
| **Animation** | None | Subtle: page fade-in (150ms), card hover lift (translateY -2px), skeleton loading |
| **Sidebar** | Dark navy | Keep dark navy — it reads as authority and differentiates admin from citizen |
| **Citizen Portal** | Lighter, tab-based | Keep lighter, but unify with app color tokens |
| **Button primary** | `#030213` (near-black) in app, `#1E3A8A` in auth | **`#1E3A8A`** everywhere — consistent, recognizable brand blue |

---

### 7.6 Unified Design Token Recommendations

```css
/* Recommended unified tokens for redesign */
--color-brand:          #1E3A8A;   /* Navy Blue — brand primary */
--color-brand-hover:    #1E40AF;   /* Lighter navy on hover */
--color-brand-light:    #DBEAFE;   /* Light blue bg tints */
--color-bg-app:         #F1F5F9;   /* App shell background */
--color-bg-citizen:     #F4F7FC;   /* Citizen portal bg (keep) */
--color-critical:       #B91C1C;   /* Severity: Critical */
--color-critical-bg:    #FEE2E2;
--color-medium:         #B4730A;   /* Severity: Medium */
--color-medium-bg:      #FEF3C7;
--color-low:            #059669;   /* Severity: Low */
--color-low-bg:         #D1FAE5;
--color-verified:       #059669;   /* Verification approved */
--color-pending:        #B4730A;   /* Verification pending */
--color-rejected:       #B91C1C;   /* Verification rejected */
--radius-sm:            6px;
--radius-md:            8px;
--radius-default:       12px;      /* Unified (up from 10px) */
--radius-lg:            16px;
--shadow-card:          0 2px 12px rgba(0,0,0,0.07);
--shadow-elevated:      0 8px 32px rgba(30,58,138,0.12);
```

---

### 7.7 Google Stitch Prompt Guidance

When feeding this to Google Stitch or any AI design generator, use the following prompt structure:

```
Design a civic incident reporting web application called TUGON.

PORTALS:
1. Public Landing Page
2. Auth Pages (Login, Register, OTP, Create Password)
3. Citizen Portal (Dashboard, Report Form, My Reports, Verification)
4. Official/Admin Portal (Dashboard, Incidents, Map, Analytics, Reports, Verifications, Settings)
5. Super Admin Portal (Overview, Barangay Map, Analytics, Users, Audit Logs)

DESIGN STYLE:
- Civic-Modern, trustworthy government-adjacent aesthetic
- Primary brand color: #1E3A8A (Navy Blue)
- Background: #F1F5F9 (cool soft gray)
- Typography: Roboto, clean hierarchy
- Border radius: 12px for cards, 8px for inputs, 6px for badges
- Shadow: subtle, 0 2px 12px rgba(0,0,0,0.07)
- Severity system: Critical (red #B91C1C), Medium (amber #B4730A), Low (green #059669)
- Each severity must show: color + icon + label (never color alone)

KEY COMPONENTS:
- Dark navy (#1E3A8A) sidebar for Official + Super Admin
- Bottom tab navigation for ALL portals on mobile
- Unified button system using #1E3A8A as primary
- Verification status card with progress indicator (not just a banner)
- Incident type picker as visual icon grid
- Step-form components for multi-step auth flows
- Report status timeline (Submitted → Acknowledged → Resolved)
- Stat cards with trend arrows (vs. prior period)
- Interactive Leaflet map with incident cluster markers

ACCESSIBILITY:
- All severity/status indicators: color + icon + text
- Minimum 44px touch targets on mobile
- High-contrast focus rings
- Map pages must have accessible incident list alternative
```

---

*End of TUGON Design Analysis — Version 1.0 — 2026-03-28*
