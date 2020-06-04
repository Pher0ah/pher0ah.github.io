const {Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint} = Matter;

//World Dimensions
const width = 600;
const height = 600;

//Maze Dimensions
const mazeWidth  = 3;
const mazeHeight = 3;

//Create the Engine
const engine = Engine.create();

//Get the World from the Engine
const {world} = engine;

//Setup the World
const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    wireframes: false,
    width: width, 
    height: height
  }
});

//Render the World
Render.run(render);
Runner.run(Runner.create(), engine);

World.add(world, MouseConstraint.create(engine, {
  mouse: Mouse.create(render.canvas)
}));

//Add Walls around the canvas
const walls = [
  Bodies.rectangle(width/2, 0       , width, 40     ,{isStatic: true, render: {fillStyle: 'red'}}), //top
  Bodies.rectangle(width  , height/2, 40   , height, {isStatic: true, render: {fillStyle: 'red'}}), //right
  Bodies.rectangle(width/2, height  , width, 40    , {isStatic: true, render: {fillStyle: 'red'}}), //bottom
  Bodies.rectangle(      0, height/2, 40   , height, {isStatic: true, render: {fillStyle: 'red'}})  //left
];

//Create the world
World.add(world, walls);

//Maze Generation
const grid = Array(mazeHeight).fill(null).map(() => Array(mazeWidth).fill(false));
const verticals = Array(mazeHeight).fill(null).map(() => Array(mazeWidth-1).fill(false));
const horizontals = Array(mazeHeight-1).fill(null).map(() => Array(mazeWidth).fill(false));



const stepThroughCell = (row, column) => {
  //check if cell has been visited
  if(grid)

  //Mark this cell as visited

  //Assemble list of neighbours
  
  //for each neighbour...

  //
};

//Get a Starting Point
const startRow = Math.floor(Math.random() * mazeHeight);
const startColumn = Math.floor(Math.random() * mazeWidth);

stepThroughCell(startRow, startColumn)
