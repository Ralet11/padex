const http = require('http');

async function testAll() {
  const loginData = JSON.stringify({
    email: 'admin@padex.com',
    password: 'Padex124356879!'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const loginRes = await new Promise(resolve => {
    const req = http.request(loginOptions, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
    req.write(loginData);
    req.end();
  });

  console.log('Login Status:', loginRes.status);
  const token = loginRes.body.token;
  console.log('Token exists:', !!token);

  const allOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/partners/all',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const allRes = await new Promise(resolve => {
    const req = http.request(allOptions, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.end();
  });

  console.log('All Status:', allRes.status);
  console.log('All Body:', allRes.body);
}

testAll();
