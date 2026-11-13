import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where, writeBatch, increment, arrayUnion, arrayRemove, serverTimestamp, setLogLevel } from 'firebase/firestore';
import fs from 'fs';

setLogLevel('error');
const env = await initializeTestEnvironment({
  projectId: 'demo-rpg-naruto',
  firestore: { rules: fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8085 }
});

const A = 'jogadorA', B = 'jogadorB', ADM = 'kage';
const dbA = () => env.authenticatedContext(A, { email: 'a@teste.com' }).firestore();
const dbB = () => env.authenticatedContext(B, { email: 'b@teste.com' }).firestore();
const dbAdm = () => env.authenticatedContext(ADM, { email: 'admin@rpgnaruto.com' }).firestore();
const dbConselheiro = () => env.authenticatedContext('cons', { email: 'conselheiro@rpgnaruto.com' }).firestore();

async function semear() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const s = (c, id, d) => setDoc(doc(db, c, id), d);
    await s('game_config', 'sistema_nivel', { tabela_xp: [300, 500, 800] });
    await s('users', A, { nome: 'Kenji', ryos: 1000, essencia_ninja: 50, nivel: 3, xp: 900, vida: 100, chakra: 80, stamina: 60,
      inventario: { kunai: 2 }, meusJutsus: [], statusMissoes: { m1: 'aprovado' }, statusConquistas: { c1: 'aprovado' }, ultimoGiroRoleta: 0, premios_pendentes: [] });
    await s('users', B, { nome: 'Aiko', ryos: 100, essencia_ninja: 5 });
    await s('jutsus', 'j1', { nome: 'Rasengan', preco: 300, requisito: 2 });
    await s('jutsus', 'j2', { nome: 'Chidori', preco: 999, preco_en: 20 });
    await s('jutsus', 'j3', { nome: 'Proibido', preco: 10, requisito: 9 });
    await s('jutsus', 'jpromo', { nome: 'Promo', preco: 500, preco_promocional: 400 });
    await s('jutsus', 'jtexto', { nome: 'Antigo', preco: '150', requisito: '1' });
    await s('itens', 'i1', { nome: 'Ramen', preco: 50 });
    await s('ferramentas', 'kunai', { nome: 'Kunai', preco: 100 });
    await s('missoes', 'm1', { titulo: 'Gato', recompensa: 500, xp: 100, en: 5, rank: 'C' });
    await s('missoes', 'm2', { titulo: 'Escolta', recompensa: 900, xp: 50, en: 0, rank: 'B' });
    await s('missoes', 'm3', { titulo: 'Não aprovada', recompensa: 100, xp: 10, en: 0, rank: 'D' });
    await s('conquistas', 'c1', { titulo: 'Primeiro sangue', recompensa: 200, xp: 50, en: 3 });
    await s('mentores', 'mt1', { nome: 'Aiko (jogadora)', uid_player: B, ensinos: [{ nome: 'Juuken', preco: 200 }] });
    await s('mentores', 'mt2', { nome: 'NPC', ensinos: [{ nome: 'Selos', preco: 10, moeda: 'essencia_ninja' }] });
    await s('posts', 'p1', { uid: B, autor: 'Aiko', conteudo: 'oi', likes: [], comentarios: [] });
    await s('chats', `${A}_${B}`, { participantes: [A, B] });
    await s('desafios_batalha', 'd1', { desafianteId: A, desafiadoId: B, status: 'pendente' });
  });
}

const resultados = [];
async function caso(nome, esperado, fn) {
  await semear();
  try {
    await (esperado ? assertSucceeds(fn()) : assertFails(fn()));
    resultados.push(['✅', nome]);
  } catch (e) {
    resultados.push(['❌', nome + '  →  ' + (e.message || e).split('\n')[0]]);
  }
}
const uA = (db) => doc(db, 'users', A);
const ultimo = (x) => ({ ...x });

// ---------- Saldo direto ----------
await caso('Jogador NÃO pode se dar Ryos', false, () => updateDoc(uA(dbA()), { ryos: 999999 }));
await caso('Jogador NÃO pode se dar EN com increment', false, () => updateDoc(uA(dbA()), { essencia_ninja: increment(100) }));
await caso('Jogador NÃO pode mudar o próprio cargo/salário', false, () => updateDoc(uA(dbA()), { cargo: 'Hokage', salario: 99999 }));
await caso('Jogador NÃO pode se dar XP', false, () => updateDoc(uA(dbA()), { xp: 99999 }));
await caso('Jogador NÃO pode mexer na ficha de outro', false, () => updateDoc(doc(dbA(), 'users', B), { ryos: 0 }));
await caso('Jogador PODE editar perfil (nome, avatar, história)', true, () => updateDoc(uA(dbA()), { nome: 'Kenji U.', avatar: 'x', historiaTexto: 'abc', isOnline: true, postsSalvos: arrayUnion('p1') }));

