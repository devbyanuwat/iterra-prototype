#!/usr/bin/env node
/**
 * Turns the scraped Scene7 lifestyle photography into lib/lifestyle.generated.ts.
 *
 * Run scripts/scrape-lifestyle.mjs first — this reads its manifest.json out of
 * the same cache directory.
 *
 * Three things happen here that the scraper deliberately does not do:
 *
 * 1. Curation. CATALOG below is hand-authored from a visual pass over every
 *    downloaded asset (contact sheets, not filenames). Anything that turned out
 *    to be a cut-out product on a plain studio background is listed in DROPPED
 *    and never reaches the site — the product grid already has 306 of those.
 * 2. Trimming. Many Scene7 banner assets are a small photo centred on a wide
 *    white canvas, so a raw 1800x353 file is ~75% padding. The white border is
 *    trimmed before the webp variants are written, and the recorded
 *    width/height/aspect describe the trimmed photo, not the canvas.
 * 3. Alt text. Both languages are written per image from what is actually in
 *    the frame; the asset codes (zab82163_rgb) carry no meaning on their own.
 *
 * Usage: node scripts/build-lifestyle.mjs [cacheDir]
 */
import { mkdir, readFile, writeFile, stat, rm } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'lifestyle')
const TS_OUT = path.join(ROOT, 'lib', 'lifestyle.generated.ts')
const WIDTHS = [1800, 900]

/** Cut-outs / studio product shots. Kept out of the site on purpose. */
const DROPPED = {
  '01-below-600-updated': 'cut-out basin with a dimension diagram',
  '01-single-bowl': 'cut-out kitchen sink on white',
  '02-750mm-updated': 'cut-out basin with a dimension diagram',
  '02-double-equal-bowls': 'cut-out kitchen sink on white',
  '03-900mm-updated': 'cut-out basin with a dimension diagram',
  '03-off-set-bowls': 'cut-out kitchen sink on white',
  '04-above-1050-updated': 'cut-out basin with a dimension diagram',
  '07-shower-fittings': 'cut-out shower fittings on white',
  'aad37069-rgb': 'cut-out shower trim on white',
  'aad74534-rgb': 'cut-out bidet seat on white',
  'aad82078-rgb': 'cut-out grab bar on white',
  'aae01583-rgb': 'cut-out washbasin on white',
  'zaa81538-rgb': 'cut-out bath on white',
  'hero-template': 'blank "NEW" hero template with a cut-out sink',
  'it-landing-page-secondary-banner-460x353': 'row of cut-out toilets on a studio backdrop',
  'th-e-shop-grand-opening-banner-v2': 'studio product still-life on a painted backdrop',
  'gcs-statement-anthems-1905x640px-01': 'studio product shot with baked-in marketing copy',
}

/**
 * id: [category, space, altEn, altTh]
 *
 * category
 *   room    - a finished interior, no people in frame
 *   detail  - a fixture photographed installed in a real setting
 *   people  - a person or hands using a fixture
 *   project - a hotel, resort or other commercial installation
 *   retail  - a showroom or store front
 *   promo   - photography that carries baked-in marketing text or a logo
 */
