//---------------------------------------------------------Variable For Storing Paddles (Object In Setup)-------------------------------------------------------------//
let leftPaddle, rightPaddle; //Left & Right vertical Paddles.
let topPaddle, bottomPaddle; //Top & Bottom Horizontal Paddles.
//---------------------------------------------------Main Ball Object (Called In Draw() to update every frame)--------------------------------------------------------//
let ball; // Variable to Store Ball Object.
//-----------------------------------------------------|  Array funtion to store as many paddles we want  |-----------------------------------------------------------//
let paddles = []; //To store all the Paddles and to call their (class funtions) only once. 
//---------------------------------------------------------|  Storing Scores of Both Players  |-----------------------------------------------------------------------//
let scoreLeft = 0; //Left Player Score.
let scoreRight = 0; //Right Player Score.
//----------------------------------------------------|  Controlling Text Size of Each Text In HUD  |-----------------------------------------------------------------//
let fontSize = 220; //General Text Size.

let ballHitSound; 

let gameState = "start"; // "start", "howToPlay", "play", "gameOver"

//---------------------------------------------------------|  Menu Buttons (Object In Setup)  |------------------------------------------------------------------------//
let startButton, howToPlayButton; // Start screen buttons.
let backButton; // How To Play screen button.

let gameOver = false;
let winningScore = 11;
let fontStyle;
function preload(){
  fontStyle= loadFont("Font/Decaydence.otf");
  soundFormats('mp3','wav');
  ballHitSound =loadSound("Sounds/BallHit.wav");

}

function setup() {
  // create canvas inside #game-container to keep it centered
  const container = document.getElementById('game-container');
  const cnv = createCanvas(900, 540);
  cnv.parent(container);

  // paddles
  let padLen = 140;
  let padTh = 14;

  // Player 1 color (blueish)
  let player1Color = [30, 144, 255, 180];
  // Player 2 color (orange/redish)
  let player2Color = [255, 99, 71, 180];

  // Player 1 paddles
  leftPaddle = new Paddle(30, height / 2, 'vertical', 'left', padLen, padTh, player1Color,10);
  topPaddle = new Paddle(width / 2, 30, 'horizontal', 'top', padLen, padTh, player1Color,13);

  // Player 2 paddles
  rightPaddle = new Paddle(width - 30, height / 2, 'vertical', 'right', padLen, padTh, player2Color,10);
  bottomPaddle = new Paddle(width / 2, height - 30, 'horizontal', 'bottom', padLen, padTh, player2Color,13);


  // Set movement bounds so paddles stay inside canvas
  leftPaddle.setBounds(0, width, 0, height);
  rightPaddle.setBounds(0, width, 0, height);
  topPaddle.setBounds(0, width, 0, height);
  bottomPaddle.setBounds(0, width, 0, height);

  paddles = [leftPaddle, rightPaddle, topPaddle, bottomPaddle];

  ball = new Ball(width / 2, height / 2, 10);

  // menu buttons (colors match each player's paddles)
  startButton = new Button("START", width / 2, height / 2 + 50, 300, 56, [30, 144, 255], startGame);
  howToPlayButton = new Button("HOW TO PLAY", width / 2, height / 2 + 125, 300, 56, [255, 99, 71], () => gameState = "howToPlay");
  backButton = new Button("BACK", width / 2, height - 60, 200, 50, [255, 99, 71], () => gameState = "start");

  textFont('Arial');
  textAlign(CENTER, CENTER);
}

function draw() {
  
  cursor(ARROW);
  // solid background every frame so nothing smears; the ball draws its own particle trail
  background(18);

  if (gameState === "start") {
    drawStartScreen();
    return; // stop rest of code from running
  }
  if (gameState === "howToPlay") {
    drawHowToPlay();
    return;
  }

  // ================== GAMEPLAY ================== //
  textFont(fontStyle);

// Diagonal divider
stroke(255, 10);
strokeWeight(2);
line(0, height, width, 0);

// Border around play area
noFill();
stroke(255, 180);
strokeWeight(1);
rectMode(CORNER);
rect(0, 0, width, height);
  // controls
  handleInput();

  // update ball
  ball.update();
  ball.checkPaddles(paddles);
  ball.keepInside();

  // scoring logic
  if (ball.x - ball.r < 0 || ball.y - ball.r < 0) {
    scoreRight++;
    if (scoreRight >= winningScore) {
      gameState = "gameOver";
    }
    ball.reset(1);
  } else if (ball.x + ball.r > width || ball.y + ball.r > height) {
    scoreLeft++;
    if (scoreLeft >= winningScore) {
      gameState = "gameOver";
    }
    ball.reset(-1);
  }

   // HUD
  noStroke();
  fill(0,0,220,50);
  textSize(fontSize);
  text(`${scoreLeft}`, width * 0.25, 150);
   fill(220,0,90,50);
  text(`${scoreRight}`, width * 0.75, height-150);

  // show paddles and ball
  for (let p of paddles) p.show();
  ball.show();

 

  // ================== GAME OVER SCREEN ================== //
  if (gameState === "gameOver") {
    fill(0, 200);
    rectMode(CENTER);
    rect(width / 2, height / 2, 520, 180, 8);
    fill(255);
    textSize(28);
    let winner = scoreLeft > scoreRight ? 'Player 1' : 'Player 2';
    text(`${winner} Wins!`, width / 2, height / 2 - 18);
    textSize(14);
    text('Press  "R"  to restart   |   "M"  for menu', width / 2, height / 2 + 28);
    noLoop();
  }
}

