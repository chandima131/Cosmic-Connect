import { useEffect } from 'react';
import type { Job } from '../types';
export function JobMetadata({ job }: { job: Job }) {
  useEffect(() => {
    document.title = `${job.title} in ${job.location} | Cosmic Connect`;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', job.description.slice(0, 160));
    document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute('content', document.title);
    document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.setAttribute('content', job.description.slice(0, 160));
  }, [job]);
  return null;
}
