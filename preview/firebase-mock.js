// =====================================================================
//  FIREBASE DE MENTIRA — SÓ PARA PRÉ-VISUALIZAÇÃO LOCAL
//  Usado por preview.html (via importmap). NÃO toca no banco real.
//  Tudo fica na memória do navegador e some ao recarregar a página.
// =====================================================================

// ---------- Imagens de exemplo (SVG gerado, funciona sem internet) ----------
function img(texto, c1, c2, icone = '') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#g)"/>
<circle cx="330" cy="60" r="90" fill="#ffffff" opacity="0.08"/><circle cx="60" cy="260" r="70" fill="#000000" opacity="0.08"/>
<text x="200" y="${icone ? 140 : 175}" font-family="Georgia, serif" font-size="${icone ? 90 : 120}" text-anchor="middle" fill="#fff" opacity="0.92">${icone || texto}</text>
${icone ? `<text x="200" y="235" font-family="Verdana, sans-serif" font-weight="bold" font-size="30" text-anchor="middle" fill="#fff">${texto}</text>` : ''}
</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const avatar = (letra, c1, c2) => img(letra, c1, c2);

// ---------- Banco de dados de exemplo ----------
const agora = Date.now();
const ts = (msAtras) => mkTs(agora - msAtras);
function mkTs(ms) { return { toDate: () => new Date(ms), toMillis: () => ms, seconds: Math.floor(ms / 1000) }; }

