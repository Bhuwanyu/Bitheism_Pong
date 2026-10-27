//---------------------------------------------------------|  CRT Slider Panel (dev tuning tool)  |-----------------------------------------------------------------//
// Press C to show/hide. Every slider edits crtSettings live (see crt.js).
// Your tweaks are remembered in this browser; "Copy values" copies them as code to paste over CRT_DEFAULTS in crt.js.
// Set this to false (or remove the <script> tag) before publishing if players shouldn't see the panel.
const CRT_PANEL_ENABLED = true;

// [setting, label, min, max, step]  or  [setting, label, 'color'] for a colour picker  or  [setting, label, 'check']
const CRT_PANEL_GROUPS = [
  ['Music', [
    ['musicOn', 'Music on (N)', 'check'],
    ['musicVolume', 'Volume', 0, 1, 0.01],
  ]],
  ['Background pattern', [
    ['patternOn', 'Pattern on', 'check'],
    ['patternStrength', 'Strength', 0, 1, 0.01],
    ['patternSpeed', 'Speed', 0, 4, 0.01],
    ['patternSwirl', 'Swirl', 0, 3, 0.01],
    ['patternScale', 'Scale', 0.3, 3, 0.01],
    ['patternPixel', 'Pixel size', 1, 12, 0.5],
  ]],
  ['Diagonal line', [
    ['lineOn', 'Wave line on', 'check'],
    ['lineAmp', 'Wave height', 0, 40, 0.5],
    ['lineWaves', 'Waves', 0, 20, 0.5],
    ['lineSpeed', 'Speed', 0, 4, 0.01],
    ['lineGlow', 'Glow', 0, 2, 0.01],
    ['lineWidth', 'Thickness', 0.3, 5, 0.1],
  ]],
  ['Gameplay: Spin & Slice', [
    ['spinTransfer', 'Slice angle', 0, 1.5, 0.01],
    ['spinCurve', 'Curve', 0, 0.01, 0.0001],
    ['spinDecay', 'Curve length', 0.8, 0.995, 0.001],
    ['spinMinAway', 'Min away', 0.1, 0.8, 0.01],
  ]],
  ['Game colours (also the pattern colours)', [
    ['bgColor', 'Background', 'color'],
    ['p1Color', 'Player 1 paddles', 'color'],
    ['p2Color', 'Player 2 paddles', 'color'],
    ['ballColor', 'Ball', 'color'],
  ]],
  ['Screen', [
    ['curvature', 'Curvature', 0, 0.6, 0.01],
    ['vignette', 'Vignette', 0, 1, 0.01],
  ]],
  ['Colour', [
    ['brightness', 'Brightness', 0.3, 2, 0.01],
    ['contrast', 'Contrast', 0.3, 2, 0.01],
    ['saturation', 'Saturation', 0, 2.5, 0.01],
  ]],
  ['Effects', [
    ['glow', 'Glow', 0, 2, 0.01],
    ['glowRadius', 'Glow radius', 0.5, 10, 0.1],
    ['fringe', 'Colour fringe', 0, 0.03, 0.0005],
    ['scanlines', 'Scanlines', 0, 0.6, 0.01],
    ['scanlineSize', 'Scanline size', 0.5, 4, 0.1],
    ['roll', 'Rolling band', 0, 0.3, 0.005],
    ['rollSpeed', 'Band speed', 0, 1, 0.01],
    ['flicker', 'Flicker', 0, 0.2, 0.005],
  ]],
  ['Hit bump', [
    ['kickStrength', 'Strength', 0, 1, 0.01],
    ['kickBend', 'Bend', 0, 0.4, 0.01],
    ['kickFringe', 'Colour split', 0, 0.08, 0.001],
    ['kickDecay', 'Settle time', 0.5, 0.98, 0.01],
  ]],
];

function crtPanelSave() {
  try { localStorage.setItem('crtSettings', JSON.stringify(crtSettings)); } catch (e) {}
}

