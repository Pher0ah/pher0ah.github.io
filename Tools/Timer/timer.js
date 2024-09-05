class Timer{
  constructor(durationInput, startButton, pauseButton, callbacks){
    this.durationInput = durationInput;
 
    //Setup Start Button
    this.startButton = startButton;
    this.startButton.addEventListener('click', this.start);

    //Setup Pause Button
    this.pauseButton = pauseButton;
    this.pauseButton.addEventListener('click', this.pause);
    this.pauseButton.disabled = true;

    //Add Callbacks
    if(callbacks){
      this.onStart = callbacks.onStart;
      this.onTick = callbacks.onTick;
    }
  }

  start = () => {
    if(this.onStart){this.onStart(this.timeRemaining)};
    this.startButton.disabled = true;
    this.pauseButton.disabled = false;
    this.intervalTimer = setInterval(this.tick, 20);
   }

  pause = () => {
    console.log("Timer Paused!")
    this.startButton.disabled = false;
    this.pauseButton.disabled = true;
    clearInterval(this.intervalTimer);
  }

  tick = () => {
    if(this.timeRemaining <= 0){
      this.pause();
      this.timeRemaining = 0
      if(this.onComplete){this.onComplete()};
    }else{
      this.timeRemaining-=.02;
      if(this.onTick){this.onTick(this.timeRemaining)};
    }
  }

  get timeRemaining(){
    return parseFloat(this.durationInput.value);
  }

  set timeRemaining(time){
    this.durationInput.value = time.toFixed(2);
  }
}