const CATALOG = {
  '01-poise-3880': ['detail', 'kitchen', 'Poise stainless steel kitchen sink set into a wood countertop', 'อ่างล้างจานสเตนเลส Poise ติดตั้งบนเคาน์เตอร์ครัวไม้'],
  '02-handshower': ['people', 'bath', 'A hand holding a running handshower against grey tile', 'มือถือฝักบัวสายอ่อนที่กำลังปล่อยน้ำหน้าผนังกระเบื้องสีเทา'],
  '02-stainless-steel': ['detail', 'kitchen', 'Stainless steel kitchen sink with a chopping board and lemons', 'อ่างล้างจานสเตนเลสพร้อมเขียงและมะนาวบนเคาน์เตอร์ครัว'],
  '03-under-mount': ['detail', 'kitchen', 'Undermount kitchen sink in a dark stone countertop', 'อ่างล้างจานแบบฝังใต้เคาน์เตอร์หินสีเข้ม'],
  '05-shower-doors': ['detail', 'bath', 'Glass shower door against blue-green mosaic tile', 'ประตูอาบน้ำกระจกหน้าผนังกระเบื้องโมเสกสีเขียวอมฟ้า'],
  '2022-most-innovative-bathroom-products-moxie-numi-gcs-secondary-banner-290-x-232': ['people', 'bath', 'A woman adjusting a digital shower control in a stone shower', 'ผู้หญิงกำลังปรับแผงควบคุมฝักบัวดิจิทัลในห้องอาบน้ำผนังหิน'],
  'aaa60312-rgb': ['room', 'bath', 'A toilet against green wall panelling above a dark wood floor', 'สุขภัณฑ์ตั้งพื้นหน้าผนังไม้บุสีเขียวบนพื้นไม้สีเข้ม'],
  'aaa68056-rgb': ['room', 'bath', 'Classic bathroom with a console basin and full-length curtains', 'ห้องน้ำสไตล์คลาสสิกพร้อมอ่างล้างหน้าแบบคอนโซลและผ้าม่านยาว'],
  'aaa68094-rgb': ['room', 'bath', 'Bathroom with a drop-in bath, chandelier and green panelling', 'ห้องน้ำพร้อมอ่างอาบน้ำแบบฝัง โคมระย้า และผนังไม้บุสีเขียว'],
  'aaa80571-1800x800': ['room', 'bath', 'Double vanity with two basins against white panelling', 'เคาน์เตอร์อ่างล้างหน้าคู่หน้าผนังไม้บุสีขาว'],
  'aaa88333-rgb': ['room', 'bath', 'Whirlpool bath set into a walnut surround', 'อ่างน้ำวนติดตั้งในกรอบไม้วอลนัท'],
  'aab14759': ['detail', 'bath', 'A white vessel basin on a counter against a deep pink wall', 'อ่างล้างหน้าแบบวางบนเคาน์เตอร์หน้าผนังสีชมพูเข้ม'],
  'aab15367-rgb': ['room', 'bath', 'Modern bathroom with a wet room and a long vanity', 'ห้องน้ำสมัยใหม่พร้อมโซนเปียกและเคาน์เตอร์อ่างล้างหน้าแบบยาว'],
  'aab18535-43': ['room', 'bath', 'Freestanding bath and twin pedestal basins against patterned wallpaper', 'อ่างอาบน้ำลอยตัวและอ่างล้างหน้าขาตั้งคู่หน้าผนังวอลเปเปอร์ลายกราฟิก'],
  'acrylic': ['room', 'bath', 'White freestanding acrylic bath in a black-walled bathroom', 'อ่างอาบน้ำอะคริลิกลอยตัวสีขาวในห้องน้ำผนังสีดำ'],
  'aleo-shower-column-97821': ['detail', 'bath', 'Aleo shower column running against a yellow wall', 'ชุดเสาฝักบัว Aleo กำลังปล่อยน้ำหน้าผนังสีเหลือง'],
  'aleutian-01': ['people', 'bath', 'An adult and a child playing at a filled bath', 'ผู้ใหญ่และเด็กเล่นน้ำที่ขอบอ่างอาบน้ำ'],
  'aleutian-02': ['people', 'bath', 'An adult and a child on a rug in a bright bathroom', 'ผู้ใหญ่และเด็กบนพรมในห้องน้ำโปร่งสว่าง'],
  'bancroft-01': ['room', 'bath', 'Yellow-tiled classic bathroom with pedestal basins', 'ห้องน้ำคลาสสิกกรุกระเบื้องสีเหลืองพร้อมอ่างล้างหน้าขาตั้ง'],
  'bancroft-02': ['room', 'bath', 'Classic toilet in a yellow bathroom with white trim', 'สุขภัณฑ์สไตล์คลาสสิกในห้องน้ำสีเหลืองขอบบัวสีขาว'],
  'bancroft-03': ['room', 'bath', 'Whirlpool bath in a yellow tiled bathroom', 'อ่างน้ำวนในห้องน้ำกรุกระเบื้องสีเหลือง'],
  'bathtub': ['room', 'bath', 'Black freestanding bath by a window with a city view', 'อ่างอาบน้ำลอยตัวสีดำริมหน้าต่างที่มองเห็นวิวเมือง'],
  'bbb18895-43': ['room', 'bath', 'Drop-in bath set into blue mosaic tile', 'อ่างอาบน้ำแบบฝังในขอบกระเบื้องโมเสกสีฟ้า'],
  'brazn-landing-page-secondary-banner-460x353': ['room', 'bath', 'Modern bathroom with a black toilet and a freestanding bath', 'ห้องน้ำสมัยใหม่พร้อมสุขภัณฑ์สีดำและอ่างอาบน้ำลอยตัว'],
  'capri-by-fraser-brisbane-00': ['project', 'bath', 'Guest bathroom at Capri by Fraser, Brisbane', 'ห้องน้ำในห้องพักโรงแรม Capri by Fraser บริสเบน'],
  'ccc12361-43': ['detail', 'bath', 'Oval drop-in basin in a dark green vanity top', 'อ่างล้างหน้าทรงรีแบบฝังบนเคาน์เตอร์สีเขียวเข้ม'],
  'classical': ['room', 'kitchen', 'White classical kitchen with an island and a range', 'ครัวสไตล์คลาสสิกสีขาวพร้อมเคาน์เตอร์กลางและเตา'],
  'contemporary-kitchen-style': ['room', 'kitchen', 'Dark contemporary kitchen open to a living area', 'ครัวสไตล์โมเดิร์นโทนเข้มเปิดต่อเนื่องกับพื้นที่นั่งเล่น'],
  'crown-towers-perth-00': ['project', 'bath', 'Suite bathroom at Crown Towers, Perth, with a city view', 'ห้องน้ำในห้องสวีทโรงแรม Crown Towers เพิร์ท พร้อมวิวเมือง'],
  'exhale': ['detail', 'bath', 'Exhale showerhead mounted on dark stone tile', 'ฝักบัว Exhale ติดตั้งบนผนังกระเบื้องหินสีเข้ม'],
  'flc-luxury-resort-quinhon-00': ['project', 'bath', 'Guest bathroom at FLC Luxury Resort, Quy Nhon', 'ห้องน้ำในห้องพัก FLC Luxury Resort กวีเญิน'],
  'forefront-01': ['room', 'bath', 'Bath in a wood surround beside a fireplace', 'อ่างอาบน้ำในกรอบไม้ข้างเตาผิง'],
  'forefront-02': ['detail', 'bath', 'Wall-mounted washbasin over a wood vanity unit', 'อ่างล้างหน้าแบบแขวนผนังเหนือตู้ไม้'],
  'forefront-03': ['detail', 'bath', 'Vanity unit with an open storage drawer', 'ตู้อ่างล้างหน้าพร้อมลิ้นชักจัดเก็บที่เปิดอยู่'],
  'fullerton-article-output-banner': ['project', 'other', 'Aerial view of the Fullerton hotel and its pool deck', 'ภาพมุมสูงของโรงแรม Fullerton และสระว่ายน้ำ'],
  'gcs-aae09079-rgb-980x551px': ['people', 'bath', 'A woman stepping into a travertine shower beside a bedroom', 'ผู้หญิงกำลังเดินเข้าห้องอาบน้ำผนังหินทรเวอร์ทีนที่ต่อกับห้องนอน'],
  'hotel-des-arts-hochiminh-00': ['project', 'bath', 'Guest bathroom at Hotel des Arts, Ho Chi Minh City', 'ห้องน้ำในห้องพัก Hotel des Arts โฮจิมินห์'],
  'hotel-indigo-bangkok-00': ['project', 'bath', 'Yellow-tiled bathroom with gold basins at Hotel Indigo, Bangkok', 'ห้องน้ำกรุกระเบื้องสีเหลืองพร้อมอ่างล้างหน้าสีทองที่ Hotel Indigo กรุงเทพฯ'],
  'karess-01': ['people', 'bath', 'A woman in a white dress in a sculpted blue bathroom', 'ผู้หญิงในชุดสีขาวในห้องน้ำโทนน้ำเงินดีไซน์โค้ง'],
  'karess-02': ['room', 'bath', 'Sculpted blue bathroom set with a basin and toilet', 'เซ็ตห้องน้ำโทนน้ำเงินดีไซน์โค้งพร้อมอ่างล้างหน้าและสุขภัณฑ์'],
  'karess-03': ['people', 'bath', 'A woman beside a basin in a sculpted blue bathroom', 'ผู้หญิงยืนข้างอ่างล้างหน้าในห้องน้ำโทนน้ำเงินดีไซน์โค้ง'],
  'kohler-room4-interactive-lightmix-460-x-353-03-reduse-noise': ['room', 'bath', 'Bright bathroom with a chandelier and a freestanding bath', 'ห้องน้ำโปร่งสว่างพร้อมโคมระย้าและอ่างอาบน้ำลอยตัว'],
  'kohler-service-solution-website-primary-banner-2021': ['promo', 'bath', 'Kohler Service Solutions banner: a technician servicing a basin', 'แบนเนอร์ Kohler Service Solutions ภาพช่างกำลังบริการอ่างล้างหน้า'],
  'kss-thai-web-secondary-banner': ['people', 'bath', 'Hands tightening a basin faucet with a wrench', 'มือช่างกำลังขันก๊อกอ่างล้างหน้าด้วยประแจ'],
  'lithoscat': ['room', 'bath', 'White freestanding bath on patterned hexagon tile', 'อ่างอาบน้ำลอยตัวสีขาวบนพื้นกระเบื้องหกเหลี่ยมลายกราฟิก'],
  'malleco-article-image-460x353-01': ['people', 'kitchen', 'A woman preparing food at a kitchen sink', 'ผู้หญิงกำลังเตรียมอาหารที่อ่างล้างจานในครัว'],
  'maxispace-01': ['room', 'bath', 'Compact bathroom with a mirror cabinet standing open', 'ห้องน้ำขนาดกะทัดรัดพร้อมตู้กระจกที่เปิดอยู่'],
  'maxispace-03a': ['room', 'bath', 'Compact bathroom with a vanity, toilet and walk-in shower', 'ห้องน้ำขนาดกะทัดรัดพร้อมตู้อ่างล้างหน้า สุขภัณฑ์ และห้องอาบน้ำ'],
  'maxispace-03b': ['room', 'bath', 'Compact bathroom under a wood ceiling with a skylight', 'ห้องน้ำขนาดกะทัดรัดใต้ฝ้าไม้พร้อมช่องแสงบนหลังคา'],
  'maxispace-secondary-banner-290x232': ['room', 'bath', 'Bathroom with a pink arched alcove and a mirror cabinet', 'ห้องน้ำพร้อมซุ้มโค้งสีชมพูและตู้กระจก'],
  'modulo-bath-and-shower-trim-78024': ['detail', 'bath', 'Black Modulo bath and shower trim on grey tile', 'ชุดวาล์วอ่างและฝักบัว Modulo สีดำบนผนังกระเบื้องสีเทา'],
  'moxie-secondary-banner-460x353': ['detail', 'bath', 'A Moxie speaker and faucet on a dark stone counter', 'ลำโพง Moxie และก๊อกน้ำบนเคาน์เตอร์หินสีเข้ม'],
  'mulu-marriott-resort-spa-sarawak-00': ['project', 'bath', 'Twin oval mirrors and pedestal basins at Mulu Marriott Resort, Sarawak', 'กระจกทรงรีคู่และอ่างล้างหน้าขาตั้งที่ Mulu Marriott Resort ซาราวัก'],
  'new-mobile-webbannersg-04': ['promo', 'bath', 'Statement and Anthem collections campaign banner', 'แบนเนอร์แคมเปญคอลเลกชัน Statement และ Anthem'],
  'new-mobile-webbannerth-04': ['promo', 'bath', 'Kohler Service Solutions campaign banner in Thai', 'แบนเนอร์แคมเปญ Kohler Service Solutions ภาษาไทย'],
  'ove-01': ['room', 'bath', 'Bathroom with a wood feature wall and twin basins', 'ห้องน้ำผนังไม้พร้อมอ่างล้างหน้าคู่'],
  'ove-02': ['room', 'bath', 'Toilet and open shelving in a softly lit bathroom', 'สุขภัณฑ์และชั้นวางในห้องน้ำแสงนุ่ม'],
  'pedestal-2': ['detail', 'bath', 'White pedestal basin against black penny tile', 'อ่างล้างหน้าขาตั้งสีขาวหน้าผนังกระเบื้องกลมสีดำ'],
  'portrait-01': ['room', 'bath', 'Classic bathroom with a whirlpool bath and a pedestal basin', 'ห้องน้ำคลาสสิกพร้อมอ่างน้ำวนและอ่างล้างหน้าขาตั้ง'],
  'portrait-02': ['detail', 'bath', 'Drop-in basin and faucet below a framed mirror', 'อ่างล้างหน้าแบบฝังและก๊อกน้ำใต้กระจกกรอบไม้'],
  'prologue': ['detail', 'kitchen', 'Stainless kitchen sink with a colander of asparagus', 'อ่างล้างจานสเตนเลสพร้อมตะแกรงหน่อไม้ฝรั่ง'],
  'rectangle-square': ['detail', 'bath', 'Rectangular washbasin on a marble countertop', 'อ่างล้างหน้าทรงเหลี่ยมบนเคาน์เตอร์หินอ่อน'],
  'rev-360-new-webbanner-1905x640': ['promo', 'bath', 'Revolution 360 flushing technology campaign banner', 'แบนเนอร์แคมเปญเทคโนโลยีการชำระล้าง Revolution 360'],
  'rev-360-webbanner-600x800': ['promo', 'bath', 'Revolution 360 flushing technology campaign banner, portrait crop', 'แบนเนอร์แคมเปญ Revolution 360 สัดส่วนแนวตั้ง'],
  'secandary-banner-rev360': ['people', 'bath', 'A mother helping a child wash their hands at a basin', 'แม่ช่วยลูกล้างมือที่อ่างล้างหน้า'],
  'seconarybanner-statement-suit': ['promo', 'other', 'Moonlight Chamber virtual suite title card over a night landscape', 'การ์ดหัวเรื่อง Moonlight Chamber virtual suite บนภาพทิวทัศน์กลางคืน'],
  'self-rimming': ['detail', 'bath', 'Self-rimming basin dropped into a pale countertop', 'อ่างล้างหน้าแบบวางบนเคาน์เตอร์สีอ่อน'],
  'sofitel-bali-nusa-dua-beach-resort-bali-00': ['project', 'bath', 'Guest bathroom at Sofitel Bali Nusa Dua Beach Resort', 'ห้องน้ำในห้องพัก Sofitel Bali Nusa Dua Beach Resort'],
  'solaire-resort-casino-manila-00': ['project', 'bath', 'Row of marble vanities at Solaire Resort & Casino, Manila', 'แถวเคาน์เตอร์อ่างล้างหน้าหินอ่อนที่ Solaire Resort & Casino มะนิลา'],
  'th-mobile-banner-updated-new': ['promo', 'other', 'Kohler E-Shop "from inspiration to installation" banner in Thai', 'แบนเนอร์ Kohler E-Shop “จากแรงบันดาลใจสู่การติดตั้ง” ภาษาไทย'],
  'the-grand-ho-tram-strip-bariavungtau-00': ['project', 'bath', 'Guest bathroom with gold mirrors at The Grand Ho Tram Strip', 'ห้องน้ำในห้องพักพร้อมกระจกกรอบทองที่ The Grand Ho Tram Strip'],
  'the-lin-taichung-02': ['project', 'bath', 'Stone-clad bathroom with a city view at The Lin, Taichung', 'ห้องน้ำผนังหินพร้อมวิวเมืองที่โรงแรม The Lin ไถจง'],
  'transitional-kitchen-style': ['room', 'kitchen', 'Transitional kitchen with an island and glass pendants', 'ครัวสไตล์ทรานซิชันนัลพร้อมเคาน์เตอร์กลางและโคมแก้วแขวน'],
  'unique': ['detail', 'bath', 'Oval vessel basin on a marble countertop', 'อ่างล้างหน้าทรงรีแบบวางบนเคาน์เตอร์หินอ่อน'],
  'urbanity-shower-column-23861': ['detail', 'bath', 'Urbanity shower column on white herringbone tile', 'ชุดเสาฝักบัว Urbanity บนผนังกระเบื้องก้างปลาสีขาว'],
  'vanity': ['detail', 'bath', 'Washbasin on a blue vanity below a mirror cabinet', 'อ่างล้างหน้าบนตู้สีน้ำเงินใต้ตู้กระจก'],
  'visual-showroom-secondary-banner': ['retail', 'other', 'Lit Kohler showroom storefront at night', 'หน้าร้านโชว์รูม Kohler ที่เปิดไฟในเวลากลางคืน'],
  'website-banner-selling-points': ['promo', 'other', 'Kohler E-Shop service promise banner', 'แบนเนอร์บริการของ Kohler E-Shop'],
  'zaa08069-rgb': ['room', 'bath', 'Bright bathroom with a bath under a skylight', 'ห้องน้ำโปร่งสว่างพร้อมอ่างอาบน้ำใต้ช่องแสง'],
  'zaa08191-rgb': ['room', 'bath', 'Small bathroom with a vanity unit and a tall mirror', 'ห้องน้ำขนาดเล็กพร้อมตู้อ่างล้างหน้าและกระจกทรงสูง'],
  'zaa19202-43': ['people', 'bath', 'A woman in a white dress seated in an all-white bathroom set', 'ผู้หญิงในชุดสีขาวนั่งอยู่ในเซ็ตห้องน้ำโทนสีขาวทั้งห้อง'],
  'zaa19767-43': ['detail', 'bath', 'Vessel basin and gold faucet against a wood-panelled wall', 'อ่างล้างหน้าแบบวางบนเคาน์เตอร์และก๊อกสีทองหน้าผนังไม้'],
  'zaa88794-rgb': ['room', 'bath', 'Grey-tiled bathroom with a toilet and a vanity unit', 'ห้องน้ำกรุกระเบื้องสีเทาพร้อมสุขภัณฑ์และตู้อ่างล้างหน้า'],
  'zaa88796-rgb': ['room', 'bath', 'Pink bathroom with a toilet beside a bath', 'ห้องน้ำโทนสีชมพูพร้อมสุขภัณฑ์ข้างอ่างอาบน้ำ'],
  'zaa90068-rgb': ['room', 'bath', 'Grey bathroom with a console vanity and a shower curtain', 'ห้องน้ำโทนสีเทาพร้อมอ่างล้างหน้าแบบคอนโซลและม่านอาบน้ำ'],
  'zaa99845-rgb': ['room', 'bath', 'Grey bathroom with a pedestal basin and a toilet', 'ห้องน้ำโทนสีเทาพร้อมอ่างล้างหน้าขาตั้งและสุขภัณฑ์'],
  'zab21360-rgb': ['room', 'bath', 'Loft bathroom with a black vanity and a pink shower curtain', 'ห้องน้ำสไตล์ลอฟต์พร้อมตู้อ่างล้างหน้าสีดำและม่านอาบน้ำสีชมพู'],
  'zab27997-rgb': ['detail', 'kitchen', 'Stainless sink in a blue counter below chevron tile', 'อ่างล้างจานสเตนเลสบนเคาน์เตอร์สีน้ำเงินใต้ผนังกระเบื้องลายก้างปลา'],
  'zab31995-rgb': ['room', 'bath', 'Pedestal basin and toilet in a grey tiled bathroom', 'อ่างล้างหน้าขาตั้งและสุขภัณฑ์ในห้องน้ำกรุกระเบื้องสีเทา'],
  'zab42431-rgb': ['room', 'bath', 'Classic toilet against a pink wall beside a laundry basket', 'สุขภัณฑ์สไตล์คลาสสิกหน้าผนังสีชมพูข้างตะกร้าผ้า'],
  'zab57943-rgb': ['detail', 'kitchen', 'Kitchen faucet and undermount sink at a window', 'ก๊อกน้ำและอ่างล้างจานแบบฝังใต้เคาน์เตอร์ริมหน้าต่าง'],
  'zab59998-1800x800-hollywoodhills': ['room', 'kitchen', 'Open kitchen with an island and a linear chandelier', 'ครัวเปิดโล่งพร้อมเคาน์เตอร์กลางและโคมระย้าทรงยาว'],
  'zab60076-rgb': ['room', 'bath', 'Blue bathroom with a bath and a floating vanity', 'ห้องน้ำโทนสีฟ้าพร้อมอ่างอาบน้ำและตู้อ่างล้างหน้าแบบลอย'],
  'zab64028-1800x800': ['room', 'kitchen', 'White kitchen with a black faucet and globe pendants', 'ครัวสีขาวพร้อมก๊อกน้ำสีดำและโคมไฟทรงกลม'],
  'zab65968-rgb': ['room', 'bath', 'Attic bathroom with a bath below a sloped ceiling', 'ห้องน้ำใต้หลังคาลาดเอียงพร้อมอ่างอาบน้ำ'],
  'zab82163-rgb': ['room', 'bath', 'Bathroom with palm-leaf wallpaper and a pedestal basin', 'ห้องน้ำวอลเปเปอร์ลายใบปาล์มพร้อมอ่างล้างหน้าขาตั้ง'],
  'zab82168-rgb': ['room', 'bath', 'Pedestal basin and toilet on a chequerboard floor', 'อ่างล้างหน้าขาตั้งและสุขภัณฑ์บนพื้นลายตารางหมากรุก'],
  'zab82176-rgb': ['detail', 'bath', 'Close-up of a pedestal basin with cross-handle faucets', 'ภาพระยะใกล้ของอ่างล้างหน้าขาตั้งพร้อมก๊อกก้านกากบาท'],
  'zab85993-rgb': ['detail', 'kitchen', 'Kitchen sink full of produce below a garden window', 'อ่างล้างจานที่มีผักสดใต้หน้าต่างมองสวน'],
  'zab86829-1800x800': ['room', 'kitchen', 'Pale blue kitchen lit by a skylight', 'ครัวโทนสีฟ้าอ่อนรับแสงจากช่องแสงบนหลังคา'],
  'zab95711-rgb': ['room', 'bath', 'White bathroom with a wall-hung toilet and framed art', 'ห้องน้ำสีขาวพร้อมสุขภัณฑ์แบบแขวนผนังและภาพศิลปะ'],
  'zac11288-rgb': ['people', 'bath', 'A woman walking towards a lit mirror in a dark bathroom', 'ผู้หญิงกำลังเดินเข้าหากระจกมีไฟในห้องน้ำโทนมืด'],
  'zac15295-rgb': ['room', 'bath', 'Bathroom with a wood vanity and a wall-hung toilet', 'ห้องน้ำพร้อมตู้อ่างล้างหน้าไม้และสุขภัณฑ์แบบแขวนผนัง'],
  'zac16296-rgb': ['room', 'bath', 'Blue bathroom with a freestanding bath and textured tile', 'ห้องน้ำโทนสีน้ำเงินพร้อมอ่างอาบน้ำลอยตัวและกระเบื้องผิวสัมผัส'],
  'zac17332-rgb': ['room', 'bath', 'Grey-tiled bathroom with a freestanding bath below a window', 'ห้องน้ำกรุกระเบื้องสีเทาพร้อมอ่างอาบน้ำลอยตัวใต้หน้าต่าง'],
  'zac17358-rgb': ['detail', 'bath', 'Close-up of the corner of a filled bath', 'ภาพระยะใกล้มุมอ่างอาบน้ำที่มีน้ำเต็ม'],
  'zac17365-rgb': ['detail', 'bath', 'Overhead view of a filled rectangular bath', 'ภาพมุมสูงของอ่างอาบน้ำทรงเหลี่ยมที่มีน้ำเต็ม'],
}

