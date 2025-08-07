import { useParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import AnimePlayer from '../components/AnimePlayer';
import '../styles/animeinfo.scss';

const getPosterUrl = (posters) => {
  const rawPath = posters?.original?.url || posters?.medium?.url || '';
  return rawPath
    ? `https://static-libria.weekstorm.one${rawPath}`
    : '/fallback-poster.png';
};

export default function AnimeInfo() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEp, setSelectedEp] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`https://api.anilibria.tv/v3/title?id=${id}`)
      .then(res => {
        setAnime(res.data);
        const eps = res.data.player?.list || {};
        const firstKey = Object.keys(eps)[0] || null;
        setSelectedEp(firstKey);
      })
      .catch(err => console.error('Ошибка загрузки аниме:', err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) return <div className="anime-info"><p>Загрузка...</p></div>;
  if (!anime) return <div className="anime-info"><p>Аниме не найдено</p></div>;

  const { names, description, posters, genres, season, status, player } = anime;
  const title = names?.ru || names?.en || 'Без названия';
  const poster = getPosterUrl(posters);
  const episodes = player?.list || {};
  const episodeKeys = Object.keys(episodes);
  const hasEpisodes = episodeKeys.length > 0;

  const toggleDropdown = () => setDropdownOpen(prev => !prev);
  const handleSelect = (ep) => {
    setSelectedEp(ep);
    setDropdownOpen(false);
  };

  return (
    <div className="anime-info">
      <h1>{title}</h1>
      <div className="info-block">
        <img src={poster} alt={title} loading='lazy'/>
        <div className="text">
          <p><strong>Описание:</strong> {description || 'Нет описания'}</p>
          <p>
            <strong>Жанры:</strong>{' '}
            {genres && genres.length > 0 ? (
              genres.map((g, idx) => (
                <span key={idx} className="genre">{g}</span>
              ))
            ) : (
              '—'
            )}
          </p>
          <p><strong>Сезон:</strong> {season?.year || ''} {season?.string || '—'}</p>
          <p><strong>Статус:</strong> {status?.string || '—'}</p>
        </div>
      </div>

      <div className="episodes">
        {!hasEpisodes ? (
          <p className='episodes-notfound'>Контент заблокирован для просмотра</p>
        ) : (
          <div className="custom-select" ref={dropdownRef}>
            <button className="custom-select__trigger" onClick={toggleDropdown}>
              {selectedEp ? `Серия ${selectedEp}` : 'Выбрать серию'}
              <span className={`arrow ${dropdownOpen ? 'open' : ''}`} />
            </button>
            {dropdownOpen && (
              <div className="custom-select__options">
                {episodeKeys.map(ep => (
                  <div
                    key={ep}
                    className={`custom-select__option ${selectedEp === ep ? 'selected' : ''}`}
                    onClick={() => handleSelect(ep)}
                  >
                    Серия {ep}
                  </div>
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
                <p>Видео недоступно для этой серии</p>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}