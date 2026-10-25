export interface ExportPngOptions {
  scale?: number;
  backgroundColor?: string;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  downloadBlob(blob, filename);
}

export async function svgToPngBlob(svgElementOrString: SVGElement | string, options: ExportPngOptions = {}): Promise<Blob> {
  const scale = options.scale ?? 2;
  const bgColor = options.backgroundColor;

  let svgString = '';
  if (typeof svgElementOrString === 'string') {
    svgString = svgElementOrString;
  } else {
    svgString = new XMLSerializer().serializeToString(svgElementOrString);
  }

  // Ensure xmlns is present
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = img.naturalWidth || 800;
        const height = img.naturalHeight || 600;

        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to get 2D canvas context'));
          return;
        }

        if (bgColor && bgColor !== 'transparent') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob conversion failed'));
          }
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG into image element'));
    };

    img.src = url;
  });
}

export async function copyPngToClipboard(svgElementOrString: SVGElement | string, options: ExportPngOptions = {}): Promise<boolean> {
  try {
    const blob = await svgToPngBlob(svgElementOrString, options);
    if (!navigator.clipboard || !window.ClipboardItem) {
      return false;
    }
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ]);
    return true;
  } catch {
    return false;
  }
}
