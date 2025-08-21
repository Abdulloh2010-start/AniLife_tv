import '../styles/notfound.scss';
import { assets } from "../images/assets";
import { Helmet } from '@dr.pogodin/react-helmet';

export default function NotFound() {
  return (
    <main>
      <Helmet>
        <title>Страница не найдена — AniLife_tv</title>
        <meta property="og:title" content="Страница не найдена — AniLifeTV" />
        <meta property="og:description" content="К сожалению, запрашиваемая страница не найдена на AniLifeTV." />
        <meta property="og:type" content="website" />
        <meta name="description" content="Ошибка 404 — страница не найдена" />
        <link rel="canonical" href="https://anilifetv.vercel.app/notfound" />
      </Helmet>
      <img src={assets.notfound} alt="404 girl" className='not-found-image' loading="lazy"/>
    </main>
  );
};