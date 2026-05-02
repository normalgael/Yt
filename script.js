const API_KEY = "AIzaSyDpF_QsoQG3w_UuVU-3Z3KfwmzYSaGqcFE";

// Expanded list of Invidious instances (including new additions from your list)
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://inv-ygg.nadeko.net", // Added from your list
  "https://invidious.jing.rocks",
  "https://invidious.perennialte.ch",
  "https://yt.drgnz.club",
  "https://inv.tux.pizza",
  "https://invidious.fdn.fr",
  "https://invidious.nerdvpn.de",
  "https://inv.thepixora.com",   // Included from your list
  "https://invidious.privacyredirect.com",
  "https://vid.puffyan.us",
  "https://yt.artemislena.eu",
  "https://invidious.lunar.icu",
  "https://invidious.flokinet.to"
];

const videosDiv = document.getElementById("videos");
const playerDiv = document.getElementById("player");
const searchBox = document.getElementById("searchBox");
const searchBtn = document.getElementById("searchBtn");
const loadingDiv = document.getElementById("loading");
const apiSource = document.getElementById("apiSource");

searchBox.addEventListener("keypress", function(event) {
  if (event.key === "Enter") search();
});

searchBtn.addEventListener("click", search);

apiSource.addEventListener("change", () => {
  if (searchBox.value.trim() !== "") {
    search();
  } else {
    loadTrending();
  }
});

loadTrending();

function showLoading(isShowing) {
  if (isShowing) {
    loadingDiv.style.display = "block";
    videosDiv.innerHTML = ""; 
  } else {
    loadingDiv.style.display = "none";
  }
}

// Live Visual Logger
function addLog(message, id = null) {
  const logLine = document.createElement("div");
  logLine.style.padding = "8px";
  logLine.style.fontFamily = "monospace";
  logLine.style.fontSize = "16px";
  logLine.style.textAlign = "left";
  logLine.style.gridColumn = "1 / -1";
  logLine.style.width = "100%";
  
  if (id) logLine.id = id;
  logLine.innerHTML = `⏳ ${message}`;
  logLine.style.color = "#aaa"; 
  
  videosDiv.appendChild(logLine);
}

function updateLog(id, success, message) {
  const logLine = document.getElementById(id);
  if (!logLine) return;

  if (success) {
    logLine.innerHTML = `✅ ${message}`;
    logLine.style.color = "#4ade80"; 
  } else {
    logLine.innerHTML = `❌ ${message}`;
    logLine.style.color = "#ff6b6b"; 
  }
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.style.color = "#ff6b6b";
  errorDiv.style.padding = "20px";
  errorDiv.style.textAlign = "center";
  errorDiv.style.gridColumn = "1 / -1"; 
  errorDiv.style.width = "100%";
  errorDiv.innerHTML = message;
  videosDiv.appendChild(errorDiv);
}

async function loadTrending() {
  const source = apiSource.value;
  showLoading(true);
  try {
    if (source === "youtube") {
      await fetchTrendingYouTube();
    } else {
      await fetchTrendingInvidious();
    }
  } catch (error) {
    console.error(error);
  } finally {
    showLoading(false);
  }
}

async function search() {
  const query = searchBox.value.trim();
  if (!query) return;

  const source = apiSource.value;
  showLoading(true);
  try {
    if (source === "youtube") {
      await fetchSearchYouTube(query);
    } else {
      await fetchSearchInvidious(query);
    }
  } catch (error) {
    console.error(error);
  } finally {
    showLoading(false);
  }
}

/* --- YOUTUBE API FETCHERS --- */

async function fetchTrendingYouTube() {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=20&regionCode=US&key=${API_KEY}`);
  if (!res.ok) {
    showError("YouTube API Limit Reached or Network Error");
    return;
  }
  const data = await res.json();
  const normalizedList = data.items.map(v => ({
    id: v.id,
    title: v.snippet.title,
    thumb: v.snippet.thumbnails.medium.url
  }));
  showVideos(normalizedList, "youtube");
}

async function fetchSearchYouTube(query) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(query)}&key=${API_KEY}`);
  if (!res.ok) {
    showError("YouTube API Limit Reached or Network Error");
    return;
  }
  const data = await res.json();
  const normalizedList = data.items.map(v => ({
    id: v.id.videoId,
    title: v.snippet.title,
    thumb: v.snippet.thumbnails.medium.url
  }));
  showVideos(normalizedList, "youtube");
}

