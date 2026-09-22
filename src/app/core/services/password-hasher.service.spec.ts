import { TestBed } from '@angular/core/testing';
import { PasswordHasherService } from './password-hasher.service';

describe('PasswordHasherService', () => {
  let service: PasswordHasherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PasswordHasherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
