import { Link } from 'react-router-dom';
import '../styles/animecard.scss';

const STATIC_BASE = 'https://static-libria.weekstorm.one';

const getFullUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${STATIC_BASE}${normalized}`;
};

const resolvePoster = (anime) => {
  if (!anime) return '';

  if (anime.poster) {
    if (anime.poster.optimized?.preview) return getFullUrl(anime.poster.optimized.preview);
    if (anime.poster.optimized?.src) return getFullUrl(anime.poster.optimized.src);
    if (anime.poster.preview) return getFullUrl(anime.poster.preview);
    if (anime.poster.src) return getFullUrl(anime.poster.src);
    if (anime.poster.thumbnail) return getFullUrl(anime.poster.thumbnail);
  }

  if (anime.posters) {
    if (anime.posters.small?.url) return getFullUrl(anime.posters.small.url);
    if (anime.posters.original?.url) return getFullUrl(anime.posters.original.url);
    if (anime.posters.medium?.url) return getFullUrl(anime.posters.medium.url);
  }

  if (anime.image) {
    return getFullUrl(anime.image);
  }

  return '';
};

const resolveTitle = (anime) => {
  if (!anime) return 'Без названия';
  if (anime.names) {
    return anime.names.ru || anime.names.en || anime.names?.original || 'Без названия';
  }
  if (anime.name) {
    return anime.name.main || anime.name.english || anime.name.alternative || 'Без названия';
  }
  return anime.title || anime.alias || 'Без названия';
};

export default function AnimeCard({ anime }) {
  const core = anime || {};
  const id = core.id || core.alias || '';
  const title = resolveTitle(core);
  const posterUrl = resolvePoster(core);

  return (
    <Link to={`/anime/${id}`} className="anime-card-link">
      <div className="anime-card">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={title}
            loading="lazy"
            onError={(e) => { e.currentTarget.src = '/fallback-poster.png'; }}
          />
        ) : (
          <div className="no-image">Нет изображения</div>
        )}
        <div className="info">
          <h3>{title}</h3>
            <p>
              {typeof core.season?.description === 'object' && core.season.description !== null
                ? core.season.description.value ?? core.season.description.description ?? '—'
                : core.season?.description || core.season?.string || (typeof core.season === 'string' ? core.season : '—')}
            </p>
        </div>
      </div>
    </Link>
  );
}
