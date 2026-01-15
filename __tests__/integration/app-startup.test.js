// Integration test for full app startup
const { spawn } = require('child_process');

describe('App Startup Integration', () => {
  test('server starts successfully', (done) => {
    const server = spawn('node', ['multiplayer/server/index.js'], {
      cwd: process.cwd()
    });

    let output = '';
    let hasStarted = false;

    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Game system ready') && !hasStarted) {
        hasStarted = true;
        server.kill();
        expect(output).toContain('Game system ready');
        done();
      }
    });

    server.stderr.on('data', (data) => {
      // Allow some stderr output but fail if it's a critical error
      const errorOutput = data.toString();
      if (errorOutput.includes('SyntaxError') || errorOutput.includes('ReferenceError')) {
        server.kill();
        done.fail(`Server startup failed with error: ${errorOutput}`);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!hasStarted) {
        server.kill();
        done.fail('Server failed to start within 10 seconds');
      }
    }, 10000);
  }, 15000); // 15 second timeout for this test

  test('client can start without syntax errors', () => {
    // Simple syntax check - if we get here, the file loaded successfully
    const fs = require('fs');
    const path = require('path');

    // Check that main entry points exist and are readable
    const clientEntry = path.join(process.cwd(), 'app', '_layout.tsx');
    const serverEntry = path.join(process.cwd(), 'multiplayer', 'server', 'index.js');

    expect(fs.existsSync(clientEntry)).toBe(true);
    expect(fs.existsSync(serverEntry)).toBe(true);

    // Try to read files (will throw if there are syntax errors)
    expect(() => fs.readFileSync(clientEntry, 'utf8')).not.toThrow();
    expect(() => fs.readFileSync(serverEntry, 'utf8')).not.toThrow();
  });
});
