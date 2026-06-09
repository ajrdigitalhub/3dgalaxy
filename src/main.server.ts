import {
  BootstrapContext,
  bootstrapApplication,
} from '@angular/platform-browser';
import {App} from './app/app/app';
import {config} from './app/app.config.server';

const bootstrap = (context: BootstrapContext) => {
  return bootstrapApplication(App, config, context).catch(err => {
    console.error('SERVER BOOTSTRAP ERROR:', err);
    throw err;
  });
};

export default bootstrap;
