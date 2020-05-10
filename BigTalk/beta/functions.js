// Global Variables Section
//
var counter = 0;                //A counter for how many cards we have used
const BTQuestions = [];         //The questions to be used

const logoLocations = {BigTalk : 'https://www.makebigtalk.com/wp-content/themes/blankslate/img/big-talk-logo-pos.svg',
                       Puzzle  : 'https://www.stickpng.com/assets/images/5a4613ddd099a2ad03f9c994.png',
                       Islamic : 'https://i.pinimg.com/originals/75/2a/0d/752a0dc0a3cd15ae456a8bb91895c8b0.png'};


//Listen for Resize Window Event & move Cards around
window.addEventListener('resize',redistributeCards);


// Description: Load Questions from JSON File
//
//
async function loadQuestions(){
  //Read questions from JSON File
  const response = await fetch('./questions.json')
  
  //Check if we got the file ok
  if(!response.ok){
    throw new Error(`Couldn't read questions from server (ERROR:${response.status})`);
  }
  
  //Convert response into JSON
  const data = await response.json();
  
  //Parse the questions into the BTQuestions variable
  data.questions.forEach((question) => BTQuestions.push(question));
  return BTQuestions.length;
}


// Description: Shuffle Array Function
// Reference  :https://bost.ocks.org/mike/shuffle/
//
function shuffleQuestions(array) {
  for(let i=array.length - 1; i > 0; i--){
    let j = Math.floor(Math.random() * (i+1));
    [array[i],array[j]] = [array[j],array[i]];
  }

  //return a promise response
  return Promise.resolve(array);
}


// Description: Load Questions and Create the Cards
//
//
async function createCards(){
  //Load the Questions
  await loadQuestions();
 
  //Shuffle The Questions
  shuffleQuestions(BTQuestions);
  
  //Loop through all questions and create card DIVs for them
  for(let cardInfo of BTQuestions){
    const cardType = cardInfo.type;
    const cardCat  = cardInfo.category;
    const cardQ  = cardInfo.question;

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
  }
}


function redistributeCards(){
  const allCards = document.querySelectorAll('.container');
  allCards.forEach(card => {
    let posX = card.computedStyleMap().get('left').value;
    deltaX = posX >= (window.innerWidth - 300) ? (Math.floor(Math.random() * (window.innerWidth - 300))) - posX : 0;

    let posY = card.computedStyleMap().get('top').value;
    deltaY = posY >= (window.innerHeight - 200) ? (Math.floor(Math.random() * (window.innerHeight- 200))) - posY : 0;

    const ct = card.computedStyleMap().get('transform'); 

    let currentRotation = ct[ct.length -1].angle.value;
    card.style.transform = `translate(${deltaX}px, ${deltaY}px)  rotate(${currentRotation}deg)`;
  });
}


//
//
//
function reshuffleCards(){
  const allCards = document.querySelectorAll('.container');
  allCards.forEach(moveCard);
}


//
//
//
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
//
function flipCard() {
  //bring the card to the front
  const selectedCard = this.parentElement;

  if(this.className !== "card flipped"){
    //flip the card over
    this.classList.toggle("flipped");
  }else{
    const container = this.parentElement;
    container.parentElement.removeChild(container);
  }
}
