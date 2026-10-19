# Infrastructure

Terraform manages:
- **Cloudflare:** DNS for ryanjensen.dev, rjrjensen.com, and cleancodedesign.com; redirects from rjrjensen.com and cleancodedesign.com to ryanjensen.dev; and the Google Workspace mail records.
- **Vercel:** the site project and its domains.

State lives in a Cloudflare R2 bucket.

> Run every command here yourself, in your own terminal. Tokens and keys never go into the repo or into a chat.

## One-time setup

### 1. Cloudflare

1. Sign in (or sign up) at dash.cloudflare.com and copy your **Account ID**. It's under *Account home → ⋯ next to your account → Copy account ID*.
2. **Enable R2** (*Storage & databases → R2*). Cloudflare asks for a payment method even on the free tier; state files cost nothing at this size.
3. **Create the state bucket**, either by clicking *Create bucket* (name it `ryanjensen-tfstate`) or with:
   ```sh
   npx wrangler login
   npx wrangler r2 bucket create ryanjensen-tfstate
   ```
4. **Create an R2 API token** (*R2 → Manage API tokens → Create*): Object Read & Write, limited to `ryanjensen-tfstate`. Save its **Access Key ID** and **Secret Access Key**.
5. **Create an API token for Terraform** (*My Profile → API Tokens → Create Token → Custom*) with these permissions:
   - Account · Account Settings · Read
   - Zone · Zone · Edit (to create the zones)
   - Zone · DNS · Edit
   - Zone · Single Redirect · Edit
   - Account resources: your account. Zone resources: all zones in your account.

### 2. Vercel

1. Sign in at vercel.com with GitHub.
2. Install the **Vercel GitHub app** and give it access to `rjrjensen/whoami`.
3. *Account Settings → Tokens*: create a token for Terraform.

### 3. Local secrets

Create `infra/.env`, which is gitignored and loaded automatically by mise when you `cd` into the repo:

```sh
CLOUDFLARE_API_TOKEN=...
VERCEL_API_TOKEN=...
AWS_ACCESS_KEY_ID=...          # R2 token's Access Key ID
AWS_SECRET_ACCESS_KEY=...      # R2 token's Secret Access Key
```

Then copy the two example files and fill them in:

```sh
cp backend.hcl.example backend.hcl            # R2 endpoint with your account ID
cp terraform.tfvars.example terraform.tfvars  # account ID (Workspace values can wait; see below)
```

### 4. Apply

```sh
cd infra
terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

The output lists the **nameservers** Cloudflare assigned to each domain.

## Moving the domains from Squarespace

Do these **in order**. Step 1 protects your Google Workspace email on rjrjensen.com.

1. **Turn off DNSSEC** at Squarespace (*Domains → [domain] → DNS → DNSSEC*). Done for all three domains. If nameservers change while it's on, the domain can stop resolving for up to a day. Wait **24 hours** after turning it off.
2. **Switch nameservers** at Squarespace for all three domains (*DNS → Nameservers → Use custom nameservers*) to the values from `terraform output nameservers`.
3. **Wait for Cloudflare to show the zones as Active.** This usually takes under an hour and can take up to 24. Then check:
   - Mail still reaches you@rjrjensen.com.
   - https://rjrjensen.com and https://cleancodedesign.com redirect to https://ryanjensen.dev.
   - https://ryanjensen.dev loads.
4. **Transfer the registrations** (Cloudflare dashboard → *Domain Registration → Transfer Domains*):
   - Unlock each domain at Squarespace and copy its **authorization code**.
   - Paste the code in Cloudflare and pay for one year. The year is added to your current expiration.
   - Approve the transfer email from Squarespace if it arrives. Transfers finish within 5 days.
   - **Wait until all three show as transferred** before closing your Squarespace account.
5. **Turn DNSSEC back on** in Cloudflare for each zone (*DNS → Settings → Enable DNSSEC*). With Cloudflare as registrar, it adds the DS record automatically.

## What changes when DNS moves

- **rjrjensen.com website:** it currently points at a GitHub Pages site (`rjrjensen.github.io`). After the move, it redirects to ryanjensen.dev instead.
- **rjrjensen.com email:** no change. Google Workspace MX, SPF, and DKIM records are copied exactly. One existing TXT verification token of unknown origin is also kept.
- **ryanjensen.dev and cleancodedesign.com email:** both had Squarespace's default forwarding records (Mailgun), with nothing set up to use them. They're dropped.
  - ryanjensen.dev gets Google Workspace mail records (see below).
  - cleancodedesign.com gets records that say it sends and receives no mail, so nobody can spoof it. Its website redirects to ryanjensen.dev.
- **GitHub Pages:** the custom domain is already removed from `rjrjensen.github.io`. Until the nameservers move, also delete the old Pages records at Squarespace: the four `A` records on `@` (185.199.x.x) and the `www` CNAME to `rjrjensen.github.io`. Otherwise, while they still point at GitHub with no site claiming them, someone else could attach `www.rjrjensen.com` to their own Pages site. Cloudflare's zone doesn't include them at all.

## Email at ryanjensen.dev (Google Workspace alias domain)

This makes `hello@ryanjensen.dev` (or any address you like) arrive in your ryan@rjrjensen.com inbox, and lets Gmail reply *as* that address. It costs nothing extra and needs no new inbox.

1. In [Google Workspace Admin](https://admin.google.com): *Account → Domains → Manage domains → Add a domain*. Enter `ryanjensen.dev` and choose **User alias domain**.
2. Google shows a TXT verification value (`google-site-verification=...`). Put it in `terraform.tfvars` as `ryanjensen_dev_google_verification`, run `terraform apply`, then click *Verify* in Admin. The zone must be Active in Cloudflare first.
3. *Apps → Google Workspace → Gmail → Authenticate email*: select ryanjensen.dev and generate a DKIM key. Put the TXT value in `ryanjensen_dev_google_dkim`, `terraform apply`, then click *Start authentication*.
4. *Directory → Users → you → Alternate email addresses*: add `hello@ryanjensen.dev`.
5. In Gmail: *Settings → Accounts → Send mail as → Add another address*, so replies can come from hello@ryanjensen.dev.
