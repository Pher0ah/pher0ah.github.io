const {Engine, Render, Runner, World, Bodies, MouseConstraint, Mouse} = Matter;

const engine = Engine.create();
const {world} = engine;

const width = 800;
const height = 600;

const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    wireframes: false,
    width: width, 
    height: height
  }
});

Render.run(render);
Runner.run(Runner.create(), engine);

World.add(world, MouseConstraint.create(engine, {
  mouse: Mouse.create(render.canvas)
}));

//Add Walls around the canvas
const walls = [
  Bodies.rectangle(400,  0,800, 10,{isStatic: true}), //top
  Bodies.rectangle(800,300, 10,600,{isStatic: true}), //right
  Bodies.rectangle(400,600,800, 10,{isStatic: true}), //bottom
  Bodies.rectangle(  0,300, 10,600,{isStatic: true})  //left
];

World.add(world, walls);

//Random Shapes
for(let i=0; i<30;i++){
  if(Math.random() > 0.5){
    //rectangle
    World.add(world, Bodies.rectangle((Math.random() * width), (Math.random() * height), 50, 50));
  }else{
    //circle
    World.add(world,Bodies.circle(Math.random() * width, Math.random() * height,35, {
      render: {fillStyle: 'green'}
    }));
  }
};