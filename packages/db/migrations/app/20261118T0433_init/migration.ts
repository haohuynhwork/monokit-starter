#!/usr/bin/env -S node
import {
  checkExpression,
  col,
  fn,
  lit,
  Migration,
  MigrationCLI,
  primaryKey,
  sql,
} from "@prisma/orm-postgres/migration";
import type { Contract as End } from "../../snapshots/3f05c3fee4f064ef66d25c43e83a61ca6bd1d3fd7b324b1e8fc81ab93c12a882/contract";
import endContract from "../../snapshots/3f05c3fee4f064ef66d25c43e83a61ca6bd1d3fd7b324b1e8fc81ab93c12a882/contract.json" with {
  type: "json",
};

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({
        schema: "public",
      }),
      this.createTable({
        schema: "public",
        table: "Address",
        columns: [
          col("city", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("countryCode", "character varying(2)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2,
              },
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("isDefault", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("label", "character varying(100)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("line1", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("line2", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("phone", "character varying(32)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 32,
              },
            },
          }),
          col("postalCode", "character varying(32)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 32,
              },
            },
          }),
          col("recipientName", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("region", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("regionCode", "character varying(10)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 10,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("userId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Asset",
        columns: [
          col("checksum", "character varying(64)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("createdById", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("filename", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("fullSlug", "character varying(2048)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2048,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("key", "character varying(1024)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 1024,
              },
            },
          }),
          col("kind", "text", {
            notNull: true,
            default: lit("file"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("mimeType", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("parentId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("sizeBytes", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("slug", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("storage", "character varying(64)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("storageKey", "character varying(1024)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 1024,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("url", "character varying(2048)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2048,
              },
            },
          }),
          col("visibility", "text", {
            notNull: true,
            default: lit("private"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "Asset_kind_check_baa0ec8d",
            sql`"kind" IN ('file', 'directory', 'link')`,
          ),
          checkExpression(
            "Asset_visibility_check_b9e4faaa",
            sql`"visibility" IN ('public', 'private')`,
          ),
          checkExpression(
            "assets_kind_columns_b3db5690",
            sql`
        CASE "kind"
            WHEN 'file' THEN "storage" IS NOT NULL AND "storageKey" IS NOT NULL AND "mimeType" IS NOT NULL AND "sizeBytes" IS NOT NULL AND "sizeBytes" >= 0 AND "checksum" IS NOT NULL AND "url" IS NULL
            WHEN 'link' THEN "url" IS NOT NULL AND "storage" IS NULL AND "storageKey" IS NULL
            ELSE "storage" IS NULL AND "storageKey" IS NULL AND "url" IS NULL AND "mimeType" IS NULL AND "sizeBytes" IS NULL
          END
      `,
          ),
          checkExpression(
            "assets_slug_not_blank_dc84afd7",
            sql`"slug" <> '' AND "slug" = btrim("slug")`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "AssetClosure",
        columns: [
          col("ancestorId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("depth", "int4", {
            notNull: true,
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("descendantId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "ancestorId",
            "descendantId",
          ]),
          checkExpression("asset_closure_depth_d1577caf", sql`"depth" >= 0`),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "AssetUsage",
        columns: [
          col("assetId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("ownerId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("ownerType", "character varying(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("slot", "character varying(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "AuditEvent",
        columns: [
          col("action", "character varying(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("actorId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("data", "jsonb", {
            notNull: true,
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
          col("entityId", "character varying(64)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("entityType", "character varying(32)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 32,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("ip", "character varying(45)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 45,
              },
            },
          }),
          col("occurredAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("userAgent", "character varying(512)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 512,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "audit_events_entity_6f4503f1",
            sql`("entityType" IS NULL) = ("entityId" IS NULL)`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "CartItem",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("quantity", "int4", {
            notNull: true,
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("userId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("variantId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "cart_items_quantity_positive_fc510296",
            sql`"quantity" > 0`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Config",
        columns: [
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("key", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("updatedById", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("value", "jsonb", {
            notNull: true,
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ContactMessage",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("email", "character varying(320)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 320,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("ip", "character varying(45)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 45,
              },
            },
          }),
          col("mailedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("message", "text", {
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("messageFormat", "text", {
            notNull: true,
            default: lit("text"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("name", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("phone", "character varying(50)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 50,
              },
            },
          }),
          col("status", "text", {
            notNull: true,
            default: lit("new"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("subject", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("userAgent", "character varying(512)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 512,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "ContactMessage_messageFormat_check_1f54851d",
            sql`"messageFormat" IN ('text', 'html')`,
          ),
          checkExpression(
            "ContactMessage_status_check_1fc19e89",
            sql`"status" IN ('new', 'read', 'replied', 'spam', 'archived')`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Coupon",
        columns: [
          col("active", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("code", "character varying(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("description", "character varying(255)", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("endsAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("maxDiscount", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("minSubtotal", "int8", {
            notNull: true,
            default: lit("0"),
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("perUserLimit", "int4", {
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("stackable", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("startsAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("type", "text", {
            notNull: true,
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("usageLimit", "int4", {
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("usedCount", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("value", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "Coupon_type_check_4a5d33c9",
            sql`"type" IN ('percent', 'fixed')`,
          ),
          checkExpression(
            "coupons_code_upper_33d3da85",
            sql`"code" = upper("code")`,
          ),
          checkExpression(
            "coupons_usage_limit_3aab42d8",
            sql`"usedCount" >= 0 AND ("usageLimit" IS NULL OR "usedCount" <= "usageLimit")`,
          ),
          checkExpression(
            "coupons_value_range_54558a74",
            sql`"value" > 0 AND ("type" <> 'percent' OR "value" <= 10000)`,
          ),
          checkExpression(
            "coupons_window_90c2bd9c",
            sql`"endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt" > "startsAt"`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Currency",
        columns: [
          col("active", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("code", "character varying(3)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 3,
              },
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("decimals", "int4", {
            notNull: true,
            default: lit(2),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("rate", "numeric(20,10)", {
            notNull: true,
            default: lit("1.0000000000"),
            codecRef: {
              codecId: "pg/numeric@1",
              typeParams: {
                precision: 20,
                scale: 10,
              },
            },
          }),
          col("rateAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("symbol", "character varying(10)", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 10,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "currencies_code_upper_33d3da85",
            sql`"code" = upper("code")`,
          ),
          checkExpression(
            "currencies_decimals_range_dc04b3f5",
            sql`"decimals" BETWEEN 0 AND 4`,
          ),
          checkExpression("currencies_rate_positive_c2c4c0b8", sql`"rate" > 0`),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Locale",
        columns: [
          col("active", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("code", "character varying(16)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 16,
              },
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("isDefault", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("name", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("nativeName", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("rtl", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "locales_default_active_bb5b2367",
            sql`NOT "isDefault" OR "active"`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Notification",
        columns: [
          col("actorId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("data", "jsonb", {
            notNull: true,
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("readAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("recipientId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("type", "character varying(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Order",
        columns: [
          col("billingAddress", "jsonb", {
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("currency", "character varying(3)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 3,
              },
            },
          }),
          col("discount", "int8", {
            notNull: true,
            default: lit("0"),
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("note", "character varying(1000)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 1000,
              },
            },
          }),
          col("paidAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("paymentMethod", "text", {
            notNull: true,
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("paymentStatus", "text", {
            notNull: true,
            default: lit("unpaid"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("shippingAddress", "jsonb", {
            notNull: true,
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
          col("shippingFee", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("status", "text", {
            notNull: true,
            default: lit("pending"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("statusReason", "character varying(500)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 500,
              },
            },
          }),
          col("subtotal", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("tax", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("total", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("trackingNumber", "character varying(100)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("userId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "Order_paymentMethod_check_928d56ad",
            sql`"paymentMethod" IN ('cod', 'bank_transfer')`,
          ),
          checkExpression(
            "Order_paymentStatus_check_a43dcec2",
            sql`"paymentStatus" IN ('unpaid', 'paid', 'refunded')`,
          ),
          checkExpression(
            "Order_status_check_6381753a",
            sql`"status" IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'rejected')`,
          ),
          checkExpression(
            "orders_discount_range_0bcd0e87",
            sql`"discount" >= 0 AND "discount" <= "subtotal"`,
          ),
          checkExpression(
            "orders_total_sum_a0e4f72a",
            sql`"total" = "subtotal" - "discount" + "shippingFee" + "tax"`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "OrderCoupon",
        columns: [
          col("code", "character varying(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("couponId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("discount", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("orderId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "order_coupons_discount_positive_273de4e4",
            sql`"discount" >= 0`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "OrderEvent",
        columns: [
          col("actorId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("data", "jsonb", {
            notNull: true,
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("orderId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("type", "character varying(32)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 32,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "OrderItem",
        columns: [
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("listPrice", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("orderId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("productId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("quantity", "int4", {
            notNull: true,
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("sku", "character varying(64)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("unitPrice", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("variantId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("variantName", "character varying(255)", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "order_items_quantity_positive_fc510296",
            sql`"quantity" > 0`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Page",
        columns: [
          col("authorId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("description", "character varying(500)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 500,
              },
            },
          }),
          col("fullSlug", "character varying(2048)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2048,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("layoutId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("menuOrder", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("parentId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("publishedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("settings", "jsonb", {
            notNull: true,
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
          col("showInMenu", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("slug", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("status", "text", {
            notNull: true,
            default: lit("draft"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("title", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "Page_status_check_e60b91be",
            sql`"status" IN ('draft', 'scheduled', 'published')`,
          ),
          checkExpression(
            "pages_live_has_url_18a4e669",
            sql`"status" = 'draft' OR ("fullSlug" IS NOT NULL AND "publishedAt" IS NOT NULL)`,
          ),
          checkExpression(
            "pages_settings_shape_be5fac70",
            sql`jsonb_typeof("settings") = 'object' AND jsonb_typeof("settings"->'blocks') = 'array'`,
          ),
          checkExpression(
            "pages_slug_not_blank_5a51c6aa",
            sql`"slug" IS NULL OR ("slug" = btrim("slug") AND "slug" <> '')`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PageClosure",
        columns: [
          col("ancestorId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("depth", "int4", {
            notNull: true,
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("descendantId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "ancestorId",
            "descendantId",
          ]),
          checkExpression("page_closure_depth_d1577caf", sql`"depth" >= 0`),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PageLayout",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("isDefault", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("name", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("settings", "jsonb", {
            notNull: true,
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "page_layouts_default_live_c7cdd09e",
            sql`NOT "isDefault" OR "deletedAt" IS NULL`,
          ),
          checkExpression(
            "page_layouts_settings_is_object_ea16724d",
            sql`jsonb_typeof("settings") = 'object'`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PageTranslation",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("description", "character varying(500)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 500,
              },
            },
          }),
          col("fullSlug", "character varying(2048)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2048,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("localeId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("pageId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("settings", "jsonb", {
            codecRef: {
              codecId: "pg/jsonb@1",
            },
          }),
          col("slug", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("title", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "page_translations_settings_shape_4d144dcd",
            sql`"settings" IS NULL OR (jsonb_typeof("settings") = 'object' AND jsonb_typeof("settings"->'blocks') = 'array')`,
          ),
          checkExpression(
            "page_translations_slug_not_blank_5a51c6aa",
            sql`"slug" IS NULL OR ("slug" = btrim("slug") AND "slug" <> '')`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Permission",
        columns: [
          col("group", "character varying(50)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 50,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("key", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("label", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Post",
        columns: [
          col("authorId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("content", "text", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("description", "character varying(500)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 500,
              },
            },
          }),
          col("fullSlug", "character varying(2048)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2048,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("parentId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("publishedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("slug", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("status", "text", {
            notNull: true,
            default: lit("draft"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("title", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "Post_status_check_e60b91be",
            sql`"status" IN ('draft', 'scheduled', 'published')`,
          ),
          checkExpression(
            "posts_live_has_url_18a4e669",
            sql`"status" = 'draft' OR ("fullSlug" IS NOT NULL AND "publishedAt" IS NOT NULL)`,
          ),
          checkExpression(
            "posts_slug_not_blank_5a51c6aa",
            sql`"slug" IS NULL OR ("slug" = btrim("slug") AND "slug" <> '')`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PostClosure",
        columns: [
          col("ancestorId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("depth", "int4", {
            notNull: true,
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("descendantId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "ancestorId",
            "descendantId",
          ]),
          checkExpression("post_closure_depth_d1577caf", sql`"depth" >= 0`),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PostTag",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("slug", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PostTagTranslation",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("localeId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("slug", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("tagId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PostTagging",
        columns: [
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("postId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("tagId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "postId",
            "tagId",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "PostTranslation",
        columns: [
          col("content", "text", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("description", "character varying(500)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 500,
              },
            },
          }),
          col("fullSlug", "character varying(2048)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2048,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("localeId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("postId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("slug", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("title", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "post_translations_slug_not_blank_5a51c6aa",
            sql`"slug" IS NULL OR ("slug" = btrim("slug") AND "slug" <> '')`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Product",
        columns: [
          col("categoryId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("content", "text", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("createdById", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("description", "character varying(500)", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 500,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("maxPrice", "int8", {
            notNull: true,
            default: lit("0"),
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("minPrice", "int8", {
            notNull: true,
            default: lit("0"),
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("ratingCount", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("ratingSum", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("saleEndsAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("saleStartsAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("slug", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("status", "text", {
            notNull: true,
            default: lit("draft"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "Product_status_check_ee326507",
            sql`"status" IN ('draft', 'active', 'archived')`,
          ),
          checkExpression(
            "products_price_range_66a68677",
            sql`"minPrice" >= 0 AND "maxPrice" >= "minPrice"`,
          ),
          checkExpression(
            "products_sale_window_d7f9af34",
            sql`"saleEndsAt" IS NULL OR "saleStartsAt" IS NULL OR "saleEndsAt" > "saleStartsAt"`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductCategory",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("parentId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("slug", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductCategoryTranslation",
        columns: [
          col("categoryId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("localeId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("slug", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductGalleryItem",
        columns: [
          col("assetId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("description", "character varying(1000)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 1000,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("productId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("title", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductOption",
        columns: [
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("productId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductOptionValue",
        columns: [
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("optionId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("value", "character varying(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductRating",
        columns: [
          col("body", "character varying(2000)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2000,
              },
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("productId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("stars", "int4", {
            notNull: true,
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("userId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "product_ratings_stars_66cdc43f",
            sql`"stars" BETWEEN 1 AND 5`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductTranslation",
        columns: [
          col("content", "text", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("description", "character varying(500)", {
            notNull: true,
            default: lit(""),
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 500,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("localeId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("productId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("slug", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductVariant",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("listPrice", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("productId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("salePrice", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("sku", "character varying(64)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("stock", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("trackStock", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "product_variants_list_price_positive_10a97f9c",
            sql`"listPrice" >= 0`,
          ),
          checkExpression(
            "product_variants_sale_price_below_list_739dc86d",
            sql`"salePrice" IS NULL OR ("salePrice" >= 0 AND "salePrice" < "listPrice")`,
          ),
          checkExpression(
            "product_variants_stock_positive_41037d42",
            sql`"stock" >= 0`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "ProductVariantValue",
        columns: [
          col("optionId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("valueId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("variantId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "variantId",
            "optionId",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Region",
        columns: [
          col("active", "bool", {
            notNull: true,
            default: lit(true),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("code", "character varying(20)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 20,
              },
            },
          }),
          col("countryCode", "character varying(2)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2,
              },
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("name", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("parentId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("position", "int4", {
            notNull: true,
            default: lit(0),
            codecRef: {
              codecId: "pg/int4@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "Role",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("description", "text", {
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("key", "character varying(50)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 50,
              },
            },
          }),
          col("name", "character varying(100)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("system", "bool", {
            notNull: true,
            default: lit(false),
            codecRef: {
              codecId: "pg/bool@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "RolePermission",
        columns: [
          col("permissionId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("roleId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "roleId",
            "permissionId",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "User",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("deletedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("displayName", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("email", "character varying(320)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 320,
              },
            },
          }),
          col("emailVerifiedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("familyName", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("givenName", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("localeId", "int8", {
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("phoneCountry", "character varying(2)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 2,
              },
            },
          }),
          col("phoneNumber", "character varying(20)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 20,
              },
            },
          }),
          col("roleId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("shortName", "character varying(100)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 100,
              },
            },
          }),
          col("status", "text", {
            notNull: true,
            default: lit("active"),
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("updatedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "User_status_check_39370351",
            sql`"status" IN ('active', 'disabled')`,
          ),
          checkExpression(
            "users_phone_pair_b838b0c8",
            sql`("phoneCountry" IS NULL) = ("phoneNumber" IS NULL)`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "UserIdentity",
        columns: [
          col("accessToken", "text", {
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("accessTokenExpiresAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("idToken", "text", {
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("lastUsedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("passwordHash", "character varying(255)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("provider", "character varying(32)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 32,
              },
            },
          }),
          col("providerUserId", "character varying(255)", {
            notNull: true,
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 255,
              },
            },
          }),
          col("refreshToken", "text", {
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("refreshTokenExpiresAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("scope", "text", {
            codecRef: {
              codecId: "pg/text@1",
            },
          }),
          col("userId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
          checkExpression(
            "user_identities_password_hash_ff66083a",
            sql`("provider" = 'password') = ("passwordHash" IS NOT NULL)`,
          ),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "UserSession",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("expiresAt", "timestamptz", {
            notNull: true,
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("id", "BIGSERIAL", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("ip", "character varying(45)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 45,
              },
            },
          }),
          col("lastUsedAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("previousTokenHash", "character(64)", {
            codecRef: {
              codecId: "sql/char@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("revokedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("rotatedAt", "timestamptz", {
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("tokenHash", "character(64)", {
            notNull: true,
            codecRef: {
              codecId: "sql/char@1",
              typeParams: {
                length: 64,
              },
            },
          }),
          col("userAgent", "character varying(512)", {
            codecRef: {
              codecId: "sql/varchar@1",
              typeParams: {
                length: 512,
              },
            },
          }),
          col("userId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "id",
          ]),
        ],
      }),
      this.createTable({
        schema: "public",
        table: "WishlistItem",
        columns: [
          col("createdAt", "timestamptz", {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: {
              codecId: "pg/timestamptz-string@1",
            },
          }),
          col("productId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
          col("userId", "int8", {
            notNull: true,
            codecRef: {
              codecId: "pg/int8@1",
            },
          }),
        ],
        constraints: [
          primaryKey([
            "userId",
            "productId",
          ]),
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "Asset",
        constraint: "Asset_key_key",
        columns: [
          "key",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "Asset",
        constraint: "Asset_storage_storageKey_key",
        columns: [
          "storage",
          "storageKey",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "Asset",
        constraint: "Asset_fullSlug_key",
        columns: [
          "fullSlug",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "AssetUsage",
        constraint: "AssetUsage_ownerType_ownerId_slot_assetId_key",
        columns: [
          "ownerType",
          "ownerId",
          "slot",
          "assetId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "CartItem",
        constraint: "CartItem_userId_variantId_key",
        columns: [
          "userId",
          "variantId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "Config",
        constraint: "Config_key_key",
        columns: [
          "key",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "Currency",
        constraint: "Currency_code_key",
        columns: [
          "code",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "Locale",
        constraint: "Locale_code_key",
        columns: [
          "code",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "OrderCoupon",
        constraint: "OrderCoupon_orderId_code_key",
        columns: [
          "orderId",
          "code",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "PageTranslation",
        constraint: "PageTranslation_pageId_localeId_key",
        columns: [
          "pageId",
          "localeId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "Permission",
        constraint: "Permission_key_key",
        columns: [
          "key",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "PostTagTranslation",
        constraint: "PostTagTranslation_tagId_localeId_key",
        columns: [
          "tagId",
          "localeId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "PostTranslation",
        constraint: "PostTranslation_postId_localeId_key",
        columns: [
          "postId",
          "localeId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "ProductCategoryTranslation",
        constraint: "ProductCategoryTranslation_categoryId_localeId_key",
        columns: [
          "categoryId",
          "localeId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "ProductGalleryItem",
        constraint: "ProductGalleryItem_productId_assetId_key",
        columns: [
          "productId",
          "assetId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "ProductOption",
        constraint: "ProductOption_productId_name_key",
        columns: [
          "productId",
          "name",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "ProductOptionValue",
        constraint: "ProductOptionValue_optionId_value_key",
        columns: [
          "optionId",
          "value",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "ProductRating",
        constraint: "ProductRating_productId_userId_key",
        columns: [
          "productId",
          "userId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "ProductTranslation",
        constraint: "ProductTranslation_productId_localeId_key",
        columns: [
          "productId",
          "localeId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "Region",
        constraint: "Region_code_key",
        columns: [
          "code",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "UserIdentity",
        constraint: "UserIdentity_provider_providerUserId_key",
        columns: [
          "provider",
          "providerUserId",
        ],
      }),
      this.addUnique({
        schema: "public",
        table: "UserSession",
        constraint: "UserSession_tokenHash_key",
        columns: [
          "tokenHash",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Address",
        index: "Address_userId_idx_a489d58a",
        columns: [
          "userId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Address",
        index: "addresses_one_default_c480d6f5",
        columns: [
          "userId",
        ],
        extras: {
          where: sql`("isDefault" AND "deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Asset",
        index: "Asset_createdById_idx_8bf640ed",
        columns: [
          "createdById",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Asset",
        index: "Asset_parentId_idx_6a68f597",
        columns: [
          "parentId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Asset",
        index: "assets_parent_slug_unique_3df35c31",
        expression: sql`COALESCE("parentId", 0), "slug"`,
        extras: {
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "AssetClosure",
        index: "AssetClosure_ancestorId_idx_a8187fe2",
        columns: [
          "ancestorId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "AssetClosure",
        index: "AssetClosure_descendantId_depth_idx_7b9da2c9",
        columns: [
          "descendantId",
          "depth",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "AssetClosure",
        index: "AssetClosure_descendantId_idx_4dcf3aea",
        columns: [
          "descendantId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "AssetUsage",
        index: "AssetUsage_assetId_idx_4ebe630a",
        columns: [
          "assetId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "AuditEvent",
        index: "AuditEvent_actorId_occurredAt_idx_38439793",
        columns: [
          "actorId",
          "occurredAt",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "AuditEvent",
        index: "AuditEvent_entityType_entityId_occurredAt_idx_30bba558",
        columns: [
          "entityType",
          "entityId",
          "occurredAt",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "AuditEvent",
        index: "AuditEvent_occurredAt_idx_c6b89167",
        columns: [
          "occurredAt",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "CartItem",
        index: "CartItem_userId_idx_a489d58a",
        columns: [
          "userId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "CartItem",
        index: "CartItem_variantId_idx_e16bb45d",
        columns: [
          "variantId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Config",
        index: "Config_updatedById_idx_d0517c24",
        columns: [
          "updatedById",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ContactMessage",
        index: "contact_messages_inbox_6780b84b",
        columns: [
          "status",
          "createdAt",
        ],
        extras: {
          where: sql`("deletedAt" IS NULL)`,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Coupon",
        index: "coupons_code_unique_6ae62505",
        columns: [
          "code",
        ],
        extras: {
          where: sql`("deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Locale",
        index: "locales_one_default_a670d39c",
        columns: [
          "isDefault",
        ],
        extras: {
          where: sql`("isDefault")`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Notification",
        index: "Notification_actorId_idx_a58f6b4b",
        columns: [
          "actorId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Notification",
        index: "Notification_recipientId_createdAt_idx_4cb575bd",
        columns: [
          "recipientId",
          "createdAt",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Notification",
        index: "Notification_recipientId_idx_c9527cf8",
        columns: [
          "recipientId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Notification",
        index: "notifications_unread_ff6e4625",
        columns: [
          "recipientId",
        ],
        extras: {
          where: sql`("readAt" IS NULL)`,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Order",
        index: "Order_status_createdAt_idx_58610442",
        columns: [
          "status",
          "createdAt",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Order",
        index: "Order_userId_createdAt_idx_f726f04a",
        columns: [
          "userId",
          "createdAt",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Order",
        index: "Order_userId_idx_a489d58a",
        columns: [
          "userId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "OrderCoupon",
        index: "OrderCoupon_couponId_idx_a9dd19dc",
        columns: [
          "couponId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "OrderCoupon",
        index: "OrderCoupon_orderId_idx_d284871b",
        columns: [
          "orderId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "OrderEvent",
        index: "OrderEvent_actorId_idx_a58f6b4b",
        columns: [
          "actorId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "OrderEvent",
        index: "OrderEvent_orderId_createdAt_idx_cf5e070a",
        columns: [
          "orderId",
          "createdAt",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "OrderEvent",
        index: "OrderEvent_orderId_idx_d284871b",
        columns: [
          "orderId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "OrderItem",
        index: "OrderItem_orderId_idx_d284871b",
        columns: [
          "orderId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "OrderItem",
        index: "OrderItem_productId_idx_5858600a",
        columns: [
          "productId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "OrderItem",
        index: "OrderItem_variantId_idx_e16bb45d",
        columns: [
          "variantId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Page",
        index: "Page_authorId_idx_e47547ed",
        columns: [
          "authorId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Page",
        index: "Page_layoutId_idx_dc26ea26",
        columns: [
          "layoutId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Page",
        index: "Page_parentId_idx_6a68f597",
        columns: [
          "parentId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Page",
        index: "pages_full_slug_unique_ab330a72",
        columns: [
          "fullSlug",
        ],
        extras: {
          where: sql`("fullSlug" IS NOT NULL AND "deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "PageClosure",
        index: "PageClosure_ancestorId_idx_a8187fe2",
        columns: [
          "ancestorId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PageClosure",
        index: "PageClosure_descendantId_depth_idx_7b9da2c9",
        columns: [
          "descendantId",
          "depth",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PageClosure",
        index: "PageClosure_descendantId_idx_4dcf3aea",
        columns: [
          "descendantId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PageLayout",
        index: "page_layouts_name_unique_5b193f72",
        columns: [
          "name",
        ],
        extras: {
          where: sql`("deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "PageLayout",
        index: "page_layouts_one_default_a670d39c",
        columns: [
          "isDefault",
        ],
        extras: {
          where: sql`("isDefault")`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "PageTranslation",
        index: "PageTranslation_localeId_idx_a143071d",
        columns: [
          "localeId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PageTranslation",
        index: "PageTranslation_pageId_idx_8caaba4f",
        columns: [
          "pageId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PageTranslation",
        index: "page_translations_full_slug_unique_76aa0096",
        columns: [
          "localeId",
          "fullSlug",
        ],
        extras: {
          where: sql`("fullSlug" IS NOT NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Post",
        index: "Post_authorId_idx_e47547ed",
        columns: [
          "authorId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Post",
        index: "Post_parentId_idx_6a68f597",
        columns: [
          "parentId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Post",
        index: "posts_full_slug_unique_ab330a72",
        columns: [
          "fullSlug",
        ],
        extras: {
          where: sql`("fullSlug" IS NOT NULL AND "deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Post",
        index: "posts_published_992850c9",
        columns: [
          "publishedAt",
        ],
        extras: {
          where: sql`("status" = 'published' AND "deletedAt" IS NULL)`,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Post",
        index: "posts_search_d687e9fe",
        expression: sql`(setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("content", '')), 'B'))`,
        extras: {
          type: "gin",
        },
      }),
      this.createIndex({
        schema: "public",
        table: "PostClosure",
        index: "PostClosure_ancestorId_idx_a8187fe2",
        columns: [
          "ancestorId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostClosure",
        index: "PostClosure_descendantId_depth_idx_7b9da2c9",
        columns: [
          "descendantId",
          "depth",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostClosure",
        index: "PostClosure_descendantId_idx_4dcf3aea",
        columns: [
          "descendantId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostTag",
        index: "post_tags_slug_unique_d334acec",
        columns: [
          "slug",
        ],
        extras: {
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "PostTagTranslation",
        index: "PostTagTranslation_localeId_idx_a143071d",
        columns: [
          "localeId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostTagTranslation",
        index: "PostTagTranslation_tagId_idx_86854244",
        columns: [
          "tagId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostTagTranslation",
        index: "post_tag_translations_slug_unique_312b4484",
        columns: [
          "localeId",
          "slug",
        ],
        extras: {
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "PostTagging",
        index: "PostTagging_postId_idx_a7a72715",
        columns: [
          "postId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostTagging",
        index: "PostTagging_tagId_idx_86854244",
        columns: [
          "tagId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostTranslation",
        index: "PostTranslation_localeId_idx_a143071d",
        columns: [
          "localeId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostTranslation",
        index: "PostTranslation_postId_idx_a7a72715",
        columns: [
          "postId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "PostTranslation",
        index: "post_translations_full_slug_unique_76aa0096",
        columns: [
          "localeId",
          "fullSlug",
        ],
        extras: {
          where: sql`("fullSlug" IS NOT NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "Product",
        index: "Product_categoryId_idx_15c304f2",
        columns: [
          "categoryId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Product",
        index: "Product_createdById_idx_8bf640ed",
        columns: [
          "createdById",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Product",
        index: "products_slug_unique_783eb938",
        columns: [
          "slug",
        ],
        extras: {
          where: sql`("deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "ProductCategory",
        index: "ProductCategory_parentId_idx_6a68f597",
        columns: [
          "parentId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductCategory",
        index: "productCategories_slug_unique_783eb938",
        columns: [
          "slug",
        ],
        extras: {
          where: sql`("deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "ProductCategoryTranslation",
        index: "ProductCategoryTranslation_categoryId_idx_15c304f2",
        columns: [
          "categoryId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductCategoryTranslation",
        index: "ProductCategoryTranslation_localeId_idx_a143071d",
        columns: [
          "localeId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductCategoryTranslation",
        index: "product_category_translations_slug_unique_312b4484",
        columns: [
          "localeId",
          "slug",
        ],
        extras: {
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "ProductGalleryItem",
        index: "ProductGalleryItem_assetId_idx_4ebe630a",
        columns: [
          "assetId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductGalleryItem",
        index: "ProductGalleryItem_productId_idx_5858600a",
        columns: [
          "productId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductOption",
        index: "ProductOption_productId_idx_5858600a",
        columns: [
          "productId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductOptionValue",
        index: "ProductOptionValue_optionId_idx_b1d5fce5",
        columns: [
          "optionId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductRating",
        index: "ProductRating_productId_idx_5858600a",
        columns: [
          "productId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductRating",
        index: "ProductRating_userId_idx_a489d58a",
        columns: [
          "userId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductTranslation",
        index: "ProductTranslation_localeId_idx_a143071d",
        columns: [
          "localeId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductTranslation",
        index: "ProductTranslation_productId_idx_5858600a",
        columns: [
          "productId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductTranslation",
        index: "product_translations_slug_unique_312b4484",
        columns: [
          "localeId",
          "slug",
        ],
        extras: {
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "ProductVariant",
        index: "ProductVariant_productId_idx_5858600a",
        columns: [
          "productId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductVariant",
        index: "product_variants_sku_unique_1d42d533",
        columns: [
          "sku",
        ],
        extras: {
          where: sql`("sku" IS NOT NULL AND "deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "ProductVariantValue",
        index: "ProductVariantValue_optionId_idx_b1d5fce5",
        columns: [
          "optionId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductVariantValue",
        index: "ProductVariantValue_valueId_idx_ad9e9fbe",
        columns: [
          "valueId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "ProductVariantValue",
        index: "ProductVariantValue_variantId_idx_e16bb45d",
        columns: [
          "variantId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Region",
        index: "Region_countryCode_parentId_idx_77936178",
        columns: [
          "countryCode",
          "parentId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Region",
        index: "Region_parentId_idx_6a68f597",
        columns: [
          "parentId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "Role",
        index: "roles_key_unique_9d1981f1",
        expression: sql`lower("key")`,
        extras: {
          where: sql`("deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "RolePermission",
        index: "RolePermission_permissionId_idx_f46fcdf5",
        columns: [
          "permissionId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "RolePermission",
        index: "RolePermission_roleId_idx_ffccc9a4",
        columns: [
          "roleId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "User",
        index: "User_localeId_idx_a143071d",
        columns: [
          "localeId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "User",
        index: "User_roleId_idx_ffccc9a4",
        columns: [
          "roleId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "User",
        index: "users_email_unique_2718608f",
        expression: sql`lower("email")`,
        extras: {
          where: sql`("deletedAt" IS NULL)`,
          unique: true,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "UserIdentity",
        index: "UserIdentity_userId_idx_a489d58a",
        columns: [
          "userId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "UserSession",
        index: "UserSession_expiresAt_idx_6b6b8c10",
        columns: [
          "expiresAt",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "UserSession",
        index: "UserSession_previousTokenHash_idx_fb2d0efb",
        columns: [
          "previousTokenHash",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "UserSession",
        index: "UserSession_userId_idx_a489d58a",
        columns: [
          "userId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "UserSession",
        index: "user_sessions_user_active_74b58416",
        columns: [
          "userId",
        ],
        extras: {
          where: sql`("revokedAt" IS NULL)`,
        },
      }),
      this.createIndex({
        schema: "public",
        table: "WishlistItem",
        index: "WishlistItem_productId_idx_5858600a",
        columns: [
          "productId",
        ],
      }),
      this.createIndex({
        schema: "public",
        table: "WishlistItem",
        index: "WishlistItem_userId_idx_a489d58a",
        columns: [
          "userId",
        ],
      }),
      this.addForeignKey({
        schema: "public",
        table: "Address",
        foreignKey: {
          name: "Address_userId_fkey",
          columns: [
            "userId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Asset",
        foreignKey: {
          name: "Asset_parentId_fkey",
          columns: [
            "parentId",
          ],
          references: {
            schema: "public",
            table: "Asset",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Asset",
        foreignKey: {
          name: "Asset_createdById_fkey",
          columns: [
            "createdById",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "AssetClosure",
        foreignKey: {
          name: "AssetClosure_descendantId_fkey",
          columns: [
            "descendantId",
          ],
          references: {
            schema: "public",
            table: "Asset",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "AssetClosure",
        foreignKey: {
          name: "AssetClosure_ancestorId_fkey",
          columns: [
            "ancestorId",
          ],
          references: {
            schema: "public",
            table: "Asset",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "AssetUsage",
        foreignKey: {
          name: "AssetUsage_assetId_fkey",
          columns: [
            "assetId",
          ],
          references: {
            schema: "public",
            table: "Asset",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "CartItem",
        foreignKey: {
          name: "CartItem_userId_fkey",
          columns: [
            "userId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "CartItem",
        foreignKey: {
          name: "CartItem_variantId_fkey",
          columns: [
            "variantId",
          ],
          references: {
            schema: "public",
            table: "ProductVariant",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Config",
        foreignKey: {
          name: "Config_updatedById_fkey",
          columns: [
            "updatedById",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Notification",
        foreignKey: {
          name: "Notification_recipientId_fkey",
          columns: [
            "recipientId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Notification",
        foreignKey: {
          name: "Notification_actorId_fkey",
          columns: [
            "actorId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Order",
        foreignKey: {
          name: "Order_userId_fkey",
          columns: [
            "userId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrderCoupon",
        foreignKey: {
          name: "OrderCoupon_orderId_fkey",
          columns: [
            "orderId",
          ],
          references: {
            schema: "public",
            table: "Order",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrderCoupon",
        foreignKey: {
          name: "OrderCoupon_couponId_fkey",
          columns: [
            "couponId",
          ],
          references: {
            schema: "public",
            table: "Coupon",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrderEvent",
        foreignKey: {
          name: "OrderEvent_orderId_fkey",
          columns: [
            "orderId",
          ],
          references: {
            schema: "public",
            table: "Order",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrderEvent",
        foreignKey: {
          name: "OrderEvent_actorId_fkey",
          columns: [
            "actorId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrderItem",
        foreignKey: {
          name: "OrderItem_orderId_fkey",
          columns: [
            "orderId",
          ],
          references: {
            schema: "public",
            table: "Order",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrderItem",
        foreignKey: {
          name: "OrderItem_productId_fkey",
          columns: [
            "productId",
          ],
          references: {
            schema: "public",
            table: "Product",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "OrderItem",
        foreignKey: {
          name: "OrderItem_variantId_fkey",
          columns: [
            "variantId",
          ],
          references: {
            schema: "public",
            table: "ProductVariant",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Page",
        foreignKey: {
          name: "Page_parentId_fkey",
          columns: [
            "parentId",
          ],
          references: {
            schema: "public",
            table: "Page",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Page",
        foreignKey: {
          name: "Page_authorId_fkey",
          columns: [
            "authorId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Page",
        foreignKey: {
          name: "Page_layoutId_fkey",
          columns: [
            "layoutId",
          ],
          references: {
            schema: "public",
            table: "PageLayout",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PageClosure",
        foreignKey: {
          name: "PageClosure_descendantId_fkey",
          columns: [
            "descendantId",
          ],
          references: {
            schema: "public",
            table: "Page",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PageClosure",
        foreignKey: {
          name: "PageClosure_ancestorId_fkey",
          columns: [
            "ancestorId",
          ],
          references: {
            schema: "public",
            table: "Page",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PageTranslation",
        foreignKey: {
          name: "PageTranslation_pageId_fkey",
          columns: [
            "pageId",
          ],
          references: {
            schema: "public",
            table: "Page",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PageTranslation",
        foreignKey: {
          name: "PageTranslation_localeId_fkey",
          columns: [
            "localeId",
          ],
          references: {
            schema: "public",
            table: "Locale",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Post",
        foreignKey: {
          name: "Post_parentId_fkey",
          columns: [
            "parentId",
          ],
          references: {
            schema: "public",
            table: "Post",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Post",
        foreignKey: {
          name: "Post_authorId_fkey",
          columns: [
            "authorId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PostClosure",
        foreignKey: {
          name: "PostClosure_descendantId_fkey",
          columns: [
            "descendantId",
          ],
          references: {
            schema: "public",
            table: "Post",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PostClosure",
        foreignKey: {
          name: "PostClosure_ancestorId_fkey",
          columns: [
            "ancestorId",
          ],
          references: {
            schema: "public",
            table: "Post",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PostTagTranslation",
        foreignKey: {
          name: "PostTagTranslation_tagId_fkey",
          columns: [
            "tagId",
          ],
          references: {
            schema: "public",
            table: "PostTag",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PostTagTranslation",
        foreignKey: {
          name: "PostTagTranslation_localeId_fkey",
          columns: [
            "localeId",
          ],
          references: {
            schema: "public",
            table: "Locale",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PostTagging",
        foreignKey: {
          name: "PostTagging_postId_fkey",
          columns: [
            "postId",
          ],
          references: {
            schema: "public",
            table: "Post",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PostTagging",
        foreignKey: {
          name: "PostTagging_tagId_fkey",
          columns: [
            "tagId",
          ],
          references: {
            schema: "public",
            table: "PostTag",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PostTranslation",
        foreignKey: {
          name: "PostTranslation_postId_fkey",
          columns: [
            "postId",
          ],
          references: {
            schema: "public",
            table: "Post",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "PostTranslation",
        foreignKey: {
          name: "PostTranslation_localeId_fkey",
          columns: [
            "localeId",
          ],
          references: {
            schema: "public",
            table: "Locale",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Product",
        foreignKey: {
          name: "Product_categoryId_fkey",
          columns: [
            "categoryId",
          ],
          references: {
            schema: "public",
            table: "ProductCategory",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Product",
        foreignKey: {
          name: "Product_createdById_fkey",
          columns: [
            "createdById",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductCategory",
        foreignKey: {
          name: "ProductCategory_parentId_fkey",
          columns: [
            "parentId",
          ],
          references: {
            schema: "public",
            table: "ProductCategory",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductCategoryTranslation",
        foreignKey: {
          name: "ProductCategoryTranslation_categoryId_fkey",
          columns: [
            "categoryId",
          ],
          references: {
            schema: "public",
            table: "ProductCategory",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductCategoryTranslation",
        foreignKey: {
          name: "ProductCategoryTranslation_localeId_fkey",
          columns: [
            "localeId",
          ],
          references: {
            schema: "public",
            table: "Locale",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductGalleryItem",
        foreignKey: {
          name: "ProductGalleryItem_productId_fkey",
          columns: [
            "productId",
          ],
          references: {
            schema: "public",
            table: "Product",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductGalleryItem",
        foreignKey: {
          name: "ProductGalleryItem_assetId_fkey",
          columns: [
            "assetId",
          ],
          references: {
            schema: "public",
            table: "Asset",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductOption",
        foreignKey: {
          name: "ProductOption_productId_fkey",
          columns: [
            "productId",
          ],
          references: {
            schema: "public",
            table: "Product",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductOptionValue",
        foreignKey: {
          name: "ProductOptionValue_optionId_fkey",
          columns: [
            "optionId",
          ],
          references: {
            schema: "public",
            table: "ProductOption",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductRating",
        foreignKey: {
          name: "ProductRating_productId_fkey",
          columns: [
            "productId",
          ],
          references: {
            schema: "public",
            table: "Product",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductRating",
        foreignKey: {
          name: "ProductRating_userId_fkey",
          columns: [
            "userId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductTranslation",
        foreignKey: {
          name: "ProductTranslation_productId_fkey",
          columns: [
            "productId",
          ],
          references: {
            schema: "public",
            table: "Product",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductTranslation",
        foreignKey: {
          name: "ProductTranslation_localeId_fkey",
          columns: [
            "localeId",
          ],
          references: {
            schema: "public",
            table: "Locale",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductVariant",
        foreignKey: {
          name: "ProductVariant_productId_fkey",
          columns: [
            "productId",
          ],
          references: {
            schema: "public",
            table: "Product",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductVariantValue",
        foreignKey: {
          name: "ProductVariantValue_variantId_fkey",
          columns: [
            "variantId",
          ],
          references: {
            schema: "public",
            table: "ProductVariant",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductVariantValue",
        foreignKey: {
          name: "ProductVariantValue_optionId_fkey",
          columns: [
            "optionId",
          ],
          references: {
            schema: "public",
            table: "ProductOption",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "ProductVariantValue",
        foreignKey: {
          name: "ProductVariantValue_valueId_fkey",
          columns: [
            "valueId",
          ],
          references: {
            schema: "public",
            table: "ProductOptionValue",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "Region",
        foreignKey: {
          name: "Region_parentId_fkey",
          columns: [
            "parentId",
          ],
          references: {
            schema: "public",
            table: "Region",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "RolePermission",
        foreignKey: {
          name: "RolePermission_roleId_fkey",
          columns: [
            "roleId",
          ],
          references: {
            schema: "public",
            table: "Role",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "RolePermission",
        foreignKey: {
          name: "RolePermission_permissionId_fkey",
          columns: [
            "permissionId",
          ],
          references: {
            schema: "public",
            table: "Permission",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "User",
        foreignKey: {
          name: "User_localeId_fkey",
          columns: [
            "localeId",
          ],
          references: {
            schema: "public",
            table: "Locale",
            columns: [
              "id",
            ],
          },
          onDelete: "setNull",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "User",
        foreignKey: {
          name: "User_roleId_fkey",
          columns: [
            "roleId",
          ],
          references: {
            schema: "public",
            table: "Role",
            columns: [
              "id",
            ],
          },
          onDelete: "restrict",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "UserIdentity",
        foreignKey: {
          name: "UserIdentity_userId_fkey",
          columns: [
            "userId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "UserSession",
        foreignKey: {
          name: "UserSession_userId_fkey",
          columns: [
            "userId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "WishlistItem",
        foreignKey: {
          name: "WishlistItem_userId_fkey",
          columns: [
            "userId",
          ],
          references: {
            schema: "public",
            table: "User",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
      this.addForeignKey({
        schema: "public",
        table: "WishlistItem",
        foreignKey: {
          name: "WishlistItem_productId_fkey",
          columns: [
            "productId",
          ],
          references: {
            schema: "public",
            table: "Product",
            columns: [
              "id",
            ],
          },
          onDelete: "cascade",
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