const DB = {
    game_config: { sistema_nivel: { tabela_xp: [300, 500, 800, 1200, 1700, 2300, 3000] } },
    users: {
        u1: {
            nome: "Kenji Uzumaki", apelido: "Clã Uzumaki", avatar: avatar("K", "#f97316", "#9a3412"),
            nivel: 4, xp: 820, ryos: 15400, essencia_ninja: 120, cargo: "Chunin", patente: "Chunin", rank: "B", speed_rank: 7, reacao: 6, tipo: "Ninjutsu",
            vida: 140, max_vida: 180, sanidade: 90, max_sanidade: 100, chakra: 210, max_chakra: 260, stamina: 95, max_stamina: 150, controle_chakra: "Médio",
            forca: 14, defesa: 12, constituicao: 15, destreza: 13, intelecto: 11, agilidade: 16, velocidade: 15,
            vitorias: 12, derrotas: 3, empates: 1, elementos: ["vento", "agua"], kekkei_genkai: [], bijuus: [],
            meusJutsus: ["rasengan", "kage_bunshin", "kawarimi", "goukakyuu", "parede_agua", "modo_sabio", "sharingan", "genjutsu_sharingan", "raizes", "amaterasu", "contra_genjutsu", "susanoo"], maestrias: { rasengan: 3, kage_bunshin: 5 },
            inventario: { kunai: 8, shuriken: 6, ramen_ichiraku: 2, pilula_soldado: 3 },
            statusMissoes: { escolta_tazuna: "aprovado", resgatar_gato: "em_andamento" }, statusConquistas: { primeiro_sangue: "concluido" },
            isOnline: true, cenarioAtual: "vila_folha", salario: 500, postsSalvos: ["p3"],
            historiaTexto: "Nascido na noite em que a lua ficou vermelha, Kenji cresceu ouvindo histórias sobre o clã Uzumaki e seus selamentos lendários.\n\nHoje, como Chunin da Vila da Folha, ele busca dominar o Rasengan e descobrir o que aconteceu com sua família.",
            pontos_rankeada: 340, missoes_concluidas_d: 9, missoes_concluidas_c: 4, missoes_concluidas_b: 1
        },
        u2: { nome: "Aiko Hyuga", apelido: "Clã Hyuga", avatar: avatar("A", "#8b5cf6", "#3b0764"), nivel: 5, xp: 300, forca: 13, defesa: 12, intelecto: 12, destreza: 12, agilidade: 14, speed_rank: 6, reacao: 7, max_vida: 160, max_chakra: 180, max_stamina: 120, ryos: 22100, essencia_ninja: 40, isOnline: true, vitorias: 18, pontos_rankeada: 410, missoes_concluidas_d: 12, kekkei_genkai: ["byakugan"], cenarioAtual: "vila_folha" },
        u3: { nome: "Ryo Uchiha", apelido: "Clã Uchiha", avatar: avatar("R", "#dc2626", "#450a0a"), nivel: 6, xp: 900, ryos: 9800, essencia_ninja: 210, isOnline: false, vitorias: 25, pontos_rankeada: 520, missoes_concluidas_b: 4 },
        u4: { nome: "Mei Sabaku", apelido: "Vila da Areia", avatar: avatar("M", "#d97706", "#78350f"), nivel: 3, xp: 120, ryos: 6400, essencia_ninja: 15, isOnline: true, vitorias: 6, pontos_rankeada: 150 },
        u5: { nome: "Takeshi Nara", apelido: "Clã Nara", avatar: avatar("T", "#15803d", "#14532d"), nivel: 4, xp: 450, ryos: 13200, essencia_ninja: 60, isOnline: false, vitorias: 9, pontos_rankeada: 260, missoes_concluidas_c: 7 }
    },
    jutsus: {
        rasengan: { nome: "Rasengan", rank: "A", preco: 12000, requisito: 3, poder: 38, chakra: "35", stamina: "", funcao: "ataque", categoria: "ninjutsu", reacao_necessaria: 6, velocidade_necessaria: 7, imagem: img("Rasengan", "#0ea5e9", "#1e3a8a", "🌀"), descricao: "Uma esfera de chakra girando em alta velocidade." },
        kage_bunshin: { nome: "Kage Bunshin", rank: "B", preco: 6000, requisito: 1, chakra: "40", funcao: "suporte", categoria: "ninjutsu", clones: 2, imagem: img("Kage Bunshin", "#f97316", "#7c2d12", "👥"), descricao: "Cria clones sólidos do usuário." },
        parede_agua: { nome: "Suiton: Parede de Água", rank: "C", preco: 3000, requisito: 2, poder: 28, chakra: "18", funcao: "defesa", categoria: "ninjutsu", imagem: img("Parede de Água", "#0ea5e9", "#164e63", "🌊"), descricao: "Uma muralha de água bloqueia o golpe." },
        modo_sabio: { nome: "Modo Sábio", rank: "S", preco: 40000, requisito: 4, chakra: "30", custo_por_turno: 8, funcao: "modo", categoria: "senjutsu", bonus: { ataque: 10, reacao: 2, velocidade: 1 }, imagem: img("Modo Sábio", "#f97316", "#713f12", "🐸"), descricao: "Energia natural aumenta força, percepção e velocidade." },
        juuken: { nome: "Juuken: Palma Suave", rank: "C", preco: 4000, restrito_a: ["Aiko Hyuga"], funcao: "ataque", categoria: "taijutsu", poder: 22, chakra: 10, reacao_necessaria: 5, velocidade_necessaria: 6, imagem: img("Juuken", "#a78bfa", "#4c1d95", "🖐️"), descricao: "Golpes que atingem os pontos de chakra." },
        kaiten: { nome: "Kaiten", rank: "B", preco: 9000, restrito_a: ["Aiko Hyuga"], funcao: "defesa", poder: 30, chakra: 20, imagem: img("Kaiten", "#e0e7ff", "#4338ca", "🌀"), descricao: "Rotação que repele qualquer ataque." },
        byakugan: { nome: "Byakugan", rank: "C", preco: 0, restrito_a: ["Aiko Hyuga"], funcao: "modo", bonus: { reacao: 3 }, chakra: 10, custo_por_turno: 5, imagem: img("Byakugan", "#f5f5f4", "#57534e", "👁️"), descricao: "Visão de quase 360 graus." },
        chidori: { nome: "Chidori", rank: "A", preco: 14000, requisito: 5, dano: "3d10", chakra: "45", funcao: "ataque", categoria: "ninjutsu", imagem: img("Chidori", "#60a5fa", "#1e1b4b", "⚡"), descricao: "Chakra de raio concentrado na mão." },
        goukakyuu: { nome: "Katon: Goukakyuu", rank: "C", preco: 3500, preco_promocional: 2800, requisito: 2, poder: 26, chakra: "20", funcao: "ataque", categoria: "ninjutsu", reacao_necessaria: 4, velocidade_necessaria: 6, imagem: img("Goukakyuu", "#ef4444", "#7f1d1d", "🔥"), descricao: "Uma grande bola de fogo." },
        sharingan: { nome: "Sharingan", rank: "S", preco: 0, funcao: "modo", bonus_arena: { reacao: 2, velocidade: 1 }, custo_chakra: 10, custo_por_turno: 4, resiste_genjutsu: "B", imagem: img("Sharingan", "#dc2626", "#450a0a", "👁️"), descricao: "Lê os movimentos do adversário." },
        genjutsu_sharingan: { nome: "Genjutsu: Sharingan", rank: "S", preco: 0, funcao: "ataque", categoria: "genjutsu", poder: 10, custo_chakra: 20, reacao_necessaria: 6, velocidade_necessaria: 8, requer_ativo: ["sharingan"], genjutsu_efeito: "paralisia", genjutsu_turnos: 1, imagem: img("Genjutsu", "#7c3aed", "#2e1065", "🌀"), descricao: "Prende a vítima numa ilusão." },
        raizes: { nome: "Erosão do Mar de Árvores", rank: "S", preco: 0, funcao: "criacao", categoria: "ninjutsu", poder: 9, custo_chakra: 8, criacao_max: 5, criacao_absorve: 12, criacao_nome: "Raízes", criacao_icone: "🌳", reacao_necessaria: 4, velocidade_necessaria: 5, imagem: img("Raízes", "#65a30d", "#1a2e05", "🌳"), descricao: "Raízes que prendem e protegem." },
        amaterasu: { nome: "Amaterasu", rank: "S", preco: 0, funcao: "ataque", categoria: "ninjutsu", poder: 25, custo_chakra: 30, impossivel_esquivar: true, impossivel_defender_fisico: true, chamas_por_turno: 8, chamas_manutencao: 6, custo_vida_pct: 5, requer_ativo: ["sharingan"], reacao_necessaria: 9, velocidade_necessaria: 11, imagem: img("Amaterasu", "#111827", "#000000", "🔥"), descricao: "Chamas negras que não se apagam." },
        contra_genjutsu: { nome: "Contra-Genjutsu", rank: "B", preco: 0, funcao: "kai", custo_chakra: 5, reacao_minima: 5, imagem: img("Kai", "#a78bfa", "#3b0764", "✋"), descricao: "Interrompe o fluxo de chakra e quebra a ilusão." },
        susanoo: { nome: "Susanoo: Costelas", rank: "S", preco: 0, funcao: "defesa", poder: 60, custo_chakra: 25, requer_ativo: ["sharingan"], imagem: img("Susanoo", "#7c3aed", "#1e1b4b", "🦴"), descricao: "Costelas de chakra protegem o usuário." },
        kawarimi: { nome: "Kawarimi", rank: "E", preco: 500, requisito: 1, poder: 2, chakra: "8", funcao: "esquiva", categoria: "ninjutsu", imagem: img("Kawarimi", "#a3a3a3", "#404040", "🪵"), descricao: "Troca de lugar com um objeto." }
    },
    ferramentas: {
        kunai: { nome: "Kunai", preco: 100, poder: 6, stamina: 2, multiplicador_maximo: 2, imagem: img("Kunai", "#64748b", "#1e293b", "🗡️"), descricao: "Lâmina ninja básica." },
        shuriken: { nome: "Shuriken", preco: 80, poder: 4, stamina: 1, multiplicador_maximo: 3, imagem: img("Shuriken", "#475569", "#0f172a", "✴️"), descricao: "Estrela de arremesso." },
        kibaku: { nome: "Selo Explosivo", preco: 450, dano: "2d6", stamina: 3, requisito: 2, imagem: img("Selo Explosivo", "#b45309", "#451a03", "📜"), descricao: "Pergaminho que explode." }
    },
    itens: {
        ramen_ichiraku: { nome: "Ramen da Vila", tipo: "comida", vila: "Global", preco: 60, efeito: "Recupera 20 de Stamina", bonus_stamina: 20, imagem: img("Ramen", "#f59e0b", "#92400e", "🍜") },
        dango: { nome: "Dango", tipo: "comida", vila: ["Konoha"], preco: 25, efeito: "Lanche rápido", imagem: img("Dango", "#ec4899", "#831843", "🍡") },
        pilula_soldado: { nome: "Pílula de Soldado", tipo: "remedio", vila: "Global", preco: 300, efeito: "Recupera 30 de Chakra", bonus_chakra: 30, imagem: img("Pílula", "#16a34a", "#14532d", "💊") },
        onigiri: { nome: "Onigiri", tipo: "mercado", vila: "Global", preco: 15, efeito: "Recupera 5 de HP", bonus_hp: 5, imagem: img("Onigiri", "#e5e7eb", "#6b7280", "🍙") },
        cha_verde: { nome: "Chá Verde", tipo: "mercado", vila: "Global", preco: 10, efeito: "Acalma a mente", imagem: img("Chá", "#65a30d", "#365314", "🍵") },
        bandana: { nome: "Bandana Ninja", tipo: "acessorio", vila: "Global", preco: 200, efeito: "Símbolo da vila", imagem: img("Bandana", "#334155", "#020617", "🎗️") }
    },
    missoes: {
        resgatar_gato: { titulo: "Resgatar o Gato Tora", rank: "D", categoria: "turno", recompensa: 500, xp: 50, en: 0, descricao: "O gato da esposa do senhor feudal fugiu de novo.", imagem: img("Missão D", "#facc15", "#a16207", "🐈") },
        escolta_tazuna: { titulo: "Escoltar o Construtor", rank: "C", categoria: "turno", recompensa: 2500, xp: 150, en: 5, descricao: "Proteja o construtor até a Terra das Ondas.", imagem: img("Missão C", "#22c55e", "#14532d", "🌉") },
        infiltracao: { titulo: "Infiltração na Névoa", rank: "B", categoria: "turno", recompensa: 6000, xp: 300, en: 10, descricao: "Colete informações sem ser detectado.", imagem: img("Missão B", "#3b82f6", "#1e3a8a", "🌫️") },
        caca_nukenin: { titulo: "Caçar o Desertor", rank: "S", categoria: "card", recompensa: 30000, xp: 1200, en: 50, descricao: "Um ninja renegado de rank S foi avistado.", imagem: img("Missão S", "#111827", "#7f1d1d", "☠️") }
    },
    conquistas: {
        primeiro_sangue: { titulo: "Primeiro Sangue", categoria: "turno", recompensa: 1000, xp: 100, en: 5, descricao: "Vença sua primeira batalha.", imagem: img("Conquista", "#f59e0b", "#78350f", "🏆") },
        mestre_rasengan: { titulo: "Mestre do Rasengan", categoria: "turno", recompensa: 5000, xp: 400, en: 20, descricao: "Alcance maestria 10 no Rasengan.", imagem: img("Conquista", "#0ea5e9", "#0c4a6e", "🌀") },
        colecionador: { titulo: "Colecionador", categoria: "card", recompensa: 2000, xp: 150, en: 10, descricao: "Tenha 20 itens no inventário.", imagem: img("Conquista", "#a855f7", "#4c1d95", "🎒") }
    },
    mentores: {
        jiraiya_npc: { nome: "Sábio dos Sapos", categoria: "turno", imagem: img("Sábio", "#dc2626", "#7f1d1d", "🐸"), ensinos: [{ nome: "Controle de Chakra Avançado", preco: 3000 }, { nome: "Invocação de Sapos", preco: 9000 }] },
        tsunade_npc: { nome: "Lendária Ninja Médica", categoria: "turno", imagem: img("Medicina", "#16a34a", "#14532d", "💚"), ensinos: [{ nome: "Ninjutsu Médico Básico", preco: 4000 }] }
    },
    posts: {
        p1: { uid: "u2", autor: "Aiko Hyuga", autorAvatar: avatar("A", "#8b5cf6", "#3b0764"), conteudo: "Treinando o Juuken desde o amanhecer. Alguém topa um amistoso na arena hoje? 👊", likes: ["u1", "u3"], comentarios: [{ autor: "Ryo Uchiha", texto: "Eu topo. Prepare-se!", data: new Date(agora - 3600e3).toISOString() }], data: ts(2 * 3600e3) },
        p2: { uid: "u1", autor: "Kenji Uzumaki", autorAvatar: avatar("K", "#f97316", "#9a3412"), conteudo: "Finalmente consegui estabilizar o Rasengan!", imagem: img("Rasengan", "#0ea5e9", "#1e3a8a", "🌀"), likes: ["u2"], comentarios: [], data: ts(26 * 3600e3) },
        p3: { uid: "u4", autor: "Mei Sabaku", autorAvatar: avatar("M", "#d97706", "#78350f"), conteudo: "Tempestade de areia chegando em Suna. Viajantes, cuidado na estrada!", likes: [], comentarios: [], data: ts(3 * 86400e3) }
    },
    frases: {
        f1: { texto: "Eu nunca volto atrás na minha palavra. Esse é o meu jeito ninja!", autor: "Kenji Uzumaki", uid: "u1", data: ts(5000) },
        f2: { texto: "Aqueles que quebram as regras são lixo, mas quem abandona os amigos é pior que lixo.", autor: "Takeshi Nara", uid: "u5", data: ts(90000) }
    },
    chats: {
        u1_u2: { participantes: ["u1", "u2"], nomes: { u1: "Kenji Uzumaki", u2: "Aiko Hyuga" }, ultimaMensagem: "Te vejo na arena às 18h!", naoLidas_u1: 2, tipoChat: "privado" },
        diario_u1: { participantes: ["u1", "MESTRE"], nomes: { u1: "Kenji Uzumaki", MESTRE: "Kage (Mestre)" }, ultimaMensagem: "Kenji segue para a floresta...", naoLidas_MESTRE: 1, tipoChat: "diario" }
    },
    "chats/u1_u2/mensagens": {
        m1: { remetenteId: "u2", remetenteNome: "Aiko Hyuga", texto: "Bom dia! Vai treinar hoje?", tipo: "rp", timestamp: ts(5400e3) },
        m2: { remetenteId: "u1", remetenteNome: "Kenji Uzumaki", texto: "Com certeza. Quero testar um jutsu novo.", tipo: "rp", timestamp: ts(5000e3) },
        m3: { remetenteId: "u2", remetenteNome: "Aiko Hyuga", texto: "rolou um D20 e tirou: [ 17 ]", tipo: "dice", timestamp: ts(4800e3) },
        m4: { remetenteId: "u2", remetenteNome: "Aiko Hyuga", texto: "Te vejo na arena às 18h!", tipo: "rp", timestamp: ts(4700e3) }
    },
    "chats/cenario_vila_folha/mensagens": {
        c1: { remetenteId: "admin", remetenteNome: "Narrador", texto: "O sol se põe sobre o monumento dos Hokages. Uma brisa quente atravessa a vila.", tipo: "narrador", timestamp: ts(7200e3) },
        c2: { remetenteId: "u2", remetenteNome: "Aiko Hyuga", texto: "*Ativa o Byakugan e observa os telhados.*", tipo: "rp", timestamp: ts(7000e3) },
        c3: { remetenteId: "u1", remetenteNome: "Kenji Uzumaki", texto: "alguém sabe que horas é o evento?", tipo: "ooc", timestamp: ts(6800e3) }
    },
    desafios_batalha: {}
};

