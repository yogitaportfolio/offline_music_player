const audioPlayer = document.getElementById('audio-player');
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const volume = document.getElementById('volume');
const progress = document.getElementById('progress');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const songTitleEl = document.getElementById('song-title');
const artistEl = document.getElementById('artist');
const albumArtEl = document.getElementById('album-art');
const playTimestampEl = document.getElementById('play-timestamp');
const songList = document.getElementById('song-list');
const songInput = document.getElementById('song-input');
const dropZone = document.getElementById('drop-zone');
const loading = document.getElementById('loading');
const fetchBollywoodSongsBtn = document.getElementById('fetch-bollywood-songs');
const searchSongsInput = document.getElementById('search-songs');
const genreFilter = document.getElementById('genre-filter');
const sortFilter = document.getElementById('sort-filter');
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const addToPlaylistSelect = document.getElementById('add-to-playlist');
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const playlistList = document.getElementById('playlist-list');
const searchPlaylistsInput = document.getElementById('search-playlists');
const playlistSongsList = document.getElementById('playlist-songs-list');
const playlistSongsTitle = document.getElementById('playlist-songs-title');
const clearPlaylistSongsBtn = document.getElementById('clear-playlist-songs-btn');
const deletePlaylistBtn = document.getElementById('delete-playlist-btn');
const sidebarContainer = document.getElementById('sidebar-container');
const hamburgerMenu = document.getElementById('hamburger-menu');
const nowPlayingPoster = document.getElementById('now-playing-poster');
const nowPlayingTitle = document.getElementById('now-playing-title');
const nowPlayingArtist = document.getElementById('now-playing-artist');
const nowPlayingGenre = document.getElementById('now-playing-genre');

let songs = [];
let playlists = [];
let genreMappings = [];
let currentSongIndex = -1;
let currentPlaylistIndex = -1;
let isPlaying = false;
let songIdCounter = 0;
let playlistIdCounter = 0;

// Spotify Credentials
const SPOTIFY_CLIENT_ID = 'ee9e3bf3c9d84235a226cfbad5d2bbaf';
const SPOTIFY_CLIENT_SECRET = '39b90288788944fabb7669d3428ecdc6';
let spotifyAccessToken = '';

// Toggle Sidebar on Mobile
function toggleSidebar() {
  sidebarContainer.classList.toggle('open');
}

// Initialize Theme
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    themeIcon.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
    </svg>`;
  } else {
    themeIcon.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
    </svg>`;
  }
}

// Fetch Spotify Access Token
async function fetchSpotifyAccessToken() {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `grant_type=client_credentials&client_id=${SPOTIFY_CLIENT_ID}&client_secret=${SPOTIFY_CLIENT_SECRET}`
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to fetch Spotify access token with status ${response.status}: ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    spotifyAccessToken = data.access_token;
    return data.access_token;
  } catch (error) {
    console.error('Error fetching Spotify access token:', error);
    throw error;
  }
}

// Format Timestamp
function formatTimestamp(date) {
  const options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: true
  };
  return date.toLocaleString('en-US', options).replace(',', '');
}

// Normalize Genre
function normalizeGenre(genre) {
  if (!genre || typeof genre !== 'string') return 'Unknown';
  return genre.trim().toLowerCase().replace(/(^|\s)\w/g, char => char.toUpperCase());
}

