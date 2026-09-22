import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RaleoComponent } from './raleo.component';

describe('RaleoComponent', () => {
  let component: RaleoComponent;
  let fixture: ComponentFixture<RaleoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RaleoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RaleoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
