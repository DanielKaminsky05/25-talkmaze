This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Project Structure

The codebase uses route-level collocation for UI and route-only logic, with shared logic organized by domain.

### Route Collocation

- `src/app/...` contains route segments, layouts, and page components.
- Each route can include:
	- `_components/` for route-only UI pieces
	- `_hooks/` for route-only hooks
	- `_context/` for route-only context
	- `_types/` or `types.ts` for route-only types
	- `actions.ts` for route-scoped server actions

### Shared Code

- `src/components/` holds reusable UI used across multiple routes.
- `src/lib/` holds shared, app-specific domain logic grouped by feature.
	- Example domains: `lessons/`, `messaging/`, `scheduling/`, `profiles/`, `users/`, `payments/`, `rewards/`, `auth/`.
	- A domain folder can include files like `actions.ts`, `queries.ts`, `schemas.ts`, `types.ts` as needed.
- `src/services/` is for third-party SDK clients and adapters (Supabase, Stripe, etc). Keep app logic out of this layer.
- `src/utils/` is for cross-domain helpers that are not tied to a single feature.
- `src/types/` is only for cross-domain primitives shared widely; keep domain types with their domain.

### Validation (Zod)

- Collocate schemas with a route when only used there.
- Move schemas into the domain folder in `src/lib/<domain>/` when reused across routes or APIs.
- Use a top-level `src/validations/` only if a schema is shared across many domains.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
