// Test calling json() twice on the same Request

const req = new Request('http://localhost/', {
  method: 'POST',
  body: '{"productId":1}',
});

console.log('First call:');
req.json().then(data => {
  console.log('Result:', data);
  
  console.log('Second call:');
  req.json().then(data2 => {
    console.log('Result:', data2);
  }).catch(e => {
    console.log('Error:', e.message);
  });
}).catch(e => {
  console.log('Error:', e.message);
});
