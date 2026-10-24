class Paddle {
  constructor(x, y, orientation, side, length = 120, thickness = 12, color = [30, 144, 255, 180],speed) {
    this.x = x;
    this.y = y;
    this.orientation = orientation;
    this.side = side;
    this.length = length;
    this.thickness = thickness;
    this.speed = speed;
    this.color = color; // 💡 store color
  }

  setBounds(minX, maxX, minY, maxY) {
    this.minX = minX;
    this.maxX = maxX;
    this.minY = minY;
    this.maxY = maxY;
  }

  move(dx, dy) {
    this.x += dx * this.speed;
    this.y += dy * this.speed;

    if (this.orientation === 'vertical') {
      this.y = constrain(this.y, this.minY + this.length / 2, this.maxY - this.length / 2);
    } else {
      this.x = constrain(this.x, this.minX + this.length / 2, this.maxX - this.length / 2);
    }
  }

  show() {
    push();
    rectMode(CENTER);
    stroke(200);
    fill(this.color); // 🎨 use each paddle's color
    if (this.orientation === 'vertical') {
      rect(this.x, this.y, this.thickness, this.length, 4);
    } else {
      rect(this.x, this.y, this.length, this.thickness, 4);
    }
    pop();
  }

  // check collision with ball (circle). Returns true if collided and adjusts ball vel.
  collideBall(ball) {
  if (this.orientation === 'vertical') {
    let left = this.x - this.thickness / 2;
    let right = this.x + this.thickness / 2;
    let top = this.y - this.length / 2;
    let bottom = this.y + this.length / 2;

    let closestX = constrain(ball.x, left, right);
    let closestY = constrain(ball.y, top, bottom);
    let distSq = (ball.x - closestX) ** 2 + (ball.y - closestY) ** 2;

    if (distSq <= ball.r * ball.r) {
      // Reflect horizontally
      if (ball.x < this.x) ball.x = left - ball.r - 0.1;
      else ball.x = right + ball.r + 0.1;

      ball.vx *= -1;

      // Keep speed stable and slightly increase
      ball.increaseSpeed();
      ball.limitSpeed();
      return true;
    }
  } else {
    let top = this.y - this.thickness / 2;
    let bottom = this.y + this.thickness / 2;
    let left = this.x - this.length / 2;
    let right = this.x + this.length / 2;

    let closestX = constrain(ball.x, left, right);
    let closestY = constrain(ball.y, top, bottom);
    let distSq = (ball.x - closestX) ** 2 + (ball.y - closestY) ** 2;

    if (distSq <= ball.r * ball.r) {
      // Reflect vertically
      if (ball.y < this.y) ball.y = top - ball.r - 0.1;
      else ball.y = bottom + ball.r + 0.1;

      ball.vy *= -1;

      // Keep speed stable and slightly increase
      ball.increaseSpeed();
      ball.limitSpeed();
      return true;
    }
  }
  return false;
}
}
