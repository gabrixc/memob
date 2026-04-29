# Settings Page — User Manual

**URL:** `/settings`  
**Access:** Authenticated users only (redirects to `/login` if unauthenticated)

---

## Overview

The Settings page is the central configuration hub for Memo Builder. It lets you connect external PostgreSQL databases as field data providers and configure webhook integrations for event-driven workflows.

---

## Sections

### 1. Data Sources

Connect one or more PostgreSQL databases so that template fields can be populated dynamically from real data.

#### How to add a data source

1. Navigate to **Settings** (link in the editor top bar).
2. In the **Data Sources** section, fill in both fields:
   - **Alias** — a short friendly name (e.g. `production`, `crm`). This is how the database is referenced inside template field mappings.
   - **Connection URL** — a full PostgreSQL connection string in the form:
     ```
     postgresql://user:password@host:5432/database_name
     ```
3. Click **Add**.

The new source appears in the list immediately. You can add multiple databases.

#### How to remove a data source

Click **Remove** on the right side of any listed source. The connection is deleted immediately — any template fields referencing it will need to be remapped.

#### Security note

Connection URLs are stored server-side. Never paste connection strings into publicly shared templates.

---

### 2. Webhook Configuration

Webhooks let external systems trigger memo generation and receive completed memo payloads automatically.

There are two independent sides: **Inbound** (external → Memo Builder) and **Outbound** (Memo Builder → external).

#### Fields

| Field | Purpose |
|-------|---------|
| **Inbound Bearer Secret** | A secret token your external caller must include as `Authorization: Bearer <token>` when hitting `POST /api/webhook/trigger`. Set this to any strong random string. |
| **Outbound URL** | The HTTPS endpoint Memo Builder will POST the completed memo JSON to after each generation. |
| **Outbound Signing Secret (HMAC-SHA256)** | A shared secret used to sign outbound payloads. The request will include an `X-MemoBuilder-Signature` header your receiver can verify to confirm authenticity. |

#### How to configure webhooks

1. Open **Settings → Webhook Configuration**.
2. Fill in whichever fields apply to your integration:
   - For inbound only: set **Inbound Bearer Secret**.
   - For outbound only: set **Outbound URL** and **Outbound Signing Secret**.
   - For both directions: fill all three fields.
3. Click **Save Changes**. The button shows **Saved ✓** briefly to confirm.

#### Triggering a memo via webhook (Inbound)

Send a `POST` request to `/api/webhook/trigger` with:

```http
POST /api/webhook/trigger
Authorization: Bearer <your-inbound-secret>
Content-Type: application/json

{
  "templateId": "<template-uuid>",
  "data": {
    "fieldKey": "value",
    ...
  }
}
```

Memo Builder will merge the provided data into the template and return the generated memo.

#### Verifying outbound payloads (Outbound)

When Memo Builder posts to your Outbound URL, verify the signature:

```js
const crypto = require('crypto')

function verify(body, signatureHeader, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return signatureHeader === `sha256=${expected}`
}
```

---

## Navigation

- **Back to Editor** — returns to the main canvas editor (`/`).
- The Settings page is accessible from the editor's top bar.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Settings page shows login screen | Your session expired — log in again. |
| Data source not appearing after Add | Check the connection URL format; it must start with `postgresql://`. |
| Outbound webhook not firing | Confirm the Outbound URL is publicly reachable (not `localhost`). Check your server logs for network errors. |
| Inbound trigger returns 401 | The `Authorization` header is missing or the Bearer token does not match the Inbound Bearer Secret. |
| Signature verification failing | Ensure you are hashing the **raw request body bytes**, not a parsed JSON object. |
