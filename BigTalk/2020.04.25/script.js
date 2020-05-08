var counter = 0;

var BTQuestions, x;
BTQuestions = [
  "This is question 1",
  "This is question 2",
  "This is question 3"
];

BTQuestions = shuffle(BTQuestions);

$(".container").on("click", function () {
  if (!document.getElementById("card").classList.contains("flipped")) {
    document.getElementById("question").innerHTML = BTQuestions[counter++];
    if(counter === BTQuestions.length){
      BTQuestions = shuffle(BTQuestions);
      counter = 0
    }
  }
  $(".card").toggleClass("flipped");
});

function shuffle(array) {
  var m = array.length, t, i;

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