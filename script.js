import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, increment, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURAÇÃO ---
const firebaseConfig = { apiKey: "AIzaSyC3HOor32_p5Z-iADm0VgZ279rt1kj8ICg", authDomain: "rpg-naruto-5150a.firebaseapp.com", projectId: "rpg-naruto-5150a", storageBucket: "rpg-naruto-5150a.firebasestorage.app", messagingSenderId: "1007094335306", appId: "1:1007094335306:web:ac96fa96f9494f90fd63b3" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- VARIÁVEIS GLOBAIS ---
let currentUserData = null;
let currentImageBase64 = null;
let currentOpenPostId = null;
let newAvatarBase64 = null;
let globalXpTable = [];
let vilaAtual = "Konoha";
let lojaAtual = "geral";
let globalItensMap = {}; 
let ordenacaoAtual = 'alfabetica';
let currentGiftTarget = null;
const IMG_PADRAO = "https://img.freepik.com/vetores-gratis/ilustracao-de-pergaminho-ninja-desenhada-a-mao_23-2151159846.jpg";

// --- LEVEL UP ---
function getXpNecessario(nivel) {
    if(globalXpTable.length > 0 && nivel <= globalXpTable.length) {
        return globalXpTable[nivel - 1]; 
    }
    return 300; 
}

const ELEMENTOS_ICONS = {
    "fogo": "https://cdn-icons-png.flaticon.com/512/785/785116.png",
    "agua": "https://cdn-icons-png.flaticon.com/512/414/414974.png",
    "vento": "https://cdn-icons-png.flaticon.com/512/9509/9509865.png",
    "terra": "https://cdn-icons-png.flaticon.com/512/2933/2933942.png",
    "raio": "https://cdn-icons-png.flaticon.com/512/1146/1146208.png",
    "yin": "https://cdn-icons-png.flaticon.com/512/66/66163.png",
    "yang": "https://cdn-icons-png.flaticon.com/512/66/66163.png"
};
const KEKKEI_ICONS = {
    "sharingan": "https://cdn-icons-png.flaticon.com/512/1301/1301438.png",
    "byakugan": "https://cdn-icons-png.flaticon.com/512/32/32339.png",
    "mokuton": "https://cdn-icons-png.flaticon.com/512/126/126487.png",
    "veia_ossea": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsbqzRS3LkfOJ69ZZvImlM2938cP4HHL3EzQ&s"
};
const KEKKEI_MOURA_ICONS = { "rinnegan_supremo": "https://cdn-icons-png.flaticon.com/512/186/186315.png" };
const KEKKEI_TOUTA_ICONS = { "poeira": "https://cdn-icons-png.flaticon.com/512/739/739249.png" };

function calcularTempo(timestamp) { try { if (!timestamp) return "Desconhecido"; let date = (typeof timestamp.toDate === 'function') ? timestamp.toDate() : new Date(timestamp); if (isNaN(date.getTime())) return "-"; return date.toLocaleDateString('pt-BR'); } catch (e) { return "-"; } }

window.toggleMobileMenu = () => { document.querySelector('.sidebar').classList.toggle('mobile-active'); document.querySelector('.sidebar-overlay').classList.toggle('active'); };

// --- AUTH STATE ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        if(user.email === "admin@rpgnaruto.com") document.getElementById('btn-admin-panel').style.display = 'flex';
        await carregarConfiguracoes();
        await carregarCacheItens();
        
        const docRef = doc(db, "users", user.uid);
        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                if(!currentUserData.inventario) currentUserData.inventario = {};
                if(!currentUserData.meusJutsus) currentUserData.meusJutsus = [];
                if(!currentUserData.statusConquistas) currentUserData.statusConquistas = {};
                
                verificarLevelUpAutomatico(currentUserData);
                atualizarInterface(currentUserData);
                renderizarBatalha(); 
                
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab) window.showTab(activeTab.id);
            }
        });
        
        const initialSnap = await getDoc(docRef);
        if(initialSnap.exists()){ 
            currentUserData = initialSnap.data(); 
            carregarTudo(); 
        } else {
            const dadosPadrao = { nome: "Novo Ninja", ryos: 100, xp: 0, nivel: 1, email: user.email, meusJutsus: [], inventario: {}, statusMissoes: {}, statusConquistas: {}, elementos: [], kekkei_genkai: [], essencia_ninja: 0 };
            await setDoc(docRef, dadosPadrao);
            currentUserData = dadosPadrao;
            atualizarInterface(dadosPadrao);
            carregarTudo();
        }
        setTimeout(() => { try { window.renderFeed('all'); } catch(e) {} }, 800); 
        renderizarBatalha();

    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
    }
});

// --- SISTEMA DE LOGIN ---
const btnLogin = document.getElementById('btnLogin');
if (btnLogin) {
    btnLogin.addEventListener('click', () => {
        const e = document.getElementById('emailInput').value;
        const s = document.getElementById('passwordInput').value;
        if(!e || !s) return alert("Preencha e-mail e senha!");
        btnLogin.innerText = "Carregando...";
        signInWithEmailAndPassword(auth, e, s).catch((err) => {
            console.error(err);
            btnLogin.innerText = "Entrar";
            alert("Erro: " + err.message);
        });
    });
}
const passInput = document.getElementById('passwordInput');
if (passInput) passInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') document.getElementById('btnLogin').click(); });

