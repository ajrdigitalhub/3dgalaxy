import { TestBed } from '@angular/core/testing';
import { ImagePreviewComponent } from './image-preview.component';

describe('ImagePreviewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePreviewComponent]
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(ImagePreviewComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
