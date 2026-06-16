#!/usr/bin/env node

// Set environment variables before loading the test script
process.env.USE_SERVICE_ROLE = 'true';
process.env.TEST_PATIENT_ID = '72411';
process.env.TEST_KOBO_UUID = '5b3ec782-71a6-4644-b1a8-34f7efb3f6dd';

// Load and run the test
require('./test-triple-sync-e2e.js');
