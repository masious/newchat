import { type Database, authTokens, eq, and } from "@newchat/db";

export async function insertAuthToken(db: Database, token: string) {
  await db.insert(authTokens).values({ token, status: "pending" });
}

export async function findAuthToken(db: Database, token: string) {
  return db.query.authTokens.findFirst({
    where: eq(authTokens.token, token),
    columns: { id: true, status: true, createdAt: true },
  });
}

export async function expireAuthToken(db: Database, tokenId: number) {
  await db
    .update(authTokens)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(authTokens.id, tokenId));
}

export async function exchangeConfirmedToken(db: Database, token: string) {
  const [record] = await db
    .update(authTokens)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(authTokens.token, token),
        eq(authTokens.status, "confirmed"),
      ),
    )
    .returning();
  return record ?? null;
}
