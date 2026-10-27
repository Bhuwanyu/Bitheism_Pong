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
let winningScore = 11; // points needed to win one round
//---------------------------------------------------------|  Best Of Three Rounds  |--------------------------------------------------------------------------------//
let roundsToWin = 2; // first to 2 rounds wins the match (best of three)
let roundsLeft = 0; // rounds won by Player 1
let roundsRight = 0; // rounds won by Player 2
let roundNumber = 1;
let roundWinner = ''; // 'Player 1' or 'Player 2', winner of the last round (or the match)
let roundTimer = 0; // millis() when the current round banner started
const ROUND_OVER_MS = 1800; // "Player X wins round N" banner
const ROUND_INTRO_MS = 1300; // "ROUND N" banner before the ball moves
let fontStyle;
let cnv; // main canvas, scaled to fit the window in fitToWindow()
//---------------------------------------------------------|  Canvas Layout  |---------------------------------------------------------------------------------------//
// Size of the playing field (and the canvas)
const FIELD_W = 900;
const FIELD_H = 540;
function preload(){
  fontStyle= loadFont("Font/Decaydence.otf");
  soundFormats('mp3','wav');
  ballHitSound =loadSound("Sounds/BallHit.wav");

}

function setup() {
  // create canvas inside #game-container to keep it centered
  const container = document.getElementById('game-container');
  cnv = createCanvas(FIELD_W, FIELD_H);
  cnv.parent(container);
  fitToWindow();
  createRoundMarkers();

  // paddles
  let padLen = 140;
  let padTh = 14;

  // Player 1 color (blueish)
  let player1Color = [30, 144, 255, 180];
  // Player 2 color (orange/redish)
  let player2Color = [255, 99, 71, 180];

  // Player 1 paddles
  leftPaddle = new Paddle(30, FIELD_H / 2, 'vertical', 'left', padLen, padTh, player1Color,10);
  topPaddle = new Paddle(FIELD_W / 2, 30, 'horizontal', 'top', padLen, padTh, player1Color,13);

  // Player 2 paddles
  rightPaddle = new Paddle(FIELD_W - 30, FIELD_H / 2, 'vertical', 'right', padLen, padTh, player2Color,10);
  bottomPaddle = new Paddle(FIELD_W / 2, FIELD_H - 30, 'horizontal', 'bottom', padLen, padTh, player2Color,13);


  // Set movement bounds so paddles stay inside canvas
  leftPaddle.setBounds(0, FIELD_W, 0, FIELD_H);
  rightPaddle.setBounds(0, FIELD_W, 0, FIELD_H);
  topPaddle.setBounds(0, FIELD_W, 0, FIELD_H);
  bottomPaddle.setBounds(0, FIELD_W, 0, FIELD_H);

  paddles = [leftPaddle, rightPaddle, topPaddle, bottomPaddle];

  ball = new Ball(FIELD_W / 2, FIELD_H / 2, 10);

  // menu buttons (colors match each player's paddles)
  startButton = new Button("START", FIELD_W / 2, FIELD_H / 2 + 50, 300, 56, [30, 144, 255], startGame);
  howToPlayButton = new Button("HOW TO PLAY", FIELD_W / 2, FIELD_H / 2 + 125, 300, 56, [255, 99, 71], () => gameState = "howToPlay");
  backButton = new Button("BACK", FIELD_W / 2, FIELD_H - 60, 200, 50, [255, 99, 71], () => gameState = "start");

  textFont('Arial');
  textAlign(CENTER, CENTER);
}

function draw() {
  if (window.innerWidth + 'x' + window.innerHeight !== fittedSize) fitToWindow();
  cursor(ARROW);
  // wipe every frame so nothing smears; the ball draws its own particle trail.
  // With the CRT screen on, leave it transparent: the shader paints the background (plain colour or moving pattern).
  if (crtActive()) clear();
  else background(crtSettings.bgColor);
  applyGameColors(); // colours come from the settings panel, see crt.js

  drawScene();
  updateRoundMarkers();
}

// Mouse in field coordinates (through the CRT curve)
function fieldMouse() {
  return crtMouse();
}

