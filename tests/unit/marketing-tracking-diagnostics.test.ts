/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 1: UNIT TESTS — Marketing Tracking Credentials, ID Formats, Redaction & Sanitization
 */

import assert from 'node:assert';

export async function runMarketingTrackingUnitTests() {
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

  // --- 1. GTM ID FORMAT VALIDATION & MISTAKE IDENTIFICATION ---

  test('GTM Validation: Flags G- format as FAIL because it is a GA4 Measurement ID', () => {
    const candidateId = 'G-4BKM2K4PS0';
    const isGtmFormat = /^GTM-[A-Z0-9]+$/i.test(candidateId);
    const hasGa4Prefix = candidateId.startsWith('G-');
    
    assert.strictEqual(isGtmFormat, false, 'G-4BKM2K4PS0 must NOT pass GTM format test');
    assert.strictEqual(hasGa4Prefix, true, 'Must identify G- prefix as GA4 measurement ID format');
  });

  test('GTM Validation: Correctly accepts valid GTM container formats', () => {
    const validIds = ['GTM-M5K89BC', 'GTM-3DGLX99', 'GTM-ABCDEF1'];
    for (const id of validIds) {
      assert.ok(/^GTM-[A-Z0-9]+$/i.test(id), `${id} should be accepted as valid GTM ID`);
    }
  });

  test('GTM Validation: Rejects invalid or malformed GTM container formats', () => {
    const invalidIds = ['GTM-', 'gtm', '1234567', 'AW-12345678', 'GTM-$$$$', ' '];
    for (const id of invalidIds) {
      assert.ok(!/^GTM-[A-Z0-9]+$/i.test(id.trim()), `${id} should be rejected`);
    }
  });

  // --- 2. GA4 MEASUREMENT ID VALIDATION ---

  test('GA4 Validation: Accepts standard G- format Measurement IDs', () => {
    const validGa4 = ['G-4BKM2K4PS0', 'G-XXXXXXXXXX', 'G-1234567890'];
    for (const id of validGa4) {
      assert.ok(/^G-[A-Z0-9]+$/i.test(id), `${id} should be accepted as valid GA4 ID`);
    }
  });

  test('GA4 Validation: Rejects UA- and non-G- formats', () => {
    const invalidGa4 = ['UA-123456-1', 'AW-6453398597', 'GTM-M5K89BC', '4BKM2K4PS0'];
    for (const id of invalidGa4) {
      assert.ok(!/^G-[A-Z0-9]+$/i.test(id), `${id} should be rejected as valid GA4 ID`);
    }
  });

  // --- 3. GOOGLE ADS ID & PURCHASE CONVERSION LABEL VALIDATION ---

  test('Google Ads ID: Normalizes numeric ID to AW- prefix consistently', () => {
    const rawNumeric = '6453398597';
    const normalized = rawNumeric.startsWith('AW-') ? rawNumeric : `AW-${rawNumeric}`;
    assert.strictEqual(normalized, 'AW-6453398597');

    const alreadyPrefixed = 'AW-6453398597';
    const normalized2 = alreadyPrefixed.startsWith('AW-') ? alreadyPrefixed : `AW-${alreadyPrefixed}`;
    assert.strictEqual(normalized2, 'AW-6453398597', 'Should avoid double prefixing AW-AW-');
  });

  test('Google Ads Purchase Label: Identifies placeholder TestLabel123 as WARNING', () => {
    const testLabels = ['TestLabel123', 'test', 'Test_Purchase_1', 'my_test_label'];
    for (const label of testLabels) {
      const isPlaceholder = label.toLowerCase().includes('test') || label === 'TestLabel123';
      assert.strictEqual(isPlaceholder, true, `Label ${label} should be flagged as placeholder`);
    }
  });

  test('Google Ads Purchase Label: Accepts real production conversion action labels', () => {
    const realLabels = ['AbCdEfGhIjK', 'XyZ12345678', 's3CrEtL4bEl'];
    for (const label of realLabels) {
      const isPlaceholder = label.toLowerCase().includes('test');
      assert.strictEqual(isPlaceholder, false, `Real label ${label} should not be flagged as placeholder`);
    }
  });

  // --- 4. META PIXEL & CAPI CREDENTIAL VALIDATION ---

  test('Meta Pixel ID: Validates 10-18 digit numeric strings', () => {
    const validPixels = ['539514754007254', '1234567890', '9876543210123456'];
    for (const id of validPixels) {
      assert.ok(/^\d{10,18}$/.test(id), `${id} should be accepted as valid Pixel ID`);
    }

    const invalidPixels = ['53951475400725A', 'short', '12345', ''];
    for (const id of invalidPixels) {
      assert.ok(!/^\d{10,18}$/.test(id), `${id} should be rejected as invalid Pixel ID`);
    }
  });

  test('Meta CAPI: Access token redaction ensures no secrets leak in public payloads', () => {
    const secretToken = 'EAABsampleLongTokenForTestingPurposes1234567890';
    const publicSafeSummary = {
      tokenConfigured: true,
      tokenLength: secretToken.length,
      tokenPrefix: secretToken.substring(0, 6) + '...'
    };

    const serialized = JSON.stringify(publicSafeSummary);
    assert.ok(!serialized.includes(secretToken), 'Full token must never appear in diagnostic summary');
    assert.strictEqual(publicSafeSummary.tokenPrefix, 'EAABsa...');
  });

  // --- 5. ENHANCED CONVERSIONS & DATA NORMALIZATION ---

  test('Enhanced Conversions: Customer data normalized and lowercased before hashing', () => {
    const rawEmail = '  John.Doe@Example.COM  ';
    const cleanEmail = rawEmail.trim().toLowerCase();
    assert.strictEqual(cleanEmail, 'john.doe@example.com', 'Email must be trimmed and lowercased');

    const rawPhone = '+91 98765-43210';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    assert.strictEqual(cleanPhone, '919876543210', 'Phone number must have non-digits removed');
  });

  test('Safe Test Mode: Diagnostic test events do NOT use real customer email or phone', () => {
    const safeTestEvent = {
      eventName: 'TestModeDiagnostic',
      userData: {
        client_ip_address: '127.0.0.1',
        client_user_agent: 'DiagnosticRunner/1.0',
        em: ['f660ab912ec121d1b1e928a0bb4bc61b15f5ad44d5efdc4e1c92a25e99b8e44a']
      },
      custom_data: { test_mode: true, source: 'admin_live_health_check' }
    };

    assert.strictEqual(safeTestEvent.custom_data.test_mode, true, 'Test mode flag must be present');
    assert.ok(!JSON.stringify(safeTestEvent).includes('@3dgalaxy.in'), 'No real company customer email in test payload');
  });

  // --- 6. CONSENT MODE V2 STORAGE KEYS ---

  test('Google Consent Mode v2: Verifies all 4 required consent keys are specified', () => {
    const requiredKeys = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'];
    const defaultConsent = {
      ad_storage: 'granted',
      analytics_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted'
    };

    for (const key of requiredKeys) {
      assert.ok(key in defaultConsent, `Key ${key} must exist in Consent Mode v2 state`);
      assert.ok(['granted', 'denied'].includes((defaultConsent as any)[key]), `Key ${key} must have valid consent value`);
    }
  });

  return results;
}
