const puppeteer = require('puppeteer');
const axios = require('axios');

const N8N_WEBHOOK_URL = 'https://n8n.automatizameuy.com/webhook/hunter-local-meli-v1';
const FOTO_WEBHOOK_URL = 'https://n8n.automatizameuy.com/webhook/hunter-foto-telegram';

// User-Agents rotativos para evitar detección
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.128 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];
const randUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const randDelay = (min, max) => new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

// Descarga la foto desde nuestra PC (mlstatic acepta nuestra IP pero no la de Telegram)
// y la sube al webhook de n8n en base64 — n8n la reenvía a Telegram con su credencial
async function enviarFotoTelegram(fotoUrl, caption) {
  try {
    const imgResp = await axios.get(fotoUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: { 'Referer': 'https://www.mercadolibre.com.uy/', 'User-Agent': randUA() }
    });
    const b64 = Buffer.from(imgResp.data).toString('base64');
    await axios.post(FOTO_WEBHOOK_URL, { foto_base64: b64, caption }, { timeout: 15000 });
    return true;
  } catch(e) {
    return false;
  }
}

// ─── SELECTORES actualizados abril 2026 ────────────────────────────────────
const SEL = {
  card:         '.ui-search-layout__item, .poly-card',
  titulo:       'h2, .poly-component__title, .ui-search-item__title',
  link:         'a[href*="mercadolibre"]',
  precio:       '.andes-money-amount__fraction',
  moneda:       '.andes-money-amount__currency-symbol',
  ubicacion:    '.poly-component__location, .ui-search-item__location-label',
  // Detalle
  descripcion:  '.ui-pdp-description__content, .ui-pdp-description p',
  fotos:        '.ui-pdp-gallery__figure img, .ui-pdp-image img',
  vendedor:     '.ui-pdp-seller-info, .ui-pdp-seller__header-info',
  dormitorios:  '[class*="dormitorio"] .ui-pdp-spec__value, [class*="bedroom"] .ui-pdp-spec__value',
  banios:       '[class*="ba"] .ui-pdp-spec__value',
  superficie:   '[class*="superficie"] .ui-pdp-spec__value, [class*="surface"] .ui-pdp-spec__value',
};

const KEYWORDS_DUENO = ['dueño','directo','particular','sin comision','sin comisión','trato directo','propietario','vendo yo','alquilo yo'];

const MISIONES = [
  { id: 'apartamentos', cx: 'apartamentos' },
  { id: 'casas',        cx: 'casas' },
  { id: 'oficinas',     cx: 'oficinas' },
  { id: 'locales',      cx: 'locales' },
];

