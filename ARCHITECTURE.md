# Architecture

## Overview

DeployBridge is a static landing page + a set of Node.js deployment scripts. There is no backend server — all deployment logic runs locally via CLI.

## File Structure

```
deploy-bridge/
├── index.html              # Landing page (Luma-inspired design)
├── style.css               # CSS — glassmorphism, gradients, animations
├── script.js               # Form interactions, deploy progress animation
├── deploy-to-oss.js        # Upload files to Alibaba Cloud OSS
├── bind-domain.js          # Bind custom domain + DNS verification
├── setup-ssl.js            # SSL certificate management via CAS API
├── fix-acl.js              # Re-upload files with correct Content-Type
├── .env                    # Secrets (not in repo)
├── .gitignore              # Excludes node_modules, .env
├── package.json            # Dependencies: ali-oss, dotenv, @alicloud/*
├── article.md              # Dev.to article source
├── article-images/         # Screenshots for the article
│   ├── Deploy-Bridge.jpg   # Cover image
│   ├── ram_policy.jpg      # RAM user setup
│   ├── accesskey.jpg       # AccessKey creation
│   ├── oss_activate.jpg    # OSS activation flow
│   ├── oss_purchase.jpg    # $0.00 purchase page
│   ├── oss_activated.jpg   # OSS activated
│   ├── oss_bucket.jpg      # Bucket with uploaded files
│   ├── dns_conflict.jpg    # DNS record conflict
│   └── deploybridge_landing.jpg  # Landing page screenshot
└── convert-to-jpg.ps1     # Image conversion utility
```

## Deployment Flow

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────┐
│  GitHub Repo │────▶│  npm run build   │────▶│  dist/ files  │
└─────────────┘     └──────────────────┘     └───────┬───────┘
                                                     │
                                                     ▼
                                          ┌──────────────────┐
                                          │  deploy-to-oss.js │
                                          │  (ali-oss SDK)    │
                                          └────────┬─────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │  Alibaba Cloud   │
                                          │  OSS Bucket      │
                                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │  bind-domain.js  │
                                          │  CNAME + TXT     │
                                          └────────┬─────────┘
                                                   │
                                                   ▼
                                          ┌──────────────────┐
                                          │  Custom Domain   │
                                          │  HTTP only       │
                                          └──────────────────┘
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `ali-oss` | Alibaba Cloud OSS SDK — file upload, bucket management, domain binding |
| `dotenv` | Load secrets from `.env` file |
| `@alicloud/cas20200407` | Certificate Authority Service SDK — SSL certificate management |
| `@alicloud/openapi-client` | Alibaba Cloud API authentication and request signing |

## Security

- All credentials stored in `.env` (excluded from git)
- Scripts use `process.env` via `dotenv` — no hardcoded tokens
- RAM user with `AliyunOSSFullAccess` policy (scoped, not root)

## Known Limitations

1. **No SSL** — CAS API requires manual $40/yr subscription purchase via console
2. **No GoDaddy API** — free tier blocks DNS record management
3. **5 manual steps** — OSS activation, RAM setup, DNS records, Block Public Access toggle, SSL purchase
4. **Single provider** — currently only supports Alibaba Cloud OSS
