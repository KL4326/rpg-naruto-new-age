// =====================================================================
//  ARENA — REGRAS DA BATALHA (motor puro, sem tela e sem banco de dados)
//  Tudo aqui segue o REGULAMENTO_ARENA.md. Cada ação recebe o estado da
//  luta e devolve o NOVO estado + as mensagens para o histórico.
// =====================================================================

export const ARENA = {
    tempoAcaoMs: 30000,        // 30 s para agir
    tempoReacaoMs: 20000,      // 20 s para reagir
    acoesPorTurno: 3,          // até 3 ações por turno...
    ataquesPorTurno: 1,        // ...sendo no máximo 1 ataque
    regenStamina: 0.05,        // recupera 5% da stamina máxima no início do próprio turno
    ausenciaMs: 35000,         // sem sinal por 35 s = saiu da arena (luta pausa)
    pontosVitoria: 25,         // rankeada
    pontosDerrota: 15,         // rankeada
    xpMinimoNaBarra: 10,       // competitivo valendo XP: precisa sobrar pelo menos isso
    custoMinimoClone: 5,       // chakra mínimo que cada clone gasta ao atacar
    dorQuebraGenjutsu: 0.10,   // levar um golpe de 10% da Vida máxima ou mais quebra o genjutsu
    historicoMax: 120
};

// Valores-reserva por Rank, usados quando o jutsu não tem os campos preenchidos
export const PADRAO_POR_RANK = {
    E: { reacao: 1, velocidade: 1 },
    D: { reacao: 2, velocidade: 3 },
    C: { reacao: 4, velocidade: 5 },
    B: { reacao: 6, velocidade: 7 },
    A: { reacao: 8, velocidade: 9 },
    S: { reacao: 10, velocidade: 11 }
};

// Atributo da ficha que soma no dano de cada categoria de jutsu
export const ATRIBUTO_POR_CATEGORIA = {
    taijutsu: 'forca',
    ninjutsu: 'intelecto',
    genjutsu: 'intelecto',
    fuuinjutsu: 'intelecto',
    senjutsu: 'intelecto',
    bukijutsu: 'destreza',
    kenjutsu: 'destreza',
    ferramenta: 'destreza'
};

// ---------------- utilitários ----------------
export function num(v, padrao = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : padrao;
}
const clonar = (o) => JSON.parse(JSON.stringify(o));

// Dados para as animações das cartas. Só guarda imagens que são LINKS curtos:
// imagens salvas como texto (base64) ficariam pesadas no registro da luta,
// e a tela busca essas no catálogo pelo id.
export function imagemCurta(url) {
    return typeof url === 'string' && /^https?:\/\//.test(url) && url.length <= 600 ? url : null;
}
function cartaDoJutsu(j, extra = {}) {
    return { jutsuId: j?.id || null, tipoItem: j?.tipoItem || null, nome: j?.nome || 'Jutsu', img: imagemCurta(j?.imagem), funcao: j?.tipoItem === 'item' ? 'item' : funcaoDoJutsu(j), ...extra };
}
const limitar = (v, min, max) => Math.max(min, Math.min(max, v));

// "3d8+4" vira a média (17.5 → 18). "40" vira 40.
export function mediaDoDado(texto) {
    const s = String(texto ?? '').toLowerCase().replace(/\s/g, '');
    if (!s) return 0;
    if (!s.includes('d')) return num(s);
    const m = s.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!m) return 0;
    const qtd = num(m[1], 1) || 1, lados = num(m[2]), bonus = num(m[3]);
    return Math.round(qtd * (lados + 1) / 2 + bonus);
}

export function rankDoJutsu(j) {
    const r = String(j?.rank ?? '').toUpperCase().replace(/RANK[\s-]*/g, '').trim().charAt(0);
    return PADRAO_POR_RANK[r] ? r : 'D';
}

export function funcaoDoJutsu(j) {
    const f = String(j?.funcao ?? '').toLowerCase();
    if (f.includes('esquiva') || f.includes('escape')) return 'esquiva';
    if (f.includes('defesa') || f.includes('defens')) return 'defesa';
    if (f.includes('modo') || f.includes('doujutsu') || f.includes('dojutsu')) return 'modo';
    if (f.includes('criac')) return 'criacao';
    if (f.includes('kai') || f.includes('contra')) return 'kai';
    if (f.includes('espelho') || f.includes('reflet')) return 'espelho';
    if (f.includes('suporte') || f.includes('cura') || f.includes('buff')) return 'suporte';
    if (f.includes('ataque')) return 'ataque';
    // sem função cadastrada: se causa dano, é ataque; senão, suporte
    return (j?.poder || j?.dano) ? 'ataque' : 'suporte';
}

export function categoriaDoJutsu(j) {
    const c = String(j?.categoria ?? '').toLowerCase().trim();
    return c || 'ninjutsu';
}

export function poderDoJutsu(j) {
    if (j?.poder !== undefined && j?.poder !== null && j?.poder !== '') return num(j.poder);
    return mediaDoDado(j?.dano);
}

export function necessidadesDoJutsu(j) {
    const padrao = PADRAO_POR_RANK[rankDoJutsu(j)];
    const reacao = num(j?.reacao_necessaria) || padrao.reacao;
    const velocidade = num(j?.velocidade_necessaria) || num(j?.rank_esquiva_minimo) || padrao.velocidade;
    return { reacao: limitar(reacao, 1, 12), velocidade: limitar(velocidade, 1, 12) };
}

// Bônus que um suporte/modo concede: { ataque, defesa, velocidade, reacao }
export function bonusDoJutsu(j) {
    // bonus_arena tem prioridade: assim o campo "bonus" pode continuar como texto do RP
    const fonte = [j?.bonus_arena, j?.bonus].find(x => x && typeof x === 'object' && !Array.isArray(x));
    if (fonte) {
        const b = {};
        for (const k of BONUS_CHAVES) if (num(fonte[k])) b[k] = num(fonte[k]);
        return b;
    }
    const efeito = String(j?.efeito ?? '').toLowerCase();
    if (BONUS_CHAVES.includes(efeito)) return { [efeito]: poderDoJutsu(j) };
    return {};
}

// custo_chakra / custo_stamina (números da arena) têm prioridade sobre
// chakra / stamina, que muitas vezes são texto do RP ("-200 por turno").
export function custosDoJutsu(j) {
    const valor = (arena, rp) => Math.abs(arena !== undefined && arena !== null && arena !== '' ? num(arena) : num(rp));
    return { chakra: valor(j?.custo_chakra, j?.chakra), stamina: valor(j?.custo_stamina, j?.stamina) };
}

// Requisitos: ids de jutsus (modos) que precisam estar ATIVOS. Basta um deles.
export function requisitosDoJutsu(j) {
    const r = j?.requer_ativo;
    if (!r) return [];
    return (Array.isArray(r) ? r : String(r).split(',')).map(x => String(x).trim()).filter(Boolean);
}
export function requisitoAtendido(lutador, j) {
    const r = requisitosDoJutsu(j);
    return !r.length || (lutador.efeitos || []).some(e => r.includes(e.id));
}

// Nível do Rank para comparar (E=0 ... S=5, SS=6, SSS=7)
const NIVEIS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
export function nivelDoRank(r) {
    const t = String(r ?? '').toUpperCase().replace(/RANK[\s-]*/g, '').trim();
    const i = NIVEIS.indexOf(t);
    return i >= 0 ? i : NIVEIS.indexOf(t.charAt(0)) >= 0 ? NIVEIS.indexOf(t.charAt(0)) : 1;
}

