// Testes do motor da arena (regras puras). Rodar: node testes/arena.test.mjs
import * as R from '../arena-regras.js';

let ok = 0, falhas = 0;
function caso(nome, fn) {
    try { fn(); ok++; console.log('✅', nome); }
    catch (e) { falhas++; console.log('❌', nome, '→', e.message); }
}
function igual(a, b, msg = '') { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); }
function lanca(fn, trecho) { try { fn(); } catch (e) { if (!trecho || e.message.includes(trecho)) return; throw new Error('erro diferente: ' + e.message); } throw new Error('deveria ter dado erro'); }

const fichaA = { nome: 'Kenji', forca: 14, defesa: 12, intelecto: 11, destreza: 13, agilidade: 16, speed_rank: 7, reacao: 6, max_vida: 180, vida: 50, max_chakra: 200, chakra: 10, max_stamina: 100 };
const fichaB = { nome: 'Aiko', forca: 10, defesa: 10, intelecto: 15, destreza: 10, agilidade: 12, speed_rank: 5, reacao: 8, max_vida: 150, max_chakra: 150, max_stamina: 100 };
const T0 = 1_000_000;
const novo = (a = fichaA, b = fichaB, dado) => R.criarEstadoInicial(a, 'A', b, 'B', T0, dado).estado;
const jutsu = (j) => ({ id: j.nome.toLowerCase(), rank: 'C', ...j });

const SOCO = jutsu({ nome: 'Soco de Fogo', funcao: 'ataque', categoria: 'taijutsu', poder: 25, chakra: 10, reacao_necessaria: 5, velocidade_necessaria: 7 });
const RASENGAN = jutsu({ nome: 'Rasengan', funcao: 'ataque', categoria: 'ninjutsu', poder: 40, chakra: 30, rank: 'A' });
const SHURIKEN = { id: 'shuriken', nome: 'Shuriken', poder: 8, tipoItem: 'ferramenta', multiplicador_maximo: 3 };
const PILULA = { id: 'pilula', nome: 'Pílula', bonus_chakra: 30, tipoItem: 'item' };
const KAWARIMI = jutsu({ nome: 'Kawarimi', funcao: 'esquiva', poder: 2, chakra: 5 });
const PAREDE = jutsu({ nome: 'Parede de Terra', funcao: 'defesa', poder: 30, chakra: 15 });
const SHARINGAN = jutsu({ nome: 'Sharingan', funcao: 'modo', bonus: { reacao: 3, velocidade: 1 }, chakra: 10, custo_por_turno: 5 });
const CLONES = jutsu({ nome: 'Kage Bunshin', funcao: 'suporte', clones: 2, chakra: 40 });
const SANGRA = jutsu({ nome: 'Lâmina', funcao: 'ataque', categoria: 'kenjutsu', poder: 10, sangramento: 6, sangramento_turnos: 2 });

// ---------- Início ----------
caso('Começa com Vida/Chakra/Stamina CHEIOS (máximos da ficha)', () => {
    const e = novo();
    igual([e.lutadores.A.vida, e.lutadores.A.chakra, e.lutadores.A.stamina], [180, 200, 100]);
});
caso('Mais Agilidade começa', () => igual(novo().vez, 'A'));
caso('Agilidade empatada: mais Velocidade começa', () => {
    const e = novo({ ...fichaA, agilidade: 12 }, fichaB);
    igual([e.vez, e.iniciativa.motivo], ['A', 'velocidade']);
});
caso('Agilidade e Velocidade empatadas: d20 decide (repete se empatar)', () => {
    const seq = [10, 10, 4, 17]; let i = 0;
    const e = novo({ ...fichaA, agilidade: 12, speed_rank: 5 }, fichaB, () => seq[i++]);
    igual([e.vez, e.iniciativa.motivo, e.iniciativa.dados], ['B', 'dado', { A: 4, B: 17 }]);
});
caso('Ficha sem reação/velocidade usa 1', () => {
    const e = novo({ nome: 'X' }, { nome: 'Y' });
    igual([e.lutadores.A.atributos.reacao, e.lutadores.A.atributos.velocidade], [1, 1]);
});

