/*
  Dev helper: simulate delivery provider webhook.
  Usage: ts-node scripts/send-delivery-webhook.ts EXTERNAL_ID STATUS
*/
import http from 'http';

const [, , externalId, status] = process.argv;
if (!externalId) {
  console.error('Usage: ts-node scripts/send-delivery-webhook.ts EXTERNAL_ID STATUS');
  process.exit(1);
}
const payload = JSON.stringify({ externalId, status: status || 'delivered' });
const sig = String(payload.length).split('').reverse().join('');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhooks/delivery',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-signature': sig, 'Content-Length': Buffer.byteLength(payload) }
}, (res) => {
  let data = '';
  res.on('data', (d) => data += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});
req.on('error', (e) => console.error(e));
req.write(payload);
req.end();



