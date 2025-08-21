import '../styles/animecard.scss';

export default function AnimeCardSkeleton() {
  return (
    <div className="anime-card skeleton">
      <div className="anime-card__image"></div>
      <div className="anime-card__info">
        <div className="anime-card__title"></div>
        <div className="anime-card__meta"></div>
      </div>
    </div>
  );
}