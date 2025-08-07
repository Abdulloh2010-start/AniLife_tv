import { useEffect, useState } from 'react';
import axios from 'axios';
import AnimeCard from '../components/AnimeCard';
import '../styles/home.scss';

const daysOfWeek = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export default function Home() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('schedule');
    if (saved) {
      setSchedule(JSON.parse(saved));
      setLoading(false);
    } else {
      axios
        .get('https://api.anilibria.tv/v3/title/schedule')
        .then(res => {
          setSchedule(res.data || []);
          sessionStorage.setItem('schedule', JSON.stringify(res.data));
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, []);

  if (loading) {
    return (
      <div className="home">
        <h1>Расписание Аниме</h1>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="home">
      <h1>Расписание Аниме</h1>
      {schedule.map(({ day, list }) => (
        <section key={day} className="day-section">
          <h2>{daysOfWeek[day]}</h2>
            <div className="anime-grid">
              {list.map(item => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
        </section>
      ))}
    </div>
  );
};