import { Helmet } from '@dr.pogodin/react-helmet';
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Hls from 'hls.js';
import '../styles/random.scss';

const getPosterUrl = (poster) => {
  const rawPath = poster?.src || poster?.preview || '';
  return rawPath ? `https://anilibria.top${rawPath}` : '/fallback-poster.png';
};

export default function Random() {
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchRandom = async (delay = 0) => {
    try {
      setLoading(true);
      setError(null);
      setAnime(null);
      setEpisodes([]);
      setCurrentEpisode(null);

      if (delay > 0) await new Promise((r) => setTimeout(r, delay));

      const randomRes = await axios.get('https://anilibria.top/api/v1/anime/releases/random');
      if (!Array.isArray(randomRes.data) || randomRes.data.length === 0) {
        throw new Error('API вернуло пустой ответ');
      }
      const release = randomRes.data[0];

      const detailsRes = await axios.get(`https://anilibria.top/api/v1/anime/releases/${release.alias}`);
      const fullAnime = detailsRes.data;
      setAnime(fullAnime);
      setEpisodes(fullAnime.episodes || []);

      if (Array.isArray(fullAnime.episodes) && fullAnime.episodes.length > 0) {
        loadEpisode(fullAnime.episodes[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить случайное аниме.');
    } finally {
      setLoading(false);
    }
  };

  const loadEpisode = async (episodeId) => {
    try {
      const epRes = await axios.get(`https://anilibria.top/api/v1/anime/releases/episodes/${episodeId}`);
      setCurrentEpisode(epRes.data);
    } catch (err) {
      console.error(err);
      setError('Эпизод не найден');
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const skeletonMs = parseInt(params.get('skeleton') || '0', 10);
    fetchRandom(skeletonMs > 0 ? skeletonMs : 0);
  }, []);

  useEffect(() => {
    if (currentEpisode?.hls_720) {
      const video = document.getElementById('video-player');
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(currentEpisode.hls_720);
        hls.attachMedia(video);
      } else if (video && video.canPlayType && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentEpisode.hls_720;
      }
    }
  }, [currentEpisode]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <main className="anime-info" aria-busy="true">
        <section className="skeleton-header">
          <div className="skeleton-title skeleton-line skeleton-line--lg" />
        </section>

        <section className="info-block">
          <div className="skeleton-avatar skeleton" />
          <div className="text">
            <div className="skeleton-line skeleton-line--xl" />
            <div className="skeleton-line skeleton-line--md" />
            <div className="skeleton-genres">
              <span className="skeleton-pill skeleton" />
              <span className="skeleton-pill skeleton" />
              <span className="skeleton-pill skeleton" />
            </div>
            <div className="skeleton-line skeleton-line--sm" />
            <div className="skeleton-line skeleton-line--sm" />
          </div>
        </section>

        <section className="episodes">
          <div className="skeleton-episodes">
            <div className="skeleton-line skeleton-line--button" />
            <div className="skeleton-player skeleton" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="random-anime">
      <Helmet>
        <title>Случайное аниме — AniLifeTV</title>
        <meta name="description" content="Смотрите случайное аниме в один клик на AniLifeTV. Новые релизы, случайный выбор и HD-качество." />
        <meta property="og:title" content="Случайное аниме — AniLifeTV" />
        <meta property="og:description" content="Нажмите и получите случайный аниме-релиз. Полное описание, жанры, возрастной рейтинг и возможность сразу смотреть онлайн." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://anilifetv.vercel.app/random" />
      </Helmet>

      <button className="random-anime__btn" onClick={() => fetchRandom()} disabled={loading}>
        {loading ? 'Загрузка...' : 'Случайное аниме'}
      </button>
      {error && <p className="error">{error}</p>}

      {anime && (
        <>
          <h2 className="title">{anime.name?.main}</h2>

          <section className="info-block">
            <img src={getPosterUrl(anime.poster)} alt={anime.name?.main} loading="lazy" />
            <div>
              <p className="text"><strong>Описание:</strong> {anime.description || 'нет описания'}</p>
              <p className="text"><strong>Жанры:</strong>{' '}{anime.genres?.map((g) => (<span key={g.id} className="genre">{g.name}</span>))}</p>
              <p className="text"><strong>Сезон:</strong> {anime.season?.description} {anime.year}</p>
              <p className="text"><strong>Возраст:</strong> {anime.age_rating?.label}</p>
            </div>
          </section>

          <section className="episodes">
            <div className="custom-select" ref={dropdownRef}>
              <button className="custom-select__trigger" onClick={() => setDropdownOpen(!dropdownOpen)}>
                {currentEpisode ? `Серия ${currentEpisode.ordinal}` : 'Выбрать серию'}
                <span className={`arrow ${dropdownOpen ? 'open' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="custom-select__options">
                  {episodes.map((ep) => (<div key={ep.id} className={`custom-select__option ${currentEpisode?.id === ep.id ? 'selected' : ''}`} onClick={() => { loadEpisode(ep.id); setDropdownOpen(false);}}>Серия {ep.ordinal}</div>))}
                </div>
              )}
            </div>

            {currentEpisode && (
              <div className="video-player">
                <video id="video-player" controls></video>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
};