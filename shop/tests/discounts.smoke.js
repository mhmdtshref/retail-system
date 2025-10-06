import http from 'http';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(body);
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += String(c)));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

(async () => {
  try {
    const body = { cart: { lines: [{ sku: 'SKU-1', qty: 1, unitPrice: 100 }], subtotal: 100 }, channel: 'retail', stackingPolicy: 'allow_both' };
    const res = await post('/api/promotions/evaluate', body);
    if (res.status !== 200) throw new Error('evaluate failed');
    console.log('evaluate ok');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