// --- NAVEGAÇÃO ---
window.showTab = (t) => {
    try {
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const target = document.getElementById(t);
        if(target) target.classList.add('active');

        document.querySelectorAll('.top-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
        const btnTop = document.getElementById('nav-btn-'+t);
        const btnSide = document.getElementById('side-btn-'+t);
        if(btnTop) btnTop.classList.add('active');
        if(btnSide) btnSide.classList.add('active');

        if(currentUserData) {
            if(t==='feed') window.renderFeed('all');
            if(t==='personagens') carregarPersonagens();
            if(t==='frases') carregarFrases();
            if(t==='inventario') carregarInventario();
            if(t==='loja') carregarLojaItens();
            if(t==='jutsus') carregarMeusJutsus(currentUserData.meusJutsus); 
            if(t==='conquistas') carregarConquistas();
            if(t==='missoes') carregarMissoes();
            if(t==='rankings') carregarRankings();
        }
        
        if(window.innerWidth <= 768) {
             const sidebar = document.querySelector('.sidebar');
             if(sidebar && sidebar.classList.contains('mobile-active')) window.toggleMobileMenu();
        }
    } catch (e) {
        console.error("Erro ao trocar aba:", e);
    }
};

window.mudarOrdenacao = (ordem) => {
    ordenacaoAtual = ordem;
    if(document.getElementById('jutsus').classList.contains('active')) {
        carregarMeusJutsus(currentUserData.meusJutsus);
        carregarLoja();
    } else if(document.getElementById('ferramentas').classList.contains('active')) {
        carregarLojaFerramentas();
    } else if(document.getElementById('loja').classList.contains('active')) {
        carregarLojaItens();
    }
};

function aplicarOrdenacao(lista, ordem) {
    const novaLista = [...lista];
    if (ordem === 'menor_valor') {
        return novaLista.sort((a, b) => (a.preco || 0) - (b.preco || 0));
    } else if (ordem === 'maior_valor') {
        return novaLista.sort((a, b) => (b.preco || 0) - (a.preco || 0));
    } else if (ordem === 'alfabetica') {
        return novaLista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    }
    return novaLista;
}

// --- FUNÇÕES DE SUPORTE ---
async function verificarLevelUpAutomatico(dados) {
    let xpAtual = dados.xp || 0;
    let nivelAtual = dados.nivel || 1;
    let xpNecessario = getXpNecessario(nivelAtual);
    if (xpAtual >= xpNecessario) {
        let novoXp = xpAtual - xpNecessario;
        let novoNivel = nivelAtual + 1;
        await updateDoc(doc(db, "users", auth.currentUser.uid), { nivel: novoNivel, xp: novoXp });
        alert(`Level Up! Nível ${novoNivel}!`);
    }
}

async function carregarConfiguracoes() { try { const s = await getDoc(doc(db, "game_config", "sistema_nivel")); if(s.exists()) globalXpTable = s.data().tabela_xp || []; } catch(e) {} }
async function carregarCacheItens() {
    try {
        const s1 = await getDocs(collection(db, "itens")); s1.forEach(d => globalItensMap[d.id] = { ...d.data(), type: 'item' });
        const s2 = await getDocs(collection(db, "ferramentas")); s2.forEach(d => globalItensMap[d.id] = { ...d.data(), type: 'tool' });
    } catch(e) {}
}

function carregarTudo() {
    try { carregarLoja(); } catch(e){ console.error(e); }
    try { carregarMeusJutsus(currentUserData.meusJutsus); } catch(e){ console.error(e); }
    try { carregarLojaFerramentas(); } catch(e){ console.error(e); }
    try { carregarLojaItens(); } catch(e){ console.error(e); }
    try { carregarInventario(); } catch(e){ console.error(e); }
    try { carregarMissoes(); } catch(e){ console.error(e); }
    try { carregarConquistas(); } catch(e){ console.error(e); }
    try { carregarRankings(); } catch(e){ console.error(e); }
    try { carregarFrases(); } catch(e){ console.error(e); }
    if(auth.currentUser.email === "admin@rpgnaruto.com") carregarPainelAdmin();
}

function formatarNum(v) { return Number(v||0).toLocaleString('pt-BR'); }

function aplicarEscalaPersonalizada(dadosJutsu) {
    if (!dadosJutsu) return {}; 
    let dadosFinais = { ...dadosJutsu };
    try {
        if (!auth.currentUser) return dadosFinais;
        const uid = auth.currentUser.uid;
        if (dadosFinais.escalonamento && typeof dadosFinais.escalonamento === 'object') {
            const p = dadosFinais.escalonamento[uid];
            if (p) {
                if (p.chakra !== undefined) dadosFinais.chakra = p.chakra;
                if (p.stamina !== undefined) dadosFinais.stamina = p.stamina;
                if (p.dano !== undefined) dadosFinais.dano = p.dano;
                if (p.descricao !== undefined) dadosFinais.descricao = p.descricao;
            }
        }
    } catch (err) { return dadosJutsu; }
    return dadosFinais;
}

function renderizarIcones(lista, containerId, mapaIcones, titulo) {
    const container = document.getElementById(containerId); if (!container) return;
    container.innerHTML = `<div class="elementos-title">${titulo}</div><div class="elementos-list"></div>`;
    const listDiv = container.querySelector('.elementos-list');
    if (!lista || lista.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    lista.forEach(elem => {
        const iconUrl = mapaIcones[elem.trim().toLowerCase()];
        if (iconUrl) { const img = document.createElement('img'); img.src = iconUrl; img.className = 'element-icon'; img.title = elem; listDiv.appendChild(img); }
    });
}

function atualizarInterface(dados) {
    document.querySelector('.user-info').innerText = dados.apelido || dados.nome || "Ninja";
    document.getElementById('ryos-text').innerText = formatarNum(dados.ryos);
    document.getElementById('en-text').innerText = formatarNum(dados.essencia_ninja || 0);

    if(dados.avatar) document.getElementById('header-avatar').src = dados.avatar;
    if(dados.historiaTexto) document.getElementById('historia-display-text').innerText = dados.historiaTexto;
    if(dados.historiaImagem) document.getElementById('historia-display-img').src = dados.historiaImagem;

    const nivel = dados.nivel || 1;
    const xpAtual = dados.xp || 0;
    const xpMeta = getXpNecessario(nivel);
    const porcentagem = Math.min((xpAtual / xpMeta) * 100, 100);

    document.getElementById('level-display').innerText = "Nível " + nivel;
    document.getElementById('xp-text-display').innerText = `${xpAtual} / ${xpMeta} XP`;
    document.getElementById('xp-bar').style.width = porcentagem + "%";

    renderizarIcones(dados.elementos || [], 'dash-elementos', ELEMENTOS_ICONS, 'Naturezas de Chakra');
    renderizarIcones(dados.kekkei_genkai || [], 'dash-kekkei', KEKKEI_ICONS, 'Kekkei Genkai');
    renderizarIcones(dados.kekkei_moura || [], 'dash-moura', KEKKEI_MOURA_ICONS, 'Kekkei Moura');
    renderizarIcones(dados.kekkei_touta || [], 'dash-touta', KEKKEI_TOUTA_ICONS, 'Kekkei Touta');

    const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    set('dash-nivel', nivel); set('dash-cargo', dados.cargo||"Genin"); set('dash-patente', dados.patente||"Genin"); set('dash-rank', dados.rank||"E"); set('dash-speed-rank', dados.speed_rank||"E"); set('dash-tipo', dados.tipo||"Normal"); set('dash-ryos', formatarNum(dados.ryos));
    set('dash-jutsus', (dados.meusJutsus || []).length); 
    
    let totalItems = 0, totalTools = 0;
    if(dados.inventario) { for(let id in dados.inventario) { if(globalItensMap[id]) { if(globalItensMap[id].type === 'tool') totalTools += dados.inventario[id]; else totalItems += dados.inventario[id]; } } }
    set('dash-tools', totalTools); set('dash-items', totalItems);

    set('dash-wins', dados.vitorias||0); set('dash-derrotas', dados.derrotas||0); set('dash-draws', dados.empates||0);
    set('dash-vida', dados.vida||100); set('dash-sanidade', dados.sanidade||100);
    set('dash-chakra', dados.chakra||100); set('dash-stamina', dados.stamina||100); set('dash-controle', dados.controle_chakra||"Baixo");
    set('dash-forca', dados.forca||10); set('dash-defesa', dados.defesa||10); set('dash-constituicao', dados.constituicao||10);
    set('dash-destreza', dados.destreza||10); set('dash-intelecto', dados.intelecto||10); set('dash-agilidade', dados.agilidade||10); set('dash-velocidade', dados.velocidade||10);
}

function renderizarBatalha() {
    const grid = document.getElementById('battle-grid'); if(!grid) return;
    onSnapshot(collection(db, "users"), (snapshot) => {
        grid.innerHTML = '';
        if(snapshot.empty) { grid.innerHTML = '<p>Sem ninjas.</p>'; return; }
        snapshot.forEach(docSnap => {
            const u = docSnap.data(); const uid = docSnap.id;
            const criarLinkMax = (val, max, field) => {
                return `<span class="battle-val">${val} / <span style="cursor:pointer; text-decoration:underline;" onclick="window.editarMaximo('${uid}', '${field}')" title="Clique para editar máximo">${max}</span></span>`;
            };
            const card = document.createElement('div'); card.className = 'battle-card';
            card.innerHTML = `
                <div class="battle-header-info">
                    <img src="${u.avatar || IMG_PADRAO}" class="battle-avatar">
                    <div>
                        <div class="battle-name">${u.nome || "Ninja"}</div>
                        <div class="battle-char">${u.apelido || "Sem Apelido"} - Nvl ${u.nivel || 1}</div>
                    </div>
                </div>
                <div class="battle-stats-wrapper">
                    ${criarLinhaStatusCustom(uid, 'vida', 'Vida', 'HP', u.vida||0, u.max_vida||100, 'bar-life')}
                    ${criarLinhaStatusCustom(uid, 'sanidade', 'Sanidade', 'SAN', u.sanidade||0, u.max_sanidade||100, 'bar-sanidade')}
                    ${criarLinhaStatusCustom(uid, 'stamina', 'Stamina', 'STA', u.stamina||0, u.max_stamina||100, 'bar-stamina')}
                    ${criarLinhaStatusCustom(uid, 'chakra', 'Chakra', 'CHK', u.chakra||0, u.max_chakra||100, 'bar-chakra')}
                </div>`;
            grid.appendChild(card);
        });
    });
}

function criarLinhaStatusCustom(uid, f, l, a, v, m, c) { 
    const p=Math.min((v/m)*100,100); 
    return `
    <div class="battle-row">
        <div class="battle-row-header"><span>${l}</span><span>${a}</span></div>
        <div class="battle-controls">
            <div class="battle-actions-row"><div class="battle-mini-btn" onclick="alterarStatus('${uid}','${f}',-5)">-5</div><div class="battle-mini-btn" onclick="alterarStatus('${uid}','${f}',-1)">-1</div></div>
            <span class="battle-val">${v} / <span style="cursor:pointer; border-bottom:1px dotted #ccc;" onclick="editarMaximo('${uid}', 'max_${f}')">${m}</span></span>
            <div class="battle-actions-row"><div class="battle-mini-btn" onclick="alterarStatus('${uid}','${f}',1)">+1</div><div class="battle-mini-btn" onclick="alterarStatus('${uid}','${f}',5)">+5</div></div>
        </div>
        <div class="battle-bar-bg"><div class="battle-bar-fill ${c}" style="width:${p}%;"></div><div class="battle-bar-text">${p.toFixed(0)}%</div></div>
    </div>`; 
}

window.editarMaximo = async (uid, field) => {
    const novo = prompt("Novo valor máximo:");
    if(novo && !isNaN(novo)) {
        await updateDoc(doc(db, "users", uid), { [field]: parseInt(novo) });
    }
};

window.alterarStatus = async (targetUid, stat, valor) => { await updateDoc(doc(db, "users", targetUid), { [stat]: increment(valor) }); };

function gerarTagsBonus(d) {
    let html = '';
    if(d.bonus_hp) html += `<span class="stat-tag tag-buff">+${d.bonus_hp} HP</span>`;
    if(d.bonus_stamina) html += `<span class="stat-tag tag-stamina">+${d.bonus_stamina} STA</span>`;
    if(d.bonus_chakra) html += `<span class="stat-tag tag-chakra">+${d.bonus_chakra} CHK</span>`;
    if(d.bonus_forca) html += `<span class="stat-tag tag-attr">+${d.bonus_forca} FOR</span>`;
    if(d.bonus_defesa) html += `<span class="stat-tag tag-attr">+${d.bonus_defesa} DEF</span>`;
    if(d.bonus_agilidade) html += `<span class="stat-tag tag-attr">+${d.bonus_agilidade} AGI</span>`;
    if(d.bonus_velocidade) html += `<span class="stat-tag tag-attr">+${d.bonus_velocidade} VEL</span>`;
    if(d.bonus_intelecto) html += `<span class="stat-tag tag-attr">+${d.bonus_intelecto} INT</span>`;
    if(d.bonus_constituicao) html += `<span class="stat-tag tag-attr">+${d.bonus_constituicao} CON</span>`;
    if(d.bonus_destreza) html += `<span class="stat-tag tag-attr">+${d.bonus_destreza} DES</span>`;
    return html;
}

// --- CORE FUNCTIONS ---
function criarCard(containerId, dados, id, tipo, clickFn, qtd = null) {
    const c = document.getElementById(containerId); if(!c) return;
    const div = document.createElement('div'); div.className = 'card'; div.onclick = () => clickFn(id, dados);
    let sub = "", extra = "";
    if(tipo === 'jutsu') { sub = "Rank " + dados.rank; const m = (currentUserData.maestrias && currentUserData.maestrias[id]) ? currentUserData.maestrias[id] : 0; extra = `<span class="maestria-display">Maestria: ${m}</span>`; } 
    else if(tipo === 'ferramenta') sub = dados.dano || "Ferramenta"; else sub = dados.efeito || "Item";
    if(qtd !== null) extra += `<div class="inventory-controls"><span class="qtd-badge">x${qtd}</span><button class="btn-minus" onclick="consumirItem('${id}', '${dados.nome}'); event.stopPropagation();">-</button></div>`;
    div.innerHTML = `<img src="${dados.imagem||IMG_PADRAO}" class="card-img-top"><h4>${dados.nome}</h4><small>${sub}</small>${extra}`;
    c.appendChild(div);
}
function criarCardLoja(containerId, dados, id, tipo, buyFn, clickFn) {
    const c = document.getElementById(containerId); if(!c) return;
    const div = document.createElement('div'); div.className = 'card'; div.onclick = (e) => { if(!e.target.classList.contains('buy-btn') && !e.target.classList.contains('qtd-input-square')) clickFn(id, dados); };
    let sub = "", buyControlHTML = "", priceHTML = "";

    const currency = dados.preco_en ? 'EN' : 'Ryos';
    let finalPrice = currency === 'EN' ? dados.preco_en : dados.preco;
    
    if (currency === 'Ryos' && dados.preco_promocional && dados.preco_promocional < dados.preco) {
        finalPrice = dados.preco_promocional;
        priceHTML = `<p id="price-${id}" class="price-tag">
            <span style="text-decoration:line-through; color:#999; font-size:0.85em; margin-right:5px;">${formatarNum(dados.preco)}</span>
            <span style="color:var(--primary-color); font-weight:bold;">${formatarNum(finalPrice)} Ryos</span>
        </p>`;
    } else {
        const colorClass = currency === 'EN' ? 'en-price' : '';
        priceHTML = `<p id="price-${id}" class="price-tag ${colorClass}">${formatarNum(finalPrice)} ${currency}</p>`;
    }

    if(tipo === 'jutsu') sub = "Rank " + dados.rank; else if(tipo === 'ferramenta') sub = dados.dano || "Ferramenta"; else sub = dados.efeito || "Item";
    
    const bonusTags = gerarTagsBonus(dados);

    let isOwned = (tipo === 'jutsu' && currentUserData.meusJutsus && currentUserData.meusJutsus.includes(id));
    const btnClass = currency === 'EN' ? 'buy-btn en-btn' : 'buy-btn';

    if(tipo !== 'jutsu') { 
        buyControlHTML = `<div class="qtd-container-square"><input type="number" id="qtd-${id}" class="qtd-input-square" value="1" min="1" onclick="event.stopPropagation()"></div><button id="btn-buy-${id}" class="${btnClass}" onclick="event.stopPropagation(); comprarMultiplos('${id}', ${finalPrice}, '${dados.nome}', '${tipo}', 'qtd-${id}', '${currency}')">Comprar x1</button>`; 
    } else { 
        buyControlHTML = isOwned ? `<button class="buy-btn" disabled>Adquirido</button>` : `<button class="${btnClass}" onclick="event.stopPropagation(); comprarJutsu('${id}', ${finalPrice}, '${dados.nome}', '${currency}')">Comprar</button>`; 
    }
    
    div.innerHTML = `<img src="${dados.imagem||IMG_PADRAO}" class="card-img-top"><h4>${dados.nome}</h4><small>${sub}</small><div class="stats-row">${bonusTags}</div>${priceHTML}${buyControlHTML}`;
    c.appendChild(div);
    
    if(tipo !== 'jutsu') { 
        const inp = document.getElementById(`qtd-${id}`); 
        inp.addEventListener('input', (e) => { 
            let q = parseInt(e.target.value)||1; 
            document.getElementById(`btn-buy-${id}`).innerText = `Comprar x${q}`; 
            if (currency === 'Ryos' && dados.preco_promocional && dados.preco_promocional < dados.preco) {
                    document.getElementById(`price-${id}`).innerHTML = `<span style="text-decoration:line-through; color:#999; font-size:0.85em; margin-right:5px;">${formatarNum(dados.preco * q)}</span><span style="color:var(--primary-color); font-weight:bold;">${formatarNum(finalPrice * q)} Ryos</span>`;
            } else {
                document.getElementById(`price-${id}`).innerText = `${formatarNum(finalPrice * q)} ${currency}`; 
            }
        }); 
    }
}

async function carregarLoja() {
    try {
        const c = document.getElementById('loja-jutsus-grid'); if(!c) return; c.innerHTML = '';
        const m = currentUserData.meusJutsus || []; const isAdmin = auth.currentUser.email === "admin@rpgnaruto.com";
        const snap = await getDocs(collection(db, "jutsus"));
        
        let lista = [];
        snap.forEach(d => { try { let i = d.data(); i = aplicarEscalaPersonalizada(i); const p = i.restrito_a || []; if(!isAdmin && p.length > 0 && !p.includes(currentUserData.nome || "")) return; lista.push({id:d.id, ...i}); } catch(e){} });
        
        lista = aplicarOrdenacao(lista, ordenacaoAtual);
        lista.forEach(item => criarCardLoja('loja-jutsus-grid', item, item.id, 'jutsu', null, (id, i) => verDetalhesJutsu(id, i)));
    } catch(e) {}
}

async function carregarMeusJutsus(l) {
    const c = document.getElementById('meus-jutsus-grid'); if(!c) return; c.innerHTML = ''; l = (l || []).filter(id => id); 
    if(l.length === 0) { c.innerHTML = '<p>Nenhum jutsu aprendido.</p>'; return; }
    const promises = l.map(async (id) => { try { const s = await getDoc(doc(db, "jutsus", id)); if(s.exists()) { let data = s.data(); try { data = aplicarEscalaPersonalizada(data); } catch(e){} return { id, ...data }; } } catch(e) { return null; } });
    
    const resultados = await Promise.all(promises);
    let lista = resultados.filter(item => item !== null);
    
    // Jutsus geralmente não têm preço para ordenar por valor, mas vamos manter a lógica caso tenham, ou ordenar por nome
    lista = aplicarOrdenacao(lista, ordenacaoAtual);
    
    lista.forEach(item => criarCard('meus-jutsus-grid', item, item.id, 'jutsu', (id, i) => verDetalhesJutsu(id, i)));
}

async function carregarLojaFerramentas() { 
    const c = document.getElementById('loja-ferramentas-grid'); if(!c) return; c.innerHTML = ''; 
    const s = await getDocs(collection(db, "ferramentas")); 
    let lista = [];
    s.forEach(d => lista.push({id:d.id, ...d.data()}));
    
    lista = aplicarOrdenacao(lista, ordenacaoAtual);
    lista.forEach(item => criarCardLoja('loja-ferramentas-grid', item, item.id, 'ferramenta', null, (id, i) => verDetalhesFerramenta(id, i)));
}

async function carregarLojaItens() {
    const c = document.getElementById('loja-itens-grid'); if(!c) return; c.innerHTML = '';
    const s = await getDocs(collection(db, "itens"));
    let lista = [];
    s.forEach(d => { 
        const i = d.data(); 
        let ok=false; 
        if(!i.vila || i.vila==='Global') ok=true; 
        else if(Array.isArray(i.vila)){if(i.vila.includes(vilaAtual)||i.vila.includes('Global')) ok=true;} 
        else if(i.vila===vilaAtual) ok=true; 
        
        if(i.tipo===lojaAtual && ok) lista.push({id:d.id, ...i}); 
    });
    
    lista = aplicarOrdenacao(lista, ordenacaoAtual);
    lista.forEach(item => criarCardLoja('loja-itens-grid', item, item.id, 'item', null, (id, i) => verDetalhesItem(id, i)));
}

async function carregarInventario() {
    const c = document.getElementById('inventario-grid'); if(!c) return; c.innerHTML = '';
    const inv = currentUserData.inventario || {}; const keys = Object.keys(inv).filter(k => inv[k] > 0);
    if(keys.length === 0) { c.innerHTML = '<p>Mochila vazia.</p>'; return; }
    for (const id of keys) {
        let info = globalItensMap[id];
        if (!info) {
            try {
                const s1 = await getDoc(doc(db, "itens", id));
                if(s1.exists()) { info = {...s1.data(), type: 'item'}; globalItensMap[id] = info; }
                else {
                    const s2 = await getDoc(doc(db, "ferramentas", id));
                    if(s2.exists()) { info = {...s2.data(), type: 'tool'}; globalItensMap[id] = info; }
                }
            } catch(e){}
        }
        if(info) {
            criarCard('inventario-grid', info, id, info.type, (id, d) => {
                if(info.type === 'tool') verDetalhesFerramenta(id, d); else verDetalhesItem(id, d);
            }, inv[id]);
        }
    }
}

async function carregarPersonagens() {
    const c = document.getElementById('directory-grid'); if(!c) return;
    c.innerHTML = '<p>Carregando...</p>';
    try {
        const s = await getDocs(collection(db, "users"));
        c.innerHTML = '';
        s.forEach(d => { const u = d.data(); const k = document.createElement('div'); k.className = 'card'; k.onclick = () => window.verPerfil(d.id); 
        k.innerHTML = `
        <div style="width:60px; height:60px; border-radius:50%; overflow:hidden; margin:0 auto 10px;">
            <img src="${u.avatar||IMG_PADRAO}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <h4>${u.nome}</h4>
        <p>${u.apelido||""}</p>
        <div style="font-size:0.8rem; margin-top:5px; color:#777;">
            <span style="color:var(--yellow-color);"><i class="fa-solid fa-coins"></i> ${formatarNum(u.ryos)}</span> | 
            <span style="color:var(--en-color);"><i class="fa-regular fa-star"></i> ${formatarNum(u.essencia_ninja||0)}</span>
        </div>
        ${u.id !== auth.currentUser.uid ? `<button class="gift-btn" onclick="event.stopPropagation(); openGiftModal('${d.id}', '${u.nome}')"><i class="fa-solid fa-gift"></i> Presentear</button>` : ''}
        `; 
        c.appendChild(k); });
    } catch(e){ c.innerHTML='<p>Erro ao carregar.</p>'; }
}

window.openGiftModal = (uid, nome) => {
    currentGiftTarget = uid;
    document.getElementById('gift-target-name').innerText = nome;
    document.getElementById('giftModal').style.display = 'flex';
};

window.enviarPresente = async () => {
    const qtd = parseInt(document.getElementById('gift-amount').value);
    const tipo = document.getElementById('gift-currency').value;
    
    if(!qtd || qtd <= 0) return alert("Digite uma quantidade válida!");
    if(!currentGiftTarget) return;

    const field = tipo === 'ryos' ? 'ryos' : 'essencia_ninja';
    const moedaNome = tipo === 'ryos' ? 'Ryos' : 'Essência Ninja';

    if((currentUserData[field] || 0) < qtd) return alert(`Você não tem ${moedaNome} suficiente!`);

    if(!confirm(`Enviar ${qtd} ${moedaNome} para ${document.getElementById('gift-target-name').innerText}?`)) return;

    try {
        // Desconta do remetente
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            [field]: increment(-qtd)
        });
        
        // Adiciona ao destinatário
        await updateDoc(doc(db, "users", currentGiftTarget), {
            [field]: increment(qtd)
        });

        alert("Presente enviado com sucesso!");
        document.getElementById('giftModal').style.display = 'none';
        document.getElementById('gift-amount').value = '';
    } catch(e) {
        alert("Erro ao enviar: " + e.message);
    }
};


