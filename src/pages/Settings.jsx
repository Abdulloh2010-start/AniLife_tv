import { useContext } from "react";
import { ThemeContext } from "../components/ThemeContext";
import { Helmet } from '@dr.pogodin/react-helmet';
import "../styles/settings.scss";

export default function Settings() {
    const { theme, setTheme } = useContext(ThemeContext);

    return (
        <main className="settings-page">
            <Helmet>
                <title>Настройки — AniLifeTV</title>
                <meta name="description" content="Персонализируйте свой опыт на AniLifeTV: настройка профиля, темы оформления, уведомлений и других параметров." />
                <meta property="og:title" content="Настройки — AniLifeTV" />
                <meta property="og:description" content="Изменяйте параметры профиля, тему и уведомления для комфортного использования AniLifeTV." />
                <meta property="og:type" content="website" />
                <link rel="canonical" href="https://anilifetv.vercel.app/settings" />
            </Helmet>
            <h2>Настройки</h2>
            <section className="settings-group">
                <label>Тема интерфейса:</label>
                <div className="theme-buttons">
                    <button
                        className={theme === "light" ? "active" : ""}
                        onClick={() => setTheme("light")}
                    >
                        Светлая
                    </button>
                    <button
                        className={theme === "dark" ? "active" : ""}
                        onClick={() => setTheme("dark")}
                    >
                        Тёмная
                    </button>
                    <button
                        className={theme === "system" ? "active" : ""}
                        onClick={() => setTheme("system")}
                    >
                        Системная
                    </button>
                </div>
            </section>
        </main>
    );
}