function drawScene() {
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

  drawDivider();

// Border around play area
noFill();
stroke(255, 180);
strokeWeight(1);
rectMode(CORNER);
rect(0, 0, FIELD_W, FIELD_H);
  // controls (paddles can already move during the "ROUND N" banner)
  if (gameState === "play" || gameState === "roundIntro") handleInput();
  for (let p of paddles) p.trackVelocity();

  // update ball only while a round is actually being played
  if (gameState === "play") {
    ball.update();
    ball.checkPaddles(paddles);
    ball.keepInside();

    // scoring logic
    if (ball.x - ball.r < 0 || ball.y - ball.r < 0) {
      scoreRight++;
      ball.reset(1);
      if (scoreRight >= winningScore) endRound('right');
    } else if (ball.x + ball.r > FIELD_W || ball.y + ball.r > FIELD_H) {
      scoreLeft++;
      ball.reset(-1);
      if (scoreLeft >= winningScore) endRound('left');
    }
  }

   // HUD
  noStroke();
  fill(...p1Rgb, 50);
  textSize(fontSize);
  text(`${scoreLeft}`, FIELD_W * 0.25, 150);
  fill(...p2Rgb, 50);
  text(`${scoreRight}`, FIELD_W * 0.75, FIELD_H-150);

  // show paddles and ball
  for (let p of paddles) p.show();
  ball.show();

  // ================== ROUND BANNERS ================== //
  if (gameState === "roundOver") {
    let col = roundWinner === 'Player 1' ? p1Rgb : p2Rgb;
    drawBanner(`${roundWinner} wins round ${roundNumber}`, col, 34);
    if (millis() - roundTimer > ROUND_OVER_MS) {
      roundNumber++;
      startRound();
    }
  } else if (gameState === "roundIntro") {
    drawBanner(`ROUND ${roundNumber}`, [255, 255, 255], 56);
    if (millis() - roundTimer > ROUND_INTRO_MS) gameState = "play";
  }

  // ================== GAME OVER SCREEN ================== //
  if (gameState === "gameOver") {
    fill(0, 200);
    rectMode(CENTER);
    rect(FIELD_W / 2, FIELD_H / 2, 520, 200, 8);
    let col = roundWinner === 'Player 1' ? p1Rgb : p2Rgb;
    fill(...col);
    textSize(30);
    text(`${roundWinner} Wins The Match!`, FIELD_W / 2, FIELD_H / 2 - 34);
    fill(255);
    textSize(18);
    text(`Rounds  ${roundsLeft} - ${roundsRight}`, FIELD_W / 2, FIELD_H / 2 + 6);
    textSize(14);
    text('Press  "R"  to restart   |   "M"  for menu', FIELD_W / 2, FIELD_H / 2 + 46);
    noLoop();
  }
}

//---------------------------------------------------------|  Rounds (Best Of Three)  |-------------------------------------------------------------------------------//
function endRound(side) {
  if (side === 'left') roundsLeft++;
  else roundsRight++;
  roundWinner = side === 'left' ? 'Player 1' : 'Player 2';

  if (roundsLeft >= roundsToWin || roundsRight >= roundsToWin) {
    gameState = "gameOver";
  } else {
    gameState = "roundOver";
    roundTimer = millis();
  }
}

// fresh scores, ball and paddles, then show the "ROUND N" banner
function startRound() {
  scoreLeft = 0;
  scoreRight = 0;
  ball.reset(random() < 0.5 ? -1 : 1);
  leftPaddle.y = FIELD_H / 2;
  rightPaddle.y = FIELD_H / 2;
  topPaddle.x = FIELD_W / 2;
  bottomPaddle.x = FIELD_W / 2;
  gameState = "roundIntro";
  roundTimer = millis();
}

function drawBanner(msg, col, size) {
  push();
  rectMode(CENTER);
  noStroke();
  fill(0, 190);
  rect(FIELD_W / 2, FIELD_H / 2, FIELD_W, 110);
  fill(...col);
  textAlign(CENTER, CENTER);
  textFont(fontStyle);
  textSize(size);
  text(msg, FIELD_W / 2, FIELD_H / 2);
  pop();
}

