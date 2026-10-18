import type { Metadata } from 'next';
import PostsAdmin from '@/components/admin/PostsAdmin';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';
import { listAdminPosts } from '@/lib/server/posts';

export const metadata: Metadata = { title: 'บทความ' };

export default async function AdminArticlesPage() {
  await requireAdmin();
  return <PostsAdmin posts={await listAdminPosts(db)} />;
}
