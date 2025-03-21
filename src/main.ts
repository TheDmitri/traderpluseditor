import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

// Register service worker
if ('serviceWorker' in navigator && environment.production) {
  navigator.serviceWorker.register('ngsw-worker.js')
    .then(reg => console.log('Service worker registered:', reg))
    .catch(err => console.error('Service worker registration failed:', err));
}
