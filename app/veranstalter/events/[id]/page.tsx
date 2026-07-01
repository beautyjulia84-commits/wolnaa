'use client';

import { useParams } from 'next/navigation';
import VeranstalterEventForm from '@/components/veranstalter/EventForm';

export default function EventBearbeiten() {
  const params = useParams();
  return <VeranstalterEventForm eventId={params.id as string} />;
}
