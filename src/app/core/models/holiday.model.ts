export interface HolidayModel { }

export interface Holiday {
    id: string;
    date: string;
    day: string;
    name: string;
    type: string;
}

export interface HolidaysFile {
    holidays: Holiday[];
}

/**
 * Suggested values for the Holiday Type field (Section 5) — kept as a
 * plain string on Holiday itself, NOT a strict TypeScript union, so
 * additional types can be added later without a breaking model change
 * or a dedicated Holiday Type admin screen.
 */
export const HOLIDAY_TYPES: readonly string[] = [
    'National',
    'Public',
    'Festival',
    'Company',
    'Other',
];
