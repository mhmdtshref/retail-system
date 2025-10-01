import http from 'http';

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'GET' }, (res) => {
      let data = '';
      res.on('data', (c) => (data += String(c)));
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    const res = await get('/api/pos/bootstrap');
    if (res.status !== 200) throw new Error('bootstrap failed');
    console.log('bootstrap ok');
    const res2 = await get('/api/sales/layaway');
    if (res2.status !== 200) throw new Error('layaway list failed');
    console.log('layaway list ok');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();