// ---------- Compras ----------
const compraJutsu = (db, id, moeda, preco) => updateDoc(uA(db), { [moeda]: increment(-preco), meusJutsus: arrayUnion(id), [`maestrias.${id}`]: 0, ultimaCompra: { tipo: 'jutsu', id } });
await caso('Comprar jutsu no preço certo', true, () => compraJutsu(dbA(), 'j1', 'ryos', 300));
await caso('Comprar jutsu pagando MENOS', false, () => compraJutsu(dbA(), 'j1', 'ryos', 1));
await caso('Comprar jutsu sem nível suficiente', false, () => compraJutsu(dbA(), 'j3', 'ryos', 10));
await caso('Comprar jutsu em EN no preço certo', true, () => compraJutsu(dbA(), 'j2', 'essencia_ninja', 20));
await caso('Comprar jutsu de EN pagando em Ryos', false, () => compraJutsu(dbA(), 'j2', 'ryos', 20));
await caso('Comprar jutsu na promoção', true, () => compraJutsu(dbA(), 'jpromo', 'ryos', 400));
await caso('Comprar jutsu com preço cadastrado como texto', true, () => compraJutsu(dbA(), 'jtexto', 'ryos', 150));
await caso('Comprar jutsu sem dinheiro suficiente', false, async () => {
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'users', A), { ryos: 100 }));
  return compraJutsu(dbA(), 'j1', 'ryos', 300);
});
const compraItem = (db, tipo, id, qtd, total) => updateDoc(uA(db), { ryos: increment(-total), [`inventario.${id}`]: increment(qtd), ultimaCompra: { tipo, id } });
await caso('Comprar 3 itens no preço certo', true, () => compraItem(dbA(), 'itens', 'i1', 3, 150));
await caso('Comprar 3 itens pagando por 1', false, () => compraItem(dbA(), 'itens', 'i1', 3, 50));
await caso('Comprar ferramenta (kunai) no preço certo', true, () => compraItem(dbA(), 'ferramentas', 'kunai', 2, 200));
await caso('Comprar o mesmo item 2 vezes seguidas', true, async () => {
  await compraItem(dbA(), 'itens', 'i1', 1, 50);
  return compraItem(dbA(), 'itens', 'i1', 1, 50);
});
await caso('Ganhar item sem pagar', false, () => updateDoc(uA(dbA()), { 'inventario.i1': increment(5) }));
await caso('Comprovante de um item barato para levar outro', false, () => updateDoc(uA(dbA()), { ryos: increment(-50), 'inventario.kunai': increment(1), ultimaCompra: { tipo: 'itens', id: 'i1' } }));

// ---------- Inventário ----------
await caso('Usar 1 kunai do inventário', true, () => updateDoc(uA(dbA()), { 'inventario.kunai': increment(-1), ultimoConsumo: 'kunai' }));
await caso('"Usar" item aumentando a quantidade', false, () => updateDoc(uA(dbA()), { 'inventario.kunai': increment(1), ultimoConsumo: 'kunai' }));

// ---------- Missões e conquistas ----------
await caso('Aceitar missão nova', true, () => updateDoc(uA(dbA()), { 'statusMissoes.m2': 'em_andamento', ultimaSolicitacao: 'm2' }));
await caso('Aprovar a própria missão', false, () => updateDoc(uA(dbA()), { 'statusMissoes.m2': 'aprovado', ultimaSolicitacao: 'm2' }));
await caso('Pedir conquista', true, async () => {
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'users', A), { statusConquistas: {} }));
  return updateDoc(uA(dbA()), { 'statusConquistas.c1': 'solicitado', ultimaSolicitacao: 'c1' });
});
const coletaM = (db, id, r, x, e, campo) => updateDoc(uA(db), { ryos: increment(r), xp: increment(x), essencia_ninja: increment(e), [campo]: increment(1), [`statusMissoes.${id}`]: 'concluido', ultimaColeta: { tipo: 'missao', id } });
await caso('Coletar missão APROVADA no valor certo', true, () => coletaM(dbA(), 'm1', 500, 100, 5, 'missoes_concluidas_c'));
await caso('Coletar missão aprovada com valor MAIOR', false, () => coletaM(dbA(), 'm1', 5000, 100, 5, 'missoes_concluidas_c'));
await caso('Coletar missão NÃO aprovada', false, () => coletaM(dbA(), 'm3', 100, 10, 0, 'missoes_concluidas_d'));
await caso('Coletar a mesma missão 2 vezes', false, async () => {
  await coletaM(dbA(), 'm1', 500, 100, 5, 'missoes_concluidas_c');
  return coletaM(dbA(), 'm1', 500, 100, 5, 'missoes_concluidas_c');
});
await caso('Coletar conquista aprovada', true, () => updateDoc(uA(dbA()), { ryos: increment(200), xp: increment(50), essencia_ninja: increment(3), 'statusConquistas.c1': 'concluido', ultimaColeta: { tipo: 'conquista', id: 'c1' } }));

