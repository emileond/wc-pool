import { logger } from "@trigger.dev/sdk/v3";
import PocketBase from "pocketbase";

type PocketBaseAuthCollection = "users" | "_superusers";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function authCollection() {
  const collection = process.env.POCKETBASE_AUTH_COLLECTION || "users";
  if (collection === "users" || collection === "_superusers") return collection;

  throw new Error('POCKETBASE_AUTH_COLLECTION must be either "users" or "_superusers"');
}

async function authenticate(
  pb: PocketBase,
  collection: PocketBaseAuthCollection,
  identity: string,
  password: string,
  context: string,
) {
  await pb.collection(collection).authWithPassword(identity, password);

  logger.log("PocketBase authenticated", {
    context,
    collection,
    isSuperuser: pb.authStore.isSuperuser,
  });
}

export async function pocketBaseClient(context: string) {
  const pb = new PocketBase(requiredEnv("POCKETBASE_URL"));
  const collection = authCollection();

  try {
    await authenticate(
      pb,
      collection,
      requiredEnv("POCKETBASE_ADMIN_EMAIL"),
      requiredEnv("POCKETBASE_ADMIN_PASSWORD"),
      context,
    );
    return pb;
  } catch (err) {
    const superuserEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
    const superuserPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;

    if (collection === "users" && superuserEmail && superuserPassword) {
      logger.warn("PocketBase users auth failed; trying _superusers fallback", {
        context,
      });

      await authenticate(pb, "_superusers", superuserEmail, superuserPassword, context);
      return pb;
    }

    throw new Error(
      `PocketBase auth failed for "${collection}". Use a users auth record with is_admin=true, or set POCKETBASE_AUTH_COLLECTION="_superusers" for PocketBase superuser credentials.`,
      { cause: err },
    );
  }
}
