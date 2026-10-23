import { describe, it, expect } from 'vitest';
import { getWorkerCandidateUrls } from '../src/engine/engineClient';

describe('EngineClient Candidate URLs Discovery', () => {
  it('resolves correct root engine path for local dev', () => {
    const urls = getWorkerCandidateUrls('http://localhost:5173', '/', undefined, './');
    expect(urls).toContain('http://localhost:5173/engines/stockfish.js');
    expect(urls[0]).toBe('http://localhost:5173/engines/stockfish.js');
  });

  it('resolves GitHub Pages repository subpath correctly', () => {
    const urls = getWorkerCandidateUrls(
      'https://hariacharyakhatri.github.io',
      '/Chess-Review/',
      undefined,
      './'
    );
    expect(urls).toContain('https://hariacharyakhatri.github.io/Chess-Review/engines/stockfish.js');
    // First candidate must point to the repository subpath, not the user root
    expect(urls[0]).toBe('https://hariacharyakhatri.github.io/Chess-Review/engines/stockfish.js');
  });

  it('resolves GitHub Pages with index.html in pathname correctly', () => {
    const urls = getWorkerCandidateUrls(
      'https://hariacharyakhatri.github.io',
      '/Chess-Review/index.html',
      undefined,
      './'
    );
    expect(urls[0]).toBe('https://hariacharyakhatri.github.io/Chess-Review/engines/stockfish.js');
  });

  it('resolves deep subdirectories correctly', () => {
    const urls = getWorkerCandidateUrls(
      'https://example.com',
      '/apps/chess/',
      undefined,
      './'
    );
    expect(urls[0]).toBe('https://example.com/apps/chess/engines/stockfish.js');
  });

  it('handles explicit document.baseURI override', () => {
    const urls = getWorkerCandidateUrls(
      'https://example.com',
      '/index.html',
      'https://example.com/custom/base/index.html',
      './'
    );
    expect(urls).toContain('https://example.com/custom/base/engines/stockfish.js');
  });

  it('deduplicates candidate paths', () => {
    const urls = getWorkerCandidateUrls('http://localhost:5173', '/', undefined, './');
    const set = new Set(urls);
    expect(urls.length).toBe(set.size);
  });
});
