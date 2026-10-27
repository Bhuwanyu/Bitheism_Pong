//---------------------------------------------------------|  CRT Screen Effect (WebGL post-process)  |-------------------------------------------------------------//
// The game still draws normally on the p5 2D canvas. Every frame this script copies that canvas into a WebGL
// overlay and bends it like an old curved TV: barrel curvature, scanlines, colour fringing, glow and vignette.
// Because the WHOLE picture is bent, the border becomes curved and the paddles slide along curved tracks,
// while the game physics stays simple and flat underneath (what you see always matches what collides).

// Default look of the screen and game colours. Tune these live with the slider panel (press C in game),
// then hit "Copy values" in the panel and paste the result over this block.
const CRT_DEFAULTS = {
  enabled: true,
  curvature: 0.27,    // 0 = flat screen, higher = more bulged
  kickStrength: 0.71, // how hard each paddle hit bumps the screen (0 = off)
  kickBend: 0.17,     // extra curvature at full bump
  kickDecay: 0.95,    // how fast the bump settles (closer to 1 = slower)
  fringe: 0.004,      // colour split toward the edges
  kickFringe: 0.037,  // extra colour split at full bump
  glow: 0.77,         // soft bloom around bright things
  glowRadius: 1.7,    // bloom spread in pixels
  scanlines: 0.28,    // scanline darkness
  scanlineSize: 1.3,  // scanline thickness
  roll: 0.09,         // brightness of the slow rolling band
  rollSpeed: 0.35,
  flicker: 0.02,
  vignette: 0.15,     // dark corners
  brightness: 1.39,
  contrast: 1.16,
  saturation: 1.69,
  // game colours (used by sketch.js / ball.js, also tuned in the panel)
  bgColor: '#121212',
  p1Color: '#1e90ff',  // player 1 paddles (left + top)
  p2Color: '#ff6347',  // player 2 paddles (right + bottom)
  ballColor: '#ffdc50',
  // gameplay: Spin & Slice (used by ball.js)
  spinTransfer: 0.4,   // how much of the paddle's movement goes straight into the ball's angle on hit
  spinCurve: 0.003,    // how hard the ball keeps curving afterwards
  spinDecay: 0.96,     // how fast the curve fades (closer to 1 = longer curve)
  spinMinAway: 0.3,    // ball always keeps at least this share of its speed heading away from the paddle
  // Balatro-style swirling background, painted in the game colours behind everything
  patternOn: false,
  patternSpeed: 1,
  patternSwirl: 1,     // how much it twists around the centre
  patternScale: 1,     // size of the paint streaks
  patternStrength: 0,  // how strongly the pattern shows over the plain background colour
  patternPixel: 3,     // chunky pixel size (1 = smooth)
  // glowing wave along the diagonal divider (drawn behind the ball and paddles)
  lineOn: true,
  lineAmp: 1,          // wave height in game pixels (grows on paddle hits)
  lineWaves: 2,        // how many waves along the line
  lineSpeed: 1.04,
  lineGlow: 0.19,      // soft glow around the line, tinted with each player's colour on their side
  lineWidth: 0.4,      // bright core thickness in game pixels
  // background music (music.js); players can also toggle it with N
  musicOn: true,
  musicVolume: 0.5,
};

// Live values the shader reads every frame (the panel edits this object)
let crtSettings = { ...CRT_DEFAULTS };
try {
  Object.assign(crtSettings, JSON.parse(localStorage.getItem('crtSettings') || '{}'));
} catch (e) {}

let crtKickAmt = 0; // 0..1, bumped on paddle hits
let crtGL = null;

// true while the WebGL screen is showing: the game then leaves its background transparent and the shader paints it
function crtActive() {
  return !!crtGL && crtSettings.enabled;
}

function crtCurvatureNow() {
  return crtSettings.curvature + crtKickAmt * crtSettings.kickBend;
}

// Same warp the shader uses. Takes a 0..1 screen position, returns where it lands on the flat game canvas.
function crtWarp(u, v) {
  let c = crtCurvatureNow();
  let x = u * 2 - 1;
  let y = v * 2 - 1;
  let ox = Math.abs(y) * c;
  let oy = Math.abs(x) * c;
  x += x * ox * ox;
  y += y * oy * oy;
  return [x * 0.5 + 0.5, y * 0.5 + 0.5];
}

