import https from 'node:https';

function fetchPage(urlStr: string, userAgent: string) {
  return new Promise((resolve) => {
    https.get(urlStr, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    }).on('error', (e) => {
      resolve({ error: e.message });
    });
  });
}

async function run() {
  const ua = 'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)';
  const res: any = await fetchPage('https://3dgalaxy.co.in/product/bambu-lab-a1-mini-3d-printer', ua);
  console.log('STATUS:', res.statusCode);
  const html: string = res.data || '';
  
  // Extract all og tags
  const ogMatches = html.match(/<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+)["'][^>]*>/gi) || [];
  console.log('FOUND OG/TWITTER TAGS IN LIVE RESPONSE:');
  for (const tag of ogMatches) {
    console.log(tag);
  }
}
run();