// Posts antigos extras (para testar o botão "Carregar mais")
for (let i = 1; i <= 20; i++) {
    DB.posts['antigo' + i] = { uid: "u5", autor: "Takeshi Nara", autorAvatar: avatar("T", "#15803d", "#14532d"), conteudo: `Registro de treino nº ${i}. Que preguiça...`, likes: [], comentarios: [], data: ts((4 + i) * 86400e3) };
}

// ---------- Utilitários internos ----------
function deepClone(v) {
    if (v && typeof v === 'object') {
        if (typeof v.toDate === 'function') return v;
        if (Array.isArray(v)) return v.map(deepClone);
        const o = {}; for (const k in v) o[k] = deepClone(v[k]); return o;
    }
    return v;
}
const colKey = (segs) => segs.join('/');
function getCol(key) { if (!DB[key]) DB[key] = {}; return DB[key]; }

const listeners = new Set();
function notify() { setTimeout(() => listeners.forEach(l => l()), 0); }

// Sentinelas (increment, arrayUnion...)
const SENT = Symbol('sentinel');
export const increment = (n) => ({ [SENT]: 'inc', n });
export const arrayUnion = (...v) => ({ [SENT]: 'union', v });
export const arrayRemove = (...v) => ({ [SENT]: 'remove', v });
export const deleteField = () => ({ [SENT]: 'delete' });
export const serverTimestamp = () => ({ [SENT]: 'ts' });