// uso_arena: false = jutsu/item utilitário, que não faz nada numa luta (ex.: Transformação)
export function usoNaArena(j) {
    return j?.uso_arena !== false;
}

// ---------------- estado ----------------
export function outro(estado, uid) {
    return estado.ordem[0] === uid ? estado.ordem[1] : estado.ordem[0];
}

export const BONUS_CHAVES = ['ataque', 'defesa', 'velocidade', 'reacao', 'precisao'];
export function bonusAtivos(lutador) {
    const total = { ataque: 0, defesa: 0, velocidade: 0, reacao: 0, precisao: 0 };
    for (const e of lutador.efeitos || []) {
        for (const k of Object.keys(total)) total[k] += num(e.bonus?.[k]);
    }
    return total;
}

// Cria o lutador a partir da ficha (a ficha NUNCA é alterada pela arena)
export function lutadorDaFicha(uid, ficha) {
    const maxVida = num(ficha.max_vida, 0) || num(ficha.vida, 100) || 100;
    const maxChakra = num(ficha.max_chakra, 0) || num(ficha.chakra, 100) || 100;
    const maxStamina = num(ficha.max_stamina, 0) || num(ficha.stamina, 100) || 100;
    return {
        uid,
        nome: ficha.nome || ficha.apelido || 'Ninja',
        avatar: ficha.avatar || '',
        vida: maxVida, maxVida,
        chakra: maxChakra, maxChakra,
        stamina: maxStamina, maxStamina,
        atributos: {
            forca: num(ficha.forca, 10), defesa: num(ficha.defesa, 10), constituicao: num(ficha.constituicao, 10),
            destreza: num(ficha.destreza, 10), intelecto: num(ficha.intelecto, 10), agilidade: num(ficha.agilidade, 10),
            velocidade: limitar(num(ficha.speed_rank, 1) || 1, 1, 12),   // Velocidade de 1 a 12
            reacao: limitar(num(ficha.reacao, 1) || 1, 1, 12)            // Reação de 1 a 12
        },
        efeitos: [],
        clones: { qtd: 0, reserva: 0, solidos: true },
        criacoes: []
    };
}

// Quem começa: Agilidade > Velocidade > d20 (repete enquanto empatar)
export function decidirIniciativa(a, b, rolarD20 = () => 1 + Math.floor(Math.random() * 20)) {
    if (a.atributos.agilidade !== b.atributos.agilidade) {
        return { primeiro: a.atributos.agilidade > b.atributos.agilidade ? a.uid : b.uid, motivo: 'agilidade' };
    }
    if (a.atributos.velocidade !== b.atributos.velocidade) {
        return { primeiro: a.atributos.velocidade > b.atributos.velocidade ? a.uid : b.uid, motivo: 'velocidade' };
    }
    for (let i = 0; i < 50; i++) {
        const da = rolarD20(), db = rolarD20();
        if (da !== db) return { primeiro: da > db ? a.uid : b.uid, motivo: 'dado', dados: { [a.uid]: da, [b.uid]: db } };
    }
    return { primeiro: a.uid, motivo: 'dado', dados: {} };
}

export function criarEstadoInicial(fichaA, uidA, fichaB, uidB, agora, rolarD20) {
    const A = lutadorDaFicha(uidA, fichaA), B = lutadorDaFicha(uidB, fichaB);
    const ini = decidirIniciativa(A, B, rolarD20);
    const segundo = ini.primeiro === uidA ? uidB : uidA;
    const estado = {
        versao: 2,
        status: 'em_andamento',
        lutadores: { [uidA]: A, [uidB]: B },
        ordem: [ini.primeiro, segundo],
        iniciativa: ini,
        turno: 1,
        vez: ini.primeiro,
        fase: 'acao',
        acoesRestantes: ARENA.acoesPorTurno,
        ataquesRestantes: ARENA.ataquesPorTurno,
        ataquePendente: null,
        prazo: agora + ARENA.tempoAcaoMs,
        pausada: false,
        restanteMs: null,
        presenca: { [uidA]: agora, [uidB]: agora },
        propostaEmpate: null,
        resultado: null
    };
    const nome = estado.lutadores[ini.primeiro].nome;
    let porque = 'por ter mais Agilidade';
    if (ini.motivo === 'velocidade') porque = 'pela Velocidade (Agilidade empatada)';
    if (ini.motivo === 'dado') porque = `no dado (${A.nome}: ${ini.dados[uidA]} × ${B.nome}: ${ini.dados[uidB]})`;
    return { estado, eventos: [{ tipo: 'sistema', texto: `⚔️ A batalha começou! ${nome} age primeiro ${porque}.` }] };
}

// ---------------- verificações ----------------
function erro(msg) { const e = new Error(msg); e.regra = true; return e; }

function exigirVez(estado, uid, fase = 'acao') {
    if (estado.status !== 'em_andamento') throw erro('A batalha já terminou.');
    if (estado.pausada) throw erro('A batalha está pausada.');
    if (fase === 'acao' && (estado.fase !== 'acao' || estado.vez !== uid)) throw erro('Não é a sua vez de agir.');
    if (fase === 'reacao' && (estado.fase !== 'reacao' || outro(estado, estado.vez) !== uid)) throw erro('Não é hora de você reagir.');
}

function exigirLivreDoGenjutsu(l) {
    const g = genjutsuAtivo(l);
    if (g && g.efeitoGenjutsu === 'paralisia') throw erro(`Você está preso no genjutsu [${g.nome}]: use o Contra-Genjutsu (Kai) ou passe o turno.`);
}

function pagar(lutador, custos, eventos, motivo) {
    if (lutador.stamina < custos.stamina) throw erro(`Stamina insuficiente para ${motivo}.`);
    if (lutador.chakra < custos.chakra) throw erro(`Chakra insuficiente para ${motivo}.`);
    lutador.chakra -= custos.chakra;
    lutador.stamina -= custos.stamina;
}

// Vida ou chakra em 0 = derrota (esgotamento). Os dois ao mesmo tempo = empate.
export function verificarFim(estado, eventos) {
    if (estado.status !== 'em_andamento') return estado;
    const caidos = estado.ordem.filter(uid => {
        const l = estado.lutadores[uid];
        return l.vida <= 0 || l.chakra <= 0;
    });
    if (caidos.length === 0) return estado;
    for (const uid of caidos) {
        const l = estado.lutadores[uid];
        eventos.push({ tipo: 'queda', texto: l.vida <= 0 ? `💀 ${l.nome} caiu em combate!` : `💀 ${l.nome} esgotou o chakra e desmaiou!` });
    }
    if (caidos.length === 2) return finalizar(estado, null, 'nocaute duplo', eventos);
    return finalizar(estado, outro(estado, caidos[0]), caidos[0] && estado.lutadores[caidos[0]].vida <= 0 ? 'vida' : 'chakra', eventos);
}

export function finalizar(estado, vencedor, motivo, eventos) {
    estado.status = 'finalizada';
    estado.fase = 'fim';
    estado.ataquePendente = null;
    estado.resultado = { vencedor, perdedor: vencedor ? outro(estado, vencedor) : null, empate: !vencedor, motivo };
    if (vencedor) eventos.push({ tipo: 'fim', texto: `🏆 ${estado.lutadores[vencedor].nome} venceu a batalha!` });
    else eventos.push({ tipo: 'fim', texto: '🤝 A batalha terminou empatada.' });
    return estado;
}

