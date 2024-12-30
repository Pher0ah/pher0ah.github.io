// You can code JavaScript here

function speak() {
    var voice = new SpeechSynthesisUtterance();
    voice.text = "This is the shoreline at Shanghai, China";
    speechSynthesis.speak(voice);
}