// ---------- Ações ----------
caso('Dano = atributo da categoria + Poder (Taijutsu soma Força: 14+25=39)', () => {
    const { estado } = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SOCO }, T0);
    igual([estado.ataquePendente.dano, estado.lutadores.A.chakra, estado.acoesRestantes], [39, 190, 2]);
});
caso('Ninjutsu soma Intelecto (11+40=51)', () => {
    const { estado } = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: RASENGAN }, T0);
    igual(estado.ataquePendente.dano, 51);
});
caso('Jutsu antigo com dano em dado usa a média ("3d8+4" = 18)', () => igual(R.poderDoJutsu({ dano: '3d8+4' }), 18));
caso('Reação/velocidade vazias usam o padrão do Rank (A → 8/9)', () => igual(R.necessidadesDoJutsu(RASENGAN), { reacao: 8, velocidade: 9 }));
caso('Campo antigo rank_esquiva_minimo vale como velocidade necessária', () => igual(R.necessidadesDoJutsu({ rank: 'D', rank_esquiva_minimo: 10 }).velocidade, 10));
caso('Só 1 ataque por turno', () => {
    let { estado } = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SOCO }, T0);
    lanca(() => R.aplicarAcao(estado, 'A', { tipo: 'jutsu', jutsu: RASENGAN }, T0), 'máximo 1 ataque');
});
caso('Máximo de 3 ações por turno', () => {
    let e = novo();
    const buff = jutsu({ nome: 'Foco', funcao: 'suporte', efeito: 'ataque', poder: 5, duracao: 2 });
    e = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: { ...buff, id: 'b1' } }, T0).estado;
    e = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: { ...buff, id: 'b2' } }, T0).estado;
    e = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: SOCO }, T0).estado;
    lanca(() => R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: { ...buff, id: 'b3' } }, T0), '3 ações');
});
caso('Não pode agir fora da sua vez', () => lanca(() => R.aplicarAcao(novo(), 'B', { tipo: 'jutsu', jutsu: SOCO }, T0), 'sua vez'));
caso('Defesa/esquiva não são usadas na própria vez', () => lanca(() => R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: PAREDE }, T0), 'reagir'));
caso('Chakra insuficiente bloqueia o jutsu', () => {
    const e = novo(); e.lutadores.A.chakra = 5;
    lanca(() => R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: SOCO }, T0), 'Chakra insuficiente');
});
caso('Bônus de ataque de suporte soma no dano', () => {
    let e = novo();
    e = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: jutsu({ nome: 'Foco', funcao: 'suporte', efeito: 'ataque', poder: 6, duracao: 2 }) }, T0).estado;
    e = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: SOCO }, T0).estado;
    igual(e.ataquePendente.dano, 45);
});
caso('Ferramenta com multiplicador (3 shurikens: (13+8)×3 = 63) usa Destreza', () => {
    const { estado } = R.aplicarAcao(novo(), 'A', { tipo: 'item', item: SHURIKEN, cargas: 3 }, T0);
    igual(estado.ataquePendente.dano, 63);
});
caso('Pílula recupera chakra sem passar do máximo', () => {
    const e = novo(); e.lutadores.A.chakra = 100;
    const { estado } = R.aplicarAcao(e, 'A', { tipo: 'item', item: PILULA }, T0);
    igual(estado.lutadores.A.chakra, 130);
});

