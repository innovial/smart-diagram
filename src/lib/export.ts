export interface ExportPngOptions {
  scale?: number;
  backgroundColor?: string;
}

export function prepareSvgForRaster(svgInput: string): { svg: string; width: number; height: number } {
  let svg = svgInput.trim();

  // 1. Ensure xmlns is present
  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // 2. Extract dimensions from viewBox
  let width = 800;
  let height = 600;

  const viewBoxMatch = svg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i);
  if (viewBoxMatch) {
    const vbW = parseFloat(viewBoxMatch[3]);
    const vbH = parseFloat(viewBoxMatch[4]);
    if (vbW > 0 && vbH > 0) {
      width = Math.round(vbW);
      height = Math.round(vbH);
    }
  } else {
    // Try width & height attributes
    const wMatch = svg.match(/\bwidth=["']\s*([-\d.]+)(?:px)?\s*["']/i);
    const hMatch = svg.match(/\bheight=["']\s*([-\d.]+)(?:px)?\s*["']/i);
    if (wMatch && parseFloat(wMatch[1]) > 0) width = Math.round(parseFloat(wMatch[1]));
    if (hMatch && parseFloat(hMatch[1]) > 0) height = Math.round(parseFloat(hMatch[1]));
  }

  // 3. Replace percentage widths/heights (e.g. width="100%") with fixed numerical dimensions
  // Many SVG renderers (and HTML Image elements) cannot resolve percentage lengths without a parent frame
  svg = svg.replace(/<svg\b([^>]*)>/i, (_match, attrs: string) => {
    let cleanAttrs = attrs
      .replace(/\bwidth=["'][^"']*["']/gi, '')
      .replace(/\bheight=["'][^"']*["']/gi, '')
      .trim();

    return `<svg width="${width}" height="${height}" ${cleanAttrs}>`;
  });

  return { svg, width, height };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 500);
}

export function downloadText(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  downloadBlob(blob, filename);
}

export async function svgToPngBlob(
  svgElementOrString: SVGElement | string,
  options: ExportPngOptions = {}
): Promise<Blob> {
  const scale = options.scale ?? 2;
  const bgColor = options.backgroundColor;

  let rawSvg = '';
  if (typeof svgElementOrString === 'string') {
    rawSvg = svgElementOrString;
  } else {
    rawSvg = new XMLSerializer().serializeToString(svgElementOrString);
  }

  if (!rawSvg || !rawSvg.trim()) {
    throw new Error('Cannot export empty SVG content');
  }

  const { svg: preparedSvg, width, height } = prepareSvgForRaster(rawSvg);

  // Encode safely as base64 Data URI to prevent blob CORS issues in WebKit/Chromium
  let dataUrl = '';
  try {
    const base64 = btoa(unescape(encodeURIComponent(preparedSvg)));
    dataUrl = `data:image/svg+xml;base64,${base64}`;
  } catch {
    dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(preparedSvg)}`;
  }

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();

    // IMPORTANT: Do NOT set img.crossOrigin for data: or blob: URIs
    // Setting crossOrigin triggers opaque CORS checks and causes WebKit/Chromium to fail or taint canvas

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create 2D canvas rendering context'));
          return;
        }

        // Apply background if selected
        if (bgColor && bgColor !== 'transparent') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate PNG image blob from canvas'));
          }
        }, 'image/png');
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load SVG into raster image element. Verify diagram syntax is valid.'));
    };

    img.src = dataUrl;
  });
}

export async function copyPngToClipboard(
  svgElementOrString: SVGElement | string,
  options: ExportPngOptions = {}
): Promise<boolean> {
  try {
    const blob = await svgToPngBlob(svgElementOrString, options);
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      return false;
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);
    return true;
  } catch (err) {
    console.error('Copy PNG to clipboard failed:', err);
    return false;
  }
}
