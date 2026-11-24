import { getCachedProducts } from '@/lib/products-cache';
import type { Product } from '@/lib/monday';

export const dynamic = 'force-dynamic';

const ROTATION_MS = 30_000;
const REFRESH_MS = 60 * 60 * 1000;
const ITEMS_PER_PAGE = 3;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(value: number): string {
  return Math.round(value).toLocaleString('nb-NO');
}

function discount(product: Product): number {
  if (!product.listPrice || product.listPrice <= product.salePrice) return 0;
  return Math.round(((product.listPrice - product.salePrice) / product.listPrice) * 100);
}

function statusLabel(product: Product): string {
  const reason = product.onlineSaleReason.trim().toLowerCase();
  if (reason.indexOf('demo') >= 0) return 'DEMOVARE';
  if (reason.indexOf('brukt') >= 0) return 'BRUKT';
  if (reason.indexOf('lagerslitt') >= 0) return 'LAGERSLITT';
  if (reason.indexOf('utg') >= 0) return 'UTG&Aring;TT MODELL';
  const value = discount(product);
  return value > 0 ? `-${value} %` : 'LAGERKUPP';
}

function truncate(value: string, limit: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}\u2026`;
}

function details(product: Product): string[] {
  const values = [
    product.productionYear ? `&Aring;rsmodell ${escapeHtml(product.productionYear)}` : '',
    product.brand ? escapeHtml(product.brand) : '',
    product.shortInfo ? escapeHtml(truncate(product.shortInfo, 64)) : '',
  ].filter(Boolean);
  return values.slice(0, 2);
}

function card(product: Product): string {
  const saving = Math.max(0, product.listPrice - product.salePrice);
  const detailItems = details(product)
    .map((item) => `<li>&bull; ${item}</li>`)
    .join('');
  const oldPrice = product.listPrice > product.salePrice
    ? `<span class="old-price">${formatPrice(product.listPrice)} kr</span>`
    : '';
  const savingLine = saving > 0
    ? `<div class="saving">Du sparer ${formatPrice(saving)} kr</div>`
    : '<div class="saving">&nbsp;</div>';

  return `<article class="card">
    <div class="image-area">
      <div class="badge">${statusLabel(product)}</div>
      <img class="product-image" src="/api/product-image/${encodeURIComponent(product.id)}/0" alt="" onerror="this.src='/tilbudsbodenlogo.svg'">
    </div>
    <div class="card-body">
      <h2>${escapeHtml(truncate(product.name, 47))}</h2>
      <div class="middle-row">
        <ul class="details">${detailItems}</ul>
        <div class="qr-wrap">
          <div class="qr-box"><img src="/api/product-qr/${encodeURIComponent(product.id)}" alt="QR"></div>
          <div class="scan">SKANN FOR MER</div>
        </div>
      </div>
      <div class="price-row"><span class="price">${formatPrice(product.salePrice)} kr</span>${oldPrice}</div>
      <div class="vat">Pris inkl. mva.</div>
      ${savingLine}
    </div>
  </article>`;
}

function page(products: Product[], pageIndex: number): string {
  return `<section class="product-page${pageIndex === 0 ? ' active' : ''}" data-page="${pageIndex}">
    ${products.map(card).join('')}
  </section>`;
}

function documentHtml(products: Product[]): string {
  const pages: Product[][] = [];
  for (let index = 0; index < products.length; index += ITEMS_PER_PAGE) {
    pages.push(products.slice(index, index + ITEMS_PER_PAGE));
  }
  const renderedPages = pages.map(page).join('');

  return `<!doctype html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Storskjerm | Tilbudsboden.no</title>
  <style>
    html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#050505;color:#fff;font-family:Arial,Helvetica,sans-serif}
    *{box-sizing:border-box}
    #viewport{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;background:#080808}
    #screen{position:relative;width:1920px;height:1080px;overflow:hidden;background:radial-gradient(circle at 0 0,#3b3b3b 0,#171717 42%,#050505 100%)}
    .header{position:absolute;left:44px;top:30px;width:1832px;height:125px;border-bottom:1px solid #444}
    .logo-box{position:absolute;left:0;top:0;width:360px;height:96px;background:#fff;border-radius:20px;text-align:center}
    .logo-box img{height:74px;max-width:320px;margin-top:11px}
    .headline{position:absolute;left:408px;top:5px;font-size:52px;line-height:56px;font-weight:900;white-space:nowrap}
    .subtitle{position:absolute;left:408px;top:68px;font-size:25px;font-weight:700;color:#d0d0d0;white-space:nowrap}
    .count{position:absolute;right:0;top:15px;height:62px;padding:0 34px;border:1px solid #d62c2c;border-radius:34px;background:#4b0d0d;color:#fff;font-size:25px;font-weight:900;line-height:60px;white-space:nowrap}
    .pages{position:absolute;left:44px;top:180px;width:1832px;height:800px;overflow:hidden}
    .product-page{display:none;width:1832px;height:800px;overflow:hidden}
    .product-page.active{display:flex}
    .card{position:relative;flex:0 0 596px;width:596px;height:800px;margin:0 22px 0 0;overflow:hidden;border-radius:30px;background:#fff;color:#111;box-shadow:0 26px 70px rgba(0,0,0,.28)}
    .card:last-child{margin-right:0}
    .image-area{position:relative;width:596px;height:430px;overflow:hidden;background:#eee;text-align:center}
    .badge{position:absolute;z-index:2;left:28px;top:24px;padding:11px 22px;border-radius:30px;background:#ed0011;color:#fff;font-size:27px;font-weight:900;line-height:34px;white-space:nowrap;box-shadow:0 7px 18px rgba(0,0,0,.2)}
    .product-image{display:block;width:540px;height:386px;margin:22px auto;object-fit:contain}
    .card-body{position:relative;width:596px;height:370px;padding:28px 30px 24px;overflow:hidden}
    h2{height:82px;margin:0;overflow:hidden;font-size:37px;line-height:41px;font-weight:900;letter-spacing:-.4px}
    .middle-row{position:relative;width:536px;height:150px;margin-top:10px;overflow:visible}
    .details{position:absolute;left:0;top:0;width:350px;height:134px;margin:0;padding:0;overflow:hidden;list-style:none;color:#555;font-size:20px;font-weight:700;line-height:27px}
    .details li{max-height:54px;margin:0 0 3px;overflow:hidden}
    .qr-wrap{position:absolute;right:0;top:0;width:154px;height:150px;text-align:center}
    .qr-box{display:inline-block;width:136px;height:136px;padding:5px;border:4px solid #111;border-radius:16px;background:#fff}
    .qr-box img{display:block;width:118px;height:118px}
    .scan{margin-top:4px;color:#111;font-size:13px;font-weight:900;white-space:nowrap}
    .price-row{position:absolute;left:30px;bottom:73px;height:58px;white-space:nowrap}
    .price{color:#ed0011;font-size:55px;line-height:58px;font-weight:900;letter-spacing:-1px}
    .old-price{display:inline-block;margin-left:20px;color:#666;font-size:20px;font-weight:700;text-decoration:line-through;vertical-align:baseline}
    .vat{position:absolute;left:30px;bottom:45px;color:#666;font-size:16px;font-weight:700}
    .saving{position:absolute;left:30px;bottom:18px;color:#333;font-size:19px;font-weight:900}
    .footer{position:absolute;left:44px;top:995px;width:1832px;height:65px;border-radius:18px;background:#252525;overflow:hidden}
    .footer-left{position:absolute;left:28px;top:17px;font-size:26px;font-weight:900}
    .footer-right{position:absolute;right:28px;top:18px;color:#ddd;font-size:24px;font-weight:800}
    #progress{position:absolute;left:0;bottom:0;width:0;height:6px;background:#ed0011}
    .empty{position:absolute;left:44px;top:300px;width:1832px;text-align:center;font-size:48px;font-weight:900}
  </style>
</head>
<body>
  <div id="viewport"><div id="screen">
    <header class="header">
      <div class="logo-box"><img src="/tilbudsbodenlogo.svg" alt="Tilbudsboden.no"></div>
      <div class="headline">Gode kj&oslash;p akkurat n&aring;</div>
      <div class="subtitle">Demo &middot; brukt &middot; restpartier &middot; utg&aring;ende modeller</div>
      <div class="count">${products.length} aktive tilbud</div>
    </header>
    <main class="pages">${renderedPages || '<div class="empty">Nye tilbud kommer snart</div>'}</main>
    <footer class="footer">
      <div class="footer-left">Skann QR-koden eller sp&oslash;r oss i kassen!</div>
      <div class="footer-right">tilbudsboden.no &middot; Eiksenteret Sortland</div>
      <div id="progress"></div>
    </footer>
  </div></div>
  <script>
    (function(){
      var pageIndex=0;
      var pages=document.getElementsByClassName('product-page');
      var progress=document.getElementById('progress');
      function scaleScreen(){
        var sx=window.innerWidth/1920;
        var sy=window.innerHeight/1080;
        var scale=Math.min(sx,sy);
        var viewport=document.getElementById('viewport');
        viewport.style.transform='scale('+scale+')';
        viewport.style.transformOrigin='0 0';
        viewport.style.left=Math.max(0,(window.innerWidth-1920*scale)/2)+'px';
      }
      function startProgress(){
        if(!progress){return;}
        progress.style.transition='none';
        progress.style.width='0px';
        window.setTimeout(function(){
          progress.style.transition='width ${ROTATION_MS}ms linear';
          progress.style.width='1832px';
        },50);
      }
      function nextPage(){
        if(pages.length<2){startProgress();return;}
        pages[pageIndex].className='product-page';
        pageIndex=(pageIndex+1)%pages.length;
        pages[pageIndex].className='product-page active';
        startProgress();
      }
      scaleScreen();
      startProgress();
      if(window.addEventListener){window.addEventListener('resize',scaleScreen,false);}
      window.setInterval(nextPage,${ROTATION_MS});
      window.setTimeout(function(){window.location.reload();},${REFRESH_MS});
    }());
  </script>
</body>
</html>`;
}

export async function GET() {
  try {
    const products = (await getCachedProducts())
      .filter((product) => Number(product.stock) > 0)
      .sort((a, b) => {
        const discountDifference = discount(b) - discount(a);
        if (discountDifference !== 0) return discountDifference;
        return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0);
      });

    return new Response(documentHtml(products), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('[storskjerm] Kunne ikke generere storskjerm:', error);
    return new Response(documentHtml([]), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}