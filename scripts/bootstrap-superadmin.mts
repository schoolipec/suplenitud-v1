import {auth} from "../src/lib/auth";
import {prisma} from "../src/lib/db/client";

const bootstrapKey = "initial-superadmin";
const email = process.env.INITIAL_SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.INITIAL_SUPERADMIN_PASSWORD;

if (process.env.ENABLE_INITIAL_SUPERADMIN_BOOTSTRAP !== "true") {
  throw new Error("Set ENABLE_INITIAL_SUPERADMIN_BOOTSTRAP=true in the local secret environment to run this one-time operation.");
}

if (email !== "jscothserver@gmail.com") {
  throw new Error("INITIAL_SUPERADMIN_EMAIL must be the approved SuperAdmin email.");
}

if (!password || password.length < 16) {
  throw new Error("INITIAL_SUPERADMIN_PASSWORD must be at least 16 characters and must never be committed.");
}

if (await prisma.bootstrapState.findUnique({where: {key: bootstrapKey}})) {
  throw new Error("The initial SuperAdmin bootstrap has already been completed.");
}

if (await prisma.user.findUnique({where: {email}})) {
  throw new Error("The approved SuperAdmin email already exists; refusing to overwrite it.");
}

const result = await auth.api.signUpEmail({
  body: {email, password, name: "jscothserver"},
});

await prisma.$transaction([
  prisma.userRole.create({data: {userId: result.user.id, role: "SUPER_ADMIN"}}),
  prisma.bootstrapState.create({data: {key: bootstrapKey, completedAt: new Date()}}),
  prisma.auditLog.create({
    data: {
      actorUserId: result.user.id,
      action: "INITIAL_SUPERADMIN_BOOTSTRAPPED",
      resource: "user",
      resourceId: result.user.id,
    },
  }),
]);

console.log("Initial SuperAdmin created. Remove the bootstrap environment variables now.");
