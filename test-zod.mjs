import { z } from 'zod';
const patientSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email().nullish().or(z.literal('')),
  phone: z.string().nullish(),
  birth_date: z.string().nullish().transform(v => v === '' ? null : v),
  gender: z.enum(['male', 'female', 'other', 'unspecified']).optional(),
  document: z.string().nullish(),
  address: z.string().nullish(),
  emergency_contact: z.string().nullish(),
  main_complaint: z.string().nullish(),
  medical_history: z.string().nullish(),
  allergies: z.string().nullish(),
  medications: z.string().nullish(),
  notes: z.string().nullish(),
  active: z.boolean().optional(),
  profile_id: z.string().uuid().nullish(),
});
console.log(JSON.stringify(patientSchema.partial().safeParse({ 
  birth_date: '', 
  email: '', 
  full_name: 'test', 
  treatments: [] 
}), null, 2));
