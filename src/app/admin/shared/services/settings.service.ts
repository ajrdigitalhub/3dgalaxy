import { Injectable, inject } from '@angular/core';
import { DatastoreService, Settings, HomeLayoutSection } from '../../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private ds = inject(DatastoreService);

  settings = this.ds.settings;
  homeLayout = this.ds.homeLayout;

  updateSettings(updated: Partial<Settings>) {
    return this.ds.updateSettings(updated);
  }

  updateHomeLayout(sections: HomeLayoutSection[]) {
    return this.ds.updateHomeLayout(sections);
  }
}
