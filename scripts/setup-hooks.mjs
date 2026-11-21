#!/usr/bin/env node
// Runs on `npm install` (the "prepare" script): points git at .githooks so the pre-commit hook runs.
// Quietly does nothing outside a git checkout (for example, an unpacked release zip).
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'ignore' });
} catch {
  // Not a git checkout, or git isn't installed. Nothing to set up.
}
