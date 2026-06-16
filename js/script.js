// ------------------------------
// CONFIG (replace with your own key)
// ------------------------------
const TMDB_API_KEY = '';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// ------------------------------
// DOM ELEMENTS
// ------------------------------
const grid = document.getElementById('grid');
const qInput = document.getElementById('q');
const searchBtn = document.getElementById('searchBtn');
const resultsInfo = document.getElementById('resultsInfo');

const modal = document.getElementById('playerModal');
const closeBtn = document.getElementById('closeBtn');
const playerIframe = document.getElementById('playerIframe');

const detailTitle = document.getElementById('detailTitle');
const detailTagline = document.getElementById('detailTagline');
const detailOverview = document.getElementById('detailOverview');
const extraMeta = document.getElementById('extraMeta');

const tvControls = document.getElementById('tvControls');
const movieControls = document.getElementById('movieControls');
const seasonSelect = document.getElementById('seasonSelect');
const episodeSelect = document.getElementById('episodeSelect');
const playEpisodeBtn = document.getElementById('playEpisodeBtn');
const playMovieBtn = document.getElementById('playMovieBtn');

// ------------------------------
// TMDB GET WRAPPER
// ------------------------------
async function tmdbGet(path, params = {}) {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY is missing.');
  }

  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', TMDB_API_KEY);

  for (const k in params) {
    url.searchParams.set(k, params[k]);
  }

  const res = await fetch(url.href);

  if (!res.ok) {
    const txt = await res.text();
    throw new Error('TMDb fetch failed: ' + res.status + ' ' + txt);
  }

  return res.json();
}

// ------------------------------
// SEARCH (Movies + TV)
// ------------------------------
async function search(query) {
  grid.innerHTML = '';
  resultsInfo.textContent = 'Searching...';

  try {
    const data = await tmdbGet('/search/multi', {
      query: encodeURIComponent(query),
    });

    resultsInfo.textContent = `Results: ${data.results.length} (showing first 40)`;
    data.results.slice(0, 40).forEach(renderCard);
  } catch (err) {
    resultsInfo.textContent = 'Search failed: ' + err.message;
  }
}

// ------------------------------
// RENDER CARD
// ------------------------------
function renderCard(item) {
  const div = document.createElement('div');
  div.className = 'card';

  const img = document.createElement('img');
  img.className = 'poster';

  const poster = item.poster_path || item.backdrop_path;

  img.src = poster
    ? IMAGE_BASE + poster
    : 'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600"><rect width="100%" height="100%" fill="#111"/><text x="50%" y="50%" fill="#666" font-size="18" text-anchor="middle">No Image</text></svg>'
      );

  img.alt = item.title || item.name || 'title';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = item.title || item.name || 'Untitled';

  const sub = document.createElement('div');
  sub.className = 'sub';
  sub.textContent = `${(item.media_type || 'movie').toUpperCase()} • ${
    item.release_date || item.first_air_date || ''
  }`;

  const ov = document.createElement('div');
  ov.className = 'overview';

  meta.appendChild(title);
  meta.appendChild(sub);
  meta.appendChild(ov);

  div.appendChild(img);
  div.appendChild(meta);

  div.addEventListener('click', () => openDetails(item));
  grid.appendChild(div);
}

// ------------------------------
// CARD ANIMATION
// ------------------------------
function animateCards() {
  document.querySelectorAll('.card').forEach((card, i) => {
    card.classList.add('animate__animated', 'animate__zoomIn');
    card.style.setProperty('--animate-duration', '0.6s');
    card.style.animationDelay = `${i * 0.05}s`;
  });
}

