// Test if creating a Request with a body consumes it

const { Readable } = await import('stream');

// Test 1: String body
console.log('Test 1: String body');
const req1 = new Request('http://localhost/', {
  method: 'POST',
  body: '{"productId":1}',
});

// Check if body is consumed immediately
console.log('Body after creation:', req1.body);

req1.json().then(data => {
  console.log('json() result:', data);
});

// Test 2: ReadableStream body
console.log('\nTest 2: ReadableStream body');
const stream = Readable.from(['{"productId":1}']);
const req2 = new Request('http://localhost/', {
  method: 'POST',
  body: stream,
  // @ts-ignore
  duplex: 'half',
});

console.log('Body after creation:', req2.body);

req2.json().then(data => {
  console.log('json() result:', data);
});
