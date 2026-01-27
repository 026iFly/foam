# Vercel Deployment Guide for Intellifoam

## Why Migrate from SQLite to Vercel Postgres?

Vercel runs serverless functions, meaning:
- Each request spins up a new instance
- No persistent filesystem between requests
- SQLite files won't persist across deployments

**Solution:** Migrate to **Vercel Postgres** (built on Neon)

---

## Step-by-Step Deployment

### 1. Prerequisites

- GitHub account with repository
- Vercel account (free tier is perfect)
- Current SQLite database exported to SQL

### 2. Push to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - Intellifoam sprutisolering site"

# Create repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/intellifoam.git
git branch -M main
git push -u origin main
```

### 3. Set Up Vercel Postgres

1. Go to https://vercel.com and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. **Before deploying**, go to "Storage" tab
5. Click "Create Database" → Select "Postgres"
6. Choose database name: `intellifoam-db`
7. Select region: **Frankfurt** (closest to Sweden)
8. Click "Create"

### 4. Get Database Connection String

After creating Postgres database:

1. Go to your database in Vercel dashboard
2. Click ".env.local" tab
3. Copy the environment variables:

```env
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NO_SSL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."
```

4. Add these to your Vercel project:
   - Go to Project Settings → Environment Variables
   - Add each variable

### 5. Migrate Database Schema and Data

We've created a migration script that will:
1. Create all tables in Postgres
2. Import all data from SQLite

**Run the migration:**

```bash
# Install Postgres client
npm install pg

# Run migration script
npx tsx lib/migrate-to-postgres.ts
```

### 6. Update Database Code

The site needs to use Postgres instead of better-sqlite3:

```bash
# Install Postgres library
npm install pg
npm uninstall better-sqlite3
```

### 7. Deploy to Vercel

Two options:

**Option A: Deploy via Vercel Dashboard**
1. Go to Vercel dashboard
2. Click your project
3. Click "Deployments" → "Deploy"
4. Wait for build to complete

**Option B: Deploy via CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts to link project
```

### 8. Configure Custom Domain

1. Go to Project Settings → Domains
2. Add domain: `intellifoam.se`
3. Follow DNS instructions:
   - Add A record pointing to Vercel IP
   - Or add CNAME pointing to `cname.vercel-dns.com`
4. Also add `www.intellifoam.se` (redirects to main)

**For Loopia/other Swedish registrars:**
- Log in to your domain registrar
- Go to DNS settings for intellifoam.se
- Add the records Vercel provides

---

## Database Migration Details

### Export Current SQLite Data

```bash
# Export all data to SQL file
sqlite3 data/foam.db .dump > data/export.sql
```

### Postgres Schema (auto-created by migration script)

The migration script creates:
- `company_info` table
- `projects` table
- `faqs` table
- `contact_submissions` table
- `pricing_config` table
- `additional_costs` table
- `project_multipliers` table

All with existing data preserved.

---

## Environment Variables Needed

Add these to Vercel project settings:

```env
# Database (from Vercel Postgres)
POSTGRES_URL="..."
POSTGRES_PRISMA_URL="..."

# Optional: Contact form email notifications
# SMTP_HOST="smtp.gmail.com"
# SMTP_USER="your-email@gmail.com"
# SMTP_PASS="your-app-password"
```

---

## Post-Deployment Checklist

After deploying to Vercel:

- [ ] Visit https://intellifoam.se (or preview URL)
- [ ] Test all pages load correctly
- [ ] Verify gallery images display
- [ ] Test simple price calculator
- [ ] Test expert calculator
- [ ] Submit test contact form
- [ ] Check admin dashboard works
- [ ] Verify database reads/writes work
- [ ] Test on mobile device
- [ ] Check page load speed (should be fast!)

---

## Updating Content After Deployment

### Method 1: Admin Dashboard
Visit `https://intellifoam.se/admin` to update:
- Pricing for all foam types
- Additional costs
- Project multipliers

### Method 2: Direct Database Access
```bash
# Install Vercel CLI
npm i -g vercel

# Connect to production database
vercel env pull .env.local

# Use any Postgres client with connection string
psql $POSTGRES_URL
```

### Method 3: Database GUI
Use Vercel dashboard:
1. Go to Storage → Your Database
2. Click "Data" tab
3. Browse and edit tables directly

---

## Troubleshooting

### Build Fails

**Error:** "Cannot find module 'better-sqlite3'"
- **Solution:** Remove from package.json, install pg instead

### Database Connection Error

**Error:** "Connection refused" or "SSL required"
- **Solution:** Ensure environment variables are set in Vercel
- Use `POSTGRES_URL` not `POSTGRES_URL_NON_POOLING`

### Images Not Loading

**Error:** Gallery images 404
- **Solution:** Images in `/public` folder are auto-deployed
- Clear cache and redeploy if needed

### Slow Build Times

- Vercel builds are usually 30-60 seconds
- Next.js 16 with Turbopack is very fast
- If >2 minutes, check build logs for issues

---

## Costs

### Vercel Free Tier Includes:
- ✅ 100 GB bandwidth/month (plenty for this site)
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Custom domain
- ✅ Edge network (CDN)
- ✅ Serverless functions

### Vercel Postgres Free Tier:
- ✅ 256 MB storage (enough for this database)
- ✅ 60 hours compute time/month
- ✅ Unlimited queries within compute time

**Total cost:** €0/month on free tier

### When to Upgrade:
- If you get >100k visitors/month
- If database grows >256 MB
- If you need priority support

---

## Backup Strategy

### Automated Backups (Vercel Postgres)
- Vercel automatically backs up your database
- Point-in-time recovery available

### Manual Backups
```bash
# Export current production database
pg_dump $POSTGRES_URL > backup-$(date +%Y%m%d).sql

# Or use Vercel dashboard to download backup
```

---

## Performance Optimization

Already implemented:
- ✅ Next.js Image optimization
- ✅ Static page generation where possible
- ✅ Tailwind CSS (minimal CSS)
- ✅ SVG logos (tiny file size)
- ✅ Compressed gallery images

Expected performance:
- **Page load:** <1 second
- **Lighthouse score:** 90+ on all metrics
- **Core Web Vitals:** All green

---

## Support

If you encounter issues:

1. **Check Vercel logs:**
   - Go to Deployments → Click deployment → Runtime Logs

2. **Check build logs:**
   - Look for errors during npm install or build

3. **Vercel Discord:**
   - https://vercel.com/discord
   - Very helpful community

4. **Documentation:**
   - https://vercel.com/docs
   - https://nextjs.org/docs

---

## Quick Commands Reference

```bash
# Local development
npm run dev

# Build locally (test before deploy)
npm run build
npm start

# Deploy to Vercel
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Pull environment variables
vercel env pull
```

---

## Next Steps After Deployment

1. **Set up analytics** (optional)
   - Vercel Analytics (built-in, free)
   - Google Analytics
   - Plausible (privacy-friendly)

2. **Add monitoring** (optional)
   - Vercel Web Analytics
   - Sentry for error tracking

3. **SEO optimization**
   - Submit sitemap to Google Search Console
   - Add meta descriptions (already done)
   - Set up Google Business Profile

4. **Marketing**
   - Add site to Eniro, Hitta.se
   - Create social media profiles
   - Get REACH certification and update site!

---

Ready to deploy! 🚀