// ------------------------------
// OPEN DETAILS (movie/tv)
// ------------------------------
async function openDetails(item) {
  detailTitle.textContent = '';
  detailTagline.textContent = '';
  detailOverview.textContent = '';
  extraMeta.textContent = '';

  tvControls.style.display = 'none';
  movieControls.style.display = 'none';
  playerIframe.src = '';

  const type =
    item.media_type === 'tv' || item.media_type === 'movie'
      ? item.media_type
      : item.title
      ? 'movie'
      : 'tv';

  try {
    // ------------------------------
    // MOVIES
    // ------------------------------
    if (type === 'movie') {
      const details = await tmdbGet(`/movie/${item.id}`, {
        append_to_response: 'credits',
      });

      detailTitle.textContent =
        details.title +
        (details.release_date ? ` (${details.release_date.slice(0, 4)})` : '');

      detailTagline.textContent = details.tagline || '';
      detailOverview.textContent = details.overview || '';

      const directors = details.credits?.crew
        ?.filter((c) => c.job === 'Director')
        .map((d) => d.name)
        .join(', ');

      extraMeta.textContent = `Runtime: ${
        details.runtime || 'N/A'
      } min • Genres: ${(details.genres || [])
        .map((g) => g.name)
        .join(', ')} • Director: ${directors || 'N/A'}`;

      movieControls.style.display = 'block';

      playMovieBtn.onclick = () => {
        playerIframe.src = `https://vidsrc-embed.ru/embed/movie?tmdb=${item.id}&autoplay=1`;
        openModal();
      };

      // ------------------------------
      // TV SHOWS
      // ------------------------------
    } else {
      const details = await tmdbGet(`/tv/${item.id}`, {
        append_to_response: 'credits',
      });

      detailTitle.textContent =
        details.name +
        (details.first_air_date
          ? ` (${details.first_air_date.slice(0, 4)})`
          : '');

      detailOverview.textContent = details.overview || '';

      extraMeta.textContent = `Seasons: ${
        details.number_of_seasons
      } • Episodes: ${
        details.number_of_episodes
      } • Genres: ${(details.genres || []).map((g) => g.name).join(', ')}`;

      tvControls.style.display = 'block';
      seasonSelect.innerHTML = '';

      // populate seasons
      for (let s = 1; s <= details.number_of_seasons; s++) {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = `Season ${s}`;
        seasonSelect.appendChild(opt);
      }

      // load episodes
      async function loadEpisodes(seasonNum) {
        episodeSelect.innerHTML = '';

        try {
          const seasonData = await tmdbGet(
            `/tv/${item.id}/season/${seasonNum}`
          );

          seasonData.episodes.forEach((ep) => {
            const o = document.createElement('option');
            o.value = ep.episode_number;
            o.textContent = `${ep.episode_number}. ${ep.name}`;
            episodeSelect.appendChild(o);
          });
        } catch {
          for (let e = 1; e <= 24; e++) {
            const o = document.createElement('option');
            o.value = e;
            o.textContent = `Episode ${e}`;
            episodeSelect.appendChild(o);
          }
        }
      }

      seasonSelect.value = 1;
      loadEpisodes(1);

      seasonSelect.onchange = () =>
        loadEpisodes(Number(seasonSelect.value));

      playEpisodeBtn.onclick = () => {
        const s = seasonSelect.value;
        const e = episodeSelect.value;

        playerIframe.src = `https://vidsrc-embed.ru/embed/tv?tmdb=${item.id}&season=${s}&episode=${e}&autoplay=1`;
        openModal();
      };
    }
  } catch (err) {
    detailTitle.textContent =
      (item.title || item.name || 'Unknown') + ' — (failed to load details)';
    detailOverview.textContent = 'Error: ' + err.message;
  }

  openModal();
}

// ------------------------------
// MODAL CONTROL
// ------------------------------
function openModal() {
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

closeBtn.addEventListener('click', () => {
  playerIframe.src = '';
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
});

// ------------------------------
// RESET HOME (logo click)
// ------------------------------
document.querySelector('.logo').addEventListener('click', resetToHome);

async function resetToHome() {
  qInput.value = '';
  resultsInfo.textContent = 'Popular movies';
  grid.innerHTML = '';

  try {
    const data = await tmdbGet('/movie/popular', {
      language: 'en-US',
      page: 1,
    });

    data.results.slice(0, 20).forEach((r) => {
      r.media_type = 'movie';
      renderCard(r);
    });

    animateCards();
  } catch {
    resultsInfo.textContent = 'Failed to load popular movies.';
  }
}

// ------------------------------
// SEARCH EVENTS
// ------------------------------
searchBtn.addEventListener('click', () =>
  search(qInput.value.trim())
);

qInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});

// ------------------------------
// INITIAL POPULAR MOVIES
// ------------------------------
(async function initial() {
  try {
    const data = await tmdbGet('/movie/popular', {
      language: 'en-US',
      page: 1,
    });

    resultsInfo.textContent = 'Popular movies';

    data.results.slice(0, 20).forEach((r) => {
      r.media_type = 'movie';
      renderCard(r);
    });
  } catch {
    resultsInfo.textContent =
      'Welcome — search for a movie or TV show above.';
  }
})();