window.consumirItem = async (id, nome) => { 
    // 1. Encontra os dados do item no cache global (ou busca se precisar, mas vamos assumir que está no cache já que veio do inventário)
    let itemData = globalItensMap[id];
    
    // Se for ferramenta e tiver custo de stamina
    if (itemData && itemData.type === 'tool' && itemData.stamina > 0) {
        if ((currentUserData.stamina || 0) < itemData.stamina) {
            return alert(`Stamina insuficiente! Custo: ${itemData.stamina}`);
        }
        
        if(confirm(`Usar 1x ${nome}? (Custa ${itemData.stamina} Stamina)`)) {
                await updateDoc(doc(db, "users", auth.currentUser.uid), { 
                    [`inventario.${id}`]: increment(-1),
                    stamina: increment(-itemData.stamina) 
                });
        }
    } else {
        // Item normal ou ferramenta sem custo
        if(confirm(`Usar 1x ${nome}?`)) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { [`inventario.${id}`]: increment(-1) }); 
        }
    }
};

window.comprarJutsu = async (id, p, n, currency) => { 
    const field = currency === 'EN' ? 'essencia_ninja' : 'ryos';
    if(!confirm(`Comprar ${n} por ${p} ${currency}?`)) return; 
    if((currentUserData[field]||0) < p) return alert(`Sem ${currency} suficiente!`); 
    
    await updateDoc(doc(db, "users", auth.currentUser.uid), { 
        [field]: increment(-p), 
        meusJutsus: arrayUnion(id), 
        [`maestrias.${id}`]: 0 
    }); 
    alert("Comprado!"); 
};
window.comprarMultiplos = async (id, p, n, t, i, currency) => { 
    const q = parseInt(document.getElementById(i).value)||1; 
    if(q<1) return; 
    const tot=p*q; 
    const field = currency === 'EN' ? 'essencia_ninja' : 'ryos';
    
    if(!confirm(`Comprar ${q}x ${n} por ${tot} ${currency}?`)) return; 
    if((currentUserData[field]||0) < tot) return alert(`Sem ${currency} suficiente!`); 
    
    await updateDoc(doc(db, "users", auth.currentUser.uid), { 
        [field]: increment(-tot), 
        [`inventario.${id}`]: increment(q) 
    }); 
    alert("Comprado!"); 
};