// ---------- Banco Ninja / nível ----------
await caso('Trocar 10 EN por 100 Ryos', true, () => updateDoc(uA(dbA()), { ryos: increment(100), essencia_ninja: increment(-10) }));
await caso('Trocar 105 Ryos (custa 11 EN, arredonda p/ cima)', true, () => updateDoc(uA(dbA()), { ryos: increment(105), essencia_ninja: increment(-11) }));
await caso('Trocar pagando menos EN', false, () => updateDoc(uA(dbA()), { ryos: increment(100), essencia_ninja: increment(-1) }));
await caso('Subir de nível com XP suficiente', true, () => updateDoc(uA(dbA()), { nivel: 4, xp: 100 }));
await caso('Subir de nível sem descontar o XP', false, () => updateDoc(uA(dbA()), { nivel: 4, xp: 900 }));
await caso('Pular 2 níveis', false, () => updateDoc(uA(dbA()), { nivel: 5, xp: 100 }));

// ---------- Combate ----------
await caso('Gastar chakra/stamina/vida em combate', true, () => updateDoc(uA(dbA()), { chakra: increment(-20), stamina: 30, vida: 70 }));
await caso('Recuperar vida sozinho', false, () => updateDoc(uA(dbA()), { vida: 150 }));

// ---------- Presentes ----------
function presente(dbX, de, para, qtd, ganho = qtd, tipo = 'ryos') {
  const t = doc(collection(dbX, 'transferencias'));
  const b = writeBatch(dbX);
  b.set(t, { de, para, tipo, qtd, motivo: 'presente', data: serverTimestamp() });
  b.update(doc(dbX, 'users', de), { [tipo]: increment(-qtd), ultimaTransferencia: t.id });
  b.update(doc(dbX, 'users', para), { [tipo]: increment(ganho), ultimaTransferenciaRecebida: t.id });
  return b.commit();
}
await caso('Presentear 100 Ryos (sai de A, entra em B)', true, () => presente(dbA(), A, B, 100));
await caso('Presentear EN', true, () => presente(dbA(), A, B, 10, 10, 'essencia_ninja'));
await caso('Presente em que B recebe MAIS do que A pagou', false, () => presente(dbA(), A, B, 100, 1000));
await caso('Presentear mais do que tem', false, () => presente(dbA(), A, B, 5000));
await caso('Fingir presente vindo de outro jogador', false, () => presente(dbA(), B, A, 50));
await caso('Comprovante solto, sem mexer em saldo', false, () => setDoc(doc(dbA(), 'transferencias', 'x'), { de: A, para: B, tipo: 'ryos', qtd: 10, motivo: 'presente' }));

// ---------- Mentorias ----------
function mentoria(dbX, mentorId, idx, para, tipo, qtd) {
  const t = doc(collection(dbX, 'transferencias'));
  const b = writeBatch(dbX);
  b.set(t, { de: A, para, tipo, qtd, motivo: 'mentoria', mentorId, ensinoIdx: idx, data: serverTimestamp() });
  b.update(doc(dbX, 'users', A), { [tipo]: increment(-qtd), aprendizados: arrayUnion('x'), ultimaTransferencia: t.id });
  if (para) b.update(doc(dbX, 'users', para), { [tipo]: increment(qtd), ultimaTransferenciaRecebida: t.id });
  return b.commit();
}
await caso('Pagar mentoria a um jogador-mentor', true, () => mentoria(dbA(), 'mt1', 0, B, 'ryos', 200));
await caso('Pagar mentoria de NPC (em EN)', true, () => mentoria(dbA(), 'mt2', 0, null, 'essencia_ninja', 10));
await caso('Pagar mentoria com preço errado', false, () => mentoria(dbA(), 'mt1', 0, B, 'ryos', 1));

// ---------- Roleta ----------
const premio = (pago) => arrayUnion({ id: Date.now(), nome: '5.000 Ryos', tipo: 'moeda_ryos', valor: 5000, pago, data: 'hoje' });
await caso('Giro grátis registra prêmio pendente', true, () => updateDoc(uA(dbA()), { ultimoGiroRoleta: Date.now(), premios_pendentes: premio(false) }));
await caso('2º giro grátis na mesma semana', false, async () => {
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'users', A), { ultimoGiroRoleta: Date.now() - 1000 }));
  return updateDoc(uA(dbA()), { ultimoGiroRoleta: Date.now(), premios_pendentes: premio(false) });
});
await caso('Giro pago (15 EN)', true, () => updateDoc(uA(dbA()), { essencia_ninja: increment(-15), premios_pendentes: premio(true) }));
await caso('Giro pago sem pagar', false, () => updateDoc(uA(dbA()), { premios_pendentes: premio(true) }));
await caso('Roleta creditando Ryos direto', false, () => updateDoc(uA(dbA()), { ultimoGiroRoleta: Date.now(), ryos: increment(5000) }));

