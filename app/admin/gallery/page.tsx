'use client';

import { useState, useEffect } from 'react';

interface Project {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  project_type: string | null;
  image_url: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  area_size: number | null;
  completion_date: string | null;
}

// Client-side "basic optimization": resize to max 1600px, mild brightness/
// contrast/saturation, and compress to JPEG for the web.
function optimizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kunde inte läsa filen'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Kunde inte läsa bilden'));
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas stöds inte'));
        ctx.filter = 'brightness(1.08) contrast(1.08) saturate(1.05)';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminGalleryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [projectType, setProjectType] = useState('');
  const [description, setDescription] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [completionDate, setCompletionDate] = useState('');
  const [beforeUrl, setBeforeUrl] = useState('');
  const [afterUrl, setAfterUrl] = useState('');
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/admin/gallery');
      if (res.ok) setProjects((await res.json()).projects || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleFile = async (
    file: File | undefined,
    setUrl: (u: string) => void,
    setUploading: (b: boolean) => void
  ) => {
    if (!file) return;
    setUploading(true);
    setMessage('');
    try {
      const dataUrl = await optimizeImage(file);
      const res = await fetch('/api/admin/gallery/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl }),
      });
      const data = await res.json();
      if (res.ok) setUrl(data.url);
      else setMessage(`Fel vid uppladdning: ${data.error}`);
    } catch {
      setMessage('Kunde inte optimera/ladda upp bilden');
    }
    setUploading(false);
  };

  const resetForm = () => {
    setTitle(''); setLocation(''); setProjectType(''); setDescription('');
    setAreaSize(''); setCompletionDate(''); setBeforeUrl(''); setAfterUrl('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setMessage('Titel krävs'); return; }
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, location, project_type: projectType, description,
          area_size: areaSize || null, completion_date: completionDate || null,
          before_image_url: beforeUrl || null,
          after_image_url: afterUrl || null,
          image_url: afterUrl || beforeUrl || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Projekt publicerat i galleriet!');
        resetForm();
        fetchProjects();
      } else {
        setMessage(`Fel: ${data.error}`);
      }
    } catch {
      setMessage('Serverfel');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Ta bort detta projekt från galleriet?')) return;
    const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProjects();
  };

  const uploadBox = (
    label: string, url: string, uploading: boolean,
    setUrl: (u: string) => void, setUploading: (b: boolean) => void
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="w-full h-40 object-cover rounded-lg mb-2 border border-gray-200" />
      )}
      <input
        type="file" accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0], setUrl, setUploading)}
        className="block w-full text-sm text-gray-700"
      />
      {uploading && <p className="text-sm text-gray-700 mt-1">Optimerar och laddar upp…</p>}
    </div>
  );

  return (
    <div className="py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Galleri</h1>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 mb-6">{message}</div>
        )}

        {/* Add form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Nytt projekt</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Titel *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Krypgrund villa, Vendelsö"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Plats</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Vendelsö"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Typ</label>
              <input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="Krypgrund / Vind / Villa"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Yta (m²)</label>
              <input type="number" value={areaSize} onChange={(e) => setAreaSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Datum</label>
              <input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-800 mb-1">Beskrivning</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="Tilläggsisolering av krypgrund med sprutskum…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {uploadBox('Före-bild', beforeUrl, uploadingBefore, setBeforeUrl, setUploadingBefore)}
            {uploadBox('Efter-bild', afterUrl, uploadingAfter, setAfterUrl, setUploadingAfter)}
          </div>
          <button onClick={handleSubmit} disabled={saving || uploadingBefore || uploadingAfter}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400">
            {saving ? 'Publicerar…' : 'Publicera i galleriet'}
          </button>
          <p className="text-sm text-gray-700 mt-2">Bilder optimeras automatiskt (storlek, ljus/kontrast, komprimering) innan de laddas upp.</p>
        </div>

        {/* Existing projects */}
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Publicerade projekt ({projects.length})</h2>
        {loading ? (
          <p className="text-gray-700">Laddar…</p>
        ) : projects.length === 0 ? (
          <p className="text-gray-700">Inga projekt publicerade ännu.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {(p.after_image_url || p.image_url) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(p.after_image_url || p.image_url) as string} alt={p.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-800">{p.title}</h3>
                  {p.location && <p className="text-sm text-gray-700">📍 {p.location}</p>}
                  <button onClick={() => handleDelete(p.id)}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium">Ta bort</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
