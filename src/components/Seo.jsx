import { Helmet } from '@dr.pogodin/react-helmet';
export default function Seo({title,description,url,image,imageWidth,imageHeight,jsonLd,canonical}) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : null
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical || url} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      {image && <meta property="og:image" content={image} />}
      {imageWidth && <meta property="og:image:width" content={imageWidth} />}
      {imageHeight && <meta property="og:image:height" content={imageHeight} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
      {ld && <script type="application/ld+json">{ld}</script>}
    </Helmet>
  )
};