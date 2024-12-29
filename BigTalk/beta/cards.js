// Description: CARD Class Definition
//
//
class Card {
  constructor(type, category, question) {
    this.type = type;
    this.category = category;
    this.question = question;
    this.xPos = 0;
    this.yPos = 0;
    this.rot  = 0;
    this.side = "back";
  }

  flip() {
    this.side = (this.side === "back") ? "front" : "back";
    return this.side;
  }

  destructor(){

  }
}


// Testing Section
//
const myCard = new Card("BigTalk", "General", "Who are you?");
