# Spray Foam Website - Setup Summary

## What's Been Completed

### 1. Document Organization ✓
All documents have been organized into a proper structure:

```
docs/
├── product-specs/          # Technical datasheets
│   ├── Closed-cell polyurethane foam A B (1).pdf
│   └── Open Cell polyurethane foam A B (1).pdf
├── quotes/                 # Pricing from suppliers
│   └── Pelle Stensson Gävle 251222.pdf
└── research/               # Business research
    └── sprayisolering_sammanfattning.pdf
```

### 2. Database-Driven Pricing System ✓

**Tables Created:**
- `pricing_config` - Stores pricing for different foam types and thicknesses
- `additional_costs` - Setup fees, generator costs, hourly rates
- `project_multipliers` - Complexity adjusters for different project types

**Pricing Data (from Polyterm quote):**
- **Closed-cell:** 365-550 kr/m² (depending on thickness)
- **Open-cell:** 292-440 kr/m² (estimated 20% less)
- **Additional costs:**
  - Setup fee: 4,500 kr
  - Generator: 2,000 kr/day
  - Extra work: 625 kr/hour

### 3. Updated Price Calculator ✓

Location: `/kalkylator`

**Features:**
- Fetches real-time pricing from database
- Interpolates prices for any thickness (50-200mm)
- Applies project type multipliers (vind, vägg, källare, krypgrund, garage)
- Shows both excl. and incl. VAT prices
- Displays additional costs (setup, generator, extra work)
- Based on actual Polyterm quote data

### 4. Admin Dashboard ✓

Location: `/admin`

**Capabilities:**
- Edit pricing for all foam types and thicknesses
- Update additional costs (setup, generator, hourly rate)
- Modify project type multipliers
- Auto-saves on field blur
- No login required (can add authentication later)

**How to use:**
1. Go to http://localhost:3000/admin
2. Click on any price field
3. Edit the value
4. Click outside the field to save
5. Changes immediately reflect in the calculator

### 5. Updated Technical Specifications ✓

Location: `/tjanster`

Now includes real data from product datasheets:

**Closed-cell (DMJ-Spray500):**
- Density: 35+ kg/m³
- K-factor: ≤0.024 W/(m·K)
- Compressive Strength: ≥150 KPa
- Closed-cell Rate: ≥90%
- Water absorption: ≤3%
- Fire class: B2

**Open-cell (DmjSpray-501F):**
- Density: 8-12 kg/m³
- K-factor: ≤0.040 W/(m·K)
- Compressive Strength: ≥13 KPa
- Open-cell Rate: ≥99%
- Sound Absorption: 0.43% (800-6300 Hz)
- Water-blown (environmentally friendly)

### 6. Website Features

All pages completed and tested:
- ✅ Homepage with environmental focus
- ✅ Services with real technical specs
- ✅ FAQ (6 questions in Swedish)
- ✅ Gallery (ready for project photos)
- ✅ Contact form (saves to database)
- ✅ Price calculator (database-driven)
- ✅ Admin dashboard (manage pricing)

## How to Update Prices

### Method 1: Admin Dashboard (Recommended)
1. Visit http://localhost:3000/admin
2. Edit any field directly
3. Changes save automatically
4. No coding required

### Method 2: Database Direct
```bash
npx tsx lib/update-db-pricing.ts
```
Then modify the values in the script.

### Method 3: SQL Query
```bash
sqlite3 data/foam.db
UPDATE pricing_config SET price_per_m2_excl_vat = 400 WHERE foam_type = 'closed' AND thickness_mm = 70;
```

## Next Steps

1. **Add More FAQ Items** - Update `lib/init-db.ts` or add through database
2. **Upload Project Photos** - Add to `docs/projects/` and update gallery
3. **Customize Contact Info** - Update phone number in database
4. **Add Company Logo** - Place in `public/` folder
5. **Deploy** - Ready for Vercel, Netlify, or any Node.js host

## Running the Site

```bash
cd spray-foam-site
npm run dev
```

Visit:
- Website: http://localhost:3000
- Calculator: http://localhost:3000/kalkylator
- Admin: http://localhost:3000/admin

## Database Location

`spray-foam-site/data/foam.db`

The database is excluded from git (.gitignore) but can be backed up manually.

## Important Notes

- All prices in the calculator are **excluding VAT**
- 25% VAT is added automatically for display
- ROT deduction mentioned but not automatically calculated
- Pricing interpolates between defined thicknesses
- Project multipliers affect total price (1.0 = base price, 1.2 = 20% more)

## Support

For questions about:
- **Pricing updates:** Use the admin dashboard
- **Technical specs:** See `docs/product-specs/`
- **Market research:** See `docs/research/`
- **Code changes:** All code is in `spray-foam-site/app/`
