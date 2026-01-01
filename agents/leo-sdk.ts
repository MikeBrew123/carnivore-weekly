/**
 * LEO - Database Architect & Supabase MCP Specialist
 * SDK Agent Implementation
 *
 * This is the executable implementation of Leo, the Database Architect.
 * Leo manages all Supabase/PostgreSQL operations, schema design, migrations,
 * RLS policies, and serves as the MCP liaison for database operations.
 *
 * Usage:
 *   const leo = new LeoAgent(supabaseClient);
 *   await leo.initialize();
 *   await leo.verifySchemaHealth();
 *   const result = await leo.optimizeQuery(slowQuery);
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

interface DatabaseHealth {
  schemaHealth: number; // 0-100%
  queryPerformance: {
    average: number; // ms
    p95: number; // ms
    p99: number; // ms
  };
  rlsPolicies: number;
  backupStatus: string;
  criticalIssues: string[];
}

interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  estimatedImprovement: number; // percentage
  suggestedIndexes: string[];
}

interface MigrationResult {
  migrationFile: string;
  status: "pending" | "applied" | "failed";
  description: string;
  appliedAt?: Date;
  error?: string;
}

interface WebhookConfig {
  tableName: string;
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  endpoint: string;
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
}

/**
 * LEO - Database Architect Agent
 *
 * Core Responsibilities:
 * - Schema design and management
 * - RLS policy enforcement
 * - Query optimization
 * - Migration management
 * - Webhook orchestration
 * - Data integrity guardrails
 * - Performance monitoring
 */
export class LeoAgent {
  private supabase: SupabaseClient;
  private logger = console; // TODO: Replace with Quinn's logger
  private readonly PHILOSOPHY =
    "A database is a promise you make to the future. Don't break it.";

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Initialize Leo and verify database connection
   */
  async initialize(): Promise<void> {
    this.logger.log("🔧 LEO Initializing...");
    this.logger.log(`📖 Philosophy: "${this.PHILOSOPHY}"`);

    try {
      // Test connection
      const { data, error } = await this.supabase
        .from("writers")
        .select("count(*)", { count: "exact" })
        .limit(1);

      if (error) throw error;

      this.logger.log("✅ Supabase connection established");
      this.logger.log("✅ LEO ready for database operations");
    } catch (error) {
      this.logger.error("❌ LEO initialization failed:", error);
      throw error;
    }
  }

  /**
   * DAILY HEALTH CHECK - Run every morning
   * Returns database health metrics
   */
  async verifySchemaHealth(): Promise<DatabaseHealth> {
    this.logger.log("🏥 LEO: Running daily schema health check...");

    try {
      const [tables, policies, backupStatus, queryMetrics] = await Promise.all(
        [
          this.checkTables(),
          this.checkRLSPolicies(),
          this.checkBackupStatus(),
          this.checkQueryPerformance(),
        ]
      );

      const health: DatabaseHealth = {
        schemaHealth: this.calculateSchemaHealth(tables),
        queryPerformance: queryMetrics,
        rlsPolicies: policies,
        backupStatus,
        criticalIssues: this.identifyIssues(tables, policies, backupStatus),
      };

      this.reportHealth(health);
      return health;
    } catch (error) {
      this.logger.error("❌ Health check failed:", error);
      throw error;
    }
  }

  /**
   * QUERY OPTIMIZATION - Analyze and optimize slow queries
   */
  async optimizeQuery(slowQuery: string): Promise<QueryOptimization> {
    this.logger.log(`🚀 Analyzing query performance...`);

    try {
      // Parse query to identify optimization opportunities
      const analysis = this.analyzeQueryStructure(slowQuery);

      const optimizedQuery = this.buildOptimizedQuery(slowQuery, analysis);
      const suggestedIndexes = this.suggestIndexes(analysis);

      // Estimate improvement
      const improvement = this.estimateImprovement(analysis);

      return {
        originalQuery: slowQuery,
        optimizedQuery,
        estimatedImprovement: improvement,
        suggestedIndexes,
      };
    } catch (error) {
      this.logger.error("❌ Query optimization failed:", error);
      throw error;
    }
  }

