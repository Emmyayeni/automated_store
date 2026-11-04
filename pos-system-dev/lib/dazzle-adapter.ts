import { Adapter, AdapterUser } from "next-auth/adapters";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export function DazzleAdapter(): Adapter {
  return {
    async createUser(user: AdapterUser) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: user.email,
          name: (user as any).name ?? "",
          role: (user as any).role ?? "cashier",
          isActive: true,
          passwordHash: (user as any).passwordHash ?? "",
        })
        .returning();
      if (!newUser) throw new Error("Failed to create user");
      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
        locationId: newUser.locationId ?? null,
        emailVerified: null,
      } as AdapterUser;
    },

    async getUser(id: string) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        locationId: user.locationId ?? null,
        emailVerified: null,
      } as AdapterUser;
    },

    async getUserByEmail(email: string) {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        locationId: user.locationId ?? null,
        emailVerified: null,
      } as AdapterUser;
    },

    async updateUser(user: Partial<AdapterUser> & { id: string }) {
      const updateData: any = {
        email: user.email,
        name: (user as any).name,
        role: (user as any).role,
        isActive: (user as any).isActive,
        locationId: (user as any).locationId,
      };
      if ((user as any).passwordHash) {
        updateData.passwordHash = (user as any).passwordHash;
      }
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id))
        .returning();
      if (!updatedUser) {
        throw new Error("User not found");
      }
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        locationId: updatedUser.locationId ?? null,
        emailVerified: null,
      } as AdapterUser;
    },

    async deleteUser(userId: string) {
      await db.delete(users).where(eq(users.id, userId));
    },

    // ACCOUNTS, SESSIONS, VERIFICATION TOKENS
    // ... (implement as needed or use DrizzleAdapter for these)
  };
}