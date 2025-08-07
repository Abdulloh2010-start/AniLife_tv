import { Link } from 'react-router-dom';
import '../styles/animecard.scss';

const getFullUrl = path => {
  if (!path) return '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.startsWith('http')
    ? normalized
    : `https://static-libria.weekstorm.one${normalized}`;
};

export default function AnimeCard({ anime }) {
  const title = anime.names?.ru || anime.names?.en || 'Без названия';
  const rawPath = anime.posters?.small?.url || anime.posters?.original?.url || '';
  const posterUrl = getFullUrl(rawPath);

  return (
    <Link to={`/anime/${anime.id}`} className="anime-card-link">
      <div className="anime-card">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            onError={e => { e.currentTarget.src = '/fallback-poster.png'; }}
          />
        ) : (
          <div className="no-image">Нет изображения</div>
        )}
        <div className="info">
          <h3>{title}</h3>
          <p>{anime.season?.string || '—'}</p>
        </div>
      </div>
    </Link>
  );
}