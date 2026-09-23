var XR8OS = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/lib/xr8os.ts
  var xr8os_exports = {};
  __export(xr8os_exports, {
    buildLuminanceImage: () => buildLuminanceImage,
    buildTargetData: () => buildTargetData,
    computeCrop: () => computeCrop,
    loadXR8: () => loadXR8
  });
  var XR8_VERSION = "0.1.0";
  var XR8_URL = `https://cdn.jsdelivr.net/npm/@8thwall/engine@${XR8_VERSION}/dist/xr.js`;
  var xr8Promise = null;
  function loadXR8() {
    const w = window;
    if (w.XR8) return Promise.resolve(w.XR8);
    if (xr8Promise) return xr8Promise;
    xr8Promise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-xr8os]`);
      const onLoaded = () => resolve(window.XR8);
      window.addEventListener("xrloaded", onLoaded, { once: true });
      if (existing) return;
      const s = document.createElement("script");
      s.src = XR8_URL;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.setAttribute("data-preload-chunks", "slam");
      s.setAttribute("data-xr8os", "1");
      s.onerror = () => {
        xr8Promise = null;
        reject(new Error("Kh\xF4ng t\u1EA3i \u0111\u01B0\u1EE3c 8th Wall Engine t\u1EEB CDN. Ki\u1EC3m tra k\u1EBFt n\u1ED1i m\u1EA1ng."));
      };
      document.head.appendChild(s);
      const poll = window.setInterval(() => {
        if (window.XR8) {
          window.clearInterval(poll);
          resolve(window.XR8);
        }
      }, 200);
      window.setTimeout(() => window.clearInterval(poll), 6e4);
    });
    return xr8Promise;
  }
  function computeCrop(width, height, align = "center") {
    const pos = (space, size) => align === "start" ? 0 : align === "end" ? space - size : Math.round((space - size) / 2);
    if (width / 3 > height / 4) {
      const cw = Math.round(height * 3 / 4);
      return { left: pos(width, cw), top: 0, width: cw, height, isRotated: false, originalWidth: width, originalHeight: height };
    }
    const ch = Math.round(width * 4 / 3);
    return { left: 0, top: pos(height, ch), width, height: ch, isRotated: false, originalWidth: width, originalHeight: height };
  }
  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = typeof source === "string" ? source : URL.createObjectURL(source);
      if (typeof source === "string" && !url.startsWith("blob:") && !url.startsWith("data:")) img.crossOrigin = "anonymous";
      img.onload = () => {
        if (typeof source !== "string") URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        if (typeof source !== "string") URL.revokeObjectURL(url);
        reject(new Error("Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c \u1EA3nh target (c\xF3 th\u1EC3 b\u1ECB ch\u1EB7n CORS)."));
      };
      img.src = url;
    });
  }
  async function buildLuminanceImage(source, align = "center") {
    const img = await loadImage(source);
    const W = img.naturalWidth, H = img.naturalHeight;
    const crop = computeCrop(W, H, align);
    const outH = 640, outW = Math.round(crop.width / crop.height * outH);
    const c = document.createElement("canvas");
    c.width = outW;
    c.height = outH;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, crop.left, crop.top, crop.width, crop.height, 0, 0, outW, outH);
    const data = ctx.getImageData(0, 0, outW, outH);
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = y;
    }
    ctx.putImageData(data, 0, 0);
    const blob = await new Promise((res, rej) => c.toBlob((b) => b ? res(b) : rej(new Error("Kh\xF4ng xu\u1EA5t \u0111\u01B0\u1EE3c \u1EA3nh x\xE1m")), "image/jpeg", 0.92));
    return { blob, crop, previewUrl: c.toDataURL("image/jpeg", 0.6) };
  }
  function buildTargetData(name, luminanceUrl, crop) {
    const safe = (name || "target").replace(/[^a-zA-Z0-9_-]+/g, "_");
    return {
      type: "PLANAR",
      properties: crop,
      imagePath: luminanceUrl,
      metadata: null,
      name: safe,
      resources: {
        originalImage: `${safe}_original.jpg`,
        croppedImage: `${safe}_cropped.jpg`,
        thumbnailImage: `${safe}_thumbnail.jpg`,
        luminanceImage: `${safe}_luminance.jpg`
      },
      created: Date.now(),
      updated: Date.now()
    };
  }
  return __toCommonJS(xr8os_exports);
})();
