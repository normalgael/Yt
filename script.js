const API_KEY = "AIzaSyDpF_QsoQG3w_UuVU-3Z3KfwmzYSaGqcFE";

async function search() {

  const query = document.getElementById("searchBox").value;

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=20&key=${API_KEY}`
  );

  const data = await res.json();

  const container = document.getElementById("videos");
  container.innerHTML = "";

  data.items.forEach(video => {

    const id = video.id.videoId;
    const title = video.snippet.title;
    const thumb = video.snippet.thumbnails.medium.url;

    const div = document.createElement("div");
    div.className = "video";

    div.innerHTML = `
      <img src="${thumb}">
      <p>${title}</p>
    `;

    div.onclick = () => playVideo(id);

    container.appendChild(div);

  });
}

function playVideo(id){

  document.getElementById("player").innerHTML = `
    <iframe
      width="100%"
      height="500"
      src="https://www.youtube.com/embed/${id}?autoplay=1"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen>
    </iframe>
  `;

}
