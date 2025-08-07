import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const ScheduleContext = createContext();

export const ScheduleProvider = ({ children }) => {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get('https://api.anilibria.tv/v3/title/schedule')
      .then(res => setSchedule(res.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScheduleContext.Provider value={{ schedule, loading }}>
      {children}
    </ScheduleContext.Provider>
  );
};

export const useSchedule = () => useContext(ScheduleContext);