import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService } from '../../services/datastore';
import { ToastService } from '../../shared/components/toast/toast.service';

@Component({
  selector: 'app-footer-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './footer-settings.component.html',
  styleUrls: [],
})
export class FooterSettingsComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);
  public ds = inject(DatastoreService);

  activeTab = signal<string>('company'); // company, groups, newsletter, payments
  footerLoading = signal<boolean>(true);

  // Forms
  companyForm!: FormGroup;
  newsletterForm!: FormGroup;
  copyrightForm!: FormGroup;
  mobileForm!: FormGroup;

  // Link Groups & Links state
  groups = signal<any[]>([]);
  links = signal<any[]>([]);
  socialLinks = signal<any[]>([]);
  paymentIcons = signal<any[]>([]);
  trustBadges = signal<any[]>([]);

  // Dialog / Form states for creation
  activeEditGroupId = signal<string | null>(null);
  groupFormVisible = signal<boolean>(false);
  groupFormTitle = signal<string>('');
  groupTitleValue = signal<string>('');
  groupSortValue = signal<number>(0);
  groupActiveValue = signal<boolean>(true);

  activeEditLinkId = signal<string | null>(null);
  linkFormVisible = signal<boolean>(false);
  linkGroupIdValue = signal<string>('');
  linkTitleValue = signal<string>('');
  linkUrlValue = signal<string>('');
  linkOpenNewTabValue = signal<boolean>(false);
  linkSortValue = signal<number>(0);
  linkActiveValue = signal<boolean>(true);

  activeEditSocialId = signal<string | null>(null);
  socialFormVisible = signal<boolean>(false);
  socialPlatformValue = signal<string>('');
  socialUrlValue = signal<string>('');
  socialIconValue = signal<string>('');
  socialSortValue = signal<number>(0);
  socialActiveValue = signal<boolean>(true);

  ngOnInit() {
    this.initForms();
    this.loadFooterData();
  }

  initForms() {
    this.companyForm = this.fb.group({
      companyName: ['', Validators.required],
      companyLogo: [''],
      footerDescription: [''],
      address: [''],
      phone: [''],
      email: [''],
      supportEmail: [''],
      workingHours: ['']
    });

    this.newsletterForm = this.fb.group({
      enabled: [true],
      title: ['', Validators.required],
      description: [''],
      buttonText: ['']
    });

    this.copyrightForm = this.fb.group({
      copyrightText: [''],
      poweredByText: [''],
      developedByText: [''],
      websiteUrl: [''],
      enableBranding: [true],
      brandName: [''],
      brandUrl: [''],
      glowEffect: [true],
      animationType: ['Glow']
    });

    this.mobileForm = this.fb.group({
      enableMobileFooter: [true],
      mobileFooterText: [''],
      mobileFooterLinks: ['']
    });
  }

  loadFooterData() {
    this.footerLoading.set(true);
    this.http.get<any>('/api/footer').subscribe({
      next: (data) => {
        if (data) {
          // Patch Company Info
          this.companyForm.patchValue({
            companyName: data.companyInfo?.companyName || '',
            companyLogo: data.companyInfo?.companyLogo || '',
            footerDescription: data.companyInfo?.footerDescription || '',
            address: data.companyInfo?.address || '',
            phone: data.companyInfo?.phone || '',
            email: data.companyInfo?.email || '',
            supportEmail: data.companyInfo?.supportEmail || '',
            workingHours: data.companyInfo?.workingHours || ''
          });

          // Patch Newsletter Info
          this.newsletterForm.patchValue({
            enabled: data.newsletter?.enabled ?? true,
            title: data.newsletter?.title || '',
            description: data.newsletter?.description || '',
            buttonText: data.newsletter?.buttonText || ''
          });

          // Patch Copyright & AJR Branding Info
          this.copyrightForm.patchValue({
            copyrightText: data.copyright?.copyrightText || '',
            poweredByText: data.copyright?.poweredByText || '',
            developedByText: data.copyright?.developedByText || '',
            websiteUrl: data.copyright?.websiteUrl || '',
            enableBranding: data.copyright?.enableBranding ?? true,
            brandName: data.copyright?.brandName || '',
            brandUrl: data.copyright?.brandUrl || '',
            glowEffect: data.copyright?.glowEffect ?? true,
            animationType: data.copyright?.animationType || 'Glow'
          });

          // Patch Mobile Info
          this.mobileForm.patchValue({
            enableMobileFooter: data.mobile?.enableMobileFooter ?? true,
            mobileFooterText: data.mobile?.mobileFooterText || '',
            mobileFooterLinks: data.mobile?.mobileFooterLinks || ''
          });

          // Set other lists
          this.groups.set(data.groups || []);
          this.links.set(data.links || []);
          this.socialLinks.set(data.socialLinks || []);
          this.paymentIcons.set(data.paymentIcons || []);
          this.trustBadges.set(data.trustBadges || []);
        }
        this.footerLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load admin footer properties', err);
        this.toastService.error('Error fetching dynamic footer settings.');
        this.footerLoading.set(false);
      }
    });
  }

  saveGeneralSettings() {
    const payload = {
      companyInfo: this.companyForm.value,
      newsletter: this.newsletterForm.value,
      copyright: this.copyrightForm.value,
      mobile: this.mobileForm.value
    };

    this.http.put('/api/admin/footer', payload).subscribe({
      next: () => {
        this.toastService.success('Footer settings committed successfully!');
        this.ds.reloadFooter(); // Sync frontend globally
      },
      error: (err) => {
        this.toastService.error('Failed to save settings: ' + (err.error?.error || err.message));
      }
    });
  }

  // Link Groups Operations
  openGroupCreate() {
    this.activeEditGroupId.set(null);
    this.groupFormTitle.set('Create New Group');
    this.groupTitleValue.set('');
    this.groupSortValue.set(this.groups().length);
    this.groupActiveValue.set(true);
    this.groupFormVisible.set(true);
  }

  openGroupEdit(grp: any) {
    this.activeEditGroupId.set(grp.id);
    this.groupFormTitle.set('Edit Group: ' + grp.title);
    this.groupTitleValue.set(grp.title);
    this.groupSortValue.set(grp.sortOrder);
    this.groupActiveValue.set(grp.isActive);
    this.groupFormVisible.set(true);
  }

  saveGroup() {
    const payload = {
      title: this.groupTitleValue(),
      sortOrder: this.groupSortValue(),
      isActive: this.groupActiveValue()
    };

    if (this.activeEditGroupId()) {
      // Update
      this.http.put(`/api/admin/footer/groups/${this.activeEditGroupId()}`, payload).subscribe({
        next: () => {
          this.toastService.success('Link group successfully edited.');
          this.groupFormVisible.set(false);
          this.loadFooterData();
          this.ds.reloadFooter(); // Sync frontend globally
        },
        error: (err) => this.toastService.error('Error saving group: ' + (err.error?.error || err.message))
      });
    } else {
      // Create
      this.http.post('/api/admin/footer/groups', payload).subscribe({
        next: () => {
          this.toastService.success('Link group registered beautifully.');
          this.groupFormVisible.set(false);
          this.loadFooterData();
          this.ds.reloadFooter(); // Sync frontend globally
        },
        error: (err) => this.toastService.error('Error creating group: ' + (err.error?.error || err.message))
      });
    }
  }

  deleteGroup(id: string) {
    if (confirm('Are you sure you want to purge this link group? This will leave its links orphan.')) {
      this.http.delete(`/api/admin/footer/groups/${id}`).subscribe({
        next: () => {
          this.toastService.success('Group purged successfully.');
          this.loadFooterData();
          this.ds.reloadFooter(); // Sync frontend globally
        },
        error: (err) => this.toastService.error('Deletion error: ' + (err.error?.error || err.message))
      });
    }
  }

  // Links Operations
  openLinkCreate(groupId: string) {
    this.activeEditLinkId.set(null);
    this.linkGroupIdValue.set(groupId);
    this.linkTitleValue.set('');
    this.linkUrlValue.set('');
    this.linkOpenNewTabValue.set(false);
    this.linkSortValue.set(this.links().filter(l => l.groupId === groupId).length);
    this.linkActiveValue.set(true);
    this.linkFormVisible.set(true);
  }

  openLinkEdit(lnk: any) {
    this.activeEditLinkId.set(lnk.id);
    this.linkGroupIdValue.set(lnk.groupId);
    this.linkTitleValue.set(lnk.title);
    this.linkUrlValue.set(lnk.url);
    this.linkOpenNewTabValue.set(lnk.openInNewTab);
    this.linkSortValue.set(lnk.sortOrder);
    this.linkActiveValue.set(lnk.isActive);
    this.linkFormVisible.set(true);
  }

  saveLink() {
    const payload = {
      groupId: this.linkGroupIdValue(),
      title: this.linkTitleValue(),
      url: this.linkUrlValue(),
      openInNewTab: this.linkOpenNewTabValue(),
      sortOrder: this.linkSortValue(),
      isActive: this.linkActiveValue()
    };

    if (this.activeEditLinkId()) {
      // Update
      this.http.put(`/api/admin/footer/links/${this.activeEditLinkId()}`, payload).subscribe({
        next: () => {
          this.toastService.success('Link element updated.');
          this.linkFormVisible.set(false);
          this.loadFooterData();
          this.ds.reloadFooter(); // Sync frontend globally
        },
        error: (err) => this.toastService.error('Error saving link: ' + (err.error?.error || err.message))
      });
    } else {
      // Create
      this.http.post('/api/admin/footer/links', payload).subscribe({
        next: () => {
          this.toastService.success('Link element generated.');
          this.linkFormVisible.set(false);
          this.loadFooterData();
          this.ds.reloadFooter(); // Sync frontend globally
        },
        error: (err) => this.toastService.error('Error creating link: ' + (err.error?.error || err.message))
      });
    }
  }

  deleteLink(id: string) {
    if (confirm('Purge this link element from group?')) {
      this.http.delete(`/api/admin/footer/links/${id}`).subscribe({
        next: () => {
          this.toastService.success('Link cleared.');
          this.loadFooterData();
          this.ds.reloadFooter(); // Sync frontend globally
        },
        error: (err) => this.toastService.error('Error clearing link: ' + (err.error?.error || err.message))
      });
    }
  }

  // Socials Operations
  openSocialCreate() {
    this.activeEditSocialId.set(null);
    this.socialPlatformValue.set('');
    this.socialUrlValue.set('');
    this.socialIconValue.set('');
    this.socialSortValue.set(this.socialLinks().length);
    this.socialActiveValue.set(true);
    this.socialFormVisible.set(true);
  }

  openSocialEdit(soc: any) {
    this.activeEditSocialId.set(soc.id);
    this.socialPlatformValue.set(soc.platform);
    this.socialUrlValue.set(soc.url);
    this.socialIconValue.set(soc.icon);
    this.socialSortValue.set(soc.sortOrder);
    this.socialActiveValue.set(soc.isActive);
    this.socialFormVisible.set(true);
  }

  saveSocial() {
    const payload = {
      id: this.activeEditSocialId(),
      platform: this.socialPlatformValue(),
      url: this.socialUrlValue(),
      icon: this.socialIconValue(),
      sortOrder: this.socialSortValue(),
      isActive: this.socialActiveValue()
    };

    this.http.post('/api/admin/footer/social-links', payload).subscribe({
      next: () => {
        this.toastService.success('Social link entry saved successfully!');
        this.socialFormVisible.set(false);
        this.loadFooterData();
        this.ds.reloadFooter(); // Sync frontend globally
      },
      error: (err) => this.toastService.error('Error saving social link: ' + (err.error?.error || err.message))
    });
  }

  // Payment Icons & Trust Badges Quick Inline Toggle Updates
  onPaymentIconStatusChange(icon: any, checked: boolean) {
    const payload = {
      paymentIcons: [{
        ...icon,
        isActive: checked
      }]
    };
    this.http.put('/api/admin/footer', payload).subscribe({
      next: () => {
        this.toastService.success(`Status updated for Payment Icon: ${icon.name}`);
        this.ds.reloadFooter(); // Sync frontend globally
      }
    });
  }

  onBadgeStatusChange(badge: any, checked: boolean) {
    const payload = {
      trustBadges: [{
        ...badge,
        isActive: checked
      }]
    };
    this.http.put('/api/admin/footer', payload).subscribe({
      next: () => {
        this.toastService.success(`Status updated for Trust Badge: ${badge.title}`);
        this.ds.reloadFooter(); // Sync frontend globally
      }
    });
  }

  // Safe file/image upload fallback simulator for Logo URL
  triggerLogoSimulatedUrl(fileInput: any) {
    const file = fileInput.files?.[0];
    if (file) {
      this.toastService.info('File picked: ' + file.name + '. Auto committing as assets string.');
      // Simulating a fast dynamic upload output for development speed
      const fakeUrl = 'https://picsum.photos/seed/' + Math.floor(Math.random() * 1000) + '/150/50';
      this.companyForm.get('companyLogo')?.setValue(fakeUrl);
      this.toastService.success('Image simulation committed. URL: ' + fakeUrl);
    }
  }
}
