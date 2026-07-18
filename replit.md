# Cremoso Burguer

A Next.js food ordering and restaurant management system built with [v0](https://v0.app). Includes a customer-facing ordering page, admin panel, and delivery team panel.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase (PostgreSQL + Storage)
- **Payments:** Mercado Pago (PIX)
- **UI:** Tailwind CSS v4, Radix UI, shadcn/ui components
- **State:** Zustand

## Running the app

```bash
pnpm run dev
```

Starts on port 5000. The workflow `Start application` handles this automatically.

## Required secrets (all set in Replit Secrets)

| Secret | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `SESSION_SECRET` | Cookie signing secret |
| `ADMIN_USERNAME` | Admin panel username |
| `ADMIN_PASSWORD` | Admin panel password |
| `ENTREGADOR_USERNAME` | Delivery panel username |
| `ENTREGADOR_PASSWORD` | Delivery panel password |
| `MERCADOPAGO_ACCESS_TOKEN` | Mercado Pago production access token |

## Key routes

- `/` — Customer ordering page
- `/equipe/admin` — Admin panel (login required)
- `/equipe/entregador` — Delivery team panel (login required)
- `/acompanhar` — Order tracking page

## User preferences
