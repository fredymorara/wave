const query = `query { GenreCollection }`;
fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(r => console.log(JSON.stringify(r))).catch(console.error);
