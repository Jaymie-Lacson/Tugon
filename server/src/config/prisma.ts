import { PrismaClient } from "@prisma/client";

function buildRuntimeDatabaseUrl(rawUrl: string | undefined): string | undefined {
	if (!rawUrl) {
		return undefined;
	}

	try {
		const parsed = new URL(rawUrl);
		const isSupabasePooler = parsed.hostname.includes("pooler.supabase.com");

		if (isSupabasePooler) {
			// PgBouncer transaction pooling requires these settings for Prisma.
			if (!parsed.searchParams.has("pgbouncer")) {
				parsed.searchParams.set("pgbouncer", "true");
			}
			if (!parsed.searchParams.has("connection_limit")) {
				parsed.searchParams.set("connection_limit", "1");
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
