import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import "../styles/animeplayer.scss"

export default function AnimePlayer({ url }) {
  const videoRef = useRef();

  useEffect(() => {
    const video = videoRef.current;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }
  }, [url]);

  return <video className='video' ref={videoRef} controls width="98%" />;
}