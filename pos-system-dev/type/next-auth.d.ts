import NextAuth from "next-auth";
import { Role, SessionUser } from "../lib/types";

declare module "next-auth" {
  interface User extends SessionUser {
    store?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    // Legacy fields for backward compatibility
    firstName?: string;
    lastName?: string;
  }
  
  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends SessionUser {
    store?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    // Legacy fields for backward compatibility
    firstName?: string;
    lastName?: string;
  }
}