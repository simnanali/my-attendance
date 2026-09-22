import { TestBed } from '@angular/core/testing';
import { JsonFileStorageService } from './json-file-storage.service';

describe('JsonFileStorageService', () => {
  let service: JsonFileStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JsonFileStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
