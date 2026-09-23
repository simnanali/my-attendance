import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AttendanceRules } from '../models/attendance-rule.model';

/**
 * Form-group-level validator: fails when the group's "password" and
 * "confirmPassword" controls don't match. Attach to the FormGroup
 * (not an individual control) via the second argument of fb.group().
 */
export function passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const password = group.get('password')?.value;
        const confirmPassword = group.get('confirmPassword')?.value;
        return password === confirmPassword ? null : { passwordsMismatch: true };
    };
}

/**
 * Plain (non-Angular-Forms) validator for the Standard > Full Day >
 * Half Day > 0 invariant (Section 16). Returns a user-facing error
 * message, or null when valid. Kept independent of Angular Forms so
 * it's reusable from AttendanceRuleService (before ever calling
 * storage) as well as directly from a component, and independently
 * unit-testable without mounting a form.
 */
export function validateAttendanceRules(rules: AttendanceRules): string | null {
    const { standardWorkingMinutes, fullDayThresholdMinutes, halfDayThresholdMinutes } = rules;

    if (halfDayThresholdMinutes <= 0) {
        return 'Half Day Threshold must be greater than 0.';
    }
    if (fullDayThresholdMinutes <= halfDayThresholdMinutes) {
        return 'Full Day Threshold must be greater than the Half Day Threshold.';
    }
    if (standardWorkingMinutes <= fullDayThresholdMinutes) {
        return 'Standard Working Hours must be greater than the Full Day Threshold.';
    }
    return null;
}
