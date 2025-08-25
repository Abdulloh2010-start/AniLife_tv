import { NavLink, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { assets } from "../images/assets";
import "../styles/sidebar.scss";

export default function SideBar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState('dark'); 

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            setTheme(currentTheme);
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });

        const initialTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        setTheme(initialTheme);

        return () => observer.disconnect();
    }, []);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const location = useLocation();
    const currentPath = location.pathname;

    
    const menuIcon = theme === 'dark' ? assets.white_menu : assets.dark_menu;
    const closeIcon = theme === 'dark' ? assets.white_close : assets.dark_close;
    const homeIcon = theme === 'dark' ? assets.white_home : currentPath === '/' ? assets.white_home : assets.dark_home;
    const relizIcon = theme === 'dark' ? assets.white_reliz : currentPath === '/relizes' ? assets.white_reliz : assets.dark_reliz;
    const randomIcon = theme === 'dark' ? assets.white_random : currentPath === '/random' ? assets.white_random : assets.dark_random;
    const settingIcon = theme === 'dark' ? assets.white_setting : currentPath === '/settings' ? assets.white_setting : assets.dark_setting;
    const userIcon = theme === 'dark' ? assets.white_user : currentPath === '/profile' ? assets.white_user : assets.dark_user;
    const helpIcon = theme === 'dark' ? assets.white_help : currentPath === '/help' ? assets.white_help : assets.dark_help;


    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1 className="logo">AniLife_tv</h1>
                    <button className="menu-toggle" onClick={toggleMenu}>
                        <img src={isMenuOpen ? closeIcon : menuIcon} alt="menu toggle" loading="lazy"/>
                    </button>
                </div>
                
                <nav className={isMenuOpen ? "open" : ""}>
                    <NavLink to="/" onClick={toggleMenu}><img src={homeIcon} alt="0" loading="lazy"/>Главная</NavLink>
                    <NavLink to="/relizes" onClick={toggleMenu}><img src={relizIcon} alt="0" loading="lazy"/>Релизы</NavLink>
                    <NavLink to="/random" onClick={toggleMenu}><img src={randomIcon} alt="0" loading="lazy"/>Рандом</NavLink>
                    <NavLink to="/settings" onClick={toggleMenu}><img src={settingIcon} alt="0" loading="lazy"/>Настройки</NavLink>
                    <NavLink to="/profile" onClick={toggleMenu}><img src={userIcon} alt="0" loading="lazy"/>Профиль</NavLink>
                    <NavLink to="/help" onClick={toggleMenu}><img src={helpIcon} alt="0" loading="lazy"/>Помощь</NavLink>
                    <NavLink to="/chat">Чат</NavLink>
                </nav>
            </aside>
            <main className="content">
                <Outlet />
            </main>
        </div>
    );
};