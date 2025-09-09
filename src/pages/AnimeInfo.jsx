import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import AnimePlayer from '../components/AnimePlayer';
import '../styles/animeinfo.scss';
import { Helmet } from '@dr.pogodin/react-helmet';

const STATIC_BASE = 'https://anilibria.top';

const normalizePosterUrl = (anime) => {
  if (!anime) return '/fallback-poster.png';
  const p = anime?.poster ?? anime?.posters ?? anime;
  const candidates = [
    p?.optimized?.preview,
    p?.optimized?.src,
    p?.preview,
    p?.src,
    p?.thumbnail,
    p?.small?.url,
    p?.medium?.url,
    p?.original?.url,
    anime?.image
  ].filter(Boolean);
  const raw = candidates[0] || '';
  if (!raw) return '/fallback-poster.png';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  return `${STATIC_BASE}${raw.startsWith('/') ? raw : '/' + raw}`;
};

const resolveTitle = (obj) => {
  if (!obj) return 'Без названия';
  if (obj.names) return obj.names.ru || obj.names.en || obj.names.original || 'Без названия';
  if (obj.name) return obj.name.main || obj.name.english || obj.name.alternative || 'Без названия';
  return obj.title || obj.alias || 'Без названия';
};

const renderGenres = (genres) => {
  if (!Array.isArray(genres) || genres.length === 0) return null;
  return genres.map((item, index) => {
    const label = typeof item === 'string' ? item : item?.name || item?.label || String(item);
    return <span key={index} className="genre">{label}</span>;
  });
};

