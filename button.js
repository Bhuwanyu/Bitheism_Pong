class Button {
  constructor(label, x, y, w, h, color = [255, 255, 255], onClick = () => {}) {
    this.label = label;
    this.x = x; // center x
    this.y = y; // center y
    this.w = w;
    this.h = h;
    this.color = color; // accent color used for outline & hover fill
    this.onClick = onClick;
    this.hoverAmt = 0; // 0..1, eased so the hover glow fades in/out
  }

  isHovered() {
    let m = fieldMouse(); // mouse mapped through the CRT curve, in field coordinates
    return (
      m.x > this.x - this.w / 2 && m.x < this.x + this.w / 2 &&
      m.y > this.y - this.h / 2 && m.y < this.y + this.h / 2
    );
  }

  show() {
    let target = this.isHovered() ? 1 : 0;
    this.hoverAmt = lerp(this.hoverAmt, target, 0.2);

    let [r, g, b] = this.color;
    let grow = this.hoverAmt * 6; // button swells slightly on hover

    push();
    rectMode(CENTER);
    // glow
    noStroke();
    fill(r, g, b, 40 * this.hoverAmt);
    rect(this.x, this.y, this.w + grow + 16, this.h + grow + 16, 12);
    // body
    stroke(r, g, b, 200);
    strokeWeight(2);
    fill(r, g, b, 30 + 170 * this.hoverAmt);
    rect(this.x, this.y, this.w + grow, this.h + grow, 8);
    // label
    noStroke();
    fill(255);
    textFont(fontStyle);
    textAlign(CENTER, CENTER);
    textSize(24);
    text(this.label, this.x, this.y - 2);
    pop();
  }

  // returns true if this click landed on the button
  handleClick() {
    if (this.isHovered()) {
      this.onClick();
      return true;
    }
    return false;
  }
}
