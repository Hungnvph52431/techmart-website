export interface User {
  userId: number;
  email: string;
  name: string;
  phone?: string;
  role: "customer" | "admin" | "staff" | "warehouse";
  status: "active" | "inactive" | "banned";
  points: number;
  membershipLevel: "bronze" | "silver" | "gold" | "platinum";
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface UserWithPassword extends User {
  password: string;
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: "customer" | "admin" | "staff" | "warehouse";
}

export interface UpdateUserDTO {
  userId: number;
  name?: string;
  phone?: string;
  role?: "customer" | "admin" | "staff" | "warehouse";
  status?: "active" | "inactive" | "banned";
  points?: number;
  membershipLevel?: "bronze" | "silver" | "gold" | "platinum";
}

export interface UserLoginDTO {
  email: string;
  password: string;
}
