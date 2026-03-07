export type Role = "CITIZEN" | "OFFICIAL" | "SUPER_ADMIN";

export interface UserRecord {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  barangayCode?: string;
  isPhoneVerified: boolean;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingRegistration {
  fullName: string;
  phoneNumber: string;
  barangayCode: string;
}

export interface OtpRecord {
  phoneNumber: string;
  code: string;
  expiresAtMs: number;
  isVerified: boolean;
  registration?: PendingRegistration;
}

export interface AuthPayload {
  sub: string;
  role: Role;
  phoneNumber: string;
}

export interface PublicUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  barangayCode?: string;
  isPhoneVerified: boolean;
}

export interface AuthSession {
  token: string;
  user: PublicUser;
}

export interface AuthenticatedRequestUser {
  id: string;
  role: Role;
  phoneNumber: string;
}

export interface AuthenticatedRequest extends Express.Request {
  authUser?: AuthenticatedRequestUser;
}
