const jwt = require('jsonwebtoken');

async function test() {
  try {
    const token = jwt.sign({ id: 1, role: 'Admin' }, 'change_this_to_a_long_random_secret', { expiresIn: '1d' });
    
    const res2 = await fetch('http://localhost:5005/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stats = await res2.json();
    console.log('Stats:', stats);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
