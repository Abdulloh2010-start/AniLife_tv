import { Helmet } from '@dr.pogodin/react-helmet';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AnimeCard from '../components/AnimeCard';
import AnimeCardSkeleton from '../components/AnimeCardSkeleton';
import '../styles/relizes.scss';

export default function Relizes() {
  const [animeList, setAnimeList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const STORAGE_KEY = 'relizes_v1';
  const DEFAULT_QUERY = 'my';
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceRef = useRef(null);

  const fetchReleases = async (query) => {
    setLoading(true);
    const effectiveQuery = query.trim() === '' ? `"${DEFAULT_QUERY}"` : `"${query}"`;
    try {
      const res = await axios.get('https://anilibria.top/api/v1/app/search/releases', {
        params: { query: effectiveQuery }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setAnimeList(data);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Ошибка загрузки релизов (v1):', err);
      setAnimeList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = searchParams.get('search') || '';
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved && initial === '') {
      try {
        setAnimeList(JSON.parse(saved));
        setLoading(false);
        setSearch('');
        return;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setSearch(initial);
    fetchReleases(initial);
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim() === '') {
      setSearchParams({});
    } else {
      setSearchParams({ search: value });
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchReleases(value), 450);
  };

  return (
    <main className="relizes">
      <Helmet>
        <title>Каталог релизов — AniLifeTV</title>
        <meta name="description" content="Просматривайте каталог аниме-релизов на AniLifeTV. Быстрый поиск, удобная навигация и актуальная информация." />
        <meta property="og:title" content="Каталог релизов — AniLifeTV" />
        <meta property="og:description" content="Просматривайте каталог аниме-релизов на AniLifeTV. Быстрый поиск, удобная навигация и актуальная информация." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://anilifetv.vercel.app/relizes" />
      </Helmet>

      <section className="filters">
        <input type="text" placeholder="Поиск релизов..." value={search} onChange={handleSearch} />
      </section>

      {loading ? (
        <section className="anime-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </section>
      ) : animeList.length > 0 ? (
        <section className="anime-grid">
          {animeList.map(anime => <AnimeCard key={anime.id} anime={anime} />)}
        </section>
      ) : (
        <p>Ничего не найдено.</p>
      )}
    </main>
  );
};