// Bộ lọc HTML dùng chung cho mọi chỗ hiển thị nội dung do người dùng nhập.
// Nội dung bài viết, dự án và khóa học được lưu dưới dạng HTML rồi đổ thẳng vào
// dangerouslySetInnerHTML. Nếu không lọc, một dòng script chèn vào cơ sở dữ liệu
// sẽ chạy trong trình duyệt của mọi khách truy cập, đây là lỗ hổng XSS lưu trữ.
// File này không dùng thư viện ngoài để tránh thay đổi package-lock của dự án.

const ALLOWED_TAGS = new Set([
  'A', 'ABBR', 'B', 'BLOCKQUOTE', 'BR', 'CAPTION', 'CODE', 'DD', 'DIV', 'DL', 'DT',
  'EM', 'FIGCAPTION', 'FIGURE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I',
  'IMG', 'LI', 'MARK', 'OL', 'P', 'PRE', 'S', 'SMALL', 'SPAN', 'STRONG', 'SUB',
  'SUP', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'U', 'UL'
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title', 'target', 'rel']),
  IMG: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan', 'scope'])
};

const GLOBAL_ATTRS = new Set(['class', 'style', 'dir']);

const SAFE_LINK_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];
const SAFE_MEDIA_SCHEMES = ['http:', 'https:'];

// Chỉ chấp nhận vài thuộc tính style vô hại, chặn url() và expression() vốn hay bị lợi dụng.
const SAFE_STYLE_PROPS = new Set([
  'color', 'background-color', 'font-weight', 'font-style', 'font-size',
  'text-align', 'text-decoration', 'margin', 'padding', 'width', 'height'
]);

const resolveUrl = (value: string): URL | null => {
  try {
    const base = typeof window !== 'undefined' ? window.location.href : 'https://localhost/';
    return new URL(value.trim(), base);
  } catch (e) {
    return null;
  }
};

export const isSafeUrl = (value: string | null | undefined, allowData = false): boolean => {
  if (!value) return false;
  const raw = value.trim();
  if (!raw) return false;
  if (allowData && /^data:(image\/(png|jpe?g|gif|webp|svg\+xml)|application\/pdf);/i.test(raw)) {
    return true;
  }
  const url = resolveUrl(raw);
  if (!url) return false;
  return SAFE_MEDIA_SCHEMES.includes(url.protocol);
};

const isSafeLink = (value: string): boolean => {
  const url = resolveUrl(value);
  if (!url) return false;
  return SAFE_LINK_SCHEMES.includes(url.protocol);
};

const sanitizeStyle = (value: string): string => {
  return value
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => {
      const [prop, ...rest] = part.split(':');
      const val = rest.join(':').toLowerCase();
      if (!prop || !val) return false;
      if (!SAFE_STYLE_PROPS.has(prop.trim().toLowerCase())) return false;
      return !val.includes('url(') && !val.includes('expression(') && !val.includes('javascript:');
    })
    .join('; ');
};

/**
 * Trả về chuỗi HTML đã được lọc, chỉ giữ lại các thẻ và thuộc tính an toàn.
 * Mọi thẻ script, iframe, object, embed, form cùng toàn bộ thuộc tính sự kiện
 * dạng onclick, onerror đều bị loại bỏ.
 */
export const sanitizeHtml = (dirty: string | null | undefined): string => {
  if (!dirty) return '';
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    // Môi trường không có DOM thì trả về chuỗi rỗng còn hơn trả về HTML chưa lọc.
    return '';
  }

  const doc = new DOMParser().parseFromString(`<body>${dirty}</body>`, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const doomed: Element[] = [];

  let node = walker.nextNode() as Element | null;
  while (node) {
    if (!ALLOWED_TAGS.has(node.tagName)) {
      doomed.push(node);
    } else {
      const allowedForTag = ALLOWED_ATTRS[node.tagName];
      for (const attr of Array.from(node.attributes)) {
        const name = attr.name.toLowerCase();
        const value = attr.value;

        const permitted = GLOBAL_ATTRS.has(name) || (allowedForTag ? allowedForTag.has(name) : false);
        if (!permitted) {
          node.removeAttribute(attr.name);
          continue;
        }

        if (name === 'style') {
          const cleanStyle = sanitizeStyle(value);
          if (cleanStyle) {
            node.setAttribute('style', cleanStyle);
          } else {
            node.removeAttribute('style');
          }
          continue;
        }

        if (name === 'href' && !isSafeLink(value)) {
          node.removeAttribute('href');
          continue;
        }

        if (name === 'src' && !isSafeUrl(value, true)) {
          node.removeAttribute('src');
          continue;
        }
      }

      if (node.tagName === 'A') {
        // Chặn tab-nabbing khi mở liên kết ra cửa sổ mới.
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    }
    node = walker.nextNode() as Element | null;
  }

  const DROP_ENTIRELY = new Set([
    'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE',
    'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'AUDIO', 'VIDEO', 'SOURCE',
    'SVG', 'MATH', 'TEMPLATE', 'NOSCRIPT'
  ]);

  // Thẻ nguy hiểm thì xóa cả nội dung, thẻ lạ nhưng vô hại thì chỉ bóc vỏ
  // và giữ nguyên phần bên trong để bài viết không bị mất chữ.
  doomed.forEach(el => {
    if (DROP_ENTIRELY.has(el.tagName)) {
      el.remove();
      return;
    }
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  });

  return doc.body.innerHTML;
};

export default sanitizeHtml;
