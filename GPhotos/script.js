const API_KEY = 'AIzaSyBqYyTlQoxWZpEYogPt9cHAJoIvlZySoko';
const CLIENT_ID = '872435311738-6o0o4bmu4arcoo9m58oh0n7e0ovrr94s.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const SCOPES = 'https://www.googleapis.com/auth/photoslibrary.readonly';

async function handleCredentialResponse(response) {
  const idToken = response.credential;
  console.log(response);
  const credential = getAccessToken(idToken);

  // Load photos after sign-in
  loadPhotos(credential);
}

async function getAccessToken(idToken) {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const clientId = CLIENT_ID;
  const clientSecret = CLIENT_SECRET;
  const redirectUri = 'http://127.0.0.1/';
  const grantType = 'authorization_code';

  const requestBody = new URLSearchParams();
  requestBody.append('code', code);
  requestBody.append('client_id', clientId);
  requestBody.append('client_secret', clientSecret);
  requestBody.append('redirect_uri', redirectUri);
  requestBody.append('grant_type', grantType);

  try {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: requestBody
    });
    const data = await response.json();

    if (data.error) {
      console.error(data.error);
      return;
    }

    return data.access_token;
    // Store the access token and use it in fetchAlbums() function
  } catch (error) {
    console.error('Error fetching access token:', error);
  }
}

getAccessToken();


const PAGE_SIZE = 10;
let currentPage = 0;
let currentPhotos = [];

async function loadPhotos(credential) {
  try {
    const albums = await getAlbums(credential);
    const photos = await getAllPhotos(credential);

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

async function getAlbums(credential) {
  //const response = await gapi.client.photoslibrary.albums.list();

  console.log("We got to getAlbums");

  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credential}`
    }
  };

  try {
    const response = await fetch('https://photoslibrary.googleapis.com/v1/albums', requestOptions);
    const data = await response.json();

    if (data.error) {
      console.error(data.error.message);
      return;
    }

    console.log(data.albums);
    return data.albums || [];
  } catch (error) {
    console.error('Error fetching albums:', error);
  }
}

async function getAllPhotos(credential) {
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
document.title = "Google Photos Viewer (v.1.5)";