// ---------------- início de turno ----------------
function iniciarTurno(estado, uid, agora, eventos) {
    estado.vez = uid;
    estado.fase = 'acao';
    estado.turno += 1;
    estado.acoesRestantes = ARENA.acoesPorTurno;
    estado.ataquesRestantes = ARENA.ataquesPorTurno;
    estado.ataquePendente = null;
    estado.prazo = agora + ARENA.tempoAcaoMs;
    const l = estado.lutadores[uid];

    // Recupera 5% da stamina máxima
    const rec = Math.round(l.maxStamina * ARENA.regenStamina);
    if (l.stamina < l.maxStamina && rec > 0) l.stamina = Math.min(l.maxStamina, l.stamina + rec);

    // Efeitos ativos: manutenção de modos, sangramentos, duração
    const ficam = [];
    for (const e of l.efeitos || []) {
        // Chamas mantidas pelo usuário: sem chakra para manter, elas apagam (não matam o usuário)
        if (e.tipo === 'manter_chamas') {
            if (l.chakra <= e.custoPorTurno) {
                eventos.push({ tipo: 'efeito', texto: `🔥 ${l.nome} não tem chakra para manter [${e.nome}]: as chamas apagaram.` });
                apagarChamasDe(estado, uid);
                continue;
            }
            l.chakra -= e.custoPorTurno;
            eventos.push({ tipo: 'efeito', texto: `🔥 ${l.nome} mantém as chamas de [${e.nome}] (−${e.custoPorTurno} chakra).` });
            ficam.push(e);
            continue;
        }
        if (e.custoPorTurno) {
            l.chakra -= e.custoPorTurno;
            eventos.push({ tipo: 'efeito', texto: `🌀 ${l.nome} mantém [${e.nome}] (−${e.custoPorTurno} chakra).` });
        }
        if (e.danoPorTurno) {
            l.vida -= e.danoPorTurno;
            const icone = e.tipo === 'chamas' ? '🔥' : (e.tipo === 'genjutsu' ? '👁️' : '🩸');
            eventos.push({ tipo: 'efeito', texto: `${icone} ${l.nome} sofre ${e.danoPorTurno} de dano por [${e.nome}].` });
        }
        if (e.turnos !== null && e.turnos !== undefined) {
            e.turnos -= 1;
            if (e.turnos <= 0) {
                eventos.push({ tipo: 'efeito', texto: e.tipo === 'genjutsu' ? `👁️ ${l.nome} se livrou do genjutsu [${e.nome}].` : `⌛ O efeito [${e.nome}] de ${l.nome} terminou.` });
                continue;
            }
        }
        ficam.push(e);
    }
    l.efeitos = ficam;
    limparDependentes(estado, uid, eventos);

    // Criações com manutenção (ex.: raízes que gastam chakra para continuar no campo)
    const criacoes = [];
    for (const c of l.criacoes || []) {
        if (c.custoPorTurno) {
            if (l.chakra <= c.custoPorTurno) { eventos.push({ tipo: 'efeito', texto: `💨 ${l.nome} não tem chakra para manter ${c.nome}: elas se desfizeram.` }); continue; }
            l.chakra -= c.custoPorTurno;
            eventos.push({ tipo: 'efeito', texto: `${c.icone} ${l.nome} mantém ${c.qtd} ${c.nome} (−${c.custoPorTurno} chakra).` });
        }
        criacoes.push(c);
    }
    l.criacoes = criacoes;
    eventos.push({ tipo: 'turno', texto: `— Turno ${estado.turno}: vez de ${l.nome} —` });
    return verificarFim(estado, eventos);
}

// ---------------- ações do turno ----------------
// cargas: quantas vezes o golpe é repetido (multiplicador). clones: quantos clones atacam junto.
export function previaAtaque(lutador, jutsu, cargas = 1, clones = 0) {
    const categoria = jutsu.tipoItem === 'ferramenta' ? 'ferramenta' : categoriaDoJutsu(jutsu);
    const atributo = ATRIBUTO_POR_CATEGORIA[categoria] || 'intelecto';
    const porGolpe = num(lutador.atributos[atributo]) + poderDoJutsu(jutsu) + bonusAtivos(lutador).ataque;
    const custo = custosDoJutsu(jutsu);
    const custoClone = Math.max(custo.chakra, ARENA.custoMinimoClone);
    return {
        categoria, atributo,
        porGolpe,
        golpes: cargas + clones,
        dano: Math.max(0, porGolpe) * (cargas + clones),
        chakra: custo.chakra * cargas,
        stamina: custo.stamina * cargas,
        custoClones: custoClone * clones
    };
}

function acaoAtaque(estado, uid, jutsu, opcoes, eventos) {
    if (estado.ataquesRestantes <= 0) throw erro('Você já atacou neste turno (máximo 1 ataque por turno).');
    const l = estado.lutadores[uid];
    const maxCargas = Math.max(1, num(jutsu.multiplicador_maximo, 1));
    const cargas = limitar(Math.floor(num(opcoes.cargas, 1)) || 1, 1, maxCargas);
    const clones = limitar(Math.floor(num(opcoes.clones, 0)), 0, l.clones?.qtd || 0);
    const p = previaAtaque(l, jutsu, cargas, clones);
    if (clones > 0 && (l.clones.reserva || 0) < p.custoClones) throw erro('Os clones não têm chakra suficiente para esse ataque.');
    // Chamas que não se apagam (ex.: Amaterasu): só uma ativa por vez e custam Vida ao usuário
    const chamas = num(jutsu.chamas_por_turno) > 0 ? { dano: num(jutsu.chamas_por_turno), manutencao: Math.abs(num(jutsu.chamas_manutencao)), nome: jutsu.nome } : null;
    if (chamas && (l.efeitos || []).some(e => e.tipo === 'manter_chamas')) throw erro('Você já mantém chamas ativas. Apague-as antes de usar de novo.');
    const custoVida = Math.round(l.maxVida * Math.abs(num(jutsu.custo_vida_pct)) / 100);
    if (custoVida && l.vida <= custoVida) throw erro(`Vida insuficiente para ${jutsu.nome}.`);
    pagar(l, { chakra: p.chakra, stamina: p.stamina }, eventos, jutsu.nome);
    if (custoVida) {
        l.vida -= custoVida;
        eventos.push({ tipo: 'efeito', texto: `🩸 Usar [${jutsu.nome}] custou ${custoVida} de Vida a ${l.nome}.` });
    }
    if (clones > 0) {
        l.clones.reserva -= p.custoClones;
        if (l.clones.reserva < ARENA.custoMinimoClone) {
            eventos.push({ tipo: 'efeito', texto: `💨 Os clones de ${l.nome} ficaram sem chakra e se desfizeram.` });
            l.clones = { qtd: 0, reserva: 0, solidos: true };
        }
    }
    const nec = necessidadesDoJutsu(jutsu);
    const ehGenjutsu = categoriaDoJutsu(jutsu) === 'genjutsu';
    prepararAtaque(estado, uid, {
        carta: cartaDoJutsu(jutsu, { funcao: 'ataque' }),
        nome: jutsu.nome + (cargas > 1 ? ` (x${cargas})` : '') + (clones > 0 ? ` + ${clones} clone${clones > 1 ? 's' : ''}` : ''),
        categoria: p.categoria,
        dano: p.dano,
        reacao: nec.reacao,
        velocidade: nec.velocidade,
        impossivelEsquivar: !!jutsu.impossivel_esquivar,
        impossivelDefenderFisico: !!jutsu.impossivel_defender_fisico,
        sangramento: num(jutsu.sangramento) > 0 ? { valor: num(jutsu.sangramento), turnos: Math.max(1, num(jutsu.sangramento_turnos, 2)) } : null,
        chamas,
        genjutsu: ehGenjutsu ? {
            nome: jutsu.nome,
            efeito: ['paralisia', 'sem_reacao', 'confusao'].includes(jutsu.genjutsu_efeito) ? jutsu.genjutsu_efeito : 'paralisia',
            turnos: Math.max(1, num(jutsu.genjutsu_turnos, 1)),
            penalidade: Math.max(1, num(jutsu.genjutsu_penalidade, 2)),
            danoPorTurno: num(jutsu.genjutsu_dano),
            nivel: nivelDoRank(jutsu.rank),
            custo: custosDoJutsu(jutsu).chakra
        } : null
    });
    const custoTxt = [p.chakra ? `−${p.chakra} CP` : '', p.stamina ? `−${p.stamina} SP` : ''].filter(Boolean).join(' | ');
    anunciarAtaque(estado, uid, custoTxt, eventos);
}

