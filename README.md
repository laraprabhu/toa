# TOA Noticeboard

A mobile-first communication hub for residents. The public site is a static GitHub Pages application. Announcements and the administrator allowlist live as JSON in this repository; there is no announcement database.

## Architecture

- **Resident site:** static Vinext/React site deployed by GitHub Actions to GitHub Pages.
- **Source of truth:** `content/announcements.json`.
- **Global numbering:** `content/announcement-sequence.json` reserves permanent announcement numbers that are never reused after deletion.
- **Admin allowlist:** `content/admins.json`, preferably using SHA-256 email hashes.
- **Authentication:** Google Identity Services in the browser; Google ID tokens are verified by the admin service.
- **Admin writes:** a stateless Cloudflare Worker verifies the Google account, checks the repository allowlist, and commits JSON changes through the GitHub Contents API.
- **Preview images:** after GitHub assigns the permanent number, the admin browser renders a compact 1200×540 PNG with Canvas and the Worker commits it to `public/previews/announcement-N.png`.
- **Publishing:** each content commit triggers the Pages workflow, so residents see the new version after the build finishes.

GitHub Pages cannot securely hold a GitHub write credential or verify Google authorization by itself. The Worker is therefore required for secure editing, but it stores no announcement or resident data.

## Local development

Requirements: Node.js 22 or newer.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and add the Google client ID and local Worker URL.
3. Copy `worker/.dev.vars.example` to `worker/.dev.vars` and set its values.
4. Run the site: `npm run dev`
5. In another terminal, run the admin service: `npm run worker:dev`

The resident hub works without the Worker. The Worker is only needed for the admin console.

Until Google and the Worker settings are provided, `/admin/` automatically runs as a public test workspace. Test changes and generated banner previews stay in each visitor's browser and never update GitHub or the live noticeboard. Configuring both `GOOGLE_CLIENT_ID` and `ADMIN_API_URL` automatically replaces this temporary mode with authenticated repository-backed administration.

## Add administrators

Avoid committing plain email addresses when the repository is public. Generate a lowercase email hash:

```sh
npm run admin:hash -- committee.member@gmail.com
```

Place the result in `content/admins.json`:

```json
{
  "admins": [
    {
      "emailSha256": "generated-hash",
      "name": "Committee member",
      "active": true
    }
  ]
}
```

The Worker also accepts an `email` field for a private repository, but hashes are the safer default.

## Google authentication setup

1. Create a Google Cloud project and configure its OAuth consent screen.
2. Create an OAuth 2.0 **Web application** client.
3. Add `http://localhost:3000` and the GitHub Pages origin, such as `https://owner.github.io`, to **Authorized JavaScript origins**.
4. Save the client ID as the GitHub repository variable `GOOGLE_CLIENT_ID`.

Only authentication is delegated to Google. Authorization is always enforced against `content/admins.json` by the Worker.

## GitHub and Cloudflare configuration

Create these GitHub repository variables:

- `GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `SITE_ORIGIN`: origin only, such as `https://owner.github.io` (no repository path).
- `ADMIN_API_URL`: deployed Worker URL, such as `https://toa-noticeboard-admin.example.workers.dev`.

Create these GitHub repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with permission to edit Workers.
- `WORKER_GITHUB_TOKEN`: a fine-grained GitHub token restricted to this repository with **Contents: Read and write**.

Then:

1. Push this project to a repository using `main` as the default branch.
2. In repository settings, select **GitHub Actions** as the Pages source.
3. Run the **Deploy admin API** workflow once.
4. Add its URL as `ADMIN_API_URL`.
5. Run the **Deploy resident hub to GitHub Pages** workflow. The workflow packages the static output from `dist/client`.

## Content model

Announcements support:

- a permanent global announcement number;
- title, concise summary and complete message;
- a generated WhatsApp preview containing its number, category, title and summary;
- category, priority, draft/published status;
- publish and expiry timestamps;
- timing, location and contact information;
- optional action label and URL.

The admin console can create, edit and delete announcements, generate a WhatsApp-ready summary, and keeps every change—including generated preview images—in Git history. Editing an announcement regenerates the same numbered image and changes its preview version so newly shared links do not reuse stale WhatsApp metadata.

## Security notes

- Never put a GitHub token in frontend code, repository variables, or committed files.
- Keep `WORKER_GITHUB_TOKEN` and Cloudflare credentials in GitHub **Secrets**.
- The Worker validates Google token signature, issuer, audience and verified-email status on every admin request.
- CORS permits only the configured site origin.
- Repository SHA checks prevent silent overwrites when two administrators edit at once.
- Protect the `main` branch if you want announcement changes to require review. If branch protection requires pull requests, the direct-edit API must be adapted to create branches and pull requests instead of commits.
