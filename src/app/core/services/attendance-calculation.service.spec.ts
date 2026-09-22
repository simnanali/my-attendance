import { TestBed } from '@angular/core/testing';
import { AttendanceCalculationService } from './attendance-calculation.service';

describe('AttendanceCalculationService', () => {
  let service: AttendanceCalculationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendanceCalculationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
