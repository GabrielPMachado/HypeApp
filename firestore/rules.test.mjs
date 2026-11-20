// Testes das regras do Firestore no emulador: `npm run test:rules` (precisa de Java 21).
// Cobrem o limite de hype (30 min) e de avaliação (24 h) por bar: o limite só vale se a
// marca for gravada no mesmo lote; antes, bastava não gravá-la para hypar sem parar.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, writeBatch, arrayUnion, serverTimestamp, increment } from 'firebase/firestore';

const rules = readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8');
const env = await initializeTestEnvironment({ projectId: 'demo-hype', firestore: { rules } });

const RATING = { music: 4, price: 3, service: 4, ambiance: 5 };
const report = (id) => ({ id, authorId: 'u1', score: 7, createdAt: 'x' });
const review = (id) => ({ id, authorId: 'u1', comment: 'bom lugar', rating: RATING, createdAt: 'x' });

let falhas = 0;
async function caso(nome, promessa, devePassar) {
  try {
    await (devePassar ? assertSucceeds(promessa) : assertFails(promessa));
    console.log('ok   ', nome);
  } catch (e) {
    falhas += 1;
    console.log('FALHA', nome, '-', e.message);
  }
}

async function semear(venue) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'venues/v1'), venue);
    await setDoc(doc(db, 'users/u1'), { displayName: 'Ana', hypeReportCount: 0, reviewCount: 0, spentCoins: 0, inventory: [] });
  });
  return env.authenticatedContext('u1').firestore();
}

function hype(db, id, { marca = true, pontos = true } = {}) {
  const b = writeBatch(db);
  b.update(doc(db, 'venues/v1'), { hypeReports: arrayUnion(report(id)) });
  if (marca) b.set(doc(db, 'venues/v1/rateLimits/u1'), { lastReportAt: serverTimestamp() });
  if (pontos) b.update(doc(db, 'users/u1'), { hypeReportCount: increment(1), lastAwardVenueId: 'v1' });
  return b.commit();
}

function avaliar(db, id, { marca = true, pontos = true } = {}) {
  const b = writeBatch(db);
  b.update(doc(db, 'venues/v1'), { reviews: arrayUnion(review(id)) });
  if (marca) b.set(doc(db, 'venues/v1/reviewLimits/u1'), { lastReviewAt: serverTimestamp() });
  if (pontos) b.update(doc(db, 'users/u1'), { reviewCount: increment(1), lastAwardVenueId: 'v1' });
  return b.commit();
}

for (const [rotulo, venue] of [
  ['bar sem nada', { hypeReports: [], reviews: [] }],
  ['bar com hype e avaliação', {
    hypeReports: [{ id: 'z', authorId: 'u9', score: 5 }],
    reviews: [{ id: 'zz', authorId: 'u9', comment: 'ok', rating: RATING }],
  }],
]) {
  console.log(`\n${rotulo}`);
  let db = await semear(venue);
  await caso('hype sem a marca de limite é negado', hype(db, 'a', { marca: false }), false);
  await caso('hype com a marca passa (e soma pontos)', hype(db, 'b'), true);
  await caso('segundo hype em 30 min é negado', hype(db, 'c'), false);
  await caso('segundo hype sem a marca também é negado', hype(db, 'd', { marca: false, pontos: false }), false);
  db = await semear(venue);
  await caso('avaliação sem a marca é negada', avaliar(db, 'a', { marca: false }), false);
  await caso('avaliação com a marca passa (e soma pontos)', avaliar(db, 'b'), true);
  await caso('segunda avaliação em 24 h é negada', avaliar(db, 'c'), false);
}

await env.cleanup();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
