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

    // Set appropriate content type for different image file types
    let contentType = file.type;
    if (!contentType) {
      if (ext === 'svg') contentType = 'image/svg+xml';
      else if (ext === 'webp') contentType = 'image/webp';
      else if (ext === 'png') contentType = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
      else if (ext === 'gif') contentType = 'image/gif';
      else if (ext === 'bmp') contentType = 'image/bmp';
      else if (ext === 'tiff' || ext === 'tif') contentType = 'image/tiff';
      else if (ext === 'ico') contentType = 'image/x-icon';
    }

    // Attempt direct REST upload (more reliable for large files in dev)
    const supabaseUrl = supa.supabaseUrl || window.SUPABASE_URL;
    const supabaseKey = supa.supabaseKey || window.SUPABASE_ANON_KEY;

    let accessToken = supabaseKey;
    try {
      const { data: { session } = {} } = await supa.auth.getSession();
      if (session?.access_token) {
        accessToken = session.access_token;
      }
    } catch {
      // fall back to anon key
    }

    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodedPath}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${accessToken}`,
        'x-upsert': 'true',
        'Content-Type': contentType || 'application/octet-stream',
        'cache-control': '3600'
      },
      body: file
    });

    if (!uploadResponse.ok) {
      // Fall back to SDK upload if REST call fails
      const { error: upErr } = await supa.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType });

      if (upErr) throw upErr;
    }

    const { data } = supa.storage.from(BUCKET).getPublicUrl(path);
    return { publicUrl: data.publicUrl, path };
  }

  function isSvg(url) {
    if (!url) return false;
    const str = String(url).toLowerCase();
    return str.includes('.svg') || str.includes('image/svg+xml');
  }

  function getFileType(url) {
    if (!url) return 'unknown';
    const str = String(url).toLowerCase();
    if (str.includes('.svg') || str.includes('image/svg+xml')) return 'svg';
    if (str.includes('.png')) return 'png';
    if (str.includes('.jpg') || str.includes('.jpeg')) return 'jpg';
    if (str.includes('.gif')) return 'gif';
    if (str.includes('.webp')) return 'webp';
    if (str.includes('.bmp')) return 'bmp';
    if (str.includes('.tiff') || str.includes('.tif')) return 'tiff';
    if (str.includes('.ico')) return 'ico';
    return 'image';
  }

  window.__mediaHelpers = { resolvePreviewUrl, isHeic, objectUrl, uploadToStorage, isSvg, getFileType };
})();