import { z } from 'zod'; const schema = z.object({ birth_date: z.string().nullish().transform(v => v === '' ? null : v) }); console.log(JSON.stringify(schema.safeParse({ birth_date: null })));
