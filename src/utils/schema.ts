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

export const OptionalNullable = (schema: TSchema) =>
  t.Optional(t.Nullable(schema))
