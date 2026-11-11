# Diffuse Vision Lab

Interactive labs for the IB DP Computer Science case study **“Generative AI for image creation — a diffuse vision”** (May & November 2027).

The site is plain HTML, CSS and JavaScript with no build step, and it runs on GitHub Pages. Student work is saved in **PostgreSQL** (Supabase) using **student codes**:

- no emails
- no student accounts
- no names in the database

The teacher signs in to a dashboard with a password, generates codes and hands them out. The teacher keeps their own list of which student has which code.

---

## 1. GitHub Pages
1. Upload all files to a GitHub repository. `index.html` must be at the top level.
2. Go to *Settings → Pages* and set **Deploy from a branch → main → / (root)**, then click *Save*.
3. Your site will be at `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

## 2. Database (Supabase)
1. Go to **supabase.com** and click **New project**. Choose an **EU region** if your school is in the EU.
2. Go to **SQL Editor → New query**, paste all of `supabase/schema.sql`, and click **Run**.
   - You should see “Success”.
   - It also removes the earlier email-based tables if you ran the old version.
3. Open a **new query** and set your teacher password. Use your own password of at least 8 characters:
   ```sql
   select public.lab_set_password('choose-a-strong-password');
   ```
4. Click **Connect** in your Supabase project, or go to **Project Settings → API Keys**. Copy:
   - the **Project URL**, e.g. `https://abcd1234.supabase.co`
   - the **publishable key** (`sb_publishable_…`)
5. On GitHub, edit `config.js` and paste both values:
   ```js
   window.LAB_CONFIG = {
     SUPABASE_URL: 'https://abcd1234.supabase.co',
     SUPABASE_ANON_KEY: 'sb_publishable_...'
   };
   ```
   Never paste a **secret** key (`sb_secret_…`) or the `service_role` key.

You don’t need any email or Authentication settings in Supabase.

## 3. Use it
- **Teacher:** open the site and go to **Dashboard**. Enter your password, then generate codes, choosing **SL or HL** for each batch (for example 25 HL codes with the group label “HL Y2”).
  - SL codes lock the HL-only labs (GANs, hybrid models), HL-only quiz questions and HL glossary terms, and the student can’t switch to HL. Click a code’s SL/HL badge to change its level.
  - Use **Copy list for a spreadsheet** and add the students’ names in your own file.
  - **View work** shows everything a student has done: predictions, evidence, critiques, quiz results, memo and AI-use log.
- **Students:** open the site and click **My code**. They type their code, for example `K7PQ-M42X`, and their work then saves automatically. On any device they enter the same code to continue. On shared computers they press **Finish and leave**.

## Forgot the teacher password?
In the Supabase SQL Editor, run `select public.lab_set_password('new-password');` again. After 10 wrong password attempts, the dashboard locks for 15 minutes.

## How the data is protected
- The website cannot read the tables directly. It can only call a few database functions.
- A student code opens only that student’s own work.
- Listing, creating and deleting codes requires the teacher password, which is stored as a bcrypt hash.
- Codes are 8 random characters, giving about 1 trillion possibilities. Treat them like passwords. If a code leaks, delete it and give the student a new one. Deleting a code also deletes its work.
- The database holds no names or emails, only codes, group labels and lab answers. Students shouldn’t type their names into answers. The schema is written so your school’s data-protection lead can check it easily.

## Files
| File | Purpose |
|---|---|
| `index.html`, `styles.css` | Page and styles |
| `content.js`, `critical.js` | Lab content, quizzes, critical-thinking tasks |
| `img.js`, `sims.js`, `critical-ui.js`, `app.js` | Images, simulations, activities, pages |
| `store.js`, `cloud.js`, `config.js` | Saving, the database connection, the student code page and the teacher dashboard |
| `supabase/schema.sql` | PostgreSQL tables and functions |

All practice questions are original. They are not IB questions.
