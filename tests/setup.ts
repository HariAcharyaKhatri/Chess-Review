import '@testing-library/jest-dom';

// Polyfill structuredClone and fake IndexedDB if needed in jsdom
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}
