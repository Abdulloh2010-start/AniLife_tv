import { useEffect, useState } from 'react';
import axios from 'axios';
import AnimeCard from '../components/AnimeCard';
import AnimeCardSkeleton from '../components/AnimeCardSkeleton';
import '../styles/home.scss';
import { Helmet } from '@dr.pogodin/react-helmet';

const daysOfWeek = [
  'Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'
];

const groupItemsToBuckets = (items = []) => {
  const buckets = Array.from({ length: 7 }, (_, i) => ({ day: i, list: [] }));
  const getDayIndex = (item, release) => {
    const pub = release?.publish_day?.value ?? release?.publish_day ?? null;
    if (typeof pub === 'number' && !Number.isNaN(pub)) {
      if (pub >= 1 && pub <= 7) return pub - 1;
      if (pub >= 0 && pub <= 6) return pub;
    }
    if (typeof item?.day === 'number') {
      return ((item.day % 7) + 7) % 7;
    }
    return 0;
  };
  items.forEach(item => {
    if (Array.isArray(item.list) && item.list.length > 0) {
      item.list.forEach(entry => {
        const rel = entry.release ? entry.release : entry;
        const idx = getDayIndex(item, rel);
        buckets[idx].list.push(entry);
      });
      return;
    }
    if (item.release) {
      const rel = item.release;
      const idx = getDayIndex(item, rel);
      buckets[idx].list.push(item);
      return;
    }
    if (item.id || item.alias) {
      const rel = item;
      const idx = getDayIndex(item, rel);
      buckets[idx].list.push({ release: rel });
      return;
    }
    console.warn('[Home] Unknown item format in grouping, skipping:', item);
  });
  return buckets;
};

export default function Home() {
  const [schedule, setSchedule] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const STORAGE_KEY = 'schedule_v1';
    const tryLoadFromCache = () => {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      try {
        const parsed = JSON.parse(saved);
        const looksLikeBuckets =
          Array.isArray(parsed) &&
          parsed.length === 7 &&
          parsed.every(d => d && Array.isArray(d.list) && typeof d.day === 'number');
        if (looksLikeBuckets) {
          setSchedule(parsed);
          return true;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          const grouped = groupItemsToBuckets(parsed);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(grouped));
          setSchedule(grouped);
          return true;
        }
        return false;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return false;
      }
    };
    if (tryLoadFromCache()) {
      setLoading(false);
      return;
    }
    axios
      .get('https://anilibria.top/api/v1/anime/schedule/week')
      .then(res => {
        if (Array.isArray(res.data)) {
          const grouped = groupItemsToBuckets(res.data);
          setSchedule(grouped);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(grouped));
          return;
        }
        if (res.data && Array.isArray(res.data.list)) {
          const grouped = groupItemsToBuckets(res.data.list);
          setSchedule(grouped);
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(grouped));
          return;
        }
        setSchedule([]);
      })
      .catch(() => setSchedule([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="home">
        <h1>Расписание Аниме</h1>
        {daysOfWeek.map((day, idx) => (
          <section key={idx} className="day-section">
            <h2>{day}</h2>
            <div className="anime-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <AnimeCardSkeleton key={`${idx}-${i}`} />
              ))}
            </div>
          </section>
        ))}
      </main>
    );
  }

  const daysWithItems = (Array.isArray(schedule) ? schedule : []).filter(d => Array.isArray(d.list) && d.list.length > 0);

  if (daysWithItems.length === 0) {
    return (
      <section className="home">
        <h1>Расписание Аниме</h1>
        <p>Пока нет доступных релизов.</p>
      </section>
    );
  }

  return (
    <main className="home">
      <Helmet>
        <title>Расписание аниме — AniLifeTV</title>
        <meta name="description" content="Свежие релизы аниме по дням недели. Удобное расписание для настоящих анимешников." />
        <meta property="og:title" content="Расписание аниме — AniLifeTV" />
        <meta property="og:description" content="Свежие релизы аниме по дням недели. Удобное расписание для настоящих анимешников." />
        <meta property="og:image" content="https://i.ibb.co/MDPcbc59/photo-2025-01-23-20-38-42.jpg" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://anilifetv.vercel.app/home" />
      </Helmet>
      <h1>Расписание Аниме</h1>
      {daysWithItems.map(dayItem => {
        const dayIndex = typeof dayItem.day === 'number' ? dayItem.day : 0;
        return (
          <section key={dayIndex} className="day-section">
            <h2>{daysOfWeek[dayIndex] ?? `День ${dayIndex}`}</h2>
            <div className="anime-grid">
              {dayItem.list.map((item, idx) => {
                const release = item.release ? item.release : item;
                const key = release?.id || release?.alias || `${dayIndex}-${idx}`;
                return <AnimeCard key={key} anime={release} />;
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
};