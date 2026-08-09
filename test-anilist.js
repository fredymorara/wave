const query = `query { Page(page:1, perPage:30) { media(averageScore_greater: 90, type: ANIME, sort: SCORE_DESC) { id, idMal, title { romaji } } } }`;
fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(r => console.log(JSON.stringify(r))).catch(console.error);
