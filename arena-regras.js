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
    historicoMax: 400
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
    if (j?.bonus && typeof j.bonus === 'object') {
        const b = {};
        for (const k of ['ataque', 'defesa', 'velocidade', 'reacao']) if (j.bonus[k]) b[k] = num(j.bonus[k]);
        return b;
    }
    const efeito = String(j?.efeito ?? '').toLowerCase();
    if (['ataque', 'defesa', 'velocidade', 'reacao'].includes(efeito)) return { [efeito]: poderDoJutsu(j) };
    return {};
}

export function custosDoJutsu(j) {
    return { chakra: Math.abs(num(j?.chakra)), stamina: Math.abs(num(j?.stamina)) };
}

// ---------------- estado ----------------
export function outro(estado, uid) {
    return estado.ordem[0] === uid ? estado.ordem[1] : estado.ordem[0];
}

export function bonusAtivos(lutador) {
    const total = { ataque: 0, defesa: 0, velocidade: 0, reacao: 0 };
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
        clones: { qtd: 0, reserva: 0, solidos: true }
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
        if (e.custoPorTurno) {
            l.chakra -= e.custoPorTurno;
            eventos.push({ tipo: 'efeito', texto: `🌀 ${l.nome} mantém [${e.nome}] (−${e.custoPorTurno} chakra).` });
        }
        if (e.danoPorTurno) {
            l.vida -= e.danoPorTurno;
            eventos.push({ tipo: 'efeito', texto: `🩸 ${l.nome} sofre ${e.danoPorTurno} de dano por [${e.nome}].` });
        }
        if (e.turnos !== null && e.turnos !== undefined) {
            e.turnos -= 1;
            if (e.turnos <= 0) { eventos.push({ tipo: 'efeito', texto: `⌛ O efeito [${e.nome}] de ${l.nome} terminou.` }); continue; }
        }
        ficam.push(e);
    }
    l.efeitos = ficam;
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
    pagar(l, { chakra: p.chakra, stamina: p.stamina }, eventos, jutsu.nome);
    if (clones > 0) {
        l.clones.reserva -= p.custoClones;
        if (l.clones.reserva < ARENA.custoMinimoClone) {
            eventos.push({ tipo: 'efeito', texto: `💨 Os clones de ${l.nome} ficaram sem chakra e se desfizeram.` });
            l.clones = { qtd: 0, reserva: 0, solidos: true };
        }
    }
    const nec = necessidadesDoJutsu(jutsu);
    estado.ataquePendente = {
        de: uid,
        carta: cartaDoJutsu(jutsu, { funcao: 'ataque' }),
        nome: jutsu.nome + (cargas > 1 ? ` (x${cargas})` : '') + (clones > 0 ? ` + ${clones} clone${clones > 1 ? 's' : ''}` : ''),
        categoria: p.categoria,
        dano: p.dano,
        reacaoNecessaria: nec.reacao,
        velocidadeNecessaria: nec.velocidade,
        impossivelEsquivar: !!jutsu.impossivel_esquivar,
        impossivelDefenderFisico: !!jutsu.impossivel_defender_fisico,
        sangramento: num(jutsu.sangramento) > 0 ? { valor: num(jutsu.sangramento), turnos: Math.max(1, num(jutsu.sangramento_turnos, 2)) } : null
    };
    estado.ataquesRestantes -= 1;
    const custoTxt = [p.chakra ? `−${p.chakra} CP` : '', p.stamina ? `−${p.stamina} SP` : ''].filter(Boolean).join(' | ');
    eventos.push({ tipo: 'anim', anim: 'usar', de: uid, carta: { ...estado.ataquePendente.carta, nome: estado.ataquePendente.nome, resumo: `💥 ${p.dano}` } });
    eventos.push({ tipo: 'ataque', de: uid, texto: `⚔️ ${l.nome} prepara ${estado.ataquePendente.nome}: ${p.dano} de dano potencial${custoTxt ? ` (${custoTxt})` : ''}.` });
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
    const cura = num(jutsu.cura) || (efeito === 'cura' ? poder : 0) || num(jutsu.bonus_hp);
    const recChakra = num(jutsu.recupera_chakra) || (efeito === 'chakra' ? poder : 0) || num(jutsu.bonus_chakra);
    const recStamina = num(jutsu.recupera_stamina) || num(jutsu.bonus_stamina);
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
        l.efeitos.push({
            id, nome: jutsu.nome, tipo: funcao === 'modo' ? 'modo' : 'buff', bonus,
            turnos: duracao > 0 ? duracao : (funcao === 'modo' ? null : 2),
            custoPorTurno: manutencao || 0
        });
        const b = Object.entries(bonus).map(([k, v]) => `+${v} ${nomeBonus(k)}`);
        partes.push(...b);
        if (manutencao) partes.push(`manutenção ${manutencao} CP/turno`);
    }
    const custoTxt = [custo.chakra ? `−${custo.chakra} CP` : '', custo.stamina ? `−${custo.stamina} SP` : ''].filter(Boolean).join(' | ');
    eventos.push({ tipo: 'anim', anim: 'usar', de: uid, carta: cartaDoJutsu(jutsu, { resumo: partes.join(', ') }) });
    eventos.push({ tipo: 'suporte', de: uid, texto: `✨ ${l.nome} usou [${jutsu.nome}]${partes.length ? ': ' + partes.join(', ') : ''}${custoTxt ? ` (${custoTxt})` : ''}.` });
}

