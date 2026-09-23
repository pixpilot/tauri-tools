#!/usr/bin/env node
/* eslint-disable no-console -- this is the binary; printing is what it is for. */
import process from 'node:process';
import { run } from './cli';

/** `node bin.js <version> …`: the arguments start after the script path. */
const ARGUMENTS_START = 2;

run(process.argv.slice(ARGUMENTS_START))
  .then(({ message }) => {
    console.log(message);
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
