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
  this.x = width / 2;
  this.y = height / 2;
  this.history = [];
  this.baseSpeed = 6; // reset speed each point
  let angle = random(-PI / 4, PI / 4);
  this.vx = this.baseSpeed * direction * cos(angle);
  this.vy = this.baseSpeed * sin(angle);
}

  update() {
    this.history.unshift({ x: this.x, y: this.y });
    if (this.history.length > 8) this.history.pop();
    this.x += this.vx;
    this.y += this.vy;
  }

  show() {
    push();
    noStroke();
    // ghost trail: each older copy fades like the old see-through background did (x0.6 per frame)
    for (let i = 0; i < this.history.length; i++) {
      fill(255, 220, 80, 255 * pow(0.6, i + 1));
      circle(this.history[i].x, this.history[i].y, this.r * 2);
    }
    fill(255, 220, 80);
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