const cacheDir = process.argv[2] ?? path.join(ROOT, '.cache', 'lifestyle-src')

/** Trim a uniform white border; keep the original if there is nothing to trim. */
async function trimmed(buf) {
  const meta = await sharp(buf).metadata()
  try {
    const t = await sharp(buf)
      .trim({ background: '#ffffff', threshold: 12 })
      .toBuffer({ resolveWithObject: true })
    const shrank = t.info.width < meta.width * 0.92 || t.info.height < meta.height * 0.92
    const sane = t.info.width >= 240 && t.info.height >= 180
    if (shrank && sane) return { buf: t.data, width: t.info.width, height: t.info.height, trimmed: true }
  } catch {
    // sharp throws when a trim would consume the whole image; keep the original.
  }
  return { buf, width: meta.width, height: meta.height, trimmed: false }
}

async function main() {
  const { results } = JSON.parse(await readFile(path.join(cacheDir, 'manifest.json'), 'utf8'))
  const byId = new Map(results.map((r) => [r.id, r]))

  const unknown = results.filter((r) => !CATALOG[r.id] && !DROPPED[r.id]).map((r) => r.id)
  if (unknown.length) {
    console.error(`unclassified assets: ${unknown.join(', ')}`)
    process.exit(1)
  }

  for (const w of WIDTHS) await mkdir(path.join(OUT_DIR, String(w)), { recursive: true })

  // Cut-outs may have been written by an earlier scrape run; take them back out.
  for (const id of Object.keys(DROPPED)) {
    for (const w of WIDTHS) await rm(path.join(OUT_DIR, String(w), `${id}.webp`), { force: true })
  }

  const entries = []
  for (const id of Object.keys(CATALOG)) {
    const rec = byId.get(id)
    if (!rec) {
      console.error(`missing from scrape manifest: ${id}`)
      process.exit(1)
    }
    const src = await readFile(path.join(cacheDir, `${id}.jpg`))
    const photo = await trimmed(src)

    const dims = {}
    for (const w of WIDTHS) {
      const file = path.join(OUT_DIR, String(w), `${id}.webp`)
      const out = await sharp(photo.buf)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w === 1800 ? 78 : 74, effort: 5 })
        .toFile(file)
      dims[w] = out
      const s = await stat(file)
      if (s.size === 0) throw new Error(`${id}: zero-byte output at ${w}`)
    }

    const [category, space, en, th] = CATALOG[id]
    entries.push({
      id,
      src: { w1800: `/lifestyle/1800/${id}.webp`, w900: `/lifestyle/900/${id}.webp` },
      width: dims[1800].width,
      height: dims[1800].height,
      aspect: Math.round((dims[1800].width / dims[1800].height) * 1000) / 1000,
      category,
      space,
      alt: { th, en },
      trimmed: photo.trimmed,
    })
  }

  entries.sort((a, b) => a.id.localeCompare(b.id))

  const body = entries
    .map(
      (e) => `  {
    id: '${e.id}',
    src: { w1800: '${e.src.w1800}', w900: '${e.src.w900}' },
    width: ${e.width},
    height: ${e.height},
    aspect: ${e.aspect},
    category: '${e.category}',
    space: '${e.space}',
    alt: {
      th: '${e.alt.th.replace(/'/g, "\\'")}',
      en: '${e.alt.en.replace(/'/g, "\\'")}',
    },
  },`
    )
    .join('\n')

  const ts = `// Generated by scripts/build-lifestyle.mjs — do not edit by hand.
// Source: Kohler Scene7 editorial photography, downloaded by
// scripts/scrape-lifestyle.mjs. Cut-out product shots were dropped on purpose;
// the product grid already carries those.
//
// width/height describe the file at src.w1800, after any white banner padding
// was trimmed off, so a few assets are narrower than 1800px. src.w900 is the
// same crop at min(900, width).

export type LifestyleCategory =
  | 'room'
  | 'detail'
  | 'people'
  | 'project'
  | 'retail'
  | 'promo'

export type LifestyleSpace = 'bath' | 'kitchen' | 'other'

export type LifestyleImage = {
  id: string
  src: { w1800: string; w900: string }
  width: number
  height: number
  /** width / height, rounded to 3dp — pick a crop with this. */
  aspect: number
  category: LifestyleCategory
  space: LifestyleSpace
  alt: { th: string; en: string }
}

export const lifestyleImages: LifestyleImage[] = [
${body}
]

export const lifestyleByCategory = (category: LifestyleCategory): LifestyleImage[] =>
  lifestyleImages.filter((image) => image.category === category)
`

  await writeFile(TS_OUT, ts)

  const counts = entries.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + 1 }), {})
  console.log(`wrote ${entries.length} entries to ${path.relative(ROOT, TS_OUT)}`)
  console.log(`categories ${JSON.stringify(counts)}`)
  console.log(`trimmed ${entries.filter((e) => e.trimmed).length}  dropped ${Object.keys(DROPPED).length}`)
}

await main()
