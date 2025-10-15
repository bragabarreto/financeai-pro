/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.BASE_URL || 'https://financeai-pro.vercel.app/';
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;

function assertEnv(name, value) {
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForText(page, text, timeout = 15000) {
  await page.waitForFunction(
    (t) => document && document.body && document.body.innerText && document.body.innerText.includes(t),
    { timeout },
    text
  );
}

async function clickButtonByText(page, text) {
  const clicked = await page.evaluate((t) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => (b.textContent || '').trim().includes(t));
    if (btn) { btn.click(); return true; }
    // Try role-based clickable elements
    const clickable = Array.from(document.querySelectorAll('[role="button"]'))
      .find(b => (b.textContent || '').trim().includes(t));
    if (clickable) { clickable.click(); return true; }
    return false;
  }, text);
  if (!clicked) throw new Error(`Button with text '${text}' not found`);
}

async function run() {
  assertEnv('LOGIN_EMAIL', LOGIN_EMAIL);
  assertEnv('LOGIN_PASSWORD', LOGIN_PASSWORD);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  const results = [];
  const record = (name, ok, details = '') => {
    const item = { name, status: ok ? 'OK' : 'FAIL', details };
    results.push(item);
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} ${name}${details ? ` — ${details}` : ''}`);
  };

  try {
    // 1) Open site
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    record('Site reachable', true, BASE_URL);

    // 2) Login
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', LOGIN_EMAIL, { delay: 20 });
    await page.type('input[type="password"]', LOGIN_PASSWORD, { delay: 20 });
    await page.click('button[type="submit"]');

    // Wait for post-login markers
    await waitForText(page, 'Importar');
    await waitForText(page, 'Sair');
    record('Login flow', true, 'Header with Importar/Sair visible');

    // 3) Navigate key tabs (assert heading markers where available)
    const tabs = [
      { label: 'Gastos', marker: 'Gastos' },
      { label: 'Receitas', marker: 'Receitas' },
      { label: 'Investimentos', marker: 'Investimentos' },
    ];

    for (const t of tabs) {
      await clickButtonByText(page, t.label);
      await waitForText(page, t.marker);
      record(`Tab: ${t.label}`, true);
    }

    // Contas bancárias (has clear heading)
    await clickButtonByText(page, 'Contas bancárias');
    await waitForText(page, 'Contas Bancárias');
    record('Tab: Contas bancárias', true);

    // Configurações (perfil do usuário)
    await clickButtonByText(page, 'Configurações');
    await waitForText(page, 'Perfil do Usuário');
    record('Tab: Configurações', true);

    // 4) Open Import modal, file mode -> preview (non-destructive)
    await clickButtonByText(page, 'Importar');
    await waitForText(page, 'Importar Transações');

    // Ensure mode is Arquivo; if not, click it
    try { await clickButtonByText(page, 'Arquivo'); } catch (_) {}

    // Create temp CSV
    const tmpCsv = path.join(os.tmpdir(), `sample-${Date.now()}.csv`);
    const csv = [
      'Data,Descricao,Valor',
      '15/01/2024,RESTAURANTE ABC,150,00',
      '16/01/2024,SUPERMERCADO XYZ,250,00'
    ].join('\n');
    fs.writeFileSync(tmpCsv, csv, 'utf8');

    // Upload file
    const fileInput = await page.$('#file-upload');
    if (!fileInput) throw new Error('File input not found');
    await fileInput.uploadFile(tmpCsv);

    // Click Processar Arquivo
    await clickButtonByText(page, 'Processar Arquivo');

    // Wait preview summary markers
    await waitForText(page, 'Total de Linhas');
    await waitForText(page, 'Extraídas');
    record('Import: file -> preview', true, 'Preview counters visible');

    // Close modal with Cancelar (non-destructive)
    await clickButtonByText(page, 'Cancelar');

    // 5) Open Import modal -> Foto (ensure button present and disabled before file)
    await clickButtonByText(page, 'Importar');
    await waitForText(page, 'Importar Transações');

    try { await clickButtonByText(page, 'Foto'); } catch (_) {}

    // Check presence of Processar Foto button (may be disabled without file)
    const processFotoPresent = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => (b.textContent || '').includes('Processar Foto'));
    });
    record('Import: foto mode available', !!processFotoPresent);

    // Close modal
    try { await clickButtonByText(page, 'Cancelar'); } catch {}

    // 6) Logout
    await clickButtonByText(page, 'Sair');
    await waitForText(page, 'FinanceAI Pro');
    await page.waitForSelector('input[type="email"]');
    record('Logout flow', true);

    // Print compact JSON summary at the end
    console.log('\nJSON_SUMMARY_START');
    console.log(JSON.stringify({ baseUrl: BASE_URL, results }, null, 2));
    console.log('JSON_SUMMARY_END');

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E error:', err.message);
    try { await browser.close(); } catch {}
    process.exit(1);
  }
}

run();