//---------------------------------------------------------|  Round-Win Squares (outside the screen)  |-------------------------------------------------------------//
// Mortal Kombat style win squares, drawn as page elements in the black space OUTSIDE the curved screen:
// Player 1 just left of the left edge near the top-left corner, Player 2 just right of the right edge near the
// bottom-right corner. Each square sits along the curved edge and is tilted to match it. Filled = round won.
const MARKER_GAP = 6; // CSS px between the curved edge and the squares, and between squares
let markerBoxes = {}; // { p1: div, p2: div }

function createRoundMarkers() {
  for (let side of ['p1', 'p2']) {
    let box = document.createElement('div');
    box.className = 'round-markers';
    for (let i = 0; i < roundsToWin; i++) box.appendChild(document.createElement('div'));
    document.body.appendChild(box);
    markerBoxes[side] = box;
  }
}

function updateRoundMarkers() {
  let show = gameState !== "start" && gameState !== "howToPlay";
  let r = cnv.elt.getBoundingClientRect();
  let hw = r.width / 2; // all maths below is in CSS px from the screen centre
  let hh = r.height / 2;
  let cx = r.left + hw;
  let cy = r.top + hh;
  let want = constrain(round(22 * r.width / width), 12, 30);
  let startY = crtCornerX() * hh + r.height * 0.04; // a little down from the curved corner

  // The left edge is the top edge's curve turned sideways, so crtTopEdge(y) gives the edge's x at height y.
  // Squares further from the corner have less room left of the curve: shrink them to fit if needed.
  let size = want;
  for (let pass = 0; pass < 2; pass++) {
    let lastY = startY + (roundsToWin - 1) * (size + MARKER_GAP) + size;
    let room = cx + crtTopEdge(lastY / hh).y * hw; // px from the page's left side to the edge there
    size = constrain(min(want, room - MARKER_GAP * 2), 8, want);
  }

  for (let [side, won, col] of [['p1', roundsLeft, p1Rgb], ['p2', roundsRight, p2Rgb]]) {
    let box = markerBoxes[side];
    box.style.display = show ? 'block' : 'none';
    if (!show) continue;

    let rgb = `rgb(${col.join(',')})`;
    [...box.children].forEach((sq, i) => {
      // point on the curved left edge, then push out (leftwards) along the edge's normal
      let y = startY + size / 2 + i * (size + MARKER_GAP);
      let edge = crtTopEdge(y / hh);
      let k = edge.slope * hw / hh; // edge's dx/dy in px
      let n = sqrt(1 + k * k);
      let out = MARKER_GAP + size / 2;
      let px = edge.y * hw - (1 / n) * out;
      let py = y + (k / n) * out;
      if (side === 'p2') { px = -px; py = -py; } // bottom-right is the top-left mirrored through the centre

      sq.style.width = sq.style.height = size + 'px';
      sq.style.left = (cx + px - size / 2) + 'px';
      sq.style.top = (cy + py - size / 2) + 'px';
      sq.style.transform = `rotate(${-atan(k)}rad)`;
      sq.style.borderColor = rgb;
      sq.style.background = i < won ? rgb : `rgba(${col.join(',')}, 0.1)`;
      sq.style.boxShadow = i < won ? `0 0 ${size / 2}px ${rgb}` : 'none';
    });
  }
}

//---------------------------------------------------------|  Start Screen (Title + Menu Buttons)  |------------------------------------------------------------------//
// Diagonal divider. With the CRT screen on, crt.js draws it as a glowing wave instead (see "Diagonal line" in the panel).
function drawDivider() {
  if (crtActive() && crtSettings.lineOn) return;
  stroke(255, 10);
  strokeWeight(2);
  line(0, FIELD_H, FIELD_W, 0);
}

function drawStartScreen() {
  // background divider, same as the play field
  drawDivider();

  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textFont(fontStyle);
  textSize(60);
  text("BITHEISM PONG", FIELD_W / 2, FIELD_H / 2 - 80);

  textSize(16);
  fill(200, 130);
  text("Two gods. Two paddles each. One ball.", FIELD_W / 2, FIELD_H / 2 - 30);

  startButton.show();
  howToPlayButton.show();
  if (startButton.isHovered() || howToPlayButton.isHovered()) cursor(HAND);

  textFont('Arial');
  textSize(12);
  fill(200, 90);
  text("ENTER to start   |   H for how to play   |   F for fullscreen   |   N music on/off", FIELD_W / 2, FIELD_H - 30);
}

