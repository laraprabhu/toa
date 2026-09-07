import { createHash } from 'node:crypto';

const email = process.argv[2]?.trim().toLowerCase();

if (!email || !email.includes('@')) {
  console.error('Usage: npm run admin:hash -- admin@example.com');
  process.exitCode = 1;
} else {
  console.log(createHash('sha256').update(email).digest('hex'));
}
