import {betterAuth} from "better-auth";
import {prismaAdapter} from "better-auth/adapters/prisma";
import {prisma} from "@/lib/db/client";

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
