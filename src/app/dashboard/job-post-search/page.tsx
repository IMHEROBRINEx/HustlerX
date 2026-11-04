import { redirect } from 'next/navigation';

export default function DashboardJobPostSearchRoute() {
  redirect('/dashboard?tab=job-post-search');
}