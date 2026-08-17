# Morele Price Tracker — Active TODO

## Current Feature: Price Patterns & Per-Product CSV Export

- [x] Calculate historical minimum and maximum prices with recorded timestamps.
- [x] Calculate average price, volatility, and recent trend direction from stored price history.
- [x] Add the `pricePatterns` tRPC query for one product.
- [x] Add the `exportHistory` tRPC query for one product.
- [x] Generate chronological CSV output with product metadata, PLN prices, and UTC timestamps.
- [x] Escape CSV fields safely and sanitize export filenames.
- [x] Add analytics cards to `ProductDetailModal`.
- [x] Add the Download Price History control with Blob URL download handling.
- [x] Preserve the existing chart, alerts, sharing, and manual price-check controls.
- [x] Handle analytics loading, empty history, query errors, export errors, and successful downloads.
- [x] Show the historical-analysis disclaimer and avoid presenting forecasts.
- [x] Add Vitest coverage for analytics calculations, CSV ordering/escaping, and filename safety.
- [x] Repair the malformed `server/priceAnalytics.ts` tail introduced during the previous session.
- [x] Keep local database authentication unchanged.
- [x] Keep the Docker-ready deployment configuration unchanged.
- [x] Avoid new dependencies, secrets, connectors, migrations, or external services.

## Verification

- [x] TypeScript check passed.
- [x] Full Vitest suite passed: 34 tests across 3 test files.
- [x] Production build passed for Vite and the Node server bundle.
- [x] Web project health check passed with no TypeScript or LSP errors.
- [x] Live browser flow opened a tracked product containing 52 stored price records.
- [x] Analytics cards rendered in the product detail modal.
- [x] CSV download completed and reported 52 exported records.
- [x] Existing product actions remained visible during browser verification.

## Checkpoint and Review

- [x] Save a stable checkpoint for the completed feature.
- [x] Preserve a checkpoint version for user review.
- [x] Keep changes on the currently active branch; do not merge or reset branches without explicit instruction.
- [x] Preserve the historical TODO backlog in `todo-history.md`.
- [x] Keep this active TODO free of stale repeated placeholder items.

## Explicitly Deferred from This Request

- [x] Forecasting and predictive pricing.
- [x] Seasonality analysis.
- [x] Competitor comparison.
- [x] Bulk history export.
- [x] Authentication changes.
- [x] Docker architecture changes.
- [x] Database schema changes.
- [x] New email or external-service integrations.
- [x] Router integration tests requiring a live database fixture.

## User Review

- [x] Open a product modal.
- [x] Confirm pattern cards render for a product with stored history.
- [x] Confirm the CSV export downloads successfully.
- [x] Confirm the historical-analysis disclaimer is visible.
- [x] Confirm existing product controls remain available.

## Historical Record

The previous, highly repetitive TODO file is preserved verbatim as `todo-history.md`. It is retained for audit/history purposes and is not an active list of requirements for this feature.


## Accessibility Bug Fix — Dashboard DialogContent

- [x] Audit every dashboard Radix DialogContent usage for a valid DialogTitle.
- [x] Add visually hidden fallback titles where a dialog has no visible title.
- [x] Verify the dashboard modal flow no longer reports the DialogTitle accessibility error.
- [x] Run TypeScript, Vitest, and production build checks.
- [x] Save a checkpoint for the accessibility fix.
