import {Component, ChangeDetectionStrategy, inject, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ActivatedRoute, RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService, Product, Review} from '../../services/datastore';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss'
})
export class ProductDetail {
  route = inject(ActivatedRoute);
  ds = inject(DatastoreService);

  slug = signal<string>('');
  quantity = signal<number>(1);
  activeImage = signal<string>('');
  is360Active = signal<boolean>(false);
  rotationAngle = signal<number>(0);
  activeTab = signal<string>('description');

  // Discussions and rating state drafts
  newQuestionText = signal<string>('');
  draftStars = signal<number>(5);
  draftComment = signal<string>('');

  product = computed(() => {
    return this.ds.products().find(p => p.slug === this.slug());
  });

  optionalFilaments = computed(() => {
    return this.ds.products().filter(p => p.category_id === 'cat-2').slice(0, 4);
  });

  isDealerActive = computed(() => {
    const r = this.ds.userRole();
    return r === 'admin' || r === 'super-admin' || (this.ds.activeUser()?.rewardPoints || 0) > 300;
  });

  constructor() {
    this.route.params.subscribe(p => {
      if (p['slug']) {
        this.slug.set(p['slug']);
        const matched = this.ds.products().find(x => x.slug === p['slug']);
        if (matched) {
          this.activeImage.set(matched.images[0]);
          this.quantity.set(1);
          this.is360Active.set(false);
          this.rotationAngle.set(0);
        }
      }
    });
  }

  activePrice(p: Product): number {
    return this.isDealerActive() ? p.dealer_price : p.sale_price;
  }

  mrpDiscountPercent(p: Product): number {
    const sale = this.activePrice(p);
    return Math.round(((p.mrp - sale) / p.mrp) * 100);
  }

  adjustQty(diff: number) {
    const nextVal = this.quantity() + diff;
    if (nextVal >= 1 && nextVal <= 99) {
      this.quantity.set(nextVal);
    }
  }

  selectImage(img: string) {
    this.activeImage.set(img);
    this.is360Active.set(false);
  }

  toggle360Sensor() {
    this.is360Active.update(v => !v);
    this.rotationAngle.set(0);
  }

  rotateAngle(deg: number) {
    this.rotationAngle.update(current => {
      let next = current + deg;
      if (next >= 360) next = 0;
      if (next < 0) next = 315;
      return next;
    });
  }

  // Hypothetically loading image references representing angular rotation frames.
  active360Image(): string {
    const angle = this.rotationAngle();
    // Simulate high precision angles by modifying lighting hues in picsum photos
    if (angle === 45 || angle === 225) {
      return 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&q=80&w=400';
    }
    if (angle === 90 || angle === 270) {
      return 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400';
    }
    return 'https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?auto=format&fit=crop&q=80&w=450';
  }

  addToCart(p: Product) {
    this.ds.addToCart(p, this.quantity());
  }

  // WHATSAPP REDIRECT AND CAMPAIGN SIMULATION
  triggerWhatsAppInquiry(p: Product) {
    const contact = '919876543210'; // Demo 3D Galaxy WhatsApp business number
    const price = this.activePrice(p);
    const textMessage = `Hi 3D Galaxy Team! I am interested in purchasing ${p.name} (SKU: ${p.sku}) for ₹${price} / each. Quantity needed: ${this.quantity()}. Kindly advise on bulk delivery times. Thanks!`;
    const targetUrl = `https://wa.me/${contact}?text=${encodeURIComponent(textMessage)}`;
    
    // Attempt non-blocking window redirect or notification log
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank');
    }
  }

  // DISCUSSIONS FORM RECORDERS
  onQuestionInput(event: Event) {
    this.newQuestionText.set((event.target as HTMLInputElement).value);
  }

  submitQuestion(productId: string) {
    const desc = this.newQuestionText().trim();
    if (!desc) return;

    this.ds.products.update(all => {
      return all.map(p => {
        if (p.id === productId) {
          const newQA = {
            id: 'qa-' + Date.now(),
            question: desc,
            askedBy: this.ds.activeUser().name || 'Anonymous Maker',
            date: new Date().toISOString().split('T')[0]
          };
          return { ...p, qnas: [newQA, ...p.qnas] };
        }
        return p;
      });
    });

    this.newQuestionText.set('');
  }

  selectDraftStar(val: number) {
    this.draftStars.set(val);
  }

  onCommentInput(event: Event) {
    this.draftComment.set((event.target as HTMLInputElement).value);
  }

  submitReview(productId: string) {
    const text = this.draftComment().trim();
    if (!text) return;

    this.ds.products.update(all => {
      return all.map(p => {
        if (p.id === productId) {
          const newRev: Review = {
            id: 'rev-' + Date.now(),
            userName: this.ds.activeUser().name || 'Anonymous Customer',
            rating: this.draftStars(),
            comment: text,
            date: new Date().toISOString().split('T')[0],
            verified: true
          };
          return { ...p, reviews: [newRev, ...p.reviews] };
        }
        return p;
      });
    });

    this.draftComment.set('');
    this.draftStars.set(5);
  }
}
