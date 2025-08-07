import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import AnimePlayer from '../components/AnimePlayer';
import '../styles/random.scss';

const getPosterUrl = (posters) => {
  const rawPath = posters?.original?.url || posters?.medium?.url || '';
  return rawPath
    ? `https://static-libria.weekstorm.one${rawPath}`
    : '/fallback-poster.png';
};

export default function Random() {
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEp, setSelectedEp] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchRandom = () => {
    setLoading(true);
    setError(null);
    setAnime(null);
    axios.get('https://api.anilibria.tv/v3/title/random')
      .then(res => {
        const data = res.data;
        setAnime(data);
        const episodes = data.player?.list || {};
        const firstKey = Object.keys(episodes)[0] || null;
        setSelectedEp(firstKey);
      })
      .catch(err => {
        console.error('Ошибка получения случайного аниме:', err);
        setError('Не удалось загрузить случайное аниме. Попробуйте ещё раз.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    fetchRandom();
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => setDropdownOpen(prev => !prev);
  const handleSelect = (ep) => {
    setSelectedEp(ep);
    setDropdownOpen(false);
  };

  const renderInfo = () => {
    if (!anime) return null;
    const { names, description, posters, genres, season, status, player } = anime;
    const title = names?.ru || names?.en || 'Без названия';
    const poster = getPosterUrl(posters);
    const episodes = player?.list || {};
    const episodeKeys = Object.keys(episodes);
    const hasEpisodes = episodeKeys.length > 0;

    return (
      <div className="random-anime__info">
        <h2 className='title'>{title}</h2>
        <div className="info-block">
          <img src={poster} alt={title} loading='lazy'/>
          <div className="text">
            <p><strong>Описание:</strong> {description || 'Нет описания'}</p>
            <p><strong>Жанры:</strong> {genres?.join(', ') || '—'}</p>
            <p><strong>Сезон:</strong> {season?.year || ''} {season?.string || '—'}</p>
            <p><strong>Статус:</strong> {status?.string || '—'}</p>
          </div>
        </div>
        <div className="episodes">
          {!hasEpisodes ? (
            <div className="episodes-notfound">Не найдено Эпизодов!</div>
          ) : (
            <div className="custom-select" ref={dropdownRef}>
              <button className="custom-select__trigger" onClick={toggleDropdown}>
                {selectedEp ? `Серия ${selectedEp}` : 'Выбрать серию'}
                <span className={`arrow ${dropdownOpen ? 'open' : ''}`} />
              </button>
              {dropdownOpen && (
                <div className="custom-select__options">
                  {episodeKeys.map(ep => (
                    <div key={ep} className={`custom-select__option ${selectedEp === ep ? 'selected' : ''}`} onClick={() => handleSelect(ep)}>Серия {ep}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          {hasEpisodes && selectedEp && (
            <div className="episode-player">
              {(() => {
                const epData = episodes[selectedEp];
                const videoUrl = epData.hls?.fhd || epData.hls?.hd || epData.hls?.sd;
                const fullUrl = videoUrl ? `https://${player.host}${videoUrl}` : null;
                return fullUrl ? (
                  <AnimePlayer url={fullUrl} />
                ) : (
                  <p>Контент заблокирован для просмотра</p>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="random-anime">
      <button
        className="random-anime__btn"
        onClick={fetchRandom}
        disabled={loading}
      >
        {loading ? 'Загрузка...' : 'Случайное аниме'}
      </button>
      {error && <p className="random-anime__error">{error}</p>}
      {renderInfo()}
    </div>
  );
};