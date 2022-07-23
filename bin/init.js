#!/usr/bin/env node
const { resolve } = require('path');
const { init } = require('../lib/init');

function cleanPath(path) {
  if (typeof path !== 'string' || path.startsWith('-')) {
    return undefined;
  }

  return path;
}

try {
  const filePath = init(cleanPath(process.argv[2]), process.argv.includes('--overwrite'));
  console.log('FILE:', resolve(filePath));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
