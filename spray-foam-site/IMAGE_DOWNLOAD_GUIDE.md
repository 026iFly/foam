# Gallery Image Download Guide

## Free Stock Photos from Unsplash

All images are from **Unsplash** - free for commercial use, no attribution required (but nice to give credit).

## Quick Download Instructions

### Option 1: Automated Download (Recommended)

```bash
# Create gallery folder
mkdir -p public/gallery

# Download all images using curl
cd public/gallery

# Image 1: Attic insulation
curl -L "https://images.unsplash.com/photo-DWrDpN8i2Fc?w=1200&q=80" -o spray-foam-attic.jpg

# Image 2: Before/after comparison
curl -L "https://images.unsplash.com/photo-8FJPaoL-YPA?w=1200&q=80" -o before-after-insulation.jpg

# Image 3: Wall insulation (wooden frame)
curl -L "https://images.unsplash.com/photo-nIlAoV8bZxo?w=1200&q=80" -o wall-insulation.jpg

# Image 4: Roof spray work
curl -L "https://images.unsplash.com/photo-ce2r9sPR_9E?w=1200&q=80" -o roof-spray.jpg

# Image 5: Barn/agricultural building
curl -L "https://images.unsplash.com/photo-feg3zKvkXo8?w=1200&q=80" -o barn-insulation.jpg

# Image 6: Basement/foundation foam
curl -L "https://images.unsplash.com/photo-aCshJn3y93s?w=1200&q=80" -o basement-foam.jpg

# Image 7: Professional worker spraying
curl -L "https://images.unsplash.com/photo-qEfQao31Rpw?w=1200&q=80" -o professional-spray.jpg

# Image 8: Wooden wall detail
curl -L "https://images.unsplash.com/photo-MCMWHK-WEZU?w=1200&q=80" -o wooden-wall.jpg

cd ../..
```

### Option 2: Manual Download

Visit each Unsplash link and click "Download" (free, no account needed):

1. **spray-foam-attic.jpg**
   - https://unsplash.com/photos/DWrDpN8i2Fc
   - Photo by Getty Images
   - Shows: Wooden frame house thermal insulation

2. **before-after-insulation.jpg**
   - https://unsplash.com/photos/8FJPaoL-YPA
   - Photo by Getty Images
   - Shows: Before and after thermal insulation comparison

3. **wall-insulation.jpg**
   - https://unsplash.com/photos/nIlAoV8bZxo
   - Photo by Olek Buzunov
   - Shows: Wooden wall with spray foam insulation

4. **roof-spray.jpg**
   - https://unsplash.com/photos/ce2r9sPR_9E
   - Photo by Ömer Haktan Bulut
   - Shows: Professional spraying a roof

5. **barn-insulation.jpg**
   - https://unsplash.com/photos/feg3zKvkXo8
   - Photo by Getty Images
   - Shows: Scandinavian barn thermal insulation

6. **basement-foam.jpg**
   - https://unsplash.com/photos/aCshJn3y93s
   - Photo by Erik Mclean
   - Shows: Floor/basement insulation work

7. **professional-spray.jpg**
   - https://unsplash.com/photos/qEfQao31Rpw
   - Photo by Ömer Haktan Bulut
   - Shows: Worker spraying insulation

8. **wooden-wall.jpg**
   - https://unsplash.com/photos/MCMWHK-WEZU
   - Photo by Ömer Haktan Bulut
   - Shows: Worker spraying on roof/wall

## After Downloading

1. Place all images in: `public/gallery/`
2. Run the database script: `npx tsx lib/add-gallery-placeholders.ts`
3. Visit: http://localhost:3000/galleri

## Image Specifications

- **Format:** JPG (optimized for web)
- **Size:** 1200px width recommended
- **Quality:** 80% compression for balance
- **License:** Unsplash License (free for commercial use)

## Attribution (Optional but Nice)

While Unsplash doesn't require attribution, you can add photo credits in the footer:

```html
Photos by Getty Images, Ömer Haktan Bulut, Olek Buzunov, and Erik Mclean from Unsplash
```

## Alternative Sources

If you need more images:

- **Pexels:** https://www.pexels.com/search/spray%20foam%20insulation/
- **Vecteezy:** https://www.vecteezy.com/free-photos/spray-foam-insulation
- **Freepik:** https://www.freepik.com/free-photos-vectors/spray-foam-insulation

## When You Have Real Project Photos

Replace these placeholders by:

1. Taking high-quality photos (1200x800px minimum)
2. Uploading to `/public/gallery/`
3. Updating database: `UPDATE projects SET image_url='/gallery/your-photo.jpg' WHERE id=X;`

---

## Quick Start Commands

```bash
# 1. Create folder
mkdir -p public/gallery

# 2. Download images (see Option 1 above)

# 3. Add projects to database
npx tsx lib/add-gallery-placeholders.ts

# 4. Check the gallery
# Visit: http://localhost:3000/galleri
```

Done! 🎉
