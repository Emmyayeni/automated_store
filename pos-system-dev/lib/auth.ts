import { getServerSession, type NextAuthOptions, type User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DazzleAdapter } from "./dazzle-adapter";
import { db } from "./db";
import { users, locations, businesses } from "./schema";
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

        // Fetch store details if locationId exists or fallback to first location
        let store = null;
        let resolvedLocationId = dbUser.locationId;

        if (resolvedLocationId) {
          const [dbStore] = await db
            .select()
            .from(locations)
            .where(eq(locations.id, resolvedLocationId))
            .limit(1);
          if (dbStore) {
            store = {
              id: dbStore.id,
              name: dbStore.name,
              email: dbStore.email,
              phone: dbStore.phone,
              address: dbStore.address,
            };
          }
        } else {
          // Fallback to first branch for Admin or central users
          const [firstLoc] = await db.select().from(locations).limit(1);
          if (firstLoc) {
            resolvedLocationId = firstLoc.id;
            store = {
              id: firstLoc.id,
              name: firstLoc.name,
              email: firstLoc.email,
              phone: firstLoc.phone,
              address: firstLoc.address,
            };
          }
        }

        let resolvedBusinessId = dbUser.businessId;
        if (!resolvedBusinessId) {
          const [firstBiz] = await db.select({ id: businesses.id }).from(businesses).limit(1);
          resolvedBusinessId = firstBiz?.id ?? null;
        }

        return {
          id: dbUser.id,
          name: dbUser.name ?? dbUser.email,
          email: dbUser.email ?? null,
          image: null,
          role: dbUser.role,
          isActive: dbUser.isActive,
          locationId: resolvedLocationId ?? null,
          store, // include store details
          businessId: resolvedBusinessId, // <-- ensure businessId is included
        } as User & { [key: string]: any };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
        session.user.isActive = token.isActive as boolean;
        session.user.locationId = token.locationId as string;
        session.user.businessId = token.businessId as string;
        session.user.store = token.store as any;
        session.user.name = token.name as string;
      }
      
      if (session.user && !session.user.locationId) {
        const [firstLoc] = await db.select({ id: locations.id, name: locations.name }).from(locations).limit(1);
        if (firstLoc) {
          session.user.locationId = firstLoc.id as string;
          if (!session.user.store) {
            session.user.store = { id: firstLoc.id, name: firstLoc.name };
          }
        }
      }

      if (session.user && !session.user.businessId) {
        const [firstBiz] = await db.select({ id: businesses.id }).from(businesses).limit(1);
        session.user.businessId = firstBiz?.id as string;
      }

      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as any; // Cast to access custom properties
        token.role = customUser.role;
        token.isActive = customUser.isActive;
        token.locationId = customUser.locationId;
        token.store = customUser.store;
        token.name = customUser.name;
        token.businessId = customUser.businessId;
      }

      if (!token.businessId) {
        const [firstBiz] = await db.select({ id: businesses.id }).from(businesses).limit(1);
        token.businessId = firstBiz?.id as string;
      }

      return token;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs without hardcoding baseUrl
      if (url.startsWith("/")) {
        return url;
      }
      // Allows callback URLs on the same origin
      try {
        if (new URL(url).origin === baseUrl) {
          return url;
        }
      } catch {}
      return url || baseUrl;
    },
  },
  pages: { 
    signIn: "/login",
    signOut: "/login",
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