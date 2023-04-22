const API_KEY = 'AIzaSyBqYyTlQoxWZpEYogPt9cHAJoIvlZySoko';
const CLIENT_ID = '872435311738-6o0o4bmu4arcoo9m58oh0n7e0ovrr94s.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';

async function handleCredentialResponse(response) {
  const credential = response.credential;

  // Verify the token on the server-side (skipped for demonstration)
  // ...
  console.log(response);

  // Load photos after sign-in
  loadPhotos();
}

const PAGE_SIZE = 10;
let currentPage = 0;
let currentPhotos = [];

async function loadPhotos() {
  try {
    const albums = await getAlbums();
    const photos = await getAllPhotos();

    currentPhotos = photos.map(photo => {
      const album = albums.find(album => album.id === photo.albumId);
      return {
        url: photo.baseUrl,
        album: album ? album.title : 'No Album'
      };
    });

    displayPage(currentPage);
  } catch (error) {
    displayError(error.message);
  }
}

async function getAlbums() {
  const response = await gapi.client.photoslibrary.albums.list();

  console.log("We got to getAlbums");
  console.log(response);

  return response.result.albums || [];
}

async function getAllPhotos() {
  let photos = [];
  let nextPageToken;

  do {
    const response = await gapi.client.photoslibrary.mediaItems.list({
      pageSize: 100,
      pageToken: nextPageToken
     });

     photos = photos.concat(response.result.mediaItems || []);
     nextPageToken = response.result.nextPageToken;
  } while (nextPageToken);

  return photos;
}

function displayPage(page) {
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageData = currentPhotos.slice(start, end);

  updateTable(pageData);

  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  prevButton.disabled = page === 0;
  nextButton.disabled = end >= currentPhotos.length;
}

function previousPage() {
  if (currentPage > 0) {
    currentPage--;
    displayPage(currentPage);
  }
}

function nextPage() {
  const totalPages = Math.ceil(currentPhotos.length / PAGE_SIZE);
  if (currentPage < totalPages - 1) {
    currentPage++;
    displayPage(currentPage);
  }
}

function updateTable(data) {
  const tbody = document.querySelector('#photos-table tbody');
  tbody.innerHTML = '';

  data.forEach(rowData => {
    const row = document.createElement('tr');
    const imgCell = document.createElement('td');
    const img = document.createElement('img');

    img.src = rowData.url;
    img.width = 100;
    imgCell.appendChild(img);
    row.appendChild(imgCell);

    const albumCell = document.createElement('td');

    albumCell.innerText = rowData.album;
    row.appendChild(albumCell);
    tbody.appendChild(row);
  });
}

function displayError(message) {
  const errorMessageElement = document.getElementById('error-message');
  errorMessageElement.textContent = message;
}

// Main()

// Make the handleCredentialResponse function globally available
// window.handleCredentialResponse = handleCredentialResponse;

// Change Version
document.title = "Google Photos Viewer (v.1.4)";