// Where the curved screen's TOP edge is drawn, in screen coords from the centre (-1..1, y down).
// Returns its y at screen x `sx`, and its slope dy/dx there. The bottom edge is the mirror image.
function crtTopEdge(sx) {
  let c = crtGL && crtSettings.enabled ? crtCurvatureNow() : 0;
  let k = 1 + c * c * sx * sx;
  return { y: -1 / k, slope: 2 * c * c * sx / (k * k) };
}

// Screen x (-1..1) of the curved screen's top-left corner
function crtCornerX() {
  let c = crtGL && crtSettings.enabled ? crtCurvatureNow() : 0;
  let s = -1;
  for (let i = 0; i < 8; i++) s = -1 / (1 + c * c * s * s);
  return s;
}

// Mouse position in game space, so buttons still line up with where they appear on the curved screen.
function crtMouse() {
  if (!crtGL || !crtSettings.enabled) return { x: mouseX, y: mouseY };
  let [u, v] = crtWarp(mouseX / width, mouseY / height);
  return { x: u * width, y: v * height };
}

// Call on impacts for a quick screen bulge + colour split.
function crtKick(amount = crtSettings.kickStrength) {
  crtKickAmt = Math.min(1, crtKickAmt + amount);
}

const CRT_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const CRT_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex; // the game, transparent where nothing is drawn (premultiplied alpha)
uniform vec3 uBg;       // background colour
uniform vec3 uC1;       // player 1 colour (pattern)
uniform vec3 uC2;       // player 2 colour (pattern)
uniform float uPatOn;
uniform float uPatSpeed;
uniform float uPatSwirl;
uniform float uPatScale;
uniform float uPatStrength;
uniform float uPatPixel;
uniform float uLineOn;
uniform float uLineAmp;
uniform float uLineWaves;
uniform float uLineSpeed;
uniform float uLineGlow;
uniform float uLineWidth;
uniform float uKick;    // 0..1 paddle-hit bump
uniform vec2 uRes;     // game size in CSS pixels
uniform float uTime;
uniform float uCurvature;
uniform float uFringe;
uniform float uGlow;
uniform float uGlowRadius;
uniform float uScan;
uniform float uScanSize;
uniform float uRoll;
uniform float uRollSpeed;
uniform float uFlicker;
uniform float uVignette;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
varying vec2 vUv;

vec2 warp(vec2 uv) {
  uv = uv * 2.0 - 1.0;
  vec2 o = abs(uv.yx) * uCurvature;
  uv += uv * o * o;
  return uv * 0.5 + 0.5;
}

// Balatro-style swirling paint: the space is twisted around the centre, then folded over itself
// a few times so smooth bands turn into flowing streaks, coloured with the two player colours.
vec3 pattern(vec2 uv) {
  vec2 px = floor(uv * uRes / uPatPixel) * uPatPixel; // chunky pixels
  vec2 p = (px - 0.5 * uRes) / uRes.y * 5.0 / uPatScale;
  float t = uTime * uPatSpeed;

  float r = length(p);
  float a = atan(p.y, p.x) + t * 0.12 - uPatSwirl * 0.5 * r;
  p = r * vec2(cos(a), sin(a));

  vec2 q = p;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    q += 0.55 * vec2(cos(q.y * 1.3 + t * 0.30 + fi), sin(q.x * 1.1 - t * 0.22 + fi * 1.7));
    q -= 0.35 * vec2(sin(q.x + q.y), cos(q.x * 0.7 - q.y));
  }
  float paint = 0.5 + 0.5 * sin(length(q) * 1.6 + t * 0.2);

  vec3 col = mix(uBg, uC1, smoothstep(0.65, 0.95, paint));
  col = mix(col, uC2, smoothstep(0.35, 0.05, paint));
  return mix(uBg, col, uPatStrength);
}

