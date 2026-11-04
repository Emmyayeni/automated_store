import { getServerSession, type NextAuthOptions, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DazzleAdapter } from "./dazzle-adapter";
import { db } from "./db";
import { users, locations } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getLoginUrl } from "./subdomain-config";

declare module "next-auth" {
  interface User {
    role?: string;
    isActive?: boolean;
    locationId?: string;
    businessId?: string;
    store?: any;
  }
  
  interface Session {
    user: User & {
      id: string;
      role?: string;
      isActive?: boolean;
      locationId?: string;
      businessId?: string;
      store?: any;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    isActive?: boolean;
    locationId?: string;
    businessId?: string;
    store?: any;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: DazzleAdapter(),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);
        if (!dbUser) return null;
        if (!dbUser.isActive) return null;
        if (!dbUser.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password as string, dbUser.passwordHash as string);
        if (!valid) return null;

        console.log("=== Auth Debug ===");
        console.log("User authenticated:", dbUser.email);
        console.log("User role:", dbUser.role);
        console.log("User active:", dbUser.isActive);

        // Fetch store details if locationId exists
        let store = null;
        if (dbUser.locationId) {
          const [dbStore] = await db
            .select()
            .from(locations)
            .where(eq(locations.id, dbUser.locationId))
            .limit(1);
          if (dbStore) {
            store = {
              id: dbStore.id,
              name: dbStore.name,
              email: dbStore.email,
              phone: dbStore.phone,
              address: dbStore.address,
              // code: dbStore.code, // removed because 'code' does not exist in locations schema
            };
          }
        }

        return {
          id: dbUser.id,
          name: dbUser.name ?? dbUser.email,
          email: dbUser.email ?? null,
          image: null,
          role: dbUser.role,
          isActive: dbUser.isActive,
          locationId: dbUser.locationId ?? null,
          store, // include store details
          businessId: dbUser.businessId ?? null, // <-- ensure businessId is included
        } as User & { [key: string]: any };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      console.log("=== Session Callback ===");
      console.log("Token role:", token.role);
      console.log("Session before update:", session.user);
      
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.isActive = token.isActive as boolean;
        session.user.locationId = token.locationId as string;
        session.user.businessId = token.businessId as string;
        session.user.store = token.store as any;
        session.user.name = token.name as string;
      }
      
      console.log("Session after update:", session.user);
      return session;
    },
    async jwt({ token, user }) {
      console.log("=== JWT Callback ===");
      console.log("User in JWT callback:", user);
      
      if (user) {
        const customUser = user as any; // Cast to access custom properties
        token.role = customUser.role;
        token.isActive = customUser.isActive;
        token.locationId = customUser.locationId;
        token.store = customUser.store;
        token.name = customUser.name;
        token.businessId = customUser.businessId;
        
        console.log("Updated token:", { role: token.role, isActive: token.isActive });
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Custom redirect logic for role-based routing
      if (url.startsWith("/")) {
        // Relative URL, make it absolute
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        // Same origin, allow
        return url;
      }
      // For login redirects, always go to root which handles role routing
      return baseUrl;
    },
  },
  pages: { 
    signIn: "/login",
    error: "/login",
  },
};

export function auth() {
  return getServerSession(authOptions);
}

// Client-side hook for accessing authentication
export function useAuth() {
  // This should be used on client-side components
  // For server components, use auth() function above
  throw new Error("useAuth should be replaced with useSession from next-auth/react on client side");
}

// Authenticate user with credentials
export async function authenticateUser(email: string, password: string) {
  if (!email || !password) return null;
  
  const [dbUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
    
  if (!dbUser || !dbUser.isActive || !dbUser.passwordHash) return null;
  
  const valid = await bcrypt.compare(password, dbUser.passwordHash);
  if (!valid) return null;
  
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    businessId: dbUser.businessId,
    locationId: dbUser.locationId
  };
}

// Generate authentication token
export function generateToken(payload: any) {
  // This is a simplified token generation
  // In production, use proper JWT library
  const tokenData = {
    ...payload,
    timestamp: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
}