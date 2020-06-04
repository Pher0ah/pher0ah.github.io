const apiKey = 'd9835cc5';



//Create the autocomplete configuration object
const AutoCompleteConfig = {
  renderOption(movie) {
    return `
        <img src="${movie.Poster === "N/A" ? '' : movie.Poster}" />
        ${movie.Title} (${movie.Year})
      `;
  },
  inputValue(movie) {
    return movie.Title;
  },
  async fetchData(searchTerm) {
    const response = await axios.get('http://www.omdbapi.com/', {
      params: {
        apikey: apiKey,
        s: searchTerm
      }
    });

    console.log(`We found ${response.data.totalResults} movies`)

    if (response.data.Error) {
      console.log(`We got this error: ${response.data.Error}`)
      return null;
    } else {
      return (response.data.Search);
    };
  }
};



//Create the autocomplete on the left
createAutoComplete({
  ...AutoCompleteConfig,
  root: document.querySelector("#left-autocomplete"),
  onOptionSelect(movie) {
    document.querySelector('.tutorial').classList.add('is-hidden');
    onMovieSelect(movie, document.querySelector('#left-summary'), 'left');
  }
});



//Create the autocomplete on the right
createAutoComplete({
  ...AutoCompleteConfig,
  root: document.querySelector("#right-autocomplete"),
  onOptionSelect(movie) {
    document.querySelector('.tutorial').classList.add('is-hidden');
    onMovieSelect(movie, document.querySelector('#right-summary'), 'right');
  }
});



//  Description:
//  Parameters:
//    movie - a movie object
//
let leftMovie;
let rightMovie;
const onMovieSelect = async (movie, summaryElement, side) => {
  //Get the selected movie's details
  const response = await axios.get('http://www.omdbapi.com/', {
    params: {
      apikey: apiKey,
      i: movie.imdbID
    }
  });

  //Render Movie Details
  summaryElement.innerHTML = movieTemplate(response.data);

  //Update variable
  if (side === 'left') {
    leftMovie = response.data;
  } else {
    rightMovie = response.data;
  };

  //If both movies selected; then compare them.
  if (leftMovie && rightMovie) {
    runComparison();
  };
}



// Description
//
//
const runComparison = () => {
  const leftSideStats = document.querySelectorAll('#left-summary .notification');
  const rightSideStats = document.querySelectorAll('#right-summary .notification');

  leftSideStats.forEach((leftStat, index) => {
    const rightStat = rightSideStats[index];
    
    if(parseFloat(rightStat.dataset.value) > parseFloat(leftStat.dataset.value)){
      leftStat.classList.remove('is-primary');
      leftStat.classList.remove('is-warning');
      rightStat.classList.add('is-warning');
    }else{
      rightStat.classList.remove('is-primary');
      rightStat.classList.remove('is-warning');
      leftStat.classList.remove('is-warning');
    }
  });
}



//  Description
//
//
const movieTemplate = (movieDetail) => {
  const dollars = parseInt(movieDetail.BoxOffice.replace(/\$/g, '').replace(/,/g, ''));
  const metascore = parseInt(movieDetail.Metascore);
  const imdbRating = parseFloat(movieDetail.imdbRating);
  const imdbVotes = parseInt(movieDetail.imdbVotes.replace(/,/g, ''));

  return `
    <!-- Movie Basic Information -->
    <article class="media">
      <figure class="media-left">
        <p class="image">
          <img src="${movieDetail.Poster}" />
        </p>
      </figure>
      <div class="media-content">
        <div class="content">
          <h1>${movieDetail.Title}</h1>
          <h4>${movieDetail.Genre}</h4>
          <p>${movieDetail.Plot}</p>
        </div>
      </div>
    </article>
    
    <!-- Movie Awards -->
    <article class="notification is-primary">
      <p class="title">${movieDetail.Awards}</p>
      <p class="subtitle">Awards</p>
    </article>

    <!-- Movie Box Office -->
    <article data-value=${dollars} class="notification is-primary">
      <p class="title">${movieDetail.BoxOffice}</p>
      <p class="subtitle">Box Office</p>
    </article>

    <!-- Movie Metascore -->
    <article data-value=${metascore} class="notification is-primary">
      <p class="title">${movieDetail.Metascore}</p>
      <p class="subtitle">Metascore</p>
    </article>

    <!-- Movie IMDB Rating -->
    <article data-value=${imdbRating} class="notification is-primary">
      <p class="title">${movieDetail.imdbRating}</p>
      <p class="subtitle">IMDB Rating</p>
    </article>

    <!-- Movie IMDB Votes -->
    <article data-value=${imdbVotes} class="notification is-primary">
      <p class="title">${movieDetail.imdbVotes}</p>
      <p class="subtitle">IMDB Votes</p>
    </article>
  `;
}



// Description: Add Burger Menu
//
//
document.addEventListener('DOMContentLoaded', () => {

  // Get all "navbar-burger" elements
  const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

  // Check if there are any navbar burgers
  if ($navbarBurgers.length > 0) {

    // Add a click event on each of them
    $navbarBurgers.forEach(el => {
      el.addEventListener('click', () => {

        // Get the target from the "data-target" attribute
        const target = el.dataset.target;
        const $target = document.getElementById(target);

        // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
        el.classList.toggle('is-active');
        $target.classList.toggle('is-active');

      });
    });
  }

});