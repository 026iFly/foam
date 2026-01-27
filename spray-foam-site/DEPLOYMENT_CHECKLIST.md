# Pre-Launch Checklist

## ✅ Completed

- [x] Website structure and pages
- [x] Database setup with SQLite
- [x] Price calculator (simple + expert)
- [x] Admin dashboard
- [x] Contact form
- [x] FAQ section
- [x] Technical specifications from real product data
- [x] Swedish content throughout
- [x] Grönteknik.nu footer link

## 🔄 In Progress

### Company Branding
- [ ] **Final company name decision**
  - Recommended: **GrönIsolering.nu**
  - Alternative: Keep Intelliray AB
- [ ] Register domain name
- [ ] Create logo (see LOGO_GUIDELINES.md)
- [ ] Update all branding references

### Contact Information
- [ ] **Update contact details** (from Grönteknik.nu):
  - Current address found: Elektrikergatan 3, Gävle
  - Need to add: Phone number
  - Need to add: Email address
  - Update in database: `UPDATE company_info SET ...`

### Certifications - MUST GET BEFORE GOING LIVE
- [ ] **REACH Diisocyanate Training** (MANDATORY)
  - Required for all personnel handling spray foam
  - EU regulation - legally required
  - Training duration: Typically 1 day
  - Renewal: Every 5 years
  - Where: Contact PUR-gruppen or certified training providers

- [ ] **Company Registration**
  - [ ] Ensure Intelliray AB is registered for this activity
  - [ ] F-skattsedel (if needed)
  - [ ] Insurance (ansvarsförsäkring)

- [ ] **Equipment & Safety**
  - [ ] Spray foam equipment (or rental agreement)
  - [ ] Personal protective equipment (PPE)
  - [ ] Safety data sheets (SDS) for products
  - [ ] Ventilation equipment

- [ ] **Optional but Recommended**
  - [ ] PUR-gruppen certification
  - [ ] ISO 14001 (Environmental management)
  - [ ] Byggfabriken membership or similar

### Content
- [ ] **Remove certificate claims from website**
  - Remove: "CE-märkning" (until you have it)
  - Remove: "REACH-godkänd" (replace with "REACH-kompatibla produkter")
  - Remove: "BBR-certifierad" (just say "uppfyller BBR")
  - Keep: "Följer Boverkets byggregler (BBR)"
  - Keep: "REACH-utbildad personal" (once you have training)

- [ ] **Gallery Images**
  - [ ] Add 6-10 professional spray foam images
  - [ ] Sources for free images:
    - Unsplash.com (search: "spray foam insulation")
    - Pexels.com (search: "insulation", "construction")
    - Pixabay.com
  - [ ] Credit photographers if required
  - [ ] Add own project photos when available

- [ ] **Update Phone Number**
  - Current placeholder: "+46 XX XXX XX XX"
  - Replace with: Grönteknik.nu / Intelliray AB number

- [ ] **Update Email**
  - Current: info@intelliray.se
  - Options:
    - info@gronisolering.nu (if using new domain)
    - isolering@gronteknik.nu
    - Keep info@intelliray.se

### Legal & Compliance
- [ ] **Privacy Policy (GDPR)**
  - Required for contact form
  - Template needed for data handling

- [ ] **Cookie Consent**
  - Not currently using cookies
  - May need if adding analytics

- [ ] **Terms of Service**
  - Pricing validity period
  - Quote vs final price disclaimer
  - Work guarantee terms

### Technical
- [ ] **Database Backup Strategy**
  - Current: foam.db in /data folder
  - Plan for regular backups
  - Consider moving to cloud database for production?

- [ ] **Environment Variables**
  - No sensitive data currently exposed
  - All good for deployment

- [ ] **Testing**
  - [ ] Test all forms
  - [ ] Test admin dashboard
  - [ ] Test calculators with real scenarios
  - [ ] Mobile responsiveness check
  - [ ] Cross-browser testing

## 🚀 Deployment

### Recommended Platform: **Vercel** ✅

**Why Vercel:**
- ✅ Free tier perfect for this site
- ✅ Automatic HTTPS/SSL
- ✅ Built for Next.js (zero config)
- ✅ CDN included (fast worldwide)
- ✅ Automatic deployments from Git
- ✅ Easy custom domain setup
- ✅ Excellent DX (developer experience)

**SQLite Consideration:**
- ⚠️ Vercel is serverless - SQLite file won't persist between deploys
- **Solution Options:**
  1. **Vercel Postgres** (recommended for production)
  2. **Turso** (SQLite in the cloud)
  3. **PlanetScale** (MySQL)
  4. Keep SQLite + manual sync (not recommended)

### Alternative Platforms

**Railway.app:**
- ✅ Supports persistent SQLite
- ✅ Easy deployment
- ⚠️ Paid after free tier

**Fly.io:**
- ✅ Supports persistent storage
- ✅ Good for SQLite
- ⚠️ More complex setup

**My Recommendation:**
Start with **Vercel** + migrate to **Vercel Postgres** (it's free tier is generous and easy to migrate from SQLite).

## 📋 Pre-Launch Tasks (Priority Order)

1. **Decide on company name** (GrönIsolering.nu recommended)
2. **Get contact info from Grönteknik.nu**
3. **Create simple logo**
4. **Remove false certificate claims**
5. **Add gallery placeholder images**
6. **Get REACH training** (CRITICAL - can't operate without this)
7. **Set up Vercel account**
8. **Migrate database to Vercel Postgres**
9. **Deploy to production**
10. **Set up custom domain**

## 🎨 Logo Next Steps

See LOGO_GUIDELINES.md for design specifications and SVG template.

## 📞 Contact Update Script

Once you have the real contact info, run:

```sql
sqlite3 data/foam.db

UPDATE company_info SET
  company_name = 'GrönIsolering.nu',
  address = 'Elektrikergatan 3',
  postal_code = '803 10',
  city = 'Gävle',
  phone = '+46 XXX XXX XX XX',  -- Replace with real number
  email = 'info@gronisolering.nu',  -- Or chosen email
  website = 'https://gronisolering.nu'
WHERE id = 1;
```

## Sources

- [Grönteknik.nu - Intelliray AB Info](https://www.gronteknik.nu/)
- [Hitta.se - Gävle Businesses](https://www.hitta.se/verksamheter/grossister-elektronikkomponenter/gavle)
