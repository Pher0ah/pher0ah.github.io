const durationInput = document.querySelector('#duration');
const startButton = document.querySelector('#start');
const pauseButton = document.querySelector('#pause');
const circle = document.querySelector('circle');

//Set the stroke Permiter
const permiter = (2 * circle.getAttribute('r')*Math.PI)
circle.setAttribute('stroke-dasharray', permiter);

//Set the begining stroke offset
let duration;

//Crate the timer object
const myTimer = new Timer(durationInput,startButton,pauseButton, {
  onStart(totalDuration){
    duration = totalDuration;
  },

  onTick(timeRemaining){
    offset = permiter * timeRemaining / duration - permiter
    circle.setAttribute('stroke-dashoffset', offset);
  },

  onComplete(){console.log("Timer Done!")}
}); 