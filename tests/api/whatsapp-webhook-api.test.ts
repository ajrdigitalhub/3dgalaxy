/**
 * 3D Galaxy Automated Regression Test Suite
 * LEVEL 2: API TESTS — WhatsApp Webhooks & Meta Cloud API Integration
 */

import assert from 'node:assert';
import { AxiosInstance } from 'axios';
import { MOCK_WHATSAPP_WEBHOOK } from '../fixtures/mock-data';

export async function runWhatsappWebhookApiTests(client: AxiosInstance) {
  const results = { passed: 0, failed: 0, errors: [] as string[] };

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.passed++;
    } catch (err: any) {
      results.failed++;
      results.errors.push(`${name}: ${err.message}`);
    }
  }

  // --- SECTION 20: META WEBHOOK VERIFICATION & CHALLENGE ---

  await test('GET /api/whatsapp/webhook: Responds with challenge token for valid subscription', async () => {
    const challenge = 'meta_test_challenge_token_887766';
    const res = await client.get(`/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=3dgalaxy_meta_wa_2026&hub.challenge=${challenge}`);
    assert.strictEqual(res.status, 200, `Expected 200 OK for valid webhook verification, got ${res.status}`);
    assert.strictEqual(String(res.data), challenge, 'Webhook must return the hub.challenge string');
  });

  await test('GET /api/whatsapp/webhook: Rejects mismatched verification token with 403', async () => {
    const res = await client.get('/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=invalid_forged_token&hub.challenge=test');
    assert.strictEqual(res.status, 403, `Expected 403 Forbidden for mismatched verify token, got ${res.status}`);
  });

  // --- SECTION 20 & 21: INBOUND CUSTOMER MESSAGES & AUTOMATION ---

  await test('POST /api/whatsapp/webhook: Ingests inbound customer message without throwing 500', async () => {
    const res = await client.post('/api/whatsapp/webhook', MOCK_WHATSAPP_WEBHOOK, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Webhook receiver should return 200 to acknowledge receipt to Meta
    assert.strictEqual(res.status, 200, `Webhook must acknowledge receipt with 200, got ${res.status}`);
  });

  await test('POST /api/whatsapp/webhook: Handles duplicate webhook gracefully without failing', async () => {
    // Deliver identical webhook twice to test idempotency
    const res1 = await client.post('/api/whatsapp/webhook', MOCK_WHATSAPP_WEBHOOK);
    const res2 = await client.post('/api/whatsapp/webhook', MOCK_WHATSAPP_WEBHOOK);

    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res2.status, 200);
  });

  return results;
}
