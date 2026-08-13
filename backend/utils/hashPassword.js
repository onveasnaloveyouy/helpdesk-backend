// Usage: node utils/hashPassword.js "YourPassword123!"
// Prints a bcrypt hash you can paste into the users table.
const bcrypt = require('bcrypt');

const password = process.argv[2];
if (!password) {
  console.log('Usage: node utils/hashPassword.js "YourPassword"');
  process.exit(1);
}

bcrypt.hash(password, 10).then(hash => {
  console.log('Bcrypt hash:');
  console.log(hash);
});
