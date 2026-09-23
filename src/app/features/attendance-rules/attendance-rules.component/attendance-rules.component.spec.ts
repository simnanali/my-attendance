import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttendanceRulesComponent } from './attendance-rules.component';

describe('AttendanceRulesComponent', () => {
  let component: AttendanceRulesComponent;
  let fixture: ComponentFixture<AttendanceRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceRulesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AttendanceRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
