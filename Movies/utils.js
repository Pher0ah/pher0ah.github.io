// Description: 
//
//
const debounce = (callback, delay=1000) => {

  let timeoutId;  //timeout ID

  //Return a wrapper function to debounce the callback function
  return (...args) => {

    //if a timeout has been set; clear it
    if(timeoutId){
      clearTimeout(timeoutId);
    }

    //set a new timeout with the delay required
    timeoutId = setTimeout(() => {
      callback.apply(null,args);
    },delay);
  }
}