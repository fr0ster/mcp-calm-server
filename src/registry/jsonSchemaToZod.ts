import { z } from 'zod';

export type ZodShape = Record<string, z.ZodTypeAny>;

interface IJsonSchemaProp {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: IJsonSchemaProp;
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

interface IJsonSchemaObject {
  type?: 'object';
  properties?: Record<string, IJsonSchemaProp>;
  required?: string[];
}

/**
 * Minimal JSON Schema → Zod raw shape converter. Covers the shapes our
 * Cloud ALM tools use: `{ type, properties: { field: { type, enum?,
 * items?, minimum?, maximum?, description? } }, required: [...] }`.
 *
 * Not a full JSON-Schema implementation — anyOf/allOf/oneOf, refs,
 * patternProperties, etc. are out of scope. Extend here when a tool
 * needs them.
 */
export function jsonSchemaToZodShape(
  schema: Record<string, unknown>,
): ZodShape {
  const obj = schema as unknown as IJsonSchemaObject;
  const properties = obj.properties ?? {};
  const required = new Set(obj.required ?? []);
  const shape: ZodShape = {};

  for (const [key, prop] of Object.entries(properties)) {
    let zodType = propToZod(prop);
    if (prop.description) zodType = zodType.describe(prop.description);
    if (!required.has(key)) zodType = zodType.optional();
    shape[key] = zodType;
  }
  return shape;
}

function propToZod(prop: IJsonSchemaProp): z.ZodTypeAny {
  switch (prop.type) {
    case 'string': {
      if (prop.enum && prop.enum.length > 0) {
        const values = prop.enum.map(String);
        if (values.length === 1) return z.literal(values[0]);
        return z.enum(values as [string, ...string[]]);
      }
      return z.string();
    }
    case 'integer':
    case 'number': {
      let n = prop.type === 'integer' ? z.number().int() : z.number();
      if (prop.minimum !== undefined) n = n.min(prop.minimum);
      if (prop.maximum !== undefined) n = n.max(prop.maximum);
      return n;
    }
    case 'boolean':
      return z.boolean();
    case 'array':
      return z.array(prop.items ? propToZod(prop.items) : z.unknown());
    default:
      return z.unknown();
  }
}
