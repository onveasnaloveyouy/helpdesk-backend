async function test() {
  try {
    const res1 = await fetch('http://localhost:5005/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@helpdesk.local', password: 'password123' })
    });
    const data1 = await res1.json();
    console.log('Login Response:', res1.status, data1);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
