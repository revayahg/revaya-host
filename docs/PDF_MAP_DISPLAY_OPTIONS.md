# PDF Map Display Options Analysis

## Current Implementation
- **Map Component:** `EventMap.js` and `VendorEventMap.js`
- **Current Format:** Image URL (`events.event_map` stores image URL)
- **Features:** Zoom, pan, drag, pin placement
- **Storage:** Supabase Storage or external URL

## Option 1: Direct PDF Display with PDF.js

### Implementation
- Use Mozilla's PDF.js library to render PDF directly in browser
- Render PDF pages as canvas elements
- Overlay pins on top of PDF canvas

### Pros
- ✅ No conversion needed - PDF remains original quality
- ✅ Supports vector graphics (better quality at any zoom)
- ✅ Client-side only (no server processing)
- ✅ Works with existing pin overlay system
- ✅ Maintains PDF formatting/text

### Cons
- ❌ Larger file sizes (PDFs typically 500KB-5MB vs images 100KB-1MB)
- ❌ Slower initial load (need to parse PDF)
- ❌ Multi-page PDFs need navigation UI
- ❌ More complex implementation
- ❌ Potential security concerns (PDF.js can execute JavaScript in PDFs)

### Technical Requirements
```javascript
// Install PDF.js
npm install pdfjs-dist

// Example usage
import * as pdfjsLib from 'pdfjs-dist';

const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
const page = await pdf.getPage(1); // First page
const viewport = page.getViewport({ scale: 1.5 });
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');
canvas.height = viewport.height;
canvas.width = viewport.width;
await page.render({ canvasContext: context, viewport: viewport }).promise;
```

### File Size Impact
- **Current:** ~100KB per image map
- **PDF:** ~500KB-2MB per PDF map
- **Storage Cost:** 5-20x increase per event

### Implementation Complexity
- **Low-Medium:** Requires PDF.js integration
- **Time Estimate:** 4-6 hours

---

## Option 2: Server-Side PDF to Image Conversion

### Implementation
- Create Edge Function to convert PDF first page to image (PNG/JPG)
- Client uploads PDF → Server converts → Stores image
- Map component uses converted image (no code changes needed)

### Pros
- ✅ No frontend changes needed (uses existing image display)
- ✅ Smaller file sizes for display (converted image < PDF)
- ✅ Better performance (images load faster)
- ✅ Keeps original PDF for download/viewing
- ✅ Can handle multi-page PDFs (select page 1)

### Cons
- ❌ Server-side processing (Edge Function execution time)
- ❌ Conversion delay (user waits for conversion)
- ❌ Potential quality loss (vector → raster)
- ❌ Additional storage (need both PDF and image)
- ❌ Cost: Edge Function invocations (~$0.01 per conversion)

### Technical Requirements
```typescript
// Edge Function: convert-pdf-to-image
import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import pdf from 'npm:pdf-poppler@^0.2.1';

Deno.serve(async (req) => {
  const { pdfUrl, eventId } = await req.json();
  
  // Download PDF from storage
  const pdfBuffer = await fetch(pdfUrl).then(r => r.arrayBuffer());
  
  // Convert first page to PNG
  const options = {
    format: 'png',
    out_dir: '/tmp',
    page: 1
  };
  const [imagePath] = await pdf.convert(pdfBuffer, options);
  
  // Upload image back to storage
  // Return image URL
});
```

### Libraries Available
- **pdf-poppler** (Node.js, works in Deno)
- **pdf2pic** (Node.js)
- **ImageMagick** (via shell command, not ideal)
- **pdf-lib + canvas** (complex, but full control)

### File Size Impact
- **Storage:** PDF (500KB) + Image (200KB) = 700KB per event
- **Cost:** Minimal increase, but need Edge Function quota

### Implementation Complexity
- **Medium:** Requires Edge Function + PDF library
- **Time Estimate:** 6-8 hours

---

## Option 3: Client-Side PDF to Image Conversion

### Implementation
- Use PDF.js in browser to render first page to canvas
- Convert canvas to blob/image
- Upload both PDF and image

### Pros
- ✅ No server processing (faster, no cost)
- ✅ Client control over quality/settings
- ✅ Can preview before upload
- ✅ Works offline for conversion

### Cons
- ❌ Client device performance varies
- ❌ Larger JavaScript bundle (PDF.js ~500KB)
- ❌ Mobile devices may struggle
- ❌ Still need to store both PDF and image

### Technical Requirements
```javascript
// In upload component
import * as pdfjsLib from 'pdfjs-dist';

async function convertPdfToImage(pdfFile) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  await page.render({ canvasContext: context, viewport: viewport }).promise;
  
  // Convert canvas to blob
  return new Promise(resolve => {
    canvas.toBlob(resolve, 'image/png', 0.95);
  });
}
```

### File Size Impact
- **Bundle:** +500KB (PDF.js library)
- **Storage:** Same as Option 2 (PDF + image)

### Implementation Complexity
- **Medium:** Client-side PDF processing
- **Time Estimate:** 4-6 hours

---

## Option 4: Hybrid - PDF Viewer with Optional Conversion

### Implementation
- Detect if map is PDF or image
- If PDF: Use PDF.js viewer
- If image: Use existing image display
- Option to convert PDF to image for better performance

### Pros
- ✅ Flexible - supports both formats
- ✅ User choice (convert for speed or keep PDF for quality)
- ✅ Backward compatible (existing image maps still work)
- ✅ Can upgrade images to PDFs later

