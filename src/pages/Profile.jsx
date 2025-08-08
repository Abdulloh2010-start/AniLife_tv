import { useUser } from '../contexts/UserContext';
import { useEffect, useState } from 'react';
import '../styles/profile.scss';

export default function Profile() {
  const { user, logout } = useUser();
  const [locationInfo, setLocationInfo] = useState({ city: '', region: '' });
  const [locLoading, setLocLoading] = useState(true);

  useEffect(() => {
    const cachedLocation = sessionStorage.getItem('userLocation');

    if (cachedLocation) {
      setLocationInfo(JSON.parse(cachedLocation));
      setLocLoading(false);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const address = data.address;
            const location = {
              city: address.city || address.town || address.village || 'Неизвестно',
              region: address.state || address.county || 'Неизвестно',
            };
            setLocationInfo(location);
            sessionStorage.setItem('userLocation', JSON.stringify(location));
          } catch (err) {
            console.error('Reverse Geocoding Error:', err);
            setLocationInfo({ city: 'Ошибка', region: 'Ошибка' });
          } finally {
            setLocLoading(false);
          }
        },
        () => {
          setLocationInfo({ city: '', region: '' });
          setLocLoading(false);
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      setLocationInfo({ city: 'Не поддерживается', region: '' });
      setLocLoading(false);
    }
  }, []);

  if (!user) return <p>Вы не вошли в систему</p>;

  return (
    <div className="profile">
      <div className="profile-header">
        <img
          src={user.photoURL || "/default-avatar.png"}
          alt="Фото профиля"
          className="avatar"
          loading="lazy"
        />
        <div>
          <h2>{user.displayName}</h2>
          <p className="email">{user.email}</p>
        </div>
      </div>

      <div className="profile-details">
        <div className="login-data">
          <strong>Дата регистрации:</strong>{" "}
          {new Date(user.metadata.creationTime).toLocaleDateString()}
        </div>
        <div className="login-data">
          <strong>Последний вход:</strong>{" "}
          {new Date(user.metadata.lastSignInTime).toLocaleDateString()}
        </div>

        {!locLoading ? (
          <>
            <div className="detail-item">
              <strong>Город:</strong> {locationInfo.city || 'Загрузка...'}
            </div>
            <div className="detail-item">
              <strong>Район:</strong> {locationInfo.region || 'Загрузка...'}
            </div>
          </>
        ) : (
          <div className="detail-item">Определяем местоположение…</div>
        )}
      </div>

      <button className="btn-logout" onClick={logout}>Выйти</button>
    </div>
  );
};