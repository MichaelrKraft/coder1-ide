import { redirect } from 'next/navigation';

// The Timeline page was renamed to Memory. This stub preserves existing bookmarks and links.
export default function TimelineLegacyRedirect() {
  redirect('/memory');
}
