/**
 * Add placeholder gallery projects with Unsplash images
 * Run with: npx tsx lib/add-gallery-placeholders.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'foam.db');
const db = new Database(dbPath);

// Sample projects with Unsplash image references
const placeholderProjects = [
  {
    title: 'Vindisolering - Villa i Gävle',
    description: 'Slutencellsskum för komplett isolering av vind i 120-årigt hus. 200mm isolering gav U-värde 0.12 W/(m²·K).',
    location: 'Gävle',
    project_type: 'Vind/Tak',
    image_url: '/gallery/spray-foam-attic.jpg',
    area_size: 85,
    completion_date: '2025-11'
  },
  {
    title: 'Före och Efter - Vindisolering',
    description: 'Dramatisk förbättring av energieffektivitet. Från oisolerad vind till professionell spray foam isolering.',
    location: 'Stockholm',
    project_type: 'Vind/Tak',
    image_url: '/gallery/before-after-insulation.jpg',
    area_size: 95,
    completion_date: '2025-10'
  },
  {
    title: 'Ytterväggar - Nybyggnation',
    description: 'Flash-and-batt teknik: 50mm slutencellsskum + 100mm öppencellsskum för optimal isolering och lufttäthet.',
    location: 'Uppsala',
    project_type: 'Yttervägg',
    image_url: '/gallery/wall-insulation.jpg',
    area_size: 120,
    completion_date: '2025-12'
  },
  {
    title: 'Takisolering - Kommersiell byggnad',
    description: 'Storskalig takisolering med slutencellsskum. Fungerar även som ångspärr och vindtätning.',
    location: 'Sandviken',
    project_type: 'Tak',
    image_url: '/gallery/roof-spray.jpg',
    area_size: 250,
    completion_date: '2025-09'
  },
  {
    title: 'Lantbruksbyggnad - Isolering',
    description: 'Kostnadseffektiv isolering av lantbruksbyggnad med öppencellsskum. Utmärkt ljuddämpning och isolering.',
    location: 'Dalarna',
    project_type: 'Lantbruk',
    image_url: '/gallery/barn-insulation.jpg',
    area_size: 180,
    completion_date: '2025-08'
  },
  {
    title: 'Källarisolering - Radonskydd',
    description: 'Slutencellsskum mot fukt och radon. Perfekt tätning mot mark och utmärkt isolering.',
    location: 'Falun',
    project_type: 'Källare/Grund',
    image_url: '/gallery/basement-foam.jpg',
    area_size: 65,
    completion_date: '2025-11'
  },
  {
    title: 'Professionell applicering',
    description: 'Våra certifierade tekniker använder modern utrustning för jämn och effektiv applicering.',
    location: 'Gävle',
    project_type: 'Process',
    image_url: '/gallery/professional-spray.jpg',
    area_size: 75,
    completion_date: '2026-01'
  },
  {
    title: 'Träväggar - Renovering',
    description: 'Isolering mellan träreglar med öppencellsskum. Fyller alla hålrum perfekt.',
    location: 'Söderhamn',
    project_type: 'Renovering',
    image_url: '/gallery/wooden-wall.jpg',
    area_size: 55,
    completion_date: '2025-10'
  }
];

try {
  console.log('Adding placeholder gallery projects...\n');

  const insertProject = db.prepare(`
    INSERT INTO projects (
      title, description, location, project_type,
      image_url, area_size, completion_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((projects) => {
    for (const project of projects) {
      insertProject.run(
        project.title,
        project.description,
        project.location,
        project.project_type,
        project.image_url,
        project.area_size,
        project.completion_date
      );
      console.log(`✓ Added: ${project.title}`);
    }
  });

  insertMany(placeholderProjects);

  console.log(`\n✅ Successfully added ${placeholderProjects.length} placeholder projects!`);
  console.log('\n📸 Next steps:');
  console.log('1. Download images from Unsplash (see IMAGE_DOWNLOAD_GUIDE.md)');
  console.log('2. Place images in /public/gallery/ folder');
  console.log('3. Visit http://localhost:3000/galleri to see the gallery\n');

} catch (error) {
  console.error('❌ Error adding projects:', error);
} finally {
  db.close();
}
