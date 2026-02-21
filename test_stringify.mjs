// Test JSON.stringify with different values

const obj = { productId: 1 };
const stringified = JSON.stringify(obj);

console.log('Object:', obj);
console.log('Stringified:', stringified);
console.log('Type:', typeof stringified);

// Now test with Request
const req = new Request('http://localhost/', {
  method: 'POST',
  body: stringified,
});

req.json().then(data => {
  console.log('Request.json() result:', data);
}).catch(e => {
  console.log('Request.json() error:', e.message);
});
