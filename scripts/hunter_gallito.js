const puppeteer = require('puppeteer');
const axios = require('axios');

const N8N_WEBHOOK_URL = 'https://n8n.automatizameuy.com/webhook/hunter-local-meli-v1';
const BASE_URL = 'https://www.gallito.com.uy';

// Selectores Gallito (validar al ejecutar — pueden cambiar)
const SEL = {
  card:       '.inmueble, .aviso, [class*="aviso-"], .producto',
  titulo:     'h2, h3, .titulo-aviso, .title',
  link:       'a[href*="gallito"]',
  precio:     '.precio, .price, [class*="precio"]',
  barrio:     '.zona, .barrio, .ubicacion, [class*="zona"]',
  foto:       'img[src*="gallito"], img[src*="cdn"], img.foto-principal',
};

const KEYWORDS_DUENO = ['dueño', 'directo', 'particular', 'sin comision', 'sin comisión', 'trato directo', 'propietario', 'vendo yo', 'alquilo yo'];

const RUTAS = {
  apartamentos: { alquiler: 'inmuebles/apartamentos-alquiler', venta: 'inmuebles/apartamentos-venta' },
  casas:        { alquiler: 'inmuebles/casas-alquiler',        venta: 'inmuebles/casas-venta' },
  oficinas:     { alquiler: 'inmuebles/oficinas-alquiler',     venta: 'inmuebles/oficinas-venta' },
  locales:      { alquiler: 'inmuebles/locales-alquiler',      venta: 'inmuebles/locales-venta' },
};

async function esperarCloudflare(page, timeout = 30000) {
  // Gallito puede tener Cloudflare — esperar que la página cargue real
  const inicio = Date.now();
  while (Date.now() - inicio < timeout) {
    const contenido = await page.evaluate(() => document.body?.innerText || '');
    if (!contenido.includes('Just a moment') && !contenido.includes('Checking your browser')) {
      return true;
    }
    console.log('   ⏳ Esperando Cloudflare...');
    await new Promise(r => setTimeout(r, 3000));
  }
  return false;
}

async function scrapearDetalle(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await esperarCloudflare(page);

    const detalle = await page.evaluate((KEYWORDS) => {
      const todos = s => Array.from(document.querySelectorAll(s));

      // Descripcion
      const descripcion = (
        document.querySelector('.descripcion, .description, [class*="descripcion"], [class*="description"]')?.innerText ||
        document.querySelector('p.descripcion, div.descripcion')?.innerText ||
        ''
      ).substring(0, 1500).trim();

      // Fotos
      const fotos = todos('img')
        .map(img => img.getAttribute('data-zoom') || img.getAttribute('data-src') || img.src || '')
        .filter(s => s.startsWith('http') && (s.includes('gallito') || s.includes('cdn')) && !s.includes('placeholder') && !s.includes('logo') && !s.includes('banner'))
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 10);

      // Detectar dueño
      const todo_texto = (descripcion + ' ' + document.body.innerText.substring(0, 3000)).toLowerCase();
      const es_dueno = KEYWORDS.some(k => todo_texto.includes(k));

      // Características
      const specs = {};
      const specsAll = todos('li, td, [class*="dato"], [class*="atributo"], [class*="caracteristica"]');
      specsAll.forEach(el => {
        const txt = el.innerText?.toLowerCase() || '';
        if (txt.includes('dormit') || txt.includes('pieza')) {
          const num = txt.match(/\d+/);
          if (num) specs.dormitorios = parseInt(num[0]);
        }
        if (txt.includes('baño')) {
          const num = txt.match(/\d+/);
          if (num) specs.banios = parseInt(num[0]);
        }
        if (txt.includes('m²') || txt.includes('m2') || txt.includes('metros')) {
          const num = txt.match(/[\d.]+/);
          if (num && parseFloat(num[0]) > 10) specs.superficie_total = parseFloat(num[0]);
        }
      });

      return { descripcion, fotos, es_dueno_directo: es_dueno, ...specs };
    }, KEYWORDS_DUENO);

    return detalle;
  } catch(e) {
    console.log(`   ⚠️  Error detalle: ${e.message.substring(0, 60)}`);
    return { descripcion: '', fotos: [], es_dueno_directo: false };
  } finally {
    await page.close();
  }
}

async function scrapearListado(browser, operacion, categoria) {
  const rutas = RUTAS[categoria];
  if (!rutas) return [];
  const ruta = rutas[operacion] || rutas['alquiler'];
  const url = `${BASE_URL}/${ruta}`;
  console.log(`\n🌍 ${categoria.toUpperCase()} ${operacion.toUpperCase()} | ${url}`);

  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

    const cfOk = await esperarCloudflare(page);
    if (!cfOk) {
      console.log(`   ❌ Cloudflare no se resolvió`);
      await page.close();
      return [];
    }

    // Esperar cualquier selector de aviso
    await page.waitForSelector('.inmueble, .aviso, [id*="aviso"], .producto', { timeout: 10000 }).catch(() => {});

    const items = await page.evaluate((op, cat, BASE) => {
      // Gallito: los avisos suelen tener id como "Aviso_12345" o class "aviso"
      const cards = document.querySelectorAll('.inmueble, .aviso, [id^="Aviso_"], [class*="aviso-resultado"], .producto-item');
      const results = [];

      cards.forEach(card => {
        const tituloEl = card.querySelector('h2, h3, .titulo, .title, [class*="titulo"]');
        const linkEl   = card.querySelector('a[href]');
        const precioEl = card.querySelector('[class*="precio"], .price, .monto');
        const barrioEl = card.querySelector('[class*="zona"], [class*="barrio"], [class*="ubic"]');
        const fotoEl   = card.querySelector('img');

        const titulo = tituloEl?.innerText?.trim();
        const href   = linkEl?.getAttribute('href') || '';
        const link   = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? href : '/' + href}`;
        const precioTexto = precioEl?.innerText?.trim() || '0';
        const moneda = (precioTexto.includes('U$S') || precioTexto.includes('USD') || precioTexto.includes('$U') ) ? 'USD' : 'UYU';
        const precio = parseFloat(precioTexto.replace('U$S', '').replace('USD', '').replace('$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
        const barrio = barrioEl?.innerText?.trim() || 'Montevideo';
        const imagen = fotoEl?.src || fotoEl?.getAttribute('data-src') || '';

        if (titulo && href) {
          results.push({ titulo, link, precio, moneda, barrio, tipo_operacion: op, tipo_propiedad: cat, imagen_principal: imagen });
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
    ? Object.keys(RUTAS)
    : [categoria];

  console.log(`\n🐓 HUNTER GALLITO v1 — ${operacion.toUpperCase()}`);
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
      const items = await scrapearListado(browser, operacion, cat);

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
          fuente: 'gallito_hunter',
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

        await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500));
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
  console.log('\n🐓 HUNTER GALLITO v1\n');
  console.log('Uso: node hunter_gallito.js [alquiler|venta] [apartamentos|casas|oficinas|locales|todas]');
  console.log('Ej:  node hunter_gallito.js alquiler todas\n');
  rl.question('Operación (alquiler/venta): ', op => {
    rl.question('Categoría (todas/apartamentos/casas): ', cat => {
      rl.close();
      iniciarCaceria({ operacion: op || 'alquiler', categoria: cat || 'todas' });
    });
  });
}