window.filtrarLojaPorTipo = (t, b) => { 
    lojaAtual = t; 
    document.querySelectorAll('.shop-cat-btn').forEach(x => x.classList.remove('active')); 
    if(b) b.classList.add('active'); 
    carregarLojaItens(); 
};
window.atualizarFiltroVila = () => { vilaAtual = document.getElementById('shop-location').value; carregarLojaItens(); };

// --- CONQUISTAS ---
async function carregarConquistas() {
    const c = document.getElementById('conquistas-grid'); if(!c) return;
    const m = currentUserData.statusConquistas || {};
    const s = await getDocs(collection(db, "conquistas"));
    c.innerHTML = '';
    if(s.empty) { c.innerHTML = '<p>Nenhuma conquista.</p>'; return; }
    const isAdmin = auth.currentUser.email === "admin@rpgnaruto.com";

    s.forEach(d => {
        const i = d.data();
        const p = i.restrito_a || [];
        if (!isAdmin && p.length > 0 && !p.includes(currentUserData.nome)) return;

        const st = m[d.id];
        const k = document.createElement('div'); k.className = 'card jutsu-card-click';
        let btn = "";
        
        // Preparar valores (Ryos, XP, EN)
        const r = i.recompensa || 0;
        const x = i.xp || 0;
        const en = i.en || 0; 

        if(!st) btn = `<button class="mission-btn-start" onclick="event.stopPropagation(); solicitarConquista('${d.id}', this)">Reivindicar</button>`;
        else if(st === 'solicitado') btn = `<button class="mission-btn-wait" onclick="event.stopPropagation();">Aguardando Kage</button>`;
        else if(st === 'aprovado') btn = `<button class="mission-btn-collect" onclick="event.stopPropagation(); coletarConquista('${d.id}', ${r}, ${x}, ${en}, this)">Coletar</button>`;
        else if(st === 'concluido') btn = `<button class="mission-btn-done" onclick="event.stopPropagation();">Concluído</button>`;
        
        let stTxt = !st ? "Disponível" : (st==='solicitado' ? "Pendente" : (st==='aprovado' ? "Aprovado!" : "Concluído"));
        k.onclick = () => verDetalhesConquista(d.id, i, st);
        
        let rewardText = `${formatarNum(r)} Ryos`;
        if(en > 0) rewardText += ` | <span style="color:var(--en-color);">${en} EN</span>`;

        k.innerHTML = `<img src="${i.imagem||IMG_PADRAO}" class="card-img-top"><h4>${i.titulo}</h4><p style="font-weight:bold; color:#777;">${stTxt}</p><small style="color:var(--primary-color)">${rewardText}</small>${btn}`;
        c.appendChild(k);
    });
}

