# Palm Pizza Kitchen — Backend

Express + MySQL API for the Palm Pizza Kitchen storefront and control panel.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # edit DB credentials if needed
npm run dev
```

On startup the API **automatically**:
1. Creates the MySQL database (if missing)
2. Creates all tables (`CREATE TABLE IF NOT EXISTS`)
3. Seeds menu/users/offers if the menu is empty

Manual commands (optional):

```bash
npm run db:init   # create tables only
npm run db:seed   # re-seed / upsert defaults
```

Set `AUTO_SEED=0` in `.env` to skip auto-seeding.

## Default accounts

| Role     | Email                 | Password     |
|----------|-----------------------|--------------|
| Admin    | admin@palmpizza.com   | admin123     |
| Customer | alex@email.com        | customer123  |

## Main endpoints

- `POST /api/auth/register` · `POST /api/auth/login` · `GET /api/auth/me`
- `GET /api/menu` · `GET /api/menu/:id`
- `GET|POST /api/cart` · `PATCH|DELETE /api/cart/:itemId` (auth)
- `POST /api/orders` · `GET /api/orders/mine` · `GET /api/orders` (admin)
- `GET /api/offers`
- `GET /api/stats` · `GET /api/customers` · `GET|PUT /api/settings` (admin)
- `POST /api/contact` · `POST /api/newsletter`
- `GET /api/health`
- `POST /api/orders` — creates the order and starts a XentriPay collection
- `GET /api/payments/:orderId` — poll collection status (`?reference=`)
- `POST /api/webhooks/xentripay` — live XentriPay webhook (HMAC signature)

## Payments (XentriPay live)

```
XENTRIPAY_API_KEY=your_live_key
XENTRIPAY_API_BASE=https://xentripay.com
XENTRIPAY_WEBHOOK_SECRET=your_webhook_secret
APP_URL=https://your-public-site
BACKEND_PUBLIC_URL=https://your-public-api
BUSINESS_OWNER_EMAIL=info@palmpizzakitchen.com
```

In the XentriPay dashboard, set the webhook URL to:

`https://your-public-api/api/webhooks/xentripay`

Subscribe at least to `COLLECTION_SUCCESSFUL`, `COLLECTION_FAILED`, `CHECKOUT_SUCCESSFUL`, `CHECKOUT_FAILED`, and `PAYOUT_SUCCESS`. XentriPay signs the raw JSON body with HMAC-SHA256; this API verifies `X-Xentripay-Signature` before marking an order paid or sending the receipt.

Webhooks require a public HTTPS URL (not localhost). Until the site is deployed, checkout still polls collection status on the live API.
