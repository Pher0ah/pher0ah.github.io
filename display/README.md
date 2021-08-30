Taberific
=========

Simple web doc for rotating any number of web pages.

You can try it at: http://stevepeak.github.com/taberific/


//Move Live Price to Top
var livePrice = document.getElementsByClassName('sc-bYwzba')
livePrice[0].parentElement.parentElement.parentElement.parentElement.appendChild(livePrice[0])

//Delete Other Crap on the Page
var otherElements = document.getElementsByClassName('sc-gKAblj')
otherElements[0].parentNode.removeChild(otherElements[0])

//Delete Note from Live Price
var otherElements = document.getElementsByClassName('sc-iwaifL')
otherElements[0].parentNode.removeChild(otherElements[0])

//Create Clock Element
var myClock = document.createElement('div');
myClock.className = "overlay";
myClock.innerHTML = "<ul><li id=\"hours\"></li><li id=\"point\">:</li><li id=\"min\"></li><li id=\"point\">:</li><li id=\"sec\"></li></ul>";
livePrice[0].style.position = "relative"
livePrice[0].style.width = "50%"
livePrice[0].appendChild(myClock);

//Setup the Styles
document.styleSheets[0].addRule("\@font-face"," \
 font-family:'digital7'; \
 src: url('https://www.egynomics.com/display/fonts/digital-7.ttf'); \
",0);

document.styleSheets[0].addRule(".overlay", " \
  position:absolute; \
  top:10%; \
  width: 95%; \
  text-align: right; \
  background-color:rgba(0, 0, 0, 0); \
  font-size: 5vw;\
  font-family: monospace; \
  color: rgb(255 255 0 / 75%); \
",0);

document.styleSheets[0].addRule("li#point", " \
  position: relative; \
  display: inline; \
  -webkit-animation: blink 1s ease infinite; \
",0);

document.styleSheets[0].addRule("#hours, #min, #sec", " \
  display: inline; \
  list-style: none; \
  font-family: digital7; \
  -webkit-font-smoothing: antialiased; \
",0);

//Start the Clock Running
setInterval( function() {
    var time = new Date();

    var seconds = time.getSeconds();
    var minutes = time.getMinutes();
    var hours = time.getHours();

    // Add a leading zero to time values when they run into single digits
    document.getElementById("sec").innerHTML   = (( seconds < 10 ? "0" : "" ) + seconds);
    document.getElementById("min").innerHTML   = (( minutes < 10 ? "0" : "" ) + minutes);
    document.getElementById("hours").innerHTML = (( hours < 10 ? "0" : "" ) + hours);
  },1000);