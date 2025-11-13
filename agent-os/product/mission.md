# Product Mission

## Pitch
Story Pointer is a real-time collaborative web application that helps software development teams conduct efficient sprint planning sessions by providing a structured, transparent environment for story estimation with hidden voting, live reveals, and consensus-building features.

## Users

### Primary Customers
- **Agile Development Teams**: Small to large software development teams (3-15 members) practicing Scrum or other agile methodologies who need to estimate story complexity during sprint planning
- **Distributed Teams**: Remote or hybrid teams who need digital tools to replicate the planning poker experience virtually
- **Product Organizations**: Companies with multiple development teams seeking a standardized approach to story estimation across teams

### User Personas

**Alex - Senior Software Engineer** (28-40)
- **Role:** Development team member participating in sprint planning
- **Context:** Works on a distributed team across multiple time zones with bi-weekly sprint planning sessions
- **Pain Points:** Current tools don't prevent bias from early estimators; difficult to see team consensus at a glance; switching between multiple tools during planning disrupts flow
- **Goals:** Provide honest estimates without being influenced by others; quickly identify stories that need more discussion; streamline the planning process

**Jordan - Scrum Master** (30-45)
- **Role:** Facilitates sprint planning sessions and manages team processes
- **Context:** Leads 2-3 teams through multiple planning sessions per week
- **Pain Points:** Managing voting rounds manually is time-consuming; hard to keep sessions moving efficiently; difficult to identify when team has consensus vs. needs discussion
- **Goals:** Run efficient planning sessions; ensure all voices are heard equally; quickly identify outliers that signal need for discussion; maintain team engagement

**Morgan - Product Owner** (32-50)
- **Role:** Defines stories and prioritizes backlog; participates in estimation
- **Context:** Works with engineering team to plan sprints and understand capacity
- **Pain Points:** Wants to understand team sentiment about story complexity; needs clear visibility into estimation patterns; wants historical data to improve story writing
- **Goals:** Get accurate estimates for sprint planning; understand team concerns about stories; improve story clarity based on estimation feedback

## The Problem

### Biased Estimation and Inefficient Planning Sessions
Traditional sprint planning using physical cards or basic digital tools leads to estimation bias when team members see others' votes before making their own choice. This anchoring effect skews results and reduces estimation accuracy. Manual facilitation of voting rounds, reveals, and consensus discussions creates friction that extends planning sessions by 30-50%, reducing team productivity and engagement.

**Our Solution:** Real-time hidden voting ensures all team members submit unbiased estimates. The leader-controlled reveal and automatic average calculation immediately highlight consensus or disagreement, enabling focused discussions only where needed. Sentiment indicators provide additional context about team confidence without slowing down the process.

### Lack of Context and Consensus Visibility
Teams struggle to capture the "why" behind estimates and lose valuable context when moving between stories. Without clear visibility into voting patterns and outliers, facilitators spend extra time determining whether consensus exists or if discussion is needed. This ambiguity leads to either skipped discussions (risking poor estimates) or excessive discussion (wasting time on stories with clear consensus).

**Our Solution:** Integrated story descriptions keep context visible throughout voting. The reveal screen clearly shows voting distribution, average, and outliers at a glance. Sentiment emojis allow team members to quickly signal concerns or confidence, giving facilitators instant feedback on whether to move forward or discuss further.

### Poor Remote Collaboration Experience
Distributed teams often resort to screen sharing basic spreadsheets or using chat to coordinate estimation, creating a disjointed experience that excludes team members and reduces engagement. The lack of real-time updates means team members miss votes or reveals, requiring repetition and extending sessions.

**Our Solution:** Built on Supabase real-time infrastructure, Story Pointer provides instant synchronization for all participants. Everyone sees votes, reveals, and story changes simultaneously, creating an engaging shared experience that rivals in-person planning poker sessions.

## Differentiators

### Real-Time Hidden Voting with Leader-Controlled Reveals
Unlike asynchronous estimation tools like Jira voting or basic polling apps, we provide true planning poker functionality with hidden votes that reveal simultaneously. This eliminates anchoring bias while maintaining the collaborative energy of live sessions. Leaders control the reveal timing, ensuring all team members have submitted estimates before discussion begins.

### Integrated Context and Sentiment Indicators
Unlike single-purpose voting tools, we combine estimation with story context and emotional feedback. Team members can see the story description while voting and express concerns through sentiment emojis, providing richer information for consensus building without requiring verbal interruption or separate communication channels.

### Zero-Setup Collaborative Sessions
Unlike enterprise tools like Jira that require account creation, permissions, and configuration, we provide instant room creation with shareable links. Team members join in seconds without accounts or downloads, reducing friction from 15 minutes of setup to 30 seconds. This makes Story Pointer ideal for ad-hoc planning sessions, cross-team collaboration, or teams evaluating agile practices.

### Built for Speed and Engagement
Unlike feature-heavy project management suites where estimation is a secondary feature buried in menus, we focus exclusively on the pointing experience. Every interaction is optimized for speed: one-click point selection, instant reveals, quick resets for the next story. This keeps sessions moving and teams engaged, reducing planning time by 30% compared to traditional tools.

## Key Features

### Core Features
- **Room Creation & Joining:** Users can create planning sessions instantly and share unique room links with team members, enabling zero-friction collaboration without accounts or setup time
- **Hidden Point Selection:** Team members select story points from standard scales (Fibonacci, T-shirt sizes, etc.) with votes hidden from others until reveal, eliminating estimation bias
- **Leader-Controlled Reveal:** Session leaders trigger simultaneous point reveals that display all votes, the average estimate, and voting distribution, instantly highlighting consensus or need for discussion

### Collaboration Features
- **Story Description Panel:** Leaders can enter and update story descriptions that remain visible during voting, ensuring all estimators have consistent context
- **Sentiment Indicators:** Team members select emojis (confident, concerned, confused, etc.) alongside their estimates to signal emotional context without disrupting flow
- **Automatic Average Calculation:** The system calculates and prominently displays the average estimate upon reveal, providing a starting point for consensus discussion

### Session Management Features
- **Point Reset:** Leaders can clear all votes and sentiments with one click to begin estimating the next story, maintaining session momentum
- **Real-Time Synchronization:** All participants see updates instantly through Supabase real-time subscriptions, ensuring everyone stays in sync during fast-moving sessions
- **Participant List:** View all active session participants with their voting status (voted/pending) to ensure everyone has contributed before revealing