// Glowing wave along the diagonal divider, from the bottom-left corner to the top-right corner of the field.
// uv is 0..1 with y down. Works in game pixels so it looks the same at any screen size.
vec3 diagonal(vec2 uv) {
  vec2 field = vec2(900.0, 540.0);
  vec2 p = uv * field;
  vec2 a = vec2(0.0, field.y);
  float len = length(field);
  vec2 d = vec2(field.x, -field.y) / len; // along the line
  vec2 n = vec2(-d.y, d.x);               // across it, pointing to player 2's side
  float s = dot(p - a, d);
  float t = dot(p - a, n);

  // two waves travelling along the line; they swell on paddle hits
  float k = 6.2831 * uLineWaves / len;
  float w = uTime * uLineSpeed;
  float amp = uLineAmp * (1.0 + uKick * 1.5);
  float off = amp * (0.7 * sin(s * k - w * 2.0) + 0.3 * sin(s * k * 2.3 + w * 1.3));
  float dist = t - off;

  float core = smoothstep(uLineWidth + 1.0, uLineWidth * 0.5, abs(dist));
  float glow = exp(-abs(dist) / 10.0) * uLineGlow;
  float pulse = 0.7 + 0.3 * sin(s * 0.03 - w * 3.0); // bright pulses running along it
  vec3 side = mix(uC1, uC2, smoothstep(-4.0, 4.0, dist)); // each player's colour on their side
  return (side * glow + mix(side, vec3(1.0), 0.6) * core) * pulse;
}

// game pixel over the background; red and blue taps are pushed apart for colour fringing
vec3 sampleRGB(vec2 uv, float split, vec3 bg) {
  vec2 d = (uv - 0.5) * split;
  vec4 r = texture2D(uTex, uv + d);
  vec4 g = texture2D(uTex, uv);
  vec4 b = texture2D(uTex, uv - d);
  return vec3(r.r + bg.r * (1.0 - r.a), g.g + bg.g * (1.0 - g.a), b.b + bg.b * (1.0 - b.a));
}