async function scrapearDetalle(browser, url) {
  // Limpiar URL: quitar tracking params (#polycard_client=..., ?tracking=...)
  const urlLimpia = url.split('#')[0].split('?')[0];
  const page = await browser.newPage();
  try {
    await page.setUserAgent(randUA());
    // Simular viewport y headers reales
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-UY,es;q=0.9', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' });
    await randDelay(800, 2000); // pausa humana antes de cargar
    await page.goto(urlLimpia, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Verificar que no cayó en página de verificación
    const titulo = await page.title();
    if (titulo === 'Mercado Libre' || titulo === '') {
      console.log(`   ⚠️  Bloqueado por anti-bot, reintentando en 5s...`);
      await randDelay(5000, 8000);
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Esperar que carguen las fotos
    await page.waitForSelector('.ui-pdp-gallery__figure img, .ui-pdp-image img, .ui-pdp-thumbnail__image', { timeout: 10000 }).catch(() => {});

    const detalle = await page.evaluate((SEL, KEYWORDS) => {
      const texto = s => document.querySelector(s)?.innerText?.trim() || '';
      const todos  = s => Array.from(document.querySelectorAll(s));

      const descripcion = texto(SEL.descripcion).substring(0, 1500);

      // Fotos: intentar data-zoom, data-src, srcset y src
      const fotos = todos('.ui-pdp-gallery__figure img, .ui-pdp-thumbnail__image, .ui-pdp-image img, [class*="gallery"] img')
        .map(img => {
          const src = img.getAttribute('data-zoom')
            || img.getAttribute('data-src')
            || (img.srcset ? img.srcset.split(',').pop().trim().split(' ')[0] : '')
            || img.src
            || '';
          // Convertir miniaturas a tamaño grande: -O. -I. -S. → -F. (full size)
          // Solo reemplazar si hay una letra MAYÚSCULA entre guiones seguida de punto o extensión
          const cleaned = src.split('?')[0];
          return cleaned.replace(/-(O|I|S|W|G|B|D|E|C)(\.(jpg|jpeg|png|webp))/i, '-F$2');
        })
        .filter(s => s.startsWith('http') && s.includes('mlstatic') && !s.includes('placeholder') && !s.includes('no-image') && s.match(/\.(jpg|jpeg|png|webp)/i))
        .filter((v, i, a) => a.indexOf(v) === i) // dedup
        .slice(0, 10);

      // Nombre del vendedor (para detectar inmobiliarias)
      const nombre_vendedor = texto('.ui-pdp-seller__header-title, .ui-pdp-seller__info-label, [class*="seller"] h2, [class*="seller"] h3, .ui-box-component__title').toLowerCase();

      // Keywords de inmobiliarias registradas
      const KEYWORDS_INMO = ['inmobiliaria', 'bienes raices', 'real estate', 'propiedades', 'realty', 'century 21', 'remax', 're/max', 'pietrafesa', 'ferrés', 'ferres', 'beverly', 'gercovich', 'klover', 'predial'];

      const es_inmo_por_nombre = KEYWORDS_INMO.some(k => nombre_vendedor.includes(k));

      // Cantidad de publicaciones del vendedor (muchas = inmobiliaria)
      const cant_publicaciones_texto = document.querySelector('.ui-pdp-seller__reputation-number, [class*="reputation"] span, [class*="sales"] span')?.innerText || '0';
      const cant_ventas = parseInt(cant_publicaciones_texto.replace(/\D/g, '')) || 0;
      const es_inmo_por_volumen = cant_ventas > 10; // más de 10 ventas/alquileres = inmobiliaria

      const es_inmo = es_inmo_por_nombre || es_inmo_por_volumen;

      // Detectar dueño directo: keywords positivas Y no es inmobiliaria
      const todo_texto = (descripcion + ' ' + nombre_vendedor).toLowerCase();
      const tiene_keywords_dueno = KEYWORDS.some(k => todo_texto.includes(k));
      // Si no hay keywords pero tampoco es inmobiliaria conocida con volumen → posible dueño
      const es_dueno = !es_inmo && (tiene_keywords_dueno || cant_ventas <= 3);

      // Características
      const specs = {};
      todos('[class*="ui-pdp-specs"] li, .ui-vip-specs-highlights li').forEach(li => {
        const label = li.querySelector('span:first-child')?.innerText?.toLowerCase() || '';
        const valor = li.querySelector('span:last-child')?.innerText || '';
        if (label.includes('dormit') || label.includes('ambien')) specs.dormitorios = parseInt(valor) || null;
        if (label.includes('baño')) specs.banios = parseInt(valor) || null;
        if (label.includes('superficie total')) specs.superficie_total = parseFloat(valor) || null;
        if (label.includes('superficie cubierta') || label.includes('superficie útil')) specs.superficie_util = parseFloat(valor) || null;
      });

      return { descripcion, fotos, es_dueno_directo: es_dueno, nombre_vendedor, ...specs };
    }, SEL, KEYWORDS_DUENO);

    return detalle;
  } catch(e) {
    console.log(`   ⚠️  Error detalle: ${e.message.substring(0,60)}`);
    return { descripcion: '', fotos: [], es_dueno_directo: false };
  } finally {
    await page.close();
  }
}

async function ejecutarMision(browser, operacion, mision, lugar) {
  const url = `https://inmuebles.mercadolibre.com.uy/${mision.cx}/${operacion}/${lugar}_PublishedToday_YES`;
  console.log(`\n🌍 ${mision.id.toUpperCase()} | ${url}`);

  const page = await browser.newPage();
  try {
    await page.setUserAgent(randUA());
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-UY,es;q=0.9' });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector(SEL.card, { timeout: 12000 }).catch(() => {});

    const items = await page.evaluate((op, misionId) => {
      const cards = document.querySelectorAll('.ui-search-layout__item, .poly-card');
      const results = [];
      cards.forEach(card => {
        const tituloEl  = card.querySelector('h2, .poly-component__title, .ui-search-item__title');
        const linkEl    = card.querySelector('a[href*="mercadolibre"], a[href*="MLA"], a[href*="MLU"]');
        const precioEl  = card.querySelector('.andes-money-amount__fraction');
        const monedaEl  = card.querySelector('.andes-money-amount__currency-symbol');
        const ubicEl    = card.querySelector('.poly-component__location, .ui-search-item__location-label, .ui-search-item__group__element');

        const titulo = tituloEl?.innerText?.trim();
        const link   = linkEl?.href?.split('?')[0].split('#')[0];
        const precio = parseFloat(precioEl?.innerText?.replace(/\./g,'').replace(',','.') || '0');
        const moneda = monedaEl?.innerText?.trim() === '$' ? 'UYU' : 'USD';
        const barrio = ubicEl?.innerText?.trim() || 'Montevideo';

        if (titulo && link && link.includes('mercadolibre')) {
          results.push({ titulo, link, precio, moneda, barrio, tipo_operacion: op, tipo_propiedad: misionId });
        }
      });
      return results;
    }, operacion, mision.id);

    console.log(`   📦 ${items.length} propiedades encontradas`);
    await page.close();
    return items;
  } catch(e) {
    console.log(`   ❌ Error listing: ${e.message.substring(0,60)}`);
    await page.close();
    return [];
  }
}

