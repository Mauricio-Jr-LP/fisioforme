import { z } from 'zod'; const schema = z.object({ gender: z.enum(['male', 'female', 'other', 'unspecified']).optional() }); console.log(JSON.stringify(schema.safeParse({ gender: null })));
