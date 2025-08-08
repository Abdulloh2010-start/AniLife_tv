export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.anilibria.tv/v3/title/schedule', {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'AniLibria API Error' });
    }

    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AniLibria API' });
  }
}