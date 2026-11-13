// Minimal JSON Schema (2020-12) validator for the keywords used by Codokey's
// published schemas. It THROWS on any keyword it does not implement, so a
// schema can never contain a rule this validator silently ignores.
// CI additionally validates with Ajv (tests/ajv-crosscheck.mjs) as an
// independent implementation.
const SUPPORTED = new Set(['$schema', '$id', 'title', 'description', 'type', 'properties', 'required', 'additionalProperties',
  'enum', 'const', 'items', 'minItems', 'maxItems', 'uniqueItems', 'minimum', 'maximum', 'minLength', 'format']);
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;

const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function assertSupported(schema, path = '#') {
  if (typeof schema !== 'object' || schema === null) return;
  for (const k of Object.keys(schema)) if (!SUPPORTED.has(k)) throw new Error(`unsupported keyword "${k}" at ${path}`);
  if (schema.properties) for (const [k, s] of Object.entries(schema.properties)) assertSupported(s, `${path}/properties/${k}`);
  if (schema.items) assertSupported(schema.items, `${path}/items`);
}

export function validate(schema, value, path = '$', errors = []) {
  const t = typeOf(value);
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some(x => x === t || (x === 'number' && t === 'integer'))) errors.push(`${path}: expected ${types.join('|')}, got ${t}`);
  }
  if ('const' in schema && !eq(schema.const, value)) errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some(e => eq(e, value))) errors.push(`${path}: ${JSON.stringify(value)} not in enum`);
  if (t === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.format === 'date-time' && (!RFC3339.test(value) || Number.isNaN(Date.parse(value)))) errors.push(`${path}: not RFC 3339 date-time`);
  }
  if (t === 'integer' || t === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: < ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: > ${schema.maximum}`);
  }
  if (t === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: more than ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) errors.push(`${path}: items not unique`);
    if (schema.items) value.forEach((v, i) => validate(schema.items, v, `${path}[${i}]`, errors));
  }
  if (t === 'object') {
    for (const r of schema.required || []) if (!(r in value)) errors.push(`${path}: missing ${r}`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && k in schema.properties) validate(schema.properties[k], v, `${path}.${k}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property ${k}`);
    }
  }
  return errors;
}