// Preload genres.json
async function preloadGenreJson() {
  try {
    const response = await fetch('genres.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch genres.json with status ${response.status}`);
    }
    genreMappings = await response.json();
    console.log('Preloaded genre mappings:', genreMappings);
    if (!Array.isArray(genreMappings) || !genreMappings.every(mapping => 
      'artist' in mapping && 'song' in mapping && 'genre' in mapping)) {
      throw new Error('Invalid format in genres.json: Expected an array of objects with "artist", "song", and "genre" properties.');
    }
    const validGenres = [
      'Bollywood', 'Pop', 'Rock', 'Haryanvi', 'Punjabi', 'Bhojpuri', 
      'Classical', 'Hip-Hop', 'Jazz', 'Folk', 'Devotional', 'Unknown'
    ];
    const invalidGenres = [...new Set(genreMappings.map(mapping => normalizeGenre(mapping.genre)))].filter(genre => !validGenres.includes(genre));
    if (invalidGenres.length > 0) {
      console.warn('The following genres in genres.json do not match the dropdown options:', invalidGenres);
    }
  } catch (error) {
    console.error('Error preloading genres.json:', error);
    genreMappings = [];
    alert('Failed to load genres.json. Genres will be assigned using default logic.');
  }
}

// Get Genre from JSON
function getGenreFromJson(song) {
  for (const mapping of genreMappings) {
    const artistMatch = mapping.artist ? song.artist.toLowerCase().includes(mapping.artist.toLowerCase()) : true;
    const songMatch = mapping.song ? song.name.toLowerCase().includes(mapping.song.toLowerCase()) : true;
    if (artistMatch && songMatch) {
      return normalizeGenre(mapping.genre);
    }
  }
  return null;
}

// Load Local Songs
function loadLocalSongs(files) {
  console.log('Loading local songs:', files);
  loading.classList.remove('hidden');
  const fileArray = Array.from(files).filter(file => file.type.startsWith('audio/'));
  if (fileArray.length === 0) {
    console.log('No audio files selected');
    loading.classList.add('hidden');
    alert('No audio files selected.');
    return;
  }
  let processed = 0;
  fileArray.forEach(file => {
    jsmediatags.read(file, {
      onSuccess: (tag) => {
        console.log('jsmediatags success for file:', file.name);
        const picture = tag.tags.picture;
        let img = 'https://via.placeholder.com/300?text=' + encodeURIComponent(file.name.replace(/\.[^/.]+$/, ''));
        if (picture) {
          const base64String = btoa(String.fromCharCode(...new Uint8Array(picture.data)));
          img = `data:image/${picture.format};base64,${base64String}`;
        }
        const song = {
          id: songIdCounter++,
          name: tag.tags.title || file.name.replace(/\.[^/.]+$/, ''),
          artist: tag.tags.artist || 'Unknown Artist',
          img: img,
          genre: null,
          source: URL.createObjectURL(file),
        };
        song.genre = getGenreFromJson(song) || normalizeGenre(tag.tags.genre) || 'Unknown';
        songs.push(song);
        processed++;
        if (processed === fileArray.length) {
          loading.classList.add('hidden');
          updatePlaylistDropdown();
          showSongs();
        }
      },
      onError: (error) => {
        console.error('jsmediatags error for file:', file.name, error);
        const song = {
          id: songIdCounter++,
          name: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          img: 'https://via.placeholder.com/300?text=' + encodeURIComponent(file.name.replace(/\.[^/.]+$/, '')),
          genre: null,
          source: URL.createObjectURL(file),
        };
        song.genre = getGenreFromJson(song) || 'Unknown';
        songs.push(song);
        processed++;
        if (processed === fileArray.length) {
          loading.classList.add('hidden');
          updatePlaylistDropdown();
          showSongs();
        }
      }
    });
  });
}

