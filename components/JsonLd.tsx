// ฝัง structured data (JSON-LD) ลงในหน้า — เนื้อหาอยู่ใน HTML ตั้งแต่ SSR
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
