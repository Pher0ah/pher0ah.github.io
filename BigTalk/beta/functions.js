//create a counter for how many cards we have used
var counter = 0;

//shuffle the questions
shuffle(theQuestions);

//flip the card over
function flipCard(card) {
  //Change the question when the card is flipped
  if (card.className !== "card flipped") {
    card.children[1].textContent = theQuestions[counter++][1];
    if (counter === theQuestions.length) {
      theQuestions = shuffle(theQuestions);
      counter = 0
    }
  }
  card.classList.toggle("flipped");
}


// Description: Shuffle Array Function
// Reference  :https://bost.ocks.org/mike/shuffle/
//
function shuffle(array) {
  let m = array.length, t, i;

  // While there remain elements to shuffle…
  while (m) {

    // Pick a remaining element…
    i = Math.floor(Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}