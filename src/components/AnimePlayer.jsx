import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import "../styles/animeplayer.scss";

const VideoPlayerControls = ({
  videoRef,
  containerRef,
  isPlaying,
  togglePlay,
  current,
  duration,
  bufferEnd,
  volume,
  muted,
  changeVolume,
  toggleMute,
  skip,
  togglePiP,
  toggleFullscreen,
  isFullScreen,
  fmt,
  onProgressClick,
  onProgressHover,
  onProgressLeave,
  progressTooltip,
  showSettings,
  setShowSettings,
}) => (
  <div className="control-panel">
    <div className="controls-row">
      <div className="progress-wrap" onClick={onProgressClick} onMouseMove={onProgressHover} onMouseLeave={onProgressLeave}>
        <div className="buffer" style={{ width: `${(bufferEnd / (duration || 1)) * 100}%` }}></div>
        <div className="progress" style={{ width: `${(current / (duration || 1)) * 100}%` }}></div>
        <div className="progress-thumb" style={{ left: `${(current / (duration || 1)) * 100}%` }}></div>
        {progressTooltip && <span className="tooltip" style={{ left: `${progressTooltip.x}px` }}>{progressTooltip.time}</span>}
      </div>
      <div className="controls-main">
        <div className="left-controls">
          <button className="ctrl" onClick={() => skip(-10)} title="−10s"><span className="material-icons">replay_10</span></button>
          <button className="play-ctrl" onClick={togglePlay} title={isPlaying ? "Pause" : "Play"}><span className="material-icons">{isPlaying ? "pause" : "play_arrow"}</span></button>
          <button className="ctrl" onClick={() => skip(10)} title="+10s"><span className="material-icons">forward_10</span></button>
          <div className="volume">
            <button className="ctrl" onClick={toggleMute}><span className="material-icons">{muted || volume === 0 ? "volume_off" : "volume_up"}</span></button>
            <input className="vol-slider" type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} onChange={(e) => changeVolume(e.target.value)} />
          </div>
          <div className="time">{fmt(current)} / {isFinite(duration) && duration > 0 ? fmt(duration) : "—:—"}</div>
        </div>
        <div className="right-controls">
          <button className="ctrl" onClick={togglePiP} title="Picture-in-Picture"><span className="material-icons">picture_in_picture_alt</span></button>
          <button className="ctrl" onClick={toggleFullscreen} title="Fullscreen"><span className="material-icons">{isFullScreen ? "fullscreen_exit" : "fullscreen"}</span></button>
          <button className="ctrl" onClick={() => setShowSettings(!showSettings)} title="Settings"><span className="material-icons">settings</span></button>
        </div>
      </div>
    </div>
  </div>
);

