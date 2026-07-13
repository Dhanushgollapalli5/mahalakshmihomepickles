const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('starts in offline mode when Razorpay is not configured', async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: `${__dirname}/..`,
    env: {
      ...process.env,
      PORT: '3100',
      PAYMENT_MODE: 'razorpay',
      RAZORPAY_KEY_ID: '',
      RAZORPAY_KEY_SECRET: '',
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  let response;
  let responseText = '';
  let serverReady = false;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      response = await fetch('http://127.0.0.1:3100/api/config');
      responseText = await response.text();
      serverReady = true;
      break;
    } catch (error) {
      if (child.exitCode !== null) {
        break;
      }
      await wait(250);
    }
  }

  assert.ok(serverReady, `Server did not start. Output:\n${output}`);
  assert.equal(response.status, 200);

  const data = JSON.parse(responseText);
  assert.equal(data.paymentMode, 'offline');

  child.kill('SIGTERM');
  await once(child, 'exit').catch(() => {});
});

test('falls back to offline mode for unsupported payment-mode values', async () => {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: `${__dirname}/..`,
    env: {
      ...process.env,
      PORT: '3101',
      PAYMENT_MODE: 'online',
      RAZORPAY_KEY_ID: '',
      RAZORPAY_KEY_SECRET: '',
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  let response;
  let responseText = '';
  let serverReady = false;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      response = await fetch('http://127.0.0.1:3101/api/config');
      responseText = await response.text();
      serverReady = true;
      break;
    } catch (error) {
      if (child.exitCode !== null) {
        break;
      }
      await wait(250);
    }
  }

  assert.ok(serverReady, `Server did not start. Output:\n${output}`);
  assert.equal(response.status, 200);

  const data = JSON.parse(responseText);
  assert.equal(data.paymentMode, 'offline');

  child.kill('SIGTERM');
  await once(child, 'exit').catch(() => {});
});
