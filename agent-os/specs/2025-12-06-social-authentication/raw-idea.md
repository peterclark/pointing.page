# Social Authentication (Google & Github) - Raw Idea

## Feature Description

Replace the current magic link email registration with social authentication using Google and Github providers. Use Supabase UI library components for implementation.

## Key Requirements

- Replace magic link email auth with social auth (Google and Github)
- Use Supabase UI library components:
  - Current User Avatar UI component
  - Social Auth component
- Users can still use the app without logging in (anonymous participation)
- Profile menu behavior:
  - If not logged in: display social auth component
  - If logged in: display user info and avatar
- Hamburger menu should display user's avatar when logged in (instead of three bars icon)

## Context

This feature modernizes the authentication flow by replacing email-based magic links with social authentication providers (Google and Github). The Supabase UI library provides pre-built components that handle the OAuth flow, reducing implementation complexity.

### Key Design Decisions

- Anonymous users can still use the app (voting doesn't require authentication)
- Social auth is optional but recommended for improved UX
- Avatar display replaces hamburger menu when authenticated
- Supabase UI components provide consistent styling and behavior

## Acceptance Criteria

- Google and Github social auth options available in profile menu
- Unauthenticated users see social auth component
- Authenticated users see their profile info and avatar
- Avatar displayed in hamburger menu when logged in
- Users can log out
- Anonymous participation remains functional