//---------------------------------------------------------|  Start Screen (Title + Menu Buttons)  |------------------------------------------------------------------//
function drawStartScreen() {
  // background divider, same as the play field
  stroke(255, 10);
  strokeWeight(2);
  line(0, height, width, 0);

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textFont(fontStyle);
  textSize(60);
  text("BITHEISM PONG", width / 2, height / 2 - 80);

  textSize(16);
  fill(200, 130);
  text("Two gods. Two paddles each. One ball.", width / 2, height / 2 - 30);

  startButton.show();
  howToPlayButton.show();
  if (startButton.isHovered() || howToPlayButton.isHovered()) cursor(HAND);

  textFont('Arial');
  textSize(12);
  fill(200, 90);
  text("ENTER to start   |   H for how to play", width / 2, height - 30);
}

//---------------------------------------------------------|  How To Play Screen  |------------------------------------------------------------------------------------//
function drawHowToPlay() {
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(fontStyle);
  fill(255);
  textSize(44);
  text("HOW TO PLAY", width / 2, 60);

  // Player panels
  drawPlayerPanel(width * 0.27, "PLAYER 1", [30, 144, 255],
    [["W / S", "Left paddle"], ["A / D", "Top paddle"]], "Defend the LEFT & TOP edges");
  drawPlayerPanel(width * 0.73, "PLAYER 2", [255, 99, 71],
    [["↑ / ↓", "Right paddle"], ["← / →", "Bottom paddle"]], "Defend the RIGHT & BOTTOM edges");

  // Rules
  textFont('Arial');
  textSize(15);
  fill(220);
  text("Let the ball escape through one of your edges and your opponent scores.", width / 2, 360);
  text("Every paddle hit speeds the ball up. First to " + winningScore + " points wins.", width / 2, 386);

  backButton.show();
  if (backButton.isHovered()) cursor(HAND);

  textSize(12);
  fill(200, 90);
  text("ESC to go back", width / 2, height - 22);
}

function drawPlayerPanel(cx, title, col, controls, goal) {
  let [r, g, b] = col;
  push();
  rectMode(CENTER);
  stroke(r, g, b, 180);
  strokeWeight(2);
  fill(r, g, b, 25);
  rect(cx, 210, 340, 190, 10);

  noStroke();
  fill(r, g, b);
  textFont(fontStyle);
  textSize(26);
  text(title, cx, 140);

  textFont('Arial');
  for (let i = 0; i < controls.length; i++) {
    let y = 190 + i * 40;
    // key cap
    fill(255, 30);
    stroke(255, 120);
    strokeWeight(1);
    rect(cx - 70, y, 90, 30, 5);
    noStroke();
    fill(255);
    textSize(16);
    textStyle(BOLD);
    text(controls[i][0], cx - 70, y);
    textStyle(NORMAL);
    fill(220);
    text(controls[i][1], cx + 60, y);
  }

  fill(r, g, b, 220);
  textSize(13);
  text(goal, cx, 280);
  pop();
}

function startGame() {
  userStartAudio(); // browsers only allow sound after a user gesture
  resetGame();
}

function mousePressed() {
  if (gameState === "start") {
    startButton.handleClick() || howToPlayButton.handleClick();
  } else if (gameState === "howToPlay") {
    backButton.handleClick();
  }
}


function handleInput() {
  // Player 1 controls
  if (keyIsDown(87)) { // W
    leftPaddle.move(0, -1);
  } else if (keyIsDown(83)) { // S
    leftPaddle.move(0, 1);
  }
  if (keyIsDown(65)) { // A
    topPaddle.move(-1, 0);
  } else if (keyIsDown(68)) { // D
    topPaddle.move(1, 0);
  }

  // Player 2 controls
  if (keyIsDown(UP_ARROW)) {
    rightPaddle.move(0, -1);
  } else if (keyIsDown(DOWN_ARROW)) {
    rightPaddle.move(0, 1);
  }
  if (keyIsDown(LEFT_ARROW)) {
    bottomPaddle.move(-1, 0);
  } else if (keyIsDown(RIGHT_ARROW)) {
    bottomPaddle.move(1, 0);
  }
}

function keyPressed() {
  // --- START SCREEN ---
  if (gameState === "start") {
    if (keyCode === ENTER) startGame();
    else if (key === 'h' || key === 'H') gameState = "howToPlay";
    return;
  }

  // --- HOW TO PLAY ---
  if (gameState === "howToPlay") {
    if (keyCode === ESCAPE || keyCode === BACKSPACE) gameState = "start";
    else if (keyCode === ENTER) startGame();
    return;
  }

  // --- GAME OVER ---
  if (key === 'r' || key === 'R') {
    resetGame();
  }

  if ((key === 'm' || key === 'M') && gameState === "gameOver") {
    gameState = "start";
    loop();
  }

  if ((key === ' ' || keyCode === 32) && gameState === "gameOver") {
    gameState = "play";
    loop();
    ball.reset(random() < 0.5 ? -1 : 1);
  }
}

function resetGame() {
  scoreLeft = 0;
  scoreRight = 0;
  ball.reset(random() < 0.5 ? -1 : 1);
  leftPaddle.y = height / 2;
  rightPaddle.y = height / 2;
  topPaddle.x = width / 2;
  bottomPaddle.x = width / 2;
  gameState = "play";
  loop();
}
