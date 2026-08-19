# GitHub Pages deployment

1. Push the project to GitHub with `main` as the deployment branch.
2. In **Settings > Pages**, choose **GitHub Actions** as the source.
3. In **Settings > Actions > General**, allow actions to read repository contents and deploy Pages.
4. Add public browser configuration as repository **Variables**, not secrets, unless your organisation requires secrets for operational handling. Remember that every `VITE_*` value is visible in the built JavaScript.
5. Set `SITE_URL` to the final Pages URL so the sitemap uses the correct origin.
6. Push to `main` or run the workflow manually.
7. Verify the workflow, `/#/` routes, assets, sitemap, robots, favicon, booking and admin login.

Vite uses `base: './'` and the app uses hash routing, so repository-name paths work without a 404 fallback.

## Custom domain

1. Add the domain in GitHub Pages settings.
2. Create `public/CNAME` containing the bare custom domain only.
3. Configure the required A/AAAA or CNAME DNS records documented by GitHub.
4. Wait for DNS verification, then enable **Enforce HTTPS**.
5. Add the custom domain to Firebase Authentication authorised domains and App Check.
6. Update `SITE_URL`, canonical expectations, robots, contact information and social links.

No deployment has been performed from this workspace because the repository and GitHub credentials were not supplied.
