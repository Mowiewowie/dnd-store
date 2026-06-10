/**
 * Static file regression tests.
 *
 * These tests read the actual source files on disk to guard against accidental
 * regressions in HTML meta tags, iOS-specific CSS, and safe-area wiring.
 * They deliberately avoid rendering React components so they stay fast and
 * independent of browser / jsdom behaviour for env() CSS values.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const dir = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(dir, rel), 'utf-8');

const html    = read('../../index.html');
const css     = read('../index.css');
const appSrc  = read('../App.jsx');
const navSrc  = read('../components/Navbar.jsx');
const favicon = read('../../public/favicon.svg');

// ── index.html ──────────────────────────────────────────────────────────────

describe('index.html — title', () => {
  it('page title is "The Bazaar"', () => {
    expect(html).toContain('<title>The Bazaar</title>');
  });

  it('title is not the Vite default "client"', () => {
    expect(html).not.toContain('<title>client</title>');
  });
});

describe('index.html — viewport & iOS', () => {
  it('viewport meta includes viewport-fit=cover (required for env(safe-area-inset-*))', () => {
    expect(html).toContain('viewport-fit=cover');
  });

  it('viewport meta includes width=device-width', () => {
    expect(html).toContain('width=device-width');
  });

  it('theme-color meta exists with the app dark background colour', () => {
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('#1a1208');
  });
});

describe('index.html — meta description', () => {
  it('meta description tag is present', () => {
    expect(html).toContain('name="description"');
  });

  it('meta description mentions D&D', () => {
    const match = html.match(/name="description"\s+content="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match[1].toLowerCase()).toMatch(/d(&amp;|&)d|dungeon|campaign/);
  });

  it('meta description is not empty', () => {
    const match = html.match(/name="description"\s+content="([^"]+)"/);
    expect(match?.[1].length).toBeGreaterThan(20);
  });
});

describe('index.html — Open Graph tags', () => {
  it('og:title is present', () => {
    expect(html).toContain('property="og:title"');
  });

  it('og:title contains "Bazaar"', () => {
    const match = html.match(/property="og:title"\s+content="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/Bazaar/i);
  });

  it('og:description is present', () => {
    expect(html).toContain('property="og:description"');
  });

  it('og:description is not empty', () => {
    const match = html.match(/property="og:description"\s+content="([^"]+)"/);
    expect(match?.[1].length).toBeGreaterThan(20);
  });

  it('og:type is "website"', () => {
    expect(html).toContain('property="og:type"');
    expect(html).toContain('content="website"');
  });
});

describe('index.html — favicon', () => {
  it('favicon link points to favicon.svg', () => {
    expect(html).toMatch(/href="\/favicon\.svg/);
  });

  it('favicon link has SVG MIME type', () => {
    expect(html).toContain('type="image/svg+xml"');
  });

  it('favicon URL has a version query parameter (cache-busting)', () => {
    expect(html).toMatch(/favicon\.svg\?v=/);
  });
});

// ── favicon.svg ─────────────────────────────────────────────────────────────

describe('favicon.svg', () => {
  it('is a valid SVG element', () => {
    expect(favicon).toMatch(/^<svg\b/);
    expect(favicon).toContain('</svg>');
  });

  it('has a viewBox attribute for correct scaling', () => {
    expect(favicon).toContain('viewBox');
  });

  it('uses the brand gold colour (#c9a84c)', () => {
    expect(favicon).toContain('#c9a84c');
  });

  it('contains line elements (the crossed-swords blades)', () => {
    expect(favicon).toMatch(/<line\b/);
  });

  it('has a background rectangle for visibility on light browser tabs', () => {
    expect(favicon).toMatch(/<rect\b/);
  });
});

// ── index.css — iOS scroll fix ───────────────────────────────────────────────

describe('index.css — iOS scroll', () => {
  it('#root uses 100dvh (dynamic viewport), not the static 100vh', () => {
    expect(css).toContain('100dvh');
  });

  it('#root does NOT use 100vh (causes spurious body scroll on iOS)', () => {
    // Ensure no raw 100vh reference remains for #root
    const rootBlock = css.match(/#root\s*\{[^}]+\}/)?.[0] ?? '';
    expect(rootBlock).not.toContain('100vh');
  });
});

describe('index.css — safe-area toast', () => {
  it('toast bottom position accounts for iOS home-indicator (safe-area-inset-bottom)', () => {
    expect(css).toContain('safe-area-inset-bottom');
  });

  it('toast uses max() so minimum clearance is preserved on non-notched devices', () => {
    const toastBlock = css.match(/\.toast-base\s*\{[^}]+\}/s)?.[0] ?? '';
    expect(toastBlock).toContain('max(');
  });
});

// ── Navbar.jsx — Dynamic Island ──────────────────────────────────────────────

describe('Navbar.jsx — Dynamic Island safe area', () => {
  it('nav element has paddingTop wired to env(safe-area-inset-top)', () => {
    expect(navSrc).toContain('safe-area-inset-top');
  });

  it('paddingTop uses max() so normal padding is preserved without a notch', () => {
    expect(navSrc).toContain('max(0.75rem');
  });

  it('safe-area style is applied inline on the <nav> element', () => {
    expect(navSrc).toMatch(/style=\{\{[^}]*paddingTop/);
  });
});

// ── App.jsx — bottom home-bar clearance ──────────────────────────────────────

describe('App.jsx — bottom safe area', () => {
  it('<main> has paddingBottom wired to env(safe-area-inset-bottom)', () => {
    expect(appSrc).toContain('safe-area-inset-bottom');
  });

  it('paddingBottom is applied as inline style on the Layout <main> element', () => {
    expect(appSrc).toMatch(/main[^>]*style=\{\{[^}]*paddingBottom/);
  });
});

// ── App.jsx — Layout height ───────────────────────────────────────────────────

describe('App.jsx — Layout height', () => {
  it('Layout container uses 100dvh (not 100vh) to match the dynamic viewport', () => {
    expect(appSrc).toContain('100dvh');
    expect(appSrc).not.toContain('100vh');
  });
});