window.verDetalhesConquista = (id, d, st) => {
    const currentSt = currentUserData.statusConquistas[id];

    const r = d.recompensa || 0;
    const x = d.xp || 0;
    const en = d.en || 0;

    document.getElementById('conquista-name-modal').innerText = d.titulo;
    document.getElementById('conquista-desc-modal').innerText = d.descricao;
    
    let rewardsHtml = `${formatarNum(r)} Ryos`;
    if(en > 0) rewardsHtml += ` | <span style="color:var(--en-color); font-weight:bold;">${en} Essência Ninja</span>`;
    
    document.getElementById('conquista-reward-modal').innerHTML = rewardsHtml;
    document.getElementById('conquista-xp-modal').innerText = x;
    document.getElementById('conquista-img-modal').src = d.imagem||IMG_PADRAO;
    
    const a = document.getElementById('conquista-actions-modal'); a.innerHTML = '';
    
    if(!currentSt) a.innerHTML = `<button class="mission-btn-start" onclick="solicitarConquista('${id}', this)">Reivindicar</button>`;
    else if(currentSt === 'solicitado') a.innerHTML = `<button class="mission-btn-wait">Aguardando</button>`;
    else if(currentSt === 'aprovado') a.innerHTML = `<button class="mission-btn-collect" onclick="coletarConquista('${id}', ${r}, ${x}, ${en}, this)">Coletar</button>`;
    else a.innerHTML = `<button class="mission-btn-done">Feito</button>`;
    
    document.getElementById('conquistaModal').style.display='flex';
};

window.fecharConquistaModal = () => document.getElementById('conquistaModal').style.display='none';

window.solicitarConquista = async (id, btn) => {
    if(btn) { btn.disabled = true; btn.innerText = "Enviando..."; }
    await updateDoc(doc(db, "users", auth.currentUser.uid), { [`statusConquistas.${id}`]: 'solicitado' });
    alert("Solicitado!");
};

window.coletarConquista = async (id, r, x, en, btn) => {
    if(btn && btn.disabled) return;
    if(btn) { btn.disabled = true; btn.innerText = "Coletando..."; btn.style.display = 'none'; } 
    
    await updateDoc(doc(db, "users", auth.currentUser.uid), { 
        ryos: increment(r), 
        xp: increment(x),
        essencia_ninja: increment(en),
        [`statusConquistas.${id}`]: 'concluido' 
    });
    alert(`Recebido: ${r} Ryos, ${x} XP` + (en > 0 ? ` e ${en} EN!` : "!"));
    document.getElementById('conquistaModal').style.display='none';
};