export default function AnimePlayer({ url, poster, initialMuted = false }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const uiTimeoutRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(initialMuted);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [bufferEnd, setBufferEnd] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [qualities, setQualities] = useState([{ label: "Auto", index: -1 }]);
  const [qualityIndex, setQualityIndex] = useState(-1);
  const [autoplay, setAutoplay] = useState(false);
  const [autoFullscreen, setAutoFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [progressTooltip, setProgressTooltip] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      await v.play().catch(() => {});
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      v.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }, []);

  const skip = useCallback((s) => {
    const v = videoRef.current;
    if (!v) return;
    if (isFinite(v.duration) && v.duration > 0) {
      v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + s));
    } else {
      v.currentTime = Math.max(0, v.currentTime + s);
    }
  }, []);

  const changeVolume = useCallback((val) => {
    const n = Number(val);
    setVolume(n);
    setMuted(n === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
    if (!muted && volume === 0) setVolume(0.5);
  }, [muted, volume]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current && containerRef.current.requestFullscreen && containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen && document.exitFullscreen().catch(() => {});
    }
  }, []);

  const togglePiP = useCallback(async () => {
    try {
      if (videoRef.current && videoRef.current !== document.pictureInPictureElement) {
        await videoRef.current.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    } catch (err) {}
  }, []);

  const fmt = useCallback((t) => {
    if (!isFinite(t) || t === 0) return "00:00";
    const s = Math.floor(t % 60).toString().padStart(2, "0");
    const m = Math.floor((t / 60) % 60).toString().padStart(2, "0");
    const h = Math.floor(t / 3600);
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  }, []);

  const onProgressClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const perc = (e.clientX - rect.left) / rect.width;
    const v = videoRef.current;
    if (v) v.currentTime = perc * (v.duration || 1);
  }, []);

  const onProgressHover = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(8, Math.min(rect.width - 8, x));
    const perc = x / rect.width;
    const dur = videoRef.current && isFinite(videoRef.current.duration) ? videoRef.current.duration : 0;
    const time = perc * (dur || 1);
    setProgressTooltip({ x, time: fmt(time) });
  }, [fmt]);

  const onProgressLeave = useCallback(() => {
    setProgressTooltip(null);
  }, []);

  const onQualityChange = useCallback((idx) => {
    const h = hlsRef.current;
    if (!h) return;
    const newIndex = Number(idx);
    h.currentLevel = newIndex;
    setQualityIndex(newIndex);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      const d = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
      setDuration(d);
      setIsReady(true);
    };
    const onTime = () => {
      setCurrent(v.currentTime || 0);
      const b = v.buffered;
      if (b && b.length) setBufferEnd(b.end(b.length - 1));
    };
    const handleFullscreenChange = () => {
      setIsFullScreen(document.fullscreenElement === containerRef.current);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      setIsPaused(true);
    };
    const loadVideo = () => {
      v.preload = "metadata";
      v.addEventListener("loadedmetadata", onLoaded);
      v.addEventListener("durationchange", onLoaded);
      if (v.canPlayType && v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = url;
      } else if (Hls.isSupported()) {
        const hls = new Hls({ capLevelToPlayerSize: true });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const lvls = hls.levels || [];
          const opts = [{ label: "Auto", index: -1 }, ...lvls.map((l, i) => ({ label: `${l.height ? l.height + "p" : Math.round((l.bitrate || 0) / 1000) + "kb"}`, index: i }))];
          setQualities(opts);
          setQualityIndex(-1);
          if (autoplay) v.play().catch(() => {});
          if (autoFullscreen && containerRef.current) containerRef.current.requestFullscreen && containerRef.current.requestFullscreen().catch(() => {});
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, () => setQualityIndex(hls.currentLevel));
      } else {
        v.src = url;
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    loadVideo();
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", handlePlay);
    v.addEventListener("pause", handlePause);
    return () => {
      v.pause();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("durationchange", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("pause", handlePause);
    };
  }, [url, autoplay, autoFullscreen]);

  useEffect(() => {
    const onKey = (e) => {
      if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
      if (e.code === "Space" || e.key === "k") {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (e.key === "ArrowLeft") {
        skip(-10);
        return;
      }
      if (e.key === "ArrowRight") {
        skip(10);
        return;
      }
      if (e.key === "ArrowUp") {
        changeVolume(Math.min(1, volume + 0.05));
        return;
      }
      if (e.key === "ArrowDown") {
        changeVolume(Math.max(0, volume - 0.05));
        return;
      }
      if (e.key === "f") toggleFullscreen();
      if (e.key === "m") toggleMute();
      if (e.key === "p") togglePiP();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [volume, togglePlay, skip, changeVolume, toggleFullscreen, toggleMute, togglePiP]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
  }, [speed]);

  const toggleUI = useCallback(() => {
    if (!containerRef.current) return;
    if (isHovering || isPaused) {
      containerRef.current.classList.add("hover");
    } else {
      containerRef.current.classList.remove("hover");
    }
  }, [isHovering, isPaused]);

  useEffect(() => {
    toggleUI();
  }, [toggleUI]);

  return (
    <div className="al-player" ref={containerRef} data-theme="dark" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} onMouseMove={() => { setIsHovering(true); if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current); uiTimeoutRef.current = setTimeout(() => { setIsHovering(false); }, 3000); }}>
      <div className="video-wrap">
        <video ref={videoRef} className="al-video" playsInline preload="metadata" poster={poster} onClick={togglePlay} onDoubleClick={toggleFullscreen} />
        <div className={`overlay-center ${isPaused ? "visible" : ""}`} onClick={togglePlay}>
          <span className="material-icons big-icon">{isPaused ? "play_circle_filled" : "pause_circle_filled"}</span>
        </div>
      </div>

      <VideoPlayerControls videoRef={videoRef} containerRef={containerRef} isPlaying={isPlaying} togglePlay={togglePlay} current={current} duration={duration} bufferEnd={bufferEnd} volume={volume} muted={muted} changeVolume={changeVolume} toggleMute={toggleMute} skip={skip} togglePiP={togglePiP} toggleFullscreen={toggleFullscreen} isFullScreen={isFullScreen} fmt={fmt} onProgressClick={onProgressClick} onProgressHover={onProgressHover} onProgressLeave={onProgressLeave} progressTooltip={progressTooltip} showSettings={showSettings} setShowSettings={setShowSettings} />

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-row">
            <div className="label">Speed</div>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
          <div className="settings-row">
            <div className="label">Quality</div>
            <select value={qualityIndex} onChange={(e) => onQualityChange(e.target.value)}>
              {qualities.map((q) => <option key={q.index} value={q.index}>{q.label}</option>)}
            </select>
          </div>
          <div className="settings-row">
            <div className="label">Hotkeys</div>
            <div className="hotkeys-list">
              <div>Space / K — play/pause</div>
              <div>← / → — −/+ 10s</div>
              <div>↑ / ↓ — volume</div>
              <div>F — fullscreen</div>
              <div>M — mute</div>
              <div>P — PiP</div>
            </div>
          </div>
          <div className="settings-row toggles">
            <label><input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} /><span>Autoplay</span></label>
            <label><input type="checkbox" checked={autoFullscreen} onChange={(e) => setAutoFullscreen(e.target.checked)} /><span>Auto fullscreen on start</span></label>
          </div>
          <div className="settings-actions">
            <button className="btn" onClick={() => setShowSettings(false)}><span className="material-icons">close</span>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
