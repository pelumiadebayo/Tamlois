# GitHub Pages deployment

1. Push the project to GitHub with `main` as the deployment branch.
2. In **Settings > Pages**, choose **GitHub Actions** as the source. This one-time step creates the Pages site; without it, `actions/configure-pages` returns a `Not Found` error. The workflow does not auto-enable Pages because that requires a separate personal access token rather than the built-in `GITHUB_TOKEN`.
3. In **Settings > Actions > General**, allow actions to read repository contents and deploy Pages.
4. Add public browser configuration as repository **Variables**, not secrets, unless your organisation requires secrets for operational handling. Remember that every `VITE_*` value is visible in the built JavaScript.
5. The workflow currently falls back to `https://pelumiadebayo.github.io/Tamlois` for canonical URLs, sitemap and robots output. Set the `SITE_URL` repository variable when the final custom domain is ready; it overrides this temporary Pages URL.
6. Push to `main` or run the workflow manually.
7. Verify the workflow, `/#/` routes, assets, sitemap, robots, favicon, booking and admin login.

Vite uses `base: './'` and the app uses hash routing, so repository-name paths work without a 404 fallback.

## Custom domain

1. Add the domain in GitHub Pages settings.
2. Create `public/CNAME` containing the bare custom domain only.
3. Configure the required A/AAAA or CNAME DNS records documented by GitHub.
4. Wait for DNS verification, then enable **Enforce HTTPS**.
5. Add the custom domain to Firebase Authentication authorised domains and App Check.
6. Set `SITE_URL` to the custom HTTPS origin, then verify canonical URLs, robots, contact information and social links.

No deployment has been performed from this workspace because the repository and GitHub credentials were not supplied.