// --- MISSÕES ---
async function carregarMissoes() { const c = document.getElementById('missoes-grid'); if(!c) return; const m = currentUserData.statusMissoes || {}; const s = await getDocs(collection(db, "missoes")); c.innerHTML = ''; 

const isAdmin = auth.currentUser.email === "admin@rpgnaruto.com";

s.forEach(d => { 
    const i = d.data();
    
    let restritos = i.restrito_a;
    // Normalize to array to handle single strings or arrays
    if (!restritos) restritos = [];
    if (typeof restritos === 'string') restritos = [restritos];

    const nomePlayer = currentUserData.nome;
    const apelidoPlayer = currentUserData.apelido;

    // Se for restrito e não for admin, verifica se está na lista
    if (restritos.length > 0 && !isAdmin) {
        const nomeNaLista = restritos.includes(nomePlayer);
        const apelidoNaLista = restritos.includes(apelidoPlayer);

        if (!nomeNaLista && !apelidoNaLista) {
            return; // Pula essa missão (não mostra)
        }
    }

    const st = m[d.id] || 'neutro'; const k = document.createElement('div'); k.className = 'card jutsu-card-click'; 

const rankClass = `rank-${(i.rank||'d').toLowerCase()}`;
const rankHtml = `<span class="rank-tag ${rankClass}">Rank ${i.rank||'D'}</span>`;

// Preparar valores
const r = i.recompensa || 0;
const x = i.xp || 0;
const en = i.en || 0; 

k.onclick = () => verDetalhesMissao(d.id, i, st); 

let rewardText = `${x} XP | ${formatarNum(r)} Ryos`;
if(en > 0) rewardText += ` | <span style="color:var(--en-color);">${en} EN</span>`;

k.innerHTML=`${rankHtml}<h4>${i.titulo}</h4><p style="font-size:0.9rem; color:${st==='em_andamento'?'orange':st==='aprovado'?'green':'#777'}; font-weight:bold;">${st==='neutro'?'Disponível':st}</p><small style="color:var(--primary-color)">${rewardText}</small>`; c.appendChild(k); }); }

window.verDetalhesMissao = (id, d, st) => { 
    const currentSt = currentUserData.statusMissoes[id] || 'neutro';

    const r = d.recompensa || 0;
    const x = d.xp || 0;
    const en = d.en || 0;
    
    document.getElementById('missao-name-modal').innerText = d.titulo; 
    document.getElementById('missao-desc-modal').innerText = d.descricao; 
    
    let rewardsHtml = `${formatarNum(r)} Ryos`;
    if(en > 0) rewardsHtml += ` | <span style="color:var(--en-color); font-weight:bold;">${en} Essência Ninja</span>`;
    
    document.getElementById('missao-reward-modal').innerHTML = rewardsHtml; 
    document.getElementById('missao-xp-modal').innerText = x; 
    document.getElementById('missao-img-modal').src = d.imagem||IMG_PADRAO; 
    
    const a = document.getElementById('missao-actions-modal'); a.innerHTML = ''; 
    
    if(currentSt==='neutro') a.innerHTML = `<button class="mission-btn-start" onclick="iniciarMissao('${id}', this)">Aceitar</button>`; 
    else if(currentSt==='em_andamento') a.innerHTML = `<button class="mission-btn-wait">Em Andamento</button>`; 
    else if(currentSt==='aprovado') a.innerHTML = `<button class="mission-btn-collect" onclick="coletarRecompensa('${id}', ${r}, ${x}, ${en}, '${d.rank||'D'}', this)">Receber</button>`; 
    else if(currentSt==='concluido') a.innerHTML = `<button class="mission-btn-done">Concluído</button>`; 
    
    document.getElementById('missaoModal').style.display='flex'; 
};
window.fecharMissaoModal = () => document.getElementById('missaoModal').style.display='none';

window.iniciarMissao = async (id, btn) => { 
    if(btn) { btn.disabled = true; btn.innerText = "Iniciando..."; }
    await updateDoc(doc(db, "users", auth.currentUser.uid), { [`statusMissoes.${id}`]: 'em_andamento' }); 
    alert("Iniciada!"); 
};

window.coletarRecompensa = async (id, r, x, en, rank, btn) => { 
    if(btn && btn.disabled) return;
    if(btn) { btn.disabled = true; btn.innerText = "Coletando..."; btn.style.display = 'none'; } 
    
    const rankKey = `missoes_concluidas_${rank.toLowerCase()}`;
    
    await updateDoc(doc(db, "users", auth.currentUser.uid), { 
        ryos: increment(r), 
        xp: increment(x),
        essencia_ninja: increment(en), // Adiciona EN
        [`statusMissoes.${id}`]: 'concluido',
        [rankKey]: increment(1) 
    }); 
    alert(`Missão cumprida! Ganhou: ${r} Ryos, ${x} XP` + (en > 0 ? ` e ${en} EN!` : "!")); 
    document.getElementById('missaoModal').style.display='none';
};

// --- FUNÇÕES DE MODAL GENÉRICAS ---
function abrirModalSimples(t, d) {
    let dados = d; if(t === 'jutsu') { try { dados = aplicarEscalaPersonalizada(d); } catch(e){} }
    document.getElementById(t+'-name-modal').innerText = dados.nome; 
    document.getElementById(t+'-desc-modal').innerText = dados.descricao||""; 
    document.getElementById(t+'-price-modal').innerText = "Valor: "+formatarNum(dados.preco)+" Ryos";
    document.getElementById(t+'-img-modal').src = dados.imagem||IMG_PADRAO;
    
    // Exibir Bônus
    let bonusHtml = gerarTagsBonus(dados);
    
    if(t==='jutsu'){ 
        document.getElementById(t+'-rank-modal').innerText="Rank "+dados.rank; 
        let h=""; 
        if(dados.dano) h+=`<span class="jutsu-stat-tag tag-dano">Dano: ${dados.dano}</span>`; 
        if(dados.chakra) h+=`<span class="jutsu-stat-tag tag-chakra">Chakra: ${dados.chakra}</span>`; 
        if(dados.stamina) h+=`<span class="jutsu-stat-tag tag-stamina">Stamina: ${dados.stamina}</span>`; 
        if(dados.bonus) h+=`<span class="jutsu-stat-tag tag-buff">${dados.bonus}</span>`; 
        h += bonusHtml;
        document.getElementById('jutsu-stats-row').innerHTML=h; 
    } else if (t === 'tool') {
        document.getElementById(t+'-rank-modal').innerText=dados.dano||"Ferramenta";
        let h = "";
        
        // --- DEBUG DE STAMINA ---
        console.log("ABRINDO TOOL:", dados); 
        
        // Conversão agressiva para garantir leitura (Number e String)
        let custoStamina = 0;
        if(dados.stamina) custoStamina = Number(dados.stamina);
        
        if(custoStamina > 0) {
                h += `<span class="jutsu-stat-tag tag-stamina">Stamina: ${custoStamina}</span>`;
        }
        
        h += bonusHtml;
        document.getElementById('tool-stats-row').innerHTML = h;
    } else {
        document.getElementById('item-stats-row').innerHTML = bonusHtml;
    }
    
    if(t==='item') document.getElementById(t+'-rank-modal').innerText = dados.efeito||"Item";
    document.getElementById(t+'Modal').style.display='flex';
}

window.verDetalhesJutsu = (id,d) => abrirModalSimples('jutsu',d); 
window.verDetalhesFerramenta = (id,d) => abrirModalSimples('tool',d); 
window.verDetalhesItem = (id,d) => abrirModalSimples('item',d);

window.fecharJutsuModal = () => document.getElementById('jutsuModal').style.display='none';
window.fecharToolModal = () => document.getElementById('toolModal').style.display='none';
window.fecharItemModal = () => document.getElementById('itemModal').style.display='none';

