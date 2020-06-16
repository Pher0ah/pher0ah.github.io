const {Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint} = Matter;

//World Dimensions
const width = 600;
const height = 600;

//Maze Dimensions
const mazeWidth  = 20;
const mazeHeight = 20;

//Unit Dimensions
const unitWidth = width / mazeWidth;
const unitHeight = height / mazeHeight;

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
  Bodies.rectangle(width/2, 0       , width, 10     ,{isStatic: true, render: {fillStyle: 'red'}}), //top
  Bodies.rectangle(width  , height/2, 10   , height, {isStatic: true, render: {fillStyle: 'red'}}), //right
  Bodies.rectangle(width/2, height  , width, 10    , {isStatic: true, render: {fillStyle: 'red'}}), //bottom
  Bodies.rectangle(      0, height/2, 10   , height, {isStatic: true, render: {fillStyle: 'red'}})  //left
];

//Create the world
World.add(world, walls);

//Maze Generation

const shuffleArray = (arr) => {
  let counter = arr.length;

  while (counter > 0) {
    const index = Math.floor(Math.random() * counter)
    counter--;
    const temp = arr[counter];
    arr[counter] = arr[index];
    arr[index] = temp;
  };

  return arr;
};

const grid = Array(mazeHeight).fill(null).map(() => Array(mazeWidth).fill(false));
const verticals = Array(mazeHeight).fill(null).map(() => Array(mazeWidth-1).fill(false));
const horizontals = Array(mazeHeight-1).fill(null).map(() => Array(mazeWidth).fill(false));

const stepThroughCell = (row, column) => {
  //check if cell has been visited
  if(grid[row][column]){return;}

  //Mark this cell as visited
  grid[row][column] = true;

  //Assemble list of neighbours
  const neighbours = shuffleArray([
    [row-1, column,'up'],
    [row, column+1, 'right'],
    [row+1, column, 'down'],
    [row, column-1, 'left']
  ]);

  //for each neighbour...
  for(let neighbour of neighbours){
    //Get the neighbour
    const [nextRow, nextColumn, direction] = neighbour;

    //if neighbour is out of bounds just continue to next iterration
    if(nextRow < 0 || nextRow >= mazeHeight || nextColumn < 0 || nextColumn >= mazeWidth){
      continue;
    };

    //if neighbour has been visited before just continue to next iterration
    if(grid[nextRow][nextColumn]){
      continue;
    };

    //remove wall from the direction we are moving
    if(direction === 'left'){
      verticals[row][column - 1] = true;
    }else if(direction === 'right'){
      verticals[row][column] = true;
    }else if(direction === 'up'){
      horizontals[row - 1][column] = true;
    }else if(direction === 'down'){
      horizontals[row][column] = true;
    };

    //visit the next cell
    stepThroughCell(nextRow,nextColumn);
  }; 
};

//Get a Starting Point
const startRow = Math.floor(Math.random() * mazeHeight);
const startColumn = Math.floor(Math.random() * mazeWidth);

stepThroughCell(startRow, startColumn);


//Iterate over Horizontals
horizontals.forEach((row, rowIndex) => {
  row.forEach((open, columnIndex) => {
    if(open) return;

    //Create a wall
    const wall = Bodies.rectangle(
      columnIndex * unitHeight + unitHeight / 2,
      rowIndex * unitHeight + unitHeight,
      unitWidth,
      5,
      {
        isStatic: true
      }
    );

    //add the wall to the world
    World.add(world, wall);
  });
});

verticals.forEach((row, rowIndex) => {
  row.forEach((open, columnIndex) => {
    if(open) return;

    //Create a wall
    const wall = Bodies.rectangle(
      columnIndex * unitWidth + unitWidth,
      rowIndex * unitWidth + unitWidth / 2,
      5,
      unitWidth,
      {
        isStatic: true
      }
    );

    //add the wall to the world
    World.add(world, wall);

  });
});