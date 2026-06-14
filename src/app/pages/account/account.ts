import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService, UserProfile } from '../../services/datastore';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, RouterModule],
  templateUrl: './account.html'
})
export class Account {
  router = inject(Router);
  route = inject(ActivatedRoute);
  ds = inject(DatastoreService);
  fb = inject(FormBuilder);

  profile = this.ds.userProfile;
  
  activeTab = signal('dashboard');
  
  tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/account' },
    { id: 'orders', label: 'My Orders', icon: 'local_shipping', path: '/account/orders' },
    { id: 'wishlist', label: 'Wishlist', icon: 'favorite', path: '/account/wishlist' },
    { id: 'addresses', label: 'Addresses', icon: 'location_on', path: '/account/addresses' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications', path: '/account/notifications' },
    { id: 'reviews', label: 'Reviews', icon: 'star', path: '/account/reviews' },
    { id: 'profile', label: 'Profile Settings', icon: 'person', path: '/account/profile' },
    { id: 'security', label: 'Security', icon: 'lock', path: '/account/security' },
  ];

  profileForm: FormGroup;
  passwordForm: FormGroup;

  constructor() {
    this.profileForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      gender: [''],
      dateOfBirth: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });

    effect(() => {
      const u = this.profile();
      if (!u && this.ds.authReady() && !this.ds.currentUser()) {
        this.router.navigate(['/login']);
      } else if (u) {
        const parts = u.name ? u.name.split(' ') : [];
        this.profileForm.patchValue({
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || '',
          email: u.email || '',
          phone: u.phone || ''
        });
      }
    });
  }

  ngOnInit() {
    this.route.url.subscribe(url => {
      const path = url.length > 0 ? url[url.length - 1].path : 'dashboard';
      if (this.tabs.some(t => t.id === path)) {
        this.activeTab.set(path);
      } else if (path === 'account') {
        this.activeTab.set('dashboard');
      }
    });
  }

  switchTab(tabId: string) {
    this.activeTab.set(tabId);
    if (tabId === 'dashboard') {
      this.router.navigate(['/account']);
    } else {
      this.router.navigate([`/account/${tabId}`]);
    }
  }

  logout() {
    this.ds.logout();
    this.router.navigate(['/']);
  }

  async saveProfile() {
    if (this.profileForm.valid) {
      const { firstName, lastName, phone } = this.profileForm.value;
      const currentPic = this.profile()?.profileImage || '';
      try {
        await this.ds.updateProfileDetails(firstName, lastName, phone, currentPic);
        alert('Profile details updated successfully!');
      } catch (err: any) {
        alert(`Failed to update profile: ${err.message || err}`);
      }
    }
  }

  async changePassword() {
    if (this.passwordForm.valid) {
      const { currentPassword, newPassword, confirmPassword } = this.passwordForm.value;
      if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
      }
      try {
        await this.ds.changeUserPassword(currentPassword, newPassword);
        alert('Password changed successfully!');
        this.passwordForm.reset();
      } catch (err: any) {
        alert(`Failed to change password: ${err.message || err}`);
      }
    }
  }

  async uploadImage(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('access_token');
      
      const res = await fetch('/api/profile/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      
      const data = await res.json();
      if (data.url) {
        this.ds.userProfile.update(profile => profile ? { ...profile, profileImage: data.url } : null);
        alert('Profile image uploaded successfully.');
      }
    } catch (e: any) {
      alert(`Error uploading image: ${e.message}`);
    }
  }
}
