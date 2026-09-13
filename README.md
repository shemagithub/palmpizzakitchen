# Palm Pizza Kitchen

Online ordering for **Palm Pizza Kitchen** (Kigali) — Next.js storefront + Express/MySQL API.

**Live:** [palmpizzakitchen.com](https://palmpizzakitchen.com)  
**API:** [backend.palmpizzakitchen.com](https://backend.palmpizzakitchen.com)  
**Repo:** [github.com/shemagithub/palmpizzakitchen](https://github.com/shemagithub/palmpizzakitchen)

## Project folders

| Folder | What it is |
|--------|------------|
| `src/` | Next.js App Router storefront (pages, components, lib) |
| `public/` | Static assets (logo, favicons, promos, `.htaccess`) |
| `backend/` | Express API, MySQL schema, payment & mail services |
| `assets/` | Design reference images |
| `.env.example` | Frontend env template (copy to `.env.local`) |
| `backend/.env.example` | Backend env template (copy to `backend/.env`) |

**Not on GitHub (by design):** `.env`, `node_modules`, `out/`, `*.zip`, uploads.

## Features

- Menu: pizzas, burgers, sides, drinks, combos (with size & combo picks)
- Cart + checkout (delivery areas / fees, pickup, MoMo / Airtel / card)
- **Promo offers:** BOGO & fixed price — customers pick products; blank sizes stay hidden; flat or per-size promo price
- Help me choose (home + menu pages only on mobile FAB)
- Auth: register, verify email, forgot / reset password
- Admin: menu, offers, orders (Maps), delivery areas, reviews, mailbox, payouts

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + MySQL
- **Payments:** XentriPay

## Local run

### 1) Backend

```bash
cd backend
cp .env.example .env   # set DB_*, JWT_SECRET, SMTP, etc.
npm install
npm start              # default http://localhost:4000
```

Health check: `http://localhost:4000/api/health`

### 2) Frontend

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Main routes

| Route | Page |
|-------|------|
| `/` | Home |
| `/pizzas` `/burgers` `/sides` `/drinks` `/combos` | Menu |
| `/product/[id]` | Product detail |
| `/offers` `/offers/order` | Deals + pick items for promo |
| `/pick` | Help me choose |
| `/cart` `/checkout` | Cart & checkout |
| `/account` | Sign in / profile |
| `/admin` | Shop manager |

## cPanel deploy

Create a ready-to-upload zip (website + API, no `node_modules` / `.env`):

```bash
./scripts/pack-cpanel.sh
```

That writes `palmpizzakitchen-cpanel-YYYYMMDD.zip`. Then:

1. Extract `public_html/` into the site `public_html` (keep `.htaccess`)
2. Extract `palm-backend/` → Setup Node.js App → `app.js` → NPM Install → Restart
3. Keep the live `.env` on the server; see `backend/cpanel-deploy.txt`

## Git

```bash
git clone https://github.com/shemagithub/palmpizzakitchen.git
cd palmpizzakitchen
```