function applyValue(cur, val) {
    if (val && val[SENT]) {
        switch (val[SENT]) {
            case 'inc': return (Number(cur) || 0) + val.n;
            case 'union': { const a = Array.isArray(cur) ? [...cur] : []; val.v.forEach(x => { if (!a.some(y => JSON.stringify(y) === JSON.stringify(x))) a.push(x); }); return a; }
            case 'remove': { const a = Array.isArray(cur) ? cur : []; return a.filter(y => !val.v.some(x => JSON.stringify(x) === JSON.stringify(y))); }
            case 'ts': return mkTs(Date.now());
            case 'delete': return undefined;
        }
    }
    return deepClone(val);
}
function setPath(obj, path, val) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) o[parts[i]] = {}; o = o[parts[i]]; }
    const last = parts[parts.length - 1];
    const nv = applyValue(o[last], val);
    if (nv === undefined) delete o[last]; else o[last] = nv;
}

// ---------- App / Auth ----------
export const initializeApp = () => ({});
const auth = { currentUser: null };
const authCbs = [];
export const getAuth = () => auth;
const começarDeslogado = new URLSearchParams(location.search).has('login');
const USUARIO = { uid: "u1", email: new URLSearchParams(location.search).has('jogador') ? "jogador@rpgnaruto.com" : "admin@rpgnaruto.com" };
export const onAuthStateChanged = (a, cb) => {
    authCbs.push(cb);
    setTimeout(() => { if (!começarDeslogado) auth.currentUser = USUARIO; cb(auth.currentUser); }, 50);
    return () => {};
};
export const signInWithEmailAndPassword = async () => { auth.currentUser = USUARIO; authCbs.forEach(cb => cb(USUARIO)); return { user: USUARIO }; };
export const signOut = async () => { auth.currentUser = null; };
export const updatePassword = async () => {};

