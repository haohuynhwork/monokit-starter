import { applyDecorators } from "@nestjs/common";
import {
  ApiBody,
  ApiOkResponse,
  ApiQuery,
  ApiResponse,
  type ApiResponseOptions,
} from "@nestjs/swagger";
import { z } from "zod";

// SchemaObject is not exported by @nestjs/swagger; the parts used here
interface SchemaObject {
  required?: string[];
  properties?: Record<string, SchemaObject>;
  [key: string]: unknown;
}

// Zod schemas are the single source for validation and docs

const toSchema = (schema: z.ZodType, io: "input" | "output") =>
  z.toJSONSchema(schema, {
    target: "openapi-3.0",
    io,
  }) as SchemaObject;

export const ApiZodBody = (schema: z.ZodType) =>
  ApiBody({
    schema: toSchema(schema, "input"),
  });

// One query parameter per top-level field of an object schema
export const ApiZodQuery = (schema: z.ZodObject) => {
  const json = toSchema(schema, "input");
  const required = new Set(json.required ?? []);
  return applyDecorators(
    ...Object.entries(json.properties ?? {}).map(([name, property]) =>
      ApiQuery({
        name,
        required: required.has(name),
        schema: property,
      }),
    ),
  );
};

// Docs-only mirrors of the @packages/contracts response types
const apiSuccessSchema = (data: z.ZodType) =>
  z.object({
    status: z.literal("success"),
    data,
  });

const apiFailSchema = z.object({
  status: z.literal("fail"),
  code: z.string(),
  message: z.string(),
  data: z
    .object({
      issues: z.array(
        z.object({
          path: z.string(),
          message: z.string(),
        }),
      ),
    })
    .optional()
    .meta({
      description: "Per-field issues, for validation failures",
    }),
});

// `schema` is the data; documented inside the success envelope
export const ApiZodResponse = (
  schema: z.ZodType,
  options: Omit<ApiResponseOptions, "schema"> = {},
) => {
  const body = toSchema(apiSuccessSchema(schema), "output");
  return "status" in options
    ? ApiResponse({
        ...options,
        schema: body,
      })
    : ApiOkResponse({
        ...options,
        schema: body,
      });
};

// `schema` is one item; documented as a page inside the success envelope
export const ApiZodPaginatedResponse = (schema: z.ZodType) =>
  ApiOkResponse({
    schema: toSchema(
      apiSuccessSchema(z.array(schema)).extend({
        meta: z.object({
          total: z.number().int(),
          limit: z.number().int(),
          offset: z.number().int(),
        }),
      }),
      "output",
    ),
  });

// A 4xx documented as a `fail` body
export const ApiFailResponse = (status: number, description: string) =>
  ApiResponse({
    status,
    description,
    schema: toSchema(apiFailSchema, "output"),
  });
