type Callback = (data: { ubicacionTexto: string; coords: { x?: number; y?: number } }) => void;

const bridge: { cb?: Callback } = {};

export function setLocationEditCallback(cb: Callback) {
  bridge.cb = cb;
}

export function clearLocationEditCallback() {
  bridge.cb = undefined;
}

export function invokeLocationEdit(data: { ubicacionTexto: string; coords: { x?: number; y?: number } }) {
  try { bridge.cb && bridge.cb(data); } catch (e) { /* noop */ }
  clearLocationEditCallback();
}

export default bridge;
