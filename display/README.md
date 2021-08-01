Taberific
=========

Simple web doc for rotating any number of web pages.

You can try it at: http://stevepeak.github.com/taberific/

var myClock = document.createElement('div');
myClock.className = "overlay";
myClock.innerHTML = "<ul><li id=\"hours\"></li><li id=\"point\">:</li><li id=\"min\"></li><li id=\"point\">:</li><li id=\"sec\"></li></ul>";
document.getElementById("7").style.position = "relative"
document.getElementById("7").appendChild(myClock);

document.styleSheets[0].addRule(".overlay", " \
  position:absolute; \
  top:50%; \
  width: 95%; \
  text-align: right; \
  background-color:rgba(0, 0, 0, 0); \
  font-size: 4vw;\
  font-family: monospace; \
  color: rgb(0 255 255 / 75%); \
",0);

document.styleSheets[0].addRule("li#point", " \
  position: relative; \
  display: inline; \
  -webkit-animation: blink 1s ease infinite; \
",0);

document.styleSheets[0].addRule("#hours, #min, #sec", " \
  display: inline; \
  list-style: none; \
  font:normal Arial; \
  -webkit-font-smoothing: antialiased; \
",0);

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