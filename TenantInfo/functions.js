//Global Variables

var tenantData = {};

//Read a JSON File
function readTextFile(file, callback) {
  var rawFile = new XMLHttpRequest();
  rawFile.overrideMimeType("application/json");
  rawFile.open("GET", file, true);
  rawFile.onreadystatechange = function() {
      if (rawFile.readyState === 4 && rawFile.status == "200") {
          callback(rawFile.responseText);
      }
  }
  rawFile.send(null);
}

//Load Information
function loadData(){
  readTextFile("./tenantInfo.json", function(text){
    tenantData = JSON.parse(text);
    alert("DEBUG: the count of tenant data read is ", tenantData.count);
    document.getElementById("tenant").innerHTML = 'DEBUG: the count of tenant data read is '+tenantData.count;
  });
}


//=============================
//flip the card over
function flipCard(card) {
  //Change the question (for now)
  if (card.className !== "card flipped") {
    card.children[1].textContent = BTQuestions[counter++][2];
    if (counter === BTQuestions.length) {
      BTQuestions = shuffle(BTQuestions);
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