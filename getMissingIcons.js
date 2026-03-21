const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit', { encoding: 'utf8' });
  console.log('No errors!');
} catch (err) {
  const output = err.stdout;
  const matches = [...output.matchAll(/Cannot find name '([A-Z][a-zA-Z0-9]+)'/g)];
  const names = new Set(matches.map(m => m[1]));
  console.log('Missing components: ' + Array.from(names).join(', '));
}