/* --- INVIDIOUS API FETCHERS (RACING) --- */

function extractInvidiousData(v) {
  if (v.type && v.type !== "video") return null; 
  if (!v.videoId) return null;

  let thumbUrl = `https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`; 
  
  if (Array.isArray(v.videoThumbnails) && v.videoThumbnails.length > 0) {
    const bestThumb = v.videoThumbnails.find(t => t.quality === "medium") || v.videoThumbnails;
    if (bestThumb && bestThumb.url) thumbUrl = bestThumb.url;
  } else if (typeof v.thumbnail === "string") {
    thumbUrl = v.thumbnail;
  }

  return {
    id: v.videoId,
    title: v.title,
    thumb: thumbUrl
  };
}

async function fetchTrendingInvidious() {
  videosDiv.innerHTML = ""; 
  
  const requests = INVIDIOUS_INSTANCES.map(async (apiBase) => {
    const logId = `log-${Math.random().toString(36).substring(7)}`;
    addLog(`Testing ${apiBase}...`, logId);
    
    try {
      const res = await fetch(`${apiBase}/api/v1/popular`);
      if (!res.ok) throw new Error("CORS/Offline");
      
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid Data");
      
      const normalizedList = data.map(extractInvidiousData).filter(v => v !== null);
      if (normalizedList.length === 0) throw new Error("No videos returned");

      updateLog(logId, true, `${apiBase} (Winner!)`);
      return { apiBase, normalizedList }; 
    } catch (err) {
      updateLog(logId, false, `${apiBase} (${err.message})`);
      throw err; 
    }
  });

  try {
    const winner = await Promise.any(requests);
    await new Promise(resolve => setTimeout(resolve, 300)); 
    showVideos(winner.normalizedList, winner.apiBase);
  } catch (aggregateError) {
    // REMOVED AUTO-FALLBACK: User is now explicitly informed to change the source themselves.
    showError("All privacy instances failed due to CORS or limits. Please select 'YouTube API' from the dropdown above to continue.");
  }
}

async function fetchSearchInvidious(query) {
  videosDiv.innerHTML = "";

  const requests = INVIDIOUS_INSTANCES.map(async (apiBase) => {
    const logId = `log-${Math.random().toString(36).substring(7)}`;
    addLog(`Searching ${apiBase}...`, logId);
    
    try {
      const res = await fetch(`${apiBase}/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
      if (!res.ok) throw new Error("CORS/Offline");
      
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Invalid Data");
      
      const normalizedList = data.map(extractInvidiousData).filter(v => v !== null);
      if (normalizedList.length === 0) throw new Error("No videos returned");

      updateLog(logId, true, `${apiBase} (Winner!)`);
      return { apiBase, normalizedList }; 
    } catch (err) {
      updateLog(logId, false, `${apiBase} (${err.message})`);
      throw err; 
    }
  });

  try {
    const winner = await Promise.any(requests);
    await new Promise(resolve => setTimeout(resolve, 300));
    showVideos(winner.normalizedList, winner.apiBase);
  } catch (aggregateError) {
    // REMOVED AUTO-FALLBACK: User is now explicitly informed to change the source themselves.
    showError("All privacy instances failed due to CORS or limits. Please select 'YouTube API' from the dropdown above to continue.");
  }
}

/* --- UI UPDATES --- */

function showVideos(list, source) {
  videosDiv.innerHTML = "";

  if (!list || list.length === 0) {
    videosDiv.innerHTML = "<div style='text-align:center; width: 100%; grid-column: 1 / -1; color: #aaa;'>No videos found.</div>";
    return;
  }

  list.forEach(v => {
    const card = document.createElement("div");
    card.className = "video";

    card.innerHTML = `
      <img src="${v.thumb}" alt="${v.title} thumbnail">
      <div class="video-title">${v.title}</div>
    `;

    card.onclick = () => playVideo(v.id, source);
    videosDiv.appendChild(card);
  });
}

function playVideo(id, source) {
  playerDiv.style.display = "flex";
  
  const embedUrl = source === "youtube" 
    ? `https://www.youtube.com/embed/${id}?autoplay=1` 
    : `${source}/embed/${id}?autoplay=1`;
  
  playerDiv.innerHTML = `
    <iframe
      width="100%"
      height="480"
      src="${embedUrl}"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen>
    </iframe>
  `;
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