// Monta o ataque que fica esperando a reação do adversário (a Precisão do atacante dificulta perceber/escapar)
function prepararAtaque(estado, uid, a) {
    const precisao = bonusAtivos(estado.lutadores[uid]).precisao;
    estado.ataquePendente = {
        de: uid,
        carta: a.carta,
        nome: a.nome,
        categoria: a.categoria,
        dano: a.dano,
        reacaoNecessaria: limitar(a.reacao + precisao, 1, 12),
        velocidadeNecessaria: limitar(a.velocidade + precisao, 1, 12),
        precisao,
        impossivelEsquivar: !!a.impossivelEsquivar,
        impossivelDefenderFisico: !!a.impossivelDefenderFisico,
        sangramento: a.sangramento || null,
        chamas: a.chamas || null,
        genjutsu: a.genjutsu || null
    };
    estado.ataquesRestantes -= 1;
}
function anunciarAtaque(estado, uid, custoTxt, eventos) {
    const atk = estado.ataquePendente, l = estado.lutadores[uid];
    eventos.push({ tipo: 'anim', anim: 'usar', de: uid, carta: { ...atk.carta, nome: atk.nome, resumo: atk.dano ? `💥 ${atk.dano}` : '👁️ Genjutsu' } });
    const extra = atk.precisao ? ` · Precisão +${atk.precisao}` : '';
    eventos.push({ tipo: 'ataque', de: uid, texto: `⚔️ ${l.nome} prepara ${atk.nome}: ${atk.dano} de dano potencial${extra}${custoTxt ? ` (${custoTxt})` : ''}.` });
}

// ---------------- criações (raízes, pedras, braços...) ----------------
// Ficam no campo até o dono desfazer ou serem destruídas. Podem atacar (sem pagar de novo) ou segurar golpes.
function maxCriacao(j) { return Math.max(1, num(j.criacao_max) || num(j.multiplicador_maximo) || 1); }
function acaoCriar(estado, uid, jutsu, opcoes, eventos) {
    const l = estado.lutadores[uid];
    const id = jutsu.id || jutsu.nome;
    l.criacoes = l.criacoes || [];
    const existente = l.criacoes.find(c => c.id === id);
    const max = maxCriacao(jutsu);
    const livre = max - (existente?.qtd || 0);
    if (livre <= 0) throw erro(`Você já tem o máximo de ${max} ${jutsu.criacao_nome || 'criações'} no campo.`);
    const qtd = limitar(Math.floor(num(opcoes.cargas, 1)) || 1, 1, livre);
    const c1 = custosDoJutsu(jutsu);
    const custo = { chakra: c1.chakra * qtd, stamina: c1.stamina * qtd };
    pagar(l, custo, eventos, jutsu.nome);
    const nec = necessidadesDoJutsu(jutsu);
    const grupo = existente || {
        id, jutsuNome: jutsu.nome, nome: jutsu.criacao_nome || 'Criações', icone: jutsu.criacao_icone || '🌀',
        qtd: 0, poder: poderDoJutsu(jutsu), absorve: Math.max(0, num(jutsu.criacao_absorve)),
        categoria: categoriaDoJutsu(jutsu), reacao: nec.reacao, velocidade: nec.velocidade,
        impossivelEsquivar: !!jutsu.impossivel_esquivar, impossivelDefenderFisico: !!jutsu.impossivel_defender_fisico,
        sangramento: num(jutsu.sangramento) > 0 ? { valor: num(jutsu.sangramento), turnos: Math.max(1, num(jutsu.sangramento_turnos, 2)) } : null,
        custoPorTurno: Math.abs(num(jutsu.custo_por_turno)),
        img: imagemCurta(jutsu.imagem), jutsuId: jutsu.id || null,
        requer: requisitosDoJutsu(jutsu)
    };
    grupo.qtd += qtd;
    if (!existente) l.criacoes.push(grupo);
    const custoTxt = [custo.chakra ? `−${custo.chakra} CP` : '', custo.stamina ? `−${custo.stamina} SP` : ''].filter(Boolean).join(' | ');
    eventos.push({ tipo: 'anim', anim: 'usar', de: uid, carta: cartaDoJutsu(jutsu, { funcao: 'suporte', resumo: `${grupo.icone} +${qtd} ${grupo.nome}` }) });
    eventos.push({ tipo: 'suporte', de: uid, texto: `${grupo.icone} ${l.nome} usou [${jutsu.nome}] e criou ${qtd} ${grupo.nome} (agora ${grupo.qtd} no campo)${custoTxt ? ` (${custoTxt})` : ''}.` });
}
function acaoAtacarComCriacao(estado, uid, acao, eventos) {
    if (estado.ataquesRestantes <= 0) throw erro('Você já atacou neste turno (máximo 1 ataque por turno).');
    const l = estado.lutadores[uid];
    const g = (l.criacoes || []).find(c => c.id === acao.criacaoId);
    if (!g) throw erro('Essa criação não está no campo.');
    if (!(g.poder > 0)) throw erro(`${g.nome} não causam dano.`);
    const qtd = limitar(Math.floor(num(acao.qtd, g.qtd)) || g.qtd, 1, g.qtd);
    const dano = Math.max(0, g.poder * qtd + bonusAtivos(l).ataque);
    prepararAtaque(estado, uid, {
        carta: { jutsuId: g.jutsuId, nome: g.jutsuNome, img: g.img, funcao: 'ataque', icone: g.icone },
        nome: `${qtd} ${g.nome} (${g.jutsuNome})`,
        categoria: g.categoria, dano, reacao: g.reacao, velocidade: g.velocidade,
        impossivelEsquivar: g.impossivelEsquivar, impossivelDefenderFisico: g.impossivelDefenderFisico, sangramento: g.sangramento
    });
    anunciarAtaque(estado, uid, '', eventos);
}

