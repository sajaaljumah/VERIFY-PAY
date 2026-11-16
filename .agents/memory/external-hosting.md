---
name: External hosting boundaries
description: Why Vercel preparation must not replace Replit auth, storage, or production data
---

Prepare Vercel as a separate environment; retain Replit's working manual receipt flow and the completed Zod upgrade. External Clerk was chosen for Vercel, not a migration of Replit's managed Clerk instance.

**Why:** The user explicitly required preserving the existing application and approved Vercel preparation without a production data cutover. Replit-managed authentication and sidecar storage are not portable credentials for an external host.

**How to apply:** Configure external credentials privately in the destination environment. Never copy managed Clerk credentials, silently move production data, or claim Vercel is functional merely because its build is Ready. Verify the API separately from the static homepage.
