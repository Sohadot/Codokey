// Social preview images are deployed assets, not JavaScript-rendered decorations.
// X and other crawlers must be able to read the metadata from initial HTML.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BASE = 'https://codokey.com';
const pages = [
  { route: 'review/scorecard-challenge', image: 'scorecard-challenge-og-v1.png', alt: /32 controls, 18 critical controls/ },
  { route: 'review/security-challenge', image: 'security-challenge-og-v1.png', alt: /Four AI coding agent reference cases/ }
];

function meta(html, key, value) {
  assert.match(html, new RegExp('<meta (?:property|name)="' + key + '" content="' + value.replaceAll('.', '\\.') + '">'));
}

for (const { route, image, alt } of pages) {
  test(`${route}: serves a unique large-image social card in initial HTML`, () => {
    const html = readFileSync(join(ROOT, route, 'index.html'), 'utf8');
    const url = BASE + '/assets/' + image;
    meta(html, 'og:image', url);
    meta(html, 'og:image:secure_url', url);
    meta(html, 'twitter:image', url);
    meta(html, 'twitter:card', 'summary_large_image');
    meta(html, 'og:image:type', 'image/png');
    meta(html, 'og:image:width', '1200');
    meta(html, 'og:image:height', '630');
    const ogAlt = html.match(/<meta property="og:image:alt" content="([^"]+)">/)?.[1];
    const twitterAlt = html.match(/<meta name="twitter:image:alt" content="([^"]+)">/)?.[1];
    assert.match(ogAlt ?? '', alt);
    assert.equal(twitterAlt, ogAlt);
    assert.doesNotMatch(html, /<meta (?:property="og:image"|name="twitter:image") content="[^"]*social-preview\.png"/);
    assert.match(html, new RegExp('<meta property="og:url" content="' + BASE.replaceAll('.', '\\.') + '/' + route + '/">'));
  });

  test(`${image}: real, reasonably sized 1200x630 PNG`, () => {
    const asset = join(ROOT, 'assets', image);
    assert.ok(statSync(asset).size < 5_000_000, 'X image exceeds 5 MB');
    const png = readFileSync(asset);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
  });
}

test('each challenge gets a separate visual identity rather than the generic site image', () => {
  const [first, second] = pages.map(p => readFileSync(join(ROOT, 'assets', p.image)));
  assert.ok(!first.equals(second));
  const robots = readFileSync(join(ROOT, 'robots.txt'), 'utf8');
  assert.doesNotMatch(robots, /Disallow:\s*\/review\//);
  assert.doesNotMatch(robots, /Disallow:\s*\/assets\//);
});
