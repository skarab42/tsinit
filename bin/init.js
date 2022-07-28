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

const filePath = init(cleanPath(process.argv[2]), process.argv.includes('--overwrite'));

console.log('FILE:', resolve(filePath));
