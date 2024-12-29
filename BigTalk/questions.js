const BTQuestions = [
  ["BigTalk","General","Describe your perfect day"],
  ["BigTalk","General","Do you fit-in or Stand-out and how?"],
  ["BigTalk","General","Do you prefer swimming in the ocean or the pool?"],
  ["BigTalk","General","Do you prefer to watch or participate to learn something new?"],
  ["BigTalk","Adult"  ,"Do you want your children to be like you? Why?"],
  ["BigTalk","General","Have you ever had a near-death experience?"],
  ["BigTalk","General","Have you ever done something in a hurry and regretted it?"],
  ["BigTalk","General","How are you making a difference in the world?"],
  ["BigTalk","Adult"  ,"How do you deal with conflict at work or in love?"],
  ["BigTalk","General","How do you define true happiness?"],
  ["BigTalk","General","How do you feel about birthdays?"],
  ["BigTalk","General","How do you recharge when life gets difficult or overwhelming?"],
  ["BigTalk","Adult"  ,"How do you show love?"],
  ["BigTalk","General","How do you support your friends when they are upset?"],
  ["BigTalk","General","How old do you feel (regardless of your actual age)?"],
  ["BigTalk","General","If someone gave you $10,000 to spend, what would you do with it?"],
  ["BigTalk","General","If you came with a guarantee, what would it say?"],
  ["BigTalk","General","If you could create your own country, what would it be like?"],
  ["BigTalk","General","If you could have one super-power, what would it be and why?"],
  ["BigTalk","General","If you could invite three famous people to your home for dinner, who would they be?"],
  ["BigTalk","General","If you had 24 hours left to live, who would you be with in 23 hours?"],
  ["BigTalk","General","If you had 30 seconds to talk to the world what would you say?"],
  ["BigTalk","General","If you were to go back in history and live as someone else, who would it be, and why?"],
  ["BigTalk","General","If you were to go back in history and live, which time period, and why?"],
  ["BigTalk","General","If you wrote a one sentance mission statement about your life, what would it be?"],
  ["BigTalk","General","If your life was a book, what would be its title?"],
  ["BigTalk","General","Is there anyone in your life that you admire? Why?"],
  ["BigTalk","Adult"  ,"What about love makes you afraid?"],
  ["BigTalk","Adult"  ,"What advice would you give your younger self?"],
  ["BigTalk","General","What are three essential travel items you will never leave behind?"],
  ["BigTalk","General","What are you curious about lately?"],
  ["BigTalk","General","What are you looking forward to?"],
  ["BigTalk","General","What are you passionate about?"],
  ["BigTalk","General","What are you proud of?"],
  ["BigTalk","General","What are you thankful for at this very moment?"],
  ["BigTalk","Adult"  ,"What are your boundaries?"],
  ["BigTalk","General","What attributes of your parents shaped you the most?"],
  ["BigTalk","General","What book changed your perspective?"],
  ["BigTalk","General","What concerns you about the future?"],
  ["BigTalk","General","What could you do today that you couldn't do a year ago?"],
  ["BigTalk","General","What do you do when you can't sleep at night?"],
  ["BigTalk","General","What do you dream about?"],
  ["BigTalk","General","What do you fear?"],
  ["BigTalk","General","What do you fight for?"],
  ["BigTalk","General","What do you find fun?"],
  ["BigTalk","General","What do you find beautiful?"],
  ["BigTalk","General","What do you find challenging?"],
  ["BigTalk","General","What do you have that you cannot live without?"],
  ["BigTalk","General","What do you hope to achieve in five years?"],
  ["BigTalk","General","What do you miss?"],
  ["BigTalk","General","What do you most need help with?"],
  ["BigTalk","General","What do you spend too much time doing?"],
  ["BigTalk","General","What do you think about when you wake up?"],
  ["BigTalk","General","What do you think the world will be like in fifty years?"],
  ["BigTalk","General","What do you value that doesn't cost money?"],
  ["BigTalk","General","What do you want the world to remember about you?"],
  ["BigTalk","General","What do you want to change in the world?"],
  ["BigTalk","General","What do you want to do before you die?"],
  ["BigTalk","General","What do you wish more people knew about you?"],
  ["BigTalk","General","What does home mean to you?"],
  ["BigTalk","Adult"  ,"What does love mean to you?"],
  ["BigTalk","General","What does success mean to you?"],
  ["BigTalk","General","What does this world need more of? How can you help?"],
  ["BigTalk","General","What don’t you spend enough time doing?"],
  ["BigTalk","General","What fictional place would you most like to visit/live in?"],
  ["BigTalk","General","What food could you eat every day?"],
  ["BigTalk","General","What gets you out of bed every day?"],
  ["BigTalk","General","What gives you hope?"],
  ["BigTalk","Adult"  ,"What happened to your childhood dream?"],
  ["BigTalk","Adult"  ,"What has been your favourite age so far and why?"],
  ["BigTalk","General","What have you learnt from your past mistakes?"],
  ["BigTalk","General","What have you started but never finished? Why?"],
  ["BigTalk","General","What have you witnessed that has strengthened your faith in humanity?"],
  ["BigTalk","General","What helps you to feel calm?"],
  ["BigTalk","General","What is a bad habit you would like to break?"],
  ["BigTalk","General","What is a goal you plan on accomplishing this year?"],
  ["BigTalk","General","What is a misconception that people have about you?"],
  ["BigTalk","General","What is a new habit you want to form?"],
  ["BigTalk","General","What is a quirk that your family has?"],
  ["BigTalk","General","What is difficult for you now, but was easy as a child?"],
  ["BigTalk","General","What is holding you back from doing the things you really want to do?"],
  ["BigTalk","General","What is one decision you made that changed your life?"],
  ["BigTalk","General","What is one moment that you want to relive?"],
  ["BigTalk","General","What is one place you want to travel to?"],
  ["BigTalk","General","What is one quality you wish you had?"],
  ["BigTalk","General","What is one question you would ask a fortune-teller?"],
  ["BigTalk","General","What is one thing that could happen today that would make it great?"],
  ["BigTalk","General","What is something new you have recently tried?"],
  ["BigTalk","General","What is something outside your comfort zone, that you would like to try?"],
  ["BigTalk","General","What is something you forgot once, and will never forget again?"],
  ["BigTalk","General","What is something you know that you do differently than most people?"],
  ["BigTalk","General","What is something you learnt about yourself from your past relationships?"],
  ["BigTalk","General","What is something you wish you didn't know?"],
  ["BigTalk","General","What is the best conversation piece in your home?"],
  ["BigTalk","General","What is the best gift someone can give you?"],
  ["BigTalk","General","What is the best gift you have ever received?"],
  ["BigTalk","General","What is the best way to spend a cold day?"],
  ["BigTalk","General","What is the best way to spend a sunny day?"],
  ["BigTalk","General","What is the kindest thing someone has ever done for you?"],
  ["BigTalk","General","What is the most breathtaking view you have seen?"],
  ["BigTalk","General","What is the most important lesson you have learnt?"],
  ["BigTalk","Adult"  ,"What is the most important trait in your ideal partner?"],
  ["BigTalk","General","What is the strangest thing you have eaten?"],
  ["BigTalk","General","What is your biggest fear?"],
  ["BigTalk","General","What is your earliest childhood memory?"],
  ["BigTalk","General","What is your earliest memory of achievement?"],
  ["BigTalk","General","What is your favourite place in the world?"],
  ["BigTalk","General","What is your greatest strength?"],
  ["BigTalk","General","What is your happiest memory?"],
  ["BigTalk","General","What is your least favourite chore?"],
  ["BigTalk","General","What is your most favourite chore?"],
  ["BigTalk","General","What is your most favourite desert?"],
  ["BigTalk","General","What is your next great adventure?"],
  ["BigTalk","General","What is your number one priority today?"],
  ["BigTalk","General","What job would you choose if money was not a consideration?"],
  ["BigTalk","General","What little things in life do you take the time to stop and appreciate?"],
  ["BigTalk","General","What makes a friend a good/best friend?"],
  ["BigTalk","General","What makes you feel really alive?"],
  ["BigTalk","General","What makes you feel supported?"],
  ["BigTalk","General","What motivates you to keep going?"],
  ["BigTalk","General","What new law would you like to make?"],
  ["BigTalk","General","What object would you save if your house was on fire?"],
  ["BigTalk","General","What rule do you like breaking?"],
  ["BigTalk","General","What rule do you think should not exist?"],
  ["BigTalk","General","What song makes you want to dance?"],
  ["BigTalk","General","What topic could you talk about for thirty minutes with no preparation?"],
  ["BigTalk","General","What was the best compliment you have received?"],
  ["BigTalk","General","What was the most impactful event in your life?"],
  ["BigTalk","Adult"  ,"What was your secret spot or hideaway as a child?"],
  ["BigTalk","General","What were you doing the last time you lost track of time?"],
  ["BigTalk","Adult"  ,"What would you not tolerate in a relationship?"],
  ["BigTalk","General","When do you feel the most like yourself?"],
  ["BigTalk","General","When was the last time someone made you smile?"],
  ["BigTalk","General","When was the last time you helped a stranger? Why?"],
  ["BigTalk","General","When was the last time you lied? Why?"],
  ["BigTalk","General","When was the last time you made someone else smile?"],
  ["BigTalk","General","When was the last time you were moved to tears?"],
  ["BigTalk","General","Where do you find peace?"],
  ["BigTalk","General","Where would you like to wake up Tomorrow?"],
  ["BigTalk","General","Which hour of the day would you want to skip completely?"],
  ["BigTalk","General","Which vacation exceeded your expectations and why?"],
  ["BigTalk","General","Who do you need to get in touch with because it’s been too long?"],
  ["BigTalk","General","Who do  you turn to for support?"],
  ["BigTalk","General","Who is your hero or role-model?"],
  ["BigTalk","General","Who in your life do you love the most? and what are you doing about it?"],
  ["BigTalk","General","Why do you do what you do?"]
];