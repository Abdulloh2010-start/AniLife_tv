import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

const manifest = {"theme_color":"#8936FF","background_color":"#2EC6FE","icons":[{"purpose":"maskable","sizes":"512x512","src":"icon512_maskable.png","type":"image/png"},{"purpose":"any","sizes":"512x512","src":"icon512_rounded.png","type":"image/png"}],"orientation":"any","display":"standalone","dir":"auto","lang":"ru","name":"AniLife_tv","short_name":"Anime hosting","description":"in this app you can watch new animes"};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{html,css,js,ico,png,svg}"],
      },
      manifest: manifest,
    })
  ],
});