import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

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
