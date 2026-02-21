// Test how Request.json() works with different body types

// Test 1: String body
const req1 = new Request('http://localhost/', {
  method: 'POST',
  body: '{"test": 1}',
});

req1.json().then(data => {
  console.log('Test 1 (string body):', data);
});

// Test 2: Object body (should fail)
try {
  const req2 = new Request('http://localhost/', {
    method: 'POST',
    body: { test: 1 },
  });
  console.log('Test 2: Request created with object body');
} catch (e) {
  console.log('Test 2 (object body): Error -', e.message);
}

// Test 3: Undefined body
const req3 = new Request('http://localhost/', {
  method: 'POST',
  body: undefined,
});

req3.json().then(data => {
  console.log('Test 3 (undefined body):', data);
}).catch(e => {
  console.log('Test 3 (undefined body): Error -', e.message);
});
