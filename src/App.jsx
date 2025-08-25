import { Route, Routes, Navigate } from 'react-router-dom';
import SideBar from './components/SideBar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Relizes from './pages/Relizes';
import Random from './pages/Random';
import AnimeInfo from './pages/AnimeInfo';
import Rules from './pages/Rules';
import Help from './pages/Help';
import Politic from './pages/Politic';
import Terms from './pages/Terms';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import LoginPage from './pages/LoginPage';
import NotFound from './pages/NotFound';
import ChatPage from './pages/ChatPage';

export default function App() {
  return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><SideBar /></ProtectedRoute>}>
          <Route index element={<Home />} />
          <Route path="relizes" element={<Relizes />} />
          <Route path="random" element={<Random />} />
          <Route path="anime/:id" element={<AnimeInfo />} />
          <Route path="rules" element={<Rules />} />
          <Route path="help" element={<Help />} />
          <Route path="politic" element={<Politic />} />
          <Route path="terms" element={<Terms />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="chat" element={<ChatPage />}/>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
  );
};