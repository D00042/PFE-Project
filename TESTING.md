# Sprint 1 — How to Test Authentication

## Prerequisites

- **PostgreSQL** running with database `pfe_db` (see `backend/database/db.py` for URL).
- **Python** with backend deps: from `backend/` run `pip install -r requirements.txt` (and any DB driver, e.g. `psycopg2-binary`).
- **Node** for the frontend: from `frontend/` run `npm install`.

---

## 1. Start backend and frontend

**Terminal 1 — Backend**
```bash
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

Open the app (e.g. http://localhost:5173).

---

## 2. Create the first leader (one-time)

1. On the login screen, click **"Bootstrap first leader (demo)"**.
2. You should see: first leader created `leader@test.com` / `leader123`.
3. Do this only once; if you run it again with users in the DB, you’ll get an error (expected).

---

## 3. Scenario 1 — Member login

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as **leader@test.com** / **leader123** | Logged in, role **leader** |
| 2 | In “Create account”: email **member@test.com**, password **pass**, role **member** → **Create account** | “Account created” |
| 3 | **Logout** | Back to login |
| 4 | Log in as **member@test.com** / **pass** | Logged in, role **member** |
| 5 | Click **Member panel** | `{"message": "Member access granted"}` |
| 6 | Click **Leader panel** | Output: **403: Not allowed for your role.** |
| 7 | Click **Manager panel** | Output: **403: Not allowed for your role.** |

---

## 4. Scenario 2 — Leader login

| Step | Action | Expected |
|------|--------|----------|
| 1 | Log in as **leader@test.com** / **leader123** | Logged in, role **leader** |
| 2 | “Create account” section is visible; create e.g. **other@test.com** / **pass** / **member** | “Account created” |
| 3 | Click **Leader panel** | `{"message": "Leader access granted"}` |
| 4 | Click **Manager panel** | **403: Not allowed for your role.** |

---

## 5. Scenario 3 — Manager login

| Step | Action | Expected |
|------|--------|----------|
| 1 | As **leader**, create a **manager**: e.g. **manager@test.com** / **pass** / **manager** | “Account created” |
| 2 | Logout, then log in as **manager@test.com** / **pass** | Logged in, role **manager** |
| 3 | Click **Manager panel** | `{"message": "Manager access granted"}` |
| 4 | “Create account” section is **not** shown (only leaders see it) | UI confirms manager cannot create accounts |

To confirm 403 from API: use DevTools or Postman:  
`POST http://127.0.0.1:8000/auth/register` with Manager’s Bearer token → **403**.

---

## 6. Optional checks

- **401**: Log out, then click **Member panel** (or any panel). You should see “401” / “Please log in” and be treated as logged out.
- **Logout**: Click **Logout**; token is cleared and you see the login form again.

If all three scenarios pass, Sprint 1 authentication is complete.