// ---------- Resgate de prêmios da roleta ----------
const PREMIOS = [
  { item: 'Jutsu Rank B', data: '21/05/2026' },                                  // formato antigo (sem id)
  { id: 1, nome: '1 Ferramenta', tipo: 'item_manual', valor: 'Ferramenta Especial', data: 'x' },
  { id: 2, nome: '+1 Modificador', tipo: 'item_manual', valor: 'Modificador de Atributo', data: 'x' },
  { item: 'Jutsu Rank B', data: '21/05/2026' }                                   // duplicado idêntico
];
async function semearPremios() {
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await updateDoc(doc(db, 'users', A), { premios_pendentes: PREMIOS, forca: 10 });
    await setDoc(doc(db, 'jutsus', 'jb'), { nome: 'Rank B', rank: 'B', preco: 5000 });
    await setDoc(doc(db, 'jutsus', 'ja'), { nome: 'Rank A', rank: 'A', preco: 9000 });
    await setDoc(doc(db, 'jutsus', 'jbx'), { nome: 'B exclusivo', rank: 'B', restrito_a: ['Outro'] });
    await setDoc(doc(db, 'ferramentas', 'fuuma'), { nome: 'Fuuma', premio_roleta: 'Ferramenta Especial' });
  });
}
const sem = (i) => PREMIOS.filter((_, k) => k !== i);
await caso('Resgate: Jutsu Rank B (prêmio antigo sem id)', true, async () => { await semearPremios(); return updateDoc(uA(dbA()), { meusJutsus: ['jb'], premios_pendentes: sem(0), ultimoResgate: { indice: 0, tipo: 'jutsu', id: 'jb' } }); });
await caso('Resgate: tira só UM de dois prêmios iguais', true, async () => { await semearPremios(); return updateDoc(uA(dbA()), { meusJutsus: ['jb'], premios_pendentes: sem(3), ultimoResgate: { indice: 3, tipo: 'jutsu', id: 'jb' } }); });
await caso('Resgate: jutsu Rank A com prêmio de Rank B', false, async () => { await semearPremios(); return updateDoc(uA(dbA()), { meusJutsus: ['ja'], premios_pendentes: sem(0), ultimoResgate: { indice: 0, tipo: 'jutsu', id: 'ja' } }); });
await caso('Resgate: jutsu exclusivo de outro personagem', false, async () => { await semearPremios(); return updateDoc(uA(dbA()), { meusJutsus: ['jbx'], premios_pendentes: sem(0), ultimoResgate: { indice: 0, tipo: 'jutsu', id: 'jbx' } }); });
await caso('Resgate: jutsu sem tirar o prêmio da lista', false, async () => { await semearPremios(); return updateDoc(uA(dbA()), { meusJutsus: ['jb'], ultimoResgate: { indice: 0, tipo: 'jutsu', id: 'jb' } }); });
await caso('Resgate: usar o prêmio de Ferramenta para pegar jutsu', false, async () => { await semearPremios(); return updateDoc(uA(dbA()), { meusJutsus: ['jb'], premios_pendentes: sem(1), ultimoResgate: { indice: 1, tipo: 'jutsu', id: 'jb' } }); });
await caso('Resgate: Ferramenta Especial marcada no catálogo', true, async () => { await semearPremios(); return updateDoc(uA(dbA()), { 'inventario.fuuma': 1, premios_pendentes: sem(1), ultimoResgate: { indice: 1, tipo: 'ferramentas', id: 'fuuma' } }); });
await caso('Resgate: ferramenta NÃO marcada como prêmio', false, async () => { await semearPremios(); return updateDoc(uA(dbA()), { 'inventario.kunai': 3, premios_pendentes: sem(1), ultimoResgate: { indice: 1, tipo: 'ferramentas', id: 'kunai' } }); });
await caso('Resgate: pegar 5 ferramentas com 1 prêmio', false, async () => { await semearPremios(); return updateDoc(uA(dbA()), { 'inventario.fuuma': 5, premios_pendentes: sem(1), ultimoResgate: { indice: 1, tipo: 'ferramentas', id: 'fuuma' } }); });
await caso('Resgate: Modificador +50 na Força', true, async () => { await semearPremios(); return updateDoc(uA(dbA()), { forca: 60, premios_pendentes: sem(2), ultimoResgate: { indice: 2, tipo: 'atributo', id: 'forca' } }); });
await caso('Resgate: Modificador +100 na Força', false, async () => { await semearPremios(); return updateDoc(uA(dbA()), { forca: 110, premios_pendentes: sem(2), ultimoResgate: { indice: 2, tipo: 'atributo', id: 'forca' } }); });
await caso('Resgate: Modificador em Ryos', false, async () => { await semearPremios(); return updateDoc(uA(dbA()), { ryos: 1001, premios_pendentes: sem(2), ultimoResgate: { indice: 2, tipo: 'atributo', id: 'ryos' } }); });
await caso('Resgate: Modificador +50 na Vida máxima', true, async () => { await semearPremios(); await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'users', A), { max_vida: 1800 })); return updateDoc(uA(dbA()), { max_vida: 1850, premios_pendentes: sem(2), ultimoResgate: { indice: 2, tipo: 'atributo', id: 'max_vida' } }); });
await caso('Kage limpa todos os prêmios pendentes', true, async () => { await semearPremios(); return updateDoc(doc(dbAdm(), 'users', A), { premios_pendentes: [] }); });

