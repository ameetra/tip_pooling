// Lambda handler entry. Lambda waits for top-level await in ES modules during its init phase, so the
// secret fetch, app load and DB connect in dist/lambda.js finish before the first request arrives.
import lambda from './dist/lambda.js';

await lambda.init;
export const handler = lambda.handler;
