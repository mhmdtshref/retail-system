/*
  Simple dev seed: populates in-memory store on first call by invoking endpoints.
  Usage: pnpm seed (runs via node fetch to localhost dev server)
*/
import http from 'http';

async function post(path: string, body: any, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; data: string }>((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(body));
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': String(data.length), ...headers } }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode || 0, data: buf }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Create a demo PO
  const res = await post('/api/purchase-orders', { supplierId: 'SUP-1', lines: [{ sku: 'TSHIRT-001-BLK-M', size: 'M', color: 'أسود', unitCost: 25, quantityOrdered: 10 }] });
  console.log('seed create PO:', res.status, res.data);
}

main().catch((e) => { console.error(e); process.exit(1); });

