# MarginMitra

MarginMitra is an Android-first monorepo for Indian sellers who need a clean answer to one painful question: "How much cash did I actually keep today?" This branch now covers both marketplace commerce and food-delivery reconciliation for Swiggy and Zomato.

This workspace contains:

- a product and systems blueprint in [`docs/marginmitra-blueprint.md`](./docs/marginmitra-blueprint.md)
- a relational schema in [`docs/schema.sql`](./docs/schema.sql)
- a shared domain package with the true-profit calculation logic in [`packages/shared/src`](./packages/shared/src)
- a NestJS API starter in [`apps/api/src`](./apps/api/src)
- an Expo mobile app with Firebase phone auth, CSV upload, and review flows in [`apps/mobile`](./apps/mobile)

## Suggested Local Commands

```bash
pnpm install
pnpm dev:api
pnpm dev:mobile
```

## Starter Flow

1. The mobile app posts standardized order inputs to `POST /v1/reconciliation/preview`.
2. The API runs the true-profit engine and discrepancy checks across e-commerce and food-delivery fee models.
3. Sellers authenticate with Firebase phone auth, upload settlement CSVs, review flagged rows, and finalize imports through the NestJS ingestion endpoints.

## Notes

- All monetary values are stored in paise as integers to avoid floating-point errors.
- The current code focuses on the free hook, food-delivery reconciliation, and the first monetization trigger signal.
- This implementation pass assumes reliable internet connectivity and does not include offline snapshot caching.
- CSV normalization, OCR ingestion, WhatsApp bot automation, and dispute filing workers are still partial scaffolds rather than full production pipelines.
