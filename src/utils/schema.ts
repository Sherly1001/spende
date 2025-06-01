import { t, TSchema } from 'elysia'

export const schemaOptions = {
  timestamps: true as const,
  toJSON: {
    versionKey: false as const,
    flattenObjectIds: true as const,
    schemaFieldsOnly: true as const,
  },
}

export const timestampsSchema = t.Object({
  createdAt: t.Date(),
  updatedAt: t.Date(),
})

export const objectIdSchema = t.String({
  pattern: '^[0-9a-fA-F]{24}$',
  description: 'MongoDB ObjectId',
})

export const cssColorSchema = t.String({
  pattern:
    '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$|^rgb\\((\\s*\\d+\\s*,){2}\\s*\\d+\\s*\\)$|^rgba\\((\\s*\\d+\\s*,){3}\\s*(0|1|0?\\.\\d+)\\s*\\)$|^hsl\\((\\s*\\d+\\s*,){2}\\s*\\d+%\\s*\\)$|^[a-zA-Z]+$',
  description: 'CSS color string (hex, rgb, rgba, hsl, or named color)',
})

export const OptionalNullable = (schema: TSchema) =>
  t.Optional(t.Nullable(schema))