// ---------- Turnos e reação ----------
function aposPassar(e) { return R.aplicarAcao(e, 'A', { tipo: 'passar' }, T0 + 1000).estado; }
caso('Passar sem ataque: vez vai direto para o outro (com 3 ações)', () => {
    const e = aposPassar(novo());
    igual([e.vez, e.fase, e.acoesRestantes, e.turno], ['B', 'acao', 3, 2]);
});
caso('Passar com ataque: outro tem 20 s para reagir', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SOCO }, T0).estado;
    e = aposPassar(e);
    igual([e.fase, e.prazo - (T0 + 1000)], ['reacao', 20000]);
});
function ataqueSoco() { return aposPassar(R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SOCO }, T0).estado); }
caso('Receber o golpe: perde a vida e ganha a vez', () => {
    const e = R.aplicarAcao(ataqueSoco(), 'B', { tipo: 'reagir', opcao: 'receber' }, T0 + 2000).estado;
    igual([e.lutadores.B.vida, e.vez, e.fase], [150 - 39, 'B', 'acao']);
});
caso('Reação baixa: não percebe e toma o golpe (mesmo tentando esquivar)', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: { ...SOCO, reacao_necessaria: 11 } }, T0).estado;
    e = aposPassar(e);
    e = R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'esquivar' }, T0 + 2000).estado;
    igual(e.lutadores.B.vida, 111);
});
caso('Esquiva: Velocidade ≥ necessária escapa', () => {
    const e = ataqueSoco(); e.lutadores.B.atributos.velocidade = 7;
    igual(R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'esquivar' }, T0 + 2000).estado.lutadores.B.vida, 150);
});
caso('Esquiva: 1 abaixo toma metade', () => {
    const e = ataqueSoco(); e.lutadores.B.atributos.velocidade = 6;
    igual(R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'esquivar' }, T0 + 2000).estado.lutadores.B.vida, 150 - 20);
});
caso('Esquiva: 2+ abaixo toma tudo', () => {
    const e = ataqueSoco(); // Aiko velocidade 5, precisa 7
    igual(R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'esquivar' }, T0 + 2000).estado.lutadores.B.vida, 111);
});
caso('Jutsu de esquiva soma Velocidade (5+2=7 escapa) e gasta chakra', () => {
    const e = R.aplicarAcao(ataqueSoco(), 'B', { tipo: 'reagir', opcao: 'esquivar', jutsu: KAWARIMI }, T0 + 2000).estado;
    igual([e.lutadores.B.vida, e.lutadores.B.chakra], [150, 145]);
});
caso('Defesa física: Defesa absorve (39−10 = 29 de dano)', () => {
    const e = R.aplicarAcao(ataqueSoco(), 'B', { tipo: 'reagir', opcao: 'defender' }, T0 + 2000).estado;
    igual(e.lutadores.B.vida, 150 - 29);
});
caso('Defesa física não funciona contra Ninjutsu', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: { ...RASENGAN, reacao_necessaria: 1 } }, T0).estado;
    e = aposPassar(e);
    lanca(() => R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'defender' }, T0 + 2000), 'Defesa física');
});
caso('Jutsu de defesa: Defesa + Poder absorve (10+30 ≥ 39 → sem dano)', () => {
    const e = R.aplicarAcao(ataqueSoco(), 'B', { tipo: 'reagir', opcao: 'defender', jutsu: PAREDE }, T0 + 2000).estado;
    igual(e.lutadores.B.vida, 150);
});
caso('"Impossível esquivar" bloqueia a esquiva', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: { ...SOCO, impossivel_esquivar: true } }, T0).estado;
    e = aposPassar(e);
    lanca(() => R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'esquivar' }, T0 + 2000), 'esquivar');
});

// ---------- Modos, clones, sangramento, stamina ----------
caso('Modo dá bônus e cobra manutenção a cada turno do dono', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SHARINGAN }, T0).estado;
    igual(R.bonusAtivos(e.lutadores.A).reacao, 3);
    e = aposPassar(e);                                          // vez de B
    e = R.aplicarAcao(e, 'B', { tipo: 'passar' }, T0 + 3000).estado; // volta para A: paga 5
    igual(e.lutadores.A.chakra, 200 - 10 - 5);
});
caso('Modo não pode ser ativado duas vezes; pode ser desativado', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SHARINGAN }, T0).estado;
    lanca(() => R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: SHARINGAN }, T0), 'já está ativo');
    e = R.aplicarAcao(e, 'A', { tipo: 'desativar', efeitoId: SHARINGAN.id }, T0).estado;
    igual([e.lutadores.A.efeitos.length, e.acoesRestantes], [0, 2]);
});
caso('Clones: chakra gasto vira reserva; atacam junto (golpe ×3)', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: CLONES }, T0).estado;
    igual(e.lutadores.A.clones, { qtd: 2, reserva: 40, solidos: true });
    e = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: SOCO, clones: 2 }, T0).estado;
    igual([e.ataquePendente.dano, e.lutadores.A.clones.reserva], [39 * 3, 20]);
});
caso('Clones se desfazem quando a reserva acaba', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: { ...CLONES, chakra: 20 } }, T0).estado;
    e = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: SOCO, clones: 2 }, T0).estado;
    igual(e.lutadores.A.clones.qtd, 0);
});
caso('Clone sólido absorve o golpe no lugar do dono', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'passar' }, T0).estado; // vez de B
    e = R.aplicarAcao(e, 'B', { tipo: 'jutsu', jutsu: CLONES }, T0).estado;
    e = R.aplicarAcao(e, 'B', { tipo: 'passar' }, T0).estado;          // vez de A
    e = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: SOCO }, T0).estado;
    e = R.aplicarAcao(e, 'A', { tipo: 'passar' }, T0).estado;
    e = R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'receber' }, T0).estado;
    igual([e.lutadores.B.vida, e.lutadores.B.clones.qtd], [150, 1]);
});
caso('Sangramento tira vida no início dos turnos do alvo e termina', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SANGRA }, T0).estado;
    e = aposPassar(e);
    e = R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'receber' }, T0).estado;   // 13+10=23 dano, depois turno de B: −6
    igual(e.lutadores.B.vida, 150 - 23 - 6);
    e = R.aplicarAcao(e, 'B', { tipo: 'passar' }, T0).estado;
    e = R.aplicarAcao(e, 'A', { tipo: 'passar' }, T0).estado;                     // 2º turno de B: −6 e acaba
    igual([e.lutadores.B.vida, e.lutadores.B.efeitos.length], [150 - 23 - 12, 0]);
});
caso('Recupera 5% da stamina máxima no início do turno', () => {
    let e = novo(); e.lutadores.B.stamina = 50;
    e = aposPassar(e);
    igual(e.lutadores.B.stamina, 55);
});