// ---------- Cofre da Vila ----------
const abrirCofre = () => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'vila', 'banco'), { saldo: 1000000 }));
const BANCO = (dbX) => doc(dbX, 'vila', 'banco');
const MOV = (dbX, id) => doc(dbX, 'vila_movimentos', id);
const mov = (tipo, valor, ref = '') => ({ uid: A, nome: 'Kenji', tipo, valor, data: serverTimestamp(), ref });
function entrada(b, dbX, id, tipo, valor, ref) { b.set(MOV(dbX, id), mov(tipo, valor, ref)); b.update(BANCO(dbX), { saldo: increment(valor), ultimoMov: id }); }
function compraJutsuComImposto(dbX, imposto, movId = 'c1') {
  const b = writeBatch(dbX);
  b.update(uA(dbX), { ryos: increment(-300), meusJutsus: ['j1'], 'maestrias.j1': 0, ultimaCompra: { tipo: 'jutsu', id: 'j1', mov: movId } });
  entrada(b, dbX, movId, 'imposto_loja', imposto); return b.commit();
}
await caso('Cofre: compra em Ryos paga 10% para a vila', true, async () => { await abrirCofre(); return compraJutsuComImposto(dbA(), 30); });
await caso('Cofre: imposto inflado (vila ganha mais que 10%)', false, async () => { await abrirCofre(); return compraJutsuComImposto(dbA(), 3000); });
await caso('Cofre: "imposto" sem compra nenhuma', false, async () => { await abrirCofre(); const db = dbA(); const b = writeBatch(db); entrada(b, db, 'x1', 'imposto_loja', 30); return b.commit(); });
await caso('Cofre: compra de 3 itens paga 10% do total', true, async () => {
  await abrirCofre(); const db = dbA(); const b = writeBatch(db);
  b.update(uA(db), { ryos: increment(-150), 'inventario.i1': 3, ultimaCompra: { tipo: 'itens', id: 'i1', mov: 'c2' } });
  entrada(b, db, 'c2', 'imposto_loja', 15); return b.commit();
});
await caso('Cofre: compra em EN não gera imposto', false, async () => {
  await abrirCofre(); const db = dbA(); const b = writeBatch(db);
  b.update(uA(db), { essencia_ninja: increment(-20), meusJutsus: ['j2'], 'maestrias.j2': 0, ultimaCompra: { tipo: 'jutsu', id: 'j2', mov: 'c3' } });
  entrada(b, db, 'c3', 'imposto_loja', 99); return b.commit();
});
const coletarComTaxa = (dbX, taxa, id = 'missao_' + A + '_m1') => { const b = writeBatch(dbX);
  b.update(uA(dbX), { ryos: increment(500), xp: increment(100), essencia_ninja: increment(5), missoes_concluidas_c: increment(1), 'statusMissoes.m1': 'concluido', ultimaColeta: { tipo: 'missao', id: 'm1' } });
  entrada(b, dbX, id, 'missao', taxa); return b.commit(); };
await caso('Cofre: missão rende 20% para a vila', true, async () => { await abrirCofre(); return coletarComTaxa(dbA(), 100); });
await caso('Cofre: missão rendendo mais que 20%', false, async () => { await abrirCofre(); return coletarComTaxa(dbA(), 500); });
await caso('Cofre: taxa de missão com comprovante de outro id', false, async () => { await abrirCofre(); return coletarComTaxa(dbA(), 100, 'qualquer'); });
const doar = (dbX, v, noBanco = v, id = 'd' + v) => { const b = writeBatch(dbX);
  b.update(uA(dbX), { ryos: increment(-v), doado_vila: increment(v), ultimaDoacao: id });
  entrada(b, dbX, id, 'doacao', noBanco); return b.commit(); };
