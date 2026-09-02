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
 * Renditions are never upscaled. An earlier version wrote a 1800 and a 900 for
 * every asset, so 46 sources narrower than 900px ended up with two files
 * holding identical pixels and data claiming an 1800 that did not exist. Now
 * each asset gets renditions only at widths it can actually fill, the files are
 * named for their real width, and the entry records maxWidth so a layout can
 * ask "can this fill a 670px slot" instead of finding out by looking soft.
 *
 * Usage: node scripts/build-lifestyle.mjs [cacheDir]
 */
import { mkdir, readFile, writeFile, stat, rm, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'lifestyle')
const TS_OUT = path.join(ROOT, 'lib', 'lifestyle.generated.ts')

/**
 * Widths to emit for a source that is `native` px wide.
 * The top rendition is the source itself (capped at 1800); a 900 step is only
 * added when it is meaningfully smaller than the top one.
 */
function renditionWidths(native) {
  const top = Math.min(native, 1800)
  return top >= 1200 ? [top, 900] : [top]
}

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
  'article-page-th': 'Thai infographic, all type and icons',
  'home-princess-pc': 'royal mourning notice, not product photography',
  'katalyst-air-2': 'three cut-out handshowers on black with spray-name captions',
  'katalyst-air-organic-handshower': 'same cut-out handshower panel with captions',
  'katalyst-th': 'Thai infographic, all type and icons',
  'water-saving-image': 'cut-out showerhead on white',
  'water-saving-san-raphael-grande-resize': 'cut-out toilet on white',
  'zac20083-rgb': 'faucet lit on a black studio ground',
  'zac24125-rgb': 'Kohler Lifetime Limited Warranty badge',
  'bathtub-accessories': 'cut-out bath headrest on white',
  'chalice-vessel-lavatory': 'cut-out vessel basin on white',
  'length-1': 'basin width diagram',
  'length-2': 'basin width diagram',
  'length-3': 'basin width diagram',
  'verticyl-under-counter-lavatory': 'cut-out undermount basin on white',
  'vitreous-china': 'cut-out vessel basin on white',
  'zab30377-rgb': 'cut-out shower speakers on white',
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

  // ── second sweep (task P) ──
  // Harvested with a browser rather than curl: the home carousel and the
  // article pages behind /ideas and the shopping guides load their photography
  // from script, and the carousel slides live on kohler.co.th/binaries, not
  // Scene7, so the first sweep never saw any of it.
  'aaa01705-43': ['detail', 'kitchen', 'Apron-front sink below a tiled backsplash in a cream kitchen', 'อ่างล้างจานแบบยื่นหน้าใต้ผนังกระเบื้องในครัวโทนครีม'],
  'aab06665': ['detail', 'kitchen', 'Stainless sink with prep trays on a dark counter', 'อ่างล้างจานสเตนเลสพร้อมถาดเตรียมอาหารบนเคาน์เตอร์สีเข้ม'],
  'aab27241': ['room', 'kitchen', 'White kitchen with a farmhouse sink and glass-front cabinets', 'ครัวสีขาวพร้อมอ่างล้างจานแบบยื่นหน้าและตู้บานกระจก'],
  'aab27241-rgb2': ['room', 'kitchen', 'Wider view of a white kitchen with a farmhouse sink', 'ภาพมุมกว้างของครัวสีขาวพร้อมอ่างล้างจานแบบยื่นหน้า'],
  'aab39432': ['room', 'kitchen', 'Kitchen with a black faucet and herbs at a steel-framed window', 'ครัวพร้อมก๊อกสีดำและกระถางสมุนไพรริมหน้าต่างกรอบเหล็ก'],
  'boonthavorn-ratchada': ['retail', 'other', 'Kohler display inside the Boonthavorn Ratchada store', 'มุมแสดงสินค้า Kohler ในร้านบุญถาวร รัชดา'],
  'ccc16658': ['detail', 'kitchen', 'Stainless double-bowl sink at a garden window', 'อ่างล้างจานสเตนเลสสองหลุมริมหน้าต่างมองสวน'],
  'katalyst-air-4': ['detail', 'bath', 'Rainhead pouring water against a forest backdrop', 'ฝักบัวเรนชาวเวอร์ปล่อยน้ำบนฉากป่า'],
  'katalyst-air-katalyst-air-updated-kv': ['people', 'bath', 'A woman showering under a rainhead in a forest setting', 'ผู้หญิงอาบน้ำใต้ฝักบัวเรนชาวเวอร์กลางป่า'],
  'katalyst-air-katalyst-air-video': ['detail', 'bath', 'Close-up of water falling from a rainhead', 'ภาพระยะใกล้ของสายน้ำจากฝักบัวเรนชาวเวอร์'],
  'kitchen-faucets-category': ['people', 'kitchen', 'Hands under a touchless kitchen faucet', 'มือสองข้างใต้ก๊อกครัวระบบเซนเซอร์'],
  'kitchen-sinks-category': ['detail', 'kitchen', 'Faceted black apron sink in a bright kitchen', 'อ่างล้างจานสีดำผิวเหลี่ยมมุมในครัวโปร่งสว่าง'],
  'kitchen-sinks-category-15': ['detail', 'kitchen', 'Overhead view of a sink with produce, a board and cutlery', 'ภาพมุมสูงของอ่างล้างจานพร้อมผัก เขียง และช้อนส้อม'],
  'kohler-bkk-kec-banner': ['retail', 'other', 'The Kohler Experience Center storefront in Bangkok at night', 'หน้าร้าน Kohler Experience Center กรุงเทพฯ ในเวลากลางคืน'],
  'kohler-kec-bkk': ['retail', 'other', 'Entrance to the Kohler Experience Center, Bangkok', 'ทางเข้า Kohler Experience Center กรุงเทพฯ'],
  'kohlerhome-leap-apac-webbanner-main-desktop-1905x640': ['promo', 'bath', '“Take a Leap” smart toilet campaign banner', 'แบนเนอร์แคมเปญสุขภัณฑ์อัจฉริยะ “Take a Leap”'],
  'kohlerhome-milan2026-banner-1905x640': ['promo', 'other', 'Milan Design Week 2026 campaign banner', 'แบนเนอร์แคมเปญ Milan Design Week 2026'],
  'kohlerhome-milan2026-banner-600x800': ['promo', 'other', 'Milan Design Week 2026 campaign banner, portrait crop', 'แบนเนอร์แคมเปญ Milan Design Week 2026 สัดส่วนแนวตั้ง'],
  'kohlerhome-website-mobile-banner-kohler-the-immersive-showcase-w1250xh1667px-20260122': ['promo', 'bath', 'The Immersive Showcase smart toilet banner', 'แบนเนอร์ The Immersive Showcase สุขภัณฑ์อัจฉริยะ'],
  'malleco-article-banner-968x544': ['people', 'kitchen', 'Hands under a running touchless kitchen faucet', 'มือสองข้างใต้ก๊อกครัวเซนเซอร์ที่กำลังปล่อยน้ำ'],
  'malleco-article-image-400x255-01': ['detail', 'kitchen', 'Black sink and faucet below a steel-framed window', 'อ่างล้างจานและก๊อกสีดำใต้หน้าต่างกรอบเหล็ก'],
  'malleco-article-image-400x255-03-1': ['room', 'kitchen', 'Kitchen with an island seen from the dining side', 'ครัวพร้อมเคาน์เตอร์กลางมองจากฝั่งโต๊ะอาหาร'],
  'malleco-article-image-400x255-04': ['detail', 'kitchen', 'Matte black faucet on a white sink beside a plant', 'ก๊อกสีดำด้านบนอ่างสีขาวข้างต้นไม้'],
  'malleco-article-image-400x255-05': ['people', 'kitchen', 'A hand rinsing produce under a kitchen faucet', 'มือกำลังล้างผักใต้ก๊อกครัว'],
  'malleco-article-image-400x255-06': ['detail', 'kitchen', 'Black kitchen faucet beside a cake on a wooden board', 'ก๊อกครัวสีดำข้างเค้กบนเขียงไม้'],
  'shopping-guide-faucet-innovation': ['detail', 'kitchen', 'Brushed kitchen faucet against a mosaic backsplash', 'ก๊อกครัวผิวปัดเงาหน้าผนังกระเบื้องโมเสก'],
  'shopping-guide-kitchen-faucet': ['detail', 'kitchen', 'Black kitchen faucet on a white sink with a prep tray', 'ก๊อกครัวสีดำบนอ่างสีขาวพร้อมถาดเตรียมอาหาร'],
  'taut-kitchen-faucet': ['detail', 'kitchen', 'Taut kitchen faucet over a dark stone counter', 'ก๊อกครัว Taut เหนือเคาน์เตอร์หินสีเข้ม'],
  'zaa08493': ['room', 'kitchen', 'Traditional kitchen with a farmhouse sink and marble counters', 'ครัวสไตล์ดั้งเดิมพร้อมอ่างยื่นหน้าและเคาน์เตอร์หินอ่อน'],
  'zaa49024': ['detail', 'kitchen', 'Stainless apron sink in a blue-grey counter by a window', 'อ่างล้างจานสเตนเลสแบบยื่นหน้าบนเคาน์เตอร์สีเทาอมฟ้าริมหน้าต่าง'],
  'zaa49059': ['detail', 'kitchen', 'Close-up of a stainless sink basin and its drain rack', 'ภาพระยะใกล้ของอ่างสเตนเลสและตะแกรงรองก้นอ่าง'],
  'zaa49176': ['detail', 'kitchen', 'White apron-front sink in a cream kitchen', 'อ่างล้างจานสีขาวแบบยื่นหน้าในครัวโทนครีม'],
  'zaa98109': ['room', 'kitchen', 'Farmhouse sink in a blue panelled kitchen', 'อ่างยื่นหน้าในครัวผนังไม้บุสีน้ำเงิน'],
  'zab27056-rgb': ['detail', 'kitchen', 'Grey apron sink on a marble counter below a window', 'อ่างยื่นหน้าสีเทาบนเคาน์เตอร์หินอ่อนใต้หน้าต่าง'],
  'zab28128-rgb': ['detail', 'kitchen', 'Close-up of a stainless sink with its accessory rack', 'ภาพระยะใกล้ของอ่างสเตนเลสพร้อมชุดตะแกรงเสริม'],
  'zab37177-rgb': ['room', 'kitchen', 'Open kitchen and dining room under a sloped ceiling', 'ครัวเปิดต่อเนื่องกับโต๊ะอาหารใต้ฝ้าลาดเอียง'],
  'zab44801-rgb': ['detail', 'kitchen', 'Abstract close-up of a brushed stainless basin', 'ภาพระยะใกล้เชิงนามธรรมของอ่างสเตนเลสผิวปัด'],
  'zab64051-rgb': ['detail', 'kitchen', 'Kitchen faucet running beside a range and a pot filler', 'ก๊อกครัวปล่อยน้ำข้างเตาและก๊อกเติมหม้อ'],
  'zab68492-rgb': ['room', 'kitchen', 'White subway-tiled kitchen with a stainless apron sink', 'ครัวกระเบื้องสีขาวพร้อมอ่างสเตนเลสแบบยื่นหน้า'],
  'zab79741-rgb': ['detail', 'kitchen', 'Overhead view of a dark sink with food laid out for prep', 'ภาพมุมสูงของอ่างสีเข้มพร้อมวัตถุดิบสำหรับเตรียมอาหาร'],
  'zab79771-rgb': ['detail', 'kitchen', 'Kitchen counter with bruschetta beside a stainless sink', 'เคาน์เตอร์ครัวพร้อมบรูสเก็ตต้าข้างอ่างสเตนเลส'],
  'zab86207-rgb': ['detail', 'kitchen', 'Sink set into a walnut counter with strawberries on a tray', 'อ่างล้างจานฝังในเคาน์เตอร์ไม้วอลนัทพร้อมถาดสตรอว์เบอร์รี'],
  'zab91996-rgb': ['room', 'kitchen', 'Dark cabinetry kitchen with a marble island and a range', 'ครัวตู้สีเข้มพร้อมเคาน์เตอร์กลางหินอ่อนและเตา'],
  'zab95042-rgb': ['room', 'bath', 'Bathroom with a freestanding bath and a desert view', 'ห้องน้ำพร้อมอ่างอาบน้ำลอยตัวและวิวทะเลทราย'],
  'zab97592-rgb': ['room', 'bath', 'White bathroom with a chandelier and a grey vanity', 'ห้องน้ำสีขาวพร้อมโคมระย้าและตู้อ่างล้างหน้าสีเทา'],
  'zac00286-rgb': ['room', 'bath', 'Bright bathroom with a clawfoot bath on patterned tile', 'ห้องน้ำโปร่งสว่างพร้อมอ่างขาสิงห์บนพื้นกระเบื้องลาย'],
  'zac00363-rgb': ['detail', 'kitchen', 'Round bar sink in a white island against a teal wall', 'อ่างล้างจานทรงกลมบนเคาน์เตอร์กลางสีขาวหน้าผนังสีเขียวน้ำทะเล'],
  'zac01390-rgb': ['room', 'bath', 'Bathroom with a forest mural and a grey vanity', 'ห้องน้ำผนังภาพป่าพร้อมตู้อ่างล้างหน้าสีเทา'],
  'zac01424-rgb': ['room', 'bath', 'Vanity and toilet against a forest mural', 'ตู้อ่างล้างหน้าและสุขภัณฑ์หน้าผนังภาพป่า'],
  'zac01571-rgb': ['room', 'bath', 'Twin walnut vanities in a slate blue bathroom', 'ตู้อ่างล้างหน้าไม้วอลนัทคู่ในห้องน้ำโทนน้ำเงินเทา'],
  'zac01577-rgb': ['room', 'bath', 'Dark bathroom with a vanity, a bath and a city view', 'ห้องน้ำโทนเข้มพร้อมตู้อ่างล้างหน้า อ่างอาบน้ำ และวิวเมือง'],
  'zac02157-rgb': ['room', 'bath', 'Sculpted freestanding bath in a high-rise bathroom', 'อ่างอาบน้ำลอยตัวทรงโค้งในห้องน้ำบนอาคารสูง'],
  'zac02254-rgb': ['room', 'bath', 'Walk-in stone shower with a bench and a city view', 'ห้องอาบน้ำผนังหินพร้อมม้านั่งและวิวเมือง'],
  'zac02930-rgb': ['people', 'kitchen', 'A person rinsing a pan under a kitchen faucet', 'คนกำลังล้างกระทะใต้ก๊อกครัว'],
  'zac06644-rgb': ['room', 'bath', 'Marble shower and a brass chandelier in a bright bathroom', 'ห้องอาบน้ำหินอ่อนและโคมระย้าทองเหลืองในห้องน้ำโปร่ง'],
  'zac09774-rgb': ['room', 'bath', 'Walnut vanity in a white panelled bathroom', 'ตู้อ่างล้างหน้าไม้วอลนัทในห้องน้ำผนังไม้บุสีขาว'],
  'zac24119-rgb': ['detail', 'bath', 'Brushed gold faucet on a bath deck', 'ก๊อกสีทองผิวปัดบนขอบอ่างอาบน้ำ'],
  'zac24120-rgb': ['detail', 'kitchen', 'Matte black faucet over a farmhouse sink', 'ก๊อกสีดำด้านเหนืออ่างล้างจานแบบยื่นหน้า'],
  'zac24121-rgb': ['detail', 'bath', 'Polished nickel widespread basin faucet', 'ก๊อกอ่างล้างหน้าสามชิ้นผิวนิกเกิลเงา'],
  'zac24122-rgb': ['detail', 'bath', 'Angular black and chrome faucet on a white basin', 'ก๊อกทรงเหลี่ยมสีดำตัดโครเมียมบนอ่างสีขาว'],
  'zac24123-rgb': ['detail', 'kitchen', 'Nickel bridge faucet over a stainless sink', 'ก๊อกทรงบริดจ์ผิวนิกเกิลเหนืออ่างสเตนเลส'],
  'zac24124-rgb': ['detail', 'kitchen', 'Kitchen faucet and sink at a window', 'ก๊อกและอ่างล้างจานริมหน้าต่าง'],

  // ── third sweep (task X) ──
  // Hero-grade photography: the global-projects detail pages, the bathroom Ideas
  // articles and the Collections shopping guides. Scene7 masters top out at
  // 1800px wide — checked with ?req=props on 29 candidates, none was larger.
  '2022-most-innovative-bathroom-products-moxie-numi-gcs-hero-banner-968-x-544-2': ['people', 'bath', 'A woman in a marble shower room with a mountain view', 'ผู้หญิงในห้องอาบน้ำผนังหินอ่อนที่มองเห็นวิวภูเขา'],
  '35-classic': ['room', 'bath', 'Classic bathroom with a freestanding bath and a dark shower', 'ห้องน้ำสไตล์คลาสสิกพร้อมอ่างอาบน้ำลอยตัวและห้องอาบน้ำโทนเข้ม'],
  '36-comtemporary': ['room', 'bath', 'Contemporary bathroom with a curved feature wall', 'ห้องน้ำสไตล์โมเดิร์นพร้อมผนังโค้งเป็นจุดเด่น'],
  '37-transitional': ['room', 'bath', 'Transitional bathroom in soft neutral tones', 'ห้องน้ำสไตล์ทรานซิชันนัลโทนสีนวลอ่อน'],
  'aaa68050-43': ['room', 'bath', 'Corner console basin against blue-grey panelling', 'อ่างล้างหน้าแบบคอนโซลเข้ามุมหน้าผนังไม้บุสีเทาอมฟ้า'],
  'aaa75014-43': ['detail', 'bath', 'Dark glass vessel basin with a running faucet', 'อ่างล้างหน้าแก้วสีเข้มพร้อมก๊อกที่กำลังปล่อยน้ำ'],
  'bathtub-faucet': ['detail', 'bath', 'Freestanding bath with a floor-mounted faucet', 'อ่างอาบน้ำลอยตัวพร้อมก๊อกตั้งพื้น'],
  'crown-towers-perth-01': ['project', 'bath', 'Suite bathroom with ring mirrors at Crown Towers, Perth', 'ห้องน้ำในห้องสวีทพร้อมกระจกทรงกลมที่ Crown Towers เพิร์ท'],
  'fachon-hotel-tokyo-japan-article-output-banner-updated-size-307x204': ['project', 'other', 'Fauchon L’Hôtel, Tokyo, lit at night', 'โรงแรม Fauchon L’Hôtel โตเกียว ในเวลากลางคืน'],
  'intercontinental-khao-yai-thailand-article-output-banner-updated-size-307x204': ['project', 'other', 'InterContinental Khao Yai Resort seen from the garden', 'รีสอร์ต InterContinental เขาใหญ่ มองจากสวน'],
  'kohler-23022005-jakarta-st-regis-indonesia-article-output-banner-updated-size-307x204': ['project', 'other', 'The St. Regis Jakarta tower above the city', 'อาคารโรงแรม St. Regis จาการ์ตา เหนือเส้นขอบฟ้าเมือง'],
  'maxispace-article-sub-component-400x255-01': ['room', 'bath', 'Compact bathroom with a pink arch and a mirror cabinet', 'ห้องน้ำขนาดกะทัดรัดพร้อมซุ้มโค้งสีชมพูและตู้กระจก'],
  'maxispace-article-sub-component-400x255-02': ['detail', 'bath', 'Vanity drawer fitted with a cosmetics organiser', 'ลิ้นชักตู้อ่างล้างหน้าพร้อมถาดจัดเก็บเครื่องสำอาง'],
  'maxispace-article-sub-component-400x255-03': ['people', 'other', 'A woman reading beside a window full of plants', 'ผู้หญิงนั่งอ่านหนังสือข้างหน้าต่างที่เต็มไปด้วยต้นไม้'],
  'maxispace-article-sub-component-400x255-04': ['promo', 'bath', 'Mirror cabinet durability claim with a 50,000-cycle badge', 'ภาพโฆษณาความทนทานของตู้กระจกพร้อมตรา 50,000 รอบ'],
  'maxispace-article-sub-component-400x255-05': ['detail', 'bath', 'Pull-out vanity shelf holding a perfume bottle', 'ชั้นเลื่อนของตู้อ่างล้างหน้าที่วางขวดน้ำหอม'],
  'maxispace-hero-banner-968x544': ['room', 'bath', 'Pink and green bathroom with the mirror cabinet standing open', 'ห้องน้ำโทนชมพูตัดเขียวพร้อมตู้กระจกที่เปิดอยู่'],
  'maxispace-rolling-carousel-400x300-01': ['detail', 'bath', 'Vanity drawer open beside a wall-hung basin', 'ลิ้นชักตู้อ่างล้างหน้าที่เปิดอยู่ข้างอ่างแบบแขวนผนัง'],
  'maxispace-rolling-carousel-400x300-02': ['detail', 'bath', 'Pull-out tray on a wood-fronted vanity', 'ถาดเลื่อนบนตู้อ่างล้างหน้าหน้าบานไม้'],
  'maxispace-rolling-carousel-400x300-03': ['detail', 'bath', 'Mirror cabinet interior stocked with toiletries', 'ภายในตู้กระจกที่จัดของใช้ในห้องน้ำไว้เต็ม'],
  'mongolia-mara6871': ['project', 'bath', 'Row of basins in a hotel washroom at Shangri-La, Ulaanbaatar', 'แถวอ่างล้างหน้าในห้องน้ำโรงแรม Shangri-La อูลานบาตอร์'],
  'oval-round': ['detail', 'bath', 'Round vessel basin on a wooden counter', 'อ่างล้างหน้าทรงกลมวางบนเคาน์เตอร์ไม้'],
  'the-lin-taichung-03': ['project', 'bath', 'Suite bathroom with a whirlpool bath at The Lin, Taichung', 'ห้องน้ำในห้องสวีทพร้อมอ่างน้ำวนที่โรงแรม The Lin ไถจง'],
  'the-lin-taichung-04': ['project', 'bath', 'Onyx vanity with a city view at The Lin, Taichung', 'เคาน์เตอร์อ่างล้างหน้าหินโอนิกซ์พร้อมวิวเมืองที่ The Lin ไถจง'],
  'the-lin-taichung-06': ['detail', 'bath', 'Digital shower control set into an onyx wall', 'แผงควบคุมฝักบัวดิจิทัลฝังในผนังหินโอนิกซ์'],
  'the-lin-taichung-10': ['detail', 'bath', 'Undermount basin and widespread faucet on figured marble', 'อ่างล้างหน้าแบบฝังใต้เคาน์เตอร์และก๊อกสามชิ้นบนหินอ่อนลายสวย'],
  'the-lin-taichung-11': ['detail', 'bath', 'Bath filler and folded towel on a marble deck', 'ก๊อกลงอ่างและผ้าเช็ดตัวพับบนขอบอ่างหินอ่อน'],
  'the-lin-taichung-13': ['project', 'bath', 'Twin vanities in a gold-toned hotel bathroom', 'อ่างล้างหน้าคู่ในห้องน้ำโรงแรมโทนสีทอง'],
  'the-lin-taichung-15': ['project', 'bath', 'Hotel bathroom with a walk-in shower and a bath', 'ห้องน้ำโรงแรมพร้อมห้องอาบน้ำและอ่างอาบน้ำ'],
  'the-lin-taichung-17': ['project', 'bath', 'Marble hotel bathroom with framed artwork', 'ห้องน้ำโรงแรมกรุหินอ่อนพร้อมภาพศิลปะกรอบรูป'],
  'the-lin-taichung-18': ['detail', 'bath', 'Basin and towels on a golden marble counter', 'อ่างล้างหน้าและผ้าเช็ดตัวบนเคาน์เตอร์หินอ่อนสีทอง'],
  'the-lin-taichung-21': ['project', 'bath', 'Public washroom with a stone trough counter', 'ห้องน้ำสาธารณะพร้อมเคาน์เตอร์อ่างยาวจากหิน'],
  'the-lin-taichung-22': ['project', 'bath', 'Marble-lined public washroom', 'ห้องน้ำสาธารณะกรุผนังหินอ่อน'],
  'zaa19138-43': ['people', 'bath', 'A hand under a running brushed gold faucet', 'มือรองน้ำใต้ก๊อกสีทองผิวปัดที่กำลังไหล'],
  'zaa24582-43': ['room', 'bath', 'Alcove bath below shuttered windows in a warm room', 'อ่างอาบน้ำแบบฝังผนังใต้หน้าต่างบานเกล็ดในห้องโทนอุ่น'],
  'zaa66175-43': ['room', 'bath', 'Console basin on grey tile with candle lanterns', 'อ่างล้างหน้าแบบคอนโซลบนผนังกระเบื้องสีเทาพร้อมตะเกียงเทียน'],
  'zaa88818-43': ['room', 'bath', 'Alcove bath against dark slate tile', 'อ่างอาบน้ำแบบฝังผนังหน้ากระเบื้องหินชนวนสีเข้ม'],
  'zab20818-rgb': ['room', 'bath', 'Floating wood vanity in an all-white bathroom', 'ตู้อ่างล้างหน้าไม้แบบลอยในห้องน้ำสีขาวทั้งห้อง'],
  'zab29178-rgb': ['room', 'bath', 'Black marble bathroom with a freestanding bath and a glass shower', 'ห้องน้ำหินอ่อนสีดำพร้อมอ่างอาบน้ำลอยตัวและห้องอาบน้ำกระจก'],
  'zab29400-rgb': ['detail', 'bath', 'Soap dispenser and shaving kit on a tray beside a bath', 'ที่กดสบู่และชุดโกนหนวดบนถาดข้างอ่างอาบน้ำ'],
  'zab43938-rgb': ['detail', 'bath', 'Double vanity with the storage drawers pulled open', 'ตู้อ่างล้างหน้าคู่ที่เปิดลิ้นชักจัดเก็บออกมา'],
  'zab49013-1800x800': ['people', 'bath', 'A woman rinsing her hair under twin showerheads on dark stone', 'ผู้หญิงสระผมใต้ฝักบัวคู่ในห้องอาบน้ำผนังหินสีเข้ม'],
  'zab54900-rgb': ['room', 'bath', 'White bathroom with a wall-hung vanity and a one-piece toilet', 'ห้องน้ำสีขาวพร้อมตู้อ่างล้างหน้าแบบแขวนและสุขภัณฑ์ชิ้นเดียว'],
  'zab58476-1800x800': ['people', 'bath', 'Digital shower control beside a hand under the spray', 'แผงควบคุมฝักบัวดิจิทัลข้างมือที่กำลังรับสายน้ำ'],
  'zab59846-rgb': ['room', 'bath', 'Cottage bathroom with a wood vanity under a gable window', 'ห้องน้ำสไตล์คอทเทจพร้อมตู้ไม้ใต้หน้าต่างจั่ว'],
  'zab59902-rgb': ['room', 'bath', 'Black wall-hung toilet against white panelling', 'สุขภัณฑ์แขวนผนังสีดำหน้าผนังไม้บุสีขาว'],
  'zab69202-rgb': ['detail', 'bath', 'Mirror cabinet standing open beside a wall sconce', 'ตู้กระจกที่เปิดอยู่ข้างโคมไฟติดผนัง'],
  'zab75303-rgb': ['room', 'bath', 'Grey wood vanity and toilet in a soft-lit bathroom', 'ตู้อ่างล้างหน้าไม้สีเทาและสุขภัณฑ์ในห้องน้ำแสงนุ่ม'],
  'zab76750-rgb': ['room', 'bath', 'Green panelled bathroom with a bath and shower doors', 'ห้องน้ำผนังไม้บุสีเขียวพร้อมอ่างอาบน้ำและประตูกระจก'],
  'zab80599-rgb': ['detail', 'bath', 'Square vessel basin on a dark floating vanity', 'อ่างล้างหน้าทรงเหลี่ยมบนตู้ลอยสีเข้ม'],
  'zab85571-1800x800-gleaminggoldalternative': ['room', 'bath', 'Pedestal basin in a panelled room lit in warm gold', 'อ่างล้างหน้าขาตั้งในห้องผนังไม้บุแสงโทนทองอุ่น'],
  'zab91774-rgb': ['detail', 'bath', 'Showerhead running against white tile', 'ฝักบัวที่กำลังปล่อยน้ำหน้าผนังกระเบื้องสีขาว'],
  'zac08754-rgb': ['room', 'bath', 'Night-lit smart toilet against a mosaic wall', 'สุขภัณฑ์อัจฉริยะพร้อมไฟกลางคืนหน้าผนังโมเสก'],
  'zac09270-rgb': ['room', 'bath', 'Grey bathroom with a sliding glass shower door', 'ห้องน้ำโทนสีเทาพร้อมประตูอาบน้ำกระจกบานเลื่อน'],
  'zac14993-rgb': ['room', 'bath', 'White bathroom with a hexagon-tiled wall and a bath', 'ห้องน้ำสีขาวผนังกระเบื้องหกเหลี่ยมพร้อมอ่างอาบน้ำ'],
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

  await mkdir(OUT_DIR, { recursive: true })
  // The old layout put every asset in public/lifestyle/1800 and /900, which is
  // what produced the duplicate pixels. Renditions are now flat and named for
  // their real width, so the old folders go.
  for (const legacy of ['1800', '900']) await rm(path.join(OUT_DIR, legacy), { recursive: true, force: true })

  const entries = []
  const wanted = new Set()
  for (const id of Object.keys(CATALOG)) {
    const rec = byId.get(id)
    if (!rec) {
      console.error(`missing from scrape manifest: ${id}`)
      process.exit(1)
    }
    const src = await readFile(path.join(cacheDir, `${id}.jpg`))
    const photo = await trimmed(src)

    const sources = []
    for (const w of renditionWidths(photo.width)) {
      const name = `${id}-${w}.webp`
      const file = path.join(OUT_DIR, name)
      const out = await sharp(photo.buf)
        // withoutEnlargement is a belt-and-braces guard; renditionWidths never
        // asks for a width the source cannot fill.
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w >= 1200 ? 78 : 74, effort: 5 })
        .toFile(file)
      const s = await stat(file)
      if (s.size === 0) throw new Error(`${id}: zero-byte output at ${w}`)
      if (out.width > photo.width) throw new Error(`${id}: rendition ${out.width} exceeds source ${photo.width}`)
      sources.push({ width: out.width, height: out.height, src: `/lifestyle/${name}` })
      wanted.add(name)
    }
    sources.sort((a, b) => b.width - a.width)

    const [category, space, en, th] = CATALOG[id]
    entries.push({
      id,
      sources,
      width: photo.width,
      height: photo.height,
      aspect: Math.round((photo.width / photo.height) * 1000) / 1000,
      category,
      space,
      alt: { th, en },
      trimmed: photo.trimmed,
    })
  }

  // Sweep anything left behind by an earlier run (dropped assets, renamed ids).
  for (const name of await readdir(OUT_DIR)) {
    if (name.endsWith('.webp') && !wanted.has(name)) await rm(path.join(OUT_DIR, name), { force: true })
  }

  entries.sort((a, b) => a.id.localeCompare(b.id))

  /** The rendition a consumer gets from src.w900: the largest one at or below 900. */
  const under900 = (e) => e.sources.find((s) => s.width <= 900) ?? e.sources.at(-1)

  const body = entries
    .map((e) => {
      const renditions = e.sources
        .map((s) => `      { width: ${s.width}, height: ${s.height}, src: '${s.src}' },`)
        .join('\n')
      return `  {
    id: '${e.id}',
    sources: [
${renditions}
    ],
    src: { full: '${e.sources[0].src}', w900: '${under900(e).src}' },
    width: ${e.width},
    height: ${e.height},
    aspect: ${e.aspect},
    maxWidth: ${e.width},
    category: '${e.category}',
    space: '${e.space}',
    alt: {
      th: '${e.alt.th.replace(/'/g, "\\'")}',
      en: '${e.alt.en.replace(/'/g, "\\'")}',
    },
  },`
    })
    .join('\n')

  const ts = `// Generated by scripts/build-lifestyle.mjs — do not edit by hand.
// Source: Kohler Scene7 editorial photography, downloaded by
// scripts/scrape-lifestyle.mjs. Cut-out product shots were dropped on purpose;
// the product grid already carries those.
//
// width/height/maxWidth are the asset's real pixels after any white banner
// padding was trimmed off. Nothing is ever upscaled, so an asset only has the
// renditions listed in \`sources\` — a 460px source has exactly one file, not a
// fake 1800. Ask canFill() before putting an asset in a slot.

export type LifestyleCategory =
  | 'room'
  | 'detail'
  | 'people'
  | 'project'
  | 'retail'
  | 'promo'

export type LifestyleSpace = 'bath' | 'kitchen' | 'other'

export type LifestyleRendition = { width: number; height: number; src: string }

export type LifestyleImage = {
  id: string
  /** every rendition that exists on disk, largest first */
  sources: LifestyleRendition[]
  /** full = the largest rendition; w900 = the largest one at or below 900px */
  src: { full: string; w900: string }
  /** native pixels — nothing larger than this exists */
  width: number
  height: number
  /** width / height, rounded to 3dp — pick a crop with this. */
  aspect: number
  /** largest CSS width this asset can fill without being upscaled */
  maxWidth: number
  category: LifestyleCategory
  space: LifestyleSpace
  alt: { th: string; en: string }
}

export const lifestyleImages: LifestyleImage[] = [
${body}
]

export const lifestyleByCategory = (category: LifestyleCategory): LifestyleImage[] =>
  lifestyleImages.filter((image) => image.category === category)

/** Can this asset fill a slot of cssWidth at this device pixel ratio? */
export const canFill = (image: LifestyleImage, cssWidth: number, dpr = 1): boolean =>
  image.maxWidth >= cssWidth * dpr

/** Smallest rendition that covers the slot; the largest one when none does. */
export const lifestyleSrc = (image: LifestyleImage, cssWidth: number, dpr = 1): string => {
  const needed = cssWidth * dpr
  const covering = [...image.sources].reverse().find((s) => s.width >= needed)
  return (covering ?? image.sources[0]).src
}
`

  await writeFile(TS_OUT, ts)

  const counts = entries.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + 1 }), {})
  console.log(`wrote ${entries.length} entries to ${path.relative(ROOT, TS_OUT)}`)
  console.log(`categories ${JSON.stringify(counts)}`)
  console.log(`trimmed ${entries.filter((e) => e.trimmed).length}  dropped ${Object.keys(DROPPED).length}`)
}

await main()
