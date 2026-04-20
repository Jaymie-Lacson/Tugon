import { z } from 'zod';

export const incidentReportSchema = z.object({
  incidentType: z.enum(['Pollution', 'Noise', 'Crime', 'Road Hazard', 'Other']),
  latitude: z.number(),
  longitude: z.number(),
  description: z.string().min(10, 'Please describe the incident in more detail'),
  barangayId: z.string().uuid('Invalid barangay'),
});

export type IncidentReportInput = z.infer<typeof incidentReportSchema>;