function crtPanelBuild() {
  let style = document.createElement('style');
  style.textContent = `
    #crt-panel { position: fixed; top: 12px; right: 12px; width: 260px; max-height: calc(100vh - 24px); overflow-y: auto;
      background: rgba(10, 10, 14, 0.92); border: 1px solid #333; border-radius: 8px; padding: 10px 12px;
      font: 12px Arial, sans-serif; color: #ddd; z-index: 10; display: none; }
    #crt-panel h3 { margin: 0 0 6px; font-size: 13px; color: #fff; display: flex; justify-content: space-between; }
    #crt-panel h4 { margin: 10px 0 4px; font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    #crt-panel .row { display: grid; grid-template-columns: 82px 1fr 44px; align-items: center; gap: 6px; margin: 3px 0; }
    #crt-panel input[type=range] { width: 100%; accent-color: #1e90ff; }
    #crt-panel input[type=color] { width: 100%; height: 22px; padding: 0; border: 1px solid #444; border-radius: 4px; background: none; cursor: pointer; }
    #crt-panel .val { text-align: right; font-variant-numeric: tabular-nums; color: #aaa; }
    #crt-panel .btns { display: flex; gap: 6px; margin-top: 10px; }
    #crt-panel button { flex: 1; background: #222; color: #ddd; border: 1px solid #444; border-radius: 4px; padding: 5px; cursor: pointer; font-size: 12px; }
    #crt-panel button:hover { background: #333; }
    #crt-panel .hint { color: #666; font-size: 11px; margin-top: 8px; }`;
  document.head.appendChild(style);

  let panel = document.createElement('div');
  panel.id = 'crt-panel';
  panel.innerHTML = `<h3>Visual Settings <span style="color:#666;font-weight:normal">C to hide</span></h3>
    <label class="row" style="grid-template-columns: 1fr auto"><span>CRT effect on</span><input type="checkbox" data-key="enabled"></label>`;

  for (let [group, sliders] of CRT_PANEL_GROUPS) {
    panel.insertAdjacentHTML('beforeend', `<h4>${group}</h4>`);
    for (let [key, label, min, max, step] of sliders) {
      if (min === 'check') {
        panel.insertAdjacentHTML('beforeend', `<label class="row" style="grid-template-columns: 1fr auto"><span>${label}</span>
          <input type="checkbox" data-key="${key}"></label>`);
      } else if (min === 'color') {
        panel.insertAdjacentHTML('beforeend', `<label class="row"><span style="grid-column: span 2">${label}</span>
          <input type="color" data-key="${key}"></label>`);
      } else {
        panel.insertAdjacentHTML('beforeend', `<label class="row"><span>${label}</span>
          <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}"><span class="val"></span></label>`);
      }
    }
  }
  panel.insertAdjacentHTML('beforeend', `<div class="btns"><button data-act="reset">Reset</button><button data-act="copy">Copy values</button></div>
    <div class="hint">Values are saved in this browser. Paste copied values over CRT_DEFAULTS in crt.js to keep them for everyone.</div>`);
  document.body.appendChild(panel);

  // fill every control from crtSettings
  function refresh() {
    for (let input of panel.querySelectorAll('input')) {
      let key = input.dataset.key;
      if (input.type === 'checkbox') input.checked = crtSettings[key];
      else if (input.type === 'color') input.value = crtSettings[key];
      else {
        input.value = crtSettings[key];
        input.nextElementSibling.textContent = +(+crtSettings[key]).toFixed(4);
      }
    }
  }

  panel.addEventListener('input', (e) => {
    let input = e.target;
    let key = input.dataset.key;
    if (!key) return;
    if (input.type === 'checkbox') crtSettings[key] = input.checked;
    else if (input.type === 'color') crtSettings[key] = input.value;
    else crtSettings[key] = parseFloat(input.value);
    if (input.type === 'range') input.nextElementSibling.textContent = +parseFloat(input.value).toFixed(4);
    crtPanelSave();
  });

  // let go of the slider so arrow keys go back to moving paddles
  panel.addEventListener('change', (e) => e.target.blur());

  panel.addEventListener('click', (e) => {
    let act = e.target.dataset.act;
    if (act === 'reset') {
      crtSettings = { ...CRT_DEFAULTS };
      crtPanelSave();
      refresh();
    } else if (act === 'copy') {
      let lines = Object.keys(CRT_DEFAULTS).map(k => `  ${k}: ${JSON.stringify(crtSettings[k])},`);
      let code = `const CRT_DEFAULTS = {\n${lines.join('\n')}\n};`;
      navigator.clipboard.writeText(code).then(
        () => { e.target.textContent = 'Copied!'; setTimeout(() => e.target.textContent = 'Copy values', 1200); },
        () => console.log(code) // clipboard blocked: print it instead
      );
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.key === 'c' || e.key === 'C') && e.target.tagName !== 'INPUT') {
      let open = panel.style.display !== 'block';
      panel.style.display = open ? 'block' : 'none';
      if (open) refresh();
    }
  });
}

// true when a mouse event happened on the panel (so clicks there don't press game buttons underneath)
function crtPanelHit(event) {
  return !!(event && event.target && event.target.closest && event.target.closest('#crt-panel'));
}

if (CRT_PANEL_ENABLED) window.addEventListener('DOMContentLoaded', crtPanelBuild);
