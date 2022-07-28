#!/usr/bin/env node
/* eslint-disable no-console */
import { resolve } from 'node:path';
import { init } from '../lib/init.js';

function cleanPath(path) {
  if (typeof path !== 'string' || path.startsWith('-')) {
    return;
  }

  return path;
}

const filePath = init({
  filePath: cleanPath(process.argv[2]),
  overwrite: process.argv.includes('--overwrite'),
  commentAll: process.argv.includes('--comment-all'),
});

console.log('FILE:', resolve(filePath));
