import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WeekoffComponent } from './weekoff.component';

describe('WeekoffComponent', () => {
  let component: WeekoffComponent;
  let fixture: ComponentFixture<WeekoffComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeekoffComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WeekoffComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
