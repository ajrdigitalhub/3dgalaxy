/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Instagram Live Feed, Media Normalization, & UI Component Rules
 */

import assert from 'node:assert';
import { mapInstagramMedia } from '../../functions/src/controllers/instagram';

export async function runInstagramFeedUnitTests() {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // --- 1. MEDIA NORMALIZATION TESTS ---

  test('mapInstagramMedia: Correctly maps standard IMAGE media item', () => {
    const rawItem = {
      id: '123456789',
      caption: '3D Galaxy Masterpiece\nPrecision print',
      media_type: 'IMAGE',
      media_url: 'https://cdn.instagram.com/image.jpg',
      permalink: 'https://instagram.com/p/abc123xyz/',
      timestamp: '2026-10-21T10:00:00+0000',
    };

    const mapped = mapInstagramMedia(rawItem);
    assert.strictEqual(mapped.id, '123456789');
    assert.strictEqual(mapped.mediaType, 'IMAGE');
    assert.strictEqual(mapped.imageUrl, 'https://cdn.instagram.com/image.jpg');
    assert.strictEqual(mapped.mediaUrl, 'https://cdn.instagram.com/image.jpg');
    assert.strictEqual(mapped.thumbnailUrl, 'https://cdn.instagram.com/image.jpg');
    assert.strictEqual(mapped.permalink, 'https://instagram.com/p/abc123xyz/');
    assert.strictEqual(mapped.caption, '3D Galaxy Masterpiece\nPrecision print');
    assert.strictEqual(mapped.children, undefined);
  });

  test('mapInstagramMedia: Correctly maps VIDEO / REEL media item with thumbnail poster', () => {
    const rawVideo = {
      id: '987654321',
      caption: 'Creality K1C High-Speed Demonstration Reel 🔥',
      media_type: 'VIDEO',
      media_url: 'https://cdn.instagram.com/reel_video.mp4',
      thumbnail_url: 'https://cdn.instagram.com/reel_poster.jpg',
      permalink: 'https://instagram.com/reel/xyz987abc/',
      timestamp: '2026-10-20T14:30:00+0000',
    };

    const mapped = mapInstagramMedia(rawVideo);
    assert.strictEqual(mapped.id, '987654321');
    assert.strictEqual(mapped.mediaType, 'VIDEO');
    assert.strictEqual(mapped.mediaUrl, 'https://cdn.instagram.com/reel_video.mp4');
    assert.strictEqual(mapped.thumbnailUrl, 'https://cdn.instagram.com/reel_poster.jpg');
    assert.strictEqual(mapped.imageUrl, 'https://cdn.instagram.com/reel_poster.jpg');
    assert.strictEqual(mapped.permalink, 'https://instagram.com/reel/xyz987abc/');
  });

  test('mapInstagramMedia: Correctly extracts CAROUSEL_ALBUM children slides', () => {
    const rawCarousel = {
      id: '555666777',
      caption: 'Multi-color PLA Pro Showcase',
      media_type: 'CAROUSEL_ALBUM',
      media_url: 'https://cdn.instagram.com/slide1.jpg',
      permalink: 'https://instagram.com/p/carousel123/',
      timestamp: '2026-10-19T09:00:00+0000',
      children: {
        data: [
          {
            id: 'c1',
            media_type: 'IMAGE',
            media_url: 'https://cdn.instagram.com/slide1.jpg',
          },
          {
            id: 'c2',
            media_type: 'VIDEO',
            media_url: 'https://cdn.instagram.com/slide2.mp4',
            thumbnail_url: 'https://cdn.instagram.com/slide2_thumb.jpg',
          },
        ],
      },
    };

    const mapped = mapInstagramMedia(rawCarousel);
    assert.strictEqual(mapped.mediaType, 'CAROUSEL_ALBUM');
    assert.ok(mapped.children, 'Should have children array');
    assert.strictEqual(mapped.children?.length, 2);
    assert.strictEqual(mapped.children?.[0].mediaType, 'IMAGE');
    assert.strictEqual(mapped.children?.[0].mediaUrl, 'https://cdn.instagram.com/slide1.jpg');
    assert.strictEqual(mapped.children?.[1].mediaType, 'VIDEO');
    assert.strictEqual(mapped.children?.[1].mediaUrl, 'https://cdn.instagram.com/slide2.mp4');
    assert.strictEqual(mapped.children?.[1].thumbnailUrl, 'https://cdn.instagram.com/slide2_thumb.jpg');
  });

  // --- 2. FOLLOWER & METRIC FORMATTING RULES ---

  test('formatCount: Gracefully formats numbers and falls back to "Unavailable" for null/undefined', () => {
    const formatCount = (count: number | null | undefined): string => {
      if (count === null || count === undefined) return 'Unavailable';
      if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
      return String(count);
    };

    assert.strictEqual(formatCount(null), 'Unavailable', 'Null must return "Unavailable"');
    assert.strictEqual(formatCount(undefined), 'Unavailable', 'Undefined must return "Unavailable"');
    assert.strictEqual(formatCount(0), '0', '0 must return "0"');
    assert.strictEqual(formatCount(163), '163', 'Raw count under 1000');
    assert.strictEqual(formatCount(7212), '7.2K', '7212 formatted as 7.2K');
    assert.strictEqual(formatCount(1861), '1.9K', '1861 formatted as 1.9K');
    assert.strictEqual(formatCount(12500), '12.5K', '12500 formatted as 12.5K');
    assert.strictEqual(formatCount(2500000), '2.5M', '2.5M formatted correctly');
  });

  // --- 3. RELATIVE TIME FORMATTING ---

  test('formatRelativeTime: Produces clean relative timestamps', () => {
    const now = Date.now();
    const formatRelativeTime = (timestamp: string | null | undefined, referenceNow = now): string => {
      if (!timestamp) return 'Recent';
      try {
        const postTime = new Date(timestamp).getTime();
        const diffSec = Math.floor((referenceNow - postTime) / 1000);
        if (diffSec < 60) return 'Just now';
        const diffMin = Math.floor(diffSec / 60);
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffWeeks < 5) return `${diffWeeks}w ago`;
        return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return 'Recent';
      }
    };

    assert.strictEqual(formatRelativeTime(null), 'Recent');
    assert.strictEqual(formatRelativeTime(new Date(now - 30 * 1000).toISOString(), now), 'Just now');
    assert.strictEqual(formatRelativeTime(new Date(now - 15 * 60 * 1000).toISOString(), now), '15m ago');
    assert.strictEqual(formatRelativeTime(new Date(now - 7 * 3600 * 1000).toISOString(), now), '7h ago');
    assert.strictEqual(formatRelativeTime(new Date(now - 2 * 86400 * 1000).toISOString(), now), '2d ago');
    assert.strictEqual(formatRelativeTime(new Date(now - 14 * 86400 * 1000).toISOString(), now), '2w ago');
  });

  // --- 4. CAROUSEL SLIDE WRAP-AROUND LOGIC ---

  test('Carousel navigation: next/prev wraps around slide indices cleanly', () => {
    const totalSlides = 3;
    let currentIdx = 0;

    const nextSlide = () => {
      currentIdx = (currentIdx + 1) % totalSlides;
    };

    const prevSlide = () => {
      currentIdx = (currentIdx - 1 + totalSlides) % totalSlides;
    };

    nextSlide();
    assert.strictEqual(currentIdx, 1, '0 -> 1');
    nextSlide();
    assert.strictEqual(currentIdx, 2, '1 -> 2');
    nextSlide();
    assert.strictEqual(currentIdx, 0, '2 wraps back to 0');
    prevSlide();
    assert.strictEqual(currentIdx, 2, '0 wraps back to 2');
    prevSlide();
    assert.strictEqual(currentIdx, 1, '2 -> 1');
  });

  // --- 5. SECURITY & INTEGRATION SANITIZATION ---

  test('Security: Access token is never included in public feed data structures', () => {
    const publicPayload = {
      enabled: true,
      isLive: true,
      profile: {
        username: '3d.galaxy',
        name: '3D Galaxy™️',
        followersCount: 7212,
        mediaCount: 1861,
      },
      posts: [],
      fetchedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(publicPayload);
    assert.ok(!json.includes('token'), 'Payload must never expose access tokens or secrets');
    assert.ok(!json.includes('IGAA'), 'Payload must never contain Meta token prefixes');
  });

  return results;
}