const resolveVideoUrl = (epData, playerHost) => {
  if (!epData) return null;
  const candidate = epData.hls_1080 || epData.hls_720 || epData.hls_480 || epData.file || epData.url || epData.src || epData.link;
  if (!candidate) return null;
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) return candidate;
  if (candidate.startsWith('//')) return `https:${candidate}`;
  if (candidate.startsWith('/')) {
    if (playerHost) {
      const host = playerHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `https://${host}${candidate}`;
    }
    return candidate;
  }
  if (playerHost) {
    const host = playerHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}/${candidate}`;
  }
  return candidate;
};

const resolveStatus = (anime) => {
  if (!anime) return '—';
  if (anime.is_ongoing) return 'Выпускается';
  if (anime.is_in_production) return 'В производстве';
  if (anime.is_blocked_by_copyrights) return 'Заблокировано';
  return 'Завершено';
};

export default function AnimeInfo() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEp, setSelectedEp] = useState(null);
  const [episodesMap, setEpisodesMap] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setAnime(null);
    setSelectedEp(null);
    setEpisodesMap({});
    const fetchAnime = async () => {
      try {
        const url = `https://anilibria.top/api/v1/anime/releases/${encodeURIComponent(id)}`;
        const { data } = await axios.get(url);
        const release = data?.release ?? data;
        let epsMap = {};
        if (release?.player?.list) {
          const rawList = release.player.list;
          if (Array.isArray(rawList)) {
            rawList.forEach((episode, i) => {
              const key = (episode?.episode || episode?.number || episode?.ep || (i + 1)).toString();
              epsMap[key] = episode;
            });
          } else if (typeof rawList === 'object') {
            epsMap = rawList;
          }
        } else if (Array.isArray(release?.episodes)) {
          release.episodes.forEach((episode, i) => {
            const key = (episode?.episode || episode?.number || (i + 1)).toString();
            epsMap[key] = episode;
          });
        } else if (release?.external_player) {
          epsMap['external'] = { external: true, url: release.external_player };
        }
        setAnime(release);
        setEpisodesMap(epsMap);
        setSelectedEp(Object.keys(epsMap)[0] || null);
      } catch (error) {
        console.warn('[AnimeInfo] Fetch error:', error?.message || error);
        setAnime(null);
        setEpisodesMap({});
        setSelectedEp(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAnime();
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

  if (!anime) {
    return (
      <section className="anime-info">
        <p>Аниме не найдено</p>
      </section>
    );
  }

  const title = resolveTitle(anime);
  const poster = normalizePosterUrl(anime);
  const description = anime.description || anime.notification || anime.descr || '';
  const genres = anime.genres || anime.type?.genres || anime.genres_list || [];
  const season = anime.season || anime.season_info || null;
  const playerHost = anime.player?.host || '';
  const episodeKeys = Object.keys(episodesMap);
  const hasEpisodes = episodeKeys.length > 0;
  const toggleDropdown = () => setDropdownOpen((open) => !open);
  const handleSelectEpisode = (ep) => {
    setSelectedEp(ep);
    setDropdownOpen(false);
  };
  const currentEpData = selectedEp ? episodesMap[selectedEp] : null;
  const renderPlayer = () => {
    if (!currentEpData) return <p>Видео недоступно для этой серии</p>;
    if (currentEpData.external && currentEpData.url) {
      const extUrl = currentEpData.url.startsWith('//') ? `https:${currentEpData.url}` : currentEpData.url;
      return (
        <section>
          <p>Видео доступно во внешнем плеере:</p>
          <a href={extUrl} target="_blank" rel="noreferrer noopener">Открыть внешний плеер</a>
        </section>
      );
    }
    const videoUrl = resolveVideoUrl(currentEpData, playerHost);
    if (!videoUrl) return <p>Видео недоступно для этой серии</p>;
    return <AnimePlayer url={videoUrl} />;
  };

  const pageUrl = `https://anilifetv.vercel.app/anime/${encodeURIComponent(id)}`;

  return (
    <main className="anime-info">
      <Helmet>
        <title>{title ? `${title} — AniLifeTV` : 'AniLifeTV'}</title>
        <meta name="description" content={description || 'Смотреть аниме на AniLifeTV'} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="video.other" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description || `Смотреть ${title} онлайн`} />
        <meta property="og:url" content={pageUrl} />
        {poster && <meta property="og:image" content={poster} />}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {poster && <meta name="twitter:image" content={poster} />}
      </Helmet>
      <h1>{title}</h1>
      <section className="info-block">
        <img src={poster} alt={title} loading="lazy" onError={(e) => { e.currentTarget.src = '/fallback-poster.png'; }} />
        <div className="text">
          <p><strong>Описание:</strong> {description || 'Нет описания'}</p>
          <p><strong>Жанры:</strong> {renderGenres(genres) || '—'}</p>
          <p><strong>Сезон:</strong> {season?.year || season?.description || season?.value || '—'}</p>
          <p><strong>Статус:</strong> {resolveStatus(anime)}</p>
        </div>
      </section>
      <section className="episodes">
        {!hasEpisodes ? (
          anime.external_player ? (
            <div className="external-player">
              <p>Видео доступно через внешний плеер:</p>
              <a href={anime.external_player.startsWith('//') ? `https:${anime.external_player}` : anime.external_player} target="_blank" rel="noreferrer noopener">Открыть внешний плеер</a>
            </div>
          ) : (
            <p className="episodes-notfound">Контент заблокирован для просмотра</p>
          )
        ) : (
          <div className="custom-select" ref={dropdownRef}>
            <button className="custom-select__trigger" onClick={toggleDropdown} aria-haspopup="listbox" aria-expanded={dropdownOpen} type="button">
              {selectedEp ? `Серия ${selectedEp}` : 'Выбрать серию'}
              <span className={`arrow ${dropdownOpen ? 'open' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="custom-select__options" role="listbox" tabIndex={-1}>
                {episodeKeys.map((ep) => (
                  <div key={ep} role="option" aria-selected={selectedEp === ep} className={`custom-select__option ${selectedEp === ep ? 'selected' : ''}`} onClick={() => handleSelectEpisode(ep)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { handleSelectEpisode(ep); } }}>
                    Серия {ep}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {hasEpisodes && selectedEp && <div className="episode-player">{renderPlayer()}</div>}
      </section>
    </main>
  );
}