# whoami

Source for [ryanjensen.dev](https://ryanjensen.dev), Ryan Jensen's resume site, and for every resume file it serves.

## Layout

| Path | What it is |
| --- | --- |
| `data/resume.yaml` | Single source of truth: experience, skills, education ([JSON Resume](https://jsonresume.org/schema) schema + extensions) |
| `data/variants.yaml` | Resume versions: Complete, Engineering Manager, Lead Engineer |
| `packages/resume` | Builds every version as PDF, Word, Markdown, JSON, and TOML |
| `apps/web` | The site: Next.js on Vercel, statically rendered |
| `infra` | Terraform: Cloudflare DNS, redirects, email routing; Vercel project and domains |
| `docs` | Site plan and the testimonial form spec |

## Common tasks

```sh
npm install
npm run downloads   # rebuild the site's resume files + content from data/ (PDF needs LibreOffice)
npm run dev         # local site at http://localhost:3000
npm run handouts    # resume files for handing out directly, in dist/ (gitignored)
```

After editing `data/`, run `npm run downloads` and commit the regenerated files in `apps/web/public/downloads` and `apps/web/src/content`.

## Quality checks

CI runs on every push and pull request:
- ESLint and a TypeScript check
- A production build
- An axe accessibility scan (WCAG 2.2 AA) of every page, in light and dark mode, at phone and desktop widths, which also fails if any page scrolls sideways
- Terraform format and validation
