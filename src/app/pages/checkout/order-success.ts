import {ChangeDetectionStrategy, Component, inject, signal, AfterViewInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild} from '@angular/core';
import {CommonModule, Location} from '@angular/common';
import {RouterModule, Router, ActivatedRoute} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';
import {ApiService} from '../../services/api.service';
import {ToastService} from '../../shared/components/toast/toast.service';
import {firstValueFrom} from 'rxjs';

interface PaperParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sizeW: number;
  sizeH: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  shape: 'strip' | 'square' | 'circle' | 'triangle';
  alpha: number;
  gravity: number;
  drag: number;
}

@Component({
  selector: 'app-order-success',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MatIconModule],
  template: `
    <!-- Confetti / Color Paper Throw Canvas -->
    <canvas #confettiCanvas class="fixed inset-0 pointer-events-none z-50 w-full h-full"></canvas>

    <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <div class="max-w-2xl mx-auto space-y-8">

        <!-- Success Hero Card -->
        <div class="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 text-center shadow-xl overflow-hidden">
          <!-- Background Glow -->
          <div class="absolute -top-32 -right-32 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>

          <div class="relative z-10">
            <!-- Animated Checkmark / Click to trigger paper throw -->
            <div (click)="triggerPaperThrow()" 
                 class="w-24 h-24 mx-auto mb-6 relative cursor-pointer group"
                 title="Click to celebrate again!">
              <div class="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-ping opacity-30 group-hover:opacity-60"></div>
              <div class="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform group-hover:scale-105 active:scale-95">
                <mat-icon class="scale-[2]">check</mat-icon>
              </div>
            </div>

            <h1 class="text-3xl sm:text-4xl font-black text-neutral-900 dark:text-white uppercase tracking-tight leading-tight mb-2">
              Order Placed<br>Successfully!
            </h1>
            <p class="text-sm font-medium text-neutral-500 mb-3">Thank you for shopping with 3D Galaxy.</p>
            
            <!-- Order ID Pill with Copy Action -->
            @if (order) {
              <div class="inline-flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl px-4 py-2 mt-1 shadow-xs transition-all hover:border-emerald-500/50">
                <span class="text-xs sm:text-sm font-mono font-bold text-neutral-800 dark:text-neutral-200 tracking-wider">
                  Order #{{ displayOrderId }}
                </span>
                <button (click)="copyOrderId()" 
                        type="button"
                        class="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-neutral-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                        [title]="copied() ? 'Order ID Copied!' : 'Copy Order ID'">
                  <mat-icon class="scale-75 transition-transform" [class.text-emerald-500]="copied()">{{ copied() ? 'check_circle' : 'content_copy' }}</mat-icon>
                  <span>{{ copied() ? 'Copied!' : 'Copy ID' }}</span>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Order Details Card -->
        @if (order) {
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden">
          <div class="p-6 sm:p-8 space-y-5">
            <div class="flex items-center justify-between">
              <h2 class="text-xs font-black text-neutral-400 uppercase tracking-[0.15em]">Order Details</h2>
              
              <!-- Quick Copy Button in Details -->
              <button (click)="copyOrderId()" 
                      type="button"
                      class="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
                <mat-icon class="scale-75">{{ copied() ? 'check' : 'content_copy' }}</mat-icon>
                <span>{{ copied() ? 'Copied' : 'Copy Order ID' }}</span>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Customer</p>
                <p class="text-sm font-bold text-neutral-900 dark:text-white truncate">{{ customerName }}</p>
              </div>
              <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total</p>
                <p class="text-sm font-black text-[#d65108]">{{ order.totalAmount | currency:'INR':'symbol':'1.0-2' }}</p>
              </div>
              <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Payment</p>
                <p class="text-sm font-bold text-neutral-900 dark:text-white">{{ order.paymentMethod || 'Online' }}</p>
              </div>
              <div class="p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                <p class="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Est. Delivery</p>
                <p class="text-sm font-bold text-neutral-900 dark:text-white">{{ estimatedDeliveryDateRange }}</p>
              </div>
            </div>
          </div>

          <!-- Order Timeline -->
          <div class="px-6 sm:px-8 pb-6 sm:pb-8">
            <h3 class="text-xs font-black text-neutral-400 uppercase tracking-[0.15em] mb-5">Order Progress</h3>
            <div class="flex items-start justify-between relative">
              <!-- Progress Line -->
              <div class="absolute top-4 left-4 right-4 h-0.5 bg-neutral-200 dark:bg-neutral-800"></div>
              <div class="absolute top-4 left-4 h-0.5 bg-emerald-400 transition-all duration-1000" [style.width]="'15%'"></div>

              @for (step of timelineSteps; track step.label; let i = $index) {
              <div class="relative z-10 flex flex-col items-center gap-1.5 w-24 text-center">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm transition-all"
                  [class]="i === 0
                    ? 'bg-emerald-500 text-white shadow-emerald-400/30'
                    : 'bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 text-neutral-400'">
                  @if (i === 0) {
                    <mat-icon class="scale-75">check</mat-icon>
                  } @else {
                    <mat-icon class="scale-75 text-neutral-400">{{ step.icon }}</mat-icon>
                  }
                </div>
                <span class="text-[9px] font-bold uppercase tracking-wider leading-tight"
                  [class]="i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'">{{ step.label }}</span>
                <span class="text-[9px] font-mono text-neutral-400 dark:text-neutral-500 font-semibold">{{ getStepDate(i) }}</span>
              </div>
              }
            </div>
          </div>
        </div>
        }

        <!-- Guest Registration CTA -->
        @if (isGuest && order) {
        <div class="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-200 dark:border-indigo-900 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
            <mat-icon>person_add</mat-icon>
          </div>
          <h3 class="font-black text-sm uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Save Time On Your Next Order</h3>
          <p class="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mx-auto">
            Register an account with address synchronization. We'll automatically link this order (<strong>{{ order.guestEmail }}</strong>) for tracking!
          </p>
          <button (click)="navigateToRegister()" class="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg">
            <mat-icon class="text-sm">person_add</mat-icon> Create Account
          </button>
        </div>
        }

        <!-- Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @if (!isGuest) {
            <a routerLink="/orders"
              class="flex items-center justify-center gap-2 py-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all shadow-lg cursor-pointer">
              <mat-icon class="text-sm">local_shipping</mat-icon> Track Order
            </a>
          } @else {
            <a routerLink="/order-tracking"
              class="flex items-center justify-center gap-2 py-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all shadow-lg cursor-pointer">
              <mat-icon class="text-sm">local_shipping</mat-icon> Track Guest Order
            </a>
          }
          <a routerLink="/"
            class="flex items-center justify-center gap-2 py-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-black text-xs tracking-[0.2em] uppercase rounded-xl transition-all cursor-pointer">
            <mat-icon class="text-sm">storefront</mat-icon> Continue Shopping
          </a>
        </div>

        <!-- Trust Footer -->
        <div class="flex flex-wrap gap-6 justify-center pb-8">
          <div class="flex items-center gap-2 text-neutral-400">
            <mat-icon class="scale-[0.65] text-emerald-500">verified_user</mat-icon>
            <span class="text-[10px] font-semibold">100% Secure Payment</span>
          </div>
          <div class="flex items-center gap-2 text-neutral-400">
            <mat-icon class="scale-[0.65] text-blue-500">support_agent</mat-icon>
            <span class="text-[10px] font-semibold">Dedicated Support</span>
          </div>
          <div class="flex items-center gap-2 text-neutral-400">
            <mat-icon class="scale-[0.65] text-[#d65108]">assignment_return</mat-icon>
            <span class="text-[10px] font-semibold">7-Day Easy Returns</span>
          </div>
        </div>

      </div>
    </div>
  `
})
export class OrderSuccessComponent implements AfterViewInit, OnDestroy {
  @ViewChild('confettiCanvas') confettiCanvasRef!: ElementRef<HTMLCanvasElement>;

