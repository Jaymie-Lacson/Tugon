import { PrismaClient } from "@prisma/client";

function buildRuntimeDatabaseUrl(rawUrl: string | undefined): string | undefined {
	if (!rawUrl) {
		return undefined;
	}

	try {
		const parsed = new URL(rawUrl);
		const isSupabasePooler = parsed.hostname.includes("pooler.supabase.com");
		const rawConnectionLimit = process.env.PRISMA_POOL_CONNECTION_LIMIT;
		const parsedConnectionLimit = Number(rawConnectionLimit);
		const shouldSetConnectionLimit =
			typeof rawConnectionLimit === "string" &&
			rawConnectionLimit.trim().length > 0 &&
			Number.isFinite(parsedConnectionLimit) &&
			parsedConnectionLimit > 0;

		if (isSupabasePooler) {
			// PgBouncer transaction pooling requires these settings for Prisma.
			if (!parsed.searchParams.has("pgbouncer")) {
				parsed.searchParams.set("pgbouncer", "true");
			}

			if (shouldSetConnectionLimit) {
				parsed.searchParams.set("connection_limit", String(Math.floor(parsedConnectionLimit)));
			}
		}

		return parsed.toString();
	} catch {
		return rawUrl;
	}
}

const runtimeDatabaseUrl = buildRuntimeDatabaseUrl(process.env.DATABASE_URL);

export const prisma = runtimeDatabaseUrl
	? new PrismaClient({
			datasources: {
				db: {
					url: runtimeDatabaseUrl,
				},
			},
		})
	: new PrismaClient();
