import { Link } from 'react-router-dom';
import '../styles/animecard.scss';

const getPosterUrl = (anime) => {
  const p = anime?.poster ?? anime?.posters ?? {};
  const candidates = [
    p.optimized?.preview,
    p.optimized?.src,
    p.preview,
    p.src,
    p.thumbnail,
    p.small?.url,
    p.medium?.url,
    p.original?.url,
    anime?.image
  ].filter(Boolean);

  const raw = candidates[0];
  if (!raw) return '/fallback-poster.png';
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  return `https://anilibria.top${raw.startsWith('/') ? raw : '/' + raw}`;
};

const resolveTitle = (anime) => {
  if (!anime) return 'Без названия';
  if (anime.names) return anime.names.ru || anime.names.en || anime.names.original || 'Без названия';
  if (anime.name) return anime.name.main || anime.name.english || anime.name.alternative || 'Без названия';
  return anime.title || anime.alias || 'Без названия';
};

export default function AnimeCard({ anime }) {
  const core = anime || {};
  const id = core.id || core.alias || '';
  const title = resolveTitle(core);
  const posterUrl = getPosterUrl(core);

  return (
    <Link to={`/anime/${id}`} className="anime-card-link">
      <div className="anime-card">
        {posterUrl ? (
          <img src={posterUrl} alt={title} loading="lazy" onError={(e) => { e.currentTarget.src = '/fallback-poster.png'; }} />
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