function acaoSuporte(estado, uid, jutsu, eventos) {
    const l = estado.lutadores[uid];
    const funcao = funcaoDoJutsu(jutsu);
    const id = jutsu.id || jutsu.nome;
    if (funcao === 'modo' && (l.efeitos || []).some(e => e.id === id)) throw erro(`[${jutsu.nome}] já está ativo.`);
    const custo = custosDoJutsu(jutsu);
    pagar(l, custo, eventos, jutsu.nome);
    const partes = [];
    const efeito = String(jutsu.efeito ?? '').toLowerCase();
    const poder = poderDoJutsu(jutsu);

    // Cura / recuperação imediata
    const ehItem = jutsu.tipoItem === 'item';
    const cura = num(jutsu.cura) || (efeito === 'cura' ? poder : 0) || (ehItem ? num(jutsu.bonus_hp) : 0);
    const recChakra = num(jutsu.recupera_chakra) || (efeito === 'chakra' ? poder : 0) || (ehItem ? num(jutsu.bonus_chakra) : 0);
    const recStamina = num(jutsu.recupera_stamina) || (ehItem ? num(jutsu.bonus_stamina) : 0);
    if (cura > 0) { const antes = l.vida; l.vida = Math.min(l.maxVida, l.vida + cura); partes.push(`+${l.vida - antes} Vida`); }
    if (recChakra > 0) { const antes = l.chakra; l.chakra = Math.min(l.maxChakra, l.chakra + recChakra); partes.push(`+${l.chakra - antes} Chakra`); }
    if (recStamina > 0) { const antes = l.stamina; l.stamina = Math.min(l.maxStamina, l.stamina + recStamina); partes.push(`+${l.stamina - antes} Stamina`); }

    // Clones: o chakra gasto vira a reserva deles
    const qtdClones = num(jutsu.clones) || (efeito === 'clones' ? Math.max(1, Math.round(poder)) : 0);
    if (qtdClones > 0) {
        l.clones = { qtd: (l.clones?.qtd || 0) + qtdClones, reserva: (l.clones?.reserva || 0) + custo.chakra, solidos: jutsu.clones_solidos !== false };
        partes.push(`${qtdClones} clone${qtdClones > 1 ? 's' : ''} (reserva ${l.clones.reserva} CP)`);
    }

    // Bônus temporários (suporte) ou contínuos (modo, com manutenção por turno)
    const bonus = bonusDoJutsu(jutsu);
    const manutencao = Math.abs(num(jutsu.custo_por_turno));
    if (Object.keys(bonus).length || manutencao || funcao === 'modo') {
        const duracao = num(jutsu.duracao, 0);
        l.efeitos = l.efeitos || [];
        const efeitoNovo = {
            id, nome: jutsu.nome, tipo: funcao === 'modo' ? 'modo' : 'buff', bonus,
            turnos: duracao > 0 ? duracao : (funcao === 'modo' ? null : 2),
            custoPorTurno: manutencao || 0
        };
        const requer = requisitosDoJutsu(jutsu);
        if (requer.length) efeitoNovo.requer = requer;           // some junto se o requisito for desligado
        if (jutsu.aura) efeitoNovo.aura = String(jutsu.aura);     // visual do modo na carta do personagem
        if (jutsu.resiste_genjutsu) efeitoNovo.resisteGenjutsu = nivelDoRank(jutsu.resiste_genjutsu);
        l.efeitos.push(efeitoNovo);
        if (efeitoNovo.resisteGenjutsu !== undefined) partes.push(`resiste a genjutsu até Rank ${NIVEIS[efeitoNovo.resisteGenjutsu]}`);
        const b = Object.entries(bonus).map(([k, v]) => `+${v} ${nomeBonus(k)}`);
        partes.push(...b);
        if (manutencao) partes.push(`manutenção ${manutencao} CP/turno`);
    }
    const custoTxt = [custo.chakra ? `−${custo.chakra} CP` : '', custo.stamina ? `−${custo.stamina} SP` : ''].filter(Boolean).join(' | ');
    eventos.push({ tipo: 'anim', anim: 'usar', de: uid, carta: cartaDoJutsu(jutsu, { resumo: partes.join(', ') }) });
    eventos.push({ tipo: 'suporte', de: uid, texto: `✨ ${l.nome} usou [${jutsu.nome}]${partes.length ? ': ' + partes.join(', ') : ''}${custoTxt ? ` (${custoTxt})` : ''}.` });
}

export function nomeBonus(k) {
    return { ataque: 'Ataque', defesa: 'Defesa', velocidade: 'Velocidade', reacao: 'Reação', precisao: 'Precisão' }[k] || k;
}

// Tira efeitos cujo requisito não está mais ativo (ex.: desligou o Mangekyou → some o Campo de Execução)
function limparDependentes(estado, uid, eventos) {
    const l = estado.lutadores[uid];
    let mudou = true;
    while (mudou) {
        mudou = false;
        for (const e of l.efeitos || []) {
            if (e.requer?.length && !(l.efeitos || []).some(x => e.requer.includes(x.id))) {
                l.efeitos = l.efeitos.filter(x => x !== e);
                eventos.push({ tipo: 'efeito', texto: `⏹️ [${e.nome}] de ${l.nome} terminou junto com o seu requisito.` });
                mudou = true;
                break;
            }
        }
    }
    const antes = (l.criacoes || []).length;
    l.criacoes = (l.criacoes || []).filter(c => !c.requer?.length || (l.efeitos || []).some(x => c.requer.includes(x.id)));
    if (l.criacoes.length < antes) eventos.push({ tipo: 'efeito', texto: `💨 Criações de ${l.nome} se desfizeram junto com o seu requisito.` });
}

// Apaga as chamas mantidas por "dono" (no alvo e o custo de manutenção dele)
function apagarChamasDe(estado, dono) {
    for (const uid of estado.ordem) {
        const l = estado.lutadores[uid];
        l.efeitos = (l.efeitos || []).filter(e => !(e.tipo === 'chamas' && e.de === dono) && !(uid === dono && e.tipo === 'manter_chamas'));
    }
}

export function genjutsuAtivo(lutador) {
    return (lutador.efeitos || []).find(e => e.tipo === 'genjutsu') || null;
}

// ---------------- reação ao ataque ----------------
export function avaliarReacao(defensor, ataque) {
    const b = bonusAtivos(defensor);
    const reacao = defensor.atributos.reacao + b.reacao;
    const gen = genjutsuAtivo(defensor);
    const presoNoGenjutsu = !!gen && (gen.efeitoGenjutsu === 'paralisia' || gen.efeitoGenjutsu === 'sem_reacao');
    const percebe = !presoNoGenjutsu && reacao >= ataque.reacaoNecessaria;
    const fisico = ['taijutsu', 'bukijutsu', 'kenjutsu', 'ferramenta'].includes(ataque.categoria);
    return {
        reacao, percebe, presoNoGenjutsu,
        velocidade: defensor.atributos.velocidade + b.velocidade,
        podeEsquivar: percebe && !ataque.impossivelEsquivar,
        podeDefenderFisico: percebe && fisico && !ataque.impossivelDefenderFisico,
        podeUsarJutsu: percebe,
        defesaBase: defensor.atributos.defesa + b.defesa
    };
}

// Resultado da esquiva: velocidade ≥ necessária escapa; 1 abaixo toma metade; 2+ abaixo toma tudo
export function resultadoEsquiva(velocidade, necessaria) {
    const diferenca = velocidade - necessaria;
    if (diferenca >= 0) return { fator: 0, texto: 'escapa totalmente' };
    if (diferenca === -1) return { fator: 0.5, texto: 'escapa parcialmente (metade do dano)' };
    return { fator: 1, texto: 'não consegue escapar' };
}