await caso('Cofre: doar 200 Ryos', true, async () => { await abrirCofre(); return doar(dbA(), 200); });
await caso('Cofre: doar 10 e o cofre receber 1000', false, async () => { await abrirCofre(); return doar(dbA(), 10, 1000); });
await caso('Cofre: doar mais do que tem', false, async () => { await abrirCofre(); return doar(dbA(), 5000); });
await caso('Cofre: jogador tira dinheiro do cofre', false, async () => { await abrirCofre(); return updateDoc(BANCO(dbA()), { saldo: 0 }); });
await caso('Cofre: jogador aumenta o cofre sem comprovante', false, async () => { await abrirCofre(); return updateDoc(BANCO(dbA()), { saldo: increment(500) }); });
await caso('Cofre: Kage paga salários (cofre diminui)', true, async () => { await abrirCofre(); const db = dbAdm(); const b = writeBatch(db);
  b.update(doc(db, 'users', B), { ryos: increment(500) }); b.update(BANCO(db), { saldo: increment(-500) });
  b.set(MOV(db, 's1'), { uid: ADM, nome: 'Kage', tipo: 'salarios', valor: -500, data: serverTimestamp(), ref: '' }); return b.commit(); });
await caso('Cofre: todos podem ver o saldo', true, async () => { await abrirCofre(); return getDoc(BANCO(dbB())); });
// ---------- Admins ----------
await caso('Kage (admin@) altera Ryos de qualquer um', true, () => updateDoc(doc(dbAdm(), 'users', B), { ryos: 777777 }));
await caso('Conselheiro também é admin', true, () => updateDoc(doc(dbConselheiro(), 'users', B), { 'statusMissoes.m1': 'aprovado', salario: 50 }));
await caso('Kage cria jutsu', true, () => setDoc(doc(dbAdm(), 'jutsus', 'novo'), { nome: 'Novo', preco: 1 }));
await caso('Jogador NÃO cria jutsu', false, () => setDoc(doc(dbA(), 'jutsus', 'novo'), { nome: 'Novo', preco: 1 }));
await caso('Jogador NÃO entrega o próprio prêmio da roleta', false, () => updateDoc(uA(dbA()), { premios_pendentes: [], ryos: increment(5000) }));

// ---------- Feed ----------
await caso('Publicar post próprio', true, () => addDoc(collection(dbA(), 'posts'), { uid: A, autor: 'Kenji', conteudo: 'oi', likes: [], comentarios: [], data: serverTimestamp() }));
await caso('Publicar post em nome de outro', false, () => addDoc(collection(dbA(), 'posts'), { uid: B, autor: 'Aiko', conteudo: 'fake', likes: [], comentarios: [] }));
await caso('Curtir post', true, () => updateDoc(doc(dbA(), 'posts', 'p1'), { likes: arrayUnion(A) }));
await caso('Curtir em nome de outro', false, () => updateDoc(doc(dbA(), 'posts', 'p1'), { likes: arrayUnion('outro') }));
await caso('Comentar', true, () => updateDoc(doc(dbA(), 'posts', 'p1'), { comentarios: arrayUnion({ uid: A, autor: 'Kenji', texto: 'legal', data: 'x' }) }));
await caso('Editar texto do post de outro', false, () => updateDoc(doc(dbA(), 'posts', 'p1'), { conteudo: 'hackeado' }));
await caso('Excluir post de outro', false, () => deleteDoc(doc(dbA(), 'posts', 'p1')));
await caso('Excluir o próprio post', true, () => deleteDoc(doc(dbB(), 'posts', 'p1')));

// ---------- Chats ----------
await caso('Ler conversa privada da qual participa', true, () => getDoc(doc(dbA(), 'chats', `${A}_${B}`)));
await caso('Ler conversa privada de outros', false, () => getDoc(doc(env.authenticatedContext('intruso').firestore(), 'chats', `${A}_${B}`)));
await caso('Listar as próprias conversas', true, () => getDocs(query(collection(dbA(), 'chats'), where('participantes', 'array-contains', A))));
await caso('Enviar mensagem RP', true, () => addDoc(collection(dbA(), 'chats', `${A}_${B}`, 'mensagens'), { remetenteId: A, texto: 'oi', tipo: 'rp' }));
await caso('Jogador NÃO usa /narrador', false, () => addDoc(collection(dbA(), 'chats', 'cenario_vila_folha', 'mensagens'), { remetenteId: A, texto: 'x', tipo: 'narrador' }));
await caso('Kage usa /narrador', true, () => addDoc(collection(dbAdm(), 'chats', 'cenario_vila_folha', 'mensagens'), { remetenteId: ADM, texto: 'x', tipo: 'narrador' }));
await caso('Mensagem em cenário', true, () => addDoc(collection(dbA(), 'chats', 'cenario_vila_folha', 'mensagens'), { remetenteId: A, texto: 'olá', tipo: 'rp' }));
await caso('Escrever no Diário próprio', true, () => setDoc(doc(dbA(), 'chats', `diario_${A}`), { participantes: [A, 'MESTRE'], naoLidas_MESTRE: increment(1) }, { merge: true }));
await caso('Ler Diário de outro', false, () => getDoc(doc(dbB(), 'chats', `diario_${A}`)));
await caso('Kage lista os diários', true, () => getDocs(query(collection(dbAdm(), 'chats'), where('participantes', 'array-contains', 'MESTRE'))));

