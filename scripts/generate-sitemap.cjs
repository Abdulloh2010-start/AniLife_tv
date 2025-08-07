// scripts/generate-sitemap.cjs
const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');

const sitemap = new SitemapStream({ hostname: 'https://anilifetv.vercel.app' });
const writeStream = createWriteStream('./public/sitemap.xml');

// Прокачиваем sitemap в файл
sitemap.pipe(writeStream);

const routes = [
  '/',
  '/relizes',
  '/random',
  '/rules',
  '/help',
  '/politic',
  '/terms',
  '/settings',
  '/profile',
  '/payment',
  '/paywall',
];

routes.forEach((route) => {
  sitemap.write({ url: route, changefreq: 'weekly', priority: 0.7 });
});

sitemap.end();

streamToPromise(sitemap).then(() => {
  console.log('✅ Sitemap создан: public/sitemap.xml');
}).catch((err) => {
  console.error('❌ Ошибка при генерации sitemap:', err);
});