  location = inject(Location);
  router = inject(Router);
  route = inject(ActivatedRoute);
  ds = inject(DatastoreService);
  api = inject(ApiService);
  toast = inject(ToastService);
  cdr = inject(ChangeDetectorRef);

  order: any;
  customerName = '';
  isGuest = false;
  isLoading = signal(false);
  copied = signal(false);

  private particles: PaperParticle[] = [];
  private animFrameId: number | null = null;
  private resizeListener?: () => void;

  timelineSteps = [
    { label: 'Confirmed', icon: 'check_circle' },
    { label: 'Preparing', icon: 'inventory_2' },
    { label: 'Packed', icon: 'package_2' },
    { label: 'Shipped', icon: 'local_shipping' },
    { label: 'Delivered', icon: 'home' }
  ];

  get displayOrderId(): string {
    return this.order?.orderNumber || this.order?.id || '';
  }

  get estimatedDeliveryDateRange(): string {
    const baseDate = this.order?.createdAt ? new Date(this.order.createdAt) : new Date();
    
    let minDays = 3;
    let maxDays = 5;
    
    const est = this.order?.estimatedDelivery || this.order?.estimatedDeliveryDays;
    if (typeof est === 'number') {
      minDays = Math.max(1, est - 1);
      maxDays = est + 2;
    } else if (typeof est === 'string') {
      const match = est.match(/(\d+)\s*-\s*(\d+)/);
      if (match) {
        minDays = parseInt(match[1], 10);
        maxDays = parseInt(match[2], 10);
      } else {
        const singleMatch = est.match(/(\d+)/);
        if (singleMatch) {
          const num = parseInt(singleMatch[1], 10);
          minDays = Math.max(1, num - 1);
          maxDays = num + 2;
        }
      }
    }

    const minDate = new Date(baseDate);
    minDate.setDate(minDate.getDate() + minDays);

    const maxDate = new Date(baseDate);
    maxDate.setDate(maxDate.getDate() + maxDays);

    const formatDayMonth = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const formatFull = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    if (minDate.getMonth() === maxDate.getMonth() && minDate.getFullYear() === maxDate.getFullYear()) {
      return `${minDate.getDate()} - ${formatFull(maxDate)}`;
    }
    return `${formatDayMonth(minDate)} - ${formatFull(maxDate)}`;
  }