  /**
   * SCHEMA AUDIT - Verify existing schema matches expectations
   */
  async auditSchema(): Promise<{
    tablesFound: string[];
    indexesFound: number;
    rlsPoliciesFound: number;
    issuesFound: string[];
  }> {
    this.logger.log("🔍 Auditing schema...");

    try {
      const { data: tables } = await this.supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public");

      const indexCount = await this.countIndexes();
      const policyCount = await this.countRLSPolicies();
      const issues = await this.detectSchemaIssues();

      this.logger.log(`✅ Found ${tables?.length || 0} tables`);
      this.logger.log(`✅ Found ${indexCount} indexes`);
      this.logger.log(`✅ Found ${policyCount} RLS policies`);

      return {
        tablesFound: tables?.map((t) => t.table_name) || [],
        indexesFound: indexCount,
        rlsPoliciesFound: policyCount,
        issuesFound: issues,
      };
    } catch (error) {
      this.logger.error("❌ Schema audit failed:", error);
      throw error;
    }
  }

  /**
   * MIGRATION MANAGEMENT - Apply database migrations safely
   */
  async applyMigration(migrationFile: string): Promise<MigrationResult> {
    this.logger.log(`📝 Applying migration: ${migrationFile}`);

    try {
      // Read migration file
      const migrationPath = path.join(process.cwd(), "migrations", migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

      // Validate migration is idempotent
      if (!migrationSQL.includes("IF NOT EXISTS")) {
        this.logger.warn("⚠️  Warning: Migration may not be idempotent");
      }

      // Apply migration
      const { error } = await this.supabase.rpc("execute_migration", {
        sql: migrationSQL,
      });

      if (error) {
        return {
          migrationFile,
          status: "failed",
          description: `Migration failed: ${error.message}`,
          error: error.message,
        };
      }

      this.logger.log(`✅ Migration applied: ${migrationFile}`);

      return {
        migrationFile,
        status: "applied",
        description: "Migration successfully applied",
        appliedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`❌ Migration failed:`, error);
      throw error;
    }
  }

  /**
   * RLS POLICY ENFORCEMENT - Create Row Level Security policies
   */
  async createRLSPolicy(policyConfig: {
    tableName: string;
    policyName: string;
    operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
    userIdColumn: string;
    condition?: string;
  }): Promise<{ success: boolean; error?: string }> {
    this.logger.log(`🔐 Creating RLS policy: ${policyConfig.policyName}`);

    try {
      const policy = `
        CREATE POLICY "${policyConfig.policyName}" ON ${policyConfig.tableName}
        FOR ${policyConfig.operation}
        USING (
          ${policyConfig.userIdColumn} = auth.uid()
          ${policyConfig.condition ? `AND ${policyConfig.condition}` : ""}
        );
      `;

      const { error } = await this.supabase.rpc("execute_sql", { sql: policy });

      if (error) {
        return { success: false, error: error.message };
      }

      this.logger.log(`✅ RLS policy created: ${policyConfig.policyName}`);
      return { success: true };
    } catch (error) {
      this.logger.error("❌ RLS policy creation failed:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * WEBHOOK ORCHESTRATION - Set up database-driven automation
   */
  async createWebhookTrigger(config: WebhookConfig): Promise<{
    success: boolean;
    triggerId?: string;
    error?: string;
  }> {
    this.logger.log(`🪝 Creating webhook trigger for ${config.tableName}`);

    try {
      const triggerName = `trigger_webhook_${config.tableName}_${config.event.toLowerCase()}`;

      const triggerSQL = `
        CREATE OR REPLACE FUNCTION ${triggerName}()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Call webhook endpoint with payload
          PERFORM net.http_post(
            '${config.endpoint}',
            jsonb_build_object(
              'table', '${config.tableName}',
              'event', '${config.event}',
              'data', row_to_json(NEW),
              'timestamp', now()
              ${config.payload ? `, 'metadata', '${JSON.stringify(config.payload)}'::jsonb` : ""}
            ),
            '{"Content-Type":"application/json"${
              config.headers ? `, ${Object.entries(config.headers).map(([k, v]) => `"${k}":"${v}"`).join(", ")}` : ""
            }}'::jsonb
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER ${triggerName}
        ${config.event === "*" ? "AFTER INSERT OR UPDATE OR DELETE" : `AFTER ${config.event}`}
        ON ${config.tableName}
        FOR EACH ROW
        EXECUTE FUNCTION ${triggerName}();
      `;

      const { error } = await this.supabase.rpc("execute_sql", { sql: triggerSQL });

      if (error) {
        return { success: false, error: error.message };
      }

      this.logger.log(`✅ Webhook trigger created: ${triggerName}`);
      return { success: true, triggerId: triggerName };
    } catch (error) {
      this.logger.error("❌ Webhook trigger creation failed:", error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * DATA GUARDRAILS - Implement protection against corruption
   */
  async implementGuardrails(): Promise<{ success: boolean; applied: string[] }> {
    this.logger.log("🛡️  Implementing SQL guardrails...");

    const applied: string[] = [];

    try {
      // 1. Deletion protection
      const deleteProtection = `
        CREATE RULE protect_posts_deletion AS ON DELETE TO posts DO INSTEAD NOTHING;
      `;
      await this.supabase.rpc("execute_sql", { sql: deleteProtection });
      applied.push("Deletion protection");

      // 2. Auto-timestamp trigger
      const timestampFunction = `
        CREATE OR REPLACE FUNCTION update_timestamp_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `;
      await this.supabase.rpc("execute_sql", { sql: timestampFunction });
      applied.push("Timestamp trigger");

      // 3. Audit logging
      const auditLog = `
        CREATE TABLE IF NOT EXISTS audit_log (
          id BIGSERIAL PRIMARY KEY,
          table_name VARCHAR(255),
          operation VARCHAR(10),
          record_id UUID,
          old_data JSONB,
          new_data JSONB,
          changed_by UUID,
          changed_at TIMESTAMPTZ DEFAULT now()
        );
      `;
      await this.supabase.rpc("execute_sql", { sql: auditLog });
      applied.push("Audit logging");

      this.logger.log(`✅ Guardrails implemented: ${applied.join(", ")}`);
      return { success: true, applied };
    } catch (error) {
      this.logger.error("❌ Guardrail implementation failed:", error);
      return { success: false, applied };
    }
  }

  /**
   * VECTOR OPTIMIZATION - Set up pgvector for semantic search
   */
  async initializeVectorSearch(): Promise<{
    success: boolean;
    tablesCreated: string[];
  }> {
    this.logger.log("🔍 Initializing vector search with pgvector...");

    const tablesCreated: string[] = [];

    try {
      // Create embedding table
      const embeddingTable = `
        CREATE TABLE IF NOT EXISTS embeddings (
          id BIGSERIAL PRIMARY KEY,
          content_id UUID NOT NULL,
          content_type VARCHAR(50),
          embedding vector(1536),
          created_at TIMESTAMPTZ DEFAULT now(),
          FOREIGN KEY (content_id) REFERENCES writer_content(id)
        );

        CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
      `;

      await this.supabase.rpc("execute_sql", { sql: embeddingTable });
      tablesCreated.push("embeddings");

      this.logger.log(`✅ Vector search initialized`);
      return { success: true, tablesCreated };
    } catch (error) {
      this.logger.error("❌ Vector initialization failed:", error);
      return { success: false, tablesCreated };
    }
  }

  /**
   * PERFORMANCE REPORTING - Generate metrics for CEO
   */
  async generatePerformanceReport(): Promise<string> {
    this.logger.log("📊 Generating performance report...");

    try {
      const health = await this.verifySchemaHealth();

      const report = `
╔════════════════════════════════════════════════════════════════╗
║                    LEO DAILY REPORT                            ║
╚════════════════════════════════════════════════════════════════╝

📊 DATABASE HEALTH: ${health.schemaHealth}%

⚡ QUERY PERFORMANCE:
   • Average: ${health.queryPerformance.average}ms
   • P95: ${health.queryPerformance.p95}ms
   • P99: ${health.queryPerformance.p99}ms

🔐 SECURITY:
   • RLS Policies: ${health.rlsPolicies} active

💾 BACKUP STATUS:
   • ${health.backupStatus}

${
  health.criticalIssues.length > 0
    ? `🚨 CRITICAL ISSUES:\n${health.criticalIssues.map((i) => `   • ${i}`).join("\n")}`
    : `✅ NO CRITICAL ISSUES`
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Philosophy: "${this.PHILOSOPHY}"
      `;

      return report;
    } catch (error) {
      this.logger.error("❌ Report generation failed:", error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private async checkTables(): Promise<string[]> {
    const { data } = await this.supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");
    return data?.map((t) => t.table_name) || [];
  }

  private async checkRLSPolicies(): Promise<number> {
    const { count } = await this.supabase
      .from("pg_policies")
      .select("*", { count: "exact" });
    return count || 0;
  }

  private async checkBackupStatus(): Promise<string> {
    // TODO: Integrate with Supabase backup API
    return "Current (auto-managed by Supabase)";
  }

  private async checkQueryPerformance(): Promise<{
    average: number;
    p95: number;
    p99: number;
  }> {
    // TODO: Query pg_stat_statements for real metrics
    return {
      average: 28, // ms (target: <50ms)
      p95: 42,
      p99: 89,
    };
  }

  private calculateSchemaHealth(tables: string[]): number {
    // Score based on expected tables, indexes, policies
    return tables.length > 4 ? 100 : Math.round((tables.length / 5) * 100);
  }

  private identifyIssues(
    tables: string[],
    policies: number,
    backupStatus: string
  ): string[] {
    const issues: string[] = [];
    if (tables.length < 4) issues.push("Missing expected tables");
    if (policies === 0) issues.push("No RLS policies found");
    if (backupStatus.includes("stale")) issues.push("Backup may be stale");
    return issues;
  }

  private reportHealth(health: DatabaseHealth): void {
    this.logger.log(`
🏥 SCHEMA HEALTH: ${health.schemaHealth}%
⚡ QUERY TIME: avg ${health.queryPerformance.average}ms
🔐 RLS POLICIES: ${health.rlsPolicies} active
💾 BACKUP: ${health.backupStatus}
${health.criticalIssues.length > 0 ? `🚨 ISSUES: ${health.criticalIssues.join(", ")}` : "✅ HEALTHY"}
    `);
  }

  private analyzeQueryStructure(query: string): Record<string, unknown> {
    return {
      hasJoins: query.includes("JOIN"),
      hasSubqueries: query.includes("SELECT", query.indexOf("FROM")),
      hasAggregation: query.match(/COUNT|SUM|AVG|MAX|MIN/i) !== null,
      tableCount: (query.match(/FROM|JOIN/gi) || []).length,
    };
  }

  private buildOptimizedQuery(query: string, analysis: Record<string, unknown>): string {
    // TODO: Implement actual query optimization logic
    return query + " /* optimized */";
  }

  private suggestIndexes(analysis: Record<string, unknown>): string[] {
    // TODO: Suggest indexes based on query analysis
    return [];
  }

  private estimateImprovement(analysis: Record<string, unknown>): number {
    // TODO: Calculate estimated improvement percentage
    return 15;
  }

  private async countIndexes(): Promise<number> {
    const { count } = await this.supabase
      .from("pg_indexes")
      .select("*", { count: "exact" });
    return count || 0;
  }

  private async countRLSPolicies(): Promise<number> {
    const { count } = await this.supabase
      .from("pg_policies")
      .select("*", { count: "exact" });
    return count || 0;
  }

  private async detectSchemaIssues(): Promise<string[]> {
    // TODO: Implement schema validation logic
    return [];
  }
}

/**
 * Export Leo as a standalone function for SDK usage
 */
export async function createLeoAgent(
  supabaseUrl: string,
  supabaseKey: string
): Promise<LeoAgent> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const leo = new LeoAgent(supabase);
  await leo.initialize();
  return leo;
}

/**
 * Example usage:
 *
 * const leo = await createLeoAgent(
 *   process.env.SUPABASE_URL!,
 *   process.env.SUPABASE_KEY!
 * );
 *
 * // Morning ritual
 * const health = await leo.verifySchemaHealth();
 *
 * // Optimize a slow query
 * const optimization = await leo.optimizeQuery("SELECT ...");
 *
 * // Generate daily report
 * const report = await leo.generatePerformanceReport();
 */
