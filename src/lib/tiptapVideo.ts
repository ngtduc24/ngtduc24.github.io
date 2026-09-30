import { Node, mergeAttributes } from '@tiptap/core';

// Chèn video vào nội dung soạn thảo (bài tập, bài giảng).
// Video tải lên hoặc chọn từ thư viện (Cloudinary, .mp4...) hiện bằng thẻ <video>.
// Link YouTube, Vimeo, Google Drive đổi sang link nhúng và hiện bằng khung <iframe>.

export type VideoSource = { kind: 'file' | 'embed'; src: string };

export function toVideoSource(raw: string): VideoSource | null {
  const s = (raw || '').trim();
  if (!s) return null;
  let u: URL;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : 'https://' + s); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\.|^m\./, '');
  // YouTube: watch?v=, youtu.be/, shorts/, embed/
  let yt = '';
  if (host === 'youtu.be') yt = u.pathname.slice(1).split('/')[0];
  else if (host.endsWith('youtube.com')) yt = u.searchParams.get('v') || (u.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/) || [])[2] || '';
  if (yt && /^[A-Za-z0-9_-]{6,20}$/.test(yt)) {
    const t = u.searchParams.get('t') || u.searchParams.get('start');
    const start = t ? parseInt(t, 10) : 0;
    return { kind: 'embed', src: `https://www.youtube.com/embed/${yt}${start > 0 ? `?start=${start}` : ''}` };
  }
  // Vimeo
  const vm = host.endsWith('vimeo.com') ? (u.pathname.match(/(\d{6,})/) || [])[1] : '';
  if (vm) return { kind: 'embed', src: `https://player.vimeo.com/video/${vm}` };
  // Google Drive
  if (host === 'drive.google.com') {
    const id = (u.pathname.match(/\/file\/d\/([^/]+)/) || [])[1] || u.searchParams.get('id') || '';
    if (id) return { kind: 'embed', src: `https://drive.google.com/file/d/${id}/preview` };
  }
  // Tệp video trực tiếp
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(u.pathname) || /res\.cloudinary\.com\/.+\/video\/upload\//.test(u.href)) {
    return { kind: 'file', src: u.href };
  }
  return null;
}

// Chỉ các nguồn nhúng này được giữ lại khi hiển thị (xem sanitizeHtml.ts).
export const VIDEO_EMBED_HOSTS = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com', 'drive.google.com'];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    eduVideo: { insertVideo: (source: VideoSource) => ReturnType };
  }
}

export const VideoNode = Node.create({
  name: 'eduVideo',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      kind: { default: 'file' },
    };
  },
  parseHTML() {
    return [
      { tag: 'div[data-video-embed]', getAttrs: el => ({ kind: 'embed', src: (el as HTMLElement).querySelector('iframe')?.getAttribute('src') || null }) },
      { tag: 'iframe[src]', getAttrs: el => ({ kind: 'embed', src: (el as HTMLElement).getAttribute('src') }) },
      { tag: 'video', getAttrs: el => ({ kind: 'file', src: (el as HTMLElement).getAttribute('src') || (el as HTMLElement).querySelector('source')?.getAttribute('src') || null }) },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { src, kind } = HTMLAttributes as { src: string; kind: string };
    if (kind === 'embed') {
      return ['div', { 'data-video-embed': '', class: 'edu-video-embed' },
        ['iframe', { src, frameborder: '0', allowfullscreen: 'true', allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen', loading: 'lazy' }]];
    }
    return ['video', mergeAttributes({ src, controls: 'true', preload: 'metadata', playsinline: 'true', class: 'edu-video' })];
  },
  addCommands() {
    return {
      insertVideo: (source: VideoSource) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { src: source.src, kind: source.kind } }),
    };
  },
});
