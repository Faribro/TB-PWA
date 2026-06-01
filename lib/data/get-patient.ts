import { prisma } from '@/lib/prisma';

export async function getPatientByUuid(kobo_uuid: string) {
  const patient = await prisma.patients.findUnique({
    where: { kobo_uuid }
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  return patient;
}

export async function getPatientById(id: string) {
  const patient = await prisma.patients.findUnique({
    where: { id }
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  return patient;
}
