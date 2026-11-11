# Diffuse Vision Lab

Interactive labs for the IB DP Computer Science case study **“Generative AI for image creation — a diffuse vision”** (May & November 2027).

There are eight labs. Each one runs Sense → Explore → Interpret → Explain → Critique → Practise and includes:
- hands-on simulations
- personal client case cards
- "Spot the AI's mistakes" tasks
- confidence-rated quizzes
- a recommendation memo
- an AI-use log
- a teacher toolkit and class dashboard

The site is plain HTML, CSS and JavaScript with no build step. Student work is saved in **PostgreSQL** through [Supabase](https://supabase.com). Without a database it still works, but work is saved only in each browser.

---

## 1. Put the site on GitHub Pages (5 minutes)

1. Create a new repository on GitHub, for example `diffuse-vision-lab`.
2. Upload **all files and folders** in this folder: *Add file → Upload files*, drag everything in, then *Commit*. Include the hidden `.nojekyll` file if your upload tool shows it. It's optional.
3. Go to *Settings → Pages → Build and deployment* and set:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
   
   Then click *Save*.
4. After a minute, your site is live at `https://YOUR-USERNAME.github.io/diffuse-vision-lab/`.

At this point the lab works, and students' work stays in their own browser.

## 2. Connect the PostgreSQL database (15 minutes)

1. Create a free account at **supabase.com** and click **New project**. If your school is in the EU, choose an **EU region**, such as Frankfurt.
2. In the project, open **SQL Editor → New query**. Paste the whole of `supabase/schema.sql` and click **Run**. You should see “Success”.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
4. In your GitHub repository, edit `config.js` and paste both values:
   ```js
   window.LAB_CONFIG = {
     SUPABASE_URL: 'https://abcdefgh.supabase.co',
     SUPABASE_ANON_KEY: 'eyJhbGciOi...'
   };
   ```
   Commit the change. The anon key is designed to be public, and the database’s row-level security rules protect the data.
5. In Supabase, open **Authentication → URL Configuration** and set:
   - **Site URL:** your GitHub Pages address
   - **Redirect URLs:** add the same address

   This makes confirmation and password-reset emails link back to your site.

## 3. Make yourself a teacher

1. On your site, open **Account → Create account**, choose **I am a teacher**, and sign up. Confirm the email if asked.
2. In Supabase **SQL Editor**, run this with your own email:
   ```sql
   insert into public.teachers (user_id)
     select id from auth.users where email = 'you@yourschool.org';
   ```
3. Reload the site. A **Dashboard** link appears. Create a class there and give students its **class code**.

## 4. Students

Students open the site, go to **Account → Create account**, enter their name, email, password and your class code, and confirm their email. From then on everything they do saves automatically. The chip in the top bar shows *Saved ✓*.

If students don’t have email access, you can turn off email confirmation in Supabase under **Authentication → Providers → Email → Confirm email**. Only do this if it fits your school’s policy.

## Who can see what

These rules are enforced by PostgreSQL row-level security, not by the web page:

| | Own work | Classmates’ work | Their class’s work |
|---|---|---|---|
| Student | read and write | no access | no |
| Teacher | — | — | read only, for classes they created |

- Students can change their display name but not their class.
- Only you, in the SQL Editor, can make someone a teacher.
- Signing out clears the work from that computer, which matters on shared school machines. The work stays in the account.

## Data protection

The database stores students’ names, emails and their written work. Before using it with a class, check with your school’s data-protection lead. Under GDPR, your school may need to approve Supabase as a data processor and tell students and parents. Choosing an EU region keeps the data in the EU.

## Files

| File | What it does |
|---|---|
| `index.html`, `styles.css` | Page and styles |
| `content.js` | Lab text, quizzes and the exam question bank |
| `critical.js` | AI answers with mistakes, stress tests, transfer tasks, case cards, role cards, spoken-check questions |
| `img.js` | Draws every image in code (no photos) |
| `sims.js` | The simulations and question components |
| `critical-ui.js` | Critique activities, the My work page and the Teacher toolkit |
| `store.js`, `cloud.js`, `config.js` | Local saving, database sync, accounts and the class dashboard |
| `supabase/schema.sql` | PostgreSQL tables, security rules and the sign-up trigger |

All practice questions are original. They are not IB questions. Exam-format details come from published summaries of the 2027 guide, so check them against the official IB guide.
