---
title: I Tried to Build a One-Click Deployer — Here's What Actually Happened
published: false
description: I built a landing page promising "Deploy to anywhere as easily as Vercel." Then I actually tried to deploy something. The gap between the promise and reality was... educational.
tags: cloud, deployment, alibaba, devops
cover_image: 
---

# I Tried to Build a One-Click Deployer — Here's What Actually Happened

## The Original Idea

The hypothesis was simple:

> If a project runs on Vercel, it's just static files — HTML, JS, CSS. If it's static, you can host it **anywhere**. Any CDN. Any object storage. Any cloud.

So I came up with [**DeployBridge**](https://maximosovsky.github.io/deploy-bridge/) — an open-source service where you paste four things into a form:

1. **GitHub repo URL**
2. **Vercel token**
3. **Alibaba Cloud token**
4. **Domain name**

Hit "Deploy." The service clones the repo, runs `npm run build`, takes the output files, and uploads them to Alibaba Cloud OSS (object storage). No server. No Nginx. No VPS. Just files on a CDN with a custom domain. Done in 30 seconds.

The logic felt bulletproof: **GitHub repo → `npm run build` → upload `dist/` to Alibaba OSS → DNS → live site.** Five API calls, all automated.

I even had the complexity estimated at **3–4 out of 10.** How hard can it be?

Then I tried to actually deploy something. It took 1.5 hours, 15 steps, 3 different admin consoles, and 8 gotchas I never saw coming.

Here's what happened.

---

## The Promise

[![DeployBridge landing page — "Deploy to anywhere as easily as Vercel"](https://maximosovsky.github.io/deploy-bridge/article-images/deploybridge_landing.jpg)](https://maximosovsky.github.io/deploy-bridge/)

🤖 **Antigravity** built the landing page with a Luma-inspired aesthetic — glassmorphism cards, pastel gradients, subtle animations. It looked professional. Premium, even.

The form. The progress bar. Five steps animating beautifully:
1. ✅ Cloning repository
2. ✅ Building project
3. ✅ Deploying to Vercel
4. ⏳ Configuring DNS on Alibaba Cloud
5. ⬜ Verifying domain & SSL

Then came the moment of truth: I needed to actually deploy [WallPlan](https://www.osovsky.com/wallplan/@yka_yka/), my calendar generator, to Alibaba Cloud.

---

## The Reality

> 🧑 = me (human) — console clicks, purchases, DNS records
> 🤖 = Antigravity (AI) — scripts, API calls, debugging

---

### Step 1: Create a RAM User (10 min)

🧑 You can't just use your root Alibaba account for API access. You need a **RAM (Resource Access Management) user** — their equivalent of AWS IAM.

I navigated to **Alibaba Cloud Console → RAM → Identities → Users → Create User**, and attached the `AliyunOSSFullAccess` policy. There's a picker with 56 pages of policies. Fun.

![Attaching the AliyunOSSFullAccess policy to a RAM user](https://maximosovsky.github.io/deploy-bridge/article-images/ram_policy.jpg)

After creating the user, you get an AccessKey ID and Secret. The Secret is shown **exactly once**. If you miss it, create a new one.

![AccessKey created — shown once, then hidden forever](https://maximosovsky.github.io/deploy-bridge/article-images/accesskey.jpg)

> **Gotcha #1**: The RAM user was created, but I still couldn't do anything. Turns out you need to grant permissions in a *separate step* — creating the user alone isn't enough.

---

### Step 2: Activate OSS ($0.00 Purchase Flow)

🧑 OSS (Object Storage Service) isn't enabled by default. You need to "purchase" it. For $0.00. With a credit card.

![OSS is not activated yet — Enable Now button](https://maximosovsky.github.io/deploy-bridge/article-images/oss_activate.jpg)

Clicking "Enable Now" takes you to a checkout page. Total: $0.00. Payment method: VISA. You still need to click "Purchase."

![The $0.00 purchase flow for OSS activation](https://maximosovsky.github.io/deploy-bridge/article-images/oss_purchase.jpg)

After the "purchase," you get a success page. Congratulations, you've bought nothing.

![OSS successfully activated](https://maximosovsky.github.io/deploy-bridge/article-images/oss_activated.jpg)

> **Gotcha #2**: Even though the service is free to activate, there's a multi-step purchase flow with payment method selection. This can't be automated via API.

---

### Step 3: Deploy the Files (2 min ✅)

🤖 **Antigravity** wrote a Node.js script using the `ali-oss` SDK. I just hit Enter:

```javascript
const client = new OSS({
  region: 'oss-ap-southeast-1',
  accessKeyId: process.env.ALI_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
  bucket: 'wallplan-deploy',
});

// Upload 23 files: HTML, JS, CSS, fonts, images
await client.put('wallplan/@yka_yka/index.html', localFile, {
  headers: { 'Content-Type': 'text/html; charset=utf-8' },
});
```

23 files uploaded. Bucket created. Static hosting enabled. All good.

![Bucket wallplan-deploy in OSS Console with uploaded files](https://maximosovsky.github.io/deploy-bridge/article-images/oss_bucket.jpg)

---

### Step 4: Try to Open the URL... 💀

🧑 I clicked the URL. The HTML file **downloaded** instead of rendering in the browser.

```xml
<!-- Not this -->
<h1>WallPlan Calendar</h1>

<!-- This -->
Save as: index.html (19KB)
```

🤖 **Antigravity** re-uploaded the file with explicit `Content-Type: text/html` and `Content-Disposition: inline` headers. Headers looked correct. Still downloading.

Turns out the problem wasn't the headers at all.

> **Gotcha #3**: Alibaba Cloud OSS **forces file downloads** on the default `*.aliyuncs.com` domain. This is a security policy, not a bug. You *must* bind a custom domain. The documentation mentions this in a footnote somewhere. Nowhere is it prominently displayed.

This single gotcha invalidated the entire "one-click" concept. Without a custom domain, *nothing works* in a browser.

---

### Step 5: Find Your DNS Provider (1 min)

🤖 **Antigravity** ran a quick check:

```bash
nslookup -type=NS osovsky.com
# → ns31.domaincontrol.com → GoDaddy
```

My domain was on GoDaddy. In the "one-click" vision, the system would somehow need to handle this automatically for every possible DNS provider.

---

### Step 6: GoDaddy API... Doesn't Work (15 min)

🧑 I created a Production API key at `developer.godaddy.com/keys`.

🤖 **Antigravity** wrote a script to add a CNAME record via the GoDaddy API. The API returned:

```json
{"code": "ACCESS_DENIED", "message": "Authenticated user is not allowed access"}
```

> **Gotcha #4**: GoDaddy's free tier doesn't give actual API access to manage DNS records. The API key creation page doesn't tell you this. You create the key, it looks valid, and then... AccessDenied.

🧑 Had to add the CNAME record manually through the GoDaddy mobile app. At 2 AM.

---

### Step 7: Domain Verification (20 min)

🤖 **Antigravity** wrote a `bind-domain.js` script to bind `ali.osovsky.com` to the OSS bucket. New error:

```
NeedVerifyDomainOwnership: Please verify domain ownership 
by CreateCnameToken and try again.
```

OSS needs proof that you own the domain. Fair enough. But the verification requires adding a TXT record — and **DNS doesn't allow a CNAME and TXT record on the same hostname**.

![GoDaddy showing a conflict between TXT and CNAME records on the same name](https://maximosovsky.github.io/deploy-bridge/article-images/dns_conflict.jpg)

🤖 **Antigravity** parsed the API response and figured out the TXT record goes to `_dnsauth.ali.osovsky.com`, not `ali.osovsky.com`.

🧑 I added the TXT record manually in GoDaddy.

🤖 **Antigravity** ran the bind script again — domain bound successfully.

> **Gotcha #5**: The initial error message is misleading. The TXT record goes to `_dnsauth.{subdomain}`, which *doesn't* conflict with CNAME. But you only learn this by reading the full XML error response.

---

### Step 8: Block Public Access (5 min)

🤖 **Antigravity** tried to set the bucket ACL to `public-read` via API. Error: `Put public bucket acl is not allowed`.

🧑 I went into OSS Console → Permission Control → found **"Block Public Access: Enabled"** → disabled it.

🤖 **Antigravity** ran the ACL script again — success.

> **Gotcha #6**: Alibaba Cloud enables **"Block Public Access"** by default on the account level. This overrides *any* bucket-level ACL you set. You must explicitly disable it in the console before public-read works.

---

### Step 9: DNS Propagation (10 min)

After binding the domain, the URL returned "Could not find IP address." Normal DNS propagation delay — but another step where we both sat and waited, refreshing the browser.

🤖 **Antigravity** kept running `nslookup ali.osovsky.com 8.8.8.8` until it resolved. Eventually:

```
ali.osovsky.com → wallplan-deploy.oss-ap-southeast-1.aliyuncs.com → 47.79.50.56
```

---

### Step 10: SSL Certificate... Costs $40 💸

The site worked over HTTP. Time for HTTPS.

🤖 **Antigravity** installed the Alibaba Cloud Certificate Management SDK, wrote a script, and called the API:

```
Error: InsufficientQuota — 额度不足
```

🧑 I went to the SSL Certificate Management console. The free certificate package requires a "purchase." I clicked through the flow... **$40/year.**

> **Gotcha #7**: Alibaba Cloud's "free" SSL certificates were quietly transitioned to a $40/year subscription model in February 2026. The free tier no longer exists.

We decided HTTP was fine for an experiment.

---

### Final Result

After 1.5 hours, it worked:

```
http://ali.osovsky.com/wallplan/@yka_yka/index.html
```

The calendar loads. The fonts render. It works.

---

## The Scoreboard: Human vs. AI

| Step | Who did what | Outcome |
|------|-------------|---------|
| Landing page | 🤖 AI designed & built | ✅ Beautiful |
| RAM user + permissions | 🧑 Human (console) | ✅ Manual |
| OSS activation | 🧑 Human ($0.00 purchase) | ✅ Manual |
| File upload script | 🤖 AI wrote & ran | ✅ Automated |
| Content-Type fix | 🤖 AI debugged headers | ❌ Wrong diagnosis |
| Custom domain needed | 🤖 AI found the real cause | ✅ Researched |
| DNS provider lookup | 🤖 AI ran nslookup | ✅ Automated |
| GoDaddy API script | 🤖 AI wrote it | ❌ API blocked |
| CNAME record | 🧑 Human (GoDaddy app, 2 AM) | ✅ Manual |
| Domain verification script | 🤖 AI wrote & debugged | ✅ Automated |
| TXT record | 🧑 Human (GoDaddy app) | ✅ Manual |
| Domain bind | 🤖 AI ran the script | ✅ Automated |
| Disable Block Public Access | 🧑 Human (console) | ✅ Manual |
| Set ACL to public-read | 🤖 AI ran the script | ✅ Automated |
| SSL certificate | 🤖 AI wrote SDK script | ❌ $40, abandoned |
| Security hardening (.env) | 🤖 AI refactored all scripts | ✅ Automated |

**Score: 🤖 AI automated 8 steps. 🧑 Human did 5 console steps manually. 3 steps failed entirely.**

The AI was genuinely useful — it wrote all the scripts, debugged API errors, and parsed XML responses at 2 AM. But it couldn't click "Purchase" in a browser, couldn't bypass GoDaddy's API restrictions, and couldn't buy a $40 SSL certificate without permission.

---

## What I Actually Learned

### The Hypothesis vs. Reality Gap

| Hypothesis | Reality |
|-----------|---------|
| "It's just static files" | True, but **hosting** static files has 15 steps |
| 5 API calls | 5 API calls + 5 manual console steps + 3 failures |
| Complexity: 3–4/10 | Reality: 7/10 |
| 30 seconds | 1.5 hours |
| Zero config | Configure RAM, OSS, ACL, DNS, domain verification |
| Fully automated | 5 mandatory manual steps |
| Any cloud provider | Each provider has unique gotchas |
| Any DNS provider | GoDaddy API doesn't even work |
| Free SSL included | SSL costs $40/year |

### The "Automation Ceiling"

Even with an AI assistant writing code in real-time, some steps simply **cannot be automated**:
- Activating OSS requires a manual purchase flow
- GoDaddy (and some other DNS providers) don't offer working API access
- Domain verification requires adding records in a third-party system
- Block Public Access toggle is an account-level security setting
- SSL certificates require purchasing a subscription plan

### The Core Irony

The original hypothesis was elegant and technically correct: **Vercel-compatible projects are just static files, and static files can live anywhere.** That's true.

But "deploying static files" turned out to be the **easy 10%** of the problem. The other 90% is cloud provider onboarding, security policies, DNS fragmentation, and $0.00 purchases with credit cards.

### DNS: The Universal Problem

The biggest blocker isn't cloud providers — it's **DNS fragmentation**. Your domain could be on GoDaddy, Cloudflare, Namecheap, Route53, Google Domains, Hetzner, or any of dozens of other providers. Each has its own API (or doesn't have one at all). Supporting all of them is a product in itself.

---

## Should DeployBridge Exist as a Product?

**Probably not as a SaaS.** The gap between "one-click deploy" and reality is too wide. Every user's setup is different — different cloud, different DNS, different account configurations.

But the **article you're reading** might be more valuable than the product itself. If you're considering building a cross-cloud deployment tool, here's your roadmap of what you'll actually encounter.

**What I'd build instead:**
- A **guided wizard** that walks users through each step, rather than promising automation
- A **CLI tool** for personal use that handles the specific providers I work with
- A *really* good dev.to article about why "one-click" is a lie 😄

---

## The 8 Gotchas Cheat Sheet

| # | Gotcha | Provider | Who found it |
|---|--------|----------|-------------|
| 1 | Creating a RAM user ≠ granting permissions | Alibaba Cloud | 🧑 Human |
| 2 | OSS activation requires a $0.00 "purchase" | Alibaba Cloud | 🧑 Human |
| 3 | Default OSS domain forces file downloads | Alibaba Cloud | 🤖 AI |
| 4 | GoDaddy API requires paid plan for DNS access | GoDaddy | 🤖 AI |
| 5 | Domain verification TXT goes to `_dnsauth.*` | Alibaba Cloud | 🤖 AI |
| 6 | Block Public Access silently overrides ACLs | Alibaba Cloud | 🧑 + 🤖 |
| 7 | "Free" SSL certificates cost $40/year | Alibaba Cloud | 🤖 AI |
| 8 | OSS API signatures need alphabetically sorted params | Alibaba Cloud | 🤖 AI |

---

**What's the wildest deployment gotcha you've encountered?** Drop it in the comments 👇

Follow me: [LinkedIn](https://www.linkedin.com/in/osovsky/) · [X/Twitter](https://x.com/MaximOsovsky)
