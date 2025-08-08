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
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSchedule(parsed);
        }
      } catch (e) {
        console.error('Ошибка парсинга сохранённых данных', e);
      }
      setLoading(false);
    } else {
      axios
        .get('/api/schedule')
        .then(res => {
          console.log('API schedule response:', res.data);
          if (Array.isArray(res.data)) {
            setSchedule(res.data);
            sessionStorage.setItem('schedule', JSON.stringify(res.data));
          } else {
            console.error('Неверный формат данных от API', res.data);
            setSchedule([]); 
          }
        })
        .catch(err => {
          console.error('Ошибка загрузки расписания:', err);
          setSchedule([]);
        })
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

  if (!Array.isArray(schedule) || schedule.length === 0) {
    return (
      <div className="home">
        <h1>Расписание Аниме</h1>
        <p>Данные отсутствуют</p>
      </div>
    );
  }

  return (
    <div className="home">
      <h1>Расписание Аниме</h1>
      {schedule.map(({ day, list }, idx) => (
        <section key={idx} className="day-section">
          <h2>{daysOfWeek[day] ?? `День ${day}`}</h2>
          <div className="anime-grid">
            {Array.isArray(list) &&
              list.map(item => (
                <AnimeCard key={item.id} anime={item} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
