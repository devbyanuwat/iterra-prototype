// ค้นหาในเว็บ: ดัชนีสร้างในเบราว์เซอร์จากข้อมูลที่มีอยู่แล้ว (เว็บเป็น static export ไม่มี server)
// ไฟล์นี้ไม่มี import เพื่อให้ scripts/check-search.mjs รันด้วย Node ได้
// ponytail: จับคู่แบบ substring ไล่ทุกรายการ พอสำหรับหลักร้อยรายการ · เกินนั้นค่อยทำดัชนีแบบ token

export type Name = { th: string; en: string };
export type Group = 'products' | 'articles' | 'projects' | 'pages';
export type Entry = { group: Group; href: string; title: Name; text: string };
export type Sources = {
  products: { slug: string; name: Name; series: string; category: string }[];
  posts: { slug: string; title: Name; excerpt: Name }[];
  projects: { slug: string; name: Name; location: Name; type: Name }[];
  pages: { href: string; title: Name }[];
};

export const GROUPS: Group[] = ['products', 'articles', 'projects', 'pages'];

const both = (n: Name) => `${n.th} ${n.en}`;

export function buildIndex(s: Sources): Entry[] {
  return [
    ...s.products.map((p): Entry => ({ group: 'products', href: `/products/${p.slug}/`, title: p.name, text: `${p.series} ${p.category} kohler` })),
    ...s.posts.map((p): Entry => ({ group: 'articles', href: `/articles/${p.slug}/`, title: p.title, text: both(p.excerpt) })),
    ...s.projects.map((p): Entry => ({ group: 'projects', href: `/projects/#${p.slug}`, title: p.name, text: `${both(p.location)} ${both(p.type)}` })),
    ...s.pages.map((p): Entry => ({ group: 'pages', href: p.href, title: p.title, text: '' })),
  ];
}

// ทุกคำในคำค้นต้องเจอ · ผลที่ตรงชื่อมาก่อนผลที่ตรงแค่เนื้อหา · ไม่เกิน perGroup รายการต่อกลุ่ม
export function search(index: Entry[], query: string, perGroup = 6): Entry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: Entry[] = [];
  for (const group of GROUPS) {
    const inTitle: Entry[] = [];
    const inText: Entry[] = [];
    for (const e of index) {
      if (e.group !== group) continue;
      const title = both(e.title).toLowerCase();
      const all = `${title} ${e.text.toLowerCase()}`;
      if (!words.every((w) => all.includes(w))) continue;
      (words.every((w) => title.includes(w)) ? inTitle : inText).push(e);
    }
    out.push(...[...inTitle, ...inText].slice(0, perGroup));
  }
  return out;
}
