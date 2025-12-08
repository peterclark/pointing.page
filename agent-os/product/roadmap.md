# Product Roadmap

## MVP Phase - Core Estimation Experience

1. [x] Database Schema & Supabase Setup — Create Supabase project with tables for rooms, participants, votes, and stories; configure real-time subscriptions for live updates; set up row-level security policies for basic access control `M`

2. [x] Room Creation & Management — Implement room creation with unique shareable links, automatic leader assignment, and room persistence; includes basic room settings (name, point scale selection) `S`

3. [x] Room Joining Flow — Build join page that accepts room links/codes, validates room existence, prompts for participant name, and adds participants to active session with real-time participant list updates `S`

4. [x] Point Selection Interface — Create voting UI with configurable point scales (Fibonacci, T-shirt, etc.), visual point cards, and hidden vote submission; show participant's selected vote to themselves but hide from others until reveal `M`

5. [x] Vote Reveal System — Implement leader-controlled reveal that simultaneously displays all votes, calculates and shows average, highlights outliers, and updates for all participants in real-time `M`

6. [x] Participant Status Tracking — Display real-time participant list showing who has voted vs. pending, with visual indicators and participant count; update automatically as votes are submitted `S`

## Phase 1 - Context & Session Flow

7. [ ] Story Description Management — Add story title and description input for leaders with rich text support, real-time sync to all participants, and persistent display during voting rounds `S`

8. [ ] Sentiment Emoji System — Implement emoji selector (confident, concerned, confused, neutral) that displays alongside each vote after reveal; shows team sentiment distribution at a glance `M`

9. [ ] Point Reset Functionality — Create one-click reset that clears all votes and sentiments while preserving story description, prepares session for next story, and notifies all participants of reset `XS`

10. [ ] Session History View — Track and display history of estimated stories within a session showing story name, final average, vote distribution, and sentiments; allows reference to previous estimates `M`

11. [ ] Room Configuration Options — Add leader settings for point scale selection, timer options, voting rules (allow revotes, require all votes, etc.), and room visibility settings `S`

## Phase 2 - Enhanced Collaboration

12. [ ] TBD

13. [ ] Discussion Timer — Add optional countdown timer for discussion phases with visual/audio alerts, configurable duration, and leader controls (pause, extend, skip) `M`

14. [ ] Voting Timer — Implement optional time limit for voting rounds with countdown display, automatic reveal when time expires, and configurable duration per story `M`

15. [ ] Re-voting Capability — Allow leaders to trigger re-votes after discussion without clearing story context; tracks voting rounds and shows estimate convergence over multiple votes `M`

16. [ ] TBD

## Phase 3 - Advanced Features

17. [ ] Admin Dashboard - View statistics for app usage, # of users online, # of active rooms, total rooms created, total votes cast. Chart historical usage.

18. [ ] Estimation Analytics — Build dashboard showing team estimation patterns, average session duration, consensus rate, velocity trends, and individual voting patterns for retrospectives `L`

19. [ ] Upgraded Landing Page - Show usage staticstics, total rooms created, users, etc. Use charts for visual intrigue.

20. [ ] TBD

21. [x] Social Logins - Allow login via Github and Google, remove email login option / magic link to remove need for SMTP server.

22. [ ] Mobile Responsive Design — Optimize UI for mobile devices with touch-friendly voting interface, responsive layouts, and progressive web app capabilities for installation `M`

23. [ ] Keyboard Shortcuts — Implement keyboard navigation for power users including number keys for point selection, space for reveal, R for reset, and arrow keys for history navigation `XS`

## Phase 4 - Monetization

24. [ ] Stripe Integration - Setup account through Stripe `M`
25. [ ] Credit System - Track rooms created per user and allow purchasing additional credits after 10 free rooms. $10 = 40 rooms (25 cents/room), $20 = 100 rooms. Build pages for selecting purchase options and accepting payment.

> Notes
>
> - Features are ordered by technical dependencies and product architecture, building from data layer through core MVP to enhanced features
> - Each item represents an end-to-end (frontend + backend) functional and testable feature
> - MVP phase (items 1-6) delivers a complete, usable planning poker experience
> - Phase 1 (items 7-11) adds essential context and flow management for production use
> - Phase 2 (items 12-16) enhances the collaborative experience with timing and flexibility
> - Phase 3 (items 17-24) adds power-user features, integrations, and team management
