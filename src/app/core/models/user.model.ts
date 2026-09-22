export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface UsersFile {
  users: User[];
}