// ---------- Arena ----------
await caso('Desafiar alguém', true, () => addDoc(collection(dbA(), 'desafios_batalha'), { desafianteId: A, desafiadoId: B, status: 'pendente' }));
await caso('Ver desafios recebidos', true, () => getDocs(query(collection(dbB(), 'desafios_batalha'), where('desafiadoId', '==', B), where('status', '==', 'pendente'))));
await caso('Aceitar desafio', true, () => updateDoc(doc(dbB(), 'desafios_batalha', 'd1'), { status: 'aceito' }));
await caso('Intruso mexer no desafio', false, () => updateDoc(doc(env.authenticatedContext('intruso').firestore(), 'desafios_batalha', 'd1'), { status: 'aceito' }));

// ---------- Arena: cofre do competitivo e resultado ----------
const batalhaFinal = (extra = {}) => ({ desafianteId: A, desafiadoId: B, status: 'finalizada', modo: 'competitivo', aposta: { moeda: 'ryos', valor: 100 }, cofre: { [A]: 100, [B]: 100 },
  estado: { status: 'finalizada', resultado: { vencedor: A, perdedor: B, empate: false } }, ...extra });
const semearBatalha = (id, dados) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'desafios_batalha', id), dados));
function desafioCompetitivo(dbX, valor, pago = valor, moeda = 'ryos') {
  const ref = doc(collection(dbX, 'desafios_batalha'));
  const b = writeBatch(dbX);
  b.set(ref, { desafianteId: A, desafiadoId: B, status: 'pendente', modo: 'competitivo', aposta: { moeda, valor }, cofre: { [A]: valor } });
  b.update(doc(dbX, 'users', A), { [moeda]: increment(-pago), ultimoCofre: ref.id });
  return b.commit();
}
await caso('Arena: desafio amistoso', true, () => addDoc(collection(dbA(), 'desafios_batalha'), { desafianteId: A, desafiadoId: B, status: 'pendente', modo: 'amistoso', cofre: {} }));
await caso('Arena: desafiar a si mesmo', false, () => addDoc(collection(dbA(), 'desafios_batalha'), { desafianteId: A, desafiadoId: A, status: 'pendente', modo: 'amistoso' }));
await caso('Arena: competitivo paga a aposta para o cofre', true, () => desafioCompetitivo(dbA(), 100));
await caso('Arena: competitivo pagando MENOS que a aposta', false, () => desafioCompetitivo(dbA(), 100, 10));
await caso('Arena: apostar XP deixando menos de 10 na barra', false, () => desafioCompetitivo(dbA(), 895, 895, 'xp'));
await caso('Arena: apostar XP deixando 10 na barra', true, () => desafioCompetitivo(dbA(), 890, 890, 'xp'));
await caso('Arena: quem aceita paga a parte dele', true, async () => {
  await semearBatalha('c1', { desafianteId: A, desafiadoId: B, status: 'pendente', modo: 'competitivo', aposta: { moeda: 'ryos', valor: 50 }, cofre: { [A]: 50 } });
  const db = dbB();
  const b = writeBatch(db);
  b.update(doc(db, 'desafios_batalha', 'c1'), { status: 'aceito', 'cofre.jogadorB': 50 });
  b.update(doc(db, 'users', B), { ryos: increment(-50), ultimoCofre: 'c1' });
  return b.commit();
});
const receber = (dbX, uid, total) => { const b = writeBatch(dbX); b.update(doc(dbX, 'desafios_batalha', 'f1'), { cofrePago: true }); b.update(doc(dbX, 'users', uid), { ryos: increment(total), ultimoCofre: 'f1' }); return b.commit(); };
await caso('Arena: vencedor recebe o cofre inteiro', true, async () => { await semearBatalha('f1', batalhaFinal()); return receber(dbA(), A, 200); });
await caso('Arena: PERDEDOR tenta receber o cofre', false, async () => { await semearBatalha('f1', batalhaFinal()); return receber(dbB(), B, 200); });
await caso('Arena: vencedor tenta receber MAIS que o cofre', false, async () => { await semearBatalha('f1', batalhaFinal()); return receber(dbA(), A, 5000); });
await caso('Arena: receber o cofre duas vezes', false, async () => { await semearBatalha('f1', batalhaFinal({ cofrePago: true })); return receber(dbA(), A, 200); });
const devolver = (dbX, uid, id, v) => { const b = writeBatch(dbX); b.update(doc(dbX, 'desafios_batalha', id), { [`cofreDevolvido.${uid}`]: true }); b.update(doc(dbX, 'users', uid), { ryos: increment(v), ultimoCofre: id }); return b.commit(); };
await caso('Arena: convite recusado devolve a aposta', true, async () => { await semearBatalha('r1', { desafianteId: A, desafiadoId: B, status: 'recusado', modo: 'competitivo', aposta: { moeda: 'ryos', valor: 100 }, cofre: { [A]: 100 } }); return devolver(dbA(), A, 'r1', 100); });
await caso('Arena: empate devolve a aposta de cada um', true, async () => { await semearBatalha('e1', batalhaFinal({ estado: { status: 'finalizada', resultado: { vencedor: null, perdedor: null, empate: true } } })); return devolver(dbB(), B, 'e1', 100); });
await caso('Arena: perdedor tenta "devolver" a aposta', false, async () => { await semearBatalha('f1', batalhaFinal()); return devolver(dbB(), B, 'f1', 100); });
await caso('Arena: devolver duas vezes', false, async () => { await semearBatalha('r1', { desafianteId: A, desafiadoId: B, status: 'recusado', modo: 'competitivo', aposta: { moeda: 'ryos', valor: 100 }, cofre: { [A]: 100 }, cofreDevolvido: { [A]: true } }); return devolver(dbA(), A, 'r1', 100); });
const contar = (dbX, uid, id, upd) => { const b = writeBatch(dbX); b.update(doc(dbX, 'desafios_batalha', id), { [`contabilizado.${uid}`]: true }); b.update(doc(dbX, 'users', uid), { ...upd, ultimaBatalhaContabilizada: id }); return b.commit(); };
const rank = (extra = {}) => batalhaFinal({ modo: 'rankeada', aposta: null, cofre: {}, ...extra });
await caso('Arena: vencedor da rankeada +1 vitória e +25 pontos', true, async () => { await semearBatalha('k1', rank()); return contar(dbA(), A, 'k1', { vitorias: increment(1), pontos_rankeada: 25 }); });
await caso('Arena: perdedor da rankeada +1 derrota e −15 (não fica negativo)', true, async () => { await semearBatalha('k1', rank()); return contar(dbB(), B, 'k1', { derrotas: increment(1), pontos_rankeada: 0 }); });
await caso('Arena: perdedor tenta contar VITÓRIA', false, async () => { await semearBatalha('k1', rank()); return contar(dbB(), B, 'k1', { vitorias: increment(1) }); });
await caso('Arena: vencedor tenta +100 pontos', false, async () => { await semearBatalha('k1', rank()); return contar(dbA(), A, 'k1', { vitorias: increment(1), pontos_rankeada: 100 }); });
await caso('Arena: contar a mesma luta duas vezes', false, async () => { await semearBatalha('k1', rank({ contabilizado: { [A]: true } })); return contar(dbA(), A, 'k1', { vitorias: increment(1), pontos_rankeada: 25 }); });
await caso('Arena: empate amistoso +1 empate', true, async () => { await semearBatalha('a1', rank({ modo: 'amistoso', estado: { status: 'finalizada', resultado: { vencedor: null, perdedor: null, empate: true } } })); return contar(dbA(), A, 'a1', { empates: increment(1) }); });

