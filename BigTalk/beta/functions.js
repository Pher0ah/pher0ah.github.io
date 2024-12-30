//create a counter for how many cards we have used
var counter = 0;

//set title
document.title = (typeof gameTitle !== 'undefined') ? gameTitle : "My Cards";

//set background colour
document.body.style.backgroundColor = `#${tableColour ? tableColour : "265834"}`;

//set card colour based on questions file
document.getElementsByClassName('card')[0].style.backgroundColor = `#${cardColour}`;

//set card text colour based on questions file
document.getElementsByClassName('back')[0].style.color = `#${invertHex(cardColour)}`;

//set game logo based on questions file
document.getElementsByClassName('front')[0].style.backgroundImage = cardLogo;
document.getElementsByClassName('back')[0].style.backgroundImage = cardLogo;
document.getElementById("favicon").setAttribute("href", cardLogo);
document.getElementById("appleicon").setAttribute("href", cardLogo);

//shuffle the questions
shuffle(theQuestions);

//flip the card over
function flipCard(card) {
  //Change the question when the card is flipped
  if (card.className !== "card flipped") {
    card.children[1].innerHTML = theQuestions[counter++][1];
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

function resizeCard() {
  theHeight = window.innerHeight;
  theWidth = window.innerWidth;

  if(theWidth > theHeight){
    theCardHeight = (theHeight / 5)*4;
    theCardWidth  = (theCardHeight / 2)*3;
    theFontSize = theCardHeight/15;
  }else{
    theCardWidth = (theWidth / 5) * 4;
    theCardHeight = (theCardWidth / 3)*2;
    theFontSize = theCardWidth/15;
  };

  //Change Card Dimensions & Font Size
  document.getElementsByClassName('container')[0].style.width = `${theCardWidth}px`;
  document.getElementsByClassName('container')[0].style.height = `${theCardHeight}px`;
  document.getElementsByClassName('container')[0].style.borderRadius = `${theCardHeight/10}px`;

  document.getElementsByClassName('front')[0].style.backgroundSize = `${theCardWidth/2}px`;
  document.getElementsByClassName('back')[0].style.backgroundSize = `${theCardWidth/8}px`;
  document.getElementsByClassName('back')[0].style.backgroundPosition = `bottom ${theCardWidth/30}px right ${theCardWidth/30}px`;
  document.getElementsByClassName('back')[0].style.fontSize = `${theFontSize}px`;
  
};

//Find the inverse of a colour
//Ref: https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
//
function invertHex(hex) {
  return (Number(`0x1${hex}`) ^ 0xFFFFFF).toString(16).substr(1).toUpperCase()
}