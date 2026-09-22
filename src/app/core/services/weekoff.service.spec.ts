import { TestBed } from '@angular/core/testing';
import { WeekoffService } from './weekoff.service';

describe('WeekoffService', () => {
  let service: WeekoffService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WeekoffService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
