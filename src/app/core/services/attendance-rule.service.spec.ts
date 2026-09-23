import { TestBed } from '@angular/core/testing';
import { AttendanceRuleService } from './attendance-rule.service';

describe('AttendanceRuleService', () => {
  let service: AttendanceRuleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttendanceRuleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
