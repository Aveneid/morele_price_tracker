// Test what happens when Request.json() is called on an empty body

const req1 = new Request('http://localhost/', {
  method: 'POST',
  body: '',
});

req1.json().then(data => {
  console.log('Empty string body result:', data);
}).catch(e => {
  console.log('Empty string body error:', e.message);
});

const req2 = new Request('http://localhost/', {
  method: 'POST',
  body: '{}',
});

req2.json().then(data => {
  console.log('Empty object body result:', data);
}).catch(e => {
  console.log('Empty object body error:', e.message);
});

const req3 = new Request('http://localhost/', {
  method: 'POST',
  body: '{"productId":1}',
});

req3.json().then(data => {
  console.log('Valid JSON body result:', data);
}).catch(e => {
  console.log('Valid JSON body error:', e.message);
});
