import { SocialTemplate, SocialTemplateLayer } from '../../types';

interface ExportOptions {
  template: SocialTemplate;
  content: {
    image: string | null;
    title: string;
    desc: string;
  };
}

export interface ExportResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  fileName: string;
}

/**
 * Loads an image from URL with CORS support
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin if not already a base64 / blob URL
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      // If anonymous fails, try loading without crossOrigin (might still render on canvas if local)
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = () => reject(new Error(`Không thể tải ảnh: ${src.substring(0, 50)}...`));
      fallbackImg.src = src;
    };
    img.src = src;
  });
}

/**
 * Draws an image with object-fit: cover or contain onto a destination rectangle
 */
function drawImageProp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: 'cover' | 'contain' = 'cover',
  borderRadius: number = 0
) {
  ctx.save();

  // Apply border radius clipping if set
  if (borderRadius > 0) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, borderRadius);
    } else {
      // Fallback manual rounded rectangle
      const r = Math.min(borderRadius, w / 2, h / 2);
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    ctx.clip();
  }

  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  if (fit === 'contain') {
    const ratio = Math.min(w / imgW, h / imgH);
    const nw = imgW * ratio;
    const nh = imgH * ratio;
    const nx = x + (w - nw) / 2;
    const ny = y + (h - nh) / 2;
    ctx.drawImage(img, nx, ny, nw, nh);
  } else {
    // Cover mode (default)
    const ratio = Math.max(w / imgW, h / imgH);
    const nw = imgW * ratio;
    const nh = imgH * ratio;
    const cx = (nw - w) / (2 * ratio);
    const cy = (nh - h) / (2 * ratio);
    const cw = w / ratio;
    const ch = h / ratio;
    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
  }

  ctx.restore();
}

/**
 * Wrap text into lines that fit within max allowed width
 */
function getWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const allLines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      allLines.push('');
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines;
}

/**
 * Render social template and dynamic content to HTML5 Canvas and export as Image
 */
export async function renderTemplateToImage({ template, content }: ExportOptions): Promise<ExportResult> {
  const tplWidth = template.width || 1080;
  const tplHeight = template.height || 1080;

  const canvas = document.createElement('canvas');
  canvas.width = tplWidth;
  canvas.height = tplHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể khởi tạo môi trường vẽ 2D Canvas');
  }

  // 1. Fill base canvas with clean white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, tplWidth, tplHeight);

  // Pre-load images (background frame and main content image)
  let bgImgEl: HTMLImageElement | null = null;
  if (template.bgImage) {
    try {
      bgImgEl = await loadImage(template.bgImage);
    } catch (e) {
      console.warn('Không thể tải ảnh nền khung mẫu:', e);
    }
  }

  let contentImgEl: HTMLImageElement | null = null;
  if (content.image) {
    try {
      contentImgEl = await loadImage(content.image);
    } catch (e) {
      console.warn('Không thể tải ảnh nội dung:', e);
    }
  }

  // 2. Prepare items to draw, sorted by zIndex
  // Template frame overlay is typically at zIndex: 15
  interface DrawItem {
    zIndex: number;
    draw: () => void;
  }

  const drawItems: DrawItem[] = [];

  // Add background overlay frame if present
  if (bgImgEl) {
    drawItems.push({
      zIndex: 15,
      draw: () => {
        ctx.drawImage(bgImgEl!, 0, 0, tplWidth, tplHeight);
      }
    });
  }

  // Add dynamic layers
  for (const layer of template.layers) {
    const absX = (layer.x / 100) * tplWidth;
    const absY = (layer.y / 100) * tplHeight;
    const absW = (layer.width / 100) * tplWidth;
    const absH = (layer.height / 100) * tplHeight;

    if (layer.type === 'image') {
      drawItems.push({
        zIndex: layer.zIndex ?? 1,
        draw: () => {
          if (contentImgEl) {
            drawImageProp(
              ctx,
              contentImgEl,
              absX,
              absY,
              absW,
              absH,
              layer.objectFit || 'cover',
              layer.borderRadius || 0
            );
          } else {
            // Draw placeholder if no content image
            ctx.save();
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(absX, absY, absW, absH);
            ctx.restore();
          }
        }
      });
    } else if (layer.type === 'text') {
      drawItems.push({
        zIndex: layer.zIndex ?? 20,
        draw: () => {
          const fontRatio = tplWidth / 1080;
          const calculatedFontSize = (layer.fontSize || 32) * fontRatio;
          const fontWeight = layer.fontWeight || 'normal';
          
          ctx.save();
          ctx.font = `${fontWeight} ${calculatedFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
          ctx.fillStyle = layer.color || '#000000';
          ctx.textBaseline = 'top';

          const textContent = layer.id.includes('title') 
            ? content.title 
            : layer.id.includes('desc') 
            ? content.desc 
            : (layer.text || '');

          if (!textContent) {
            ctx.restore();
            return;
          }

          const lineHeight = calculatedFontSize * 1.3;
          let lines = getWrappedLines(ctx, textContent, absW);

          if (layer.maxLines && lines.length > layer.maxLines) {
            lines = lines.slice(0, layer.maxLines);
            // Append ellipsis to last line if needed
            let lastLine = lines[lines.length - 1];
            while (ctx.measureText(lastLine + '...').width > absW && lastLine.length > 0) {
              lastLine = lastLine.slice(0, -1).trim();
            }
            lines[lines.length - 1] = lastLine + '...';
          }

          const textAlign = layer.textAlign || 'left';

          lines.forEach((line, index) => {
            const lineY = absY + index * lineHeight;
            let lineX = absX;

            if (textAlign === 'center') {
              lineX = absX + absW / 2;
              ctx.textAlign = 'center';
            } else if (textAlign === 'right') {
              lineX = absX + absW;
              ctx.textAlign = 'right';
            } else {
              lineX = absX;
              ctx.textAlign = 'left';
            }

            ctx.fillText(line, lineX, lineY);
          });

          ctx.restore();
        }
      });
    }
  }

  // Sort by zIndex ascending and draw all
  drawItems.sort((a, b) => a.zIndex - b.zIndex);
  for (const item of drawItems) {
    item.draw();
  }

  // 3. Export to Blob and DataURL
  return new Promise((resolve, reject) => {
    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Lỗi xuất dữ liệu Blob từ Canvas'));
            return;
          }

          const cleanTemplateName = (template.name || 'social_post')
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, '_')
            .substring(0, 30);
          const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
          const fileName = `${cleanTemplateName}_${timestamp}.png`;

          resolve({
            dataUrl,
            blob,
            width: tplWidth,
            height: tplHeight,
            fileName
          });
        },
        'image/png',
        1.0
      );
    } catch (err: any) {
      reject(new Error(err?.message || 'Lỗi xử lý xuất ảnh từ Canvas'));
    }
  });
}