function aplicarReacao(estado, uid, opcao, jutsu, eventos, criacaoId) {
    const atk = estado.ataquePendente;
    const d = estado.lutadores[uid];
    const a = estado.lutadores[atk.de];
    const av = avaliarReacao(d, atk);
    let dano = atk.dano;
    let texto = '';
    let resultado = 'acerto';
    let refletido = false;
    let cartaReacao = null;
    let apagouChamas = false;
    if (jutsu && !requisitoAtendido(d, jutsu)) throw erro(`[${jutsu.nome}] exige outro jutsu ativo.`);
    if (jutsu && !usoNaArena(jutsu)) throw erro(`[${jutsu.nome}] não tem uso na arena.`);

    if (opcao !== 'receber' && !av.percebe) opcao = 'receber';
    if (opcao === 'receber' && !av.percebe) resultado = 'naopercebeu';
    if (opcao === 'receber') {
        texto = av.percebe ? `${d.nome} recebeu o golpe em cheio.` : (av.presoNoGenjutsu ? `${d.nome} está preso num genjutsu e não consegue reagir!` : `${d.nome} não percebeu o ataque a tempo (Reação ${av.reacao} < ${atk.reacaoNecessaria})!`);
    } else if (opcao === 'esquivar') {
        if (!av.podeEsquivar) throw erro('Não é possível esquivar deste ataque.');
        let vel = av.velocidade;
        if (jutsu) {
            if (funcaoDoJutsu(jutsu) !== 'esquiva') throw erro('Esse jutsu não é de esquiva.');
            pagar(d, custosDoJutsu(jutsu), eventos, jutsu.nome);
            vel += poderDoJutsu(jutsu);
        }
        const r = resultadoEsquiva(vel, atk.velocidadeNecessaria);
        dano = Math.round(dano * r.fator);
        resultado = r.fator === 0 ? 'esquiva' : (r.fator < 1 ? 'parcial' : 'esquiva_falhou');
        texto = `💨 ${d.nome} tentou esquivar${jutsu ? ` com [${jutsu.nome}]` : ''} (Velocidade ${vel} × ${atk.velocidadeNecessaria} necessária) e ${r.texto}.`;
    } else if (opcao === 'defender') {
        let absorcao;
        if (jutsu) {
            if (funcaoDoJutsu(jutsu) !== 'defesa') throw erro('Esse jutsu não é de defesa.');
            pagar(d, custosDoJutsu(jutsu), eventos, jutsu.nome);
            absorcao = av.defesaBase + poderDoJutsu(jutsu);
            texto = `🛡️ ${d.nome} se defendeu com [${jutsu.nome}] (absorve ${absorcao}).`;
            if (atk.chamas && nivelDoRank(jutsu.rank) >= nivelDoRank('S')) apagouChamas = true;
        } else {
            if (!av.podeDefenderFisico) throw erro('Defesa física não funciona contra este ataque.');
            absorcao = av.defesaBase;
            texto = `🛡️ ${d.nome} bloqueou fisicamente (absorve ${absorcao}).`;
        }
        dano = Math.max(0, dano - absorcao);
        resultado = dano === 0 ? 'defesa' : 'defesa_parcial';
    } else if (opcao === 'criacao') {
        const g = (d.criacoes || []).find(c => c.id === criacaoId);
        if (!g || !(g.absorve > 0)) throw erro('Essa criação não pode segurar golpes.');
        const usadas = Math.min(g.qtd, Math.max(1, Math.ceil(dano / g.absorve)));
        const absorcao = usadas * g.absorve;
        g.qtd -= usadas;
        cartaReacao = { nome: `${g.nome} (${usadas})`, funcao: 'defesa', icone: g.icone, img: g.img || null, jutsuId: g.jutsuId || null };
        if (g.qtd <= 0) d.criacoes = d.criacoes.filter(c => c !== g);
        dano = Math.max(0, dano - absorcao);
        resultado = dano === 0 ? 'defesa' : 'defesa_parcial';
        texto = `${g.icone} ${d.nome} bloqueou com ${usadas} ${g.nome} (absorvem ${absorcao}); ${usadas > 1 ? 'elas se quebraram' : 'uma se quebrou'}${g.qtd > 0 ? `, restam ${g.qtd}` : ''}.`;
    } else if (opcao === 'espelho') {
        if (!atk.genjutsu) throw erro('O Retorno do Espelho só funciona contra genjutsu.');
        if (!jutsu || funcaoDoJutsu(jutsu) !== 'espelho') throw erro('Escolha a técnica de reflexo.');
        const rankMax = nivelDoRank(jutsu.espelho_rank_max || 'A');
        if (atk.genjutsu.nivel > rankMax) throw erro(`[${jutsu.nome}] só devolve genjutsu até Rank ${NIVEIS[rankMax]}.`);
        const temDoujutsu = (d.efeitos || []).some(e => e.tipo === 'modo');
        const minimo = num(jutsu.reacao_minima, 5);
        if (!temDoujutsu && av.reacao < minimo) throw erro(`Precisa de um doujutsu ativo ou Reação ${minimo}.`);
        pagar(d, { chakra: atk.genjutsu.custo + custosDoJutsu(jutsu).chakra, stamina: custosDoJutsu(jutsu).stamina }, eventos, jutsu.nome);
        refletido = true;
        resultado = 'esquiva';
        texto = `🪞 ${d.nome} usou [${jutsu.nome}] e devolveu a ilusão para ${a.nome}!`;
    } else {
        throw erro('Reação desconhecida.');
    }

    // Clone sólido absorve o golpe no lugar do dono
    if (refletido) {
        eventos.push({ tipo: 'anim', anim: 'impacto', de: atk.de, alvo: uid, resultado, dano: 0, carta: { ...(atk.carta || { nome: atk.nome, funcao: 'ataque' }), nome: atk.nome }, defesa: cartaDoJutsu(jutsu) });
        eventos.push({ tipo: 'reacao', de: uid, texto });
        if (atk.dano > 0) { a.vida -= atk.dano; eventos.push({ tipo: 'dano', de: uid, texto: `💥 ${a.nome} sofreu ${atk.dano} da própria ilusão.` }); }
        prenderNoGenjutsu(a, atk.genjutsu, uid, eventos);
        estado.ataquePendente = null;
        return;
    }
    if (dano > 0 && d.clones?.qtd > 0 && d.clones.solidos && !atk.genjutsu) {
        d.clones.qtd -= 1;
        if (d.clones.qtd <= 0) d.clones = { qtd: 0, reserva: 0, solidos: true };
        eventos.push({ tipo: 'reacao', de: uid, texto });
        eventos.push({ tipo: 'efeito', texto: `💥 Um clone de ${d.nome} recebeu o golpe e se desfez!` });
        dano = 0;
        texto = null;
        resultado = 'clone';
    }
    eventos.push({
        tipo: 'anim', anim: 'impacto', de: atk.de, alvo: uid, resultado, dano,
        carta: { ...(atk.carta || { nome: atk.nome, funcao: 'ataque' }), nome: atk.nome },
        defesa: cartaReacao || (jutsu ? cartaDoJutsu(jutsu) : null)
    });

    if (texto) eventos.push({ tipo: 'reacao', de: uid, texto });
    const pegou = ['acerto', 'naopercebeu', 'esquiva_falhou', 'defesa_parcial'].includes(resultado);
    // Dor forte quebra um genjutsu em que a pessoa já estava presa
    const genAntigo = genjutsuAtivo(d);
    if (genAntigo && dano >= d.maxVida * ARENA.dorQuebraGenjutsu) {
        d.efeitos = d.efeitos.filter(e => e !== genAntigo);
        eventos.push({ tipo: 'efeito', texto: `💢 A dor do golpe quebrou o genjutsu [${genAntigo.nome}] de ${d.nome}!` });
    }
    if (atk.genjutsu && pegou) prenderNoGenjutsu(d, atk.genjutsu, atk.de, eventos);
    if (atk.chamas) {
        if (apagouChamas) eventos.push({ tipo: 'efeito', texto: `🛡️ A defesa de ${d.nome} apagou as chamas de [${atk.chamas.nome}].` });
        else if (pegou && dano > 0) {
            d.efeitos = d.efeitos || [];
            d.efeitos.push({ id: 'chamas-' + atk.de, nome: atk.chamas.nome, tipo: 'chamas', bonus: {}, turnos: null, danoPorTurno: atk.chamas.dano, de: atk.de });
            a.efeitos = a.efeitos || [];
            a.efeitos.push({ id: 'manter-chamas', nome: atk.chamas.nome, tipo: 'manter_chamas', bonus: {}, turnos: null, custoPorTurno: atk.chamas.manutencao, alvo: uid });
            eventos.push({ tipo: 'efeito', texto: `🔥 ${d.nome} está em chamas: ${atk.chamas.dano} por turno até ${a.nome} apagar ou ficar sem chakra para manter.` });
        }
    }
    if (dano > 0) {
        d.vida -= dano;
        eventos.push({ tipo: 'dano', de: atk.de, texto: `💥 ${d.nome} sofreu ${dano} de dano de ${a.nome}.` });
        if (atk.sangramento) {
            d.efeitos = d.efeitos || [];
            d.efeitos.push({ id: 'sangramento-' + Date.now(), nome: 'Sangramento', tipo: 'sangramento', bonus: {}, turnos: atk.sangramento.turnos, danoPorTurno: atk.sangramento.valor });
            eventos.push({ tipo: 'efeito', texto: `🩸 ${d.nome} está sangrando (${atk.sangramento.valor}/turno por ${atk.sangramento.turnos} turnos).` });
        }
    } else if (texto) {
        eventos.push({ tipo: 'dano', de: atk.de, texto: `✅ ${d.nome} não sofreu dano.` });
    }
    estado.ataquePendente = null;
}