// ---------- Fim da luta ----------
caso('Vida em 0: derrota', () => {
    const e = ataqueSoco(); e.lutadores.B.vida = 30;
    const r = R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'receber' }, T0).estado;
    igual([r.status, r.resultado.vencedor, r.resultado.perdedor], ['finalizada', 'A', 'B']);
});
caso('Chakra em 0: derrota por esgotamento (como Kakashi x Pain)', () => {
    const e = novo(); e.lutadores.A.chakra = 30;
    const r = R.aplicarAcao(e, 'A', { tipo: 'jutsu', jutsu: RASENGAN }, T0).estado;
    igual([r.status, r.resultado.vencedor, r.resultado.motivo], ['finalizada', 'B', 'chakra']);
});
caso('Manutenção do modo que zera o chakra também derruba', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SHARINGAN }, T0).estado;
    e.lutadores.A.chakra = 5;
    e = aposPassar(e);
    e = R.aplicarAcao(e, 'B', { tipo: 'passar' }, T0).estado;
    igual([e.status, e.resultado.vencedor], ['finalizada', 'B']);
});
caso('Desistir: o outro vence', () => igual(R.aplicarAcao(novo(), 'B', { tipo: 'desistir' }, T0).estado.resultado.vencedor, 'A'));
caso('Empate por acordo', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'propor_empate' }, T0).estado;
    lanca(() => R.aplicarAcao(e, 'A', { tipo: 'aceitar_empate' }, T0), 'proposta');
    e = R.aplicarAcao(e, 'B', { tipo: 'aceitar_empate' }, T0).estado;
    igual([e.status, e.resultado.empate], ['finalizada', true]);
});
caso('Nocaute duplo (os dois caem juntos) = empate', () => {
    let e = R.aplicarAcao(novo(), 'A', { tipo: 'jutsu', jutsu: SANGRA }, T0).estado;
    e = aposPassar(e);
    e = R.aplicarAcao(e, 'B', { tipo: 'reagir', opcao: 'receber' }, T0).estado;
    e.lutadores.A.chakra = 0; e.lutadores.B.vida = 0;
    const r = R.verificarFim(e, []);
    igual(r.resultado.empate, true);
});

// ---------- Tempo e pausa ----------
caso('Tempo da ação esgotado: perde a vez', () => {
    const e = novo();
    lanca(() => R.aplicarAcao(e, 'B', { tipo: 'tempo_esgotado' }, T0 + 1000), 'ainda não acabou');
    const r = R.aplicarAcao(e, 'B', { tipo: 'tempo_esgotado' }, T0 + 31000).estado;
    igual([r.vez, r.fase], ['B', 'acao']);
});
caso('Tempo da reação esgotado: toma o golpe em cheio', () => {
    const e = ataqueSoco();
    const r = R.aplicarAcao(e, 'A', { tipo: 'tempo_esgotado' }, T0 + 1000 + 21000).estado;
    igual([r.lutadores.B.vida, r.vez], [111, 'B']);
});
caso('Alguém sai da arena: pausa e congela o tempo; volta: retoma', () => {
    let e = novo();
    e = R.aplicarAcao(e, 'A', { tipo: 'presenca' }, T0 + 40000).estado; // B sem sinal há 40 s
    igual([e.pausada, e.restanteMs], [true, 5000]);
    lanca(() => R.aplicarAcao(e, 'A', { tipo: 'passar' }, T0 + 41000), 'pausada');
    lanca(() => R.aplicarAcao(e, 'A', { tipo: 'tempo_esgotado' }, T0 + 99999), 'ainda não acabou');
    e = R.aplicarAcao(e, 'B', { tipo: 'presenca' }, T0 + 60000).estado;
    igual([e.pausada, e.prazo], [false, T0 + 65000]);
});
caso('XP apostável deixa 10 na barra (30 → 20)', () => igual(R.xpApostavel(30), 20));

console.log(`\n${ok}/${ok + falhas} testes do motor passaram`);
process.exit(falhas ? 1 : 0);
