# Tracker - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [Events Management](#events-management)
5. [Catalog](#catalog)
6. [Drifts Management](#drifts-management)
7. [RPA Usage](#rpa-usage)
8. [Advanced Features](#advanced-features)

---

## Introduction

Tracker is a comprehensive event management platform designed to monitor and visualize deployments, operations, configuration drifts, and RPA activities across your infrastructure.

### Key Features

- **Real-time event tracking** across multiple environments
- **Overlap detection** to identify scheduling conflicts
- **Gantt-style visualization** for timeline planning
- **Jira integration** for drift management
- **Advanced filtering** and search capabilities
- **Dark mode** support for comfortable viewing

---

## Getting Started

### Accessing Tracker

Navigate to your Tracker instance URL (e.g., `https://tracker.your-domain.com`)

### Navigation

The main navigation bar at the top provides access to all features:

- **Dashboard** - Overview of today's activity
- **Events** - Dropdown menu with 4 views:
  - Timeline - Chronological list
  - Streamline - Gantt chart view
  - Calendar - Monthly calendar
  - Overlaps - Conflict management
- **Catalog** - Service inventory
- **Drifts** - Configuration drift tracking
- **RPA Usage** - Automation monitoring

### Theme Toggle

Click the sun/moon icon in the top-right corner to switch between light and dark modes.

---

## Dashboard

The Dashboard provides a quick overview of today's events and system health.

### Statistics Cards

Four main metrics are displayed:

1. **Total Events** - All events created today
2. **Success** - Successfully completed events
3. **Failures** - Failed or errored events
4. **In Progress** - Currently running events
5. **Overlaps** - Number of scheduling conflicts (with alert indicator)

### Overlap Alert

When events overlap, a prominent orange banner appears showing:
- Number of conflicts detected
- List of overlapping event pairs
- Quick access to detailed information

### Event Distribution Charts

Visual breakdown by:
- **Event Type** - Deployments, Operations, Drifts, Incidents
- **Status** - Success, Failure, In Progress
- **Priority** - P1 (Critical) to P5 (Low)
- **Environment** - Development, Production, etc.

### Recent Events List

The 10 most recent events with:
- Event type icon and badge
- Service name
- Environment, Priority, and Status badges
- Click to view full details

---

## Events Management

### Timeline View

**Purpose:** Chronological list of all events with advanced filtering

#### Time Period Selection

Navigate through time using:
- **Period selector** - Choose 1, 3, 7, 14, 30, 60, or 90 days
- **Previous/Next buttons** - Move backward or forward by the selected period
- **Today button** - Jump back to the current period

#### Sorting

Toggle between:
- **Newest first** (default) - Most recent events at the top
- **Oldest first** - Historical events first

#### Filtering

Click the **Filters** button to access:
- **Event Type** - Deployment, Operation, Drift, Incident
- **Environment** - Development, Integration, Production, etc.
- **Priority** - P1 (Critical) to P5 (Low)
- **Status** - Start, Success, Failure, Error, Done, etc.
- **Service** - Filter by specific services from the catalog

Active filters are indicated by:
- Blue highlight on the Filters button
- Badge showing the number of active filters
- Summary text below the page title

#### Event Cards

Each event displays:
- **Type icon and badge** - Color-coded by event type
- **Title** - Event description
- **Service name** - In a monospace badge
- **Badges** - Environment, Priority, Status
- **Timestamp** - When the event was created
- **Links** - To source systems (Slack, GitHub, etc.)

Click any event card to open the detailed modal.

---

### Streamline View

**Purpose:** Gantt-style visualization to identify scheduling conflicts

#### View Modes

**Grions:**
- **By Service** - Events grouped by project/service
- **By Environment** - Events grouped by environment

**Time Scale:**
- **Week View** - 7 columns (one per day)
- **Day View** - 24 columns (one per hour)

#### Overlap Detection

Groups with overlapping events show:
- 🚨 **Animated warning icon** (pulsing orange triangle)
- **Concurrent count** - Number of simultaneous events
- **Multi-track layout** - Events automatically placed on separate tracks to avoid visual overlap

#### Navigation

- **Previous/Next buttons** - Navigate by the selected period
- **Today button** - Return to current period
- **Period selector** - 1, 3, 7, 14, or 30 days

#### Event Bars

Events are displayed as colored bars showing:
- **Duration** - Bar length represents event duration
- **Type** - Color indicates event type
- **Title** - Truncated to fit
- **Time** - Start time shown for longer events

Click any event bar to view full details.

#### Filters

Same advanced filtering as Timeline view.

---

### Calendar View

**Purpose:** Monthly calendar with daily event overview

#### Calendar Grid

- **Current day** highlighted in blue
- **Selected day** highlighted in primary color
- **Days with overlaps** show a warning icon 🚨

#### Day Selection

Click any day to view its events in the right panel.

#### Overlap Detection

When a selected day has overlapping events:
- **Orange alert banner** appears at the top
- **List of conflicts** with exact time periods
- **Event pairs** showing which events overlap
- **Duration details** for each event

#### Event List

Events on the selected day show:
- **Orange background** if involved in an overlap
- **Warning icon** for conflicting events
- **Time range** (HH:mm - HH:mm) for each event
- **All badges** - Type, Environment, Priority, Status
- **Links** to source systems

#### Filters

Same advanced filtering as other event views.

---

### Overlaps View

**Purpose:** Dedicated page for managing scheduling conflicts

#### Statistics

Three key metrics:
- **Total Overlaps** - Number of conflicts in the period
- **Days with Overlaps** - How many days are affected
- **Services Involved** - Number of unique services

#### Period Selection

- **Period selector** - 1, 3, 7, 14, or 30 days
- **Navigation buttons** - Previous/Next/Today
- **Date range display** - Shows current period

#### Conflict Details

For each day with overlaps:

**Overlap Information:**
- **Time period** - Exact overlap window (HH:mm - HH:mm)
- **Duration** - Length of conflict in minutes

**Side-by-Side Comparison:**
Two cards showing each conflicting event:
- Event type and environment badges
- Title (clickable for details)
- Service name
- Start and end times

**Contact Information:**
If the service is in the catalog:
- **Owner name** - Team or person responsible
- **Email** - Clickable mailto: link
- **Slack channel** - Direct link to team channel

#### Use Case

Use this page to:
1. Identify scheduling conflicts
2. Contact responsible teams
3. Coordinate deployment windows
4. Avoid production incidents

---

## Catalog

**Purpose:** Inventory of all modules, libraries, and projects

### Quick Filters

#### Search Bar

Type to search across:
- Service name
- Description
- Owner name

Clear button (X) appears when text is entered.

#### Type Filters

Click badges to filter by:
- Module
- Library
- Workflow
- Project
- Chart
- Package
- Container

Active filters show in blue.

#### Language Filters

Click badges to filter by programming language:
- Go, Java, Python, PHP
- JavaScript, TypeScript, Rust
- Terraform, Helm, Docker
- And more...

Each badge shows the language icon.

#### Multi-Selection

- Click multiple filters to combine them
- **Clear All** button appears when filters are active
- Result count updates in real-time

### Catalog Table

Columns:
- **Name** - Service identifier with package icon
- **Type** - Badge showing catalog type
- **Language** - Badge with language icon
- **Version** - Current version number
- **Owner** - Team or person responsible
- **Description** - Brief description (truncated)
- **Links** - Icons for repository and documentation

### Adding to Catalog

Click **"Add to Catalog"** button to register a new service.

---

## Drifts Management

**Purpose:** Track and manage configuration drifts

### Statistics

Three cards showing:
- **Total Drifts** - All detected drifts
- **Unresolved** - Drifts not yet fixed
- **Resolved** - Completed drifts

### Drift Cards

Each drift displays:
- **Status badge** - Resolved (green) or In Progress (yellow)
- **Title** - Drift description
- **Message** - Detailed drift information (scrollable)
- **Service** - Affected service in monospace badge
- **Source** - Detection source
- **Environment** - Where drift was detected
- **Owner** - Responsible person/team
- **Timestamp** - When drift was detected

### Jira Integration

#### Adding a Ticket

1. Click **"Add Ticket"** button on any drift
2. Modal opens with drift information
3. Click **"Open Jira (New Tab)"** to create a ticket
   - Title and description are pre-filled
   - Create the ticket in Jira
4. Copy the ticket URL
5. Paste it in the **"Jira Ticket URL"** field
6. Click **"Save Ticket Link"**

#### Viewing Linked Tickets

- Linked tickets appear as clickable links
- External link icon indicates it opens in a new tab
- Click to view the ticket in Jira

#### Updating Tickets

Click **"Update Ticket"** to change the linked ticket URL.

### Filters

Filter drifts by:
- Environment
- Priority
- Status
- Service (from catalog)

---

## RPA Usage

**Purpose:** Monitor Robotic Process Automation activities

### Statistics

Three cards showing:
- **Total Operations** - All RPA operations
- **Success** - Successful executions
- **Failures** - Failed operations

### Operation Cards

Each RPA operation displays:
- **Type badge** - Operation type
- **Title** - Operation description
- **Service** - RPA service name
- **Environment** - Execution environment
- **Status badges** - Priority and Status
- **Timestamp** - Execution time

### Filters

Same filtering capabilities as other event views.

---

## Advanced Features

### Event Details Modal

Click any event to open a detailed modal showing:

**Header:**
- Event type icon and badge
- Title
- Close button (X)

**Information Sections:**
- **Service** - Service name
- **Source** - Event source system
- **Environment** - Deployment environment
- **Owner** - Responsible person/team
- **Priority** - Event priority level
- **Status** - Current status
- **Dates** - Start and end times (if applicable)

**Message:**
- Full event message or description
- Scrollable if long

**Links:**
- All associated links (Slack, GitHub, etc.)
- Appropriate icons for each source
- Open in new tabs

**Metadata:**
- Event ID
- Creation timestamp
- Last update time

### Filtering Best Practices

1. **Start broad** - View all events first
2. **Add filters gradually** - Narrow down step by step
3. **Use multiple filters** - Combine for precise results
4. **Check active count** - Badge shows how many filters are active
5. **Clear when done** - Use "Clear All Filters" to reset

### Keyboard Shortcuts

- **Escape** - Close modals
- **F5** - Refresh page
- **Ctrl/Cmd + F** - Browser search (works in tables)

### Performance Tips

- Use time period filters to limit data
- Apply service filters for faster loading
- Clear filters when not needed
- Refresh page if data seems stale

### Mobile Usage

Tracker is responsive and works on mobile devices:
- Navigation collapses to hamburger menu
- Cards stack vertically
- Badges wrap to multiple lines
- Touch-friendly buttons and links

---

## Troubleshooting

### Events Not Appearing

1. Check time period selection
2. Verify filters are not too restrictive
3. Ensure events exist for the selected period
4. Try "Clear All Filters"

### Overlaps Not Detected

Overlaps are detected when:
- Events have start and end dates
- Time periods actually overlap
- Events are in the selected time range

### Jira Links Not Working

1. Verify Jira domain is configured
2. Check you're logged into Jira
3. Ensure ticket URL is correct
4. Contact admin if domain is not set

### Filters Not Working

1. Refresh the page
2. Clear browser cache
3. Check console for errors (F12)
4. Report issue to admin

---

## Best Practices

### For Operators

1. **Check Dashboard daily** for overview
2. **Use Streamline** to plan deployments
3. **Monitor Overlaps** to avoid conflicts
4. **Link Jira tickets** to drifts
5. **Filter by your services** for focus

### For Managers

1. **Review statistics** for trends
2. **Check overlap page** for coordination issues
3. **Monitor drift resolution** times
4. **Use calendar view** for planning
5. **Export data** for reports (coming soon)

### For Teams

1. **Coordinate via Overlaps page** before deploying
2. **Update catalog** with accurate contact info
3. **Link tickets** for traceability
4. **Use consistent naming** for services
5. **Document in event messages** for context

---

## Support

### Getting Help

- **Documentation** - Check `/docs` folder
- **GitHub Issues** - Report bugs or request features
- **Team Chat** - Contact DevOps team
- **Email** - support@your-domain.com

### Reporting Issues

Include:
1. Page where issue occurred
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots if applicable
5. Browser and version

### Feature Requests

Submit via:
- GitHub Issues with "enhancement" label
- Team feedback channel
- Direct message to DevOps team

---

## Glossary

**Drift** - Unintended configuration change detected in infrastructure

**Event** - Any tracked activity (deployment, operation, incident, etc.)

**Overlap** - Two or more events running simultaneously

**RPA** - Robotic Process Automation

**Service** - Application, module, or system being tracked

**Streamline** - Gantt-style timeline visualization

**P1-P5** - Priority levels (P1 = Critical, P5 = Low)

---

**Last Updated:** November 2024  
**Version:** 1.0