// Prende o lutador num genjutsu (um por vez), a menos que um doujutsu ativo resista
function prenderNoGenjutsu(l, g, de, eventos) {
    const resistencia = Math.max(-1, ...(l.efeitos || []).map(e => e.resisteGenjutsu ?? -1));
    if (g.nivel <= resistencia) {
        eventos.push({ tipo: 'efeito', texto: `👁️ O doujutsu de ${l.nome} resistiu ao genjutsu [${g.nome}].` });
        return;
    }
    const bonus = g.efeito === 'confusao' ? { reacao: -g.penalidade, velocidade: -g.penalidade } : {};
    l.efeitos = (l.efeitos || []).filter(e => e.tipo !== 'genjutsu');
    l.efeitos.push({ id: 'genjutsu', nome: g.nome, tipo: 'genjutsu', efeitoGenjutsu: g.efeito, bonus, turnos: g.turnos + 1, danoPorTurno: g.danoPorTurno || 0, custoKai: g.custo, nivel: g.nivel, de });
    const como = { paralisia: 'não pode agir nem reagir', sem_reacao: 'não consegue reagir a ataques', confusao: `perde ${g.penalidade} de Reação e Velocidade` }[g.efeito];
    eventos.push({ tipo: 'efeito', texto: `👁️ ${l.nome} caiu no genjutsu [${g.nome}]: ${como} por ${g.turnos} turno${g.turnos > 1 ? 's' : ''}. Só o Contra-Genjutsu (Kai) ou uma dor forte liberta.` });
}