  getStepDate(stepIndex: number): string {
    const baseDate = this.order?.createdAt ? new Date(this.order.createdAt) : new Date();
    const d = new Date(baseDate);

    const dayOffsets = [0, 1, 2, 3, 5];
    const offset = dayOffsets[stepIndex] !== undefined ? dayOffsets[stepIndex] : stepIndex;
    d.setDate(d.getDate() + offset);

    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  constructor() {
    const state = this.location.getState() as any;
    const orderId = this.route.snapshot.queryParamMap.get('orderId') || this.route.snapshot.queryParamMap.get('order_id');

    if (state && state.order && (state.order.id || state.order.orderNumber)) {
      this.order = state.order[0] || state.order;
      this.resolveCustomerName();
      if (orderId && (!this.order.totalAmount || !this.order.items)) {
        this.loadOrderFromApi(orderId);
      }
    } else if (orderId) {
      this.loadOrderFromApi(orderId);
    } else {
      this.router.navigate(['/']);
    }
  }

  private async loadOrderFromApi(orderId: string) {
    this.isLoading.set(true);
    try {
      const res: any = await firstValueFrom(this.api.get<any>(`/orders/${orderId}`));
      const fetchedOrder = res?.data || res;
      if (fetchedOrder && (fetchedOrder.id || fetchedOrder.orderNumber)) {
        this.order = fetchedOrder;
        this.resolveCustomerName();
      }
    } catch (err) {
      console.error('Failed to load order details from API:', err);
      if (!this.order) {
        this.order = { id: orderId };
        this.resolveCustomerName();
      }
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }

  private resolveCustomerName() {
    const u = this.ds.activeUser();
    let nameFromOrder = '';
    if (this.order) {
      const custObj = this.order.customer?.user || this.order.customer;
      const addrObj = this.order.shippingAddress;
      let rawLine1 = typeof addrObj === 'object' ? (addrObj?.addressLine1 || '') : (typeof addrObj === 'string' ? addrObj : '');
      if (rawLine1.includes('|')) {
        const p = rawLine1.split('|').map((s: string) => s.trim());
        if (p[0] && p[0] !== 'Customer' && p[0] !== 'Valued Customer') {
          nameFromOrder = p[0];
        }
      }
      if (!nameFromOrder) {
        nameFromOrder = 
          this.order.guestName || 
          this.order.customerName || 
          (this.order.contactDetails?.name) || 
          (typeof addrObj === 'object' ? (addrObj?.fullName || addrObj?.name) : null) || 
          (custObj ? `${custObj.firstName || ''} ${custObj.lastName || ''}`.trim() : null) || 
          '';
      }
    }

    if (nameFromOrder && nameFromOrder !== 'Customer' && nameFromOrder !== 'Valued Customer') {
      this.customerName = nameFromOrder;
    } else if (u) {
      this.customerName = (u as any).firstName ? `${(u as any).firstName} ${(u as any).lastName || ''}`.trim() : (u.name || 'Valued Customer');
    } else {
      this.customerName = 'Valued Customer';
    }

    this.isGuest = !u && (this.order?.customerType === 'guest' || !!this.order?.guestName);
  }

  ngAfterViewInit() {
    this.resizeCanvas();
    this.resizeListener = () => this.resizeCanvas();
    window.addEventListener('resize', this.resizeListener);

    // Trigger color paper throw animation on mount!
    setTimeout(() => this.triggerPaperThrow(), 200);
  }

  ngOnDestroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  copyOrderId() {
    const id = this.displayOrderId;
    if (!id) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(id).then(() => {
        this.handleCopySuccess();
      }).catch(err => {
        this.fallbackCopy(id);
      });
    } else {
      this.fallbackCopy(id);
    }
  }

  private handleCopySuccess() {
    this.copied.set(true);
    this.toast.success(`Order ID #${this.displayOrderId} copied to clipboard!`);
    this.cdr.detectChanges();
    setTimeout(() => {
      this.copied.set(false);
      this.cdr.detectChanges();
    }, 3000);
  }

  private fallbackCopy(text: string) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.handleCopySuccess();
    } catch (e) {
      this.toast.error('Failed to copy Order ID');
    }
  }

  /**
   * Color Paper Throw (Confetti) Particle System Engine
   */
  triggerPaperThrow() {
    const canvas = this.confettiCanvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const colors = [
      '#f43f5e', '#10b981', '#3b82f6', '#f59e0b',
      '#8b5cf6', '#ec4899', '#06b6d4', '#eab308',
      '#d65108', '#22c55e', '#a855f7', '#6366f1'
    ];
    const shapes: ('strip' | 'square' | 'circle' | 'triangle')[] = ['strip', 'square', 'circle', 'strip'];

    const newParticles: PaperParticle[] = [];
    const count = 220;

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      
      // Distribute launch points: Left Cannon (42%), Right Cannon (42%), Center Explosion (16%)
      let startX: number;
      let startY: number;
      let angle: number;
      let speed: number;

      const randType = Math.random();
      if (randType < 0.42) {
        // Left bottom cannon
        startX = Math.random() * (w * 0.25);
        startY = h + 10;
        angle = -Math.PI * (0.25 + Math.random() * 0.25); // -45 to -90 deg
        speed = 18 + Math.random() * 16;
      } else if (randType < 0.84) {
        // Right bottom cannon
        startX = w - Math.random() * (w * 0.25);
        startY = h + 10;
        angle = -Math.PI * (0.50 + Math.random() * 0.25); // -90 to -135 deg
        speed = 18 + Math.random() * 16;
      } else {
        // Center Burst
        startX = w * 0.5 + (Math.random() - 0.5) * 100;
        startY = h * 0.35 + (Math.random() - 0.5) * 100;
        angle = Math.random() * Math.PI * 2;
        speed = 8 + Math.random() * 14;
      }

      newParticles.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        sizeW: shape === 'strip' ? 10 + Math.random() * 8 : 6 + Math.random() * 6,
        sizeH: shape === 'strip' ? 4 + Math.random() * 4 : 6 + Math.random() * 6,
        color,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        wobble: Math.random() * 10,
        wobbleSpeed: 0.05 + Math.random() * 0.08,
        shape,
        alpha: 1.0,
        gravity: 0.22 + Math.random() * 0.12,
        drag: 0.97 + Math.random() * 0.015
      });
    }

    this.particles = [...this.particles, ...newParticles];

    if (this.animFrameId === null) {
      this.animateConfetti(ctx, canvas);
    }
  }

  private animateConfetti(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];

        p.vy += p.gravity;
        p.vx *= p.drag;
        p.vy *= p.drag;

        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 1.5;
        p.y += p.vy;

        p.rotation += p.rotationSpeed;

        // Fade out as it nears bottom or over time
        if (p.y > canvas.height * 0.75) {
          p.alpha -= 0.015;
        }

        if (p.alpha <= 0 || p.y > canvas.height + 60) {
          this.particles.splice(i, 1);
          continue;
        }

        // Draw individual paper piece
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        
        // 3D paper flutter flip simulation
        ctx.scale(Math.cos(p.wobble), 1);

        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.sizeW / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(-p.sizeW / 2, p.sizeH / 2);
          ctx.lineTo(p.sizeW / 2, p.sizeH / 2);
          ctx.lineTo(0, -p.sizeH / 2);
          ctx.closePath();
          ctx.fill();
        } else {
          // Strip / Square
          ctx.fillRect(-p.sizeW / 2, -p.sizeH / 2, p.sizeW, p.sizeH);
        }

        ctx.restore();
      }

      if (this.particles.length > 0) {
        this.animFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.animFrameId = null;
      }
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  private resizeCanvas() {
    const canvas = this.confettiCanvasRef?.nativeElement;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register'], { queryParams: { email: this.order?.guestEmail } });
  }
}

