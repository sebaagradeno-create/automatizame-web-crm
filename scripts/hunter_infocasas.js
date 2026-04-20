const puppeteer = require('puppeteer');
const axios = require('axios');

const N8N_WEBHOOK_URL = 'https://n8n.automatizameuy.com/webhook/hunter-local-meli-v1';
const BASE_URL = 'https://www.infocasas.com.uy';

// Selectores InfoCasas (validados abril 2026)
const SEL = {
  card:       '.listingBoxCard',
  titulo:     'h2.lc-title',
  link:       'a[href*="/"]',
  precio:     '.property-price-tag .main-price',
  barrio:     '.lc-location strong',
  foto:       '.lc-cardCover img, .cardImageGallery img',
  // Detalle
  descripcion:  '.description-text, .property-description, p.description',
  fotos:        '.gallery-image img, .photo-gallery img, .swiper-slide img',
  dormitorios:  '[class*="dorm"] span, [class*="bedroom"] span',
  banios:       '[class*="baño"] span, [class*="bathroom"] span',
  superficie:   '[class*="superf"] span, [class*="area"] span',
  dueno:        '.owner-tag, .particular-tag, [class*="particular"], [class*="owner"]',
};

const KEYWORDS_DUENO = ['dueño', 'directo', 'particular', 'sin comision', 'sin comisión', 'trato directo', 'propietario'];

const CATEGORIAS = {
  apartamentos: { alquiler: 'alquiler/apartamentos', venta: 'venta/apartamentos' },
  casas:        { alquiler: 'alquiler/casas',        venta: 'venta/casas' },
  oficinas:     { alquiler: 'alquiler/oficinas',     venta: 'venta/oficinas' },
  locales:      { alquiler: 'alquiler/locales',      venta: 'venta/locales' },
};

async function scrapearDetalle(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('.gallery-image img, .photo-gallery img', { timeout: 8000 }).catch(() => {});

    const detalle = await page.evaluate((SEL, KEYWORDS) => {
      const texto = s => document.querySelector(s)?.innerText?.trim() || '';
      const todos  = s => Array.from(document.querySelectorAll(s));

      const descripcion = texto(SEL.descripcion).substring(0, 1500);

      // Fotos
      const fotos = todos(SEL.fotos)
        .map(img => {
          const src = img.getAttribute('data-zoom')
            || img.getAttribute('data-src')
            || img.getAttribute('data-lazy')
            || img.src || '';
          return src.replace(/\?.*$/, '');
        })
        .filter(s => s.startsWith('http') && !s.includes('placeholder') && !s.includes('no-image') && !s.includes('logo'))
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 10);

      // Detectar dueño directo
      const todo_texto = (descripcion + ' ' + document.body.innerText).toLowerCase();
      const es_dueno = KEYWORDS.some(k => todo_texto.includes(k));

      // Características
      const specs = {};
      const specsAll = todos('[class*="attribute"], [class*="feature"], [class*="spec"], li[class*="detail"]');
      specsAll.forEach(el => {
        const txt = el.innerText?.toLowerCase() || '';
        if (txt.includes('dormit') || txt.includes('ambien') || txt.includes('dorm')) {
          const num = txt.match(/\d+/);
          if (num) specs.dormitorios = parseInt(num[0]);
        }
        if (txt.includes('baño')) {
          const num = txt.match(/\d+/);
          if (num) specs.banios = parseInt(num[0]);
        }
        if (txt.includes('superficie') || txt.includes('m²') || txt.includes('m2')) {
          const num = txt.match(/[\d.]+/);
          if (num) specs.superficie_total = parseFloat(num[0]);
        }
      });

      return { descripcion, fotos, es_dueno_directo: es_dueno, ...specs };
    }, SEL, KEYWORDS_DUENO);

    return detalle;
  } catch(e) {
    console.log(`   ⚠️  Error detalle: ${e.message.substring(0, 60)}`);
    return { descripcion: '', fotos: [], es_dueno_directo: false };
  } finally {
    await page.close();
  }
}

