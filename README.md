# IT Help Desk Ticket Management System

A full-stack IT support ticketing application.

- **Frontend:** React 18 + React Router + Bootstrap 5 + Chart.js
- **Backend:** Node.js + Express.js (REST API)
- **Database:** MySQL 8
- **Auth:** JWT + bcrypt, role-based access control (Employee / Technician / Admin)
- **Uploads:** Multer (screenshots, documents on tickets & comments)
- **Email:** Nodemailer (SMTP) — new ticket, status updates, resolution confirmation
- **Exports:** Excel (ExcelJS) and PDF (PDFKit) reports
- **Bonus:** Knowledge Base/FAQ, satisfaction rating, dark/light mode, English/Khmer language toggle, in-app notifications, printable ticket view, SLA overdue highlighting, audit log

---

## 1. Project Structure

```
helpdesk/
├── database/
│   └── schema.sql            ← run this first to create the DB + sample data
├── backend/
│   ├── config/db.js          ← MySQL connection pool
│   ├── controllers/          ← business logic per resource
│   ├── middleware/           ← auth (JWT/RBAC), upload (Multer), validation, error handler
│   ├── routes/                ← Express routers
│   ├── utils/                ← email templates, ticket number/SLA helpers, activity logging
│   ├── uploads/               ← uploaded ticket attachments (created at runtime)
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/             ← Login, Dashboard, Tickets, Admin pages, Reports, FAQ
    │   ├── pages/admin/       ← Users, Departments, Categories, Settings, Audit Logs
    │   ├── components/        ← Layout (sidebar/topbar), NotificationBell
    │   ├── context/           ← Auth, Theme (dark/light), Language (EN/KM)
    │   ├── services/api.js    ← Axios client w/ JWT interceptor
    │   └── locales/           ← en.json, km.json
    ├── package.json
    └── .env.example
```

---

## 2. Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+ (or MariaDB 10.5+)
- An SMTP account for outgoing email (Gmail App Password, SendGrid, Mailtrap for testing, etc.)

---

## 3. Database Setup

```bash
mysql -u root -p < database/schema.sql
```

This creates the `helpdesk_db` database, all tables, default departments/categories/SLA settings,
and 3 sample users (all with password `Password123!` once you regenerate the hash — see note below).

> **Important:** the bcrypt hash shipped in `schema.sql` is a placeholder. Generate a real one before
> logging in:
> ```bash
> cd backend
> npm install
> node utils/hashPassword.js "Password123!"
> ```
> Copy the printed hash and `UPDATE users SET password_hash = '<hash>' WHERE email IN (...)`
> (or just re-run the relevant INSERT with the real hash).

Sample accounts (after fixing the hash):
| Role | Email | Password |
|---|---|---|
| Admin | admin@company.com | Password123! |
| Technician | tech1@company.com | Password123! |
| Employee | employee1@company.com | Password123! |

---

## 4. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# edit .env: DB credentials, JWT secrets, SMTP credentials, CLIENT_URL
npm run dev      # nodemon, http://localhost:5000
# or
npm start
```

Key `.env` values to set:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — use long random strings in production
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `IT_DEPARTMENT_EMAIL`

Health check: `GET http://localhost:5000/api/health`

---

## 5. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# edit REACT_APP_API_URL if backend isn't on localhost:5000
npm start        # http://localhost:3000
```

---

## 6. Core Workflows

**Employee:** Login → New Ticket (category/priority/department/attachments) → track status →
reply to IT comments → rate satisfaction once Resolved → ticket auto-closes/employee confirms close.

**Technician:** Login → All Tickets (assigned or unassigned) → open a ticket → change status,
assign to self/another technician, add public replies or internal-only notes, upload solution files.

**Admin:** Everything above, plus Manage Users/Departments/Categories/SLA/Email Settings, Reports
(Excel/PDF export), and Audit Logs.

---

## 7. Security Notes

- Passwords hashed with bcrypt (10 rounds).
- JWT bearer tokens (`Authorization: Bearer <token>`), no CSRF token needed since auth isn't
  cookie-based — if you switch to httpOnly cookies for storing the JWT, add CSRF protection.
- `helmet` sets secure headers; `xss-clean` sanitizes request bodies; `express-validator` validates
  input on all write endpoints.
- File uploads are restricted by MIME type and size (`MAX_FILE_SIZE_MB` in `.env`), renamed on disk
  to prevent path traversal/overwrite.
- Rate limiting on `/api/*` generally, and tighter limits on `/api/auth/login` and
  `/api/auth/forgot-password` to slow brute-force attempts.
- All sensitive actions (login, logout, ticket create/update/assign, user create/delete, etc.)
  are written to `activity_logs` for audit purposes.
- SQL uses parameterized queries throughout (`mysql2` placeholders) — no string-concatenated SQL.

---

## 8. Deployment Guide (example: single VPS with Nginx)

1. **Database:** provision managed MySQL (e.g. AWS RDS, DigitalOcean Managed MySQL) or run MySQL on
   the same VPS. Run `schema.sql` against it.
2. **Backend:**
   - `npm ci --production` in `backend/`
   - Set real `.env` values (strong `JWT_SECRET`s, production SMTP creds, `NODE_ENV=production`)
   - Run under a process manager: `pm2 start server.js --name helpdesk-api`
   - Put it behind Nginx as a reverse proxy on `/api` → `http://127.0.0.1:5000`
3. **Frontend:**
   - `npm run build` in `frontend/` → static files in `frontend/build`
   - Serve `build/` via Nginx (or any static host / CDN)
   - Set `REACT_APP_API_URL` to your public API URL **before building** (CRA bakes env vars in at
     build time)
4. **Nginx example** (simplified):
   ```nginx
   server {
     listen 80;
     server_name helpdesk.example.com;

     location / {
       root /var/www/helpdesk/frontend/build;
       try_files $uri /index.html;
     }

     location /api/ {
       proxy_pass http://127.0.0.1:5000;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }

     location /uploads/ {
       proxy_pass http://127.0.0.1:5000;
     }
   }
   ```
5. **HTTPS:** put Certbot/Let's Encrypt in front of Nginx — required for production, and for
   `secure` cookies / modern browser features.
6. **Backups:** schedule `mysqldump` backups of `helpdesk_db`, and back up the `backend/uploads`
   directory (attachments aren't stored in the DB).

---

## 9. What's Implemented vs. Roadmap

**Fully implemented:** auth (login/logout/forgot/reset/change password), RBAC across all 3 roles,
ticket lifecycle (create → assign → status transitions → resolve → close), SLA due-date calculation
and overdue highlighting, comments (public + internal notes) with attachments, dashboard stat cards
+ 5 charts, Excel/PDF report export with filters, department/category/SLA/email/user admin CRUD,
FAQ/knowledge base, satisfaction rating, audit/activity log, in-app notifications (polling),
dark/light mode, English/Khmer language toggle, printable ticket view.

**Stubbed / recommended next steps for a "v2":**
- In-app notifications currently poll every 30s; swap to WebSockets/Socket.IO for true real-time push.
- Asset management UI (the `assets` table exists in the schema; wire up an admin screen to link
  tickets ↔ assets beyond the free-text `asset_number` field already on the ticket form).
- Multi-technician/team-based SLA escalation rules.
- Ticket merge/duplicate detection.
- Automated tests (Jest/Supertest for API, React Testing Library for frontend) — none are included
  here and should be added before production use.
