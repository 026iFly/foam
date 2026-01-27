# Intellifoam - Professionell Sprutisolering

Professional spray foam insulation website for the Swedish market. Built with Next.js 16, TypeScript, and Tailwind CSS.

## 🏢 About

**Intellifoam** is a brand of Intelliray AB, specializing in professional spray foam insulation services. The site provides:

- Detailed service information for closed-cell and open-cell foam
- Interactive price calculators (simple + expert with building physics)
- Project gallery
- FAQ section
- Contact form
- Admin dashboard for pricing management

## 🚀 Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** SQLite (local) → Postgres (production)
- **Deployment:** Vercel
- **Domain:** intellifoam.se

## 🛠️ Development

### Installation

```bash
# Install dependencies
npm install

# Initialize database
npx tsx lib/init-db.ts
npx tsx lib/update-db-pricing.ts
npx tsx lib/add-gallery-placeholders.ts

# Start development server
npm run dev
```

Visit http://localhost:3000

## 📊 Features

### 1. Simple Price Calculator (`/kalkylator`)
- Quick estimates based on area and foam type
- Interpolates between thickness options
- Project type multipliers

### 2. Expert Calculator (`/kalkylator-expert`)
- Multi-step questionnaire
- Dew point calculations (Magnus formula)
- BBR compliance checking
- Condensation risk analysis
- Flash-and-batt recommendations
- Climate zone selection

### 3. Admin Dashboard (`/admin`)
- Update pricing for all foam types
- Modify additional costs
- Adjust project multipliers

### 4. Gallery (`/galleri`)
- Database-driven projects
- 8 placeholder images included

## 🎨 Branding

### Logo
- Spray gun integrated as letter "F"
- Professional blue (#1e40af)
- Files: `public/logo.svg`, `public/logo-white.svg`, `public/logo-icon.svg`

### Colors
- Primary: Blue-700 (#1e40af)
- Accent: Blue-400 (#60a5fa)
- Text: Gray-700 (#374151)

## 📈 Deployment

See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) for detailed instructions.

**Quick deploy:**
```bash
# Push to GitHub
git push origin main

# Deploy to Vercel
vercel --prod
```

## 📝 Documentation

- [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) - Deployment guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Pre-launch tasks
- [CERTIFICATES_CHECKLIST.md](CERTIFICATES_CHECKLIST.md) - Required certifications
- [EXPERT_CALCULATOR.md](EXPERT_CALCULATOR.md) - Calculator docs
- [IMAGE_DOWNLOAD_GUIDE.md](IMAGE_DOWNLOAD_GUIDE.md) - Gallery images

## 🔐 Required Before Launch

- ✅ **REACH Diisocyanate Training** (MANDATORY - EU Regulation)
- ✅ Business Insurance
- ✅ Equipment/PPE
- ✅ Safety data sheets

See [CERTIFICATES_CHECKLIST.md](CERTIFICATES_CHECKLIST.md)

## 📞 Contact

**Company:** Intellifoam (Intelliray AB)
**Website:** https://intellifoam.se
Part of [Grönteknik.nu](https://gronteknik.nu)

## 📄 License

Copyright © 2026 Intellifoam - Intelliray AB

---

Built with Next.js and Tailwind CSS
