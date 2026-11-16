# VERIFY PAY

Bilingual payment verification and reconciliation for small businesses, online stores, home-based businesses, and independent sellers in Kuwait.

## Run & Operate

- Web: `artifacts/verify-pay: web` managed workflow, served at `/`.
- API: `artifacts/api-server: API Server` managed workflow, served at `/api`.
- `pnpm run typecheck` checks all packages.
- `pnpm --filter @workspace/api-spec run codegen` regenerates clients and validation schemas.
- `pnpm --filter @workspace/db run push` applies development database changes.
- `node scripts/src/check-verify-pay.mjs` runs an isolated demo API smoke check. It uploads sample PDFs and makes one live OpenAI extraction request, then checks record matching, duplicate detection, CSV validation, private file access, data isolation, history, and exports. It does not sign in to a real business. Exit code 2 means receipt extraction was unavailable but the manual-review workflow passed.

## Product rules

- Kuwait is the primary market; amounts are KWD with exactly three decimal places. Integer fils are used internally.
- Uploaded receipts are customer claims, not bank evidence.
- `VERIFIED` means an exact amount/reference and reasonable-date match in the business's **imported bank records**. It never authenticates the receipt or independently confirms settlement.
- No direct bank access, account-connection badges, or bank-settlement claims.
- Missing or ambiguous references require manual review. Amount/date similarity alone must not automatically verify a payment.
- A bank transaction can be assigned to only one request. Identical file bytes uploaded for different requests trigger duplicate detection.
- A failed later attempt must not undo a legitimate previous bank match.
- Arabic (RTL) and English (LTR) are supported; keep all new interface copy bilingual.

## Architecture

- React + TypeScript + Tailwind frontend; Express API; PostgreSQL + Drizzle.
- Frontend: `artifacts/verify-pay/src`, with pages in `pages/`, translations in `lib/i18n.tsx`, deterministic audit-text translations in `lib/system-text.ts`.
- API contract: `lib/api-spec/openapi.yaml`. Generated clients: `@workspace/api-client-react`; validation: `@workspace/api-zod`.
- Database tables: `lib/db/src/schema/`.
- Verification rules: `artifacts/api-server/src/lib/verification.ts`.
- Clerk manages authentication. Web requests use same-origin session cookies, not explicit bearer tokens.
- Authenticated owners receive an empty, isolated business workspace. Anonymous visitors receive separately stored demo workspaces, identified by signed HttpOnly browser cookies; this is not a substitute for real account authentication.
- Each new demo has ten requests, twelve imported bank rows, and all five verification outcomes. Demo data must never be copied into real accounts.
- Private receipt bytes are stored in App Storage; PostgreSQL stores metadata and hashes only. Signed direct uploads go into staging. The server freezes validated bytes into a separate server-owned object before extracting or verifying, so an unexpired upload URL cannot replace evidence.
- Original submitted verification fields and check results are retained in the audit trail.

## Services and credentials

- Clerk and App Storage are provisioned through Replit.
- `OPENAI_API_KEY` is supplied by the owner. OCR uses OpenAI's Responses API with `gpt-5-mini` for JPG/PNG/PDF extraction. Do not retry Replit AI Integration provisioning: the owner chose their own key.
- If OpenAI rejects a key or has no quota, show a clear extraction warning and allow manual correction. Do not pretend extraction succeeded.
- Required environment: managed `DATABASE_URL`, `SESSION_SECRET`, Clerk keys, App Storage configuration, and `OPENAI_API_KEY` for live OCR. Never log any values.
- Receipt validation: JPG/PNG/PDF signatures, size <=10 MB, declared byte count, tenant ownership. CSV: <=2 MB, <=5,000 rows, positive KWD credits, valid ISO dates, duplicate IDs/references skipped.
- Backend storage operations use short-lived signed HTTP requests from Replit's sidecar rather than requiring application-managed Google credentials.

## Verification boundaries

First-build checks cover typechecking, demo API workflows, and desktop/mobile rendered screenshots. Signed-in account flows have not been verified with a real browser session. An OpenAI `invalid_api_key` response is a provider-configuration blocker, not an extraction success; request any replacement only through secure Secrets.
