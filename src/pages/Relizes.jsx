import { useEffect, useState } from 'react';
import axios from 'axios';
import AnimeCard from '../components/AnimeCard';
import '../styles/relizes.scss';

export default function Relizes() {
  const [animeList, setAnimeList] = useState([]);
  const [search, setSearch] = useState(''); 
  const [loading, setLoading] = useState(true);

  const STORAGE_KEY = 'relizes_v1';
  const DEFAULT_QUERY = 'my';

  const fetchReleases = async (query) => {
    setLoading(true);

    const effectiveQuery = query.trim() === '' ? `"${DEFAULT_QUERY}"` : `"${query}"`;

    try {
      const res = await axios.get(
        'https://anilibria.top/api/v1/app/search/releases',
        { params: { query: effectiveQuery } }
      );

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
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setAnimeList(JSON.parse(saved));
        setLoading(false);
        return;
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    fetchReleases('');
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value); 
    fetchReleases(value);
  };

  return (
    <div className="relizes">
      <div className="filters">
        <input
          type="text"
          placeholder="Поиск релизов..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {loading ? (
        <p>Загрузка релизов...</p>
      ) : animeList.length > 0 ? (
        <div className="anime-grid">
          {animeList.map(anime => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      ) : (
        <p>Ничего не найдено.</p>
      )}
    </div>
  );
}