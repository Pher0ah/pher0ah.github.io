const API_KEY = 'AIzaSyBqYyTlQoxWZpEYogPt9cHAJoIvlZySoko';
const CLIENT_ID = '872435311738-6o0o4bmu4arcoo9m58oh0n7e0ovrr94s.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';

async function init() {
  await gapi.load('g_id');

  const signInButton = document.querySelector('.g_id_signin');
  signInButton.addEventListener('click', async () => {
    const response = await gapi.auth2.getAuthInstance().signIn();
    handleCredentialResponse(response);
  });
}

async function handleCredentialResponse(response) {
  const credential = response.credential;
  const authResponse = response.getAuthResponse();

  // Verify the token on the server-side (skipped for demonstration)
  // ...

  // Update the sign-in button text and style
  const signInButton = document.querySelector('.g_id_signin');
  signInButton.textContent = 'Signed In';
  signInButton.style.backgroundColor = 'green';
  signInButton.style.cursor = 'default';

  // Load photos after sign-in
  loadPhotos();
}

window.handleCredentialResponse = handleCredentialResponse;
window.title = "Google Photos Viewer (v.1.8)";

async function getAccessToken(authCode) {
  const response = await fetch(`https://www.googleapis.com/oauth2/v4/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: 'postmessage'
    })
  });

  if (response.ok) {
    const data = await response.json();
    return data.access_token;
  } else {
    throw new Error('Failed to exchange authorization code for access token');
  }
}

function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    scope: SCOPES
  }).then(() => {
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  });
}

function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    loadPhotos();
  } else {
    gapi.auth2.getAuthInstance().signIn();
  }
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