window.verPerfil = async (uid) => {
    const s = await getDoc(doc(db, "users", uid)); 
    if(s.exists()) { 
        const u = s.data(); 
        
        // Variáveis para contagem
        let totalJutsus = (u.meusJutsus || []).length;
        let totalTools = 0;
        let totalItems = 0;

        if (u.inventario) {
            for (const [id, qtd] of Object.entries(u.inventario)) {
                if (globalItensMap[id]) {
                    if (globalItensMap[id].type === 'tool') {
                        totalTools += qtd;
                    } else {
                        totalItems += qtd;
                    }
                } else {
                    totalItems += qtd; 
                }
            }
        }

        let invHtml = `
            <div class="stat-card" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div class="stat-value" style="font-size:1.5rem;">${totalJutsus}</div>
                <div class="stat-label">Jutsus</div>
            </div>
            <div class="stat-card" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div class="stat-value" style="font-size:1.5rem;">${totalTools}</div>
                <div class="stat-label">Ferramentas</div>
            </div>
            <div class="stat-card" style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div class="stat-value" style="font-size:1.5rem;">${totalItems}</div>
                <div class="stat-label">Itens</div>
            </div>
        `;

        document.getElementById('profile-modal-name').innerText = u.nome; 
        document.getElementById('profile-modal-char').innerText = u.apelido || ""; 
        document.getElementById('profile-modal-img').src = u.avatar||IMG_PADRAO; 
        renderizarIcones(u.elementos || [], 'profile-elementos-container', ELEMENTOS_ICONS, 'Naturezas de Chakra'); 
        renderizarIcones(u.kekkei_genkai || [], 'profile-kekkei-container', KEKKEI_ICONS, 'Kekkei Genkai'); 
        renderizarIcones(u.kekkei_moura || [], 'profile-moura-container', KEKKEI_MOURA_ICONS, 'Kekkei Moura'); 
        renderizarIcones(u.kekkei_touta || [], 'profile-touta-container', KEKKEI_TOUTA_ICONS, 'Kekkei Touta'); 

        const statsContainer = document.getElementById('other-profile-stats'); 
        statsContainer.innerHTML = `
        <div class="stats-divider">Geral</div>
        <div class="stat-card"><div class="stat-value">${u.nivel||1}</div><div class="stat-label">Nível</div></div>
        <div class="stat-card"><div class="stat-value">${u.cargo||'Genin'}</div><div class="stat-label">Cargo</div></div>
        <div class="stat-card"><div class="stat-value">${u.patente||'Genin'}</div><div class="stat-label">Patente</div></div>
        <div class="stat-card"><div class="stat-value">${u.rank||'E'}</div><div class="stat-label">Rank</div></div>
        <div class="stat-card"><div class="stat-value">${u.speed_rank||"E"}</div><div class="stat-label">Rank Vel.</div></div>
        <div class="stat-card"><div class="stat-value">${u.tipo||'Normal'}</div><div class="stat-label">Tipo</div></div>
        
        <div class="stats-divider">Batalha</div>
        <div class="stat-card"><div class="stat-value">${u.vitorias||0}</div><div class="stat-label">Vitórias</div></div>
        <div class="stat-card"><div class="stat-value">${u.empates||0}</div><div class="stat-label">Empates</div></div>
        <div class="stat-card"><div class="stat-value">${u.derrotas||0}</div><div class="stat-label">Derrotas</div></div>
        
        <div class="stats-divider">Inventário</div>
        <div style="grid-column: 1 / -1; display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">
            ${invHtml}
        </div>
        
        <div class="stats-divider">Vitalidade</div>
        <div class="stat-card"><div class="stat-value">${u.vida||100}</div><div class="stat-label">Vida</div></div>
        <div class="stat-card"><div class="stat-value">${u.chakra||100}</div><div class="stat-label">Chakra</div></div>
        <div class="stat-card"><div class="stat-value">${u.stamina||100}</div><div class="stat-label">Stamina</div></div>
        <div class="stat-card"><div class="stat-value">${u.controle_chakra||"Baixo"}</div><div class="stat-label">Controle</div></div>
        
        <div class="stats-divider">Atributos</div>
        <div class="stat-card"><div class="stat-value">${u.forca||10}</div><div class="stat-label">Força</div></div>
        <div class="stat-card"><div class="stat-value">${u.defesa||10}</div><div class="stat-label">Defesa</div></div>
        <div class="stat-card"><div class="stat-value">${u.agilidade||10}</div><div class="stat-label">Agilidade</div></div>
        <div class="stat-card"><div class="stat-value">${u.velocidade||10}</div><div class="stat-label">Velocidade</div></div>
        <div class="stat-card"><div class="stat-value">${u.intelecto||10}</div><div class="stat-label">Intelecto</div></div>`; 
        document.getElementById('profileModal').style.display = 'flex'; 
    } 
};
window.fecharProfileModal = () => document.getElementById('profileModal').style.display = 'none';

// --- PAINEL KAGE ---
async function carregarPainelAdmin() { try { const c = document.getElementById('admin-missoes-grid'); c.innerHTML='Carregando...'; const s = await getDocs(collection(db, "users")); c.innerHTML=''; s.forEach(u=>{ const d=u.data(); const m=d.statusMissoes||{}; const cq=d.statusConquistas||{}; for(const [mid,st] of Object.entries(m)){ if(st==='em_andamento'){ const k=document.createElement('div'); k.className='card'; k.innerHTML=`<h4>${d.nome} (Missão)</h4><p>${mid}</p><button class="mission-btn-collect" onclick="aprovarMissao('${u.id}','${mid}')">Aprovar</button>`; c.appendChild(k); } } for(const [cid,st] of Object.entries(cq)){ if(st==='solicitado'){ const k=document.createElement('div'); k.className='card'; k.innerHTML=`<h4>${d.nome} (Conquista)</h4><p>${cid}</p><button class="mission-btn-collect" onclick="aprovarConquista('${u.id}','${cid}')">Aprovar</button>`; c.appendChild(k); } } }); } catch(e){} }
window.aprovarMissao = async (uid, mid) => { if(confirm("Aprovar?")) await updateDoc(doc(db, "users", uid), { [`statusMissoes.${mid}`]: 'aprovado' }); alert("Feito!"); };
window.aprovarConquista = async (uid, cid) => { if(confirm("Aprovar?")) await updateDoc(doc(db, "users", uid), { [`statusConquistas.${cid}`]: 'aprovado' }); alert("Feito!"); };

