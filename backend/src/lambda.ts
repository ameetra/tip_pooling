import serverlessHttp from 'serverless-http';
import { createApp } from './app';

const app = createApp();
export const handler = serverlessHttp(app);
