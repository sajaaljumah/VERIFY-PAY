---
name: Private storage access
description: Why private receipt access uses Replit sidecar signing rather than independent Google project discovery
---

Keep Replit's sidecar as the authentication boundary for private receipt storage. Do not request Google credentials to solve a storage SDK's project-ID discovery error.

**Why:** In this environment, the provided GCS template could issue signed uploads, but SDK metadata/download calls failed because Google project-ID discovery was unavailable. Sidecar-signed HTTP GET/PUT requests worked without introducing credentials or changing the provisioned bucket.

**How to apply:** When changing storage dependencies or access paths, verify reading the bytes back as well as uploading. Preserve ownership checks, byte limits, and immutable evidence finalization; upload success alone is insufficient.