// --- OUTROS ---
window.handleImageUpload = async (e) => { if(e.target.files[0]) { try { currentImageBase64 = await comprimirImagem(e.target.files[0]); document.getElementById('preview-image').src = currentImageBase64; document.getElementById('preview-container').style.display='block'; } catch(e){} } };
window.removeImage = () => { document.getElementById('imageInput').value=''; currentImageBase64=null; document.getElementById('preview-container').style.display='none'; };
window.publicarPost = async () => { const t = document.getElementById('postInput').value; if(!t.trim() && !currentImageBase64) return alert("Texto vazio"); const btn=document.querySelector('.btn-post'); btn.innerText="..."; try { await addDoc(collection(db, "posts"), { uid: auth.currentUser.uid, autor: currentUserData.apelido, autorAvatar: currentUserData.avatar, conteudo: t, imagem: currentImageBase64, data: serverTimestamp(), likes: [], savedBy: [], comments: [] }); document.getElementById('postInput').value=''; removeImage(); } catch(e){} finally{btn.innerText="Publicar";} };
window.renderFeed = (f) => { const c = document.getElementById('feed-container'); if(!c) return; try { onSnapshot(query(collection(db, "posts"), orderBy("data", "desc")), (s) => { c.innerHTML = ''; s.forEach(d => { try { const p = d.data(); if(f==='saved' && !(p.savedBy||[]).includes(auth.currentUser.uid)) return; const isLiked=(p.likes||[]).includes(auth.currentUser.uid); const isSaved=(p.savedBy||[]).includes(auth.currentUser.uid); const div=document.createElement('div'); div.className='post'; div.innerHTML=`<div class="post-header"><div class="user-avatar-post"><img src="${p.autorAvatar||IMG_PADRAO}"></div><div class="post-info"><span class="post-author">${p.autor}</span><span class="post-time">${calcularTempo(p.data)}</span></div>${p.uid===auth.currentUser.uid?`<div class="post-menu-container"><div class="post-options-btn" onclick="this.nextElementSibling.classList.toggle('active')">...</div><div class="post-dropdown"><div class="dropdown-item danger" onclick="deletarPost('${d.id}')">Excluir</div></div></div>`:''}</div><div class="post-content">${p.conteudo}</div>${p.imagem?`<img src="${p.imagem}" class="post-image" onclick="verPost('${d.id}')">`:''}<div class="post-actions"><button class="action-btn ${isLiked?'liked':''}" onclick="toggleLike('${d.id}')"><i class="${isLiked?'fa-solid':'fa-regular'} fa-heart"></i> ${(p.likes||[]).length}</button><button class="action-btn" onclick="verPost('${d.id}')"><i class="fa-regular fa-comment"></i> ${(p.comments||[]).length}</button><button class="action-btn ${isSaved?'saved':''}" onclick="toggleSave('${d.id}')" style="margin-left:auto;"><i class="${isSaved?'fa-solid':'fa-regular'} fa-bookmark"></i></button></div>`; c.appendChild(div); } catch(e){} }); }); } catch(e){} };
window.deletarPost = async (id) => { if(confirm("Apagar?")) await deleteDoc(doc(db, "posts", id)); };
window.toggleLike = async (id) => { const r=doc(db,"posts",id), s=await getDoc(r), l=s.data().likes||[]; if(l.includes(auth.currentUser.uid)) await updateDoc(r,{likes:arrayRemove(auth.currentUser.uid)}); else await updateDoc(r,{likes:arrayUnion(auth.currentUser.uid)}); };
window.toggleSave = async (id) => { const r=doc(db,"posts",id), s=await getDoc(r), l=s.data().savedBy||[]; if(l.includes(auth.currentUser.uid)) await updateDoc(r,{savedBy:arrayRemove(auth.currentUser.uid)}); else await updateDoc(r,{savedBy:arrayUnion(auth.currentUser.uid)}); };
window.verPost = async (id) => { currentOpenPostId = id; const s = await getDoc(doc(db, "posts", id)), p = s.data(); document.getElementById('modalPostContent').innerHTML = p.imagem ? `<img src="${p.imagem}" style="width:100%;height:100%;object-fit:contain;">` : `<div style="padding:20px;">${p.conteudo}</div>`; document.getElementById('commentsList').innerHTML = (p.comments||[]).map(c=>`<div><b>${c.autor}</b>: ${c.texto}</div>`).join(''); document.getElementById('commentModal').style.display='flex'; };
window.submitComment = async () => { const t = document.getElementById('newCommentText').value; if(!t) return; await updateDoc(doc(db, "posts", currentOpenPostId), { comments: arrayUnion({ autor: currentUserData.nome, texto: t }) }); document.getElementById('newCommentText').value = ""; verPost(currentOpenPostId); };
window.closeModal = () => document.getElementById('commentModal').style.display = 'none';

window.carregarRankings = async () => { const c = document.getElementById('ranking-container'); if(!c) return; try { const s = await getDocs(collection(db, "users")); let l = []; s.forEach(d => l.push(d.data())); c.innerHTML = ''; renderRank(c, "Nível", l, 'nivel'); renderRank(c, "Ryos", l, 'ryos'); renderRank(c, "Rankeadas", l, 'pontos_rankeada'); renderRank(c, "Torneios", l, 'vitorias_torneio'); renderRank(c, "Amistosos", l, 'pontos_amistoso'); renderRank(c, "Duplas", l, 'vitorias_dupla'); renderRank(c, "Clãs", l, 'vitorias_cla'); renderRank(c, "Missões Rank S", l, 'missoes_concluidas_s'); renderRank(c, "Missões Rank A", l, 'missoes_concluidas_a'); renderRank(c, "Missões Rank B", l, 'missoes_concluidas_b'); renderRank(c, "Missões Rank C", l, 'missoes_concluidas_c'); renderRank(c, "Missões Rank D", l, 'missoes_concluidas_d'); renderRank(c, "Missões Rank E", l, 'missoes_concluidas_e'); } catch (e) {} };
function renderRank(c,t,l,f) { const s=[...l].sort((a,b)=>(b[f]||0)-(a[f]||0)).slice(0,5); let h=`<div class="ranking-col"><h3>${t}</h3><table class="ranking-table">`; s.forEach((u,i)=>h+=`<tr><td>${i+1}. ${u.nome}</td><td>${formatarNum(u[f])}</td></tr>`); h+='</table></div>'; c.innerHTML+=h; }
window.editarHistoria = async () => { const n=prompt("Texto:",currentUserData.historiaTexto||""); if(n){ const i=prompt("Imagem:",currentUserData.historiaImagem||""); updateDoc(doc(db,"users",auth.currentUser.uid),{historiaTexto:n,historiaImagem:i}).then(reloadData); } }
async function carregarFrases() { const c = document.getElementById('frases-list-container'); try { onSnapshot(query(collection(db, "frases"), orderBy("data", "desc")), (s) => { c.innerHTML=''; s.forEach(d=>{ const f=d.data(); const k=document.createElement('div'); k.className='frase-item'; const menu = f.uid === auth.currentUser.uid ? `<div class="options-menu-container"><div class="options-btn" onclick="toggleFraseMenu(this); event.stopPropagation();">...</div><div class="options-dropdown"><div class="options-item" onclick="editarFrase('${d.id}','${f.texto}');event.stopPropagation()">Editar</div><div class="options-item danger" onclick="deletarFrase('${d.id}');event.stopPropagation()">Excluir</div></div></div>` : ''; k.onclick=()=>copiarFrase(f.texto); k.innerHTML=`<div class="frase-content">"${f.texto}"</div><div class="frase-author">- ${f.autor}</div>${menu}`; c.appendChild(k); }); }); } catch(e){} }
window.toggleFraseMenu = (el) => { const dropdown = el.nextElementSibling; document.querySelectorAll('.options-dropdown').forEach(d => { if(d !== dropdown) d.classList.remove('active'); }); dropdown.classList.toggle('active'); };
window.adicionarFrase = async () => { const t=document.getElementById('novaFraseInput').value; if(t) await addDoc(collection(db,"frases"),{texto:t,autor:currentUserData.nome,uid:auth.currentUser.uid,data:serverTimestamp()}); document.getElementById('novaFraseInput').value=''; }
window.editarFrase = async (id, oldText) => { const n = prompt("Editar:", oldText); if(n) await updateDoc(doc(db, "frases", id), { texto: n }); };
window.deletarFrase = async (id) => { if(confirm("Excluir?")) await deleteDoc(doc(db, "frases", id)); };
window.copiarFrase = (t) => { navigator.clipboard.writeText(t).then(() => { const f=document.getElementById('copyFeedback'); f.style.display='block'; setTimeout(()=>f.style.display='none',2000); }); };
window.handleAvatarPreview = async (e) => { if(e.target.files[0]) { newAvatarBase64 = await comprimirImagem(e.target.files[0]); document.getElementById('edit-avatar-preview').src = newAvatarBase64; } };
window.salvarPerfil = async () => { const nome = document.getElementById('edit-name-input').value; const apelido = document.getElementById('edit-nick-input').value; const updates = { nome: nome, apelido: apelido, personagem: nome }; if(newAvatarBase64) updates.avatar = newAvatarBase64; await updateDoc(doc(db, "users", auth.currentUser.uid), updates); location.reload(); };
window.openChangePasswordModal = () => { document.getElementById('changePasswordModal').style.display='flex'; document.getElementById('user-menu').classList.remove('show'); };
window.closeChangePasswordModal = () => document.getElementById('changePasswordModal').style.display='none';
window.salvarNovaSenha = async () => { const p = document.getElementById('new-password').value; if(!p || p.length < 6) return alert("Mínimo 6 caracteres"); try { await updatePassword(auth.currentUser, p); alert("Sucesso!"); closeChangePasswordModal(); } catch(e) { alert("Erro: " + e.message); } };

function comprimirImagem(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => reject("Erro ao carregar imagem.");
        };
        reader.onerror = () => reject("Erro ao ler arquivo.");
        reader.readAsDataURL(file);
    });
}
    </script>
</body>
</html>