export function nomeBonus(k) {
    return { ataque: 'Ataque', defesa: 'Defesa', velocidade: 'Velocidade', reacao: 'Reação' }[k] || k;
}

// ---------------- reação ao ataque ----------------
export function avaliarReacao(defensor, ataque) {
    const b = bonusAtivos(defensor);
    const reacao = defensor.atributos.reacao + b.reacao;
    const percebe = reacao >= ataque.reacaoNecessaria;
    const fisico = ['taijutsu', 'bukijutsu', 'kenjutsu', 'ferramenta'].includes(ataque.categoria);
    return {
        reacao, percebe,
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

function aplicarReacao(estado, uid, opcao, jutsu, eventos) {
    const atk = estado.ataquePendente;
    const d = estado.lutadores[uid];
    const a = estado.lutadores[atk.de];
    const av = avaliarReacao(d, atk);
    let dano = atk.dano;
    let texto = '';
    let resultado = 'acerto';

    if (opcao !== 'receber' && !av.percebe) opcao = 'receber';
    if (opcao === 'receber' && !av.percebe) resultado = 'naopercebeu';
    if (opcao === 'receber') {
        texto = av.percebe ? `${d.nome} recebeu o golpe em cheio.` : `${d.nome} não percebeu o ataque a tempo (Reação ${av.reacao} < ${atk.reacaoNecessaria})!`;
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
        } else {
            if (!av.podeDefenderFisico) throw erro('Defesa física não funciona contra este ataque.');
            absorcao = av.defesaBase;
            texto = `🛡️ ${d.nome} bloqueou fisicamente (absorve ${absorcao}).`;
        }
        dano = Math.max(0, dano - absorcao);
        resultado = dano === 0 ? 'defesa' : 'defesa_parcial';
    } else {
        throw erro('Reação desconhecida.');
    }

    // Clone sólido absorve o golpe no lugar do dono
    if (dano > 0 && d.clones?.qtd > 0 && d.clones.solidos) {
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
        defesa: jutsu ? cartaDoJutsu(jutsu) : null
    });

    if (texto) eventos.push({ tipo: 'reacao', de: uid, texto });
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
        const ehAtaque = t === 'item' ? acao.item.tipoItem === 'ferramenta' && poderDoJutsu(j) > 0 : funcaoDoJutsu(j) === 'ataque';
        if (!ehAtaque && t === 'jutsu' && ['defesa', 'esquiva'].includes(funcaoDoJutsu(j))) throw erro('Jutsus de defesa e esquiva são usados na hora de reagir a um ataque.');
        if (ehAtaque) acaoAtaque(estado, uid, j, acao, eventos);
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
        return { estado, eventos };
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
        aplicarReacao(estado, defensor, t === 'reagir' ? acao.opcao : 'receber', t === 'reagir' ? acao.jutsu : null, eventos);
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