// Load Bollywood Songs from Spotify (Mocked)
async function loadBollywoodSongs(attempts = 3) {
  console.log('Loading Bollywood songs (mocked)');
  loading.classList.remove('hidden');
  try {
    const data = {
      items: [
        {
          track: {
            name: "Tum Hi Ho",
            artists: [{ name: "Arijit Singh" }],
            album: { images: [{ url: "https://via.placeholder.com/300?text=Tum+Hi+Ho" }] },
            preview_url: ""
          }
        },
        {
          track: {
            name: "Kal Ho Naa Ho",
            artists: [{ name: "Sonu Nigam" }],
            album: { images: [{ url: "https://via.placeholder.com/300?text=Kal+Ho+Naa+Ho" }] },
            preview_url: ""
          }
        },
        {
          track: {
            name: "Morni Banke",
            artists: [{ name: "Guru Randhawa" }],
            album: { images: [{ url: "https://via.placeholder.com/300?text=Morni+Banke" }] },
            preview_url: ""
          }
        },
        {
          track: {
            name: "Laila Main Laila",
            artists: [{ name: "Pawni Pandey" }],
            album: { images: [{ url: "https://via.placeholder.com/300?text=Laila+Main+Laila" }] },
            preview_url: ""
          }
        },
        {
          track: {
            name: "Raghupati Raghav",
            artists: [{ name: "Traditional" }],
            album: { images: [{ url: "https://via.placeholder.com/300?text=Raghupati+Raghav" }] },
            preview_url: ""
          }
        }
      ]
    };
    data.items.forEach((item, index) => {
      const track = item.track;
      if (!track) return;
      const artists = track.artists.map(artist => artist.name).join(', ');
      const song = {
        id: songIdCounter++,
        name: track.name,
        artist: artists || 'Unknown Artist',
        img: track.album.images[0]?.url || 'https://via.placeholder.com/300?text=' + encodeURIComponent(track.name),
        genre: null,
        source: track.preview_url || '',
      };
      // Assign genres based on the song/artist
      if (index === 0 || index === 1) {
        song.genre = getGenreFromJson(song) || normalizeGenre('Bollywood');
      } else if (index === 2) {
        song.genre = getGenreFromJson(song) || normalizeGenre('Punjabi');
      } else if (index === 3) {
        song.genre = getGenreFromJson(song) || normalizeGenre('Bollywood');
      } else if (index === 4) {
        song.genre = getGenreFromJson(song) || normalizeGenre('Devotional');
      }
      songs.push(song);
    });
    loading.classList.add('hidden');
    updatePlaylistDropdown();
    showSongs();
  } catch (error) {
    console.error('Mock Bollywood songs error:', error);
    loading.classList.add('hidden');
    alert('Failed to load Bollywood songs (mocked).');
  }
}

// Show Songs with Filters
function showSongs() {
  console.log('Showing songs:', songs);
  songList.innerHTML = '';
  let filteredSongs = [...songs];

  const searchTerm = searchSongsInput.value.toLowerCase();
  if (searchTerm) {
    filteredSongs = filteredSongs.filter(song =>
      song.name.toLowerCase().includes(searchTerm) || song.artist.toLowerCase().includes(searchTerm)
    );
  }

  const selectedGenre = genreFilter.value;
  if (selectedGenre) {
    filteredSongs = filteredSongs.filter(song => song.genre === selectedGenre);
  }

  const sortOption = sortFilter.value;
  filteredSongs.sort((a, b) => {
    if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
    if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
    if (sortOption === 'artist-asc') return a.artist.localeCompare(b.artist);
    if (sortOption === 'artist-desc') return b.artist.localeCompare(a.artist);
    return 0;
  });

  if (filteredSongs.length === 0) {
    songList.innerHTML = '<li class="p-2 text-gray-600">No songs found.</li>';
    return;
  }

  filteredSongs.forEach(song => {
    const li = document.createElement('li');
    li.className = 'p-2 bg-gray-100 rounded flex justify-between items-center';
    li.innerHTML = `
      <span class="cursor-pointer" onclick="renderCurrentSong(${song.id})">${song.name} - ${song.artist} (${song.genre})</span>
    `;
    songList.appendChild(li);
  });
}

