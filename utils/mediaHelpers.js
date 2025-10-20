;(function () {
  const BUCKET = 'event-images';

  function getSupabase() {
    const s = window.supabaseClient || window.supabase;
    if (!s) throw new Error('Supabase client not found on window.');
    return s;
  }

  async function resolvePreviewUrl(value, eventId, field) {
    if (!value) return null;
    const str = String(value);

    // already previewable
    if (str.startsWith('data:')) return str;
    if (/^https?:\/\//i.test(str)) return str;

    // dead, ephemeral; treat as missing
    if (str.startsWith('blob:')) return null;

    // looks like a storage path (e.g. events/<id>/logo.jpg)
    try {
      const supa = getSupabase();
      const path = str.includes('/') ? str : `events/${eventId}/${field}.${str}`;
      const { data } = supa.storage.from(BUCKET).getPublicUrl(path);
      return data?.publicUrl || null;
    } catch {
      return null;
    }
  }

  function isHeic(file) {
    if (!file) return false;
    const n = (file.name || '').toLowerCase();
    const t = (file.type || '').toLowerCase();
    return n.endsWith('.heic') || n.endsWith('.heif') || t.includes('heic') || t.includes('heif');
  }

  function objectUrl(file) {
    try { return URL.createObjectURL(file); } catch { return null; }
  }

  async function uploadToStorage(eventId, field, file) {
    const supa = getSupabase();
    const name = (file.name || '').toLowerCase();
    const ext = name.includes('.') ? name.split('.').pop() : 'jpg';
    const path = `events/${eventId}/${field}.${ext}`;

    const { error: upErr } = await supa.storage
      .from(BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || undefined });

    if (upErr) throw upErr;

    const { data } = supa.storage.from(BUCKET).getPublicUrl(path);
    return { publicUrl: data.publicUrl, path };
  }

  window.__mediaHelpers = { resolvePreviewUrl, isHeic, objectUrl, uploadToStorage };
})();