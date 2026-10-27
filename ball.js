// Spin & Slice values (spinTransfer, spinCurve, spinDecay, spinMinAway) live in CRT_DEFAULTS in crt.js
// so they can be tuned live from the settings panel (C key).

class Ball {
  constructor(x, y, r = 10) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.history = []; // previous positions for the ghost trail
    this.reset();
    this.maxSpeed = 19;
  }

reset(direction = 1) {
  this.x = FIELD_W / 2;
  this.y = FIELD_H / 2;
  this.history = [];
  this.spin = 0; // turn rate in radians/frame, + = clockwise on screen
  this.awayAxis = null; // 'x' or 'y': the direction the ball must keep travelling after a spin hit
  this.awaySign = 0;
  this.baseSpeed = 6; // reset speed each point
  let angle = random(-PI / 4, PI / 4);
  this.vx = this.baseSpeed * direction * cos(angle);
  this.vy = this.baseSpeed * sin(angle);
}

  update() {
    this.history.unshift({ x: this.x, y: this.y });
    if (this.history.length > 8) this.history.pop();
    this.applySpin();
    this.x += this.vx;
    this.y += this.vy;
  }

  // Called on a paddle hit (after bouncing), with how far the paddle moved this frame.
  hitSpin(paddleVx, paddleVy, awayAxis) {
    // slice: paddle movement pushes straight into the ball's angle
    this.vx += paddleVx * crtSettings.spinTransfer;
    this.vy += paddleVy * crtSettings.spinTransfer;

    // spin: the ball keeps turning the way the paddle was moving.
    // cross product of ball direction and paddle movement gives the turn direction for any paddle/side
    let speed = sqrt(this.vx * this.vx + this.vy * this.vy);
    this.spin = crtSettings.spinCurve * (this.vx * paddleVy - this.vy * paddleVx) / speed;

    this.awayAxis = awayAxis;
    this.awaySign = awayAxis === 'x' ? Math.sign(this.vx) : Math.sign(this.vy);
  }

  applySpin() {
    if (this.spin === 0) return;
    // rotate the velocity: changes direction, never speed
    let c = cos(this.spin);
    let s = sin(this.spin);
    let vx = this.vx * c - this.vy * s;
    let vy = this.vx * s + this.vy * c;
    this.vx = vx;
    this.vy = vy;

    this.spin *= crtSettings.spinDecay;
    if (abs(this.spin) < 0.0005) this.spin = 0;
    this.keepHeadingAway();
  }

  // stop a curve from bending the ball back into (or parallel to) the paddle that hit it
  keepHeadingAway() {
    if (!this.awayAxis) return;
    let speed = sqrt(this.vx * this.vx + this.vy * this.vy);
    let minAway = speed * crtSettings.spinMinAway;
    let side = sqrt(speed * speed - minAway * minAway);
    if (this.awayAxis === 'x' && this.vx * this.awaySign < minAway) {
      this.vx = this.awaySign * minAway;
      this.vy = Math.sign(this.vy) * side;
      this.spin = 0;
    } else if (this.awayAxis === 'y' && this.vy * this.awaySign < minAway) {
      this.vy = this.awaySign * minAway;
      this.vx = Math.sign(this.vx) * side;
      this.spin = 0;
    }
  }

  show() {
    push();
    noStroke();
    let c = color(this.color || '#ffdc50');
    // ghost trail: each older copy fades like the old see-through background did (x0.6 per frame)
    for (let i = 0; i < this.history.length; i++) {
      c.setAlpha(255 * pow(0.6, i + 1));
      fill(c);
      circle(this.history[i].x, this.history[i].y, this.r * 2);
    }
    c.setAlpha(255);
    fill(c);
    circle(this.x, this.y, this.r * 2);
    pop();
  }

  limitSpeed() {
  // Keep constant speed for now — easy to tweak
  let speed = sqrt(this.vx*this.vx + this.vy*this.vy);
  let desired = this.baseSpeed || 6; // base speed
  this.vx = (this.vx / speed) * desired;
  this.vy = (this.vy / speed) * desired;
}

increaseSpeed() {
  // optional gradual increase — call this after paddle collision
  if (!this.baseSpeed) this.baseSpeed = 6;
  this.baseSpeed = min(this.baseSpeed + 0.3, this.maxSpeed || 12);
}

  // Check collisions with paddles array
  checkPaddles(paddles) {
    for (let p of paddles) {
     if (p.collideBall(this)) {
  if (ballHitSound) {
    ballHitSound.play();
  }
  crtKick(); // screen bulge on every paddle hit (strength set in crt.js / slider panel)
}
    }
  }

  // Because we removed top/bottom wall bounces, we only bounce off canvas horizontal edges
  // if you prefer otherwise, this enforces vertical boundaries too to prevent leaving top/bottom
  keepInside() {
    // small safeguard: if ball somehow leaves top/bottom, clamp and reflect
    // if (this.y - this.r < 0) {
    //   this.y = this.r;
    //   this.vy *= -1;
    // }
    // if (this.y + this.r > height) {
    //   this.y = height - this.r;
    //   this.vy *= -1;
    // }
  }
}
