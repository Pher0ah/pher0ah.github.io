//Create a counter for how many cards we have used
var counter = 0;

const logoLocations = {BigTalk : 'https://www.makebigtalk.com/wp-content/themes/blankslate/img/big-talk-logo-pos.svg',
                       Puzzle  : 'https://www.stickpng.com/assets/images/5a4613ddd099a2ad03f9c994.png',
                       Islamic : 'https://i.pinimg.com/originals/75/2a/0d/752a0dc0a3cd15ae456a8bb91895c8b0.png'}

//Shuffle The Questions
shuffleQuestions(BTQuestions);


//Setup Event for window resize
//
window.addEventListener('resize',redistributeCards);

function redistributeCards(){
  const allCards = document.querySelectorAll('.container');
  allCards.forEach(card => {
    console.log(card.computedStyleMap().get('left').value);
     if(card.computedStyleMap().get('left').value >= (window.innerWidth - 300)) {
      const posX = Math.floor(Math.random() * (window.innerWidth - 300));
      card.style.left = `${posX}px`;
    };

    if(card.computedStyleMap().get('top').value >= (window.innerHeight - 200)){
      const posY = Math.floor(Math.random() * (window.innerHeight- 200));
      card.style.top = `${posY}px`;
    }
  });
}

function reshuffleCards(){
  const allCards = document.querySelectorAll('.container');
  allCards.forEach(moveCard);
}

function moveCard(card, index){
  const posY = Math.floor(Math.random() * (window.innerHeight- 200));
  const posX = Math.floor(Math.random() * (window.innerWidth - 300));

  card.style.left = `${posX}px`;
  card.style.top = `${posY}px`;
}

// // Description: Flip the card over & Setup the new question
// //
// function flipCard() {
//   //Change the question
//   if (this.className !== "card flipped") {
//     //Add Question
//     this.children[1].textContent = BTQuestions[counter][2];

//     //Check if we have reached the end of the array
//     if (++counter >= BTQuestions.length) {
//       shuffleQuestions(BTQuestions);
//       counter = 0
//     }
//     //Add Question Logo for next question to the back
//     this.children[0].style.backgroundImage = `url(${logoLocations[BTQuestions[counter][0]]})`;
//   }

//   //flip the card over
//   this.classList.toggle("flipped");
// }

// Description: Flip the card over
//
function flipCard() {
  //bring the card to the front
  const selectedCard = this.parentElement;
  console.log(selectedCard.computedStyleMap.zIndex);
  document.body.removeChild(selectedCard);
  document.body.appendChild(selectedCard);

  //flip the card over
  this.classList.toggle("flipped");
}

// Description: Shuffle Array Function
// Reference  :https://bost.ocks.org/mike/shuffle/
//
function shuffleQuestions(array) {
  for(let i=array.length - 1; i > 0; i--){
    let j = Math.floor(Math.random() * (i+1));
    [array[i],array[j]] = [array[j],array[i]];
  }
}

// Description: Create Lots of Cards
//
function createCards(){
  for(let cardInfo of BTQuestions){
    const cardType = cardInfo[0];
    const cardCat  = cardInfo[1];
    const cardQ  = cardInfo[2];

    //Create the container for the card
    const  containerDiv = document.createElement('div');
    containerDiv.classList.add("container");
    document.body.appendChild (containerDiv);

    //Get Random Properties for Card
    const posX = Math.floor(Math.random() * (window.innerWidth - 300));
    const posY = Math.floor(Math.random() * (window.innerHeight- 200));
    const rot  = Math.floor(Math.random() * 360);
    containerDiv.style.left = `${posX}px`;
    containerDiv.style.top = `${posY}px`;
    containerDiv.style.transform = `rotate(${rot}deg)`;

    //Create the Card
    const cardDiv = document.createElement('div');
    cardDiv.classList.add("card");
    cardDiv.addEventListener('click', flipCard);
    containerDiv.appendChild(cardDiv);

    //Create the front of the card
    cardFront = document.createElement('div');
    cardFront.classList.add("front");
    cardFront.style.backgroundImage = `url(${logoLocations[cardType]})`;
    cardDiv.appendChild(cardFront);

    //Create the back of the card
    cardBack = document.createElement('div');
    cardBack.classList.add("back");
    cardBack.innerText = `${cardQ}`;
    cardDiv.appendChild(cardBack);


// //Setup the first card on the screen
// const firstCard = document.querySelector('.card');
// firstCard.children[0].style.backgroundImage = `url(${logoLocations[BTQuestions[counter][0]]})`;
// firstCard.addEventListener('click',function(){flipCard(firstCard)});
  }
}