// Render Current Song
function renderCurrentSong(id) {
  currentSongIndex = songs.findIndex(song => song.id === id);
  if (currentSongIndex === -1) {
    console.error('Song not found with ID:', id);
    alert('Song not found.');
    return;
  }
  const song = songs[currentSongIndex];
  if (!song.source) {
    console.error('No source for song:', song);
    alert('No valid streaming URL for this song.');
    return;
  }
  audioPlayer.src = song.source;
  songTitleEl.textContent = song.name;
  artistEl.textContent = song.artist;
  albumArtEl.src = song.img;

  // Update Right Sidebar (Now Playing)
  nowPlayingPoster.src = song.img;
  nowPlayingTitle.textContent = song.name;
  nowPlayingArtist.textContent = song.artist;
  nowPlayingGenre.textContent = `Genre: ${song.genre}`;

  const playTime = new Date();
  playTimestampEl.textContent = `Started playing at ${formatTimestamp(playTime)}`;

  audioPlayer.load();
  audioPlayer.play().catch(error => {
    console.error('Playback error:', error);
    alert('Failed to play song.');
  });
  isPlaying = true;
  playPauseBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"></path>
  </svg>`;
  updateProgress();
}

// Play/Pause Song
function playPauseSong() {
  if (currentSongIndex === -1) {
    alert('No song selected.');
    return;
  }
  if (isPlaying) {
    audioPlayer.pause();
    playPauseBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-6.504 3.76A1 1 0 017 14V10a1 1 0 011.248-.968l6.504 3.76a1 1 0 010 1.736z"></path>
    </svg>`;
    isPlaying = false;
  } else {
    audioPlayer.play().catch(error => {
      console.error('Playback error:', error);
      alert('Failed to play song.');
    });
    playPauseBtn.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6"></path>
    </svg>`;
    isPlaying = true;
  }
}

// Next/Previous Song
function nextSong() {
  if (songs.length === 0) {
    alert('No songs loaded.');
    return;
  }
  currentSongIndex = (currentSongIndex + 1) % songs.length;
  renderCurrentSong(songs[currentSongIndex].id);
}

function prevSong() {
  if (songs.length === 0) {
    alert('No songs loaded.');
    return;
  }
  currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  renderCurrentSong(songs[currentSongIndex].id);
}

// Update Progress Bar
function updateProgress() {
  const { currentTime, duration } = audioPlayer;
  const progressPercent = (currentTime / duration) * 100 || 0;
  progress.value = progressPercent;
  progress.style.setProperty('--progress', `${progressPercent}%`);
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  currentTimeEl.textContent = formatTime(currentTime);
  durationEl.textContent = formatTime(duration);
}

function setProgress(e) {
  const width = progress.clientWidth;
  const clickX = e.offsetX;
  const duration = audioPlayer.duration;
  audioPlayer.currentTime = (clickX / width) * duration;
}

// Volume Control
function setVolume() {
  const volumeValue = volume.value / 100;
  audioPlayer.volume = volumeValue;
  volume.style.setProperty('--volume', volume.value);
}

// Update Playlist Dropdown
function updatePlaylistDropdown() {
  addToPlaylistSelect.innerHTML = '<option value="">Add to Playlist</option>';
  playlists.forEach(playlist => {
    const option = document.createElement('option');
    option.value = playlist.id;
    option.textContent = playlist.name;
    addToPlaylistSelect.appendChild(option);
  });
}

// Add to Playlist
function addToPlaylist() {
  console.log('addToPlaylist called');
  if (currentSongIndex === -1) {
    console.error('No song selected. Current song index:', currentSongIndex);
    alert('No song selected.');
    return;
  }
  const playlistId = parseInt(addToPlaylistSelect.value);
  if (isNaN(playlistId)) {
    console.error('Invalid playlist ID:', addToPlaylistSelect.value);
    alert('Please select a playlist.');
    return;
  }
  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) {
    console.error('Playlist not found with ID:', playlistId);
    alert('Playlist not found.');
    return;
  }
  const song = songs[currentSongIndex];
  if (playlist.songs.some(s => s.id === song.id)) {
    console.warn('Song already in playlist:', song);
    alert('Song already in playlist.');
    return;
  }
  playlist.songs.push(song);
  localStorage.setItem('playlists', JSON.stringify(playlists));
  console.log('Song added to playlist:', playlist);
  if (currentPlaylistIndex === playlistId) {
    renderPlaylistSongs(playlistId);
  }
  renderPlaylists();
  addToPlaylistSelect.value = '';
}

// Create Playlist
function createPlaylist() {
  console.log('createPlaylist called');
  const name = prompt('Enter playlist name:');
  if (!name) return;
  const newPlaylist = {
    id: playlistIdCounter++,
    name: name.trim(),
    songs: []
  };
  playlists.push(newPlaylist);
  localStorage.setItem('playlists', JSON.stringify(playlists));
  console.log('New playlist created:', newPlaylist);
  updatePlaylistDropdown();
  renderPlaylists();
}

// Delete Playlist
function deletePlaylist() {
  console.log('deletePlaylist called');
  if (currentPlaylistIndex === -1) {
    console.error('No playlist selected for deletion');
    alert('No playlist selected.');
    return;
  }
  if (!confirm('Are you sure you want to delete this playlist?')) return;
  playlists = playlists.filter(p => p.id !== currentPlaylistIndex);
  localStorage.setItem('playlists', JSON.stringify(playlists));
  console.log('Playlist deleted, ID:', currentPlaylistIndex);
  currentPlaylistIndex = -1;
  updatePlaylistDropdown();
  renderPlaylists();
  playlistSongsList.innerHTML = '<li class="p-2 text-gray-600">Select a playlist to view songs.</li>';
  playlistSongsTitle.textContent = 'Playlist Songs';
  clearPlaylistSongsBtn.classList.add('hidden');
  deletePlaylistBtn.classList.add('hidden');
}

// Clear Playlist Songs
function clearPlaylistSongs() {
  console.log('clearPlaylistSongs called');
  if (currentPlaylistIndex === -1) {
    console.error('No playlist selected to clear songs');
    alert('No playlist selected.');
    return;
  }
  if (!confirm('Are you sure you want to clear all songs from this playlist?')) return;
  const playlist = playlists.find(p => p.id === currentPlaylistIndex);
  if (!playlist) {
    console.error('Playlist not found:', currentPlaylistIndex);
    return;
  }
  playlist.songs = [];
  localStorage.setItem('playlists', JSON.stringify(playlists));
  console.log('Songs cleared from playlist:', playlist);
  renderPlaylistSongs(currentPlaylistIndex);
  renderPlaylists();
}

// Render Playlists
function renderPlaylists() {
  console.log('renderPlaylists called');
  playlistList.innerHTML = '';
  let filteredPlaylists = [...playlists];
  const searchTerm = searchPlaylistsInput.value.toLowerCase();
  if (searchTerm) {
    filteredPlaylists = filteredPlaylists.filter(playlist =>
      playlist.name.toLowerCase().includes(searchTerm)
    );
  }
  if (filteredPlaylists.length === 0) {
    playlistList.innerHTML = '<li class="p-2 text-gray-600">No playlists found.</li>';
    return;
  }
  filteredPlaylists.forEach(playlist => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.innerHTML = `
      <img src="https://via.placeholder.com/32?text=🎵" alt="Playlist Thumbnail">
      <span class="flex-1" onclick="renderPlaylistSongs(${playlist.id})">${playlist.name} (${playlist.songs.length} songs)</span>
    `;
    playlistList.appendChild(li);
  });
}

// Render Playlist Songs
function renderPlaylistSongs(playlistId) {
  console.log('renderPlaylistSongs called with ID:', playlistId);
  currentPlaylistIndex = playlistId;
  playlistSongsList.innerHTML = '';
  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) {
    console.error('Playlist not found:', playlistId);
    playlistSongsList.innerHTML = '<li class="p-2 text-gray-600">Playlist not found.</li>';
    playlistSongsTitle.textContent = 'Playlist Songs';
    clearPlaylistSongsBtn.classList.add('hidden');
    deletePlaylistBtn.classList.add('hidden');
    return;
  }
  playlistSongsTitle.textContent = `${playlist.name} Songs`;
  clearPlaylistSongsBtn.classList.remove('hidden');
  deletePlaylistBtn.classList.remove('hidden');
  if (playlist.songs.length === 0) {
    playlistSongsList.innerHTML = '<li class="p-2 text-gray-600">No songs in this playlist.</li>';
    return;
  }
  playlist.songs.forEach(song => {
    const li = document.createElement('li');
    li.className = 'p-2 bg-gray-200 rounded flex justify-between items-center';
    li.innerHTML = `
      <span class="cursor-pointer" onclick="renderCurrentSong(${song.id})">${song.name} - ${song.artist}</span>
      <button class="remove-song-btn" onclick="removeSongFromPlaylist(${playlistId}, ${song.id})">Remove</button>
    `;
    playlistSongsList.appendChild(li);
  });
}

// Remove Song from Playlist
function removeSongFromPlaylist(playlistId, songId) {
  console.log('removeSongFromPlaylist called with playlistId:', playlistId, 'songId:', songId);
  const playlist = playlists.find(p => p.id === playlistId);
  if (!playlist) {
    console.error('Playlist not found:', playlistId);
    return;
  }
  playlist.songs = playlist.songs.filter(song => song.id !== songId);
  localStorage.setItem('playlists', JSON.stringify(playlists));
  console.log('Song removed from playlist:', playlist);
  renderPlaylists();
  renderPlaylistSongs(playlistId);
}

// Event Listeners
dropZone.addEventListener('dragover', (e) => {
  console.log('Dragover event triggered');
  e.preventDefault();
  dropZone.classList.add('border-blue-500');
});
dropZone.addEventListener('dragleave', () => {
  console.log('Dragleave event triggered');
  dropZone.classList.remove('border-blue-500');
});
dropZone.addEventListener('drop', (e) => {
  console.log('Drop event triggered');
  e.preventDefault();
  dropZone.classList.remove('border-blue-500');
  loadLocalSongs(e.dataTransfer.files);
});

songInput.addEventListener('change', (e) => {
  console.log('File input change event triggered');
  loadLocalSongs(e.target.files);
});
fetchBollywoodSongsBtn.addEventListener('click', () => {
  console.log('Fetch Bollywood songs clicked');
  loadBollywoodSongs();
});
playPauseBtn.addEventListener('click', playPauseSong);
prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);
volume.addEventListener('input', setVolume);
audioPlayer.addEventListener('timeupdate', updateProgress);
audioPlayer.addEventListener('loadedmetadata', updateProgress);
audioPlayer.addEventListener('ended', nextSong);
progress.addEventListener('click', setProgress);
searchSongsInput.addEventListener('input', showSongs);
genreFilter.addEventListener('change', showSongs);
sortFilter.addEventListener('change', showSongs);
themeToggleBtn.addEventListener('click', toggleTheme);
addToPlaylistSelect.addEventListener('change', addToPlaylist);
createPlaylistBtn.addEventListener('click', createPlaylist);
searchPlaylistsInput.addEventListener('input', renderPlaylists);
clearPlaylistSongsBtn.addEventListener('click', clearPlaylistSongs);
deletePlaylistBtn.addEventListener('click', deletePlaylist);
hamburgerMenu.addEventListener('click', toggleSidebar);

// Initialize
audioPlayer.volume = 0.5;
volume.style.setProperty('--volume', '50');
initializeTheme();

playlists = JSON.parse(localStorage.getItem('playlists')) || [];
if (playlists.length > 0) {
  playlistIdCounter = Math.max(...playlists.map(p => p.id)) + 1;
}
updatePlaylistDropdown();
renderPlaylists();

// Wait for preloadGenreJson to complete before proceeding
preloadGenreJson().then(() => {
  console.log('preloadGenreJson completed');
}).catch(error => {
  console.error('preloadGenreJson failed:', error);
});