void main() {
  vec2 uv = warp(vUv);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 bg = uPatOn > 0.5 ? pattern(vec2(uv.x, 1.0 - uv.y)) : uBg;
  if (uLineOn > 0.5) bg += diagonal(vec2(uv.x, 1.0 - uv.y));

  // colour fringing grows toward the edges and on hits
  vec3 col = sampleRGB(uv, uFringe, bg);

  // cheap glow: soft blur of the bright parts added back on top
  vec2 px = uGlowRadius / uRes;
  vec3 glow = vec3(0.0);
  glow += texture2D(uTex, uv + vec2( 1.0, 0.0) * px).rgb;
  glow += texture2D(uTex, uv + vec2(-1.0, 0.0) * px).rgb;
  glow += texture2D(uTex, uv + vec2(0.0,  1.0) * px).rgb;
  glow += texture2D(uTex, uv + vec2(0.0, -1.0) * px).rgb;
  glow += texture2D(uTex, uv + vec2( 2.0, 2.0) * px).rgb;
  glow += texture2D(uTex, uv + vec2(-2.0, 2.0) * px).rgb;
  glow += texture2D(uTex, uv + vec2( 2.0,-2.0) * px).rgb;
  glow += texture2D(uTex, uv + vec2(-2.0,-2.0) * px).rgb;
  col += glow / 8.0 * uGlow;

  // colour grading
  col = (col - 0.5) * uContrast + 0.5;
  col *= uBrightness;
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, uSaturation);

  // scanlines
  float scan = (1.0 - uScan) + uScan * sin(uv.y * uRes.y * 3.14159 / uScanSize);
  // slow rolling brightness band
  float roll = 1.0 + uRoll * smoothstep(0.0, 0.08, 0.08 - abs(fract(uv.y * 0.6 - uTime * uRollSpeed) - 0.5));
  // tiny flicker
  float flicker = (1.0 - uFlicker) + uFlicker * sin(uTime * 60.0);
  // vignette, darkens toward the curved edges
  vec2 v = uv * (1.0 - uv);
  float vig = clamp(pow(v.x * v.y * 18.0, uVignette), 0.0, 1.0);

  gl_FragColor = vec4(max(col, 0.0) * scan * roll * flicker * vig, 1.0);
}`;

const CRT_UNIFORMS = ['uRes', 'uTime', 'uCurvature', 'uFringe', 'uGlow', 'uGlowRadius', 'uScan', 'uScanSize',
  'uRoll', 'uRollSpeed', 'uFlicker', 'uVignette', 'uBrightness', 'uContrast', 'uSaturation',
  'uBg', 'uC1', 'uC2', 'uPatOn', 'uPatSpeed', 'uPatSwirl', 'uPatScale', 'uPatStrength', 'uPatPixel',
  'uLineOn', 'uLineAmp', 'uLineWaves', 'uLineSpeed', 'uLineGlow', 'uLineWidth', 'uKick'];

// '#1e90ff' -> [0.12, 0.56, 1.0]
function crtHexToRgb(hex) {
  let n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function crtCompile(gl, type, src) {
  let s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('CRT shader error:', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

function crtInit(source) {
  let overlay = document.createElement('canvas');
  overlay.id = 'crt-overlay';
  let gl = overlay.getContext('webgl', { premultipliedAlpha: false });
  if (!gl) return null; // no WebGL: game just shows the plain flat canvas

  let vs = crtCompile(gl, gl.VERTEX_SHADER, CRT_VERT);
  let fs = crtCompile(gl, gl.FRAGMENT_SHADER, CRT_FRAG);
  if (!vs || !fs) return null;
  let prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // one full-screen quad
  let buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  let aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  let tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); // game canvas is transparent where empty

  source.parentNode.appendChild(overlay);

  let u = {};
  for (let name of CRT_UNIFORMS) u[name] = gl.getUniformLocation(prog, name);
  return { gl, overlay, source, u };
}

function crtFrame(t) {
  requestAnimationFrame(crtFrame);

  let source = document.querySelector('#game-container canvas:not(#crt-overlay)');
  if (!source) return;
  if (!crtGL) {
    crtGL = crtInit(source);
    if (!crtGL) return;
  }
  let { gl, overlay, u } = crtGL;
  let s = crtSettings;

  // CRT switched off in the panel: show the plain game canvas underneath
  overlay.style.display = s.enabled ? '' : 'none';
  if (!s.enabled) return;

  // keep the overlay exactly on top of the p5 canvas (same backing size, same on-screen box)
  if (overlay.width !== source.width || overlay.height !== source.height) {
    overlay.width = source.width;
    overlay.height = source.height;
    gl.viewport(0, 0, overlay.width, overlay.height);
  }
  overlay.style.width = source.style.width;
  overlay.style.height = source.style.height;
  overlay.style.left = source.offsetLeft + 'px';
  overlay.style.top = source.offsetTop + 'px';

  crtKickAmt *= s.kickDecay;

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.uniform2f(u.uRes, source.clientWidth, source.clientHeight);
  gl.uniform1f(u.uTime, t / 1000);
  gl.uniform1f(u.uCurvature, crtCurvatureNow());
  gl.uniform1f(u.uFringe, s.fringe + crtKickAmt * s.kickFringe);
  gl.uniform1f(u.uGlow, s.glow);
  gl.uniform1f(u.uGlowRadius, s.glowRadius);
  gl.uniform1f(u.uScan, s.scanlines);
  gl.uniform1f(u.uScanSize, s.scanlineSize);
  gl.uniform1f(u.uRoll, s.roll);
  gl.uniform1f(u.uRollSpeed, s.rollSpeed);
  gl.uniform1f(u.uFlicker, s.flicker);
  gl.uniform1f(u.uVignette, s.vignette);
  gl.uniform1f(u.uBrightness, s.brightness);
  gl.uniform1f(u.uContrast, s.contrast);
  gl.uniform1f(u.uSaturation, s.saturation);
  gl.uniform3fv(u.uBg, crtHexToRgb(s.bgColor));
  gl.uniform3fv(u.uC1, crtHexToRgb(s.p1Color));
  gl.uniform3fv(u.uC2, crtHexToRgb(s.p2Color));
  gl.uniform1f(u.uPatOn, s.patternOn ? 1 : 0);
  gl.uniform1f(u.uPatSpeed, s.patternSpeed);
  gl.uniform1f(u.uPatSwirl, s.patternSwirl);
  gl.uniform1f(u.uPatScale, s.patternScale);
  gl.uniform1f(u.uPatStrength, s.patternStrength);
  gl.uniform1f(u.uPatPixel, s.patternPixel);
  gl.uniform1f(u.uLineOn, s.lineOn ? 1 : 0);
  gl.uniform1f(u.uLineAmp, s.lineAmp);
  gl.uniform1f(u.uLineWaves, s.lineWaves);
  gl.uniform1f(u.uLineSpeed, s.lineSpeed);
  gl.uniform1f(u.uLineGlow, s.lineGlow);
  gl.uniform1f(u.uLineWidth, s.lineWidth);
  gl.uniform1f(u.uKick, crtKickAmt);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

requestAnimationFrame(crtFrame);
