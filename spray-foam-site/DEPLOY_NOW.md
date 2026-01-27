# 🚀 Ready to Deploy Intellifoam!

## ✅ What's Complete

### Branding & Design
- ✅ Company name: **Intellifoam** (brand) / Intelliray AB (legal entity)
- ✅ Logo created with spray gun as "F"
- ✅ Color scheme: Professional blue (#1e40af)
- ✅ Correct Swedish terminology: "sprutisolering"
- ✅ All false certificate claims removed

### Website Features
- ✅ Homepage with hero section
- ✅ Services page with real product specs
- ✅ Simple price calculator
- ✅ Expert calculator with building physics
- ✅ Project gallery with 8 placeholder images
- ✅ FAQ section (6 questions)
- ✅ Contact form
- ✅ Admin dashboard for pricing

### Technical
- ✅ Next.js 16 with TypeScript
- ✅ Tailwind CSS styling
- ✅ SQLite database (local dev)
- ✅ Database populated with real pricing
- ✅ All pages tested locally
- ✅ Responsive design
- ✅ SEO metadata

### Documentation
- ✅ Vercel deployment guide (VERCEL_DEPLOYMENT.md)
- ✅ Certificates checklist (CERTIFICATES_CHECKLIST.md)
- ✅ Deployment checklist (DEPLOYMENT_CHECKLIST.md)
- ✅ Expert calculator docs (EXPERT_CALCULATOR.md)
- ✅ README.md

---

## 🔧 Before Deploying

### 1. Update Contact Information

You still need to add real contact details from Grönteknik.nu/Intelliray AB:

```bash
# Update in database
sqlite3 data/foam.db

UPDATE company_info SET
  phone = '+46 XXX XXX XX XX',      -- Add real phone
  email = 'info@intellifoam.se',    -- Add real email
  address = 'Elektrikergatan 3',    -- Confirm address
  postal_code = '803 10',
  city = 'Gävle',
  org_number = 'XXXXXX-XXXX'        -- Add org number if needed
WHERE id = 1;

.quit
```

### 2. Domain DNS Setup

For **intellifoam.se** and **intellifoam.nu**:

After deploying to Vercel, you'll get DNS instructions. Typically:
```
Type: A
Name: @
Value: 76.76.21.21 (Vercel's IP - they'll give you exact value)

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Add these records in your domain registrar (where you registered the domains).

---

## 🚀 Deployment Steps

### Option 1: Deploy via GitHub + Vercel Dashboard (Recommended)

**Step 1: Push to GitHub**
```bash
cd /Users/pelle/Documents/GitHub/foam/spray-foam-site

# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit: Intellifoam sprutisolering website"

# Create repository on GitHub (github.com/new)
# Name it: intellifoam or spray-foam-site

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/intellifoam.git
git branch -M main
git push -u origin main
```

**Step 2: Create Vercel Project**
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. **Don't deploy yet!** First add database

**Step 3: Add Vercel Postgres**
1. In your Vercel project, go to "Storage" tab
2. Click "Create Database" → Select "Postgres"
3. Name: `intellifoam-db`
4. Region: **Frankfurt** (closest to Sweden)
5. Click "Create"

**Step 4: Copy Environment Variables**
1. In Vercel Postgres dashboard, click ".env.local" tab
2. Copy all the `POSTGRES_*` variables
3. Go to Project Settings → Environment Variables
4. Add each variable (Production, Preview, Development)

**Step 5: Migrate Database**
```bash
# Install postgres client
npm install pg dotenv

# Copy .env from Vercel to local
# (Download .env.local from Vercel dashboard)

# Run migration
npx tsx lib/migrate-to-postgres.ts

# Should see: ✅ Migration completed successfully!
```

**Step 6: Deploy!**
1. Go back to Vercel dashboard
2. Click "Deployments"
3. Click "Deploy" or push new commit to GitHub
4. Wait 1-2 minutes for build
5. Visit your preview URL!

**Step 7: Add Custom Domain**
1. Go to Project Settings → Domains
2. Add `intellifoam.se`
3. Follow DNS instructions from Vercel
4. Wait for DNS propagation (5-30 minutes)

---

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time - will ask questions)
vercel

# After adding Postgres and migrating, deploy to production
vercel --prod
```

---

## 📋 Post-Deployment Checklist

After deploying, test everything:

- [ ] Visit https://intellifoam.se
- [ ] Check homepage loads correctly
- [ ] Test all navigation links
- [ ] Verify gallery images display
- [ ] Try simple calculator
- [ ] Try expert calculator
- [ ] Submit test contact form
- [ ] Check admin dashboard (/admin)
- [ ] Test on mobile device
- [ ] Check page speed (should be <1s load time)

---

## 🎯 What to Do After Launch

### Immediate (This Week)
1. **Get REACH Training** (MANDATORY before taking jobs)
   - Contact PUR-gruppen or Polyterm
   - Cost: 2,000-5,000 SEK per person
   - Takes 1 day

2. **Update Certificate Claims**
   - Once trained, add: "REACH-utbildad personal"
   - Update database or footer

3. **Add Real Project Photos**
   - Replace Unsplash placeholders
   - Take photos of first projects
   - Update database: `UPDATE projects SET image_url=...`

### Soon (This Month)
4. **Get Business Insurance**
   - Required by most clients
   - Coverage: 5+ million SEK

5. **SEO & Marketing**
   - Submit to Google Search Console
   - Add to Hitta.se, Eniro
   - Create Google Business Profile
   - Social media (Facebook, Instagram)

6. **Analytics** (Optional)
   - Add Vercel Analytics (free, built-in)
   - Or Google Analytics

---

## 💰 Costs Summary

### One-Time Costs
- Domain (intellifoam.se + .nu): ~200-400 SEK/year
- REACH Training: 2,000-5,000 SEK per person

### Monthly Costs
- Vercel Hosting: **€0** (free tier sufficient)
- Vercel Postgres: **€0** (free tier sufficient)
- **Total: €0/month** ✨

### When to Upgrade
- Only if you exceed 100k visitors/month
- Or database grows >256 MB
- Unlikely for first year

---

## 🆘 Troubleshooting

### "Build failed"
- Check build logs in Vercel dashboard
- Usually missing dependency: `npm install pg`

### "Database connection error"
- Verify environment variables are set
- Use `POSTGRES_URL` not `POSTGRES_URL_NON_POOLING`

### "Images not showing"
- Images in `/public` are auto-deployed
- Clear browser cache
- Check Vercel deployment logs

### "Site is slow"
- Should be <1s load time
- Check Vercel Analytics
- Images are already optimized

---

## 📞 Need Help?

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Support:** support@vercel.com
- **Vercel Discord:** https://vercel.com/discord

---

## ✨ You're Ready!

The site is complete and ready to deploy. Main remaining tasks:

1. ✅ Add real contact info (phone/email)
2. ✅ Push to GitHub
3. ✅ Deploy to Vercel
4. ✅ Set up custom domain
5. ⏳ Get REACH certification (before taking jobs)
6. ⏳ Replace gallery placeholders (after first projects)

**Estimated time to go live:** 1-2 hours (+ DNS propagation)

Good luck with Intellifoam! 🎉
