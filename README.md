# VectorOne — College Management System

A full-stack college management platform built with Node.js/Express/TypeScript (backend), PostgreSQL/Prisma (database), and plain HTML/CSS/JavaScript (frontend).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js · Express · TypeScript |
| Database | PostgreSQL · Prisma ORM |
| Auth | JWT · Google OAuth 2.0 (GIS SDK) |
| Real-time | Socket.IO |
| File uploads | Multer |
| Email | Nodemailer |
| Frontend | Plain HTML · CSS · Vanilla JS |

---

## Project Structure

```
vectorone-dumy-main/
├── backend/                  # Express/TypeScript API server
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── migrations/       # Prisma migration history
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── routes/           # Express routers
│   │   ├── middleware/        # Auth, error, rate-limit
│   │   ├── sockets/          # Socket.IO handlers
│   │   └── tests/            # Jest test suite
│   ├── .env.example          # Environment variable template
│   └── package.json
├── js/                       # Frontend JavaScript (student portal)
├── admin/                    # Admin portal HTML + JS
├── reset-password.html       # Password reset page
└── README.md
```

---

## Deployment Checklist

Work through every section in order before going live.

---

### 1. PostgreSQL

- [ ] PostgreSQL 14+ installed and running on the target server
- [ ] Database `vectorone` created:
  ```sql
  CREATE DATABASE vectorone;
  ```
- [ ] Database user created with full privileges on `vectorone`:
  ```sql
  CREATE USER vectorone_user WITH PASSWORD 'strong_password_here';
  GRANT ALL PRIVILEGES ON DATABASE vectorone TO vectorone_user;
  ```
- [ ] Connection string ready in the format:
  ```
  postgresql://vectorone_user:strong_password_here@localhost:5432/vectorone?schema=public
  ```

---

### 2. Environment Variables

Copy the template and fill in every value:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Port the Express server listens on (default `5000`) |
| `NODE_ENV` | Yes | `production` for live deployment |
| `DATABASE_URL` | Critical | Full PostgreSQL connection string |
| `JWT_SECRET` | Critical | Random string >= 64 characters — never reuse |
| `JWT_EXPIRES_IN` | Yes | Token lifetime e.g. `7d` |
| `FRONTEND_URL` | Yes | Full URL of your frontend e.g. `https://vectorone.example.com` |
| `API_BASE_URL` | Yes | Full URL of your API e.g. `https://api.vectorone.example.com/api` |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins matching `FRONTEND_URL` |
| `GOOGLE_CLIENT_ID` | Yes (OAuth) | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes (OAuth) | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Yes (OAuth) | Must match Authorized Redirect URI in Google Console |
| `UPLOAD_DIR` | Yes | Absolute path for uploaded files e.g. `/var/vectorone/uploads` |
| `MAX_FILE_SIZE_MB` | Yes | Upload size cap (default `10`) |
| `SMTP_HOST` | Yes (email) | SMTP server hostname |
| `SMTP_PORT` | Yes (email) | SMTP port (`587` for TLS, `465` for SSL) |
| `SMTP_USER` | Yes (email) | SMTP login username / email address |
| `SMTP_PASS` | Yes (email) | SMTP password or app password |
| `SMTP_FROM` | Yes (email) | From address shown in outgoing emails |

Security: `.env` is in `.gitignore` and must NEVER be committed.

Generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 3. Backend — Install and Build

```bash
cd backend
npm install
npm run build
```

Confirm: `dist/` directory is populated with no TypeScript errors.

---

### 4. Prisma — Run Migrations

Apply all database migrations (safe, no data loss):

```bash
cd backend
npx prisma migrate deploy
```

Expected output:
```
2 migrations found in prisma/migrations
Database schema is up to date!
```

Do NOT use `prisma db push` in production — it bypasses migration history.

Verify migration status:
```bash
npx prisma migrate status
```

---

### 5. Uploads Directory

```bash
mkdir -p /var/vectorone/uploads
chmod 750 /var/vectorone/uploads
```

Set `UPLOAD_DIR=/var/vectorone/uploads` in `backend/.env`.

---

### 6. Start the Backend

```bash
cd backend
node dist/server.js
```

For production with PM2:

```bash
npm install -g pm2
pm2 start dist/server.js --name vectorone-backend
pm2 save
pm2 startup
```

Health check:
```bash
curl http://localhost:5000/api/health
```

---

### 7. Frontend Deployment

The frontend is static HTML/CSS/JS. Copy root files to your web server document root (exclude node_modules, backend/, .git, .env).

For API URL in production, add before other scripts in each HTML page:

```html
<script>
  window.VECTORONE_API_URL = 'https://api.vectorone.example.com/api';
</script>
```

---

### 8. CORS Configuration

Set `CORS_ORIGINS` in `backend/.env` to your frontend origin (no trailing slash):

```env
CORS_ORIGINS=https://vectorone.example.com
```

Restart the server after changing.

---

### 9. Google OAuth Setup

WARNING: Google Sign-In is NOT live until you complete all steps below.

1. Go to Google Cloud Console → APIs and Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application type)
3. Add Authorised JavaScript origins: your frontend URL
4. Add Authorised redirect URIs: your login page URL
5. Copy Client ID and Client Secret into `backend/.env`
6. Replace `YOUR_GOOGLE_CLIENT_ID` placeholder in `login.html` and `register.html` with your real Client ID
7. Test by clicking Sign in with Google in a real browser — a Google account picker must appear

---

### 10. SMTP / Email Setup

WARNING: Password reset emails are NOT live until SMTP is configured.
Without SMTP in dev mode, the reset token is logged to the server console.

Gmail setup:
1. Enable 2-Step Verification on your Google account
2. Generate an App Password (Mail)
3. Set in `backend/.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=your_16_char_app_password
   SMTP_FROM=VectorOne <your.email@gmail.com>
   ```

Verify: Trigger a password reset and confirm email is received.

---

### 11. Socket.IO — Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name api.vectorone.example.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

### 12. Final Verification

```bash
# Health check
curl https://api.vectorone.example.com/api/health

# Public events
curl https://api.vectorone.example.com/api/events

# Auth blocked
curl https://api.vectorone.example.com/api/dashboard

# Migration status
cd backend && npx prisma migrate status
```

Manual checklist:
- [ ] Student can register and log in with email/password
- [ ] Student can log in with Google (requires real GOOGLE_CLIENT_ID configured)
- [ ] Forgot password sends an email (requires real SMTP configured)
- [ ] Password reset link works end-to-end
- [ ] Admin can log in and access admin dashboard
- [ ] File upload works (assignments, resources)
- [ ] Real-time messaging works (Socket.IO)
- [ ] CORS: frontend can reach API; other origins are blocked

---

## Running Tests

```bash
cd backend
npm test
```

Expected: 14/14 tests passing

---

## Development Setup

```bash
git clone <repo-url>
cd vectorone-dumy-main

cd backend
npm install
cp .env.example .env
# Edit .env with local PostgreSQL credentials

npx prisma migrate deploy
npm run build
node dist/server.js
```

Open the frontend by serving the root directory with Live Server or any static server.

---

## Security Notes

- JWT tokens expire after `JWT_EXPIRES_IN` (default 7 days)
- All admin routes require `role: ADMIN` in the JWT payload
- Password reset tokens are SHA-256 hashed before storage; raw token is never stored
- File uploads are restricted by MIME type and extension
- Socket.IO rooms enforce participant membership before joining
- Rate limiting is applied to all `/api/auth/*` routes

---

## Environment Variables Reference

See `backend/.env.example` for a complete annotated reference.
