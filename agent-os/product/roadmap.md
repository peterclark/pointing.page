# Product Roadmap

## MVP Phase - Core Estimation Experience

1. [ ] Database Schema & Supabase Setup — Create Supabase project with tables for rooms, participants, votes, and stories; configure real-time subscriptions for live updates; set up row-level security policies for basic access control `M`

2. [ ] Room Creation & Management — Implement room creation with unique shareable links, automatic leader assignment, and room persistence; includes basic room settings (name, point scale selection) `S`

3. [ ] Room Joining Flow — Build join page that accepts room links/codes, validates room existence, prompts for participant name, and adds participants to active session with real-time participant list updates `S`

4. [ ] Point Selection Interface — Create voting UI with configurable point scales (Fibonacci, T-shirt, etc.), visual point cards, and hidden vote submission; show participant's selected vote to themselves but hide from others until reveal `M`

5. [ ] Vote Reveal System — Implement leader-controlled reveal that simultaneously displays all votes, calculates and shows average, highlights outliers, and updates for all participants in real-time `M`

6. [ ] Participant Status Tracking — Display real-time participant list showing who has voted vs. pending, with visual indicators and participant count; update automatically as votes are submitted `S`

## Phase 1 - Context & Session Flow

7. [ ] Story Description Management — Add story title and description input for leaders with rich text support, real-time sync to all participants, and persistent display during voting rounds `S`

8. [ ] Sentiment Emoji System — Implement emoji selector (confident, concerned, confused, neutral) that displays alongside each vote after reveal; shows team sentiment distribution at a glance `M`

9. [ ] Point Reset Functionality — Create one-click reset that clears all votes and sentiments while preserving story description, prepares session for next story, and notifies all participants of reset `XS`

10. [ ] Session History View — Track and display history of estimated stories within a session showing story name, final average, vote distribution, and sentiments; allows reference to previous estimates `M`

11. [ ] Room Configuration Options — Add leader settings for point scale selection, timer options, voting rules (allow revotes, require all votes, etc.), and room visibility settings `S`

## Phase 2 - Enhanced Collaboration

12. [ ] Anonymous Voting Mode — Implement optional mode where votes reveal as numbers without participant names, reducing social pressure while maintaining consensus visibility `S`

13. [ ] Discussion Timer — Add optional countdown timer for discussion phases with visual/audio alerts, configurable duration, and leader controls (pause, extend, skip) `M`

14. [ ] Voting Timer — Implement optional time limit for voting rounds with countdown display, automatic reveal when time expires, and configurable duration per story `M`

15. [ ] Re-voting Capability — Allow leaders to trigger re-votes after discussion without clearing story context; tracks voting rounds and shows estimate convergence over multiple votes `M`

16. [ ] Participant Roles — Add role system (leader, voter, observer) with different permissions; observers can watch without voting, multiple leaders can share facilitation duties `M`

## Phase 3 - Advanced Features

17. [ ] Session Templates — Create reusable room templates with saved point scales, timer settings, and voting rules; teams can quickly start sessions with consistent configuration `S`

18. [ ] Estimation Analytics — Build dashboard showing team estimation patterns, average session duration, consensus rate, velocity trends, and individual voting patterns for retrospectives `L`

19. [ ] Story Import Integration — Integrate with Jira, GitHub Issues, or Linear to import stories directly into sessions; export final estimates back to source systems `L`

20. [ ] Session Recording & Playback — Record full session history including all votes, discussions timing, and final estimates; generate session reports for stakeholders and retrospectives `L`

21. [ ] Team Workspaces — Add authentication and team workspaces to organize multiple rooms, track team members, view historical sessions, and manage team settings across sessions `XL`

22. [ ] Mobile Responsive Design — Optimize UI for mobile devices with touch-friendly voting interface, responsive layouts, and progressive web app capabilities for installation `M`

23. [ ] Keyboard Shortcuts — Implement keyboard navigation for power users including number keys for point selection, space for reveal, R for reset, and arrow keys for history navigation `XS`

24. [ ] Customizable Point Scales — Allow teams to create custom point scales beyond standard options, save team-specific scales, and share scales across sessions `S`

> Notes
> - Features are ordered by technical dependencies and product architecture, building from data layer through core MVP to enhanced features
> - Each item represents an end-to-end (frontend + backend) functional and testable feature
> - MVP phase (items 1-6) delivers a complete, usable planning poker experience
> - Phase 1 (items 7-11) adds essential context and flow management for production use
> - Phase 2 (items 12-16) enhances the collaborative experience with timing and flexibility
> - Phase 3 (items 17-24) adds power-user features, integrations, and team management