// ---------- Firestore ----------
export const getFirestore = () => ({});
export const doc = (db, ...segs) => {
    // doc(collection(...)) sem id: gera um id novo, como o Firebase faz
    if (db && db.kind === 'col') return { kind: 'doc', col: db.col, id: segs[0] || ('id' + Math.random().toString(36).slice(2, 11)) };
    return { kind: 'doc', col: colKey(segs.slice(0, -1)), id: segs[segs.length - 1] };
};
export const collection = (db, ...segs) => ({ kind: 'col', col: colKey(segs) });
export const where = (field, op, value) => ({ t: 'where', field, op, value });
export const orderBy = (field, dir = 'asc') => ({ t: 'order', field, dir });
export const limit = (n) => ({ t: 'limit', n });
export const startAfter = (d) => ({ t: 'startAfter', id: d.id });
export const query = (c, ...cons) => ({ kind: 'query', col: c.col, cons });

function getField(d, f) { return f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d); }
function sortVal(v) { return v && typeof v.toMillis === 'function' ? v.toMillis() : v; }

function docSnap(col, id) {
    const data = getCol(col)[id];
    return { id, exists: () => data !== undefined, data: () => deepClone(data), ref: doc(null, ...col.split('/'), id) };
}
function runQuery(q) {
    const col = getCol(q.col);
    let ids = Object.keys(col);
    for (const c of (q.cons || [])) {
        if (c.t === 'where') ids = ids.filter(id => {
            const v = getField(col[id], c.field);
            if (c.op === '==') return v === c.value;
            if (c.op === 'array-contains') return Array.isArray(v) && v.includes(c.value);
            return true;
        });
        if (c.t === 'startAfter') { const i = ids.indexOf(c.id); ids = ids.slice(i + 1); }
        if (c.t === 'limit') ids = ids.slice(0, c.n);
        if (c.t === 'order') ids.sort((a, b) => { const x = sortVal(getField(col[a], c.field)), y = sortVal(getField(col[b], c.field)); return (x > y ? 1 : x < y ? -1 : 0) * (c.dir === 'desc' ? -1 : 1); });
    }
    const docs = ids.map(id => docSnap(q.col, id));
    return { docs, empty: docs.length === 0, size: docs.length, forEach: (fn) => docs.forEach(fn), docChanges: () => docs.map(d => ({ type: 'added', doc: d })) };
}