async function iniciarCaceria(config) {
  const { operacion, categoria, barrio } = config;

  let depto = 'montevideo';
  let zona = (barrio || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (zona.includes('/')) { const p = zona.split('/'); depto = p[0]; zona = p[1]; }
  const lugar = zona ? `${depto}/${zona}/` : `${depto}/`;

  const misiones = categoria === 'todas' ? MISIONES : MISIONES.filter(m => m.id === categoria);

  console.log(`\n🏹 HUNTER LOCAL v2 — ${operacion.toUpperCase()} en ${lugar.toUpperCase()}`);
  console.log(`   Misiones: ${misiones.map(m => m.id).join(', ')}\n`);

  // headless:'new' = modo headless moderno, mejor anti-detección que el viejo
  // Cambiar a false si MeLi empieza a bloquear y necesitás ver el browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1366,768',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1366, height: 768 }
  });

  let totalEnviadas = 0;
  let totalDuenos = 0;
  let totalDuplicadas = 0;

  try {
    for (let i = 0; i < misiones.length; i++) {
      const mision = misiones[i];
      const items = await ejecutarMision(browser, operacion, mision, lugar);

      for (const prop of items) {
        console.log(`   🔍 ${prop.titulo.substring(0,45)}...`);

        const detalle = await scrapearDetalle(browser, prop.link);
        const payload = {
          ...prop,
          ...detalle,
          url_original: prop.link,
          imagen_principal: detalle.fotos[0] || '',
          imagenes: JSON.stringify(detalle.fotos),
          fuente: 'meli_hunter_local',
          timestamp: new Date().toISOString()
        };

        try {
          const resp = await axios.post(N8N_WEBHOOK_URL, payload, { timeout: 15000 });
          const resultado = resp.data?.resultado || 'ok';
          if (resultado === 'duplicada') {
            console.log(`      ⏭️  Duplicada, saltando`);
            totalDuplicadas++;
          } else {
            const mark = payload.es_dueno_directo ? '🔥 DUEÑO DIRECTO' : '✅ Guardada';
            const vendedor = detalle.nombre_vendedor ? ` | ${detalle.nombre_vendedor.substring(0, 30)}` : '';
            console.log(`      ${mark} | ${detalle.fotos.length} fotos${vendedor}`);
            totalEnviadas++;
            if (payload.es_dueno_directo) totalDuenos++;

            // Enviar foto real a Telegram directamente desde esta PC
            // (el CDN de mlstatic bloquea requests de Telegram pero acepta las nuestras)
            if (detalle.fotos[0]) {
              const etiqueta = payload.es_dueno_directo ? '🔥 DUEÑO DIRECTO' : '🏠 NUEVA';
              const caption = `${etiqueta}\n<b>${payload.titulo}</b>\n💰 ${payload.moneda} ${payload.precio > 0 ? payload.precio.toLocaleString('es-UY') : 'Consultar'}\n📍 ${payload.barrio}\n📸 ${detalle.fotos.length} fotos\n🔗 <a href="${payload.url_original}">Ver en MeLi</a>`;
              const fotoOk = await enviarFotoTelegram(detalle.fotos[0], caption);
              if (fotoOk) console.log(`      📸 Foto enviada a Telegram`);
            }
          }
        } catch(e) {
          console.log(`      ❌ Error webhook: ${e.message.substring(0,50)}`);
        }

        await randDelay(2000, 4000);
      }

      if (i < misiones.length - 1) {
        console.log(`\n⏳ Pausa entre misiones (2 min)...`);
        await new Promise(r => setTimeout(r, 2 * 60 * 1000));
      }
    }

    console.log(`\n✨ MISIÓN COMPLETADA`);
    console.log(`   Guardadas: ${totalEnviadas} | Dueños directos: ${totalDuenos} | Duplicadas saltadas: ${totalDuplicadas}`);

  } finally {
    await browser.close();
  }
}

// ── Entrada ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length >= 2) {
  console.log('⏰ MODO AUTOMATIZADO');
  iniciarCaceria({ operacion: args[0], categoria: args[1], barrio: args[2] || '' });
} else {
  // Modo interactivo simple sin prompts (para Task Scheduler)
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n🏹 HUNTER LOCAL v2\n');
  console.log('Uso: node hunter_local.js [alquiler|venta] [apartamentos|casas|oficinas|locales|todas] [barrio]');
  console.log('Ej:  node hunter_local.js alquiler todas');
  console.log('Ej:  node hunter_local.js venta apartamentos pocitos\n');
  rl.question('Operación (alquiler/venta): ', op => {
    rl.question('Categoría (todas/apartamentos/casas): ', cat => {
      rl.question('Barrio (Enter = todo Montevideo): ', bar => {
        rl.close();
        iniciarCaceria({ operacion: op || 'alquiler', categoria: cat || 'todas', barrio: bar || '' });
      });
    });
  });
}
