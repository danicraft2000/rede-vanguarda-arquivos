// Ponte entre o Playwright (render.js) e o motor.
import * as E from './engine.js';
await document.fonts.load('700 64px AvantGarde');
await E.loadFont();
window.V = {
  async load(file, dur, info) {
    const mod = await import('/web/cenas/' + file);
    E.ctx.dur = dur; E.ctx.info = info || {};
    return await E.loadScene(mod);
  },
  frame(t, fmt = 'image/png', q) { E.renderAt(t); return E.renderer.domElement.toDataURL(fmt, q); },
  renderOnly(t) { E.renderAt(t); return true; },
};
window.READY = true;