// ---------------- ação principal: aplica qualquer jogada ----------------
// acao = { tipo, ... }:
//   jutsu      { jutsu, cargas?, clones? }   (ataque, suporte ou modo; conta 1 das 3 ações)
//   item       { item }                       (ferramenta = ataque; consumível = suporte)
//   desativar  { efeitoId }                   (desliga um modo; não gasta ação)
//   passar     {}                             (encerra o turno)
//   reagir     { opcao, jutsu? }              (receber | esquivar | defender)
//   desistir / propor_empate / aceitar_empate / recusar_empate
//   tempo_esgotado {}                         (cronômetro zerou)
//   presenca / pausar / retomar              (controle de pausa)
export function aplicarAcao(estadoAtual, uid, acao, agora = Date.now()) {
    const estado = clonar(estadoAtual);
    const eventos = [];
    const t = acao.tipo;

    if (t === 'desistir') {
        if (estado.status !== 'em_andamento') throw erro('A batalha já terminou.');
        eventos.push({ tipo: 'sistema', texto: `🏳️ ${estado.lutadores[uid].nome} desistiu da batalha.` });
        return { estado: finalizar(estado, outro(estado, uid), 'desistencia', eventos), eventos };
    }
    if (t === 'propor_empate') {
        if (estado.status !== 'em_andamento') throw erro('A batalha já terminou.');
        estado.propostaEmpate = uid;
        eventos.push({ tipo: 'sistema', texto: `🤝 ${estado.lutadores[uid].nome} propôs empate.` });
        return { estado, eventos };
    }
    if (t === 'aceitar_empate') {
        if (!estado.propostaEmpate || estado.propostaEmpate === uid) throw erro('Não há proposta de empate para aceitar.');
        eventos.push({ tipo: 'sistema', texto: `🤝 ${estado.lutadores[uid].nome} aceitou o empate.` });
        return { estado: finalizar(estado, null, 'acordo', eventos), eventos };
    }
    if (t === 'recusar_empate') {
        if (!estado.propostaEmpate || estado.propostaEmpate === uid) throw erro('Não há proposta de empate.');
        estado.propostaEmpate = null;
        eventos.push({ tipo: 'sistema', texto: `❌ ${estado.lutadores[uid].nome} recusou o empate. A luta continua!` });
        return { estado, eventos };
    }

    if (t === 'jutsu' || t === 'item') {
        exigirVez(estado, uid, 'acao');
        if (estado.acoesRestantes <= 0) throw erro('Você já usou suas 3 ações neste turno. Passe o turno.');
        const j = t === 'item' ? { ...acao.item, tipoItem: acao.item.tipoItem } : acao.jutsu;
        if (!usoNaArena(j)) throw erro(`[${j?.nome || 'Isso'}] não tem uso na arena.`);
        exigirLivreDoGenjutsu(estado.lutadores[uid]);
        if (!requisitoAtendido(estado.lutadores[uid], j)) throw erro(`[${j.nome}] exige outro jutsu ativo.`);
        const funcao = funcaoDoJutsu(j);
        const ehAtaque = t === 'item' ? acao.item.tipoItem === 'ferramenta' && poderDoJutsu(j) > 0 : funcao === 'ataque';
        if (!ehAtaque && t === 'jutsu' && ['defesa', 'esquiva', 'espelho'].includes(funcao)) throw erro('Jutsus de defesa, esquiva e reflexo são usados na hora de reagir a um ataque.');
        if (!ehAtaque && t === 'jutsu' && funcao === 'kai') throw erro('O Contra-Genjutsu só é usado quando você está preso num genjutsu.');
        if (ehAtaque) acaoAtaque(estado, uid, j, acao, eventos);
        else if (t === 'jutsu' && funcao === 'criacao') acaoCriar(estado, uid, j, acao, eventos);
        else acaoSuporte(estado, uid, j, eventos);
        estado.acoesRestantes -= 1;
        return { estado: verificarFim(estado, eventos), eventos };
    }

    if (t === 'desativar') {
        exigirVez(estado, uid, 'acao');
        const l = estado.lutadores[uid];
        const e = (l.efeitos || []).find(x => x.id === acao.efeitoId && x.tipo === 'modo');
        if (!e) throw erro('Esse modo não está ativo.');
        l.efeitos = l.efeitos.filter(x => x !== e);
        eventos.push({ tipo: 'efeito', texto: `⏹️ ${l.nome} desativou [${e.nome}].` });
        limparDependentes(estado, uid, eventos);
        return { estado, eventos };
    }

    if (t === 'criacao_atacar') {
        exigirVez(estado, uid, 'acao');
        if (estado.acoesRestantes <= 0) throw erro('Você já usou suas 3 ações neste turno. Passe o turno.');
        exigirLivreDoGenjutsu(estado.lutadores[uid]);
        acaoAtacarComCriacao(estado, uid, acao, eventos);
        estado.acoesRestantes -= 1;
        return { estado, eventos };
    }

    if (t === 'desfazer_criacao') {
        exigirVez(estado, uid, 'acao');
        const l = estado.lutadores[uid];
        const g = (l.criacoes || []).find(c => c.id === acao.criacaoId);
        if (!g) throw erro('Essa criação não está no campo.');
        l.criacoes = l.criacoes.filter(c => c !== g);
        eventos.push({ tipo: 'efeito', texto: `💨 ${l.nome} desfez ${g.qtd} ${g.nome}.` });
        return { estado, eventos };
    }

    // Contra-Genjutsu (Kai): única ação de quem está preso. Custa o chakra do genjutsu + o do Kai.
    if (t === 'kai') {
        exigirVez(estado, uid, 'acao');
        if (estado.acoesRestantes <= 0) throw erro('Você já usou suas 3 ações neste turno. Passe o turno.');
        const l = estado.lutadores[uid];
        const g = genjutsuAtivo(l);
        if (!g) throw erro('Você não está preso em nenhum genjutsu.');
        const j = acao.jutsu;
        if (!j || funcaoDoJutsu(j) !== 'kai') throw erro('Escolha o Contra-Genjutsu.');
        const minimo = num(j.reacao_minima, 5);
        const reacao = l.atributos.reacao + bonusAtivos(l).reacao;
        if (reacao < minimo) throw erro(`O Kai exige Reação ${minimo} (você tem ${reacao}).`);
        const c = custosDoJutsu(j);
        pagar(l, { chakra: num(g.custoKai) + c.chakra, stamina: c.stamina }, eventos, j.nome);
        l.efeitos = l.efeitos.filter(e => e !== g);
        estado.acoesRestantes -= 1;
        eventos.push({ tipo: 'anim', anim: 'usar', de: uid, carta: cartaDoJutsu(j, { funcao: 'suporte', resumo: '✋ Kai!' }) });
        eventos.push({ tipo: 'suporte', de: uid, texto: `✋ ${l.nome} usou [${j.nome}] e quebrou o genjutsu [${g.nome}] (−${num(g.custoKai) + c.chakra} CP).` });
        return { estado: verificarFim(estado, eventos), eventos };
    }

    // Apagar chamas: o dono apaga quando quiser (grátis); o alvo só com uma defesa Rank S (gasta 1 ação)
    if (t === 'apagar_chamas') {
        exigirVez(estado, uid, 'acao');
        const l = estado.lutadores[uid];
        if ((l.efeitos || []).some(e => e.tipo === 'manter_chamas')) {
            const nome = l.efeitos.find(e => e.tipo === 'manter_chamas').nome;
            apagarChamasDe(estado, uid);
            eventos.push({ tipo: 'efeito', texto: `🔥 ${l.nome} apagou as chamas de [${nome}].` });
            return { estado, eventos };
        }
        const ch = (l.efeitos || []).find(e => e.tipo === 'chamas');
        if (!ch) throw erro('Não há chamas para apagar.');
        const j = acao.jutsu;
        if (!j || funcaoDoJutsu(j) !== 'defesa' || nivelDoRank(j.rank) < nivelDoRank('S')) throw erro('Só uma defesa de Rank S apaga essas chamas.');
        if (estado.acoesRestantes <= 0) throw erro('Você já usou suas 3 ações neste turno. Passe o turno.');
        if (!requisitoAtendido(l, j)) throw erro(`[${j.nome}] exige outro jutsu ativo.`);
        pagar(l, custosDoJutsu(j), eventos, j.nome);
        apagarChamasDe(estado, ch.de);
        estado.acoesRestantes -= 1;
        eventos.push({ tipo: 'suporte', de: uid, texto: `🛡️ ${l.nome} usou [${j.nome}] e apagou as chamas de [${ch.nome}].` });
        return { estado: verificarFim(estado, eventos), eventos };
    }

    if (t === 'passar' || (t === 'tempo_esgotado' && estado.fase === 'acao')) {
        if (t === 'passar') exigirVez(estado, uid, 'acao');
        else if (estado.status !== 'em_andamento' || estado.pausada || agora < estado.prazo) throw erro('O tempo ainda não acabou.');
        const quem = estado.vez;
        if (t === 'tempo_esgotado') eventos.push({ tipo: 'sistema', texto: `⏰ O tempo de ${estado.lutadores[quem].nome} acabou.` });
        if (estado.ataquePendente) {
            estado.fase = 'reacao';
            estado.prazo = agora + ARENA.tempoReacaoMs;
            const alvo = estado.lutadores[outro(estado, quem)];
            eventos.push({ tipo: 'sistema', texto: `⚠️ ${alvo.nome}, o ataque está vindo! Reaja!` });
            return { estado, eventos };
        }
        return { estado: iniciarTurno(estado, outro(estado, quem), agora, eventos), eventos };
    }

    if (t === 'reagir' || (t === 'tempo_esgotado' && estado.fase === 'reacao')) {
        const defensor = outro(estado, estado.vez);
        if (t === 'reagir') exigirVez(estado, uid, 'reacao');
        else {
            if (estado.status !== 'em_andamento' || estado.pausada || agora < estado.prazo) throw erro('O tempo ainda não acabou.');
            eventos.push({ tipo: 'sistema', texto: `⏰ ${estado.lutadores[defensor].nome} não reagiu a tempo.` });
        }
        aplicarReacao(estado, defensor, t === 'reagir' ? acao.opcao : 'receber', t === 'reagir' ? acao.jutsu : null, eventos, acao.criacaoId);
        verificarFim(estado, eventos);
        if (estado.status !== 'em_andamento') return { estado, eventos };
        return { estado: iniciarTurno(estado, defensor, agora, eventos), eventos };
    }

    if (t === 'presenca') {
        estado.presenca = estado.presenca || {};
        estado.presenca[uid] = agora;
        return { estado: atualizarPausa(estado, agora, eventos), eventos };
    }

    throw erro('Ação desconhecida: ' + t);
}

// ---------------- pausa automática ----------------
export function alguemAusente(estado, agora) {
    return estado.ordem.some(uid => agora - num(estado.presenca?.[uid]) > ARENA.ausenciaMs);
}

export function atualizarPausa(estado, agora, eventos = []) {
    if (estado.status !== 'em_andamento') return estado;
    const ausente = alguemAusente(estado, agora);
    if (ausente && !estado.pausada) {
        estado.pausada = true;
        estado.restanteMs = Math.max(5000, estado.prazo - agora);
        const quem = estado.ordem.filter(uid => agora - num(estado.presenca?.[uid]) > ARENA.ausenciaMs).map(u => estado.lutadores[u].nome).join(' e ');
        eventos.push({ tipo: 'sistema', texto: `⏸️ Batalha pausada: ${quem} saiu da arena.` });
    } else if (!ausente && estado.pausada) {
        estado.pausada = false;
        estado.prazo = agora + Math.max(5000, num(estado.restanteMs, ARENA.tempoAcaoMs));
        estado.restanteMs = null;
        eventos.push({ tipo: 'sistema', texto: '▶️ Os dois ninjas estão na arena. A batalha continua!' });
    }
    return estado;
}

// Quanto XP pode ser apostado (precisa sobrar o mínimo na barra do nível)
export function xpApostavel(xpAtual) {
    return Math.max(0, Math.floor(num(xpAtual)) - ARENA.xpMinimoNaBarra);
}