async function scrapearListado(browser, operacion, categoria, lugar) {
  const cat = CATEGORIAS[categoria];
  if (!cat) return [];
  const path = cat[operacion] || cat['alquiler'];
  const url = `${BASE_URL}/${path}/montevideo`;
  console.log(`\n🌍 ${categoria.toUpperCase()} ${operacion.toUpperCase()} | ${url}`);

  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector(SEL.card, { timeout: 12000 }).catch(() => {});

    const items = await page.evaluate((op, cat, BASE) => {
      const cards = document.querySelectorAll('.listingBoxCard');
      const results = [];
      cards.forEach(card => {
        const tituloEl = card.querySelector('h2.lc-title');
        const linkEl   = card.querySelector('a[href]');
        const precioEl = card.querySelector('.property-price-tag .main-price');
        const barrioEl = card.querySelector('.lc-location strong');
        const fotoEl   = card.querySelector('img[src*="cdn"]');

        const titulo = tituloEl?.innerText?.trim();
        const href   = linkEl?.getAttribute('href') || '';
        const link   = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? href : '/' + href}`;
        const precioTexto = precioEl?.innerText?.trim() || '0';
        const moneda = precioTexto.includes('U$S') || precioTexto.includes('USD') ? 'USD' : 'UYU';
        const precio = parseFloat(precioTexto.replace('U$S', '').replace('$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
        const barrio = barrioEl?.innerText?.trim() || 'Montevideo';
        const imagen_principal = fotoEl?.src || '';

        if (titulo && href && !href.includes('/alquiler/') && !href.includes('/venta/')) {
          results.push({ titulo, link, precio, moneda, barrio, tipo_operacion: op, tipo_propiedad: cat, imagen_principal });
        }
      });
      return results;
    }, operacion, categoria, BASE_URL);

    console.log(`   📦 ${items.length} propiedades encontradas`);
    await page.close();
    return items;
  } catch(e) {
    console.log(`   ❌ Error listing: ${e.message.substring(0, 60)}`);
    await page.close();
    return [];
  }
}

async function iniciarCaceria(config) {
  const { operacion, categoria } = config;

  const cats = categoria === 'todas'
    ? Object.keys(CATEGORIAS)
    : [categoria];

  console.log(`\n🏠 HUNTER INFOCASAS v1 — ${operacion.toUpperCase()}`);
  console.log(`   Categorías: ${cats.join(', ')}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox']
  });

  let totalEnviadas = 0;
  let totalDuenos = 0;
  let totalDuplicadas = 0;

  try {
    for (let i = 0; i < cats.length; i++) {
      const cat = cats[i];
      const items = await scrapearListado(browser, operacion, cat, 'montevideo');

      for (const prop of items) {
        console.log(`   🔍 ${prop.titulo.substring(0, 45)}...`);

        const detalle = await scrapearDetalle(browser, prop.link);
        const fotos = detalle.fotos.length > 0 ? detalle.fotos : (prop.imagen_principal ? [prop.imagen_principal] : []);

        const payload = {
          ...prop,
          ...detalle,
          url_original: prop.link,
          imagen_principal: fotos[0] || prop.imagen_principal || '',
          imagenes: JSON.stringify(fotos),
          fuente: 'infocasas_hunter',
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
            console.log(`      ${mark} | ${fotos.length} fotos`);
            totalEnviadas++;
            if (payload.es_dueno_directo) totalDuenos++;
          }
        } catch(e) {
          console.log(`      ❌ Error webhook: ${e.message.substring(0, 50)}`);
        }

        await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
      }

      if (i < cats.length - 1) {
        console.log(`\n⏳ Pausa entre categorías (30 seg)...`);
        await new Promise(r => setTimeout(r, 30000));
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
  iniciarCaceria({ operacion: args[0], categoria: args[1] });
} else {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n🏠 HUNTER INFOCASAS v1\n');
  console.log('Uso: node hunter_infocasas.js [alquiler|venta] [apartamentos|casas|oficinas|locales|todas]');
  console.log('Ej:  node hunter_infocasas.js alquiler todas\n');
  rl.question('Operación (alquiler/venta): ', op => {
    rl.question('Categoría (todas/apartamentos/casas): ', cat => {
      rl.close();
      iniciarCaceria({ operacion: op || 'alquiler', categoria: cat || 'todas' });
    });
  });
}
