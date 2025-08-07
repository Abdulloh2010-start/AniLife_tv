import { useEffect, useState } from 'react';
import axios from 'axios';
import AnimeCard from '../components/AnimeCard';
import '../styles/relizes.scss';

export default function Relizes() {
  const [animeList, setAnimeList] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('relizes');
    if (saved) {
      setAnimeList(JSON.parse(saved));
      setLoading(false);
    } else {
      axios.get('https://api.anilibria.tv/v3/title/updates')
        .then(res => {
          const data = res.data.list || [];
          setAnimeList(data);
          sessionStorage.setItem('relizes', JSON.stringify(data));
        })
        .catch(err => console.error('Ошибка загрузки аниме:', err))
        .finally(() => setLoading(false));
    }
  }, []);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearch(value);

    if (!value.trim()) {
      setLoading(true);
      try {
        const res = await axios.get('https://api.anilibria.tv/v3/title/updates');
        const data = res.data.list || [];
        setAnimeList(data);
        sessionStorage.setItem('relizes', JSON.stringify(data)); // обновим кэш
      } catch (err) {
        console.error('Ошибка загрузки обновлений:', err);
        setAnimeList([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get('https://api.anilibria.tv/v3/title/search', {
        params: { search: value }
      });
      setAnimeList(res.data.list || []);
    } catch (err) {
      console.error('Ошибка поиска:', err);
      setAnimeList([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relizes">
      <div className="filters">
        <input
          type="text"
          placeholder="Поиск аниме..."
          value={search}
          onChange={handleSearch}
        />
      </div>

      {loading ? (
        <p>Загрузка аниме...</p>
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
};