### Cons
- ❌ More code to maintain (two rendering paths)
- ❌ Larger bundle size (PDF.js only loaded when needed)
- ❌ More complex logic

### Implementation
```javascript
function EventMap({ imageUrl, pdfUrl, eventId, ... }) {
  const [mapType, setMapType] = React.useState(null);
  
  React.useEffect(() => {
    if (pdfUrl) {
      setMapType('pdf');
      // Load PDF.js dynamically
      loadPDFLibrary();
    } else if (imageUrl) {
      setMapType('image');
    }
  }, [pdfUrl, imageUrl]);
  
  if (mapType === 'pdf') {
    return <PDFMapViewer pdfUrl={pdfUrl} ... />;
  } else {
    return <ImageMapViewer imageUrl={imageUrl} ... />;
  }
}
```

### Implementation Complexity
- **Medium-High:** Two rendering paths + dynamic loading
- **Time Estimate:** 8-10 hours

---

## Option 5: Pre-Convert PDFs Before Upload

### Implementation
- Client converts PDF to image before uploading
- User uploads PDF → Component converts → Uploads image only
- Store original PDF separately (optional, for download)

### Pros
- ✅ Simplest implementation (no server code)
- ✅ Fast display (image only)
- ✅ User sees preview before upload
- ✅ Can choose quality/resolution

### Cons
- ❌ Requires client-side PDF.js
- ❌ May lose original PDF (unless stored separately)
- ❌ Client device dependent

### Implementation Complexity
- **Low-Medium:** Similar to Option 3 but simpler workflow
- **Time Estimate:** 3-5 hours

---

## Comparison Table

| Option | Complexity | Performance | File Size | Cost | Quality | Implementation Time |
|--------|-----------|-------------|-----------|------|---------|---------------------|
| **1. PDF.js Direct** | Medium | Slow initial load | Large (PDF only) | Low | Best (vector) | 4-6 hours |
| **2. Server Convert** | Medium | Fast (pre-converted) | Medium (PDF + image) | Medium | Good (raster) | 6-8 hours |
| **3. Client Convert** | Medium | Fast (after conversion) | Medium (PDF + image) | Low | Good (raster) | 4-6 hours |
| **4. Hybrid** | High | Depends on format | Medium-Large | Low-Medium | Best (both) | 8-10 hours |
| **5. Pre-Convert** | Low-Medium | Fast | Small (image only) | Low | Good (raster) | 3-5 hours |

---

## Recommendation

### For Your Use Case (Single-page event floor plan PDFs):

**Best Option: Option 2 (Server-Side Conversion)**

**Reasons:**
1. ✅ **No frontend changes** - Your existing EventMap component works as-is
2. ✅ **Best performance** - Images load instantly
3. ✅ **Keeps original PDF** - Can download/view full PDF if needed
4. ✅ **Handles edge cases** - Server can handle large/complex PDFs better
5. ✅ **User experience** - Upload PDF, automatic conversion, ready to use

**Alternative: Option 5 (Pre-Convert on Upload)**
- If you want to avoid server processing costs
- Simpler implementation
- User sees preview immediately
- Still maintains original PDF in separate storage

### Implementation Plan for Option 2:

1. **Update Upload Component:**
   - Allow PDF upload (in addition to images)
   - Show "Converting..." status
   - Call conversion Edge Function

2. **Create Edge Function:**
   - `convert-pdf-to-map-image`
   - Downloads PDF from storage
   - Converts first page to PNG (high quality, ~2x scale)
   - Uploads image back to storage
   - Returns image URL

3. **Update Database:**
   - Add `event_map_pdf` field (optional, stores original PDF URL)
   - Keep `event_map` field (stores converted image URL)

4. **Storage:**
   - PDFs in `event-map-pdfs` bucket
   - Images in existing storage (or `event-maps` bucket)

---

## Security Considerations

### PDF.js Security
- PDFs can contain JavaScript (potential XSS)
- PDF.js sandboxes execution by default
- Should sanitize PDFs or use restricted viewer mode

### File Validation
- Verify PDF is valid (not corrupted)
- Check file size limits (10MB max recommended)
- Validate it's actually a PDF (check magic bytes)

### Storage Security
- Apply same RLS policies as current map images
- Only event owners/editors can upload
- Viewers can view only

---

## Cost Analysis

### Current (Image Maps)
- Storage: ~$0.023 per GB/month
- Per event: ~100KB = $0.0000023/month

### Option 1 (PDF Direct)
- Storage: ~500KB per event = $0.000012/month (5x increase)
- No processing cost

### Option 2 (Server Convert)
- Storage: PDF (500KB) + Image (200KB) = $0.000016/month (7x increase)
- Edge Function: ~$0.01 per conversion (one-time)
- Total per event: ~$0.010016 (one-time) + $0.000016/month

### Option 3 (Client Convert)
- Storage: Same as Option 2
- Bundle size: +500KB (PDF.js) = minimal CDN cost increase
- No processing cost

---

## Next Steps

1. **Decide on approach** (recommend Option 2 or 5)
2. **Create Edge Function** (if Option 2)
3. **Update upload component** to accept PDFs
4. **Test with client's PDF** (verify quality/conversion)
5. **Add download option** (view original PDF)

Would you like me to implement one of these options?

