# Al Foah Attendance

Internship attendance for the Agthia Al Foah office. Interns sign in and out on
their phone, the system refuses anything outside the office, and the supervisor
pulls the university's attendance sheet as a Word file whenever they need it.

Built for two interns and their supervisor. It is deliberately small.

---

## What it does

**Interns**

- One dial on the phone. Press to sign in, press again to sign out.
- The ring fills across the working day so they can see how much of it is done.
- Signing out asks for a signature, drawn with a finger. It lands on the sheet.
- Attendance is refused unless they are inside the office fence.
- Work log, tasks and leave requests.
- They can download their own attendance sheet any time.

**Supervisors**

- Who is in, who is not, and how long each of them has been there.
- One queue for everything needing a decision: new signups, requests to punch
  from outside the fence, leave requests.
- Edit any day, with the edit stamped as an edit.
- Download the university sheet for any intern over any date range.
- Set where the office is, how long the working day runs, and the placement dates.

**System owner (one person, you)**

- Test mode, which switches the fence off and seeds demo data so the system can
  be shown to people before it is real.
- One button that wipes the demo, turns the fence on, and goes live.

---

## Setting it up

### 1. A database

Neon Postgres. In the Vercel dashboard, open the project, go to **Storage**, add
**Neon**. That sets `DATABASE_URL` for you.

Then run `db/schema.sql` once against it. Easiest way is the SQL editor in the
Neon dashboard: paste the file in and run it. It is safe to run more than once.

### 2. Environment variables

Three, set in Vercel under **Settings → Environment Variables**:

| Name | What it is |
| --- | --- |
| `DATABASE_URL` | Neon connection string. Added for you by the integration. |
| `AUTH_SECRET` | Signs the login cookie. At least 32 characters. Generate with `openssl rand -base64 48`. |
| `SETUP_CODE` | One-time code that creates the first system owner. Pick something only you know. |

`.env.example` has the same list for running it locally.

### 3. Deploy

Push to GitHub and import the repository in Vercel. It builds with no extra
configuration.

### 4. Create your account

Open the deployed site, go to **Create your account**, tick *I am setting this
system up*, and enter your `SETUP_CODE`. That makes you the system owner.

The setup code stops working the moment a system owner exists, so it cannot be
used later to grab access.

### 5. Set the office location

Sign in, open **Settings**, and while standing in the office press **Use where I
am standing now**. That is far more accurate than dropping a pin on a map. Set
the radius while you are there: 200 m covers a typical site without letting
someone punch in from the road.

### 6. Show it to people

Open **System**, press **Seed demo data**. You get two demo interns with three
weeks of attendance, a work log, tasks, and one of each kind of request sitting
in the approvals queue. Demo logins are shown on that page.

### 7. Go live

**System → Go live**. It deletes every demo row and turns the office fence on.
Real accounts and real attendance are never touched.

---

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in the three values
npm run dev
```

Location does not work over plain `http://` in most browsers, so the geofence
will not behave properly in local development. Test that part on the deployed
site, which is on HTTPS.

---

## How the location check works

The phone reports a position. That position is sent to the server, and the
server is the only thing that decides whether it is inside the fence. Distance
is Haversine against the configured centre. A fix the phone is not confident
about, worse than 150 m of accuracy, is rejected rather than trusted.

Every punch stores the coordinates, the accuracy, and the IP address it came
from.

**One honest limitation.** Browser location can be faked by anyone who knows how
to open developer tools, and this is true of every web-based geofence, not just
this one. The stored coordinates and IP mean a faked punch leaves a trace a
supervisor can spot, but it does not make faking impossible. If the office has a
fixed public IP, adding an IP check alongside the fence would make this much
harder, and that is a small change to `src/app/api/punch/route.ts`.

---

## How it is put together

```
src/
  app/
    (app)/            everything behind a login
      today/          the dial
      log/            work log
      tasks/          tasks
      leave/          leave requests
      admin/          supervisor screens
      super/          system owner, test mode
    api/              every write goes through here
    login/ signup/ pending/
  lib/
    auth.ts           passwords, sessions, role guards
    geo.ts            Haversine and coordinate validation
    dates.ts          Gulf time, the Mon-to-Fri working week, week numbers
    report.ts         builds the Word sheet
    demo.ts           seeds and wipes demo data
    queries.ts        the queries the supervisor screens share
db/schema.sql
```

No Tailwind, no component library. The design system is `src/app/globals.css`,
about 400 lines of custom properties. Colours are sampled out of the Agthia
logo: leaf green `#779A0B` and brand black `#1D1D1B`.

Roles are never chosen by the person signing up. `src/app/api/admin/approve`
is the only place a role is handed out, which is what keeps an intern from
making themselves an admin and editing their own hours.
