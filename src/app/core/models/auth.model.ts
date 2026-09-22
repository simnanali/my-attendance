export interface AuthModel { }

export interface RegisterPayload {
    fullName: string;
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

/**
 * The subset of User exposed to the rest of the application once
 * logged in — deliberately excludes passwordHash (never expose
 * unnecessary sensitive data to UI components).
 */
export interface AuthenticatedUser {
    id: string;
    fullName: string;
    email: string;
    username: string;
    createdAt: string;
}