//---------------------------------------------------------|  How To Play Screen  |------------------------------------------------------------------------------------//
function drawHowToPlay() {
  noStroke();
  textAlign(CENTER, CENTER);
  textFont(fontStyle);
  fill(255);
  textSize(44);
  text("HOW TO PLAY", FIELD_W / 2, 60);

  // Player panels
  drawPlayerPanel(FIELD_W * 0.27, "PLAYER 1", p1Rgb,
    [["W / S", "Left paddle"], ["A / D", "Top paddle"]], "Defend the LEFT & TOP edges");
  drawPlayerPanel(FIELD_W * 0.73, "PLAYER 2", p2Rgb,
    [["↑ / ↓", "Right paddle"], ["← / →", "Bottom paddle"]], "Defend the RIGHT & BOTTOM edges");

  // Rules
  textFont('Arial');
  textSize(15);
  fill(220);
  text("Let the ball escape through one of your edges and your opponent scores.", FIELD_W / 2, 360);
  text("Every paddle hit speeds the ball up. First to " + winningScore + " points wins the round.", FIELD_W / 2, 386);
  text("Best of three: win " + roundsToWin + " rounds to win the match.", FIELD_W / 2, 412);

  backButton.show();
  if (backButton.isHovered()) cursor(HAND);

  textSize(12);
  fill(200, 90);
  text("ESC to go back", FIELD_W / 2, FIELD_H - 22);
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

//---------------------------------------------------------|  Game Colours  |----------------------------------------------------------------------------------------//
let p1Rgb, p2Rgb; // player colours as [r, g, b], refreshed every frame from the settings panel

function rgbOf(hex) {
  let c = color(hex);
  return [red(c), green(c), blue(c)];
}

function applyGameColors() {
  p1Rgb = rgbOf(crtSettings.p1Color);
  p2Rgb = rgbOf(crtSettings.p2Color);
  leftPaddle.color = topPaddle.color = [...p1Rgb, 180]; // paddles stay slightly see-through
  rightPaddle.color = bottomPaddle.color = [...p2Rgb, 180];
  ball.color = crtSettings.ballColor;
  // menu buttons match the player they belong to
  startButton.color = p1Rgb;
  howToPlayButton.color = backButton.color = p2Rgb;
}

//---------------------------------------------------------|  Fit To Screen  |---------------------------------------------------------------------------------------//
// The game always plays in the same fixed-size canvas; this only scales how big it looks.
// Higher pixelDensity keeps it sharp instead of a blurry stretched image.
let fittedSize = ''; // window size the canvas was last fitted to

function fitToWindow() {
  // read the window directly: a page loaded hidden (background tab, collapsed itch.io embed) can start at 0x0
  // and may never get a resize event, so draw() re-checks this every frame
  let ww = window.innerWidth;
  let wh = window.innerHeight;
  if (ww === 0 || wh === 0) return;
  fittedSize = ww + 'x' + wh;
  let s = min(ww / width, wh / height);
  pixelDensity(constrain(s * window.devicePixelRatio, 1, 3)); // note: this resets the canvas style size, so set it after
  // set CSS on the element directly: p5's cnv.style('width') would also overwrite the renderer's internal size
  cnv.elt.style.width = floor(width * s) + 'px';
  cnv.elt.style.height = floor(height * s) + 'px';
}

function windowResized() {
  fitToWindow();
  if (!isLooping()) redraw(); // game over screen is paused, redraw it at the new size
}

function startGame() {
  userStartAudio(); // browsers only allow sound after a user gesture
  resetGame();
}

function mousePressed(event) {
  if (typeof crtPanelHit === 'function' && crtPanelHit(event)) return; // clicking the slider panel, not the game
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
  // F toggles real fullscreen in any screen; windowResized() then rescales the game
  if (key === 'f' || key === 'F') {
    fullscreen(!fullscreen());
    return;
  }

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
    resetGame(); // new match
  }
}

// brand new match: round wins cleared, starts at "ROUND 1"
function resetGame() {
  roundsLeft = 0;
  roundsRight = 0;
  roundNumber = 1;
  startRound();
  loop();
}
