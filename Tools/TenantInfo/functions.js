//Global Variables

var tenantData = {};

//Read a JSON File
function readTextFile(file, callback) {
  var rawFile = new XMLHttpRequest();
  rawFile.overrideMimeType("application/json");
  rawFile.open("GET", file, true);
  rawFile.onreadystatechange = function() {
      if (rawFile.readyState === 4 && rawFile.status == "200") {
          console.log("DEBUG: GET Command Worked");
          callback(rawFile.responseText);
      }else{
        console.log("DEBUG: GET Command Failed "+ rawFile.readyState)
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

loadData();