// Contador de leituras (só para medir na prévia)
window.__leituras = { getDoc: 0, getDocs: 0, docsLidos: 0 };
export const getDoc = async (ref) => { window.__leituras.getDoc++; window.__leituras.docsLidos++; return docSnap(ref.col, ref.id); };
export const getDocs = async (q) => { const r = runQuery(q); window.__leituras.getDocs++; window.__leituras.docsLidos += r.size; return r; };
export const setDoc = async (ref, data, opts = {}) => {
    const col = getCol(ref.col);
    if (!opts.merge || !col[ref.id]) col[ref.id] = {};
    for (const k in data) setPath(col[ref.id], k, data[k]);
    notify();
};
export const updateDoc = async (ref, data) => {
    const col = getCol(ref.col);
    if (!col[ref.id]) throw new Error('Documento não existe: ' + ref.col + '/' + ref.id);
    for (const k in data) setPath(col[ref.id], k, data[k]);
    notify();
};
export const addDoc = async (c, data) => {
    const id = 'id' + Math.random().toString(36).slice(2, 9);
    await setDoc({ col: c.col, id }, data);
    return { id };
};
export const deleteDoc = async (ref) => { delete getCol(ref.col)[ref.id]; notify(); };
export const writeBatch = () => {
    const ops = [];
    return {
        update: (ref, data) => ops.push(() => updateDoc(ref, data)),
        set: (ref, data, o) => ops.push(() => setDoc(ref, data, o)),
        delete: (ref) => ops.push(() => deleteDoc(ref)),
        commit: async () => { for (const op of ops) await op(); }
    };
};
export const runTransaction = async (db, fn) => {
    const ops = [];
    const tx = {
        get: (ref) => getDoc(ref),
        update: (ref, data) => { ops.push(() => updateDoc(ref, data)); return tx; },
        set: (ref, data, o) => { ops.push(() => setDoc(ref, data, o)); return tx; },
        delete: (ref) => { ops.push(() => deleteDoc(ref)); return tx; }
    };
    const r = await fn(tx);
    for (const op of ops) await op();
    return r;
};
export const onSnapshot = (target, cb) => {
    const fire = () => cb(target.kind === 'doc' ? docSnap(target.col, target.id) : runQuery(target));
    listeners.add(fire);
    setTimeout(fire, 0);
    return () => listeners.delete(fire);
};
