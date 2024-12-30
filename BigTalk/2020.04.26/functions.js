var counter = 0;

BTQuestions = shuffle(BTQuestions);

$(".card").on("click", function () {
  if (!document.getElementById("card").classList.contains("flipped")) {
    document.getElementById("question").innerHTML = "<p>" + BTQuestions[counter++];
    if(counter === BTQuestions.length){
      BTQuestions = shuffle(BTQuestions);
      counter = 0
    }
  }
  $(".card").toggleClass("flipped");
});

/*
Shuffle Array Function
  Reference:https://bost.ocks.org/mike/shuffle/
*/
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