import '../styles/notfound.scss';
import { assets } from "../images/assets";

export default function NotFound() {
  return (
    <>
      <main>
        <img src={assets.notfound} alt="404 girl" className='not-found-image' loading="lazy"/>
      </main>
    </>
  );
};