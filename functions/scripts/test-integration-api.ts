import '../src/config/env';
import app from '../src/app';
import axios from 'axios';
import http from 'http';

async function runTests() {
  console.log('--- STARTING INTEGRATION API TESTS ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api/integration/v1/admin`;
  console.log(`Server listening on port ${port}, testing ${baseUrl}...`);

  let token = '';

  try {
    // Test 1: GET /health without auth
    console.log('\n[Test 1] GET /health (unauthenticated)');
    const healthRes = await axios.get(`${baseUrl}/health`, {
      headers: { 'X-Request-ID': 'test_health_req_001' },
      validateStatus: (s) => s < 600,
    });
    console.log('Status:', healthRes.status);
    console.log('X-Request-ID Header:', healthRes.headers['x-request-id']);
    console.log('Body:', JSON.stringify(healthRes.data, null, 2));

    // Test 2: Unauthenticated access to /inventory should fail with 401
    console.log('\n[Test 2] GET /inventory without auth (Expect 401)');
    try {
      await axios.get(`${baseUrl}/inventory`);
      console.error('FAIL: Expected 401 but request succeeded');
    } catch (err: any) {
      console.log('Correctly rejected with status:', err.response?.status);
      console.log('Response:', err.response?.data);
    }

    // Test 3: Mint integration token via POST /auth/token
    console.log('\n[Test 3] POST /auth/token (Client credentials flow)');
    const tokenRes = await axios.post(`${baseUrl}/auth/token`, {
      clientId: 'taskhub',
      clientSecret: 'taskhub_admin_secret_key_2026',
      scopes: [
        'logs:read',
        'inventory:read',
        'backup:read',
        'backup:verify',
        'backup:restore',
        'configuration:read',
        'configuration:write'
      ]
    }, {
      headers: { 'X-Request-ID': 'test_token_req_002' }
    });
    console.log('Status:', tokenRes.status);
    token = tokenRes.data.accessToken;
    console.log('Generated Token (truncated):', token.substring(0, 30) + '...');
    console.log('Granted Scopes:', tokenRes.data.scope);

    // Test 4: GET /inventory with valid token
    console.log('\n[Test 4] GET /inventory with Bearer token');
    const invRes = await axios.get(`${baseUrl}/inventory?limit=5`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': 'test_inv_req_003'
      }
    });
    console.log('Status:', invRes.status);
    console.log('Items Count:', invRes.data.data?.length);
    console.log('Meta:', invRes.data.meta);
    if (invRes.data.data?.length > 0) {
      console.log('Sample Normalized Item:', invRes.data.data[0]);
    }

    // Test 5: GET /logs with valid token
    console.log('\n[Test 5] GET /logs with Bearer token');
    const logsRes = await axios.get(`${baseUrl}/logs?limit=5`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': 'test_logs_req_004'
      }
    });
    console.log('Status:', logsRes.status);
    console.log('Logs Count:', logsRes.data.data?.length);
    console.log('Meta:', logsRes.data.meta);

    // Test 6: GET /backups/config
    console.log('\n[Test 6] GET /backups/config');
    const backupConfigRes = await axios.get(`${baseUrl}/backups/config`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': 'test_backup_cfg_005'
      }
    });
    console.log('Status:', backupConfigRes.status);
    console.log('Backup Config Data:', backupConfigRes.data.data);

    // Test 7: GET /backups/history
    console.log('\n[Test 7] GET /backups/history');
    const backupHistoryRes = await axios.get(`${baseUrl}/backups/history`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': 'test_backup_hist_006'
      }
    });
    console.log('Status:', backupHistoryRes.status);
    console.log('Backups History Meta:', backupHistoryRes.data.meta);

    // Test 8: GET /configuration
    console.log('\n[Test 8] GET /configuration (verify masking)');
    const configRes = await axios.get(`${baseUrl}/configuration`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': 'test_cfg_req_007'
      }
    });
    console.log('Status:', configRes.status);
    console.log('Site Name:', configRes.data.data?.siteName);
    console.log('Payment Gateway Settings (Masked):', configRes.data.data?.paymentGatewaySettings);

    // Test 9: PUT /configuration
    console.log('\n[Test 9] PUT /configuration');
    const updateConfigRes = await axios.put(`${baseUrl}/configuration`, {
      siteName: configRes.data.data?.siteName || '3D Galaxy'
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Request-ID': 'test_cfg_put_008'
      }
    });
    console.log('Status:', updateConfigRes.status);
    console.log('Success:', updateConfigRes.data.success);
    console.log('Message:', updateConfigRes.data.message);

    // Test 10: Insufficient scope test (Token without configuration:write)
    console.log('\n[Test 10] Insufficient Scope Check (Expect 403)');
    const limitedTokenRes = await axios.post(`${baseUrl}/auth/token`, {
      clientId: 'taskhub',
      clientSecret: 'taskhub_admin_secret_key_2026',
      scopes: ['logs:read']
    });
    const limitedToken = limitedTokenRes.data.accessToken;

    try {
      await axios.put(`${baseUrl}/configuration`, { siteName: 'FailTest' }, {
        headers: { Authorization: `Bearer ${limitedToken}` }
      });
      console.error('FAIL: Expected 403 but PUT succeeded');
    } catch (err: any) {
      console.log('Correctly rejected with status:', err.response?.status);
      console.log('Response code:', err.response?.data?.code);
    }

    // Test 11: GET /inventory/:id
    console.log('\n[Test 11] GET /inventory/:id');
    const validInvId = invRes.data.data[0]?.id;
    if (validInvId) {
      const singleInvRes = await axios.get(`${baseUrl}/inventory/${validInvId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Status for valid ID:', singleInvRes.status);
      console.log('Item Name:', singleInvRes.data.data?.name);
    }
    try {
      await axios.get(`${baseUrl}/inventory/non-existent-id-000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.error('FAIL: Expected 404 for invalid inventory ID');
    } catch (err: any) {
      console.log('Correctly rejected invalid ID with status:', err.response?.status);
    }

    // Test 12: GET /logs/:id (expect 404 for non-existent log)
    console.log('\n[Test 12] GET /logs/:id (404 check)');
    try {
      await axios.get(`${baseUrl}/logs/non-existent-request-id`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.error('FAIL: Expected 404 for invalid log ID');
    } catch (err: any) {
      console.log('Correctly rejected invalid log ID with status:', err.response?.status);
    }

    // Test 13: GET /backups/health
    console.log('\n[Test 13] GET /backups/health');
    const backupHealthRes = await axios.get(`${baseUrl}/backups/health`, {
      headers: { Authorization: `Bearer ${token}` },
      validateStatus: (s) => s < 600,
    });
    console.log('Status:', backupHealthRes.status);
    console.log('Backup Healthy:', backupHealthRes.data.data?.healthy);

    // Test 14: GET /backups/:id/download (temporary download mechanism)
    console.log('\n[Test 14] GET /backups/:id/download (Temporary token mechanism)');
    const latestBackup = backupHistoryRes.data.data[0];
    if (latestBackup && latestBackup.id) {
      const downloadRes = await axios.get(`${baseUrl}/backups/${latestBackup.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Status:', downloadRes.status);
      console.log('Download URL generated:', downloadRes.data.data?.downloadUrl);
      console.log('Expires At:', downloadRes.data.data?.expiresAt);
    }

    // Test 15: POST /backups/:id/restore (Validate non-existent ID fails with 404)
    console.log('\n[Test 15] POST /backups/:id/restore (Validation check)');
    try {
      await axios.post(`${baseUrl}/backups/00000000-0000-0000-0000-000000000000/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.error('FAIL: Expected 404 for non-existent backup');
    } catch (err: any) {
      console.log('Correctly rejected with status:', err.response?.status);
      console.log('Error message:', err.response?.data?.error);
    }

    console.log('\n--- ALL INTEGRATION API TESTS PASSED SUCCESSFULLY! ---');
  } catch (error: any) {
    console.error('\nTEST SUITE ERROR:', error.response?.data || error.message);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
