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

await env.cleanup();
const falhas = resultados.filter(r => r[0] === '❌');
resultados.forEach(r => console.log(r[0], r[1]));
console.log(`\n${resultados.length - falhas.length}/${resultados.length} testes passaram`);
process.exit(falhas.length ? 1 : 0);
