// Test what happens when Request is created with a ReadableStream body

const { Readable } = await import('stream');

const stream = Readable.from(['{"productId":1}']);

const req = new Request('http://localhost/', {
  method: 'POST',
  body: stream,
  // @ts-ignore
  duplex: 'half',
});

req.json().then(data => {
  console.log('ReadableStream body result:', data);
}).catch(e => {
  console.log('ReadableStream body error:', e.message);
});
