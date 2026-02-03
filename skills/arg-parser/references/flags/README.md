# Flags

Flag definitions, types, and validation.

## Flag Types

- `String` / `"string"` - Text values
- `Number` / `"number"` - Numeric values
- `Boolean` / `"boolean"` - True/false flags
- `Array` / `"array"` - Multiple values
- `Object` / `"object"` - Structured data
- `Zod Schema` - Runtime validation

## Flag Properties

- `name` - Output property name
- `options` - CLI flags (e.g., ["-v", "--verbose"])
- `type` - Data type
- `mandatory` - Required flag
- `defaultValue` - Default if not provided
- `description` - Help text
- `validate` - Custom validation function

## Example

```typescript
{
  name: "config",
  options: ["--config", "-c"],
  type: z.object({ host: z.string() }),
  mandatory: true,
  description: "Configuration object",
  validate: (val) => val.host ? true : "Host required"
}
```

See main SKILL.md for flag patterns.
