import { Injectable, inject } from '@angular/core';
import { DatastoreService } from '../../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private ds = inject(DatastoreService);

  currentUser = this.ds.currentUser;
  userProfile = this.ds.userProfile;
  userRole = this.ds.userRole;
  authReady = this.ds.authReady;

  loginWithGoogle() {
    return this.ds.loginWithGoogle();
  }

  logout() {
    return this.ds.logout();
  }

  loginWithEmail(email: string, pass: string) {
    return this.ds.loginWithEmail(email, pass);
  }

  registerWithEmail(email: string, pass: string, name: string) {
    return this.ds.registerWithEmail(email, pass, name);
  }
}
