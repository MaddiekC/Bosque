import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiembraRebroteComponent } from './siembra-rebrote.component';

describe('SiembraRebroteComponent', () => {
  let component: SiembraRebroteComponent;
  let fixture: ComponentFixture<SiembraRebroteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiembraRebroteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SiembraRebroteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
