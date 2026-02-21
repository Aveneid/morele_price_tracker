import express from 'express';

const app = express();
app.use(express.json());

app.post('/test', (req, res) => {
  console.log('req.body:', req.body);
  res.json({ received: req.body });
});

const server = app.listen(3002, () => {
  console.log('Express test server listening on port 3002');
  
  // Make a test request
  setTimeout(() => {
    import('node-fetch').then(({ default: fetch }) => {
      fetch('http://localhost:3002/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 1 }),
      })
        .then(r => r.json())
        .then(data => {
          console.log('Response:', data);
          server.close();
        });
    });
  }, 100);
});
