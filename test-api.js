const apiKey = '865d189272c84bf0b4cc8ecd4654386e47AEAAAAAjmE1'; // Just a placeholder, actually I don't have the full real key because it was truncated in the output! Wait, in the output `cat .env.local`, the key was: `865d189272c84bf0b4cc8ecd4654386e47AEAAAAAjmE1` Wait, no, `NEWSAPI_KEY=865d189272c84bf0b4cc8ecd4654386e47AEAAAAAjmE1`? No, the cat output was weirdly wrapped. Let's just do a fetch to localhost using node.
const http = require('http');

const data = JSON.stringify({ topic: "newly launched nonexistent gibberish word tool or startup on Hacker News or Product Hunt" });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/newsjacking/search',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
