import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'foam.db');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Create company_info table
db.exec(`
  CREATE TABLE IF NOT EXISTS company_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    org_number TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create projects table for gallery
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    project_type TEXT,
    image_url TEXT,
    before_image_url TEXT,
    after_image_url TEXT,
    area_size REAL,
    completion_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create FAQs table
db.exec(`
  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create contact_submissions table
db.exec(`
  CREATE TABLE IF NOT EXISTS contact_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    project_type TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert initial company information for Intellifoam
const checkCompany = db.prepare('SELECT COUNT(*) as count FROM company_info').get() as { count: number };

if (checkCompany.count === 0) {
  const insertCompany = db.prepare(`
    INSERT INTO company_info
    (company_name, org_number, phone, email, website, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertCompany.run(
    'Intellifoam',
    '', // Add org number when available
    '010 703 74 00',
    'info@intellifoam.se',
    'https://intellifoam.se',
    'Vi erbjuder professionell sprayisolering med fokus på miljövänliga lösningar.'
  );

  console.log('✓ Company information initialized');
}

// Insert sample FAQs (in Swedish)
const checkFaqs = db.prepare('SELECT COUNT(*) as count FROM faqs').get() as { count: number };

if (checkFaqs.count === 0) {
  const insertFaq = db.prepare(`
    INSERT INTO faqs (question, answer, category, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  const faqs = [
    {
      question: 'Vad är sprayisolering?',
      answer: 'Sprayisolering är en modern isoleringslösning där polyuretanskum appliceras genom spray direkt på ytor. Det expanderar och härdar för att skapa en tät, isolerande barriär som både isolerar och tätar samtidigt.',
      category: 'Grundläggande',
      sort_order: 1
    },
    {
      question: 'Vilka typer av sprayskum finns det?',
      answer: 'Det finns två huvudtyper: öppencellsskum (lättare, luftgenomsläppligt) och slutencellsskum (tätare, högre R-värde, fuktbeständigt). Vi hjälper dig välja rätt typ baserat på ditt projekts behov.',
      category: 'Grundläggande',
      sort_order: 2
    },
    {
      question: 'Är sprayisolering miljövänlig?',
      answer: 'Ja! Modern sprayisolering har låga emissioner och följer EU:s REACH-förordning. Den reducerar energiförbrukningen dramatiskt genom överlägsen isolering, vilket minskar koldioxidutsläpp över tid.',
      category: 'Miljö',
      sort_order: 3
    },
    {
      question: 'Hur lång tid tar en installation?',
      answer: 'Det beror på projektets storlek. Ett normalt villatak kan sprayskas på 1-2 dagar, medan större kommersiella projekt kan ta längre tid. Vi ger alltid en tidplan innan projektet startar.',
      category: 'Installation',
      sort_order: 4
    },
    {
      question: 'Vilka certifieringar krävs för sprayisolering i Sverige?',
      answer: 'I Sverige krävs certifiering enligt EU:s REACH-förordning för hantering av diisocyanater. Våra tekniker är fullt certifierade och följer alla Boverkets byggregler (BBR) samt Arbetsmiljöverkets föreskrifter (AFS).',
      category: 'Certifiering',
      sort_order: 5
    },
    {
      question: 'Var kan sprayisolering användas?',
      answer: 'Sprayisolering är mångsidig och kan användas i vindar, källare, krypgrund, väggar, tak, och industribyggnader. Den fungerar utmärkt både i nybyggnation och renovering.',
      category: 'Användning',
      sort_order: 6
    }
  ];

  faqs.forEach(faq => {
    insertFaq.run(faq.question, faq.answer, faq.category, faq.sort_order);
  });

  console.log('✓ FAQs initialized');
}

db.close();
console.log('✓ Database initialized successfully');
