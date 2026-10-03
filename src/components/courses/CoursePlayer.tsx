import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume1, Volume2, VolumeX, Maximize, Minimize, Loader2 } from 'lucide-react';
import { getYouTubeVideoId, loadYouTubeIframeApi } from '../PortfolioWebsite';

// Trình phát video của khoá học: ẩn hết nút và chữ của YouTube, dùng bộ điều khiển riêng của EduGo
// (phát, dừng, lùi tới 10 giây, kéo thanh thời gian, tốc độ, tắt tiếng, toàn màn hình).
// Dùng chung cho video YouTube và video tải lên. Xem tới 95% hoặc hết video thì gọi onFinish 1 lần.

export interface PlayerApi { time: () => number | undefined; seek: (s: number) => void }
const RATES = [1, 1.25, 1.5, 2, 0.75];
const fmt = (s: number) => {
  const t = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};

const CoursePlayer = forwardRef<PlayerApi, { src: string; poster?: string; onFinish?: () => void; autoPlay?: boolean }>(function CoursePlayer({ src, poster, onFinish, autoPlay }, ref) {
  const yt = getYouTubeVideoId(src);
  const wrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const ytp = useRef<any>(null);
  const done = useRef(false);
  const finishRef = useRef(onFinish); finishRef.current = onFinish;
  const [ready, setReady] = useState(!yt);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(100);
  const [volOpen, setVolOpen] = useState(false);
  const [rate, setRate] = useState(1);
  const [show, setShow] = useState(true);
  const [fs, setFs] = useState<'' | 'native' | 'css'>('');
  const [rot, setRot] = useState(false);
  const [seeking, setSeeking] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const finish = () => { if (done.current) return; done.current = true; finishRef.current?.(); };

  // ---- YouTube: tắt hết điều khiển, logo, gợi ý, chú thích của YouTube ----
  useEffect(() => {
    if (!yt) return;
    let off = false; let timer = 0;
    done.current = false; setReady(false); setStarted(false); setEnded(false); setPlaying(false); setCur(0); setDur(0); setFailed(false);
    loadYouTubeIframeApi().then(YT => {
      if (off || !host.current) return;
      host.current.innerHTML = '';
      const mount = document.createElement('div');
      host.current.appendChild(mount);
      ytp.current = new YT.Player(mount, {
        videoId: yt, width: '100%', height: '100%',
        playerVars: { controls: 0, rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1, fs: 0, iv_load_policy: 3, cc_load_policy: 0, showinfo: 0, autoplay: autoPlay ? 1 : 0, origin: window.location.origin },
        events: {
          onReady: () => { if (off) return; setReady(true); setDur(ytp.current?.getDuration?.() || 0); },
          onStateChange: (e: any) => {
            if (e.data === 1) { setPlaying(true); setStarted(true); setEnded(false); }
            else if (e.data === 2) setPlaying(false);
            else if (e.data === 0) { setPlaying(false); setEnded(true); finish(); }
          },
          onError: () => setFailed(true),
        },
      });
      timer = window.setInterval(() => {
        const p = ytp.current; if (!p?.getCurrentTime) return;
        const t = p.getCurrentTime() || 0, d = p.getDuration() || 0;
        setCur(t); if (d) setDur(d);
        if (d > 0 && t / d >= 0.95) finish();
      }, 300);
    }).catch(() => { if (!off) setFailed(true); });
    return () => {
      off = true; window.clearInterval(timer);
      try { ytp.current?.destroy?.(); } catch { /* đã gỡ */ }
      ytp.current = null;
      if (host.current) host.current.innerHTML = '';
    };
  }, [yt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Video tải lên ----
  useEffect(() => { if (!yt) { done.current = false; setStarted(false); setEnded(false); setPlaying(false); setCur(0); } }, [src, yt]);

  const play = () => {
    if (yt) { ytp.current?.playVideo?.(); } else vid.current?.play().catch(() => {});
    setStarted(true); setEnded(false);
  };
  const pause = () => { if (yt) ytp.current?.pauseVideo?.(); else vid.current?.pause(); };
  const seek = (s: number) => {
    const t = Math.max(0, Math.min(dur || s, s));
    if (yt) ytp.current?.seekTo?.(t, true); else if (vid.current) vid.current.currentTime = t;
    setCur(t);
  };
  const toggle = () => { if (playing) pause(); else play(); };
  const skip = (d: number) => { seek(cur + d); poke(); };
  const nextRate = () => { const r = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; setRate(r); if (yt) ytp.current?.setPlaybackRate?.(r); else if (vid.current) vid.current.playbackRate = r; poke(); };
  // Âm lượng 0 đến 100. iPhone không cho trang web đổi âm lượng của video (chỉ nút cứng của máy), khi đó vẫn tắt, bật tiếng được.
  const applyVol = (n: number) => {
    setVol(n); const m = n === 0; setMuted(m);
    if (yt) { ytp.current?.setVolume?.(n); if (m) ytp.current?.mute?.(); else ytp.current?.unMute?.(); }
    else if (vid.current) { vid.current.volume = n / 100; vid.current.muted = m; }
    poke();
  };
  const toggleMute = () => {
    const m = !muted; setMuted(m); if (!m && vol === 0) setVol(60);
    if (yt) { if (m) ytp.current?.mute?.(); else ytp.current?.unMute?.(); } else if (vid.current) vid.current.muted = m;
    poke();
  };

  // Toàn màn hình: dùng toàn màn hình của trình duyệt nếu có, iPhone không hỗ trợ thì phủ kín màn hình và xoay ngang.
  const enterFs = async () => {
    const el: any = wrap.current;
    try {
      if (el?.requestFullscreen) { await el.requestFullscreen(); setFs('native'); try { await (screen.orientation as any)?.lock?.('landscape'); } catch { /* không khoá được hướng */ } return; }
      if (el?.webkitRequestFullscreen) { el.webkitRequestFullscreen(); setFs('native'); return; }
    } catch { /* chuyển sang phủ kín */ }
    setFs('css'); setRot(window.innerHeight > window.innerWidth);
  };
  const exitFs = () => {
    const d: any = document;
    if (fs === 'native') { try { (d.exitFullscreen || d.webkitExitFullscreen)?.call(d); } catch { /* bỏ qua */ } }
    setFs(''); setRot(false);
  };
  useEffect(() => {
    const on = () => { const d: any = document; if (!(d.fullscreenElement || d.webkitFullscreenElement)) setFs(f => (f === 'native' ? '' : f)); };
    document.addEventListener('fullscreenchange', on); document.addEventListener('webkitfullscreenchange', on);
    return () => { document.removeEventListener('fullscreenchange', on); document.removeEventListener('webkitfullscreenchange', on); };
  }, []);

  // Tự ẩn bộ điều khiển sau 2,5 giây khi đang phát, chạm vào video thì hiện lại.
  const hideT = useRef(0);
  const poke = () => { setShow(true); window.clearTimeout(hideT.current); hideT.current = window.setTimeout(() => setShow(false), 2600); };
  useEffect(() => { if (!playing) { setShow(true); window.clearTimeout(hideT.current); } else poke(); }, [playing]);
  useEffect(() => { if (!show) setVolOpen(false); }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(hideT.current), []);

  useImperativeHandle(ref, () => ({
    time: () => (yt ? ytp.current?.getCurrentTime?.() : vid.current?.currentTime),
    seek: (s: number) => { seek(s); play(); },
  }));

  const pv = seeking ?? cur;
  const pct = dur ? Math.min(100, (pv / dur) * 100) : 0;
  const thumb = poster || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '');

  return (
    <div ref={wrap} className={`cxp ${fs === 'css' ? 'fs' : ''} ${rot ? 'rot' : ''} ${show || !playing ? 'on' : ''}`}>
      <div className="media">
        {yt ? <div ref={host} className="yt" /> : (
          <video ref={vid} src={src} playsInline preload="metadata" poster={poster} autoPlay={autoPlay}
            onLoadedMetadata={e => setDur(e.currentTarget.duration || 0)}
            onTimeUpdate={e => { const m = e.currentTarget; setCur(m.currentTime); if (m.duration > 0 && m.currentTime / m.duration >= 0.95) finish(); }}
            onPlay={() => { setPlaying(true); setStarted(true); setEnded(false); }} onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setEnded(true); finish(); }} onError={() => setFailed(true)} />
        )}
      </div>
      {/* Lớp chắn: chặn mọi thao tác chạm vào khung YouTube để không hiện tiêu đề, logo, video gợi ý */}
      <div className="tap" onClick={() => { if (!started) play(); else if (show && playing) setShow(false); else poke(); }} />
      {(!started || ended) && thumb && <div className="poster" style={{ backgroundImage: `url(${thumb})` }} />}
      {failed ? <div className="msg">Không phát được video này.</div> : !ready && <div className="msg"><Loader2 className="spin" /></div>}

      {ready && !failed && <>
        <div className="mid">
          {started && !ended && <button type="button" aria-label="Lùi 10 giây" className="sk" onClick={e => { e.stopPropagation(); skip(-10); }}><RotateCcw /><i>10</i></button>}
          <button type="button" aria-label={playing ? 'Dừng' : 'Phát'} className="pp" onClick={e => { e.stopPropagation(); if (ended) { seek(0); play(); } else toggle(); poke(); }}>
            {playing ? <Pause /> : ended ? <RotateCcw /> : <Play />}
          </button>
          {started && !ended && <button type="button" aria-label="Tới 10 giây" className="sk" onClick={e => { e.stopPropagation(); skip(10); }}><RotateCw /><i>10</i></button>}
        </div>
        <div className="bar" onClick={e => e.stopPropagation()}>
          <span className="tm">{fmt(pv)}</span>
          <span className="tl">
            <span className="tr"><i style={{ width: `${pct}%` }} /></span>
            <input type="range" min={0} max={dur || 0} step={0.1} value={pv} aria-label="Thanh thời gian"
              onChange={e => { setSeeking(Number(e.target.value)); poke(); }}
              onPointerUp={() => { if (seeking !== null) { seek(seeking); setSeeking(null); } }}
              onTouchEnd={() => { if (seeking !== null) { seek(seeking); setSeeking(null); } }}
              onKeyUp={() => { if (seeking !== null) { seek(seeking); setSeeking(null); } }} />
          </span>
          <span className="tm">{fmt(dur)}</span>
          <button type="button" className="rt" onClick={nextRate} aria-label="Tốc độ phát">{rate}x</button>
          <span className="vw">
            <button type="button" onClick={() => { setVolOpen(o => !o); poke(); }} aria-label="Âm lượng">{muted || vol === 0 ? <VolumeX /> : vol < 50 ? <Volume1 /> : <Volume2 />}</button>
            {volOpen && (
              <span className="vp" onClick={e => e.stopPropagation()}>
                <b>{muted ? 0 : vol}</b>
                <span className="vs"><input type="range" min={0} max={100} step={5} value={muted ? 0 : vol} aria-label="Âm lượng" onChange={e => applyVol(Number(e.target.value))} /></span>
                <button type="button" onClick={() => (muted || vol === 0 ? applyVol(vol || 60) : toggleMute())} aria-label={muted ? 'Bật tiếng' : 'Tắt tiếng'}>{muted || vol === 0 ? <VolumeX /> : <Volume2 />}</button>
              </span>
            )}
          </span>
          <button type="button" onClick={() => (fs ? exitFs() : enterFs())} aria-label={fs ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>{fs ? <Minimize /> : <Maximize />}</button>
        </div>
      </>}
    </div>
  );
});

export default CoursePlayer;
