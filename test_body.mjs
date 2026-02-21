import http from 'http';

const server = http.createServer((req, res) => {
  let body = '';
  
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  
  req.on('end', () => {
    console.log('Received body:', body);
    console.log('req.body:', req.body);
    res.end('OK');
  });
});

server.listen(3001, () => {
  console.log('Test server listening on port 3001');
  
  // Make a test request
  const postData = JSON.stringify({ productId: 1 });
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/test',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };
  
  const req = http.request(options, (res) => {
    res.on('data', () => {});
    res.on('end', () => {
      server.close();
    });
  });
  
  req.write(postData);
  req.end();
});