const receberComTaxa = (dbX, uid, premio, taxa) => { const b = writeBatch(dbX); b.update(doc(dbX, 'desafios_batalha', 'f1'), { cofrePago: true }); b.update(doc(dbX, 'users', uid), { ryos: increment(premio), ultimoCofre: 'f1' });
  b.set(MOV(dbX, 'arena_f1'), { uid, nome: 'Kenji', tipo: 'arena', valor: taxa, data: serverTimestamp(), ref: 'f1' }); b.update(BANCO(dbX), { saldo: increment(taxa), ultimoMov: 'arena_f1' }); return b.commit(); };
await caso('Cofre: vencedor da Competitiva leva 95% e a vila 5%', true, async () => { await abrirCofre(); await semearBatalha('f1', batalhaFinal()); return receberComTaxa(dbA(), A, 190, 10); });
await caso('Cofre: vencedor tenta levar 100% com o cofre da vila aberto', false, async () => { await abrirCofre(); await semearBatalha('f1', batalhaFinal()); return receber(dbA(), A, 200); });

await env.cleanup();
const falhas = resultados.filter(r => r[0] === '❌');
resultados.forEach(r => console.log(r[0], r[1]));
console.log(`\n${resultados.length - falhas.length}/${resultados.length} testes passaram`);
process.exit(falhas.length ? 1 : 0);
