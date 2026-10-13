import {betterAuth} from "better-auth";
import {prismaAdapter} from "better-auth/adapters/prisma";
import {prisma} from "@/lib/db/client";
import {twoFactor} from "better-auth/plugins";

/**
 * Authentication is backed by the application database. Values for
 * BETTER_AUTH_SECRET and BETTER_AUTH_URL live only in the deployment environment.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {provider: "postgresql"}),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({
            where: {id: session.userId},
            select: {active: true},
          });
          if (!user?.active) return false;
          const pendingInvitation = await prisma.userInvitation.findFirst({
            where: {userId: session.userId, usedAt: null, revokedAt: null},
            select: {id: true},
          });
          if (pendingInvitation) return false;
          return true;
        },
      },
    },
  },
  plugins: [twoFactor({issuer: "Iglesia Plenitud en Cristo"})],
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        defaultValue: true,
        input: false,
        required: false,
      },
    },
  },
});
