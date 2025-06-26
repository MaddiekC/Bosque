import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BosqueComponent } from './bosque.component';

describe('BosqueComponent', () => {
  let component: BosqueComponent;
  let fixture: ComponentFixture<BosqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BosqueComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BosqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
