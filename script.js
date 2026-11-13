import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, increment, deleteField, addDoc, serverTimestamp, query, orderBy, onSnapshot, where, writeBatch, limit, startAfter, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ARENA, aplicarAcao, criarEstadoInicial, outro, previaAtaque, avaliarReacao, resultadoEsquiva, alguemAusente, bonusAtivos, funcaoDoJutsu, poderDoJutsu, necessidadesDoJutsu, custosDoJutsu, bonusDoJutsu, nomeBonus, xpApostavel, usoNaArena, requisitosDoJutsu, requisitoAtendido, genjutsuAtivo, nivelDoRank } from "./arena-regras.js";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = { apiKey: "AIzaSyC3HOor32_p5Z-iADm0VgZ279rt1kj8ICg", authDomain: "rpg-naruto-5150a.firebaseapp.com", projectId: "rpg-naruto-5150a", storageBucket: "rpg-naruto-5150a.firebasestorage.app", messagingSenderId: "1007094335306", appId: "1:1007094335306:web:ac96fa96f9494f90fd63b3" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- VARIÁVEIS GLOBAIS ---
let currentUserData = null;
let currentImageBase64 = null; 
let newAvatarBase64 = null;    
let currentOpenPostId = null;
let globalXpTable = [];
let vilaAtual = "Konoha";
let lojaAtual = "mercado"; // mesma categoria que aparece marcada na tela
let globalItensMap = {}; 
let ordenacaoAtual = 'alfabetica';
let currentGiftTarget = null;
let currentMentorData = null;
let currentMentorId = null;
let globalMentores = {};
let newMentorImageBase64 = null;
let currentChatUserId = null;
let unsubscribeChat = null;
let usuarioDestinoPresente = null;

const IMG_PADRAO = "https://placehold.co/40x40/orange/white?text=N";

// --- SEGURANÇA: escapa qualquer texto vindo do banco antes de inserir no HTML (evita XSS) ---
function esc(v) {
    return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
// Para passar um texto como argumento dentro de onclick="..." com segurança
function jsArg(v) { return esc(JSON.stringify(String(v ?? ''))); }
window.esc = esc;

const BIJUU_ICONS = {
    "shukaku": "img/bijuus/shukaku.jpg",
    "matatabi": "img/bijuus/matatabi.png",
    "isobu": "img/bijuus/isobu.jpg",
    "son_goku": "img/bijuus/son_goku.jpg",
    "kokuo": "img/bijuus/kokuo.jpg",
    "saiken": "img/bijuus/saiken.jpg",
    "choumei": "img/bijuus/choumei.jpg",
    "gyuki": "img/bijuus/gyuki.jpg",
    "kurama": "img/bijuus/kurama.jpg",
    "juubi": "img/bijuus/juubi.jpg"
};

const ELEMENTOS_ICONS = {
    "fogo": "img/elementos/fogo.jpg",
    "agua": "img/elementos/agua.jpg",
    "vento": "https://nrpgshinobi-konohagakure.weebly.com/uploads/1/6/0/4/16044106/819689103.png?193",
    "terra": "img/elementos/terra.jpg",
    "raio": "img/elementos/raio.jpg",
    "yin": "img/elementos/yin.jpg",
    "yang": "img/elementos/yang.png",
    "yin_yang": "img/elementos/yin_yang.jpg"
        };
const KEKKEI_ICONS = {
    "sharingan": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQsaFL3vRwLEqONbFnsr_tskXDVuf9C7F03HQ&s",
    "byakugan": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8dibOxYWvh_iAG7J4BJ6u1ziT2vSb0PpWdg&s",
    "mokuton": "img/kekkei-genkai/mokuton.jpg",
    "veia_ossea": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsbqzRS3LkfOJ69ZZvImlM2938cP4HHL3EzQ&s",
    "mse_sasuke": "img/kekkei-genkai/mse_sasuke.png",
    "rinnegan_supremo": "img/kekkei-genkai/rinnegan_supremo.jpg",
    "estilo_chama": "img/kekkei-genkai/estilo_chama.jpg",
    "estilo_ebulicao": "img/kekkei-genkai/estilo_ebulicao.jpg",
    "estilo_fusao": "img/kekkei-genkai/estilo_fusao.png",
    "estilo_magnetismo": "img/kekkei-genkai/estilo_magnetismo.jpg",
    "rinnegan": "img/kekkei-genkai/rinnegan.jpg",
    "mse_madara": "img/kekkei-genkai/mse_madara.png",
    "estilo_tempestade": "img/kekkei-genkai/estilo_tempestade.jpg",
    "ms_shisui": "img/kekkei-genkai/ms_shisui.png",
    "ms_itachi": "img/kekkei-genkai/ms_itachi.jpg",
    "ms_hagoromo": "img/kekkei-genkai/ms_hagoromo.jpg",
    "estilo_gelo": "img/kekkei-genkai/estilo_gelo.jpg",
    "ms_ryo_hanbin": "img/kekkei-genkai/ms_ryo_hanbin.jpg",
    "ms_hatsume": "img/kekkei-genkai/ms_hatsume.png",
    "ms_ashura": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3NQXt4e8uCFllNz2o8hVKpsKfk5bxeeerWQ&s"
        };
const KEKKEI_MOURA_ICONS = {
    "rinne_sharingan": "img/kekkei-moura/rinne_sharingan.jpg",
    "gudoudama": "img/kekkei-moura/gudoudama.jpg"
        };
const KEKKEI_TOUTA_ICONS = {
    "estilo_poeira": "img/kekkei-touta/estilo_poeira.jpg"
        };

// --- SISTEMA DE CENÁRIOS E MAPA ---
const CENARIOS_RPG = [
    { id: "vila_folha", nome: "Vila da Folha", img: "https://i.pinimg.com/736x/8e/bc/0a/8ebc0af5c8de5b978fc91cce667b2ab1.jpg" },
    { id: "vila_areia", nome: "Vila da Areia", img: "https://i.pinimg.com/736x/55/a7/bc/55a7bc12e4f0c8baab6949397e59f425.jpg" },
    { id: "vila_nevoa", nome: "Vila da Névoa", img: "https://i.pinimg.com/736x/e4/c7/2f/e4c72fd69a3028da35c10443e2f5ff57.jpg" },
    { id: "vila_nuvem", nome: "Vila da Nuvem", img: "https://i.pinimg.com/736x/2d/a5/d7/2da5d7a64e101f3e7b165b4c1fc7868d.jpg" },
    { id: "vila_pedra", nome: "Vila da Pedra", img: "https://i.pinimg.com/736x/21/cd/72/21cd72d17c7d425dc89f417db4fb9494.jpg" },
    { id: "vila_gelo", nome: "Vila do Gelo", img: "https://i.pinimg.com/736x/f6/c9/b7/f6c9b73f83ce82887a030ab2fde4cc46.jpg" },
    { id: "vila_som", nome: "Vila do Som", img: "https://i.pinimg.com/736x/b2/29/7d/b2297db0e2a2221b2bc2bbd25c689d02.jpg" },
    { id: "vila_cachoeira", nome: "Vila da Cachoeira", img: "https://i.pinimg.com/736x/81/2d/65/812d6594247f070c70415a7ea89ef78b.jpg" },
    { id: "esconderijo_akatsuki", nome: "Esconderijo da Akatsuki", img: "https://i.pinimg.com/736x/11/4a/01/114a01c402120b08051754ec4fbdbbb6.jpg" },
    { id: "mundo_aberto", nome: "Mundo Aberto", img: "https://i.pinimg.com/736x/da/0c/34/da0c3453b53f6db15049a4f216dd5a89.jpg" }
];

// Opcional: Colequei links de imagens genéricas como exemplo no 'img'. Você pode trocar pelos links da sua preferência.

window.carregarMapa = () => {
    const grid = document.getElementById('cenarios-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    CENARIOS_RPG.forEach(cenario => {
        // Verifica se o player já está neste lugar
        const isLocalAtual = currentUserData.cenarioAtual === cenario.id;
        
        // --- NOVO: Lógica inteligente do botão ---
        let btnTexto, btnAcao, btnEstilo, icone;
        
        if (isLocalAtual) {
            btnTexto = 'Explorar Local';
            btnAcao = `window.abrirChatCenario('${cenario.id}', '${cenario.nome}')`;
            btnEstilo = 'background: #2ecc71;'; // Fica verde indicando que você já está lá
            icone = 'fa-comments';
        } else {
            btnTexto = 'Viajar para cá';
            btnAcao = `window.viajarPara('${cenario.id}', '${cenario.nome}')`;
            btnEstilo = 'background: var(--primary-color);'; // Laranja padrão
            icone = 'fa-person-walking-luggage';
        }

        const div = document.createElement('div');
        div.className = 'cenario-card';
        
        // Adicionamos um texto verde de "Localização Atual" abaixo do nome para dar mais destaque
        div.innerHTML = `
            <img src="${cenario.img}" class="cenario-img" onerror="this.src='${IMG_PADRAO}'">
            <div class="cenario-info">
                <div class="cenario-nome">${cenario.nome}</div>
                ${isLocalAtual ? '<div style="color:#2ecc71; font-size:0.8rem; font-weight:bold; margin-top:5px;"><i class="fa-solid fa-location-dot"></i> Localização Atual</div>' : ''}
            </div>
            <button class="cenario-btn" style="${btnEstilo}" onclick="${btnAcao}">
                <i class="fa-solid ${icone}"></i> ${btnTexto}
            </button>
        `;
        grid.appendChild(div);
    });
};

window.viajarPara = async (id, nome) => {
    if (!auth.currentUser) return;
    
    if (confirm(`Deseja iniciar a viagem para ${nome}?`)) {
        try {
            // CORREÇÃO: Removido os prefixos "window." do Firebase
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                cenarioAtual: id
            });
            
            // Atualiza os dados no navegador na mesma hora
            currentUserData.cenarioAtual = id; 
            window.carregarMapa(); 
            
            // Avisa o usuário e já abre o Chat do lugar novo!
            alert(`Sua viagem foi concluída. Você chegou em: ${nome}!`);
            window.abrirChatCenario(id, nome);
            
        } catch (e) {
            console.error(e);
            alert("Erro ao viajar. O chakra falhou!");
        }
    }
};


// --- CACHE DE LEITURAS (economiza leituras do Firebase) ---
// Catálogos (jutsus, ferramentas, itens, missões, conquistas, mentores) mudam pouco:
// são lidos uma vez e reaproveitados por alguns minutos, em vez de a cada clique.
const CACHE_VALIDADE_MS = {
    padrao: 5 * 60 * 1000,   // catálogos: 5 minutos
    users: 60 * 1000         // lista de ninjas (rankings/diretório): 1 minuto
};
const cacheColecoes = {};
async function lerColecao(nome, forcar = false) {
    const validade = CACHE_VALIDADE_MS[nome] || CACHE_VALIDADE_MS.padrao;
    const c = cacheColecoes[nome];
    if (!forcar && c && Date.now() - c.em < validade) return c.snap;
    const real = await getDocs(collection(db, nome));
    const itens = real.docs.map(d => ({ id: d.id, dados: d.data() }));
    // Imita o formato do Firebase (forEach, docs, empty) e entrega cópias,
    // para que nenhuma tela altere o cache sem querer.
    const snap = {
        empty: itens.length === 0,
        size: itens.length,
        docs: itens.map(i => ({ id: i.id, data: () => structuredClone(i.dados) })),
        forEach(fn) { this.docs.forEach(fn); }
    };
    cacheColecoes[nome] = { em: Date.now(), snap };
    return snap;
}
async function lerDoCatalogo(nome, id) {
    const snap = await lerColecao(nome);
    const d = snap.docs.find(x => x.id === id);
    return d ? { id: d.id, ...d.data() } : null;
}
function limparCache(nome) { if (nome) delete cacheColecoes[nome]; else Object.keys(cacheColecoes).forEach(k => delete cacheColecoes[k]); }
window.limparCache = limparCache;

// --- UTILITÁRIOS ---
function calcularTempo(timestamp) { try { if (!timestamp) return "Desconhecido"; let date = (typeof timestamp.toDate === 'function') ? timestamp.toDate() : new Date(timestamp); if (isNaN(date.getTime())) return "-"; return date.toLocaleDateString('pt-BR'); } catch (e) { return "-"; } }
// Preço oficial de um item/jutsu (as regras de segurança do Firebase usam a MESMA conta):
// em EN se tiver preco_en; senão em Ryos, usando a promoção quando for menor.
function numero(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function moedaDe(item) { return numero(item.preco_en) > 0 ? 'essencia_ninja' : 'ryos'; }
function precoDe(item) {
    if (moedaDe(item) === 'essencia_ninja') return numero(item.preco_en);
    const promo = numero(item.preco_promocional), cheio = numero(item.preco);
    return (promo > 0 && promo < cheio) ? promo : cheio;
}
function formatarNum(v) { return Number(v||0).toLocaleString('pt-BR'); }
window.toggleMobileMenu = () => { document.querySelector('.sidebar').classList.toggle('mobile-active'); document.querySelector('.sidebar-overlay').classList.toggle('active'); };


// --- ANIMAÇÃO DE ENTRADA (Sharingan → Mangekyou) ---
// Aparece logo após o login e some quando a ficha do ninja chega
// (fica no mínimo o tempo da transformação, e no máximo 10 s, por segurança).
const carregamento = { inicio: 0, dadosProntos: false, timers: [] };
function mostrarCarregamento() {
    const tela = document.getElementById('tela-carregamento');
    if (!tela || !tela.hidden) return;
    const poucoMovimento = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    carregamento.inicio = Date.now();
    carregamento.dadosProntos = false;
    carregamento.minimo = poucoMovimento ? 700 : 2600;
    tela.classList.remove('saindo', 'mangekyou');
    tela.hidden = false;
    const frase = document.getElementById('carregamento-frase');
    if (frase) frase.textContent = 'Despertando o Sharingan';
    carregamento.timers.push(setTimeout(() => {
        tela.classList.add('mangekyou');
        if (frase) frase.textContent = 'Mangekyou desperto! Entrando na vila';
    }, poucoMovimento ? 0 : 1500));
    carregamento.timers.push(setTimeout(() => esconderCarregamento(true), 10000));
}
function esconderCarregamento(forcar = false) {
    const tela = document.getElementById('tela-carregamento');
    if (!tela || tela.hidden) return;
    const falta = carregamento.minimo - (Date.now() - carregamento.inicio);
    if (!forcar && falta > 0) { carregamento.timers.push(setTimeout(() => esconderCarregamento(), falta)); return; }
    carregamento.timers.forEach(clearTimeout); carregamento.timers = [];
    tela.classList.add('saindo');
    setTimeout(() => { tela.hidden = true; tela.classList.remove('saindo', 'mangekyou'); }, 650);
}

// --- AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        mostrarCarregamento();
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        
        // --- AJUSTE 1: Lista de Admins para mostrar o botão Painel Kage ---
        const listaAdmins = [
            "admin@rpgnaruto.com",
            "conselheiro@rpgnaruto.com" 
        ];
        if (listaAdmins.includes(user.email)) {
            document.getElementById('btn-admin-panel').style.display = 'flex';
        }

        // --- AJUSTE 2: Deixa o Ninja ONLINE (bolinha verde) ao entrar ---
        if (typeof window.atualizarStatusOnline === 'function') {
            window.atualizarStatusOnline(true);
        }

        await carregarConfiguracoes();
        await carregarCacheItens();
        const docRef = doc(db, "users", user.uid);
        let primeiraCargaFicha = true;

        onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = docSnap.data();
                if(!currentUserData.inventario) currentUserData.inventario = {};
                if(!currentUserData.meusJutsus) currentUserData.meusJutsus = [];
                verificarLevelUpAutomatico(currentUserData);
                atualizarInterface(currentUserData);
                // Na 1ª carga desenha a aba aberta; depois, só redesenha abas que dependem da ficha
                // (saldo, inventário, status de missões...). O feed e as listas não são baixados de novo.
                const activeTab = document.querySelector('.tab-content.active');
                const ABAS_LIGADAS_A_FICHA = ['jutsus', 'ferramentas', 'loja', 'inventario', 'missoes', 'conquistas', 'premios'];
                if (activeTab && (primeiraCargaFicha || ABAS_LIGADAS_A_FICHA.includes(activeTab.id))) {
                    window.showTab(activeTab.id, { atualizacao: true });
                }
                primeiraCargaFicha = false;
                esconderCarregamento();
            } else {
                esconderCarregamento(); // ficha ainda não criada pelo Kage: não prende a tela
            }
        });
        
        // (As abas agora carregam seus dados só quando são abertas.)
        window.iniciarEscutaChats();
        
        // ---> LIGA O RADAR DE DESAFIOS AQUI! <---
        window.escutarDesafiosRecebidos(); 
        window.verificarBatalhaAtiva() // <--- LINHA NOVA: Tenta reconectar à batalha
        window.escutarLutasAoVivo();   // lutas dos outros ao vivo (botão da Arena pulsa em vermelho)
        conferirApostasAbertas();      // apostas de lutas que terminaram enquanto estava fora

        
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app-container').style.display = 'none';
        
        const btnLogin = document.getElementById('btnLogin');
        if (btnLogin) { btnLogin.innerText = "Entrar"; btnLogin.disabled = false; }
        ['emailInput', 'passwordInput'].forEach(id => { const c = document.getElementById(id); if (c) c.disabled = false; });
    }
});

// Traduz os erros do login do Firebase para mensagens claras em português
function mensagemErroAuth(err) {
    const codigo = (err && err.code) || '';
    switch (codigo) {
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return "E-mail ou senha incorretos. Confira e tente de novo.";
        case 'auth/invalid-email':
            return "Esse e-mail não é válido. Confira se digitou certo.";
        case 'auth/too-many-requests':
            return "Muitas tentativas seguidas. Por segurança, o login foi bloqueado por alguns minutos. Aguarde e tente de novo com calma.";
        case 'auth/user-disabled':
            return "Esta conta foi desativada. Fale com o Kage.";
        case 'auth/network-request-failed':
            return "Sem conexão com a internet. Verifique sua rede e tente de novo.";
        case 'auth/weak-password':
            return "Senha muito fraca. Use pelo menos 6 caracteres.";
        case 'auth/requires-recent-login':
            return "Por segurança, saia e entre de novo antes de trocar a senha.";
        default:
            return "Não foi possível entrar agora. Tente novamente em instantes.";
    }
}

const btnLogin = document.getElementById('btnLogin');
if (btnLogin) {
    const msgErro = document.getElementById('msgError');
    const campos = [document.getElementById('emailInput'), document.getElementById('passwordInput')];
    const travarLogin = (travado) => {
        btnLogin.disabled = travado;
        btnLogin.innerText = travado ? "Entrando..." : "Entrar";
        campos.forEach(c => { if (c) c.disabled = travado; });
    };

    btnLogin.addEventListener('click', () => {
        if (btnLogin.disabled) return; // já tem um login em andamento: não envia de novo
        const e = document.getElementById('emailInput').value.trim();
        const s = document.getElementById('passwordInput').value;
        if (msgErro) msgErro.innerText = "";
        if (!e || !s) { if (msgErro) msgErro.innerText = "Preencha e-mail e senha."; return; }

        travarLogin(true);
        signInWithEmailAndPassword(auth, e, s).catch((err) => {
            console.error(err);
            travarLogin(false);
            if (msgErro) msgErro.innerText = mensagemErroAuth(err);
            else alert(mensagemErroAuth(err));
            document.getElementById('passwordInput')?.focus();
        });
    });
}


// --- NAVEGAÇÃO ---
window.showTab = (t, opcoes = {}) => {
    const ehAtualizacao = opcoes.atualizacao === true;
    // 1. Lista organizada de administradores
    const listaAdmins = [
        "admin@rpgnaruto.com",
        "conselheiro@rpgnaruto.com"
    ];
    // Verifica se o usuário logado está na lista
    const isAdmin = auth.currentUser && listaAdmins.includes(auth.currentUser.email);
    
    const btnAdd = document.getElementById('btn-adicionar-geral');
    
    // Se no futuro você quiser criar prêmios com o botão "+", basta adicionar 'premios' nesta lista:
    const abasComCriacao = ['jutsus', 'ferramentas', 'missoes', 'conquistas', 'loja'];

    // --- Controla a exibição do botão flutuante (+) ---
    if (btnAdd) {
        if (isAdmin && abasComCriacao.includes(t)) {
            btnAdd.style.display = 'block';
            btnAdd.setAttribute('data-tipo', t); 
        } else {
            btnAdd.style.display = 'none';
        }
    }

    try {
        // Remove a classe active de todos os conteúdos e botões
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const target = document.getElementById(t);
        if(target) target.classList.add('active');

        document.querySelectorAll('.top-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));

        // O botão superior ou lateral vai receber a bordinha laranja/destaque automaticamente
        document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
        const btnTop = document.getElementById('nav-btn-' + t);
        const btnSide = document.getElementById('side-btn-' + t);
        const btnBottom = document.getElementById('bottom-btn-' + t);
        if(btnTop) btnTop.classList.add('active');
        if(btnSide) btnSide.classList.add('active');
        if(btnBottom) btnBottom.classList.add('active');
        // Volta ao topo ao trocar de aba (mas não quando é só uma atualização automática)
        const area = document.getElementById('content-area');
        if (area && !ehAtualizacao) area.scrollTop = 0;

        // Lógica de carregamento de dados por aba
        if(currentUserData) {
            if(t === 'feed') window.renderFeed(filtroFeedAtual);
            if(t === 'personagens') carregarPersonagens();
            if(t === 'mapa') window.carregarMapa();
            if(t === 'batalha') window.carregarLobbyArena();
            if(t === 'frases') carregarFrases();
            if(t === 'inventario') carregarInventario();
            if(t === 'loja') carregarLojaItens();
            if(t === 'jutsus') { 
                carregarMeusJutsus(currentUserData.meusJutsus); 
                carregarLoja(); 
            }
            if(t === 'ferramentas') carregarLojaFerramentas(); 
            if(t === 'conquistas') carregarConquistas();
            if(t === 'missoes') carregarMissoes();
            if(t === 'rankings') carregarRankings();
            if(t === 'mentorias') carregarMentorias();
            if(t === 'admin-panel') { window.carregarFormTorneio(); window.carregarTesouraria(); carregarPainelAdmin(); window.carregarDiariosAdmin(); window.carregarPremiosPendentesAdmin(); }

            if(t === 'loja-premium') {
                window.carregarCofreVila();
                const input = document.getElementById('input-qtd-ryos');
                if(input) input.value = "";
                const label = document.getElementById('label-custo-en');
                if(label) label.innerText = "0";
            }
            
            // --- NOVO: Lógica visual da aba de Prêmios (Roleta) ---
            if(t === 'premios') {
                renderMeusPremios();
                const agora = Date.now();
                const seteDiasEmMs = 7 * 24 * 60 * 60 * 1000;
                const ultimoGiro = currentUserData.ultimoGiroRoleta || 0;
                const timerTexto = document.getElementById('roleta-timer');
                
                // Se já girou nos últimos 7 dias, mostra o aviso na hora que a aba abre
                if (agora - ultimoGiro < seteDiasEmMs) {
                    const diasRestantes = Math.ceil((seteDiasEmMs - (agora - ultimoGiro)) / (1000 * 60 * 60 * 24));
                    if(timerTexto) {
                        timerTexto.innerText = `Você já girou! Volte em ${diasRestantes} dias.`;
                        timerTexto.style.display = 'block';
                    }
                } else {
                    if(timerTexto) timerTexto.style.display = 'none';
                }
            }
        }

        // Fecha o menu mobile ao trocar de aba (se estiver aberto)
        if(window.innerWidth <= 768 && !ehAtualizacao) {
             const sidebar = document.querySelector('.sidebar');
             if(sidebar && sidebar.classList.contains('mobile-active')) window.toggleMobileMenu();
        }
    } catch (e) { 
        console.error("Erro ao trocar aba:", e); 
    }
};



// --- FEED (CORRIGIDO COM NOMES DO SEU BANCO) ---
window.handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
        currentImageBase64 = await comprimirImagem(file);
        document.getElementById('preview-image').src = currentImageBase64;
        document.getElementById('preview-container').style.display = 'block';
    } catch (error) { alert("Erro ao processar imagem: " + error); }
};

window.removeImage = () => {
    currentImageBase64 = null;
    document.getElementById('imageInput').value = "";
    document.getElementById('preview-container').style.display = 'none';
    document.getElementById('preview-image').src = "";
};

window.publicarPost = async () => {
    const texto = document.getElementById('postInput').value;
    const btn = document.querySelector('.create-post .btn-post');
    if (!texto && !currentImageBase64) return alert("Escreva algo ou poste uma foto!");

    try {
        btn.disabled = true; btn.innerText = "Publicando...";
        // AQUI ESTAVA O ERRO: Agora salva como 'autorAvatar' e 'conteudo'
        await addDoc(collection(db, "posts"), {
            uid: auth.currentUser.uid,
            autor: currentUserData.nome,
            autorAvatar: currentUserData.avatar || IMG_PADRAO, 
            conteudo: texto,
            imagem: currentImageBase64,
            likes: [],
            comentarios: [],
            data: serverTimestamp()
        });
        document.getElementById('postInput').value = "";
        window.removeImage();
        window.renderFeed('all');
    } catch (error) { console.error(error); alert("Erro ao publicar."); } 
    finally { btn.disabled = false; btn.innerText = "Publicar"; }
};

// --- SALVOS: o feed lembra se está mostrando "todos" ou só os "salvos" ---
let filtroFeedAtual = 'all';
window.abrirFeed = (filtro = 'all') => {
    filtroFeedAtual = filtro;
    document.getElementById('user-menu')?.classList.remove('show');
    window.showTab('feed');
};
window.salvarPost = async (pid) => {
    if (!auth.currentUser || !currentUserData) return;
    const salvos = currentUserData.postsSalvos || [];
    const jaSalvo = salvos.includes(pid);
    try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
            postsSalvos: jaSalvo ? arrayRemove(pid) : arrayUnion(pid)
        });
        // Atualiza na hora, sem esperar o banco responder
        currentUserData.postsSalvos = jaSalvo ? salvos.filter(id => id !== pid) : [...salvos, pid];
        const el = document.querySelector(`.post[data-pid="${CSS.escape(pid)}"]`);
        if (jaSalvo && filtroFeedAtual === 'saved') {
            // Na lista de salvos, o post removido sai da tela
            if (el) el.remove();
            if (!document.querySelector('#feed-container .post')) window.renderFeed('saved');
        } else if (el) {
            // Só troca o ícone do marcador, sem recarregar o feed
            const btn = el.querySelector('.btn-salvar');
            const agoraSalvo = !jaSalvo;
            btn.classList.toggle('salvo', agoraSalvo);
            btn.setAttribute('aria-pressed', agoraSalvo);
            btn.setAttribute('aria-label', agoraSalvo ? 'Remover dos salvos' : 'Salvar publicação');
            btn.title = agoraSalvo ? 'Remover dos salvos' : 'Salvar';
            btn.innerHTML = `<i class="${agoraSalvo ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i>`;
        }
    } catch (e) { console.error(e); alert("Não foi possível salvar a publicação."); }
};

const POSTS_POR_PAGINA = 15;
let ultimoPostCarregado = null; // marcador para o botão "Carregar mais"

// Monta o cartão de um post (usado pelo feed, pelos salvos e pelo "carregar mais")
function criarElementoPost(docSnap, salvos) {
    const post = docSnap.data();
    const pid = docSnap.id;
    const isSalvo = salvos.includes(pid);

    // Avatar: 'autorAvatar' (novo) ou 'avatar' (antigo)
    let avatarUrl = post.autorAvatar || post.avatar;
    if (!avatarUrl || avatarUrl === "undefined" || avatarUrl.length < 10) avatarUrl = IMG_PADRAO;
    // Conteúdo: 'conteudo' (novo) ou 'texto' (antigo)
    const textoConteudo = post.conteudo || post.texto || "";

    const isLiked = post.likes && post.likes.includes(auth.currentUser.uid);
    const likeClass = isLiked ? "fa-solid liked" : "fa-regular";
    const likeColor = isLiked ? "color:var(--danger-color);" : "";
    const tempo = calcularTempo(post.data);

    const div = document.createElement('div');
    div.className = 'post';
    div.dataset.pid = pid;
    div.innerHTML = `
        <div class="post-header">
            <div class="user-avatar-post">
                <img src="${esc(avatarUrl)}" alt="Avatar" onerror="this.onerror=null; this.src='${IMG_PADRAO}';">
            </div>
            <div class="post-info">
                <span class="post-author">${esc(post.autor || "Ninja")}</span>
                <span class="post-time">${tempo}</span>
            </div>
            ${auth.currentUser && post.uid === auth.currentUser.uid ? `
            <div class="post-menu-container">
                <div class="post-options-btn" onclick="togglePostMenu('${pid}'); event.stopPropagation();">...</div>
                <div id="menu-${pid}" class="post-dropdown">
                    <div class="post-dropdown-item danger" onclick="deletarPost('${pid}')">Excluir</div>
                </div>
            </div>` : ''}
        </div>

        <div class="post-content" onclick="abrirComentarios('${pid}')" style="cursor:pointer; display:block; padding:10px; color:var(--text-color, #333); min-height:10px; white-space: pre-wrap;">${esc(textoConteudo)}</div>

        ${post.imagem ? `<img src="${esc(post.imagem)}" class="post-image" loading="lazy" onclick="abrirComentarios('${pid}')" style="cursor:pointer; background-color:#f0f0f0;">` : ""}

        <div class="post-actions">
            <button class="action-btn" onclick="curtirPost('${pid}')" style="${likeColor}">
                <i class="${likeClass} fa-heart"></i> ${post.likes ? post.likes.length : 0}
            </button>
            <button class="action-btn" onclick="abrirComentarios('${pid}')">
                <i class="fa-regular fa-comment"></i> ${post.comentarios ? post.comentarios.length : 0}
            </button>
            <button class="action-btn btn-salvar ${isSalvo ? 'salvo' : ''}" onclick="salvarPost(${jsArg(pid)})" aria-pressed="${isSalvo}" aria-label="${isSalvo ? 'Remover dos salvos' : 'Salvar publicação'}" title="${isSalvo ? 'Remover dos salvos' : 'Salvar'}">
                <i class="${isSalvo ? 'fa-solid' : 'fa-regular'} fa-bookmark" aria-hidden="true"></i>
            </button>
        </div>`;
    return div;
}

function botaoCarregarMais(container, visivel) {
    let btn = document.getElementById('btn-carregar-mais');
    if (!visivel) { if (btn) btn.remove(); return; }
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-carregar-mais';
        btn.className = 'btn-carregar-mais';
        btn.innerHTML = '<i class="fa-solid fa-angles-down" aria-hidden="true"></i> Carregar mais publicações';
        btn.onclick = () => window.carregarMaisPosts();
    }
    container.appendChild(btn); // sempre no fim da lista
}

window.renderFeed = async (filtro = filtroFeedAtual) => {
    filtroFeedAtual = filtro;
    const container = document.getElementById('feed-container');
    if (!container) return;
    const salvos = (currentUserData && currentUserData.postsSalvos) || [];
    const soSalvos = filtro === 'saved';
    const cabecalho = document.getElementById('feed-filtro-cabecalho');
    if (cabecalho) cabecalho.style.display = soSalvos ? 'flex' : 'none';
    const criarPost = document.querySelector('#feed .create-post');
    if (criarPost) criarPost.style.display = soSalvos ? 'none' : '';
    container.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">Atualizando feed...</p>';

    try {
        let docsVisiveis;
        if (soSalvos) {
            // Busca só os posts salvos (em vez de baixar o feed inteiro)
            const lidos = await Promise.all(salvos.map(id => getDoc(doc(db, "posts", id)).catch(() => null)));
            docsVisiveis = lidos.filter(d => d && d.exists());
            const ms = (d) => { const t = d.data().data; return t && typeof t.toMillis === 'function' ? t.toMillis() : 0; };
            docsVisiveis.sort((a, b) => ms(b) - ms(a));
            ultimoPostCarregado = null;
        } else {
            // Só as publicações mais recentes; o resto vem pelo botão "Carregar mais"
            const q = query(collection(db, "posts"), orderBy("data", "desc"), limit(POSTS_POR_PAGINA));
            const snap = await getDocs(q);
            docsVisiveis = snap.docs;
            ultimoPostCarregado = snap.docs.length === POSTS_POR_PAGINA ? snap.docs[snap.docs.length - 1] : null;
        }

        container.innerHTML = "";
        if (docsVisiveis.length === 0) {
            container.innerHTML = soSalvos
                ? '<p class="feed-vazio"><i class="fa-regular fa-bookmark" aria-hidden="true"></i><br>Você ainda não salvou nenhuma publicação.<br><small>Toque no marcador de um post para guardá-lo aqui.</small></p>'
                : '<p class="feed-vazio">Nenhuma publicação ainda.</p>';
            return;
        }
        docsVisiveis.forEach(d => container.appendChild(criarElementoPost(d, salvos)));
        botaoCarregarMais(container, !!ultimoPostCarregado);
    } catch (e) { console.error("Erro feed:", e); container.innerHTML = '<p style="text-align:center; color:red;">Erro ao carregar feed.</p>'; }
};

window.carregarMaisPosts = async () => {
    if (!ultimoPostCarregado) return;
    const container = document.getElementById('feed-container');
    const btn = document.getElementById('btn-carregar-mais');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Carregando...'; }
    try {
        const salvos = (currentUserData && currentUserData.postsSalvos) || [];
        const q = query(collection(db, "posts"), orderBy("data", "desc"), startAfter(ultimoPostCarregado), limit(POSTS_POR_PAGINA));
        const snap = await getDocs(q);
        snap.docs.forEach(d => container.insertBefore(criarElementoPost(d, salvos), btn));
        ultimoPostCarregado = snap.docs.length === POSTS_POR_PAGINA ? snap.docs[snap.docs.length - 1] : null;
    } catch (e) { console.error("Erro ao carregar mais posts:", e); }
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-angles-down" aria-hidden="true"></i> Carregar mais publicações'; }
    botaoCarregarMais(container, !!ultimoPostCarregado);
};

window.abrirComentarios = async (pid) => {
    currentOpenPostId = pid;
    const modal = document.getElementById('commentModal');
    const contentDiv = document.getElementById('modalPostContent');
    const listDiv = document.getElementById('commentsList');
    modal.style.display = 'flex';
    contentDiv.innerHTML = '<p style="color:white;">Carregando...</p>';
    listDiv.innerHTML = '<p>Carregando comentários...</p>';

    try {
        const postSnap = await getDoc(doc(db, "posts", pid));
        if (!postSnap.exists()) { alert("Post não encontrado."); modal.style.display = 'none'; return; }
        const p = postSnap.data();
        
        // CORREÇÃO TAMBÉM NO MODAL
        const textoModal = p.conteudo || p.texto || "";
        
        let htmlContent = "";
        if (p.imagem) htmlContent += `<img src="${esc(p.imagem)}" style="max-width:100%; max-height:80vh; object-fit:contain;">`;
        if (textoModal) htmlContent += `<div style="padding:20px; color:white; font-size:1.2rem; text-align:center; overflow-y:auto; white-space: pre-wrap;">${esc(textoModal)}</div>`;
        
        contentDiv.innerHTML = htmlContent;
        renderizarListaComentarios(p.comentarios || []);
    } catch (e) { console.error(e); contentDiv.innerHTML = '<p style="color:red">Erro.</p>'; }
};

function renderizarListaComentarios(lista) {
    const listDiv = document.getElementById('commentsList');
    listDiv.innerHTML = "";
    if (!lista || lista.length === 0) { listDiv.innerHTML = '<p style="text-align:center; color:#777; margin-top:20px;">Seja o primeiro a comentar!</p>'; return; }
    lista.forEach(c => {
        const item = document.createElement('div');
        item.style.borderBottom = "1px solid #eee"; item.style.padding = "10px";
        item.innerHTML = `<div style="font-weight:bold; font-size:0.9rem;">${esc(c.autor)}</div><div style="font-size:0.9rem;">${esc(c.texto)}</div><div style="font-size:0.7rem; color:#999;">${c.data ? calcularTempo(c.data) : "Agora"}</div>`;
        listDiv.appendChild(item);
    });
}

window.submitComment = async () => {
    const input = document.getElementById('newCommentText');
    const texto = input.value;
    if (!texto || !currentOpenPostId) return;
    try {
        await updateDoc(doc(db, "posts", currentOpenPostId), { comentarios: arrayUnion({ uid: auth.currentUser.uid, autor: currentUserData.nome, texto: texto, data: new Date().toISOString() }) });
        input.value = "";
        window.abrirComentarios(currentOpenPostId);
    } catch (e) { alert("Erro ao comentar."); }
};

window.togglePostMenu = (pid) => {
    const menu = document.getElementById(`menu-${pid}`);
    document.querySelectorAll('.post-dropdown').forEach(d => { if(d !== menu) d.classList.remove('active'); });
    if(menu) menu.classList.toggle('active');
};
window.curtirPost = async (pid) => {
    const uid = auth.currentUser.uid;
    const postRef = doc(db, "posts", pid);
    try {
        const p = await getDoc(postRef);
        if(p.exists()) {
            const jaCurtiu = (p.data().likes || []).includes(uid);
            await updateDoc(postRef, { likes: jaCurtiu ? arrayRemove(uid) : arrayUnion(uid) });
            // Redesenha só este post (mantém os que já foram carregados com "Carregar mais")
            const atualizado = await getDoc(postRef);
            const el = document.querySelector(`.post[data-pid="${CSS.escape(pid)}"]`);
            if (el && atualizado.exists()) el.replaceWith(criarElementoPost(atualizado, (currentUserData && currentUserData.postsSalvos) || []));
        }
    } catch(e) {}
};
window.deletarPost = async (pid) => { if(confirm("Excluir postagem?")) { await deleteDoc(doc(db, "posts", pid)); const el = document.querySelector(`.post[data-pid="${CSS.escape(pid)}"]`); if (el) el.remove(); } };


// --- OUTRAS FUNÇÕES ---
window.mudarOrdenacao = (ordem) => {
    ordenacaoAtual = ordem;
    if(document.getElementById('jutsus').classList.contains('active')) { carregarMeusJutsus(currentUserData.meusJutsus); carregarLoja(); }
    if(document.getElementById('ferramentas').classList.contains('active')) carregarLojaFerramentas();
    if(document.getElementById('loja').classList.contains('active')) carregarLojaItens();
};
function aplicarOrdenacao(lista, ordem) {
    const novaLista = [...lista];
    if (ordem === 'menor_valor') return novaLista.sort((a, b) => (a.preco || 0) - (b.preco || 0));
    else if (ordem === 'maior_valor') return novaLista.sort((a, b) => (b.preco || 0) - (a.preco || 0));
    else if (ordem === 'alfabetica') return novaLista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
    return novaLista;
}
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
function getXpNecessario(nivel) {
    if(globalXpTable.length > 0 && nivel <= globalXpTable.length) return globalXpTable[nivel - 1];
    return 300;
}
async function carregarConfiguracoes() { try { const s = await getDoc(doc(db, "game_config", "sistema_nivel")); if(s.exists()) globalXpTable = s.data().tabela_xp || []; } catch(e) {} }
async function carregarCacheItens() {
    try {
        const s1 = await lerColecao("itens"); s1.forEach(d => globalItensMap[d.id] = { ...d.data(), type: 'item' });
        const s2 = await lerColecao("ferramentas"); s2.forEach(d => globalItensMap[d.id] = { ...d.data(), type: 'tool' });
    } catch(e) {}
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
    let porcentagem = 0;
    if(xpMeta > 0) porcentagem = Math.min((xpAtual / xpMeta) * 100, 100);
    document.getElementById('level-display').innerText = "Nível " + nivel;
    document.getElementById('xp-text-display').innerText = `${xpAtual} / ${xpMeta} XP`;
    document.getElementById('xp-bar').style.width = porcentagem + "%";
    renderizarIcones(dados.elementos || [], 'dash-elementos', ELEMENTOS_ICONS, 'Naturezas de Chakra');
    renderizarIcones(dados.kekkei_genkai || [], 'dash-kekkei', KEKKEI_ICONS, 'Kekkei Genkai');
    renderizarIcones(dados.kekkei_moura || [], 'dash-moura', KEKKEI_MOURA_ICONS, 'Kekkei Moura');
    renderizarIcones(dados.kekkei_touta || [], 'dash-touta', KEKKEI_TOUTA_ICONS, 'Kekkei Touta');
    renderizarIcones(dados.bijuus || [], 'dash-bijuu', BIJUU_ICONS, 'Bijuu');
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    set('dash-nivel', nivel); set('dash-cargo', dados.cargo||"Genin"); set('dash-patente', dados.patente||"Genin"); 
    set('dash-rank', dados.rank||"E"); set('dash-speed-rank', dados.speed_rank ?? 1); set('dash-reacao', dados.reacao ?? 1); set('dash-tipo', dados.tipo||"Normal"); 
    set('dash-ryos', formatarNum(dados.ryos));
    set('dash-jutsus', (dados.meusJutsus || []).length); 
    let totalItems = 0, totalTools = 0;
    if(dados.inventario) { for(let id in dados.inventario) { if(globalItensMap[id]) { if(globalItensMap[id].type === 'tool') totalTools += dados.inventario[id]; else totalItems += dados.inventario[id]; } } }
    set('dash-tools', totalTools); set('dash-items', totalItems);
    set('dash-wins', dados.vitorias||0); set('dash-derrotas', dados.derrotas||0); set('dash-draws', dados.empates||0);
    set('dash-vida', dados.vida ?? 100); set('dash-sanidade', dados.sanidade ?? 100);
    set('dash-chakra', dados.chakra ?? 100); set('dash-stamina', dados.stamina ?? 100); set('dash-controle', dados.controle_chakra||"Baixo");
    set('dash-forca', dados.forca||10); set('dash-defesa', dados.defesa||10); set('dash-constituicao', dados.constituicao||10);
    set('dash-destreza', dados.destreza||10); set('dash-intelecto', dados.intelecto||10); set('dash-agilidade', dados.agilidade||10); set('dash-velocidade', dados.velocidade||10);

    // --- Cabeçalho do painel "Meu Ninja" ---
    const heroImg = document.getElementById('dash-hero-avatar');
    if (heroImg && dados.avatar) heroImg.src = dados.avatar;
    set('dash-hero-nome', dados.nome || dados.apelido || "Ninja");
    set('dash-hero-apelido', dados.apelido || "");

    // --- Barras de vitalidade (atual / máximo) ---
    const barra = (recurso, atual, max) => {
        const m = Number(max) > 0 ? Number(max) : 100;
        const pct = Math.max(0, Math.min(100, ((Number(atual) || 0) / m) * 100));
        set(`dash-max-${recurso}`, m);
        const fill = document.getElementById(`dash-bar-${recurso}`);
        if (fill) {
            fill.style.width = pct + '%';
            fill.parentElement.setAttribute('aria-valuenow', Math.round(pct));
        }
    };
    barra('vida', dados.vida ?? 100, dados.max_vida);
    barra('chakra', dados.chakra ?? 100, dados.max_chakra);
    barra('stamina', dados.stamina ?? 100, dados.max_stamina);
    barra('sanidade', dados.sanidade ?? 100, dados.max_sanidade);
}
function criarLinhaStatusCustom(uid, f, l, a, v, m, c) { 
    const p=Math.min((v/m)*100,100); 
    return `<div class="battle-row"><div class="battle-row-header"><span>${l}</span><span>${a}</span></div><div class="battle-controls"><div class="battle-actions-row"><div class="battle-mini-btn" onclick="alterarStatus('${uid}','${f}',-5)">-5</div><div class="battle-mini-btn" onclick="alterarStatus('${uid}','${f}',-1)">-1</div></div><span class="battle-val">${v} / <span style="cursor:pointer; border-bottom:1px dotted #ccc;" onclick="editarMaximo('${uid}', 'max_${f}')">${m}</span></span><div class="battle-actions-row"><div class="battle-mini-btn" onclick="alterarStatus('${uid}','${f}',1)">+1</div><div class="battle-mini-btn" onclick="alterarStatus('${uid}','${f}',5)">+5</div></div></div><div class="battle-bar-bg"><div class="battle-bar-fill ${c}" style="width:${p}%;"></div><div class="battle-bar-text">${p.toFixed(0)}%</div></div></div>`; 
}
function gerarTagsBonus(d) {
    let html = '';
    const stats = ['hp', 'stamina', 'chakra', 'forca', 'defesa', 'agilidade', 'velocidade', 'intelecto', 'constituicao', 'destreza'];
    stats.forEach(s => { if(d['bonus_'+s]) html += `<span class="stat-tag tag-buff">+${esc(d['bonus_'+s])} ${s.toUpperCase()}</span>`; });
    return html;
}
function criarCard(containerId, dados, id, tipo, clickFn, qtd = null) {
    const c = document.getElementById(containerId); if(!c) return;
    const div = document.createElement('div'); div.className = 'card'; div.onclick = () => clickFn(id, dados);
    let sub = "", extra = "";
    if(tipo === 'jutsu') { sub = "Rank " + dados.rank; const m = (currentUserData.maestrias && currentUserData.maestrias[id]) ? currentUserData.maestrias[id] : 0; extra = `<span class="maestria-display">Maestria: ${esc(m)}</span>`; } 
    else if(tipo === 'ferramenta') sub = dados.dano || "Ferramenta"; else sub = dados.efeito || "Item";
    if(qtd !== null) extra += `<div class="inventory-controls"><span class="qtd-badge">x${qtd}</span><button class="btn-minus" onclick="consumirItem(${jsArg(id)}, ${jsArg(dados.nome)}); event.stopPropagation();">-</button></div>`;
    div.innerHTML = `<img src="${esc(dados.imagem||IMG_PADRAO)}" class="card-img-top"><h4>${esc(dados.nome)}</h4><small>${esc(sub)}</small>${extra}`;
    c.appendChild(div);
}
function criarCardLoja(containerId, dados, id, tipo, buyFn, clickFn) {
    const c = document.getElementById(containerId); 
    if(!c) return;

    const div = document.createElement('div'); 
    div.className = 'card'; 
    
    // Clique no card abre detalhes, exceto se clicar no botão ou input
    div.onclick = (e) => { 
        if(!e.target.classList.contains('buy-btn') && !e.target.classList.contains('qtd-input-square')) {
            clickFn(id, dados); 
        }
    };

    let sub = "", buyControlHTML = "", priceHTML = "";
    const currency = moedaDe(dados) === 'essencia_ninja' ? 'EN' : 'Ryos';
    let finalPrice = precoDe(dados);

    // Lógica de Preço (Promoção ou Normal)
    if (currency === 'Ryos' && finalPrice < numero(dados.preco)) {
        priceHTML = `<p id="price-${id}" class="price-tag"><span style="text-decoration:line-through; color:#999; font-size:0.85em; margin-right:5px;">${formatarNum(dados.preco)}</span><span style="color:var(--primary-color); font-weight:bold;">${formatarNum(finalPrice)} Ryos</span></p>`;
    } else {
        const colorClass = currency === 'EN' ? 'en-price' : '';
        priceHTML = `<p id="price-${id}" class="price-tag ${colorClass}">${formatarNum(finalPrice)} ${currency}</p>`;
    }

    // Subtítulo do Card
    if(tipo === 'jutsu') sub = "Rank " + (dados.rank || 'D'); 
    else if(tipo === 'ferramenta') sub = dados.dano || "Ferramenta"; 
    else sub = dados.efeito || "Item";

    const bonusTags = gerarTagsBonus(dados);
    let isOwned = (tipo === 'jutsu' && currentUserData.meusJutsus && currentUserData.meusJutsus.includes(id));
    const btnClass = currency === 'EN' ? 'buy-btn en-btn' : 'buy-btn';

    // --- LÓGICA DO BOTÃO DE COMPRA (COM BLOQUEIO DE NÍVEL) ---
    if(tipo !== 'jutsu') { 
        // Para itens e ferramentas (compra múltipla)
        buyControlHTML = `
            <div class="qtd-container-square">
                <input type="number" id="qtd-${id}" class="qtd-input-square" value="1" min="1" onclick="event.stopPropagation()">
            </div>
            <button id="btn-buy-${id}" class="${btnClass}" onclick="event.stopPropagation(); comprarMultiplos(${jsArg(id)}, ${Number(finalPrice) || 0}, ${jsArg(dados.nome)}, ${jsArg(tipo)}, ${jsArg('qtd-' + id)}, ${jsArg(currency)})">Comprar x1</button>`; 
    } else { 
        // Para Jutsus (Verificação de Posse e Nível)
        if (!isOwned && window.temPremio('Jutsu Rank B') && jutsuResgatavel(id, dados)) {
            buyControlHTML = `<button class="buy-btn btn-resgatar" onclick="event.stopPropagation(); window.resgatarPremio('Jutsu Rank B', { tipo: 'jutsu', id: ${jsArg(id)} }, ${jsArg(dados.nome)})">🎁 Resgatar (prêmio)</button>`;
        } else if (isOwned) {
            buyControlHTML = `<button class="buy-btn" disabled>Adquirido</button>`;
        } else if (dados.bloqueadoPorNivel) {
            // Botão cinza e bloqueado se o nível for baixo
            buyControlHTML = `<button class="buy-btn" disabled style="background:#bdc3c7; cursor:not-allowed;"><i class="fa-solid fa-lock"></i> Nv. ${esc(dados.requisito || 0)}</button>`;
        } else {
            // Botão normal de compra
            buyControlHTML = `<button class="${btnClass}" onclick="event.stopPropagation(); comprarJutsu(${jsArg(id)}, ${Number(finalPrice) || 0}, ${jsArg(dados.nome)}, ${jsArg(currency)})">Comprar</button>`; 
        }
    }

    // Ferramenta/item marcado como prêmio da roleta: botão extra de resgate
    if (tipo !== 'jutsu' && dados.premio_roleta && window.temPremio(dados.premio_roleta)) {
        const colecao = tipo === 'ferramenta' ? 'ferramentas' : 'itens';
        buyControlHTML += `<button class="buy-btn btn-resgatar" onclick="event.stopPropagation(); window.resgatarPremio(${jsArg(dados.premio_roleta)}, { tipo: ${jsArg(colecao)}, id: ${jsArg(id)} }, ${jsArg(dados.nome)})">🎁 Resgatar (${esc(dados.premio_roleta)})</button>`;
    }
    div.innerHTML = `
        <img src="${esc(dados.imagem || IMG_PADRAO)}" class="card-img-top">
        <h4>${esc(dados.nome)}</h4>
        <small>${esc(sub)}</small>
        <div class="stats-row">${bonusTags}</div>
        ${priceHTML}
        ${buyControlHTML}
    `;

    c.appendChild(div);

    // Listener para atualizar preço ao mudar quantidade (apenas para ferramentas/itens)
    if(tipo !== 'jutsu') { 
        const inp = document.getElementById(`qtd-${id}`); 
        if(inp) {
            inp.addEventListener('input', (e) => { 
                let q = parseInt(e.target.value) || 1; 
                const btnBuy = document.getElementById(`btn-buy-${id}`);
                if(btnBuy) btnBuy.innerText = `Comprar x${q}`; 
                
                const priceTag = document.getElementById(`price-${id}`);
                if(priceTag) {
                    if (currency === 'Ryos' && finalPrice < numero(dados.preco)) {
                        priceTag.innerHTML = `<span style="text-decoration:line-through; color:#999; font-size:0.85em; margin-right:5px;">${formatarNum(dados.preco * q)}</span><span style="color:var(--primary-color); font-weight:bold;">${formatarNum(finalPrice * q)} Ryos</span>`;
                    } else {
                        priceTag.innerText = `${formatarNum(finalPrice * q)} ${currency}`; 
                    }
                }
            }); 
        }
    }
}

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
                // custo da arena: usa o valor próprio do jogador, ou o chakra/stamina dele se forem números
                if (p.custo_chakra !== undefined) dadosFinais.custo_chakra = p.custo_chakra;
                else if (p.chakra !== undefined && dadosFinais.custo_chakra !== undefined && Number.isFinite(Number(p.chakra))) dadosFinais.custo_chakra = Math.abs(Number(p.chakra));
                if (p.custo_stamina !== undefined) dadosFinais.custo_stamina = p.custo_stamina;
                else if (p.stamina !== undefined && dadosFinais.custo_stamina !== undefined && Number.isFinite(Number(p.stamina))) dadosFinais.custo_stamina = Math.abs(Number(p.stamina));
                if (p.dano !== undefined) dadosFinais.dano = p.dano;
                if (p.descricao !== undefined) dadosFinais.descricao = p.descricao;
            }
        }
    } catch (err) { return dadosJutsu; }
    return dadosFinais;
}

async function carregarLoja() {
    const c = document.getElementById('loja-jutsus-grid'); 
    if (!c) return;
    
    try {
        c.innerHTML = '<p style="color:#777;">Invocando pergaminhos...</p>';
        if (!currentUserData) return;

        // Dados para comparação (sempre em minúsculas)
        const nivelNinja = currentUserData.nivel || 1;
        const nomePlayer = String(currentUserData.nome || "").trim().toLowerCase();
        const apelidoPlayer = String(currentUserData.apelido || "").trim().toLowerCase();
        const isAdmin = auth.currentUser?.email === "admin@rpgnaruto.com";

        const snap = await lerColecao("jutsus");
        let lista = [];

        snap.forEach(d => {
            try {
                let i = d.data();
                i = aplicarEscalaPersonalizada(i); // Mantém sua lógica de escala
                
                let restritos = i.restrito_a;
                let permiteAcesso = true; 
                
                // Validação de Restrição por Nome (Array ou String antiga)
                if (restritos && restritos.length > 0 && !isAdmin) {
                    let listaCheck = [];
                    
                    if (Array.isArray(restritos)) {
                        // Converte os nomes do Array para minúsculas apenas para comparar
                        listaCheck = restritos.map(n => String(n).toLowerCase());
                    } else if (typeof restritos === 'string') {
                        listaCheck = restritos.split(',').map(n => n.trim().toLowerCase());
                    }

                    const temAcesso = listaCheck.includes(nomePlayer) || listaCheck.includes(apelidoPlayer);
                    if (!temAcesso) permiteAcesso = false;
                }

                if (permiteAcesso) {
                    // Verifica se o nível do ninja é suficiente
                    const requisitoNivel = Number(i.requisito) || 0;
                    i.bloqueadoPorNivel = nivelNinja < requisitoNivel;
                    
                    lista.push({ id: d.id, ...i });
                }

            } catch(erroItem) {
                console.error("Erro no processamento do jutsu:", d.id, erroItem);
            }
        });

        c.innerHTML = '';
        lista = aplicarOrdenacao(lista, ordenacaoAtual);
        
        if (lista.length === 0) {
            c.innerHTML = '<p style="color:#777;">Nenhum jutsu disponível para você.</p>';
        } else {
            lista.forEach(item => {
                criarCardLoja('loja-jutsus-grid', item, item.id, 'jutsu', null, (id, dados) => {
                    if (typeof window.verDetalhesJutsu === 'function') window.verDetalhesJutsu(id, dados);
                });
            });
        }

    } catch (erroGeral) {
        console.error("Erro crítico na loja:", erroGeral);
        c.innerHTML = '<p style="color:red;">Falha ao carregar a loja.</p>';
    }
}

async function carregarMeusJutsus(l) {
    try {
        if (!currentUserData) return;
        const c = document.getElementById('meus-jutsus-grid'); if(!c) return; c.innerHTML = ''; l = (l || []).filter(id => id); 
        if(l.length === 0) { c.innerHTML = '<p>Nenhum jutsu aprendido.</p>'; return; }
        const promises = l.map(async (id) => { try { return await lerDoCatalogo("jutsus", id); } catch(e) { return null; } });
        const resultados = await Promise.all(promises);
        let lista = resultados.filter(item => item !== null);
        lista = aplicarOrdenacao(lista, ordenacaoAtual);
        lista.forEach(item => criarCard('meus-jutsus-grid', item, item.id, 'jutsu', (id, i) => verDetalhesJutsu(id, i)));
    } catch(e) {}
}
async function carregarLojaFerramentas() {
    const c = document.getElementById('loja-ferramentas-grid'); 
    if (!c) return;
    
    try {
        c.innerHTML = '<p style="color:#777;">Abrindo o arsenal...</p>';
        if (!currentUserData) return;

        const nivelNinja = currentUserData.nivel || 1;
        const nomePlayer = String(currentUserData.nome || "").trim().toLowerCase();
        const apelidoPlayer = String(currentUserData.apelido || "").trim().toLowerCase();
        const isAdmin = auth.currentUser?.email === "admin@rpgnaruto.com";

        const snap = await lerColecao("ferramentas");
        let lista = [];

        snap.forEach(d => {
            try {
                let i = d.data();
                let restritos = i.restrito_a;
                let permiteAcesso = true; 
                
                // Validação de Restrição (Array de nomes)
                if (restritos && restritos.length > 0 && !isAdmin) {
                    const listaCheck = restritos.map(n => String(n).toLowerCase());
                    const temAcesso = listaCheck.includes(nomePlayer) || listaCheck.includes(apelidoPlayer);
                    if (!temAcesso) permiteAcesso = false;
                }

                if (permiteAcesso) {
                    // Validação de Nível para compra
                    const requisitoNivel = Number(i.requisito) || 0;
                    i.bloqueadoPorNivel = nivelNinja < requisitoNivel;
                    
                    lista.push({ id: d.id, ...i });
                }
            } catch(e) { console.error("Erro na ferramenta:", d.id); }
        });

        c.innerHTML = '';
        if (lista.length === 0) {
            c.innerHTML = '<p style="color:#777;">Arsenal vazio no momento.</p>';
        } else {
            lista.forEach(item => {
                // Usamos o tipo 'ferramenta' para o card carregar os campos certos (dano, etc)
                criarCardLoja('loja-ferramentas-grid', item, item.id, 'ferramenta', null, (id, dados) => {
                    if (typeof window.verDetalhesFerramenta === 'function') window.verDetalhesFerramenta(id, dados);
                });
            });
        }
    } catch (err) {
        c.innerHTML = '<p style="color:red;">Erro ao carregar ferramentas.</p>';
    }
}
async function carregarLojaItens() {
    try {
        if (!currentUserData) return;
        const c = document.getElementById('loja-itens-grid'); if(!c) return; c.innerHTML = '';
        const s = await lerColecao("itens");
        let lista = [];
        s.forEach(d => { 
            const i = d.data(); let ok=false; 
            if(!i.vila || i.vila==='Global') ok=true; 
            else if(Array.isArray(i.vila)){if(i.vila.includes(vilaAtual)||i.vila.includes('Global')) ok=true;} 
            else if(i.vila===vilaAtual) ok=true; 
            if(i.tipo===lojaAtual && ok) lista.push({id:d.id, ...i}); 
        });
        if (lista.length === 0) { c.innerHTML = '<p>Nenhum item.</p>'; return; }
        lista = aplicarOrdenacao(lista, ordenacaoAtual);
        lista.forEach(item => criarCardLoja('loja-itens-grid', item, item.id, 'item', null, (id, i) => verDetalhesItem(id, i)));
    } catch(e) {}
}
async function carregarInventario() {
    try {
        if (!currentUserData) return;
        const c = document.getElementById('inventario-grid'); if(!c) return; c.innerHTML = '';
        const inv = currentUserData.inventario || {}; const keys = Object.keys(inv).filter(k => inv[k] > 0);
        if(keys.length === 0) { c.innerHTML = '<p>Mochila vazia.</p>'; return; }
        for (const id of keys) {
            let info = globalItensMap[id];
            if (!info) {
                try {
                    const i1 = await lerDoCatalogo("itens", id);
                    if (i1) { info = { ...i1, type: 'item' }; globalItensMap[id] = info; }
                    else {
                        const i2 = await lerDoCatalogo("ferramentas", id);
                        if (i2) { info = { ...i2, type: 'tool' }; globalItensMap[id] = info; }
                    }
                } catch(e){}
            }
            if(info) {
                criarCard('inventario-grid', info, id, info.type, (id, d) => {
                   if(info.type === 'tool') verDetalhesFerramenta(id, d); else verDetalhesItem(id, d);
                }, inv[id]);
            }
        }
    } catch(e) {}
}
async function carregarMentorias() {
    const cTurno = document.getElementById('grid-mentorias-turno'); const cCards = document.getElementById('grid-mentorias-cards');
    if (!cTurno || !cCards) return;
    cTurno.innerHTML = '<p>Carregando...</p>'; cCards.innerHTML = '<p>Carregando...</p>';
    if(auth.currentUser.email === "admin@rpgnaruto.com") document.getElementById('admin-mentor-controls').style.display = 'block';
    try {
        const s = await lerColecao("mentores");
        cTurno.innerHTML = ''; cCards.innerHTML = ''; globalMentores = {};
        if (s.empty) { cTurno.innerHTML = '<p>Vazio</p>'; cCards.innerHTML = '<p>Vazio</p>'; return; }
        s.forEach(d => {
            const m = d.data(); globalMentores[d.id] = m;
            const card = document.createElement('div'); card.className = 'card jutsu-card-click';
            card.onclick = function() { window.abrirModalMentoria(d.id); };
            card.innerHTML = `<img src="${esc(m.imagem || IMG_PADRAO)}" class="card-img-top"><h4>${esc(m.nome)}</h4><small>Ver ensinos</small>`;
            if ((m.categoria || "").includes('card')) cCards.appendChild(card); else cTurno.appendChild(card);
        });
    } catch (e) {}
}
window.abrirModalNovoMentor = () => { document.getElementById('novoMentorModal').style.display = 'flex'; };
window.toggleMentorPlayerSelect = () => {
    const isPlayer = document.getElementById('check-is-player').checked;
    const select = document.getElementById('mentor-player-select');
    if (isPlayer) {
        select.style.display = 'block';
        getDocs(collection(db, "users")).then(snap => {
            select.innerHTML = '<option value="">Selecione um Jogador</option>';
            snap.forEach(doc => { const u = doc.data(); const opt = document.createElement('option'); opt.value = doc.id; opt.text = `${u.nome} (${u.apelido})`; select.appendChild(opt); });
        });
    } else select.style.display = 'none';
};
window.handleMentorImage = async (e) => { if(e.target.files[0]) { newMentorImageBase64 = await comprimirImagem(e.target.files[0]); document.getElementById('new-mentor-preview').innerHTML = `<img src="${newMentorImageBase64}" style="width:100px; height:100px; object-fit:cover;">`; } };
window.salvarNovoMentor = async () => {
    const nome = document.getElementById('new-mentor-name').value;
    const cat = document.getElementById('new-mentor-category').value;
    if(!nome || !newMentorImageBase64) return alert("Preencha tudo");
    let md = { nome: nome, categoria: cat, imagem: newMentorImageBase64, ensinos: [] };
    if (document.getElementById('check-is-player').checked) md.uid_player = document.getElementById('mentor-player-select').value;
    await addDoc(collection(db, "mentores"), md);
    document.getElementById('novoMentorModal').style.display = 'none';
    carregarMentorias();
};



async function carregarPersonagens() {
    const c = document.getElementById('directory-grid');
    if (!c) return;
    
    try {
        c.innerHTML = '<p style="color:#777;">Localizando ninjas...</p>';
        const s = await lerColecao("users");
        c.innerHTML = '';

        // Verifica se o usuário logado é Admin (Kage)
        const isAdmin = auth.currentUser && ["admin@rpgnaruto.com", "conselheiro@rpgnaruto.com"].includes(auth.currentUser.email);

        s.forEach(d => {
            const u = d.data();
            const div = document.createElement('div');
            div.className = 'card';
            div.onclick = () => window.verPerfil(d.id);
            
            const ryos = u.ryos || 0;
            const en = u.essencia_ninja || 0;

            // Lógica do Status Online
            const isOnline = u.isOnline === true;
            const corBolinha = isOnline ? '#2ecc71' : '#ccc'; 
            const brilhoBolinha = isOnline ? 'box-shadow: 0 0 5px #2ecc71;' : '';

            // Verifica se o alvo está online E se não é o próprio usuário logado
            const podeDesafiar = isOnline && (d.id !== auth.currentUser.uid);

            // ÚNICA DECLARAÇÃO dos botões
            const botoesHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 15px;">
                    ${podeDesafiar ? `
                    <button onclick="event.stopPropagation(); window.enviarDesafio(${jsArg(d.id)}, ${jsArg(u.nome || u.apelido || "Ninja")})" class="mission-btn-start" style="background: #e67e22; width: 100%; border: none; color: white;">
                        <i class="fa-solid fa-khanda"></i> Desafiar
                    </button>
                    ` : ''}
                    <button onclick="event.stopPropagation(); abrirModalPresentear(${jsArg(d.id)})" class="mission-btn-start" style="background: var(--primary-color); color: white; width: 100%; border: none;">
                        <i class="fa-solid fa-gift"></i> Presentear
                    </button>
                    <button onclick="event.stopPropagation(); abrirChat(${jsArg(d.id)}, ${jsArg(u.nome || u.apelido || "Ninja")}, ${isOnline})" class="mission-btn-start" style="background: #3498db; width: 100%; border: none; color: white;">
                        <i class="fa-solid fa-comment-dots"></i> Conversar
                    </button>
                    ${isAdmin ? `
                    <button onclick="event.stopPropagation(); window.abrirPaginaPerfil(${jsArg(d.id)})" class="mission-btn-start" style="background: #e74c3c; width: 100%; border: none; color: white;">
                        <i class="fa-solid fa-pen"></i> Editar Ficha
                    </button>
                    ` : ''}
                </div>
            `;

            
            // Injeta o conteúdo no card
            div.innerHTML = `
                <img src="${esc(u.avatar || IMG_PADRAO)}" class="card-img-top">
                <h4 style="display: flex; justify-content: center; align-items: center; gap: 6px;">
                    <span style="display: inline-block; width: 10px; height: 10px; background: ${corBolinha}; border-radius: 50%; ${brilhoBolinha}"></span>
                    ${esc(u.nome || "Ninja")}
                </h4>
                <p style="font-size:0.85em; color:var(--primary-color); font-weight:600; margin-top:5px; margin-bottom:8px;">
                    ${esc(u.apelido || "Sem clã")}
                </p>
                <div style="font-size: 0.8rem; font-weight: bold; display: flex; justify-content: center; gap: 8px; align-items: center;">
                    <span style="color: #f1c40f;"><i class="fa-solid fa-coins"></i> ${formatarNum(ryos)}</span>
                    <span style="color: #777;">|</span>
                    <span style="color: #3498db;"><i class="fa-regular fa-star"></i> ${formatarNum(en)} EN</span>
                </div>
                ${botoesHTML} 
            `;
            c.appendChild(div);
        });

        if(c.innerHTML === '') c.innerHTML = '<p>Nenhum ninja encontrado.</p>';
    } catch (e) {
        console.error("Erro ao carregar diretório:", e);
        c.innerHTML = '<p>Erro ao carregar lista.</p>';
    }
}


// =====================================================================
//  ARENA v2 — desafios, batalha por turnos e resultado
//  As regras ficam em arena-regras.js; aqui fica a tela e o banco.
// =====================================================================

const NOMES_MODO = { amistoso: 'Amistoso', rankeada: 'Rankeada', competitivo: 'Competitivo' };
const NOMES_MOEDA = { ryos: 'Ryos', essencia_ninja: 'EN', xp: 'XP' };
const arena = {
    id: null, dados: null, unsub: null, tick: null, batida: null,
    jutsus: [], offset: 0, ultimoTempoEsgotado: 0, ultimaPresenca: 0,
    enviando: false, posLutaFeito: {}, ataqueEmConfig: null
};
const agoraArena = () => Date.now() + arena.offset;
const minhaUid = () => auth.currentUser && auth.currentUser.uid;
// Quem está "no centro" da tela: o próprio jogador, ou (para quem assiste) o lado escolhido
const uidVisao = () => arena.espectador ? (arena.ladoVisao || arena.dados?.desafianteId) : minhaUid();
const ehKage = () => !!auth.currentUser && ['admin@rpgnaruto.com', 'conselheiro@rpgnaruto.com'].includes(auth.currentUser.email);

const descricaoAposta = (d) => d && d.modo === 'competitivo' && d.aposta ? `${formatarNum(d.aposta.valor)} ${NOMES_MOEDA[d.aposta.moeda] || ''}` : '';
const batalhaAtiva = (d) => d && d.status === 'aceito' && d.estado && d.estado.status === 'em_andamento';
const ehLegado = (d) => d && d.status === 'aceito' && !d.estado;

// ---------------- 1. Criar desafio (escolha do modo) ----------------
let alvoDesafio = null;
window.enviarDesafio = (alvoId, alvoNome) => {
    if (!auth.currentUser) return;
    if (alvoId === minhaUid()) return alert("Você não pode desafiar a si mesmo!");
    alvoDesafio = { id: alvoId, nome: alvoNome };
    document.getElementById('novo-desafio-alvo').innerText = alvoNome;
    document.querySelector('input[name="modo-desafio"][value="amistoso"]').checked = true;
    document.getElementById('desafio-valor').value = '';
    window.atualizarFormDesafio();
    document.getElementById('modal-novo-desafio').style.display = 'flex';
};
window.atualizarFormDesafio = () => {
    const modo = document.querySelector('input[name="modo-desafio"]:checked').value;
    document.getElementById('desafio-competitivo').style.display = modo === 'competitivo' ? 'block' : 'none';
    const moeda = document.getElementById('desafio-moeda').value;
    const saldo = moeda === 'xp' ? xpApostavel(currentUserData.xp) : (currentUserData[moeda] || 0);
    document.getElementById('desafio-saldo').innerText = moeda === 'xp'
        ? `Você pode apostar até ${formatarNum(saldo)} XP (precisa sobrar ${ARENA.xpMinimoNaBarra} XP na barra do nível).`
        : `Seu saldo: ${formatarNum(saldo)} ${NOMES_MOEDA[moeda]}.`;
};
window.confirmarNovoDesafio = async () => {
    const modo = document.querySelector('input[name="modo-desafio"]:checked').value;
    const eu = minhaUid();
    let aposta = null;
    if (modo === 'competitivo') {
        const moeda = document.getElementById('desafio-moeda').value;
        const valor = Math.floor(Number(document.getElementById('desafio-valor').value));
        const limite = moeda === 'xp' ? xpApostavel(currentUserData.xp) : (currentUserData[moeda] || 0);
        if (!valor || valor < 1) return alert("Informe quanto vale a luta.");
        if (valor > limite) return alert(`Você só pode apostar até ${formatarNum(limite)} ${NOMES_MOEDA[moeda]}.`);
        aposta = { moeda, valor };
    }
    const btn = document.getElementById('btn-confirmar-desafio');
    btn.disabled = true;
    try {
        // Um ninja só luta uma batalha por vez
        const minhas = await listarMinhasBatalhas();
        if (minhas.some(b => batalhaAtiva(b.dados))) { alert("Você já tem uma batalha em andamento. Termine-a antes de desafiar alguém."); return; }

        const ref = doc(collection(db, "desafios_batalha"));
        const dados = {
            desafianteId: eu, desafianteNome: currentUserData.nome || currentUserData.apelido || "Ninja",
            desafiadoId: alvoDesafio.id, desafiadoNome: alvoDesafio.nome,
            status: 'pendente', modo, aposta, cofre: {}, criadoEm: Date.now(), timestamp: serverTimestamp()
        };
        if (aposta) {
            // A parte de quem desafia já vai para o cofre da luta
            dados.cofre = { [eu]: aposta.valor };
            const lote = writeBatch(db);
            lote.set(ref, dados);
            lote.update(doc(db, "users", eu), { [aposta.moeda]: increment(-aposta.valor), ultimoCofre: ref.id });
            await lote.commit();
        } else {
            await setDoc(ref, dados);
        }
        document.getElementById('modal-novo-desafio').style.display = 'none';
        alert(`Pergaminho de desafio enviado para ${alvoDesafio.nome}! Aguardando resposta...`);
        escutarMeuConvite(ref.id);
    } catch (e) {
        console.error("Erro ao enviar desafio", e);
        alert("O chakra falhou ao enviar o convite.");
    } finally { btn.disabled = false; }
};

// Quem desafiou acompanha a resposta do convite
let unsubMeuConvite = null;
function escutarMeuConvite(id) {
    if (unsubMeuConvite) unsubMeuConvite();
    unsubMeuConvite = onSnapshot(doc(db, "desafios_batalha", id), (s) => {
        if (!s.exists()) return;
        const d = s.data();
        if (d.status === 'aceito' && d.estado) {
            unsubMeuConvite(); unsubMeuConvite = null;
            alert(`⚔️ ${d.desafiadoNome} aceitou o desafio! A batalha vai começar!`);
            window.abrirBatalha(id);
        } else if (d.status === 'recusado') {
            unsubMeuConvite(); unsubMeuConvite = null;
            alert(`❌ ${d.desafiadoNome} recusou o seu desafio.`);
            devolverMeuCofre(id, d);
        }
    });
}

// ---------------- 2. Receber convites ----------------
window.escutarDesafiosRecebidos = () => {
    if (!auth.currentUser) return;
    const q = query(collection(db, "desafios_batalha"), where("desafiadoId", "==", minhaUid()), where("status", "==", "pendente"));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type !== "added") return;
            mostrarConvite(change.doc.id, change.doc.data());
        });
    });
};
function mostrarConvite(id, convite) {
    const modo = convite.modo || 'amistoso';
    let texto = `<strong>${esc(convite.desafianteNome)}</strong> quer te enfrentar em um duelo <strong>${NOMES_MODO[modo]}</strong>.`;
    let podeAceitar = true;
    if (convite.torneio) texto += `<br>🏆 Partida do torneio <strong>${esc(convite.torneio.nome || '')}</strong>.`;
    if (modo === 'rankeada') texto += `<br><small>Vale pontos de Rankeada (+${ARENA.pontosVitoria} para quem vencer, −${ARENA.pontosDerrota} para quem perder).</small>`;
    if (modo === 'competitivo' && convite.aposta) {
        const { moeda, valor } = convite.aposta;
        const limite = moeda === 'xp' ? xpApostavel(currentUserData?.xp) : (currentUserData?.[moeda] || 0);
        texto += `<br><br>💰 Valendo <strong>${formatarNum(valor)} ${NOMES_MOEDA[moeda]}</strong> de cada um. Quem vencer leva <strong>${formatarNum(valor * 2)}</strong>.`;
        if (limite < valor) { podeAceitar = false; texto += `<br><span style="color:var(--danger);">Você não tem saldo suficiente para aceitar.</span>`; }
    }
    texto += '<br><br>Você está pronto para a batalha?';
    document.getElementById('texto-desafio').innerHTML = texto;
    document.getElementById('modal-desafio').style.display = 'flex';
    const btnAceitar = document.getElementById('btn-aceitar-desafio');
    btnAceitar.style.display = podeAceitar ? '' : 'none';
    btnAceitar.onclick = async () => {
        btnAceitar.disabled = true;
        try { await aceitarDesafio(id); document.getElementById('modal-desafio').style.display = 'none'; }
        catch (e) { console.error(e); alert(e.message || "Não foi possível aceitar o desafio."); }
        finally { btnAceitar.disabled = false; }
    };
    document.getElementById('btn-recusar-desafio').onclick = async () => {
        document.getElementById('modal-desafio').style.display = 'none';
        try { await updateDoc(doc(db, "desafios_batalha", id), { status: 'recusado' }); } catch (e) { console.error(e); }
    };
}

async function aceitarDesafio(id) {
    const eu = minhaUid();
    const minhas = await listarMinhasBatalhas();
    if (minhas.some(b => batalhaAtiva(b.dados))) throw new Error("Você já tem uma batalha em andamento. Termine-a antes de aceitar outra.");
    const ref = doc(db, "desafios_batalha", id);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().status !== 'pendente') throw new Error("Esse desafio não está mais disponível.");
    const d = snap.data();
    const fichaDesafiante = (await getDoc(doc(db, "users", d.desafianteId))).data() || {};
    const minhaFicha = (await getDoc(doc(db, "users", eu))).data() || {};
    const { estado, eventos } = criarEstadoInicial(fichaDesafiante, d.desafianteId, minhaFicha, eu, agoraArena());
    const atualizacao = {
        status: 'aceito', estado, iniciadaEm: Date.now(), atualizadoEm: serverTimestamp(),
        historico: eventos.map((e, i) => ({ ...e, t: Date.now(), n: i + 1 })), histN: eventos.length
    };
    if (d.modo === 'competitivo' && d.aposta) {
        const { moeda, valor } = d.aposta;
        const limite = moeda === 'xp' ? xpApostavel(minhaFicha.xp) : (minhaFicha[moeda] || 0);
        if (limite < valor) throw new Error("Saldo insuficiente para aceitar este desafio.");
        // A parte de quem aceita também vai para o cofre
        atualizacao[`cofre.${eu}`] = valor;
        const lote = writeBatch(db);
        lote.update(ref, atualizacao);
        lote.update(doc(db, "users", eu), { [moeda]: increment(-valor), ultimoCofre: id });
        await lote.commit();
    } else {
        await updateDoc(ref, atualizacao);
    }
    window.abrirBatalha(id);
}

// ---------------- 3. Lobby: minhas batalhas e convites ----------------
async function listarMinhasBatalhas() {
    const eu = minhaUid();
    const [a, b] = await Promise.all([
        getDocs(query(collection(db, "desafios_batalha"), where("desafianteId", "==", eu))),
        getDocs(query(collection(db, "desafios_batalha"), where("desafiadoId", "==", eu)))
    ]);
    return [...a.docs, ...b.docs].map(s => ({ id: s.id, dados: s.data() }));
}

window.carregarLobbyArena = async () => {
    const lista = document.getElementById('arena-lobby-lista');
    if (!lista || !auth.currentUser) return;
    if (arena.id) return; // já está numa luta aberta
    lista.innerHTML = '<p class="arena-lobby-vazio">Procurando batalhas...</p>';
    try {
        const eu = minhaUid();
        const todas = await listarMinhasBatalhas();
        // Pendências de cofre (convites recusados/cancelados, lutas terminadas)
        for (const b of todas) {
            if (['recusado', 'cancelado', 'anulada'].includes(b.dados.status)) devolverMeuCofre(b.id, b.dados);
            if (b.dados.status === 'finalizada' || b.dados.estado?.status === 'finalizada') posLuta(b.id, b.dados);
        }
        const ativas = todas.filter(b => batalhaAtiva(b.dados));
        const enviados = todas.filter(b => b.dados.status === 'pendente' && b.dados.desafianteId === eu);
        const legado = todas.filter(b => ehLegado(b.dados));
        lista.innerHTML = '';
        if (!ativas.length && !enviados.length && !legado.length) {
            lista.innerHTML = '<p class="arena-lobby-vazio">Nenhuma batalha em andamento. Desafie um ninja na aba <strong>Personagens</strong>!</p>';
        }
        ativas.forEach(b => {
            const adv = b.dados.desafianteId === eu ? b.dados.desafiadoNome : b.dados.desafianteNome;
            const minhaVez = b.dados.estado.vez === eu;
            lista.appendChild(itemLobby(`⚔️ Batalha contra <strong>${esc(adv)}</strong>`, `${NOMES_MODO[b.dados.modo || 'amistoso']}${descricaoAposta(b.dados) ? ' · ' + descricaoAposta(b.dados) : ''} · Turno ${b.dados.estado.turno}${minhaVez ? ' · <strong>sua vez</strong>' : ''}`,
                'Continuar', () => window.abrirBatalha(b.id)));
        });
        enviados.forEach(b => lista.appendChild(itemLobby(`📜 Convite para <strong>${esc(b.dados.desafiadoNome)}</strong>`, `${NOMES_MODO[b.dados.modo || 'amistoso']}${descricaoAposta(b.dados) ? ' · ' + descricaoAposta(b.dados) : ''} · aguardando resposta`,
            'Cancelar', async () => {
                if (!confirm("Cancelar este convite?")) return;
                await updateDoc(doc(db, "desafios_batalha", b.id), { status: 'cancelado' });
                await devolverMeuCofre(b.id, { ...b.dados, status: 'cancelado' });
                window.carregarLobbyArena();
            }, true)));
        legado.forEach(b => lista.appendChild(itemLobby(`🕰️ Batalha do sistema antigo`, 'Essa luta foi criada antes da nova arena e não pode ser continuada.',
            'Encerrar', async () => { await updateDoc(doc(db, "desafios_batalha", b.id), { status: 'cancelado' }); window.carregarLobbyArena(); }, true)));
        atualizarIndicadorArena(ativas.length > 0);
        if (enviados.length) escutarMeuConvite(enviados[0].id);
        renderListaAoVivo();
        window.carregarTorneios();
    } catch (e) {
        console.error(e);
        lista.innerHTML = '<p class="arena-lobby-vazio">Não foi possível carregar suas batalhas.</p>';
    }
};
function itemLobby(titulo, sub, rotulo, acao, secundario = false) {
    const div = document.createElement('div');
    div.className = 'arena-lobby-item';
    div.innerHTML = `<div><div class="arena-lobby-titulo">${titulo}</div><div class="arena-lobby-sub">${sub}</div></div>`;
    const b = document.createElement('button');
    b.className = secundario ? 'btn-arena-sec' : 'btn-post';
    b.textContent = rotulo;
    b.onclick = acao;
    div.appendChild(b);
    return div;
}
function atualizarIndicadorArena(ativa) {
    document.querySelectorAll('#side-btn-batalha, #bottom-btn-batalha').forEach(b => b.classList.toggle('luta-ativa', !!ativa));
}
// Ao entrar no site: avisa se há batalha em andamento (o botão da Arena fica pulsando)
window.verificarBatalhaAtiva = async () => {
    try {
        const todas = await listarMinhasBatalhas();
        atualizarIndicadorArena(todas.some(b => batalhaAtiva(b.dados)));
        for (const b of todas) {
            if (['recusado', 'cancelado', 'anulada'].includes(b.dados.status)) devolverMeuCofre(b.id, b.dados);
            if (b.dados.status === 'finalizada' || b.dados.estado?.status === 'finalizada') posLuta(b.id, b.dados);
            if (b.dados.status === 'pendente' && b.dados.desafianteId === minhaUid()) escutarMeuConvite(b.id);
        }
    } catch (e) { console.error("Erro ao verificar batalhas:", e); }
};

// ---------------- 4. Abrir a batalha ----------------
window.abrirBatalha = async (id) => {
    fecharBatalha(false);
    arena.id = id;
    window.showTab('batalha');
    document.getElementById('arena-waiting').style.display = 'none';
    document.getElementById('arena-container').style.display = 'flex';
    document.getElementById('arena-log').innerHTML = '';
    await carregarJutsusDaArena();
    // Sinal de presença: enquanto o jogador estiver com a arena aberta e visível
    const baterPresenca = () => {
        const naArena = document.getElementById('batalha')?.classList.contains('active') && document.visibilityState === 'visible';
        if (!naArena || !arena.dados || !batalhaAtiva(arena.dados)) return;
        // Pausada: precisa da transação (retomar). Normal: só grava o horário, sem disputar com as jogadas.
        if (arena.dados.estado?.pausada) enviarAcao({ tipo: 'presenca' }, true);
        else updateDoc(doc(db, "desafios_batalha", arena.id), { [`estado.presenca.${minhaUid()}`]: agoraArena() }).catch(() => {});
    };
    arena.unsub = onSnapshot(doc(db, "desafios_batalha", id), (s) => {
        if (!s.exists()) { fecharBatalha(true); return; }
        const d = s.data();
        // Calibra o relógio deste aparelho com o do servidor, usando só a resposta
        // de uma jogada que ESTE aparelho acabou de gravar (o horário ainda é "fresco")
        if (!s.metadata?.hasPendingWrites && arena.gravouEm && Date.now() - arena.gravouEm < 3000
            && d.atualizadoEm && typeof d.atualizadoEm.toMillis === 'function') {
            arena.offset = d.atualizadoEm.toMillis() - arena.gravouEm;
            arena.gravouEm = null;
        }
        const primeiraVez = !arena.dados;
        arena.servidor = d;
        // Enquanto uma jogada própria está a caminho, a tela mostra a versão calculada aqui
        // (não volta para trás); depois segue sempre a versão mais nova do servidor.
        if (primeiraVez || (!arena.pendentes && (d.rev || 0) >= (arena.dados?.rev || 0))) aplicarDoServidor(d, primeiraVez);
        if (primeiraVez) enviarAcao({ tipo: 'presenca' }, true); // avisa logo que voltou (retoma a luta se estava pausada)
    });
    arena.batida = setInterval(baterPresenca, 10000);
    arena.tick = setInterval(tickArena, 500);
    escutarTorcida(id);
};

// =====================================================================
//  ARENA FASE 2 — AO VIVO: plateia, torcida, apostas e anulação pelo Kage
// =====================================================================
const EMOJIS_TORCIDA = ['🔥', '👏', '😱', '💪', '😂', '❤️', '⚡', '🍥'];
const APOSTA_MINIMA = 20;

// Assistir uma luta dos outros (só leitura)
window.assistirBatalha = async (id) => {
    fecharBatalha(false);
    arena.id = id;
    arena.espectador = true;
    arena.jutsus = [];
    window.showTab('batalha');
    document.getElementById('arena-waiting').style.display = 'none';
    document.getElementById('arena-container').style.display = 'flex';
    document.getElementById('arena-log').innerHTML = '';
    arena.unsub = onSnapshot(doc(db, "desafios_batalha", id), (s) => {
        if (!s.exists()) { fecharBatalha(true); return; }
        const d = s.data();
        if (!d.estado) { alert("Essa luta ainda não começou."); fecharBatalha(true); return; }
        const primeiraVez = !arena.dados;
        if (!arena.ladoVisao) arena.ladoVisao = d.desafianteId;
        arena.servidor = d;
        aplicarDoServidor(d, primeiraVez);
    });
    escutarTorcida(id);
    escutarApostas(id);
    marcarPresencaNaPlateia();
    arena.batida = setInterval(marcarPresencaNaPlateia, 20000);
    arena.tick = setInterval(tickArena, 500);
};

function marcarPresencaNaPlateia() {
    if (!arena.espectador || !arena.id || !minhaUid()) return;
    setDoc(doc(db, "desafios_batalha", arena.id, "torcida", minhaUid()), { nome: currentUserData?.nome || 'Ninja', visto: Date.now() }, { merge: true }).catch(() => {});
}

// Torcida: conta quem está assistindo e mostra os emojis em cima do lutador
function escutarTorcida(id) {
    arena.ouvintesPlateia = arena.ouvintesPlateia || [];
    let primeira = true;
    const parar = onSnapshot(collection(db, "desafios_batalha", id, "torcida"), (snap) => {
        const agora = Date.now();
        arena.espectadores = snap.docs.filter(d => agora - numero(d.data().visto) < 45000).length;
        if (!primeira) snap.docChanges().forEach(c => {
            const t = c.doc.data();
            if (c.type !== 'removed' && t.emoji && t.em && t.em !== arena['emojiVisto_' + c.doc.id]) mostrarEmojiTorcida(t.lado, t.emoji, t.nome);
            arena['emojiVisto_' + c.doc.id] = t.em;
        });
        else snap.docs.forEach(d => { arena['emojiVisto_' + d.id] = d.data().em; });
        primeira = false;
        const el = document.querySelector('.arena-assistindo');
        if (el) el.textContent = `👀 ${arena.espectadores} assistindo`;
        else if (arena.dados) renderArena();
    });
    arena.ouvintesPlateia.push(parar);
}
// Os emojis ficam numa camada própria por cima das cartas (as cartas são redesenhadas
// a cada jogada; se o emoji ficasse dentro delas, sumiria na hora)
function mostrarEmojiTorcida(lado, emoji, nome) {
    const cont = document.getElementById('arena-lutadores');
    const quadro = cont?.querySelector(`.arena-lutador[data-uid="${CSS.escape(lado || '')}"]`);
    if (!quadro) return;
    const s = document.createElement('span');
    s.className = 'emoji-torcida';
    s.textContent = emoji;
    s.title = nome ? `${nome} está torcendo` : '';
    s.setAttribute('aria-hidden', 'true');
    s.style.left = (quadro.offsetLeft + quadro.offsetWidth * (0.15 + Math.random() * 0.7)) + 'px';
    s.style.top = (quadro.offsetTop + quadro.offsetHeight * 0.55) + 'px';
    cont.appendChild(s);
    setTimeout(() => s.remove(), animacoesReduzidas() ? 1200 : 1900);
}
window.torcerPor = (lado) => { arena.torcendo = lado; renderArena(); };
window.enviarEmoji = (emoji) => {
    if (!arena.espectador || !arena.id) return;
    if (Date.now() - (arena.ultimoEmoji || 0) < 1500) return;   // sem flood
    arena.ultimoEmoji = Date.now();
    const lado = arena.torcendo || arena.ladoVisao;
    setDoc(doc(db, "desafios_batalha", arena.id, "torcida", minhaUid()), { nome: currentUserData?.nome || 'Ninja', lado, emoji, em: Date.now(), visto: Date.now() }, { merge: true }).catch(e => console.error(e));
};
window.trocarLadoVisao = () => {
    const d = arena.dados; if (!d) return;
    arena.ladoVisao = arena.ladoVisao === d.desafianteId ? d.desafiadoId : d.desafianteId;
    document.getElementById('arena-lutadores').dataset.uids = '';
    document.getElementById('arena-mesa').dataset.chave = '';
    renderArena();
};

// Apostas: bolo de cada lado (líquido) e a minha aposta
function escutarApostas(id) {
    arena.ouvintesPlateia = arena.ouvintesPlateia || [];
    arena.ouvintesPlateia.push(onSnapshot(doc(db, "apostas_totais", id), (s) => { arena.apostasTotais = s.exists() ? s.data() : {}; if (arena.dados) renderArena(); }));
    arena.ouvintesPlateia.push(onSnapshot(doc(db, "desafios_batalha", id, "apostas", minhaUid()), (s) => { arena.minhaAposta = s.exists() ? s.data() : null; if (arena.dados) renderArena(); }));
}
const NOME_MOEDA_APOSTA = { ryos: 'Ryos', essencia_ninja: 'EN' };
function premioDaAposta(ap, d, tot) {
    const r = d.estado?.resultado || {};
    const venc = (d.status === 'anulada' || r.anulada) ? null : (r.vencedor || null);
    const bolo = numero(tot[d.desafianteId]) + numero(tot[d.desafiadoId]);
    if (!venc || !numero(tot[venc])) return ap.liquido;
    return venc === ap.lado ? Math.floor(ap.liquido * bolo / numero(tot[venc])) : 0;
}
function htmlEspectador(d) {
    const e = d.estado, L = e.lutadores, A = d.desafianteId, B = d.desafiadoId;
    const tot = arena.apostasTotais || {};
    const minha = arena.minhaAposta;
    const aberta = d.status === 'aceito' && e.status === 'em_andamento' && e.turno < 2;
    const torcendo = arena.torcendo || arena.ladoVisao;
    const valorDigitado = document.getElementById('aposta-valor')?.value || '';
    const moedaEscolhida = document.getElementById('aposta-moeda')?.value || 'ryos';
    const bolo = (moeda) => [A, B].map(uid => {
        const t = tot[moeda] || {}, soma = numero(t[A]) + numero(t[B]), lado = numero(t[uid]);
        return `<div class="bolo-lado"><span>${esc(L[uid]?.nome || 'Ninja')}</span><strong>${formatarNum(lado)} ${NOME_MOEDA_APOSTA[moeda]}</strong><small>${lado ? `paga ${(soma / lado).toFixed(2)}x` : 'sem apostas'}</small></div>`;
    }).join('');
    let aposta;
    if (minha) {
        const fim = e.status === 'finalizada';
        const premio = fim ? premioDaAposta(minha, d, tot[minha.moeda] || {}) : null;
        aposta = `<div class="aposta-minha">🎟️ Sua aposta: <strong>${formatarNum(minha.valor)} ${NOME_MOEDA_APOSTA[minha.moeda]}</strong> em <strong>${esc(L[minha.lado]?.nome || 'Ninja')}</strong> (${formatarNum(minha.liquido)} no bolo; 5% foram para o Cofre da Vila)
            ${fim ? `<br>${premio > 0 ? `💰 Resultado: <strong>+${formatarNum(premio)} ${NOME_MOEDA_APOSTA[minha.moeda]}</strong>${minha.pago ? ' (já está na sua ficha)' : ''}` : '😔 Não foi dessa vez.'}` : ''}</div>`;
    } else if (aberta) {
        aposta = `<div class="aposta-form">
            <input type="number" id="aposta-valor" class="edit-input" min="${APOSTA_MINIMA}" placeholder="Valor (mín. ${APOSTA_MINIMA})" value="${esc(valorDigitado)}">
            <select id="aposta-moeda" class="edit-input"><option value="ryos" ${moedaEscolhida === 'ryos' ? 'selected' : ''}>Ryos</option><option value="essencia_ninja" ${moedaEscolhida === 'essencia_ninja' ? 'selected' : ''}>EN</option></select>
            ${[A, B].map(uid => `<button class="buy-btn" onclick="window.apostarNaLuta(${jsArg(uid)})">Apostar em ${esc(L[uid]?.nome || 'Ninja')}</button>`).join('')}
        </div><p class="form-ajuda">As apostas fecham quando começar o <strong>turno 2</strong>. Quem acertar divide o bolo inteiro, proporcional ao que apostou. 5% de cada aposta vão para o Cofre da Vila. Empate ou luta anulada: o valor volta.</p>`;
    } else {
        aposta = `<p class="arena-vazio">${e.status === 'finalizada' ? 'Luta encerrada.' : 'As apostas desta luta já fecharam (começou o turno 2).'}</p>`;
    }
    return `<div class="plateia">
        <div class="plateia-torcida">
            <div class="plateia-titulo">📣 Torcida</div>
            <div class="plateia-lados">${[A, B].map(uid => `<button class="btn-arena-sec ${torcendo === uid ? 'ativo' : ''}" onclick="window.torcerPor(${jsArg(uid)})">Torcer por ${esc(L[uid]?.nome || 'Ninja')}</button>`).join('')}
                <button class="btn-arena-sec" onclick="window.trocarLadoVisao()" title="Inverter os lados da tela">⇄ Inverter tela</button></div>
            <div class="plateia-emojis">${EMOJIS_TORCIDA.map(em => `<button class="emoji-btn" onclick="window.enviarEmoji('${em}')" aria-label="Enviar ${em}">${em}</button>`).join('')}</div>
        </div>
        <div class="plateia-apostas">
            <div class="plateia-titulo">💰 Apostas</div>
            <div class="bolo">${bolo('ryos')}</div>${(tot.essencia_ninja && Object.keys(tot.essencia_ninja).length) ? `<div class="bolo">${bolo('essencia_ninja')}</div>` : ''}
            ${aposta}
        </div>
    </div>`;
}

window.apostarNaLuta = async (lado) => {
    const d = arena.dados, id = arena.id, eu = minhaUid();
    if (!d || !id || !eu) return;
    const valor = Math.floor(Number(document.getElementById('aposta-valor')?.value));
    const moeda = document.getElementById('aposta-moeda')?.value === 'essencia_ninja' ? 'essencia_ninja' : 'ryos';
    if (!valor || valor < APOSTA_MINIMA) return alert(`A aposta mínima é ${APOSTA_MINIMA}.`);
    if (valor > numero(currentUserData?.[moeda])) return alert(`Você não tem ${NOME_MOEDA_APOSTA[moeda]} suficientes.`);
    if ([d.desafianteId, d.desafiadoId].includes(eu)) return alert("Você não pode apostar na sua própria luta.");
    const liquido = valor - Math.floor(valor / 20), taxa = valor - liquido;
    if (!confirm(`Apostar ${formatarNum(valor)} ${NOME_MOEDA_APOSTA[moeda]} em ${d.estado.lutadores[lado]?.nome}?\n\n${formatarNum(taxa)} vão para o Cofre da Vila e ${formatarNum(liquido)} entram no bolo.`)) return;
    try {
        const mid = `aposta_${id}_${eu}`;
        const lote = writeBatch(db);
        lote.update(doc(db, "users", eu), { [moeda]: increment(-valor), apostas_abertas: arrayUnion(id), ultimaAposta: id });
        lote.set(doc(db, "desafios_batalha", id, "apostas", eu), { uid: eu, nome: currentUserData?.nome || 'Ninja', lado, moeda, valor, liquido, pago: false, em: Date.now() });
        lote.set(doc(db, "apostas_totais", id), { [moeda]: { [lado]: increment(liquido) } }, { merge: true });
        lote.set(doc(db, "vila_movimentos", mid), { uid: eu, nome: currentUserData?.nome || 'Ninja', tipo: 'aposta', valor: taxa, data: serverTimestamp(), ref: id, moeda });
        lote.update(refCofre(), { [moeda === 'ryos' ? 'saldo' : 'saldo_en']: increment(taxa), ultimoMov: mid });
        await lote.commit();
        arena.torcendo = lado;
    } catch (e) {
        console.error(e);
        alert("Não foi possível apostar: " + (e.code === 'permission-denied' ? 'as apostas podem ter fechado (começou o turno 2).' : e.message));
    }
};

// Recebe (ou fecha) a aposta de uma luta que terminou
async function receberMinhaAposta(bid, avisar = false) {
    const eu = minhaUid();
    arena.recebendo = arena.recebendo || {};
    if (!eu || arena.recebendo[bid]) return;
    arena.recebendo[bid] = true;
    try {
        const ap = (await getDoc(doc(db, "desafios_batalha", bid, "apostas", eu))).data();
        if (!ap || ap.pago) return;
        const d = (await getDoc(doc(db, "desafios_batalha", bid))).data();
        if (!d?.estado || d.estado.status !== 'finalizada') { arena.recebendo[bid] = false; return; }
        const tot = ((await getDoc(doc(db, "apostas_totais", bid))).data() || {})[ap.moeda] || {};
        const premio = premioDaAposta(ap, d, tot);
        const lote = writeBatch(db);
        lote.update(doc(db, "users", eu), { [ap.moeda]: increment(premio), apostas_abertas: arrayRemove(bid), ultimaApostaPaga: bid });
        lote.update(doc(db, "desafios_batalha", bid, "apostas", eu), { pago: true });
        await lote.commit();
        if (avisar || premio > 0) {
            const nome = d.estado.lutadores[ap.lado]?.nome || 'seu ninja';
            alert(premio > ap.liquido ? `🎉 Você acertou a aposta em ${nome}: +${formatarNum(premio)} ${NOME_MOEDA_APOSTA[ap.moeda]}!`
                : premio > 0 ? `↩️ Sua aposta voltou: +${formatarNum(premio)} ${NOME_MOEDA_APOSTA[ap.moeda]}.` : `😔 Você perdeu a aposta em ${nome}.`);
        }
    } catch (e) { console.error("Erro ao receber a aposta:", e); arena.recebendo[bid] = false; }
}
// Ao entrar: recebe apostas de lutas que terminaram enquanto você estava fora
async function conferirApostasAbertas() {
    try {
        const ficha = (await getDoc(doc(db, "users", minhaUid()))).data() || {};
        for (const bid of ficha.apostas_abertas || []) {
            const d = (await getDoc(doc(db, "desafios_batalha", bid))).data();
            if (d?.estado?.status === 'finalizada') await receberMinhaAposta(bid);
        }
    } catch (e) { console.error(e); }
}

// Kage: anula a luta (ninguém ganha; cofres e apostas voltam)
window.anularLuta = async (id) => {
    if (!ehKage()) return;
    if (!confirm("Anular esta luta?\n\nNinguém ganha nem perde, as estatísticas não contam e as apostas e cofres voltam para os jogadores.")) return;
    try {
        const atual = (await getDoc(doc(db, "desafios_batalha", id))).data() || {};
        const n = (atual.histN || (atual.historico || []).length) + 1;
        await updateDoc(doc(db, "desafios_batalha", id), {
            histN: n, rev: (atual.rev || 0) + 1,
            status: 'anulada',
            'estado.status': 'finalizada', 'estado.fase': 'fim', 'estado.ataquePendente': null,
            'estado.resultado': { vencedor: null, perdedor: null, empate: false, anulada: true, motivo: 'anulada' },
            anuladaEm: Date.now(),
            historico: arrayUnion({ tipo: 'sistema', texto: '⚖️ O Kage anulou esta luta. Apostas e cofres serão devolvidos.', t: Date.now(), n })
        });
    } catch (e) { console.error(e); alert("Erro ao anular: " + e.message); }
};

// Lutas ao vivo: faz o botão da Arena pulsar e lista na entrada da Arena
window.escutarLutasAoVivo = () => {
    if (arena.pararAoVivo) arena.pararAoVivo();
    arena.pararAoVivo = onSnapshot(query(collection(db, "desafios_batalha"), where("status", "==", "aceito")), (snap) => {
        const eu = minhaUid();
        arena.aoVivo = snap.docs.map(d => ({ id: d.id, dados: d.data() }))
            .filter(b => batalhaAtiva(b.dados) && b.dados.desafianteId !== eu && b.dados.desafiadoId !== eu);
        document.querySelectorAll('#side-btn-batalha, #bottom-btn-batalha, #nav-btn-batalha').forEach(b => b.classList.toggle('ao-vivo', arena.aoVivo.length > 0));
        renderListaAoVivo();
    }, (e) => console.error(e));
};
function renderListaAoVivo() {
    const c = document.getElementById('arena-ao-vivo');
    if (!c) return;
    const lutas = arena.aoVivo || [];
    if (!lutas.length) { c.innerHTML = ''; return; }
    c.innerHTML = `<h3 class="arena-ao-vivo-titulo"><span class="ponto-ao-vivo"></span> Ao vivo agora</h3>` + lutas.map(b => {
        const e = b.dados.estado, L = e.lutadores, A = b.dados.desafianteId, B = b.dados.desafiadoId;
        const vida = (uid) => `${Math.max(0, Math.round(L[uid].vida / L[uid].maxVida * 100))}%`;
        return `<div class="arena-lobby-item ao-vivo-item">
            <div><div class="arena-lobby-titulo">⚔️ <strong>${esc(L[A]?.nome)}</strong> <small>(${vida(A)})</small> × <strong>${esc(L[B]?.nome)}</strong> <small>(${vida(B)})</small></div>
            <div class="arena-lobby-sub">${NOMES_MODO[b.dados.modo || 'amistoso']} · Turno ${e.turno}${e.turno < 2 ? ' · <strong>apostas abertas</strong>' : ''}</div></div>
            <div class="ao-vivo-botoes"><button class="btn-post" onclick="window.assistirBatalha(${jsArg(b.id)})">👀 Assistir</button>
            ${ehKage() ? `<button class="btn-arena-sec perigo" onclick="window.anularLuta(${jsArg(b.id)})">⚖️ Anular</button>` : ''}</div>
        </div>`;
    }).join('');
}

// =====================================================================
//  ARENA FASE 3 — TORNEIOS
//  O Kage cria; ninjas se inscrevem (taxa vai para o bolo); no prazo, o Kage sorteia a
//  chave (com "bye" se faltar gente); cada partida é um desafio Rankeado; o vencedor
//  avança sozinho; o Kage marca W.O. e entrega os prêmios.
// =====================================================================
const NOME_STATUS_TORNEIO = { inscricoes: '📝 Inscrições abertas', em_andamento: '⚔️ Em andamento', finalizado: '🏆 Finalizado', cancelado: '❌ Cancelado' };
const dataHora = (ms) => ms ? new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const nomeNoTorneio = (t, uid) => uid ? (t.inscritos?.[uid]?.nome || 'Ninja') : '—';
const prazoDaRodada = (t, r) => numero(t.sorteadoEm) + r * numero(t.prazoRodadaHoras || 48) * 3600e3;

function textoPremio(t) {
    const partes = [];
    if (numero(t.premioCofre)) partes.push(`${formatarNum(t.premioCofre)} Ryos do Cofre da Vila`);
    if (t.boloParaPremio !== false && t.taxa) partes.push(`o bolo das inscrições (${formatarNum(numero(t.bolo))} ${NOME_MOEDA_APOSTA[t.taxa.moeda]})`);
    if (t.premioItem?.nome) partes.push(`${t.premioItem.qtd > 1 ? t.premioItem.qtd + 'x ' : ''}${t.premioItem.nome} para o campeão`);
    return partes.length ? partes.join(' + ') + ` · campeão ${numero(t.pctCampeao || 70)}% / vice ${100 - numero(t.pctCampeao || 70)}%` : 'Glória eterna';
}

// Monta a chave inteira (todas as rodadas) com byes sorteados
function montarChave(uids) {
    const jog = [...uids].sort(() => Math.random() - 0.5);
    let tam = 2; while (tam < jog.length) tam *= 2;
    const rodadas = Math.log2(tam), byes = tam - jog.length;
    const primeira = [];
    for (let i = 0; i < tam / 2; i++) primeira.push(i < byes ? [jog.pop(), null] : [jog.pop(), jog.pop()]);
    primeira.sort(() => Math.random() - 0.5);
    const partidas = {};
    for (let r = 1; r <= rodadas; r++) {
        const qtd = tam / Math.pow(2, r);
        for (let i = 0; i < qtd; i++) {
            const p = { rodada: r, a: r === 1 ? primeira[i][0] : null, b: r === 1 ? primeira[i][1] : null };
            if (r === rodadas) p.final = true; else { p.proxima = `r${r + 1}p${Math.floor(i / 2)}`; p.lado = i % 2 === 0 ? 'a' : 'b'; }
            partidas[`r${r}p${i}`] = p;
        }
    }
    // Quem caiu sem adversário passa direto
    for (const [k, p] of Object.entries(partidas)) {
        if (p.rodada === 1 && p.a && !p.b) { p.vencedor = p.a; p.bye = true; partidas[p.proxima][p.lado] = p.a; }
    }
    return { partidas, rodadas };
}

// Atualização da chave quando alguém vence a partida k
function atualizacaoDeVitoria(t, k, vencedor, extra = {}) {
    const p = t.partidas[k];
    const upd = { [`partidas.${k}.vencedor`]: vencedor, ...Object.fromEntries(Object.entries(extra).map(([c, v]) => [`partidas.${k}.${c}`, v])) };
    if (p.final) Object.assign(upd, { status: 'finalizado', campeao: vencedor, vice: p.a === vencedor ? p.b : p.a, finalizadoEm: Date.now() });
    else upd[`partidas.${p.proxima}.${p.lado}`] = vencedor;
    return upd;
}
async function avancarNoTorneio(bid, d) {
    const tref = doc(db, "torneios", d.torneio.tid);
    const t = (await getDoc(tref)).data();
    const p = t?.partidas?.[d.torneio.partida];
    if (!t || t.status !== 'em_andamento' || !p || p.vencedor) return;
    const upd = atualizacaoDeVitoria(t, d.torneio.partida, minhaUid(), { batalha: bid });
    upd.ultimoAvanco = { partida: d.torneio.partida, batalha: bid };
    await updateDoc(tref, upd);
    alert(p.final ? `🏆 Você é o CAMPEÃO do torneio ${t.nome}!` : `✅ Você avançou no torneio ${t.nome}! Veja a próxima partida na Arena.`);
}

// Lista de torneios na entrada da Arena
window.carregarTorneios = async () => {
    const c = document.getElementById('arena-torneios');
    if (!c) return;
    try {
        const snap = await getDocs(collection(db, "torneios"));
        const eu = minhaUid(), semana = 7 * 24 * 3600e3;
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter(t => ['inscricoes', 'em_andamento'].includes(t.status) || (t.status === 'finalizado' && Date.now() - numero(t.finalizadoEm) < semana) || (ehKage() && t.status === 'finalizado' && !t.premiosEntregues))
            .sort((a, b) => numero(b.criadoEm) - numero(a.criadoEm));
        arena.torneios = Object.fromEntries(lista.map(t => [t.id, t]));
        if (!lista.length) { c.innerHTML = ''; return; }
        c.innerHTML = `<h3 class="arena-secao-titulo">🏆 Torneios</h3>` + lista.map(t => {
            const inscritos = Object.keys(t.inscritos || {});
            const souInscrito = inscritos.includes(eu);
            const aberto = t.status === 'inscricoes' && Date.now() <= numero(t.inscricaoAte);
            const lotado = numero(t.maxInscritos) > 0 && inscritos.length >= numero(t.maxInscritos);
            const minha = t.status === 'em_andamento' && Object.entries(t.partidas || {}).find(([, p]) => !p.vencedor && p.a && p.b && (p.a === eu || p.b === eu));
            const botoes = [];
            if (aberto && !souInscrito && !lotado) botoes.push(`<button class="btn-post" onclick="window.inscreverNoTorneio(${jsArg(t.id)})">📝 Inscrever-se${t.taxa ? ` (${formatarNum(t.taxa.valor)} ${NOME_MOEDA_APOSTA[t.taxa.moeda]})` : ' (grátis)'}</button>`);
            if (souInscrito && t.status === 'inscricoes') botoes.push(`<span class="torneio-tag ok">✔ Inscrito</span>`);
            if (minha) botoes.push(`<button class="btn-post" onclick="window.desafiarPartidaTorneio(${jsArg(t.id)}, ${jsArg(minha[0])})">⚔️ Desafiar ${esc(nomeNoTorneio(t, minha[1].a === eu ? minha[1].b : minha[1].a))}</button>`);
            if (t.partidas) botoes.push(`<button class="btn-arena-sec" onclick="window.verChaveTorneio(${jsArg(t.id)})">🗂️ Ver chave</button>`);
            if (ehKage()) {
                if (t.status === 'inscricoes') botoes.push(`<button class="btn-arena-sec" onclick="window.sortearChaveTorneio(${jsArg(t.id)})">🎲 Sortear chave</button>`);
                if (t.status === 'finalizado' && !t.premiosEntregues) botoes.push(`<button class="btn-arena-sec" onclick="window.entregarPremiosTorneio(${jsArg(t.id)})">🎁 Entregar prêmios</button>`);
                if (['inscricoes', 'em_andamento'].includes(t.status)) botoes.push(`<button class="btn-arena-sec perigo" onclick="window.cancelarTorneio(${jsArg(t.id)})">Cancelar</button>`);
            }
            let info = '';
            if (t.status === 'inscricoes') info = `Inscrições até <strong>${dataHora(t.inscricaoAte)}</strong> · ${inscritos.length}${numero(t.maxInscritos) ? '/' + t.maxInscritos : ''} inscritos`;
            if (t.status === 'em_andamento') { const r = numero(t.rodadaAtual) || rodadaAtualDe(t); info = `Rodada ${r} de ${t.rodadas} · prazo ${dataHora(prazoDaRodada(t, r))}`; }
            if (t.status === 'finalizado') info = `🥇 <strong>${esc(nomeNoTorneio(t, t.campeao))}</strong> · 🥈 ${esc(nomeNoTorneio(t, t.vice))}${t.premiosEntregues ? ' · prêmios entregues' : ' · aguardando o Kage entregar os prêmios'}`;
            return `<div class="torneio-card status-${esc(t.status)}">
                <div class="torneio-topo"><strong>${esc(t.nome)}</strong><span class="torneio-tag">${NOME_STATUS_TORNEIO[t.status] || t.status}</span></div>
                ${t.descricao ? `<p class="torneio-desc">${esc(t.descricao)}</p>` : ''}
                <div class="torneio-info">🎁 ${esc(textoPremio(t))}</div>
                <div class="torneio-info">${info}</div>
                <div class="torneio-botoes">${botoes.join('')}</div></div>`;
        }).join('');
    } catch (e) { console.error(e); c.innerHTML = ''; }
};
function rodadaAtualDe(t) {
    const pend = Object.values(t.partidas || {}).filter(p => !p.vencedor).map(p => p.rodada);
    return pend.length ? Math.min(...pend) : numero(t.rodadas);
}

window.inscreverNoTorneio = async (tid) => {
    const t = arena.torneios?.[tid]; if (!t) return;
    if (t.taxa && numero(currentUserData?.[t.taxa.moeda]) < t.taxa.valor) return alert(`Você não tem ${NOME_MOEDA_APOSTA[t.taxa.moeda]} suficientes para a inscrição.`);
    if (!confirm(`Inscrever-se no torneio "${t.nome}"?${t.taxa ? `\n\nTaxa: ${formatarNum(t.taxa.valor)} ${NOME_MOEDA_APOSTA[t.taxa.moeda]}.` : ''}`)) return;
    try {
        const lote = writeBatch(db);
        lote.update(doc(db, "torneios", tid), { [`inscritos.${minhaUid()}`]: { nome: currentUserData?.nome || 'Ninja', em: Date.now() }, bolo: increment(t.taxa ? t.taxa.valor : 0) });
        if (t.taxa) lote.update(doc(db, "users", minhaUid()), { [t.taxa.moeda]: increment(-t.taxa.valor), ultimaInscricao: tid });
        await lote.commit();
        alert("📝 Inscrição feita! Boa sorte no torneio.");
        window.carregarTorneios();
    } catch (e) { console.error(e); alert("Não foi possível se inscrever: " + (e.code === 'permission-denied' ? 'as inscrições podem ter fechado ou lotado.' : e.message)); }
};

window.desafiarPartidaTorneio = async (tid, k) => {
    const eu = minhaUid();
    try {
        const t = (await getDoc(doc(db, "torneios", tid))).data();
        const p = t?.partidas?.[k];
        if (!p || p.vencedor) return alert("Essa partida já foi decidida.");
        const adv = p.a === eu ? p.b : p.a;
        if (!adv) return alert("Seu adversário ainda não foi definido.");
        const minhas = await listarMinhasBatalhas();
        if (minhas.some(b => batalhaAtiva(b.dados))) return alert("Você já tem uma batalha em andamento. Termine-a antes.");
        if (!confirm(`Desafiar ${nomeNoTorneio(t, adv)} para a partida do torneio "${t.nome}"? (vale como Rankeada)`)) return;
        const ref = doc(collection(db, "desafios_batalha"));
        await setDoc(ref, {
            desafianteId: eu, desafianteNome: currentUserData?.nome || 'Ninja', desafiadoId: adv, desafiadoNome: nomeNoTorneio(t, adv),
            status: 'pendente', modo: 'rankeada', aposta: null, cofre: {}, criadoEm: Date.now(), timestamp: serverTimestamp(),
            torneio: { tid, partida: k, nome: t.nome }
        });
        alert(`Pergaminho enviado para ${nomeNoTorneio(t, adv)}! Aguardando resposta...`);
        escutarMeuConvite(ref.id);
    } catch (e) { console.error(e); alert("Não foi possível enviar o desafio: " + e.message); }
};

// Chave do torneio (janela)
window.verChaveTorneio = async (tid) => {
    const t = (await getDoc(doc(db, "torneios", tid))).data();
    if (!t?.partidas) return;
    arena.torneios = { ...(arena.torneios || {}), [tid]: { id: tid, ...t } };
    const eu = minhaUid();
    const colunas = [];
    for (let r = 1; r <= numero(t.rodadas); r++) {
        const ps = Object.entries(t.partidas).filter(([, p]) => p.rodada === r).sort((a, b) => Number(a[0].split('p')[1]) - Number(b[0].split('p')[1]));
        const titulo = r === numero(t.rodadas) ? 'Final' : (r === numero(t.rodadas) - 1 ? 'Semifinal' : `Rodada ${r}`);
        colunas.push(`<div class="chave-coluna"><div class="chave-titulo">${titulo}<small>até ${dataHora(prazoDaRodada(t, r))}</small></div>${ps.map(([k, p]) => {
            const linha = (uid) => `<div class="chave-jogador ${p.vencedor && p.vencedor === uid ? 'venceu' : (p.vencedor && uid ? 'perdeu' : '')} ${uid === eu ? 'sou-eu' : ''}">${uid ? esc(nomeNoTorneio(t, uid)) : (p.rodada === 1 ? '<em>— passa direto —</em>' : '<em>a definir</em>')}</div>`;
            let acoes = '';
            if (!p.vencedor && p.a && p.b) {
                if (p.a === eu || p.b === eu) acoes += `<button class="btn-arena-sec" onclick="window.desafiarPartidaTorneio(${jsArg(tid)}, ${jsArg(k)})">⚔️ Desafiar</button>`;
                if (ehKage()) acoes += `<button class="btn-arena-sec" onclick="window.marcarWO(${jsArg(tid)}, ${jsArg(k)}, ${jsArg(p.a)})">W.O. → ${esc(nomeNoTorneio(t, p.a))}</button><button class="btn-arena-sec" onclick="window.marcarWO(${jsArg(tid)}, ${jsArg(k)}, ${jsArg(p.b)})">W.O. → ${esc(nomeNoTorneio(t, p.b))}</button>`;
            }
            const marca = p.bye ? '<span class="chave-marca">passou direto</span>' : (p.wo ? '<span class="chave-marca">W.O.</span>' : '');
            return `<div class="chave-partida">${linha(p.a)}${linha(p.b)}${marca}${acoes ? `<div class="chave-acoes">${acoes}</div>` : ''}</div>`;
        }).join('')}</div>`);
    }
    document.getElementById('torneio-titulo').innerText = `🏆 ${t.nome}`;
    document.getElementById('torneio-chave').innerHTML = `<div class="chave">${colunas.join('')}</div>
        ${t.status === 'finalizado' ? `<p class="chave-campeao">🥇 Campeão: <strong>${esc(nomeNoTorneio(t, t.campeao))}</strong> · 🥈 Vice: ${esc(nomeNoTorneio(t, t.vice))}</p>` : ''}`;
    document.getElementById('modal-torneio').style.display = 'flex';
};

// ---------- Kage ----------
window.criarTorneio = async () => {
    if (!ehKage()) return;
    const v = (id) => document.getElementById(id)?.value?.trim() || '';
    const nome = v('tor-nome');
    const ate = new Date(v('tor-ate')).getTime();
    if (!nome) return alert("Dê um nome ao torneio.");
    if (!ate || ate < Date.now()) return alert("Escolha uma data de fim das inscrições no futuro.");
    const taxaValor = Math.floor(Number(v('tor-taxa')) || 0);
    const pct = Math.min(100, Math.max(50, Math.floor(Number(v('tor-pct')) || 70)));
    const itemSel = v('tor-item');
    let premioItem = null;
    if (itemSel) { const [col, id] = itemSel.split('|'); const it = (await getDoc(doc(db, col, id))).data(); premioItem = { col, id, nome: it?.nome || id, qtd: Math.max(1, Math.floor(Number(v('tor-item-qtd')) || 1)) }; }
    const dados = {
        nome, descricao: v('tor-desc'), status: 'inscricoes', criadoEm: Date.now(), inscricaoAte: ate,
        prazoRodadaHoras: Math.max(1, Math.floor(Number(v('tor-prazo')) || 48)), maxInscritos: Math.max(0, Math.floor(Number(v('tor-max')) || 0)),
        taxa: taxaValor > 0 ? { moeda: v('tor-moeda') === 'essencia_ninja' ? 'essencia_ninja' : 'ryos', valor: taxaValor } : null,
        premioCofre: Math.max(0, Math.floor(Number(v('tor-premio')) || 0)), boloParaPremio: !!document.getElementById('tor-bolo')?.checked,
        pctCampeao: pct, premioItem, bolo: 0, inscritos: {}
    };
    try {
        await setDoc(doc(collection(db, "torneios")), dados);
        alert(`🏆 Torneio "${nome}" criado! Ele já aparece na Arena para os ninjas se inscreverem.`);
        ['tor-nome', 'tor-desc', 'tor-taxa', 'tor-premio'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        window.carregarTorneios();
    } catch (e) { console.error(e); alert("Erro ao criar o torneio: " + e.message); }
};
window.sortearChaveTorneio = async (tid) => {
    const ref = doc(db, "torneios", tid);
    const t = (await getDoc(ref)).data();
    const uids = Object.keys(t.inscritos || {});
    if (uids.length < 2) return alert("O torneio precisa de pelo menos 2 inscritos.");
    if (Date.now() < numero(t.inscricaoAte) && !confirm("As inscrições ainda não terminaram. Fechar agora e sortear a chave?")) return;
    const { partidas, rodadas } = montarChave(uids);
    const byes = Object.values(partidas).filter(p => p.bye).length;
    if (!confirm(`Sortear a chave com ${uids.length} ninjas (${rodadas} rodada${rodadas > 1 ? 's' : ''}${byes ? `, ${byes} passa${byes > 1 ? 'm' : ''} direto` : ''})?`)) return;
    await updateDoc(ref, { status: 'em_andamento', partidas, rodadas, sorteadoEm: Date.now() });
    window.carregarTorneios();
    window.verChaveTorneio(tid);
};
window.marcarWO = async (tid, k, vencedor) => {
    const ref = doc(db, "torneios", tid);
    const t = (await getDoc(ref)).data();
    const p = t.partidas[k];
    if (p.vencedor) return alert("Essa partida já foi decidida.");
    if (!confirm(`Dar a vitória por W.O. para ${nomeNoTorneio(t, vencedor)}?`)) return;
    await updateDoc(ref, atualizacaoDeVitoria(t, k, vencedor, { wo: true }));
    window.carregarTorneios();
    window.verChaveTorneio(tid);
};
window.cancelarTorneio = async (tid) => {
    const ref = doc(db, "torneios", tid);
    const t = (await getDoc(ref)).data();
    const uids = Object.keys(t.inscritos || {});
    if (!confirm(`Cancelar o torneio "${t.nome}"?${t.taxa && uids.length ? `\n\nA taxa de inscrição volta para os ${uids.length} inscritos.` : ''}`)) return;
    const lote = writeBatch(db);
    if (t.taxa) uids.forEach(uid => lote.update(doc(db, "users", uid), { [t.taxa.moeda]: increment(t.taxa.valor) }));
    lote.update(ref, { status: 'cancelado', bolo: 0, canceladoEm: Date.now() });
    await lote.commit();
    window.carregarTorneios();
};
window.entregarPremiosTorneio = async (tid) => {
    const ref = doc(db, "torneios", tid);
    const t = (await getDoc(ref)).data();
    if (t.status !== 'finalizado' || t.premiosEntregues) return;
    const pct = numero(t.pctCampeao || 70) / 100;
    const doCofre = numero(t.premioCofre), bolo = numero(t.bolo), moedaBolo = t.taxa?.moeda || 'ryos';
    const cofre = (await getDoc(refCofre())).data() || {};
    if (doCofre > numero(cofre.saldo)) return alert(`O Cofre da Vila tem ${formatarNum(numero(cofre.saldo))} Ryos e o prêmio pede ${formatarNum(doCofre)}. Deposite no cofre ou ajuste o prêmio.`);
    const parte = (total, campeao) => campeao ? Math.floor(total * pct) : total - Math.floor(total * pct);
    const ganhos = { [t.campeao]: {}, [t.vice]: {} };
    const somar = (uid, moeda, v) => { if (uid && v > 0) ganhos[uid][moeda] = (ganhos[uid][moeda] || 0) + v; };
    [[t.campeao, true], [t.vice, false]].forEach(([uid, c]) => {
        somar(uid, 'ryos', parte(doCofre, c));
        if (t.boloParaPremio !== false) somar(uid, moedaBolo, parte(bolo, c));
    });
    const resumo = [t.campeao, t.vice].filter(Boolean).map(uid => `${nomeNoTorneio(t, uid)}: ${Object.entries(ganhos[uid]).map(([m, v]) => `${formatarNum(v)} ${NOME_MOEDA_APOSTA[m]}`).join(' + ') || '—'}`).join('\n');
    if (!confirm(`Entregar os prêmios do torneio "${t.nome}"?\n\n${resumo}${t.premioItem ? `\n+ ${t.premioItem.qtd}x ${t.premioItem.nome} para o campeão` : ''}`)) return;
    const lote = writeBatch(db);
    for (const uid of [t.campeao, t.vice].filter(Boolean)) {
        const upd = Object.fromEntries(Object.entries(ganhos[uid]).map(([m, v]) => [m, increment(v)]));
        if (uid === t.campeao) upd.torneios_vencidos = increment(1);
        if (uid === t.campeao && t.premioItem) {
            if (t.premioItem.col === 'jutsus') upd.meusJutsus = arrayUnion(t.premioItem.id);
            else upd[`inventario.${t.premioItem.id}`] = increment(t.premioItem.qtd);
        }
        if (Object.keys(upd).length) lote.update(doc(db, "users", uid), upd);
    }
    if (doCofre > 0) {
        lote.update(refCofre(), { saldo: increment(-doCofre) });
        lote.set(doc(db, "vila_movimentos", idMovimento('torneio')), { uid: minhaUid(), nome: 'Kage', tipo: 'torneio', valor: -doCofre, data: serverTimestamp(), ref: t.nome });
    }
    // Bolo que não é prêmio vai para o cofre da vila
    if (t.boloParaPremio === false && bolo > 0) {
        lote.update(refCofre(), { [moedaBolo === 'ryos' ? 'saldo' : 'saldo_en']: increment(bolo) });
        lote.set(doc(db, "vila_movimentos", idMovimento('torneio_bolo')), { uid: minhaUid(), nome: 'Kage', tipo: 'torneio', valor: bolo, moeda: moedaBolo, data: serverTimestamp(), ref: `Inscrições: ${t.nome}` });
    }
    lote.update(ref, { premiosEntregues: true, premiosEm: Date.now() });
    await lote.commit();
    alert("🎁 Prêmios entregues!");
    window.carregarTorneios();
};
// Painel Kage: lista de itens para o prêmio extra
window.carregarFormTorneio = async () => {
    const sel = document.getElementById('tor-item');
    if (!sel || sel.dataset.carregado) return;
    const opcoes = ['<option value="">— Nenhum —</option>'];
    for (const [col, rot] of [['jutsus', 'Jutsu'], ['ferramentas', 'Ferramenta'], ['itens', 'Item']]) {
        const s = await lerColecao(col);
        s.docs.map(d => ({ id: d.id, nome: d.data().nome || d.id })).sort((a, b) => a.nome.localeCompare(b.nome))
            .forEach(it => opcoes.push(`<option value="${esc(col + '|' + it.id)}">${rot}: ${esc(it.nome)}</option>`));
    }
    sel.innerHTML = opcoes.join('');
    sel.dataset.carregado = '1';
    const ate = document.getElementById('tor-ate');
    if (ate && !ate.value) { const d = new Date(Date.now() + 3 * 24 * 3600e3); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); ate.value = d.toISOString().slice(0, 16); }
};

// Mostra a versão do servidor: desenha, anima as jogadas novas e cuida do fim da luta
function aplicarDoServidor(d, primeiraVez = false) {
    arena.dados = d;
    renderArena();
    // Animações: só das jogadas que chegaram depois de abrir a luta (não repete as antigas)
    const hist = d.historico || [];
    const ultimoN = hist.length ? (hist[hist.length - 1].n || 0) : 0;
    if (primeiraVez) arena.animadoAte = ultimoN;
    else if (ultimoN > (arena.animadoAte || 0)) {
        enfileirarAnimacoes(hist.filter(h => h.tipo === 'anim' && (h.n || 0) > (arena.animadoAte || 0)));
        arena.animadoAte = ultimoN;
    }
    if (d.estado?.status === 'finalizada' && arena.id) {
        if (arena.espectador) receberMinhaAposta(arena.id, true);
        else posLuta(arena.id, d);
    }
}

function fecharBatalha(voltarAoLobby = true) {
    if (arena.unsub) arena.unsub();
    (arena.ouvintesPlateia || []).forEach(f => f());
    if (arena.espectador && arena.id && minhaUid()) deleteDoc(doc(db, "desafios_batalha", arena.id, "torcida", minhaUid())).catch(() => {});
    Object.assign(arena, { espectador: false, ladoVisao: null, ouvintesPlateia: [], espectadores: 0, apostasTotais: null, minhaAposta: null, torcendo: null });
    clearInterval(arena.tick); clearInterval(arena.batida);
    Object.assign(arena, { id: null, dados: null, servidor: null, pendentes: 0, unsub: null, tick: null, batida: null });
    if (voltarAoLobby) {
        document.getElementById('arena-waiting').style.display = 'block';
        document.getElementById('arena-container').style.display = 'none';
        window.carregarLobbyArena();
    }
}
window.sairDaArena = () => fecharBatalha(true);

async function carregarJutsusDaArena() {
    const ids = (currentUserData.meusJutsus || []).filter(Boolean);
    const lista = await Promise.all(ids.map(id => lerDoCatalogo("jutsus", id).catch(() => null)));
    arena.jutsus = lista.filter(Boolean).map(j => aplicarEscalaPersonalizada(j));
}

function todosItensDoInventario() {
    const inv = currentUserData?.inventario || {};
    const itens = [];
    for (const [id, qtd] of Object.entries(inv)) {
        if (!(qtd > 0)) continue;
        const info = globalItensMap[id];
        if (!info) continue;
        // Ferramentas e também armas vendidas como item (ex.: ferreiro) com Poder cadastrado
        if (info.type === 'tool' || numero(info.poder) > 0) {
            itens.push({ ...info, id, qtd, tipoItem: 'ferramenta', usavel: usoNaArena(info) && poderDoJutsu(info) > 0 });
        } else {
            const recupera = numero(info.bonus_hp) || numero(info.bonus_chakra) || numero(info.bonus_stamina) || numero(info.cura) || numero(info.recupera_chakra) || numero(info.recupera_stamina);
            itens.push({ ...info, id, qtd, tipoItem: 'item', usavel: usoNaArena(info) && !!recupera });
        }
    }
    return itens;
}
// Só os que podem ser usados na luta
function itensDaArena() { return todosItensDoInventario().filter(it => it.usavel); }

// ---------------- 5. Enviar jogadas (transação no banco) ----------------
// A jogada aparece NA HORA na tela (calculada aqui mesmo pelo motor) e o servidor confirma por trás.
// Se o servidor recusar, a tela volta para o último estado confirmado.
async function enviarAcao(acao, silencioso = false) {
    if (!arena.id) return false;
    const ref = doc(db, "desafios_batalha", arena.id);
    const d0 = arena.dados;
    const otimista = d0?.estado && !['presenca', 'tempo_esgotado'].includes(acao.tipo);
    if (otimista) {
        try {
            const { estado, eventos } = aplicarAcao(d0.estado, minhaUid(), acao, agoraArena());
            const base = d0.histN || (d0.historico || []).length;
            const novos = eventos.map((e, i) => ({ ...e, t: Date.now(), n: base + i + 1 }));
            arena.dados = { ...d0, estado, rev: (d0.rev || 0) + 1, histN: base + novos.length, historico: [...(d0.historico || []), ...novos].slice(-ARENA.historicoMax) };
            if (estado.status === 'finalizada') arena.dados.status = 'finalizada';
            renderArena();
            const anims = novos.filter(h => h.tipo === 'anim');
            if (anims.length) { enfileirarAnimacoes(anims); arena.animadoAte = Math.max(arena.animadoAte || 0, base + novos.length); }
        } catch (e) {
            if (e.regra) { if (!silencioso) alert(e.message); return false; }
            console.error(e);
        }
    }
    arena.pendentes = (arena.pendentes || 0) + 1;
    // As jogadas vão ao servidor uma de cada vez, na ordem dos cliques
    const anterior = arena.filaEnvio || Promise.resolve();
    let liberar;
    arena.filaEnvio = new Promise(r => { liberar = r; });
    try {
        await anterior;
        await runTransaction(db, async (tx) => {
            const s = await tx.get(ref);
            if (!s.exists()) throw new Error("A batalha não existe mais.");
            const d = s.data();
            if (!d.estado) throw new Error("Batalha sem estado.");
            const { estado, eventos } = aplicarAcao(d.estado, minhaUid(), acao, agoraArena());
            const base = d.histN || (d.historico || []).length;
            const novos = eventos.map((e, i) => ({ ...e, t: Date.now(), n: base + i + 1 }));
            const upd = { estado, atualizadoEm: serverTimestamp(), rev: (d.rev || 0) + 1 };
            if (novos.length) { upd.historico = [...(d.historico || []), ...novos].slice(-ARENA.historicoMax); upd.histN = base + novos.length; }
            if (estado.status === 'finalizada' && d.status !== 'finalizada') { upd.status = 'finalizada'; upd.finalizadaEm = Date.now(); }
            tx.update(ref, upd);
        });
        arena.gravouEm = Date.now();
        return true;
    } catch (e) {
        arena.falhou = otimista;   // desfaz o que apareceu na tela (no finally)
        if (!silencioso) { console.error(e); alert(e.regra ? e.message : ("Não foi possível realizar a ação. " + (e.message || ""))); }
        return false;
    } finally {
        liberar();
        arena.pendentes = Math.max(0, (arena.pendentes || 1) - 1);
        // Sem jogadas a caminho: mostra o que o servidor tem, se ele já estiver em dia
        if (arena.id && !arena.pendentes && arena.servidor && arena.dados !== arena.servidor
            && (arena.falhou || (arena.servidor.rev || 0) >= (arena.dados?.rev || 0))) aplicarDoServidor(arena.servidor);
        if (!arena.pendentes) arena.falhou = false;
    }
}

function tickArena() {
    const d = arena.dados;
    if (!d || !d.estado) return;
    const e = d.estado;
    atualizarCronometro(e);
    if (e.status !== 'em_andamento' || arena.espectador) return;
    const agora = agoraArena();
    // Tempo esgotado: qualquer um dos dois registra (o motor confere se acabou mesmo)
    if (!e.pausada && agora > e.prazo + 1500 && Date.now() - arena.ultimoTempoEsgotado > 4000) {
        arena.ultimoTempoEsgotado = Date.now();
        enviarAcao({ tipo: 'tempo_esgotado' }, true);
    }
    // Verifica pausa/retomada a cada 5 s
    if (Date.now() - arena.ultimaPresenca > 5000) {
        arena.ultimaPresenca = Date.now();
        const naArena = document.getElementById('batalha')?.classList.contains('active') && document.visibilityState === 'visible';
        const precisaPausar = !e.pausada && alguemAusente(e, agora);
        const podeRetomar = e.pausada && !alguemAusente(e, agora);
        if (naArena && (precisaPausar || podeRetomar)) enviarAcao({ tipo: 'presenca' }, true);
    }
}

function atualizarCronometro(e) {
    const barra = document.getElementById('arena-timer-fill');
    const texto = document.getElementById('arena-timer-txt');
    if (!barra || !texto) return;
    if (e.status !== 'em_andamento') { barra.style.width = '0%'; texto.textContent = ''; return; }
    if (e.pausada) { barra.style.width = '100%'; barra.className = 'arena-timer-fill pausado'; texto.textContent = '⏸️ Pausada'; return; }
    const total = e.fase === 'reacao' ? ARENA.tempoReacaoMs : ARENA.tempoAcaoMs;
    const resta = Math.max(0, e.prazo - agoraArena());
    barra.style.width = (resta / total * 100) + '%';
    barra.className = 'arena-timer-fill' + (resta < 5000 ? ' urgente' : '');
    texto.textContent = Math.ceil(resta / 1000) + 's';
}

// ---------------- 6. Desenhar a arena ----------------
function barraRecurso(rotulo, atual, max, classe) {
    const pct = max > 0 ? Math.max(0, Math.min(100, atual / max * 100)) : 0;
    return `<div class="arena-recurso ${classe}"><div class="arena-recurso-topo"><span>${rotulo}</span><span>${Math.max(0, Math.round(atual))}/${max}</span></div><div class="arena-recurso-barra"><div style="width:${pct}%"></div></div></div>`;
}
// Aura do modo ativo (borda e símbolo na carta do personagem)
const PRIORIDADE_AURA = ['mangekyou', 'sabio', 'sharingan', 'byakugan', 'portao', 'modo'];
function auraDoEfeito(e) {
    if (e.aura) return e.aura;
    const t = `${e.id} ${e.nome}`.toLowerCase();
    if (/mangeky|\bms[_ ]/.test(t)) return 'mangekyou';
    if (/sharingan/.test(t)) return 'sharingan';
    if (/s[aá]bio|sennin|senjutsu/.test(t)) return 'sabio';
    if (/byakugan/.test(t)) return 'byakugan';
    if (/port[aã]o|hachimon/.test(t)) return 'portao';
    return 'modo';
}
function auraDoLutador(l) {
    const auras = (l.efeitos || []).filter(e => e.tipo === 'modo').map(auraDoEfeito);
    return PRIORIDADE_AURA.find(a => auras.includes(a)) || null;
}
const NOME_AURA = { mangekyou: 'Mangekyou Sharingan ativo', sharingan: 'Sharingan ativo', sabio: 'Modo Sábio ativo', byakugan: 'Byakugan ativo', portao: 'Portões abertos', modo: 'Modo ativo' };

function cartaoLutador(l, souEu, ehVez) {
    const efeitos = (l.efeitos || []).filter(e => e.tipo !== 'manter_chamas').map(e => {
        const b = Object.entries(e.bonus || {}).filter(([, v]) => v).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${nomeBonus(k)}`).join(', ');
        const turnos = e.turnos === null || e.turnos === undefined ? '∞' : (e.tipo === 'genjutsu' ? Math.max(1, e.turnos - 1) : e.turnos) + 't';
        if (e.tipo === 'genjutsu') {
            const como = { paralisia: 'paralisado', sem_reacao: 'sem reação', confusao: 'confuso' }[e.efeitoGenjutsu] || 'preso';
            return `<span class="arena-efeito efeito-genjutsu" title="Preso no genjutsu ${esc(e.nome)}${b ? ': ' + esc(b) : ''}">👁️ ${esc(e.nome)} · ${como} · ${turnos}</span>`;
        }
        if (e.tipo === 'chamas') return `<span class="arena-efeito efeito-chamas" title="Chamas que só apagam por quem as lançou ou com defesa Rank S">🔥 ${esc(e.nome)} · −${e.danoPorTurno}/turno</span>`;
        const cls = e.tipo === 'sangramento' ? 'efeito-ruim' : (e.tipo === 'modo' ? 'efeito-modo' : '');
        return `<span class="arena-efeito ${cls}" title="${esc(b || e.nome)}">${esc(e.nome)} · ${turnos}${e.custoPorTurno ? ` · −${e.custoPorTurno}CP` : ''}</span>`;
    }).join('');
    const manter = (l.efeitos || []).find(e => e.tipo === 'manter_chamas');
    const chamasMantidas = manter ? `<span class="arena-efeito efeito-chamas" title="Mantendo as chamas no adversário">🔥 Mantendo ${esc(manter.nome)} · −${manter.custoPorTurno}CP</span>` : '';
    const clones = l.clones?.qtd ? `<span class="arena-efeito efeito-clone">👥 ${l.clones.qtd} clone${l.clones.qtd > 1 ? 's' : ''} · ${l.clones.reserva} CP</span>` : '';
    const criacoes = (l.criacoes || []).map(c => `<span class="arena-ficha" data-criacao="${esc(c.id)}" title="${esc(c.jutsuNome)}: ${c.poder ? `${c.poder} de dano cada` : 'sem dano'}${c.absorve ? ` · cada uma absorve ${c.absorve}` : ''}${c.custoPorTurno ? ` · −${c.custoPorTurno} CP/turno` : ''}"><span class="arena-ficha-icone">${esc(c.icone)}</span><strong>${c.qtd}</strong> ${esc(c.nome)}</span>`).join('');
    const aura = auraDoLutador(l);
    return `
            ${aura ? `<span class="aura-selo aura-selo-${aura}" title="${esc(NOME_AURA[aura] || 'Modo ativo')}" aria-label="${esc(NOME_AURA[aura] || 'Modo ativo')}"></span>` : ''}
            <div class="arena-lutador-topo">
                <img src="${esc(l.avatar || IMG_PADRAO)}" alt="" onerror="this.src='${IMG_PADRAO}'">
                <div><div class="arena-lutador-nome">${esc(l.nome)}${souEu ? ' <small>(você)</small>' : ''}</div>
                <div class="arena-lutador-stats">Reação ${l.atributos.reacao} · Velocidade ${l.atributos.velocidade}</div></div>
            </div>
            ${barraRecurso('Vida', l.vida, l.maxVida, 'r-vida')}
            ${barraRecurso('Chakra', l.chakra, l.maxChakra, 'r-chakra')}
            ${barraRecurso('Stamina', l.stamina, l.maxStamina, 'r-stamina')}
            ${criacoes ? `<div class="arena-fichas">${criacoes}</div>` : ''}
            <div class="arena-efeitos">${efeitos}${chamasMantidas}${clones}</div>`;
}

function renderArena() {
    const d = arena.dados;
    if (!d || !d.estado) return;
    const e = d.estado, eu = uidVisao(), adv = outro(e, eu);
    const L = e.lutadores, me = L[eu], ele = L[adv];
    if (!me || !ele) return;

    // Topo
    const modo = d.modo || 'amistoso';
    document.getElementById('arena-modo').innerHTML = `${d.torneio ? `🏆 ${esc(d.torneio.nome || 'Torneio')} · ` : ''}${NOMES_MODO[modo]}${descricaoAposta(d) ? ` · 💰 ${descricaoAposta(d)} cada` : ''}${arena.espectadores ? ` · <span class="arena-assistindo">👀 ${arena.espectadores} assistindo</span>` : ''}${arena.espectador ? ' · <strong>Você está assistindo</strong>' : ''}`;
    let situacao;
    if (e.status === 'finalizada') situacao = 'Batalha encerrada';
    else if (arena.espectador) situacao = e.pausada ? '⏸️ Pausada' : (e.fase === 'reacao' ? `${esc(L[outro(e, e.vez)].nome)} está reagindo...` : `Vez de ${esc(L[e.vez].nome)}`);
    else if (e.pausada) situacao = '⏸️ Pausada — aguardando os dois ninjas na arena';
    else if (e.fase === 'reacao') situacao = adv === e.vez ? '⚠️ Reaja ao ataque!' : `Aguardando ${esc(ele.nome)} reagir...`;
    else situacao = e.vez === eu ? '🔥 Sua vez!' : `Vez de ${esc(ele.nome)}...`;
    document.getElementById('arena-situacao').innerHTML = `Turno ${e.turno} · ${situacao}`;

    // Lutadores
    // (os quadros dos lutadores são reaproveitados, para as animações não serem cortadas)
    const cont = document.getElementById('arena-lutadores');
    if (cont.dataset.uids !== eu + ',' + adv) {
        cont.innerHTML = `<div class="arena-lutador eu" data-uid="${esc(eu)}"></div><div class="arena-vs">VS</div><div class="arena-lutador oponente" data-uid="${esc(adv)}"></div>`;
        cont.dataset.uids = eu + ',' + adv;
    }
    const naVez = (uid) => e.status === 'em_andamento' && ((e.fase === 'acao' && e.vez === uid) || (e.fase === 'reacao' && e.vez !== uid));
    [[eu, me, true], [adv, ele, false]].forEach(([uid, l, souEu]) => {
        const el = cont.querySelector(`[data-uid="${CSS.escape(uid)}"]`);
        el.classList.toggle('na-vez', naVez(uid));
        const aura = auraDoLutador(l);
        [...el.classList].filter(c => c.startsWith('aura-')).forEach(c => { if (c !== 'aura-' + aura) el.classList.remove(c); });
        if (aura) el.classList.add('aura-' + aura);
        el.classList.toggle('em-genjutsu', !!genjutsuAtivo(l));
        el.classList.toggle('em-chamas', (l.efeitos || []).some(x => x.tipo === 'chamas'));
        // Criação que diminuiu: anima a ficha
        const antes = Object.fromEntries([...el.querySelectorAll('[data-criacao]')].map(f => [f.dataset.criacao, Number(f.querySelector('strong')?.textContent) || 0]));
        el.innerHTML = cartaoLutador(l, souEu && !arena.espectador, naVez(uid));
        el.querySelectorAll('[data-criacao]').forEach(f => { if ((antes[f.dataset.criacao] || 0) > Number(f.querySelector('strong').textContent)) f.classList.add('quebrou'); else if (!(f.dataset.criacao in antes)) f.classList.add('surgiu'); });
    });

    // Mesa de cartas (só redesenha quando há jogada nova)
    renderMesa(d, eu, adv);

    // Painel central
    const painel = document.getElementById('arena-painel');
    if (arena.espectador) painel.innerHTML = (e.status === 'finalizada' ? htmlResultado(d, eu) : '') + htmlEspectador(d);
    else if (e.status === 'finalizada') painel.innerHTML = htmlResultado(d, eu);
    else if (e.pausada) painel.innerHTML = `<div class="arena-aviso">⏸️ A batalha está pausada porque um dos ninjas saiu da arena. Ela continua de onde parou quando os dois voltarem.</div>`;
    else if (e.fase === 'reacao' && e.vez === adv) { painel.innerHTML = htmlReacao(e, me); preencherCartaDaAmeaca(e.ataquePendente); }
    else if (e.fase === 'acao' && e.vez === eu) painel.innerHTML = htmlAcoes(e, me);
    else painel.innerHTML = `<div class="arena-aviso"><i class="fa-solid fa-hourglass-half" aria-hidden="true"></i> ${e.fase === 'reacao' ? `${esc(ele.nome)} está reagindo ao seu ataque...` : `${esc(ele.nome)} está fazendo a jogada...`}</div>`;

    // Rodapé
    const rodape = document.getElementById('arena-rodape');
    if (arena.espectador) {
        rodape.innerHTML = `<button class="btn-post" onclick="window.sairDaArena()"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Sair da plateia</button>
            ${ehKage() && e.status !== 'finalizada' ? `<button class="btn-arena-sec perigo" onclick="window.anularLuta(${jsArg(arena.id)})">⚖️ Anular luta (Kage)</button>` : ''}`;
    } else if (e.status === 'finalizada') {
        rodape.innerHTML = `<button class="btn-post" onclick="window.sairDaArena()"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Voltar ao lobby</button>`;
    } else {
        let empate = `<button class="btn-arena-sec" onclick="window.arenaAcao('propor_empate')">🤝 Propor empate</button>`;
        if (e.propostaEmpate === adv) empate = `<span class="arena-proposta">${esc(ele.nome)} propôs empate:</span><button class="btn-arena-sec" onclick="window.arenaAcao('aceitar_empate')">Aceitar</button><button class="btn-arena-sec" onclick="window.arenaAcao('recusar_empate')">Recusar</button>`;
        else if (e.propostaEmpate === eu) empate = `<span class="arena-proposta">Empate proposto. Aguardando resposta...</span>`;
        rodape.innerHTML = `
            ${e.fase === 'acao' && e.vez === eu && !e.pausada ? `<button class="buy-btn arena-btn-passar" onclick="window.arenaAcao('passar')"><i class="fa-solid fa-forward" aria-hidden="true"></i> Passar turno</button>` : ''}
            <div class="arena-rodape-sec">${empate}<button class="btn-arena-sec perigo" onclick="window.arenaDesistir()">🏳️ Desistir</button><button class="btn-arena-sec" onclick="window.sairDaArena()" title="Sair da arena (a luta fica pausada)">Sair</button></div>`;
    }

    // Histórico
    const log = document.getElementById('arena-log');
    const hist = d.historico || [];
    if (log.dataset.qtd !== String(hist.length)) {
        log.innerHTML = hist.filter(h => h.texto).map(h => `<div class="log-item log-${h.tipo}${h.de === eu ? ' log-meu' : ''}">${esc(h.texto)}</div>`).join('');
        log.dataset.qtd = String(hist.length);
        log.scrollTop = log.scrollHeight;
    }
    atualizarCronometro(e);
}

const ICONE_FUNCAO = { ataque: '⚔️', defesa: '🛡️', esquiva: '💨', suporte: '✨', modo: '🌀', item: '🎒', receber: '🎯', criacao: '🌳', kai: '✋', espelho: '🪞' };
// Imagem da carta (a mesma da loja/inventário). Se não tiver ou falhar, mostra o ícone da função.
function imgCarta(src, funcao, iconeProprio) {
    const icone = iconeProprio || ICONE_FUNCAO[funcao] || '⚔️';
    return `<span class="carta-img" data-icone="${icone}">${src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
}

function custoTexto(c) {
    return [c.chakra ? `${c.chakra} CP` : '', c.stamina ? `${c.stamina} SP` : ''].filter(Boolean).join(' · ') || 'sem custo';
}

// Quantas vezes dá para usar com o chakra/stamina atuais (null = sem custo)
function usosPossiveis(me, c) {
    const u = [];
    if (c.chakra > 0) u.push(Math.floor(me.chakra / c.chakra));
    if (c.stamina > 0) u.push(Math.floor(me.stamina / c.stamina));
    return u.length ? Math.max(0, Math.min(...u)) : null;
}
const seloUsos = (n) => `<span class="carta-usos" title="Quantas vezes dá para usar com o chakra/stamina atuais">${n === null ? '∞' : '×' + n}</span>`;
const NOME_FUNCAO = { ataque: 'Ataque', defesa: 'Defesa', esquiva: 'Esquiva', suporte: 'Suporte', modo: 'Modo', criacao: 'Criação', kai: 'Contra-Genjutsu', espelho: 'Reflexo' };
// Nome dos jutsus exigidos (procura nos jutsus do jogador; se não achar, mostra o id)
function nomesDosRequisitos(j) {
    return requisitosDoJutsu(j).map(id => arena.jutsus.find(x => x.id === id)?.nome || id).join(' ou ');
}

function htmlAcoes(e, me) {
    const semAcoes = e.acoesRestantes <= 0;
    const semAtaque = e.ataquesRestantes <= 0;
    const gen = genjutsuAtivo(me);
    const paralisado = gen?.efeitoGenjutsu === 'paralisia';
    const jutsus = [];
    // Ataque Básico (sempre disponível)
    const basico = { id: '_basico', nome: 'Ataque Básico', funcao: 'ataque', categoria: 'taijutsu', poder: 0, stamina: 5, rank: 'E' };
    const motivoBasico = paralisado ? 'Preso no genjutsu' : (semAcoes ? 'Sem ações' : (semAtaque ? 'Já atacou neste turno' : (me.stamina < 5 ? 'Sem stamina' : '')));
    jutsus.push(`<button class="arena-carta ataque" ${motivoBasico ? 'disabled' : ''} onclick="window.arenaUsarJutsu(-1)">
        ${imgCarta(null, 'ataque')}${seloUsos(usosPossiveis(me, { chakra: 0, stamina: 5 }))}<strong>Ataque Básico</strong><span class="carta-dano">💥 ${previaAtaque(me, basico, 1, 0).dano}</span>
        <span class="carta-info">5 SP · Força</span>${motivoBasico ? `<span class="carta-motivo">${motivoBasico}</span>` : ''}</button>`);

    // Todos os jutsus aprendidos, em ordem alfabética
    arena.jutsus.map((j, i) => ({ j, i })).sort((a, b) => String(a.j.nome).localeCompare(String(b.j.nome))).forEach(({ j, i }) => {
        const f = funcaoDoJutsu(j);
        const c = custosDoJutsu(j);
        const usos = usosPossiveis(me, c);
        let motivo = '', detalhe = '', destaque = '';
        const faltaRequisito = !requisitoAtendido(me, j) ? `Requer ${nomesDosRequisitos(j)} ativo` : '';
        if (!usoNaArena(j)) {
            destaque = 'Utilitário';
            motivo = 'Sem uso na arena';
        } else if (f === 'kai') {
            const custoKai = { chakra: c.chakra + (gen ? numero(gen.custoKai) : 0), stamina: c.stamina };
            destaque = '✋ Quebra genjutsu';
            detalhe = `${custoTexto(custoKai)}${gen ? '' : ' + custo do genjutsu'} · Reação ${numero(j.reacao_minima) || 5}+`;
            motivo = !gen ? 'Só quando preso num genjutsu' : (semAcoes ? 'Sem ações' : (me.chakra < custoKai.chakra ? 'Sem chakra' : ''));
        } else if (f === 'espelho') {
            destaque = '🪞 Devolve genjutsu';
            detalhe = custoTexto(c) + ' + custo do genjutsu';
            motivo = 'Usado ao reagir a genjutsu';
        } else if (f === 'criacao') {
            const g = (me.criacoes || []).find(x => x.id === (j.id || j.nome));
            const max = Math.max(1, numero(j.criacao_max) || numero(j.multiplicador_maximo) || 1);
            destaque = `${j.criacao_icone || '🌀'} ${poderDoJutsu(j) ? `💥 ${poderDoJutsu(j)} cada` : 'Criação'}${numero(j.criacao_absorve) ? ` · 🛡️ ${numero(j.criacao_absorve)}` : ''}`;
            detalhe = `${custoTexto(c)} cada · até ${max}${g ? ` (${g.qtd} no campo)` : ''}`;
            motivo = paralisado ? 'Preso no genjutsu' : faltaRequisito || (semAcoes ? 'Sem ações' : (g && g.qtd >= max ? 'No máximo' : (usos === 0 ? 'Sem chakra/stamina' : '')));
        } else if (f === 'defesa' || f === 'esquiva') {
            motivo = 'Usado ao reagir';
            destaque = f === 'defesa' ? `🛡️ absorve ${me.atributos.defesa + bonusAtivos(me).defesa + poderDoJutsu(j)}` : `💨 +${poderDoJutsu(j)} Velocidade`;
            detalhe = custoTexto(c);
        } else if (f === 'ataque') {
            const nec = necessidadesDoJutsu(j);
            destaque = `💥 ${previaAtaque(me, j, 1, 0).dano}${numero(j.multiplicador_maximo) > 1 ? ` ×até ${numero(j.multiplicador_maximo)}` : ''}`;
            detalhe = `${custoTexto(c)} · Reação ${nec.reacao} · Vel. ${nec.velocidade}`;
            if (String(j.categoria).toLowerCase() === 'genjutsu') destaque += ' · 👁️ Genjutsu';
            if (numero(j.chamas_por_turno)) destaque += ` · 🔥 ${numero(j.chamas_por_turno)}/turno`;
            motivo = paralisado ? 'Preso no genjutsu' : faltaRequisito || (semAcoes ? 'Sem ações' : (semAtaque ? 'Já atacou neste turno' : (usos === 0 ? 'Sem chakra/stamina' : '')));
            if (!motivo && numero(j.chamas_por_turno) && (me.efeitos || []).some(x => x.tipo === 'manter_chamas')) motivo = 'Chamas já ativas';
        } else {
            const ativo = f === 'modo' && (me.efeitos || []).some(x => x.id === (j.id || j.nome));
            const b = Object.entries(bonusDoJutsu(j)).map(([k, v]) => `+${v} ${nomeBonus(k)}`);
            if (numero(j.clones) || String(j.efeito).toLowerCase() === 'clones') b.push(`${numero(j.clones) || poderDoJutsu(j)} clones`);
            if (numero(j.cura) || String(j.efeito).toLowerCase() === 'cura') b.push(`+${numero(j.cura) || poderDoJutsu(j)} Vida`);
            destaque = `${f === 'modo' ? '🌀' : '✨'} ${b.join(', ') || NOME_FUNCAO[f]}`;
            detalhe = `${custoTexto(c)}${numero(j.custo_por_turno) ? ` · ${numero(j.custo_por_turno)} CP/turno` : ''}`;
            motivo = ativo ? 'Ativo' : (paralisado ? 'Preso no genjutsu' : faltaRequisito || (semAcoes ? 'Sem ações' : (usos === 0 ? 'Sem chakra/stamina' : '')));
        }
        jutsus.push(`<button class="arena-carta ${usoNaArena(j) ? f : 'inativa'}" ${motivo ? 'disabled' : ''} onclick="window.arenaUsarJutsu(${i})">
            ${imgCarta(j.imagem, f)}${seloUsos(usos)}<strong>${esc(j.nome)}</strong><span class="carta-tag">${esc(destaque)}</span>
            <span class="carta-info">${esc(detalhe)}</span>${motivo ? `<span class="carta-motivo">${esc(motivo)}</span>` : ''}</button>`);
    });

    // Todo o inventário, com a quantidade
    const itens = todosItensDoInventario().sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map(it => {
        const ehAtaque = it.tipoItem === 'ferramenta';
        const c = custosDoJutsu(it);
        let destaque, motivo = '';
        if (!it.usavel) { destaque = (typeof it.efeito === 'string' && it.efeito) || (it.type === 'tool' ? 'Ferramenta' : 'Item'); motivo = 'Sem uso em batalha'; }
        else if (paralisado) { destaque = 'Preso no genjutsu'; motivo = 'Preso no genjutsu'; }
        else if (ehAtaque) { destaque = `💥 ${previaAtaque(me, it, 1, 0).dano}${numero(it.multiplicador_maximo) > 1 ? ` ×até ${numero(it.multiplicador_maximo)}` : ''}`; motivo = semAcoes ? 'Sem ações' : (semAtaque ? 'Já atacou neste turno' : (me.stamina < c.stamina ? 'Sem stamina' : '')); }
        else { const vida = numero(it.cura) || numero(it.bonus_hp), ck = numero(it.recupera_chakra) || numero(it.bonus_chakra), sp = numero(it.recupera_stamina) || numero(it.bonus_stamina); destaque = [vida && `+${vida} Vida`, ck && `+${ck} Chakra`, sp && `+${sp} Stamina`].filter(Boolean).join(', '); motivo = semAcoes ? 'Sem ações' : ''; }
        return `<button class="arena-carta ${it.usavel ? (ehAtaque ? 'ataque' : 'item') : 'inativa'}" ${motivo ? 'disabled' : ''} onclick="window.arenaUsarItem('${esc(it.id)}')">
            ${imgCarta(it.imagem, ehAtaque ? 'ataque' : 'item')}<span class="carta-usos" title="Quantidade no inventário">x${it.qtd}</span><strong>${esc(it.nome)}</strong><span class="carta-tag">${esc(destaque)}</span>
            <span class="carta-info">${it.usavel ? (it.recuperavel ? 'Recuperável' : 'Gasta ao usar') + (c.stamina ? ` · ${c.stamina} SP` : '') : ''}</span>${motivo ? `<span class="carta-motivo">${esc(motivo)}</span>` : ''}</button>`;
    });

    const modosAtivos = (me.efeitos || []).filter(x => x.tipo === 'modo').map(x =>
        `<button class="btn-arena-sec" onclick="window.arenaDesativar('${esc(x.id)}')">⏹️ Desativar ${esc(x.nome)}</button>`).join('')
        + ((me.efeitos || []).some(x => x.tipo === 'manter_chamas') ? `<button class="btn-arena-sec" onclick="window.arenaApagarChamas()">🔥 Apagar chamas</button>` : '');

    // Criações no campo: atacar com elas ou desfazer
    const criacoes = (me.criacoes || []).map(g => {
        const motivo = paralisado ? 'Preso no genjutsu' : (!g.poder ? 'Não causam dano' : (semAcoes ? 'Sem ações' : (semAtaque ? 'Já atacou neste turno' : '')));
        return `<div class="arena-criacao">
            <button class="arena-carta ataque" ${motivo ? 'disabled' : ''} onclick="window.arenaAtacarComCriacao('${esc(g.id)}')">
                ${imgCarta(g.img, 'ataque', g.icone)}<span class="carta-usos" title="Quantas estão no campo">x${g.qtd}</span><strong>Atacar com ${esc(g.nome)}</strong>
                <span class="carta-tag">💥 ${g.poder * g.qtd}${g.qtd > 1 ? ` (${g.poder} cada)` : ''}</span><span class="carta-info">Sem custo · ${esc(g.jutsuNome)}</span>${motivo ? `<span class="carta-motivo">${esc(motivo)}</span>` : ''}</button>
            <button class="btn-arena-sec" onclick="window.arenaDesfazerCriacao('${esc(g.id)}')">💨 Desfazer</button></div>`;
    }).join('');

    // Em chamas: só uma defesa Rank S apaga
    const chamas = (me.efeitos || []).find(x => x.tipo === 'chamas');
    let avisoChamas = '';
    if (chamas) {
        const defesasS = arena.jutsus.map((j, i) => ({ j, i })).filter(({ j }) => funcaoDoJutsu(j) === 'defesa' && usoNaArena(j) && nivelDoRank(j.rank) >= nivelDoRank('S'));
        avisoChamas = `<div class="arena-aviso aviso-chamas">🔥 Você está em chamas (${esc(chamas.nome)}): −${chamas.danoPorTurno} de Vida por turno até quem lançou apagar. Só uma defesa de Rank S apaga.
            ${defesasS.map(({ j, i }) => `<button class="btn-arena-sec" ${!requisitoAtendido(me, j) || semAcoes ? 'disabled' : ''} onclick="window.arenaApagarChamas(${i})">🛡️ Apagar com ${esc(j.nome)} (${esc(custoTexto(custosDoJutsu(j)))})</button>`).join('')}</div>`;
    }
    const avisoGen = gen ? `<div class="arena-aviso aviso-genjutsu">👁️ Você está preso no genjutsu <strong>${esc(gen.nome)}</strong>${paralisado ? ': não pode agir nem reagir' : (gen.efeitoGenjutsu === 'sem_reacao' ? ': não consegue reagir a ataques' : ': Reação e Velocidade reduzidas')}. Use o Contra-Genjutsu (Kai), espere passar ou leve um golpe forte (a dor quebra a ilusão).</div>` : '';
    return `
        ${avisoGen}${avisoChamas}
        <div class="arena-contador">Ações: <strong>${e.acoesRestantes}/${ARENA.acoesPorTurno}</strong> · Ataque: <strong>${semAtaque ? 'já usado' : 'disponível'}</strong></div>
        ${criacoes ? `<h4 class="arena-secao">🌳 No campo</h4><div class="arena-cartas">${criacoes}</div>` : ''}
        <h4 class="arena-secao">📜 Seus jutsus (${arena.jutsus.length})</h4><div class="arena-cartas">${jutsus.join('')}</div>
        <h4 class="arena-secao">🎒 Seu inventário (${itens.length})</h4><div class="arena-cartas">${itens.join('') || '<p class="arena-vazio">Inventário vazio.</p>'}</div>
        ${modosAtivos ? `<div class="arena-modos-ativos">${modosAtivos}</div>` : ''}`;
}

function htmlReacao(e, me) {
    const atk = e.ataquePendente;
    const av = avaliarReacao(me, atk);
    const atacante = e.lutadores[atk.de];
    const opcoes = [];
    const vidaApos = (dano) => Math.max(0, me.vida - dano);
    opcoes.push(`<button class="arena-carta receber" onclick="window.arenaReagir('receber')">${imgCarta(null, 'receber')}<strong>Receber o golpe</strong><span class="carta-dano">−${atk.dano} Vida</span><span class="carta-info">fica com ${vidaApos(atk.dano)}</span></button>`);
    if (av.percebe) {
        if (av.podeEsquivar) {
            const r = resultadoEsquiva(av.velocidade, atk.velocidadeNecessaria);
            opcoes.push(`<button class="arena-carta esquiva" onclick="window.arenaReagir('esquivar')">${imgCarta(null, 'esquiva')}<strong>${atk.genjutsu ? 'Desviar o olhar' : 'Esquivar'}</strong><span class="carta-tag">Velocidade ${av.velocidade} × ${atk.velocidadeNecessaria}</span><span class="carta-info">${esc(r.texto)} (−${Math.round(atk.dano * r.fator)})</span></button>`);
        }
        if (av.podeDefenderFisico) {
            const dano = Math.max(0, atk.dano - av.defesaBase);
            opcoes.push(`<button class="arena-carta defesa" onclick="window.arenaReagir('defender')">${imgCarta(null, 'defesa')}<strong>Defender (físico)</strong><span class="carta-tag">absorve ${av.defesaBase}</span><span class="carta-info">−${dano} Vida</span></button>`);
        }
        // Criações que seguram golpes (cada uma absorve um valor e se quebra)
        (me.criacoes || []).filter(g => g.absorve > 0 && !atk.genjutsu).forEach(g => {
            const usadas = Math.min(g.qtd, Math.max(1, Math.ceil(atk.dano / g.absorve)));
            const dano = Math.max(0, atk.dano - usadas * g.absorve);
            opcoes.push(`<button class="arena-carta defesa" onclick="window.arenaReagir('criacao', undefined, '${esc(g.id)}')">${imgCarta(g.img, 'defesa', g.icone)}<span class="carta-usos">x${g.qtd}</span><strong>Bloquear com ${esc(g.nome)}</strong><span class="carta-tag">quebra ${usadas} · absorve ${usadas * g.absorve}</span><span class="carta-info">−${dano} Vida · sem custo</span></button>`);
        });
        arena.jutsus.forEach((j, i) => {
            const f = funcaoDoJutsu(j);
            if (!usoNaArena(j)) return;
            const c = custosDoJutsu(j);
            if (f === 'espelho') {
                if (!atk.genjutsu) return;
                const total = { chakra: c.chakra + numero(atk.genjutsu.custo), stamina: c.stamina };
                const rankOk = numero(atk.genjutsu.nivel) <= nivelDoRank(j.espelho_rank_max || 'A');
                const podeUsar = rankOk && ((me.efeitos || []).some(x => x.tipo === 'modo') || av.reacao >= (numero(j.reacao_minima) || 5)) && me.chakra >= total.chakra && requisitoAtendido(me, j);
                opcoes.push(`<button class="arena-carta espelho" ${podeUsar ? '' : 'disabled'} onclick="window.arenaReagir('espelho', ${i})">${imgCarta(j.imagem, 'espelho')}<strong>${esc(j.nome)}</strong><span class="carta-tag">🪞 devolve a ilusão</span><span class="carta-info">${esc(custoTexto(total))}${rankOk ? '' : ' · Rank alto demais'}</span></button>`);
                return;
            }
            if (f !== 'esquiva' && f !== 'defesa') return;
            const semRecurso = me.chakra < c.chakra || me.stamina < c.stamina || !requisitoAtendido(me, j);
            if (f === 'esquiva') {
                if (!av.podeEsquivar) return;
                const vel = av.velocidade + poderDoJutsu(j);
                const r = resultadoEsquiva(vel, atk.velocidadeNecessaria);
                opcoes.push(`<button class="arena-carta esquiva" ${semRecurso ? 'disabled' : ''} onclick="window.arenaReagir('esquivar', ${i})">${imgCarta(j.imagem, 'esquiva')}<strong>${esc(j.nome)}</strong><span class="carta-tag">Velocidade ${vel} × ${atk.velocidadeNecessaria}</span><span class="carta-info">${esc(r.texto)} · ${esc(custoTexto(c))}</span></button>`);
            } else {
                const abs = av.defesaBase + poderDoJutsu(j);
                opcoes.push(`<button class="arena-carta defesa" ${semRecurso ? 'disabled' : ''} onclick="window.arenaReagir('defender', ${i})">${imgCarta(j.imagem, 'defesa')}<strong>${esc(j.nome)}</strong><span class="carta-tag">absorve ${abs}</span><span class="carta-info">−${Math.max(0, atk.dano - abs)} Vida · ${esc(custoTexto(c))}</span></button>`);
            }
        });
    }
    const avisos = [];
    if (!av.percebe) avisos.push(`Sua Reação (${av.reacao}) é menor que a necessária (${atk.reacaoNecessaria}): você não percebe o golpe a tempo.`);
    if (atk.impossivelEsquivar) avisos.push('Este ataque é impossível de esquivar.');
    if (atk.precisao) avisos.push(`A mira de ${atacante.nome} está travada: Precisão +${atk.precisao} (fica mais difícil perceber e escapar).`);
    if (atk.genjutsu) {
        const como = { paralisia: 'fica paralisado (não age nem reage)', sem_reacao: 'não consegue reagir a ataques', confusao: `perde ${atk.genjutsu.penalidade} de Reação e Velocidade` }[atk.genjutsu.efeito];
        avisos.push(`👁️ Genjutsu: se pegar, você ${como} por ${atk.genjutsu.turnos} turno${atk.genjutsu.turnos > 1 ? 's' : ''}. Não dá para bloquear com o corpo nem com clones.`);
    }
    if (atk.chamas) avisos.push(`🔥 Se acertar, você fica em chamas (−${atk.chamas.dano} por turno) até ${atacante.nome} apagar. Uma defesa Rank S apaga.`);
    if (av.presoNoGenjutsu) avisos.push('Você está preso num genjutsu e não consegue reagir.');
    if (me.clones?.qtd && me.clones.solidos && !atk.genjutsu) avisos.push(`Se você for atingido, um dos seus ${me.clones.qtd} clones recebe o golpe no seu lugar.`);
    return `
        <div class="arena-ameaca">
            <div class="arena-ameaca-carta" id="arena-ameaca-carta">${imgCarta(atk.carta?.img, 'ataque')}</div>
            <div class="arena-ameaca-titulo">⚠️ ${esc(atacante.nome)} usou <strong>${esc(atk.nome)}</strong>!</div>
            <div class="arena-ameaca-info">💥 ${atk.dano} de dano · Reação necessária ${atk.reacaoNecessaria} (você tem ${av.reacao}) · Velocidade necessária ${atk.velocidadeNecessaria} (você tem ${av.velocidade})</div>
            ${avisos.map(a => `<div class="arena-ameaca-aviso">${esc(a)}</div>`).join('')}
        </div>
        <div class="arena-cartas">${opcoes.join('')}</div>`;
}

function htmlResultado(d, eu) {
    const r = d.estado.resultado || {};
    let titulo, cls;
    if (d.status === 'anulada' || r.anulada) { titulo = '⚖️ Luta anulada pelo Kage'; cls = 'empate'; }
    else if (arena.espectador) { titulo = r.vencedor ? `🏆 ${d.estado.lutadores[r.vencedor]?.nome || 'Ninja'} venceu!` : '🤝 Empate'; cls = r.vencedor ? 'vitoria' : 'empate'; }
    else if (r.empate) { titulo = '🤝 Empate'; cls = 'empate'; }
    else if (r.vencedor === eu) { titulo = '🏆 Vitória!'; cls = 'vitoria'; }
    else { titulo = '💀 Derrota'; cls = 'derrota'; }
    const motivo = { vida: 'por nocaute', chakra: 'por esgotamento de chakra', desistencia: 'por desistência', acordo: 'por acordo', 'nocaute duplo': 'os dois caíram juntos', anulada: 'ninguém ganha nem perde; apostas e cofres são devolvidos' }[r.motivo] || '';
    let premio = '';
    const semPremio = arena.espectador || d.status === 'anulada' || r.anulada;
    if (semPremio) { /* plateia ou luta anulada: nada a mostrar aqui */ }
    else if (d.modo === 'rankeada') premio = r.empate ? 'Rankeada: sem alteração de pontos.' : (r.vencedor === eu ? `+${ARENA.pontosVitoria} pontos de Rankeada` : `−${ARENA.pontosDerrota} pontos de Rankeada`);
    if (d.modo === 'competitivo' && d.aposta) {
        const total = Object.values(d.cofre || {}).reduce((a, b) => a + numero(b), 0);
        premio = r.empate ? `Cada um recebe sua aposta de volta (${formatarNum(d.aposta.valor)} ${NOMES_MOEDA[d.aposta.moeda]}).`
            : (r.vencedor === eu ? (d.aposta.moeda === 'ryos'
                ? `Você levou o cofre: +${formatarNum(total - Math.floor(total / 20))} Ryos (5% foram para o Cofre da Vila)`
                : `Você levou o cofre: +${formatarNum(total)} ${NOMES_MOEDA[d.aposta.moeda]}`) : `Você perdeu ${formatarNum(d.aposta.valor)} ${NOMES_MOEDA[d.aposta.moeda]}.`);
    }
    return `<div class="arena-resultado ${cls}"><div class="arena-resultado-titulo">${titulo}</div><div>${esc(motivo)}</div>${premio ? `<div class="arena-resultado-premio">${esc(premio)}</div>` : ''}</div>`;
}

// ---------------- 7. Botões da arena ----------------
const confirmaEsgotar = (me, chakra) => me.chakra - chakra > 0 || confirm(`⚠️ Isso vai esgotar todo o seu chakra e você vai desmaiar (derrota). Usar mesmo assim?`);
window.arenaAcao = (tipo) => enviarAcao({ tipo });
window.arenaDesistir = () => { if (confirm("Desistir da batalha? Isso conta como derrota.")) enviarAcao({ tipo: 'desistir' }); };
window.arenaDesativar = (id) => enviarAcao({ tipo: 'desativar', efeitoId: id });

window.arenaUsarJutsu = (i) => {
    const e = arena.dados.estado, me = e.lutadores[minhaUid()];
    const j = i === -1 ? { id: '_basico', nome: 'Ataque Básico', funcao: 'ataque', categoria: 'taijutsu', poder: 0, stamina: 5, rank: 'E' } : arena.jutsus[i];
    if (!j) return;
    const f = funcaoDoJutsu(j);
    const ehAtaque = f === 'ataque';
    if (f === 'kai') { if (!confirmaEsgotar(me, custosDoJutsu(j).chakra + numero(genjutsuAtivo(me)?.custoKai))) return; return enviarAcao({ tipo: 'kai', jutsu: j }); }
    if (f === 'criacao') {
        const g = (me.criacoes || []).find(x => x.id === (j.id || j.nome));
        const livre = Math.max(1, numero(j.criacao_max) || numero(j.multiplicador_maximo) || 1) - (g?.qtd || 0);
        if (livre > 1) return abrirConfigAtaque({ tipo: 'criar', jutsu: j, livre });
        if (!confirmaEsgotar(me, custosDoJutsu(j).chakra)) return;
        return enviarAcao({ tipo: 'jutsu', jutsu: j, cargas: 1 });
    }
    if (ehAtaque && (numero(j.multiplicador_maximo) > 1 || me.clones?.qtd)) return abrirConfigAtaque({ tipo: 'jutsu', jutsu: j });
    if (!confirmaEsgotar(me, custosDoJutsu(j).chakra)) return;
    enviarAcao({ tipo: 'jutsu', jutsu: j });
};
window.arenaUsarItem = async (id) => {
    const it = itensDaArena().find(x => x.id === id);
    if (!it) return;
    const e = arena.dados.estado, me = e.lutadores[minhaUid()];
    if (it.tipoItem === 'ferramenta' && (numero(it.multiplicador_maximo) > 1 || me.clones?.qtd)) return abrirConfigAtaque({ tipo: 'item', item: it });
    await usarItem(it, {});
};
async function usarItem(it, extra) {
    const ok = await enviarAcao({ tipo: 'item', item: it, ...extra });
    if (!ok || it.recuperavel) return;
    // Item gasto sai do inventário (uma unidade por carga usada)
    const usados = Math.max(1, numero(extra.cargas) || 1);
    for (let k = 0; k < usados; k++) {
        try { await updateDoc(doc(db, "users", minhaUid()), { [`inventario.${it.id}`]: increment(-1), ultimoConsumo: it.id }); } catch (err) { console.error(err); }
    }
}

// Janela para escolher cargas (multiplicador) e clones de um ataque
function abrirConfigAtaque(acao) {
    arena.ataqueEmConfig = acao;
    const me = arena.dados.estado.lutadores[minhaUid()];
    // Criar unidades (raízes, pedras...) ou atacar com as que já estão no campo: só escolhe a quantidade
    if (acao.tipo === 'criar' || acao.tipo === 'criacao_atacar') {
        const max = acao.tipo === 'criar' ? acao.livre : acao.grupo.qtd;
        const nome = acao.tipo === 'criar' ? (acao.jutsu.criacao_nome || 'unidades') : acao.grupo.nome;
        document.getElementById('config-ataque-nome').innerText = acao.tipo === 'criar' ? acao.jutsu.nome : `Atacar com ${nome}`;
        document.getElementById('config-ataque-cargas-rotulo').innerText = acao.tipo === 'criar' ? `Quantas ${nome} criar (até ${max})` : `Quantas ${nome} atacam (até ${max})`;
        const cargas = document.getElementById('config-ataque-cargas');
        cargas.max = max; cargas.value = max;
        document.getElementById('config-ataque-cargas-grupo').style.display = '';
        document.getElementById('config-ataque-clones-grupo').style.display = 'none';
        document.getElementById('config-ataque-clones').max = 0; document.getElementById('config-ataque-clones').value = 0;
        document.getElementById('config-ataque-clones-aviso').textContent = '';
        window.atualizarConfigAtaque();
        document.getElementById('modal-config-ataque').style.display = 'flex';
        return;
    }
    document.getElementById('config-ataque-cargas-rotulo').innerText = 'Cargas (repetições)';
    const j = acao.jutsu || acao.item;
    const maxCargas = Math.max(1, numero(j.multiplicador_maximo) || 1);
    const maxCargasItem = acao.item && !acao.item.recuperavel ? Math.min(maxCargas, acao.item.qtd) : maxCargas;
    document.getElementById('config-ataque-nome').innerText = j.nome;
    const cargas = document.getElementById('config-ataque-cargas');
    cargas.max = maxCargasItem; cargas.value = 1;
    document.getElementById('config-ataque-cargas-grupo').style.display = maxCargasItem > 1 ? '' : 'none';
    // Só entram os clones que a reserva de chakra deles consegue pagar
    const custoClone = Math.max(custosDoJutsu(j).chakra, ARENA.custoMinimoClone);
    const clonesPagaveis = Math.min(me.clones?.qtd || 0, Math.floor((me.clones?.reserva || 0) / custoClone));
    const clones = document.getElementById('config-ataque-clones');
    clones.max = clonesPagaveis; clones.value = clonesPagaveis;
    clones.disabled = clonesPagaveis === 0;
    document.getElementById('config-ataque-clones-grupo').style.display = me.clones?.qtd ? '' : 'none';
    document.getElementById('config-ataque-clones-aviso').textContent = me.clones?.qtd && clonesPagaveis < me.clones.qtd
        ? `A reserva dos clones (${me.clones.reserva} CP) paga ${clonesPagaveis} de ${me.clones.qtd} clones neste golpe (${custoClone} CP cada).` : '';
    window.atualizarConfigAtaque();
    document.getElementById('modal-config-ataque').style.display = 'flex';
}
window.atualizarConfigAtaque = () => {
    const acao = arena.ataqueEmConfig; if (!acao) return;
    const j = acao.jutsu || acao.item;
    const me = arena.dados.estado.lutadores[minhaUid()];
    const cargas = Math.max(1, Math.min(numero(document.getElementById('config-ataque-cargas').max) || 1, Math.floor(numero(document.getElementById('config-ataque-cargas').value)) || 1));
    const clones = Math.max(0, Math.min(numero(document.getElementById('config-ataque-clones').max) || 0, Math.floor(numero(document.getElementById('config-ataque-clones').value)) || 0));
    if (acao.tipo === 'criar') {
        const c = custosDoJutsu(acao.jutsu);
        const p = { chakra: c.chakra * cargas, stamina: c.stamina * cargas };
        document.getElementById('config-ataque-previa').innerHTML = `${esc(acao.jutsu.criacao_icone || '🌀')} <strong>${cargas}</strong> ${esc(acao.jutsu.criacao_nome || 'unidades')} no campo${poderDoJutsu(acao.jutsu) ? ` (💥 ${poderDoJutsu(acao.jutsu)} cada)` : ''}${numero(acao.jutsu.criacao_absorve) ? ` · cada uma absorve ${numero(acao.jutsu.criacao_absorve)}` : ''}<br>Custo: ${p.chakra} CP · ${p.stamina} SP`;
        return { cargas, clones: 0, p };
    }
    if (acao.tipo === 'criacao_atacar') {
        const p = { chakra: 0, stamina: 0, dano: acao.grupo.poder * cargas + bonusAtivos(me).ataque };
        document.getElementById('config-ataque-previa').innerHTML = `💥 <strong>${p.dano}</strong> de dano (${cargas} × ${acao.grupo.poder})<br>Sem custo: elas continuam no campo.`;
        return { cargas, clones: 0, p };
    }
    const p = previaAtaque(me, j, cargas, clones);
    document.getElementById('config-ataque-previa').innerHTML =
        `💥 <strong>${p.dano}</strong> de dano (${p.golpes} golpe${p.golpes > 1 ? 's' : ''} de ${p.porGolpe})<br>Custo: ${p.chakra} CP · ${p.stamina} SP${clones ? ` · clones gastam ${p.custoClones} CP da reserva (${me.clones.reserva})` : ''}`;
    return { cargas, clones, p };
};
window.confirmarConfigAtaque = async () => {
    const acao = arena.ataqueEmConfig; if (!acao) return;
    const { cargas, clones, p } = window.atualizarConfigAtaque();
    const me = arena.dados.estado.lutadores[minhaUid()];
    if (!confirmaEsgotar(me, p.chakra)) return;
    document.getElementById('modal-config-ataque').style.display = 'none';
    arena.ataqueEmConfig = null;
    if (acao.tipo === 'item') await usarItem(acao.item, { cargas, clones });
    else if (acao.tipo === 'criacao_atacar') await enviarAcao({ tipo: 'criacao_atacar', criacaoId: acao.grupo.id, qtd: cargas });
    else if (acao.tipo === 'criar') await enviarAcao({ tipo: 'jutsu', jutsu: acao.jutsu, cargas });
    else await enviarAcao({ tipo: 'jutsu', jutsu: acao.jutsu, cargas, clones });
};

window.arenaReagir = (opcao, i, criacaoId) => {
    const j = i === undefined || i === null ? null : arena.jutsus[i];
    const me = arena.dados.estado.lutadores[minhaUid()];
    if (j && !confirmaEsgotar(me, custosDoJutsu(j).chakra)) return;
    enviarAcao({ tipo: 'reagir', opcao, jutsu: j, ...(criacaoId ? { criacaoId } : {}) });
};
window.arenaApagarChamas = (i) => enviarAcao({ tipo: 'apagar_chamas', ...(i === undefined ? {} : { jutsu: arena.jutsus[i] }) });
window.arenaDesfazerCriacao = (id) => { if (confirm('Desfazer essas criações? Elas somem do campo.')) enviarAcao({ tipo: 'desfazer_criacao', criacaoId: id }); };
window.arenaAtacarComCriacao = (id) => {
    const g = (arena.dados.estado.lutadores[minhaUid()].criacoes || []).find(x => x.id === id);
    if (!g) return;
    if (g.qtd > 1) return abrirConfigAtaque({ tipo: 'criacao_atacar', grupo: g });
    enviarAcao({ tipo: 'criacao_atacar', criacaoId: id, qtd: 1 });
};

// ---------------- 9. Mesa de cartas e animações ----------------
// As cartas jogadas ficam paradas numa "mesa" embaixo de cada lutador (turno atual + anterior).
// As animações acontecem ali dentro, sem cobrir a tela e sem interferir no cronômetro.
const filaAnim = { itens: [], tocando: false };
const imgCache = {};
const animacoesReduzidas = () => document.body.classList.contains('menos-movimento')
    || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

// Descobre a imagem da carta: link salvo na jogada, ou busca no catálogo pelo id
async function imagemDaCarta(c) {
    if (!c) return null;
    if (c.img) return c.img;
    if (!c.jutsuId) return null;
    const chave = (c.tipoItem || 'jutsu') + ':' + c.jutsuId;
    if (chave in imgCache) return imgCache[chave];
    let src = null;
    if (c.tipoItem) src = globalItensMap[c.jutsuId]?.imagem || null;
    else {
        const minha = arena.jutsus.find(j => j.id === c.jutsuId);
        if (minha) src = minha.imagem || null;
        else { try { src = (await lerDoCatalogo("jutsus", c.jutsuId))?.imagem || null; } catch (e) { src = null; } }
    }
    imgCache[chave] = src;
    return src;
}

const RESULTADO_ATAQUE = {
    acerto: (d) => [`💥 Acertou −${d}`, 'acerto'], naopercebeu: (d) => [`💥 Acertou −${d}`, 'acerto'], esquiva_falhou: (d) => [`💥 Acertou −${d}`, 'acerto'],
    parcial: (d) => [`💥 Raspão −${d}`, 'parcial'], esquiva: () => ['💨 Esquivado', 'esquiva'],
    defesa: () => ['🛡️ Bloqueado', 'defesa'], defesa_parcial: (d) => [`🛡️ Passou −${d}`, 'parcial'], clone: () => ['💨 Acertou um clone', 'esquiva']
};
// Carta que representa a reação de quem foi atacado
function cartaDaReacao(h) {
    const r = h.resultado;
    if (h.defesa) return { ...h.defesa };
    if (r === 'esquiva' || r === 'parcial' || r === 'esquiva_falhou') return { nome: 'Esquiva', funcao: 'esquiva' };
    if (r === 'defesa' || r === 'defesa_parcial') return { nome: 'Defesa física', funcao: 'defesa' };
    if (r === 'clone') return { nome: 'Clone sólido', funcao: 'suporte', icone: '👥' };
    if (r === 'naopercebeu') return { nome: 'Não percebeu', funcao: 'receber' };
    return { nome: 'Recebeu o golpe', funcao: 'receber' };
}
const TEXTO_REACAO = {
    acerto: (d) => `−${d} Vida`, naopercebeu: (d) => `−${d} Vida`, esquiva_falhou: (d) => `Não escapou · −${d}`,
    parcial: (d) => `Raspão · −${d}`, esquiva: () => 'Escapou!', defesa: () => 'Bloqueou!', defesa_parcial: (d) => `Defendeu · −${d}`, clone: () => 'O clone recebeu o golpe'
};

function htmlCartaMesa(c, n, extra = {}) {
    const chave = c.jutsuId ? (c.tipoItem || 'jutsu') + ':' + c.jutsuId : '';
    const src = c.img || (chave && imgCache[chave]) || null;
    const funcao = c.funcao || 'ataque';
    return `<div class="mesa-carta funcao-${esc(funcao)}${extra.anterior ? ' anterior' : ''}" data-n="${n}"${extra.impactoN ? ` data-impacto-n="${extra.impactoN}"` : ''}${chave && !src ? ` data-busca-img="${esc(JSON.stringify({ jutsuId: c.jutsuId, tipoItem: c.tipoItem || null }))}"` : ''}>
        ${imgCarta(src, funcao, c.icone)}
        <div class="mesa-carta-nome">${esc(c.nome || 'Jutsu')}</div>
        ${extra.resumo ? `<div class="mesa-carta-resumo">${esc(extra.resumo)}</div>` : ''}
        ${extra.resultado ? `<div class="mesa-resultado r-${esc(extra.resultado[1])}">${esc(extra.resultado[0])}</div>` : ''}
    </div>`;
}

// Desenha a mesa a partir do histórico (só quando há jogada nova)
function renderMesa(d, eu, adv) {
    const mesa = document.getElementById('arena-mesa');
    if (!mesa) return;
    const hist = d.historico || [];
    const ultimoN = hist.length ? (hist[hist.length - 1].n || hist.length) : 0;
    const chave = `${ultimoN}|${eu},${adv}`;
    if (mesa.dataset.chave === chave) return;
    mesa.dataset.chave = chave;

    // Mostra o turno atual e o anterior
    const turnos = hist.map((h, i) => h.tipo === 'turno' ? i : -1).filter(i => i >= 0);
    const inicio = turnos.length >= 2 ? turnos[turnos.length - 2] : 0;
    const atual = turnos.length ? turnos[turnos.length - 1] : 0;
    const lados = { [eu]: [], [adv]: [] };
    const ataques = [];
    hist.slice(inicio).forEach((h, k) => {
        if (h.tipo !== 'anim' || !lados[h.anim === 'impacto' ? h.alvo : h.de]) return;
        const anterior = false; // (as cartas dos 2 últimos turnos ficam com o mesmo destaque)
        const n = h.n || (inicio + k + 1);
        if (h.anim === 'usar') {
            const item = { c: h.carta || {}, n, anterior, resumo: h.carta?.resumo || '' };
            lados[h.de].push(item);
            if ((h.carta?.funcao) === 'ataque') ataques.push({ item, de: h.de });
        } else {
            const alvo = [...ataques].reverse().find(x => x.de === h.de && !x.item.resultado);
            if (alvo) { alvo.item.resultado = (RESULTADO_ATAQUE[h.resultado] || RESULTADO_ATAQUE.acerto)(h.dano); alvo.item.impactoN = n; }
            lados[h.alvo].push({ c: cartaDaReacao(h), n, anterior, resumo: (TEXTO_REACAO[h.resultado] || TEXTO_REACAO.acerto)(h.dano), reacao: true });
        }
    });
    const L = d.estado.lutadores;
    const coluna = (uid) => `
        <div class="mesa-lado" data-uid="${esc(uid)}">
            <div class="mesa-titulo">${uid === eu && !arena.espectador ? 'Suas cartas' : 'Cartas de ' + esc(L[uid]?.nome || 'Ninja')}</div>
            <div class="mesa-cartas">${lados[uid].map(x => htmlCartaMesa(x.c, x.n, x)).join('') || '<span class="mesa-vazia">Nenhuma carta neste turno</span>'}</div>
        </div>`;
    mesa.innerHTML = coluna(eu) + '<div class="mesa-meio" aria-hidden="true"></div>' + coluna(adv);
    marcarAguardando([...(filaAnim.atual ? [filaAnim.atual] : []), ...filaAnim.itens]);

    // Imagens que precisam ser buscadas no catálogo (jutsus do oponente, imagens em base64)
    mesa.querySelectorAll('[data-busca-img]').forEach(async (el) => {
        try {
            const src = await imagemDaCarta(JSON.parse(el.dataset.buscaImg));
            const caixa = el.querySelector('.carta-img');
            if (src && caixa && !caixa.querySelector('img')) caixa.innerHTML = `<img src="${esc(src)}" alt="" onerror="this.remove()">`;
        } catch (e) {}
    });
}

// As cartas novas ficam escondidas até a vez delas de animar
function marcarAguardando(eventos) {
    eventos.forEach(ev => {
        const el = document.querySelector(`#arena-mesa [data-n="${ev.n}"]`);
        if (el) el.classList.add('aguardando');
        if (ev.anim === 'impacto') { const atk = document.querySelector(`#arena-mesa [data-impacto-n="${ev.n}"] .mesa-resultado`); if (atk) atk.classList.add('aguardando'); }
    });
}

function enfileirarAnimacoes(eventos) {
    if (!eventos.length) return;
    const naArena = document.getElementById('batalha')?.classList.contains('active');
    if (!naArena || document.visibilityState !== 'visible') return;
    filaAnim.itens.push(...eventos);
    marcarAguardando(eventos);
    if (!filaAnim.tocando) tocarFila();
}

async function tocarFila() {
    filaAnim.tocando = true;
    while (filaAnim.itens.length) {
        const ev = filaAnim.itens.shift();
        filaAnim.atual = ev;
        try { await (ev.anim === 'impacto' ? animarImpacto(ev) : animarUso(ev)); } catch (e) { console.warn('animação', e); }
    }
    filaAnim.atual = null;
    filaAnim.tocando = false;
}

const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const elementoDaMesa = (n) => document.querySelector(`#arena-mesa [data-n="${n}"]`);
const quadroDe = (uid) => document.querySelector(`.arena-lutador[data-uid="${CSS.escape(uid)}"]`);

function textoFlutuante(el, texto, classe) {
    const mesa = document.getElementById('arena-mesa');
    if (!el || !mesa) return;
    const rm = mesa.getBoundingClientRect(), re = el.getBoundingClientRect();
    const t = document.createElement('div');
    t.className = 'anim-texto ' + (classe || '');
    t.textContent = texto;
    t.style.left = (re.left - rm.left + re.width / 2) + 'px';
    t.style.top = (re.top - rm.top + 10) + 'px';
    mesa.appendChild(t);
    const a = t.animate([
        { transform: 'translate(-50%, 0) scale(.6)', opacity: 0 },
        { transform: 'translate(-50%, -14px) scale(1.15)', opacity: 1, offset: .2 },
        { transform: 'translate(-50%, -26px) scale(1)', opacity: 1, offset: .75 },
        { transform: 'translate(-50%, -44px) scale(1)', opacity: 0 }
    ], { duration: 1900, easing: 'ease-out' });
    a.finished.then(() => t.remove()).catch(() => t.remove());
}
const tremer = (el, forca = 10) => el && el.animate([
    { transform: 'translateX(0)' }, { transform: `translateX(-${forca}px) rotate(-1deg)` }, { transform: `translateX(${forca}px) rotate(1deg)` },
    { transform: `translateX(-${forca / 2}px)` }, { transform: `translateX(${forca / 2}px)` }, { transform: 'translateX(0)' }
], { duration: 500, easing: 'ease-in-out' });
const piscar = (el, cor) => el && el.animate([{ boxShadow: `0 0 0 0 ${cor}` }, { boxShadow: `0 0 0 5px ${cor}, 0 0 26px ${cor}` }, { boxShadow: `0 0 0 0 ${cor}` }], { duration: 700 });

// Carta entra na mesa do lado de quem usou
async function animarUso(ev) {
    const el = elementoDaMesa(ev.n);
    if (!el) return;
    el.classList.remove('aguardando');
    if (animacoesReduzidas()) { await el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }).finished.catch(() => {}); return; }
    await el.animate([
        { transform: 'translateY(40px) scale(.4) rotate(-8deg)', opacity: 0 },
        { transform: 'translateY(-10px) scale(1.12) rotate(2deg)', opacity: 1, offset: .55 },
        { transform: 'translateY(0) scale(1) rotate(0)', opacity: 1 }
    ], { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.catch(() => {});
    piscar(el, 'rgba(249,115,22,.7)');
    await esperar(350);
}

// Carta do ataque vai até a carta da reação; depois aparece o resultado
async function animarImpacto(ev) {
    const reacao = elementoDaMesa(ev.n);
    const ataque = document.querySelector(`#arena-mesa [data-impacto-n="${ev.n}"]`);
    const rotuloAtk = ataque?.querySelector('.mesa-resultado');
    if (!reacao) { rotuloAtk?.classList.remove('aguardando'); return; }
    const r = ev.resultado;
    const classeTexto = { esquiva: 'esquiva', defesa: 'defesa', defesa_parcial: 'defesa', clone: 'clone' }[r] || 'dano';
    const texto = { esquiva: '💨 Esquivou!', defesa: '🛡️ Bloqueou!', defesa_parcial: `🛡️ −${ev.dano}`, clone: '💨 Clone!', parcial: `Raspão −${ev.dano}` }[r] || `−${ev.dano}`;

    // 1) a carta da reação aparece
    reacao.classList.remove('aguardando');
    if (animacoesReduzidas()) {
        await reacao.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 }).finished.catch(() => {});
        rotuloAtk?.classList.remove('aguardando');
        textoFlutuante(reacao, texto, classeTexto);
        return;
    }
    await reacao.animate([
        { transform: 'translateY(30px) scale(.5)', opacity: 0 },
        { transform: 'translateY(-6px) scale(1.08)', opacity: 1, offset: .6 },
        { transform: 'none', opacity: 1 }
    ], { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.catch(() => {});

    // 2) a carta do ataque avança até a reação
    if (ataque) {
        const ra = ataque.getBoundingClientRect(), rr = reacao.getBoundingClientRect();
        const dx = (rr.left + rr.width / 2) - (ra.left + ra.width / 2);
        const dy = (rr.top + rr.height / 2) - (ra.top + ra.height / 2);
        ataque.style.zIndex = 3;
        const passa = r === 'esquiva' || r === 'clone';
        const quica = r === 'defesa' || r === 'defesa_parcial';
        const ida = ataque.animate([
            { transform: 'none' },
            { transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) rotate(10deg) scale(1.05)`, offset: .55 },
            passa ? { transform: `translate(${dx * 1.15}px, ${dy * 1.15 - 30}px) rotate(25deg) scale(.9)`, opacity: .4, offset: .8 }
                  : (quica ? { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 26}px) rotate(-20deg)`, offset: .8 }
                           : { transform: `translate(${dx * 0.8}px, ${dy * 0.8}px) rotate(0) scale(1.1)`, offset: .8 }),
            { transform: 'none', opacity: 1 }
        ], { duration: 1500, easing: 'cubic-bezier(.4,.1,.3,1)' });
        // 3) reação no momento do encontro
        await esperar(820);
        if (r === 'esquiva' || r === 'clone') reacao.animate([{ transform: 'none' }, { transform: 'translateY(-22px) rotate(-6deg)', offset: .4 }, { transform: 'none' }], { duration: 600, easing: 'ease-out' });
        else if (r === 'defesa' || r === 'defesa_parcial') { tremer(reacao, 3); piscar(reacao, 'rgba(234,179,8,.8)'); }
        else { tremer(reacao, 9); piscar(reacao, 'rgba(239,68,68,.8)'); tremer(quadroDe(ev.alvo), r === 'parcial' ? 4 : 10); piscar(quadroDe(ev.alvo), 'rgba(239,68,68,.6)'); }
        textoFlutuante(reacao, texto, classeTexto);
        await ida.finished.catch(() => {});
        ataque.style.zIndex = '';
    } else {
        textoFlutuante(reacao, texto, classeTexto);
    }
    // 4) o resultado fica escrito na carta do ataque
    if (rotuloAtk) {
        rotuloAtk.classList.remove('aguardando');
        rotuloAtk.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: .6 }, { transform: 'none', opacity: 1 }], { duration: 450 });
    }
    await esperar(500);
}

// Na tela de reação, mostra a foto do ataque recebido (busca no catálogo se precisar)
async function preencherCartaDaAmeaca(atk) {
    if (!atk?.carta || atk.carta.img) return;
    const src = await imagemDaCarta(atk.carta);
    const caixa = document.getElementById('arena-ameaca-carta');
    if (src && caixa && !caixa.querySelector('img')) caixa.innerHTML = imgCarta(src, 'ataque');
}

// --- Opção "Reduzir animações" (menu do perfil) ---
function aplicarPreferenciaAnimacoes() {
    let reduzir = false;
    try { reduzir = localStorage.getItem('animacoes') === 'reduzidas'; } catch (e) {}
    document.body.classList.toggle('menos-movimento', reduzir);
    const item = document.getElementById('item-reduzir-animacoes');
    if (item) {
        item.setAttribute('aria-pressed', String(reduzir));
        item.querySelector('.estado-opcao').textContent = reduzir ? 'Ligado' : 'Desligado';
    }
}
window.alternarAnimacoes = () => {
    const reduzir = !document.body.classList.contains('menos-movimento');
    try { localStorage.setItem('animacoes', reduzir ? 'reduzidas' : 'normais'); } catch (e) {}
    aplicarPreferenciaAnimacoes();
};
aplicarPreferenciaAnimacoes();

// ---------------- 8. Depois da luta: estatísticas e cofre ----------------
async function posLuta(id, d) {
    const eu = minhaUid();
    if (!eu || !d.estado || d.estado.status !== 'finalizada') return;
    if (arena.posLutaFeito[id]) return;
    arena.posLutaFeito[id] = true;
    const r = d.estado.resultado || {};
    const ref = doc(db, "desafios_batalha", id);
    try {
        // Partida de torneio: quem venceu avança na chave
        if (d.torneio && r.vencedor === eu) avancarNoTorneio(id, d).catch(e => console.error('torneio', e));
        // Luta anulada pelo Kage: não conta estatística e cada um recebe a aposta de volta
        if (d.status === 'anulada' || r.anulada) {
            if (d.modo === 'competitivo' && d.aposta) await devolverMeuCofre(id, { ...d, status: 'anulada' });
            return;
        }
        // 1) Estatísticas (uma única vez por jogador)
        if (!(d.contabilizado && d.contabilizado[eu])) {
            const ficha = (await getDoc(doc(db, "users", eu))).data() || {};
            const upd = { ultimaBatalhaContabilizada: id };
            if (r.empate) upd.empates = increment(1);
            else if (r.vencedor === eu) upd.vitorias = increment(1);
            else upd.derrotas = increment(1);
            if (d.modo === 'rankeada' && !r.empate) {
                upd.pontos_rankeada = r.vencedor === eu ? numero(ficha.pontos_rankeada) + ARENA.pontosVitoria : Math.max(0, numero(ficha.pontos_rankeada) - ARENA.pontosDerrota);
            }
            if ((d.modo || 'amistoso') === 'amistoso' && r.vencedor === eu) upd.pontos_amistoso = increment(1);
            const lote = writeBatch(db);
            lote.update(ref, { [`contabilizado.${eu}`]: true });
            lote.update(doc(db, "users", eu), upd);
            await lote.commit();
        }
        // 2) Cofre do competitivo
        if (d.modo === 'competitivo' && d.aposta) {
            if (r.empate) await devolverMeuCofre(id, d);
            else if (r.vencedor === eu && !d.cofrePago) {
                const total = Object.values(d.cofre || {}).reduce((a, b) => a + numero(b), 0);
                // Em Ryos, 5% do cofre vai para o Cofre da Vila
                const taxa = d.aposta.moeda === 'ryos' && await cofreAberto() ? Math.floor(total / COFRE.taxaArena) : 0;
                const lote = writeBatch(db);
                lote.update(ref, { cofrePago: true });
                lote.update(doc(db, "users", eu), { [d.aposta.moeda]: increment(total - taxa), ultimoCofre: id });
                if (taxa > 0) entradaNoCofre(lote, 'arena_' + id, 'arena', taxa, id);
                await lote.commit();
            }
        }
    } catch (e) {
        console.error("Erro ao registrar o resultado:", e);
        arena.posLutaFeito[id] = false;
    }
}

// Devolve a minha parte do cofre (convite recusado/cancelado, empate ou luta anulada)
async function devolverMeuCofre(id, d) {
    const eu = minhaUid();
    const minha = numero(d.cofre?.[eu]);
    if (!minha || !d.aposta || (d.cofreDevolvido && d.cofreDevolvido[eu]) || d.cofrePago) return;
    const chave = 'dev-' + id;
    if (arena.posLutaFeito[chave]) return;
    arena.posLutaFeito[chave] = true;
    try {
        const lote = writeBatch(db);
        lote.update(doc(db, "desafios_batalha", id), { [`cofreDevolvido.${eu}`]: true });
        lote.update(doc(db, "users", eu), { [d.aposta.moeda]: increment(minha), ultimoCofre: id });
        await lote.commit();
    } catch (e) { console.error("Erro ao devolver o cofre:", e); arena.posLutaFeito[chave] = false; }
}


async function carregarConquistas() {
    try {
        if (!currentUserData) return;
        const cTurno = document.getElementById('conquistas-turno-grid'); 
        const cCards = document.getElementById('conquistas-cards-grid');
        if(!cTurno || !cCards) return;

        const m = currentUserData.statusConquistas || {};
        cTurno.innerHTML = ''; cCards.innerHTML = '';
        
        const s = await lerColecao("conquistas");
        if(s.empty) { 
            cTurno.innerHTML = '<p>Nenhuma conquista.</p>'; 
            return; 
        }
        
        const isAdmin = auth.currentUser.email === "admin@rpgnaruto.com";
        s.forEach(d => {
            const i = d.data(); 
            if(!i) return;

            // --- LÓGICA BLINDADA DE RESTRIÇÃO ---
            let restritos = i.restrito_a;
            if (restritos) {
                let lista = [];
                if (typeof restritos === 'string') lista = restritos.split(',').map(n => n.trim().toLowerCase());
                else if (Array.isArray(restritos)) lista = restritos.map(n => n.trim().toLowerCase());
                lista = lista.filter(n => n !== "");

                if (lista.length > 0 && !isAdmin) {
                    const nomePlayer = (currentUserData.nome || "").trim().toLowerCase();
                    const apelidoPlayer = (currentUserData.apelido || "").trim().toLowerCase();
                    if (!lista.includes(nomePlayer) && !lista.includes(apelidoPlayer)) return;
                }
            }
            // ------------------------------------
            
            const st = m[d.id]; 
            const k = document.createElement('div'); 
            k.className = 'card jutsu-card-click';
            
            const r = i.recompensa || 0; 
            const x = i.xp || 0; 
            const en = i.en || 0; 
            
            // Lógica dos botões
            let btn = "";
            if(!st) {
                btn = `<button class="mission-btn-start" onclick="event.stopPropagation(); window.solicitarConquista(${jsArg(d.id)}, this)">Reivindicar</button>`;
            } else if(st === 'solicitado') {
                btn = `<button class="mission-btn-wait" onclick="event.stopPropagation();">Aguardando</button>`;
            } else if(st === 'aprovado') {
                btn = `<button class="mission-btn-collect" onclick="event.stopPropagation(); window.coletarConquista(${jsArg(d.id)}, ${Number(r) || 0}, ${Number(x) || 0}, ${Number(en) || 0}, this)">Coletar</button>`;
            } else if(st === 'concluido') {
                btn = `<button class="mission-btn-done" onclick="event.stopPropagation();">Concluído</button>`;
            }
            
            k.onclick = () => window.verDetalhesConquista(d.id, i, st);

            // NOVO LAYOUT DO CARD COM RECOMPENSAS PADRONIZADAS
            k.innerHTML = `
                <img src="${esc(i.imagem || IMG_PADRAO)}" class="card-img-top">
                <h4 style="margin-bottom: 4px; margin-top: 10px;">${esc(i.titulo)}</h4>

                <div style="display: flex; justify-content: center; gap: 10px; font-size: 0.75rem; font-weight: bold; padding: 8px 0; border-top: 1px solid #f5f5f5; margin-top: 5px;">
                    <span style="color: #2ecc71;" title="XP">
                        <i class="fa-solid fa-bolt"></i> ${esc(x)}
                    </span>
                    <span style="color: #f1c40f;" title="Ryos">
                        <i class="fa-solid fa-coins"></i> ${formatarNum(r)}
                    </span>
                    <span style="color: #3498db;" title="Essência Ninja">
                        <i class="fa-regular fa-star"></i> ${esc(en)}
                    </span>
                </div>

                ${btn}
            `;
            
            const cat = (i.categoria || "turno").toLowerCase().trim();
            if(cat.includes('card')) cCards.appendChild(k); else cTurno.appendChild(k);
        });

        if(cTurno.innerHTML === '') cTurno.innerHTML = '<p style="color:#777;">Vazio.</p>';
        if(cCards.innerHTML === '') cCards.innerHTML = '<p style="color:#777;">Vazio.</p>';

    } catch(e) { 
        console.error("Erro ao carregar conquistas:", e);
        if(cTurno) cTurno.innerHTML = '<p>Erro.</p>';
        if(cCards) cCards.innerHTML = '<p>Erro.</p>';
    } 
}


async function carregarMissoes() { 
    try {
        if (!currentUserData) return;
        const cTurno = document.getElementById('missoes-turno-grid'); 
        const cCards = document.getElementById('missoes-cards-grid');
        if(!cTurno || !cCards) return;

        const m = currentUserData.statusMissoes || {}; 
        cTurno.innerHTML = ''; cCards.innerHTML = '';

        const s = await lerColecao("missoes");
        const isAdmin = auth.currentUser.email === "admin@rpgnaruto.com";

        s.forEach(d => { 
            const i = d.data();
            if(!i) return;

            // --- LÓGICA BLINDADA DE RESTRIÇÃO ---
            let restritos = i.restrito_a;
            if (restritos) {
                let lista = [];
                if (typeof restritos === 'string') {
                    lista = restritos.split(',').map(n => n.trim().toLowerCase());
                } else if (Array.isArray(restritos)) {
                    lista = restritos.map(n => n.trim().toLowerCase());
                }
                lista = lista.filter(n => n !== "");

                if (lista.length > 0 && !isAdmin) {
                    const nomePlayer = (currentUserData.nome || "").trim().toLowerCase();
                    const apelidoPlayer = (currentUserData.apelido || "").trim().toLowerCase();
                    if (!lista.includes(nomePlayer) && !lista.includes(apelidoPlayer)) return;
                }
            }
            // ------------------------------------

            const st = m[d.id] || 'neutro'; 
            const k = document.createElement('div'); 
            k.className = 'card jutsu-card-click'; 
            
            const rankClass = `rank-${esc(String(i.rank||'d').toLowerCase())}`;
            const rankHtml = `<span class="rank-tag ${rankClass}">Rank ${esc(i.rank||'D')}</span>`;
            
            const r = i.recompensa || 0; 
            const x = i.xp || 0; 
            const en = i.en || 0; 

            // Define a cor e o texto do status para ficar mais bonito
            let statusLabel = st === 'neutro' ? 'Disponível' : st.replace('_', ' ');
            let statusColor = '#777';
            if(st === 'em_andamento') statusColor = 'orange';
            if(st === 'aprovado') statusColor = '#2ecc71';
            if(st === 'concluido') statusColor = '#3498db';

            k.onclick = () => window.verDetalhesMissao(d.id, i, st); 

            // NOVO LAYOUT DO CARD SIMPLES
            k.innerHTML = `
                ${rankHtml}
                <h4 style="margin-bottom: 2px;">${esc(i.titulo)}</h4>
                <p style="font-size:0.75rem; font-weight: bold; color:${statusColor}; text-transform: capitalize; margin-bottom: 8px;">
                    ${esc(statusLabel)}
                </p>
                
                <div style="display: flex; justify-content: center; gap: 10px; font-size: 0.75rem; font-weight: bold; border-top: 1px solid #eee; padding-top: 8px;">
                    <span style="color: #2ecc71;" title="XP">
                        <i class="fa-solid fa-bolt"></i> ${esc(x)}
                    </span>
                    <span style="color: #f1c40f;" title="Ryos">
                        <i class="fa-solid fa-coins"></i> ${formatarNum(r)}
                    </span>
                    <span style="color: #3498db;" title="Essência Ninja">
                        <i class="fa-regular fa-star"></i> ${esc(en)}
                    </span>
                </div>
            `; 
            
            const cat = (i.categoria || "turno").toLowerCase().trim();
            if(cat.includes('card')) cCards.appendChild(k); else cTurno.appendChild(k);
        }); 
        
        if(cTurno.innerHTML === '') cTurno.innerHTML = '<p style="color:#777;">Vazio.</p>';
        if(cCards.innerHTML === '') cCards.innerHTML = '<p style="color:#777;">Vazio.</p>';
    } catch(e) { 
        console.error("Erro ao carregar missões:", e);
        if(cTurno) cTurno.innerHTML = '<p>Erro ao carregar.</p>'; 
    } 
}

async function carregarRankings() { 
    const c = document.getElementById('ranking-container'); 
    if(!c) return; 
    
    c.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">Carregando Rankings...</p>';

    try { 
        const s = await lerColecao("users");
        let l = []; 
        s.forEach(d => l.push(d.data())); 
        
        c.innerHTML = ''; 
        
        // Lista completa de Rankings
        renderRank(c, "Nível", l, 'nivel'); 
        renderRank(c, "Ryos", l, 'ryos'); 
        renderRank(c, "Rankeadas", l, 'pontos_rankeada'); 
        renderRank(c, "Torneios", l, 'vitorias_torneio'); 
        renderRank(c, "Amistosos", l, 'pontos_amistoso'); 
        renderRank(c, "Duplas", l, 'vitorias_dupla'); 
        renderRank(c, "Clãs", l, 'vitorias_cla'); 
        renderRank(c, "Missões Rank S", l, 'missoes_concluidas_s'); 
        renderRank(c, "Missões Rank A", l, 'missoes_concluidas_a'); 
        renderRank(c, "Missões Rank B", l, 'missoes_concluidas_b'); 
        renderRank(c, "Missões Rank C", l, 'missoes_concluidas_c'); 
        renderRank(c, "Missões Rank D", l, 'missoes_concluidas_d'); 
        renderRank(c, "Missões Rank E", l, 'missoes_concluidas_e');

    } catch (e) { 
        console.error(e);
        c.innerHTML = '<p>Erro ao carregar rankings.</p>';
    } 
};

function renderRank(c, t, l, f) { 
    // Ordena do maior para o menor e pega os top 5
    const s = [...l].sort((a,b) => (b[f]||0) - (a[f]||0)).slice(0,5); 
    
    let h = `<div class="ranking-col"><h3>${t}</h3><table class="ranking-table">`; 
    
    s.forEach((u, i) => {
        h += `<tr><td>${i+1}. ${esc(u.nome || "Anônimo")}</td><td>${formatarNum(u[f])}</td></tr>`;
    }); 
    
    h += '</table></div>'; 
    c.innerHTML += h; 
}


window.abrirModalPresentear = (alvoId) => {
    if (!auth.currentUser) return alert("Você precisa estar logado!");
    if (auth.currentUser.uid === alvoId) return alert("Você não pode presentear a si mesmo!");

    usuarioDestinoPresente = alvoId;
    document.getElementById('pres-qtd').value = ''; // Limpa o campo de valor
    document.getElementById('modalPresentear').style.display = 'flex';
};

// 2. Função que envia o dinheiro
window.confirmarPresente = async () => {
    if (!usuarioDestinoPresente || !auth.currentUser) return;

    const tipo = document.getElementById('pres-tipo').value; // 'ryos' ou 'essencia_ninja'
    const qtd = Number(document.getElementById('pres-qtd').value);

    // Validações de segurança
    if (isNaN(qtd) || qtd <= 0 || !Number.isInteger(qtd)) return alert("Insira uma quantidade válida (número inteiro)!");
    if (!currentUserData) return alert("Seus dados não foram carregados. Tente novamente.");

    // Verifica se o remetente tem saldo
    const saldoAtual = Number(currentUserData[tipo]) || 0;
    
    if (saldoAtual < qtd) {
        const nomeMoeda = tipo === 'ryos' ? 'Ryos' : 'Essência Ninja';
        return alert(`Saldo insuficiente! Você tem apenas ${saldoAtual} ${nomeMoeda}.`);
    }

    try {
        const btnConfirmar = document.querySelector('#modalPresentear button');
        btnConfirmar.innerText = "Enviando...";
        btnConfirmar.disabled = true;

        // Referências do Banco de Dados
        const refRemetente = doc(db, "users", auth.currentUser.uid);
        const refDestinatario = doc(db, "users", usuarioDestinoPresente);

        const snapDestinatario = await getDoc(refDestinatario);
        if (!snapDestinatario.exists()) {
            throw new Error("O ninja destinatário não foi encontrado na vila.");
        }

        // Débito e crédito na MESMA operação (ou os dois acontecem, ou nenhum)
        // e com increment(), para não sobrescrever saldos alterados ao mesmo tempo.
        // O comprovante em "transferencias" é o que as regras de segurança conferem.
        const refComprovante = doc(collection(db, "transferencias"));
        const lote = writeBatch(db);
        lote.set(refComprovante, { de: auth.currentUser.uid, para: usuarioDestinoPresente, tipo, qtd, motivo: 'presente', data: serverTimestamp() });
        lote.update(refRemetente, { [tipo]: increment(-qtd), ultimaTransferencia: refComprovante.id });
        lote.update(refDestinatario, { [tipo]: increment(qtd), ultimaTransferenciaRecebida: refComprovante.id });
        await lote.commit();

        // Atualiza os dados locais para não precisar recarregar a página
        currentUserData[tipo] = saldoAtual - qtd;

        alert("Presente enviado com sucesso!");
        document.getElementById('modalPresentear').style.display = 'none';
        
        // Se a aba de personagens estiver aberta, atualiza visualmente
        limparCache("users");
        if (typeof carregarPersonagens === 'function') carregarPersonagens();

    } catch (erro) {
        console.error("Erro na transferência:", erro);
        alert("Ocorreu um erro ao enviar o presente. O chakra falhou!");
    } finally {
        const btnConfirmar = document.querySelector('#modalPresentear button');
        btnConfirmar.innerText = "Confirmar Envio";
        btnConfirmar.disabled = false;
    }
};



window.consumirItem = async (id, nome) => { 
    let itemData = globalItensMap[id];
    if (itemData && itemData.type === 'tool' && itemData.stamina > 0) {
        if ((currentUserData.stamina || 0) < itemData.stamina) return alert("Stamina insuficiente!");
        if(confirm(`Usar ${nome}? Custa ${itemData.stamina} STA`)) await updateDoc(doc(db, "users", auth.currentUser.uid), { [`inventario.${id}`]: increment(-1), stamina: increment(-itemData.stamina), ultimoConsumo: id });
    } else {
        if(confirm(`Usar ${nome}?`)) await updateDoc(doc(db, "users", auth.currentUser.uid), { [`inventario.${id}`]: increment(-1), ultimoConsumo: id }); 
    }
};
// Lê o item direto do banco na hora da compra (o preço pode ter mudado desde que a loja abriu)
// =====================================================================
//  COFRE DA VILA (vila/banco). Entradas: 10% das compras em Ryos, 20% das
//  missões, 5% do cofre Competitivo em Ryos e doações. Saídas: salários.
//  Cada entrada leva um comprovante (vila_movimentos) que as regras conferem.
// =====================================================================
const COFRE = { impostoLoja: 10, taxaMissao: 5, taxaArena: 20, saldoInicial: 1000000 }; // divisores: 1/10, 1/5, 1/20
const refCofre = () => doc(db, "vila", "banco");
async function cofreAberto() {
    try { return (await getDoc(refCofre())).exists(); } catch (e) { return false; }
}
// Coloca no lote a entrada no cofre + o comprovante
function entradaNoCofre(lote, movId, tipo, valor, ref = '') {
    lote.set(doc(db, "vila_movimentos", movId), { uid: minhaUid(), nome: currentUserData?.nome || 'Ninja', tipo, valor, data: serverTimestamp(), ref });
    lote.update(refCofre(), { saldo: increment(valor), ultimoMov: movId });
}
const idMovimento = (prefixo) => `${prefixo}_${minhaUid()}_${Date.now()}`;

async function precoAtual(colecao, id) {
    const snap = await getDoc(doc(db, colecao, id));
    if (!snap.exists()) throw new Error("Este item não existe mais na loja.");
    const dados = snap.data();
    return { moeda: moedaDe(dados), preco: precoDe(dados), dados };
}
function nomeMoeda(campo) { return campo === 'essencia_ninja' ? 'EN' : 'Ryos'; }

window.comprarJutsu = async (id, p, n) => {
    if (!confirm(`Comprar ${n}?`)) return;
    try {
        const { moeda, preco, dados } = await precoAtual("jutsus", id);
        if (preco !== Number(p) && !confirm(`O preço de ${n} mudou para ${formatarNum(preco)} ${nomeMoeda(moeda)}. Comprar mesmo assim?`)) { limparCache("jutsus"); carregarLoja(); return; }
        if ((currentUserData.nivel || 1) < numero(dados.requisito)) return alert(`Requer nível ${dados.requisito}.`);
        if ((currentUserData[moeda] || 0) < preco) return alert("Sem fundos!");
        const imposto = moeda === 'ryos' ? Math.floor(preco / COFRE.impostoLoja) : 0;
        const comImposto = imposto > 0 && await cofreAberto();
        const movId = comImposto ? idMovimento('compra') : null;
        const lote = writeBatch(db);
        lote.update(doc(db, "users", auth.currentUser.uid), {
            [moeda]: increment(-preco),
            meusJutsus: arrayUnion(id),
            [`maestrias.${id}`]: 0,
            ultimaCompra: { tipo: 'jutsu', id, ...(movId ? { mov: movId } : {}) }   // comprovante conferido pelas regras de segurança
        });
        if (comImposto) entradaNoCofre(lote, movId, 'imposto_loja', imposto, id);   // 10% para a vila (o preço não muda)
        await lote.commit();
        alert("Comprado!");
    } catch (e) { console.error(e); alert("Não foi possível concluir a compra. " + (e.message || "")); }
};
window.comprarMultiplos = async (id, p, n, t, i) => {
    const q = parseInt(document.getElementById(i).value) || 1; if (q < 1) return;
    const colecao = t === 'ferramenta' ? 'ferramentas' : 'itens';
    if (!confirm(`Comprar ${q}x ${n}?`)) return;
    try {
        const { moeda, preco } = await precoAtual(colecao, id);
        if (preco !== Number(p) && !confirm(`O preço de ${n} mudou para ${formatarNum(preco)} ${nomeMoeda(moeda)}. Comprar mesmo assim?`)) { limparCache(colecao); window.showTab(document.querySelector('.tab-content.active').id); return; }
        const total = preco * q;
        if ((currentUserData[moeda] || 0) < total) return alert("Sem fundos!");
        const imposto = moeda === 'ryos' ? Math.floor(total / COFRE.impostoLoja) : 0;
        const comImposto = imposto > 0 && await cofreAberto();
        const movId = comImposto ? idMovimento('compra') : null;
        const lote = writeBatch(db);
        lote.update(doc(db, "users", auth.currentUser.uid), {
            [moeda]: increment(-total),
            [`inventario.${id}`]: increment(q),
            ultimaCompra: { tipo: colecao, id, ...(movId ? { mov: movId } : {}) }   // comprovante conferido pelas regras de segurança
        });
        if (comImposto) entradaNoCofre(lote, movId, 'imposto_loja', imposto, id);
        await lote.commit();
        alert("Comprado!");
    } catch (e) { console.error(e); alert("Não foi possível concluir a compra. " + (e.message || "")); }
};
window.filtrarLojaPorTipo = (t, b) => { lojaAtual = t; document.querySelectorAll('.shop-cat-btn').forEach(x => x.classList.remove('active')); if(b) b.classList.add('active'); carregarLojaItens(); };
window.atualizarFiltroVila = () => { vilaAtual = document.getElementById('shop-location').value; carregarLojaItens(); };
window.verDetalhesConquista = (id, d, st) => {
    document.getElementById('conquista-name-modal').innerText = d.titulo;
    document.getElementById('conquista-desc-modal').innerText = d.descricao;
    document.getElementById('conquista-reward-modal').innerText = formatarNum(d.recompensa);
    document.getElementById('conquista-xp-modal').innerText = d.xp || 0;
    
    // Inserindo a Essência Ninja no modal
    if(document.getElementById('conquista-en-modal')) {
        document.getElementById('conquista-en-modal').innerText = d.en || 0;
    }

    document.getElementById('conquista-img-modal').src = d.imagem || IMG_PADRAO;
    const a = document.getElementById('conquista-actions-modal'); 
    a.innerHTML = '';

    if(!st) {
        a.innerHTML = `<button class="mission-btn-start" onclick="window.solicitarConquista(${jsArg(id)}, this)">Reivindicar</button>`;
    } else if(st === 'solicitado') {
        a.innerHTML = `<button class="mission-btn-wait">Aguardando</button>`;
    } else if(st === 'aprovado') {
        // Agora passando também o d.en para a coleta
        a.innerHTML = `<button class="mission-btn-collect" onclick="window.coletarConquista(${jsArg(id)}, ${Number(d.recompensa) || 0}, ${Number(d.xp) || 0}, ${Number(d.en) || 0}, this)">Coletar</button>`;
    } else {
        a.innerHTML = `<button class="mission-btn-done">Feito</button>`;
    }

    document.getElementById('conquistaModal').style.display = 'flex';
};
window.solicitarConquista = async (id, btn) => { if(btn) { btn.disabled = true; btn.innerText = "..."; } await updateDoc(doc(db, "users", auth.currentUser.uid), { [`statusConquistas.${id}`]: 'solicitado', ultimaSolicitacao: id }); alert("Solicitado!"); };
window.coletarConquista = async (id, ryos, xp, en, btn) => {
    if(btn) btn.disabled = true;
    try {
        const uid = auth.currentUser.uid;
        const userRef = doc(db, "users", uid);
        // Usa os valores cadastrados no banco (as regras de segurança conferem)
        const snapC = await getDoc(doc(db, "conquistas", id));
        if (!snapC.exists()) throw new Error("Conquista não encontrada.");
        const c = snapC.data();
        en = numero(c.en);

        await updateDoc(userRef, {
            ryos: increment(numero(c.recompensa)),
            xp: increment(numero(c.xp)),
            essencia_ninja: increment(en),
            [`statusConquistas.${id}`]: 'concluido',
            ultimaColeta: { tipo: 'conquista', id }
        });

        alert(`Conquista Coletada! +${en} Essência Ninja recebida.`);
        fecharConquistaModal();
        carregarConquistas(); // Atualiza a lista
    } catch (e) {
        console.error(e);
        alert("Erro ao coletar conquista.");
        if(btn) btn.disabled = false;
    }
};
window.verDetalhesMissao = (id, d, st) => { 
    document.getElementById('missao-name-modal').innerText = d.titulo; 
    document.getElementById('missao-desc-modal').innerText = d.descricao; 
    document.getElementById('missao-reward-modal').innerText = formatarNum(d.recompensa); 
    document.getElementById('missao-xp-modal').innerText = d.xp || 0; 
    
    // Inserindo a Essência Ninja no modal
    if(document.getElementById('missao-en-modal')) {
        document.getElementById('missao-en-modal').innerText = d.en || 0;
    }

    document.getElementById('missao-img-modal').src = d.imagem || IMG_PADRAO; 
    const a = document.getElementById('missao-actions-modal'); 
    a.innerHTML = ''; 

    if(st === 'neutro') {
        a.innerHTML = `<button class="mission-btn-start" onclick="window.iniciarMissao(${jsArg(id)}, this)">Aceitar</button>`; 
    } else if(st === 'em_andamento') {
        a.innerHTML = `<button class="mission-btn-wait">Em Andamento</button>`; 
    } else if(st === 'aprovado') {
        // Agora passando também o d.en para a coleta
        a.innerHTML = `<button class="mission-btn-collect" onclick="window.coletarRecompensa(${jsArg(id)}, ${Number(d.recompensa) || 0}, ${Number(d.xp) || 0}, ${Number(d.en) || 0}, ${jsArg(d.rank || 'D')}, this)">Receber</button>`; 
    } else if(st === 'concluido') {
        a.innerHTML = `<button class="mission-btn-done">Concluído</button>`; 
    }
    
    document.getElementById('missaoModal').style.display = 'flex'; 
};
window.iniciarMissao = async (id, btn) => { if(btn) { btn.disabled=true; btn.innerText="..."; } await updateDoc(doc(db, "users", auth.currentUser.uid), { [`statusMissoes.${id}`]: 'em_andamento', ultimaSolicitacao: id }); alert("Iniciada!"); };
window.coletarRecompensa = async (id, ryos, xp, en, rank, btn) => {
    if(btn) btn.disabled = true;
    try {
        const uid = auth.currentUser.uid;
        const userRef = doc(db, "users", uid);

        // Usa os valores cadastrados no banco (as regras de segurança conferem)
        const snapM = await getDoc(doc(db, "missoes", id));
        if (!snapM.exists()) throw new Error("Missão não encontrada.");
        const m = snapM.data();

        // Define qual contador de missão concluída aumentar baseado no Rank
        const campoRank = `missoes_concluidas_${String(m.rank || 'D').toLowerCase()}`;

        const lote = writeBatch(db);
        lote.update(userRef, {
            ryos: increment(numero(m.recompensa)),
            xp: increment(numero(m.xp)),
            essencia_ninja: increment(numero(m.en)),
            [campoRank]: increment(1),
            [`statusMissoes.${id}`]: 'concluido',
            ultimaColeta: { tipo: 'missao', id }
        });
        // O cliente da missão paga a vila: +20% da recompensa vão para o cofre (o ninja não perde nada)
        const taxa = Math.floor(numero(m.recompensa) / COFRE.taxaMissao);
        if (taxa > 0 && await cofreAberto()) entradaNoCofre(lote, `missao_${uid}_${id}`, 'missao', taxa, id);
        await lote.commit();

        alert("Recompensa de Missão recebida com sucesso!" + (taxa > 0 ? `\n🏯 A vila também recebeu ${formatarNum(taxa)} Ryos pelo contrato.` : ''));
        fecharMissaoModal();
        carregarMissoes(); // Atualiza a lista
    } catch (e) {
        console.error(e);
        alert("Erro ao coletar recompensa.");
        if(btn) btn.disabled = false;
    }
};

function abrirModalSimples(t, d) {
    // 1. Preenchimento básico (funciona para todos)
    document.getElementById(t + '-name-modal').innerText = d.nome;
    document.getElementById(t + '-desc-modal').innerText = d.descricao || "";
    document.getElementById(t + '-price-modal').innerText = "Valor: " + formatarNum(d.preco) + " Ryos";
    document.getElementById(t + '-img-modal').src = d.imagem || IMG_PADRAO;

    let bonusHtml = gerarTagsBonus(d);
    let h = ""; // Variável para acumular as tags de status

    // 2. Lógica para JUTSUS
    if (t === 'jutsu') {
        document.getElementById(t + '-rank-modal').innerText = "Rank " + d.rank;
        
        const funcao = funcaoDoJutsu(d);
        const nomesFuncao = { ataque: '⚔️ Ataque', defesa: '🛡️ Defesa', esquiva: '💨 Esquiva', suporte: '✨ Suporte', modo: '🌀 Modo' };
        h += `<span class="jutsu-stat-tag" style="background:#334155;">${nomesFuncao[funcao]}</span>`;
        if (poderDoJutsu(d)) h += `<span class="jutsu-stat-tag tag-dano">Poder: ${esc(poderDoJutsu(d))}</span>`;
        if (funcao === 'ataque') { const nec = necessidadesDoJutsu(d); h += `<span class="jutsu-stat-tag" style="background:#7c3aed;">Reação ${nec.reacao} · Vel. ${nec.velocidade}</span>`; }
        if (d.custo_por_turno) h += `<span class="jutsu-stat-tag tag-chakra">Manutenção: ${esc(d.custo_por_turno)} CP/turno</span>`;
        if (d.defesa) h += `<span class="jutsu-stat-tag tag-defesa" style="background:#2ecc71;">Defesa: ${esc(d.defesa)}</span>`;
        if (d.chakra) h += `<span class="jutsu-stat-tag tag-chakra">Chakra: ${esc(d.chakra)}</span>`;
        
        // CORREÇÃO AQUI: Adicionado crases e trocado 'dados' por 'd'
        if (d.stamina) h += `<span class="jutsu-stat-tag tag-stamina">Stamina: ${esc(d.stamina)}</span>`;
        
        h += bonusHtml;
        document.getElementById('jutsu-stats-row').innerHTML = h;

    // 3. Lógica para FERRAMENTAS (TOOLS)
    } else if (t === 'tool') {
        document.getElementById(t + '-rank-modal').innerText = d.dano || "Ferramenta";
        
        if (d.dano) h += `<span class="jutsu-stat-tag tag-dano">Dano: ${esc(d.dano)}</span>`;
        
        // CORREÇÃO AQUI: Stamina para ferramentas
        if (d.stamina) h += `<span class="jutsu-stat-tag tag-stamina">Stamina: ${esc(d.stamina)}</span>`;
        
        h += bonusHtml;
        document.getElementById('tool-stats-row').innerHTML = h;

    // 4. Lógica para ITENS
    } else if (t === 'item') {
        document.getElementById(t + '-rank-modal').innerText = d.efeito || "Item";
        document.getElementById('item-stats-row').innerHTML = bonusHtml;
    }

    // 5. Exibe o modal
    document.getElementById(t + 'Modal').style.display = 'flex';
}

// --- NOVO SISTEMA DE PÁGINA DE PERFIL ---
window.editingUserId = null; // Guarda o UID do ninja que está sendo editado na tela

// Processa a imagem escolhida na hora
window.handlePageAvatar = async (e) => {
    const arquivo = e.target.files[0];
    if(arquivo) {
        try {
            newAvatarBase64 = await comprimirImagem(arquivo);
            document.getElementById('page-avatar-preview').src = newAvatarBase64;
        } catch (erro) { alert("O pergaminho de imagem falhou."); }
    }
};

// Abre a página de perfil carregando os dados do banco
window.abrirPaginaPerfil = async (uid = null) => {
    if (!auth.currentUser) return;
    
    // Se não for passado um UID, edita o próprio usuário logado
    const targetUid = uid || auth.currentUser.uid;
    window.editingUserId = targetUid;
    
    const isAdmin = ["admin@rpgnaruto.com", "conselheiro@rpgnaruto.com"].includes(auth.currentUser.email);
    
    window.showTab('perfil');
    
    const inpNome = document.getElementById('perfil-nome');
    const inpApelido = document.getElementById('perfil-apelido');
    const inpBio = document.getElementById('perfil-bio');
    const inpCargo = document.getElementById('perfil-cargo');
    const inpSalario = document.getElementById('perfil-salario');
    const imgPreview = document.getElementById('page-avatar-preview');
    
    // Libera a edição dos campos restritos caso seja o Admin
    inpCargo.disabled = !isAdmin;
    inpSalario.disabled = !isAdmin;
    
    document.getElementById('perfil-titulo-pagina').innerHTML = targetUid === auth.currentUser.uid 
        ? '<i class="fa-solid fa-address-card"></i> Minha Ficha Ninja' 
        : '<i class="fa-solid fa-user-shield"></i> Editando Registro (Kage)';
    
    try {
        let dados;
        // Puxa da memória se for o próprio player, ou vai no banco se o Admin estiver editando alguém
        if (targetUid === auth.currentUser.uid && currentUserData) {
            dados = currentUserData;
        } else {
            const snap = await getDoc(doc(db, "users", targetUid));
            if(snap.exists()) dados = snap.data();
        }
        
        if(dados) {
            inpNome.value = dados.nome || "";
            inpApelido.value = dados.apelido || "";
            inpBio.value = dados.historiaTexto || ""; 
            inpCargo.value = dados.cargo || "Genin";
            inpSalario.value = dados.salario || 0;
            imgPreview.src = dados.avatar || IMG_PADRAO;
            newAvatarBase64 = null; // Reseta a variável de imagem temporária
        }
    } catch(e) {
        console.error("Erro ao carregar ficha:", e);
    }
};

// Salva os dados no Firestore
window.salvarPaginaPerfil = async () => {
    const btn = document.getElementById('btn-salvar-perfil');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    
    const isAdmin = ["admin@rpgnaruto.com", "conselheiro@rpgnaruto.com"].includes(auth.currentUser.email);
    const novoNome = document.getElementById('perfil-nome').value;
    
    const updates = {
        nome: novoNome,
        apelido: document.getElementById('perfil-apelido').value,
        historiaTexto: document.getElementById('perfil-bio').value,
        personagem: novoNome // Mantém sincronizado com outros locais do seu DB
    };
    
    // Admin salva também o cargo e o salário
    if (isAdmin) {
        updates.cargo = document.getElementById('perfil-cargo').value;
        updates.salario = Number(document.getElementById('perfil-salario').value) || 0;
    }
    
    if (newAvatarBase64) {
        updates.avatar = newAvatarBase64;
    }
    
    try {
        await updateDoc(doc(db, "users", window.editingUserId), updates);
        
        // Atualiza a tela imediatamente se o usuário estiver editando a si mesmo
        if(window.editingUserId === auth.currentUser.uid) {
            currentUserData = { ...currentUserData, ...updates };
            atualizarInterface(currentUserData);
        }
        
        alert("Ficha atualizada com sucesso!");
        window.showTab('dashboard'); // Volta para o Dashboard após salvar
        
    } catch(e) {
        alert("Erro ao salvar os dados.");
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Ficha';
    }
};

// Não esqueça de exportar para o window no final do script.js:
window.abrirModalSimples = abrirModalSimples;

window.openChangePasswordModal = () => { document.getElementById('changePasswordModal').style.display='flex'; document.getElementById('user-menu').classList.remove('show'); };
window.closeChangePasswordModal = () => document.getElementById('changePasswordModal').style.display='none';
window.toggleMenu = () => document.getElementById('user-menu').classList.toggle('show');

// --- TEMA CLARO / ESCURO ---
function atualizarBotaoTema() {
    const escuro = document.body.classList.contains('dark-mode');
    const btn = document.getElementById('btn-tema');
    if (!btn) return;
    btn.innerHTML = escuro ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    btn.setAttribute('aria-label', escuro ? 'Ativar modo claro' : 'Ativar modo escuro');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', escuro ? '#0b0d13' : '#c2410c');
}
window.alternarTema = () => {
    const escuro = document.body.classList.toggle('dark-mode');
    try { localStorage.setItem('tema', escuro ? 'escuro' : 'claro'); } catch (e) {}
    atualizarBotaoTema();
};
atualizarBotaoTema();

// --- ACESSIBILIDADE: teclado ---
document.addEventListener('keydown', (e) => {
    // Enter/Espaço ativam elementos marcados como botão (ex.: "X" de fechar)
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"]')) {
        e.preventDefault();
        e.target.click();
    }
    // Esc fecha janelas abertas e o menu do usuário
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay-comment, .modal-arena:not(#modal-desafio)').forEach(m => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; });
        document.getElementById('user-menu')?.classList.remove('show');
        if (document.querySelector('.sidebar.mobile-active')) window.toggleMobileMenu();
    }
});

// Fecha o menu do usuário ao clicar fora dele
document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    if (menu && menu.classList.contains('show') && !e.target.closest('.user-area')) menu.classList.remove('show');
});
window.fazerLogout = () => signOut(auth).then(() => location.reload());
window.abrirModalMentoria = (id) => {
    const mentor = globalMentores[id]; if (!mentor) return;
    currentMentorData = mentor;
    currentMentorId = id;
    document.getElementById('mentor-name-modal').innerText = mentor.nome;
    document.getElementById('mentor-img-modal').src = mentor.imagem || IMG_PADRAO;
    const container = document.getElementById('mentoria-options-container'); container.innerHTML = '';
    if(mentor.ensinos) {
        mentor.ensinos.forEach((ensino, index) => {
            const div = document.createElement('div'); div.className = 'mentoria-option';
            div.onclick = () => { const radio = document.getElementById(`ensino-${index}`); if(radio) radio.checked = true; };
            div.innerHTML = `<input type="radio" name="ensino_escolhido" id="ensino-${index}" value="${index}" class="mentoria-radio"><div style="flex:1;"><div style="font-weight:bold;">${esc(ensino.nome)}</div><div>${formatarNum(ensino.preco)} ${ensino.moeda === 'essencia_ninja' ? 'EN' : 'Ryos'}</div></div>`;
            container.appendChild(div);
        });
    }
    document.getElementById('mentoriaModal').style.display = 'flex';
};
window.confirmarMentoria = async () => {
    const radios = document.getElementsByName('ensino_escolhido');
    let selectedIndex = -1; for(let i=0; i<radios.length; i++) { if(radios[i].checked) { selectedIndex = parseInt(radios[i].value); break; } }
    if(selectedIndex === -1) return alert("Selecione algo!");
    try {
        // Lê o mentor direto do banco (preço atualizado) — as regras conferem o mesmo valor
        const snapM = await getDoc(doc(db, "mentores", currentMentorId));
        if (!snapM.exists()) return alert("Mentor não encontrado.");
        const mentor = snapM.data();
        const ensino = (mentor.ensinos || [])[selectedIndex];
        if (!ensino) return alert("Este ensino não está mais disponível.");
        const field = ensino.moeda === 'essencia_ninja' ? 'essencia_ninja' : 'ryos';
        const preco = numero(ensino.preco);
        if ((currentUserData[field] || 0) < preco) return alert("Sem fundos!");
        const alvo = mentor.uid_player ? mentor.uid_player : null;
        if (alvo === auth.currentUser.uid) return alert("Você não pode pagar a si mesmo.");

        const refComprovante = doc(collection(db, "transferencias"));
        const lote = writeBatch(db);
        lote.set(refComprovante, { de: auth.currentUser.uid, para: alvo, tipo: field, qtd: preco, motivo: 'mentoria', mentorId: currentMentorId, ensinoIdx: selectedIndex, data: serverTimestamp() });
        lote.update(doc(db, "users", auth.currentUser.uid), { [field]: increment(-preco), aprendizados: arrayUnion(`${mentor.nome} - ${ensino.nome}`), ultimaTransferencia: refComprovante.id });
        if (alvo) lote.update(doc(db, "users", alvo), { [field]: increment(preco), ultimaTransferenciaRecebida: refComprovante.id });
        await lote.commit();
        alert(`Aprendeu: ${ensino.nome}!`); document.getElementById('mentoriaModal').style.display = 'none';
    } catch(e) { console.error(e); alert("Erro: " + e.message); }
};
window.editarHistoria = async () => { const n=prompt("Texto:",currentUserData.historiaTexto||""); if(n){ const i=prompt("Imagem:",currentUserData.historiaImagem||""); updateDoc(doc(db,"users",auth.currentUser.uid),{historiaTexto:n,historiaImagem:i}).then(location.reload()); } }
window.toggleFraseMenu = (el) => { const dropdown = el.nextElementSibling; document.querySelectorAll('.options-dropdown').forEach(d => { if(d !== dropdown) d.classList.remove('active'); }); dropdown.classList.toggle('active'); };
window.adicionarFrase = async () => { const t=document.getElementById('novaFraseInput').value; if(t) await addDoc(collection(db,"frases"),{texto:t,autor:currentUserData.nome,uid:auth.currentUser.uid,data:serverTimestamp()}); document.getElementById('novaFraseInput').value=''; }
window.editarFrase = async (id, oldText) => { const n = prompt("Editar:", oldText); if(n) await updateDoc(doc(db, "frases", id), { texto: n }); };
window.deletarFrase = async (id) => { if(confirm("Excluir?")) await deleteDoc(doc(db, "frases", id)); };
window.copiarFrase = (t) => { navigator.clipboard.writeText(t).then(() => { const f=document.getElementById('copyFeedback'); f.style.display='block'; setTimeout(()=>f.style.display='none',2000); }); };
window.salvarNovaSenha = async () => { const p = document.getElementById('new-password').value; if(!p || p.length < 6) return alert("Mínimo 6 caracteres"); try { await updatePassword(auth.currentUser, p); alert("Senha alterada com sucesso!"); closeChangePasswordModal(); } catch(e) { console.error(e); alert(mensagemErroAuth(e)); } };
let unsubscribeFrases = null;
async function carregarFrases() {
    const c = document.getElementById('frases-list-container');
    if (!c) return;
    if (unsubscribeFrases) unsubscribeFrases(); // evita acumular listeners
    try {
        unsubscribeFrases = onSnapshot(query(collection(db, "frases"), orderBy("data", "desc")), (s) => {
            c.innerHTML = '';
            s.forEach(d => {
                const f = d.data();
                const k = document.createElement('div');
                k.className = 'frase-item';
                const menu = f.uid === auth.currentUser.uid ? `<div class="options-menu-container"><div class="options-btn" onclick="toggleFraseMenu(this); event.stopPropagation();">...</div><div class="options-dropdown"><div class="options-item" onclick="editarFrase(${jsArg(d.id)}, ${jsArg(f.texto)});event.stopPropagation()">Editar</div><div class="options-item danger" onclick="deletarFrase(${jsArg(d.id)});event.stopPropagation()">Excluir</div></div></div>` : '';
                k.onclick = () => copiarFrase(f.texto);
                k.innerHTML = `<div class="frase-content">"${esc(f.texto)}"</div><div class="frase-author">- ${esc(f.autor)}</div>${menu}`;
                c.appendChild(k);
            });
        });
    } catch(e) { console.error("Erro ao carregar frases:", e); }
}
function comprimirImagem(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image(); img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const MAX_WIDTH = 600; const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => reject("Erro img.");
        };
        reader.onerror = () => reject("Erro file.");
        reader.readAsDataURL(file);
    });
}
// --- FUNÇÃO DE VER PERFIL COMPLETA ---
window.verPerfil = async (uid) => {
    try {
        const s = await getDoc(doc(db, "users", uid)); 
        if(!s.exists()) return;
        
        const u = s.data(); 
        
        // 1. Preencher Cabeçalho
        document.getElementById('profile-modal-name').innerText = u.nome || "Desconhecido"; 
        document.getElementById('profile-modal-char').innerText = u.apelido || "Sem Apelido";
        document.getElementById('profile-modal-img').src = u.avatar || IMG_PADRAO;
        
        // 2. Renderizar Elementos e Kekkeis
        renderizarIcones(u.elementos || [], 'profile-elementos-container', ELEMENTOS_ICONS, 'Naturezas');
        renderizarIcones(u.kekkei_genkai || [], 'profile-kekkei-container', KEKKEI_ICONS, 'Kekkei Genkai');
        renderizarIcones(u.kekkei_moura || [], 'profile-moura-container', KEKKEI_MOURA_ICONS, 'Kekkei Moura');
        renderizarIcones(u.kekkei_touta || [], 'profile-touta-container', KEKKEI_TOUTA_ICONS, 'Kekkei Touta');
        renderizarIcones(u.bijuus || [], 'profile-bijuu-container', BIJUU_ICONS, 'Bijuu');

        // 3. Calcular Contagens de Inventário
        let totalJutsus = (u.meusJutsus || []).length;
        let totalTools = 0;
        let totalItems = 0;

        if (u.inventario) {
            for (const [id, qtd] of Object.entries(u.inventario)) {
                // Tenta identificar se é ferramenta ou item pelo mapa global
                if (globalItensMap[id] && globalItensMap[id].type === 'tool') {
                    totalTools += qtd;
                } else {
                    totalItems += qtd;
                }
            }
        }

        // 4. HTML dos Contadores de Inventário
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

        // 5. HTML Completo das Estatísticas (Geral, Batalha, Vitalidade, Atributos)
        const statsContainer = document.getElementById('other-profile-stats'); 
        statsContainer.innerHTML = `
            <div class="stats-divider">Geral</div>
            <div class="stat-card"><div class="stat-value">${esc(u.nivel||1)}</div><div class="stat-label">Nível</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.cargo||'Genin')}</div><div class="stat-label">Cargo</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.patente||'Genin')}</div><div class="stat-label">Patente</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.rank||'E')}</div><div class="stat-label">Rank</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.speed_rank ?? 1)}</div><div class="stat-label">Velocidade</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.reacao ?? 1)}</div><div class="stat-label">Reação</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.tipo||'Normal')}</div><div class="stat-label">Tipo</div></div>
            
            <div class="stats-divider">Batalha</div>
            <div class="stat-card"><div class="stat-value">${esc(u.vitorias||0)}</div><div class="stat-label">Vitórias</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.empates||0)}</div><div class="stat-label">Empates</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.derrotas||0)}</div><div class="stat-label">Derrotas</div></div>
            
            <div class="stats-divider">Inventário</div>
            <div style="grid-column: 1 / -1; display:grid; grid-template-columns: repeat(3, 1fr); gap:10px;">${invHtml}</div>
            
            <div class="stats-divider">Vitalidade</div>
            <div class="stat-card"><div class="stat-value">${esc(u.vida ?? 100)}</div><div class="stat-label">Vida</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.chakra ?? 100)}</div><div class="stat-label">Chakra</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.stamina ?? 100)}</div><div class="stat-label">Stamina</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.controle_chakra||"Baixo")}</div><div class="stat-label">Controle</div></div>
            
            <div class="stats-divider">Atributos</div>
            <div class="stat-card"><div class="stat-value">${esc(u.forca||10)}</div><div class="stat-label">Força</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.defesa||10)}</div><div class="stat-label">Defesa</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.agilidade||10)}</div><div class="stat-label">Agilidade</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.velocidade||10)}</div><div class="stat-label">Velocidade</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.intelecto||10)}</div><div class="stat-label">Intelecto</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.constituicao||10)}</div><div class="stat-label">Constituição</div></div>
            <div class="stat-card"><div class="stat-value">${esc(u.destreza||10)}</div><div class="stat-label">Destreza</div></div>
        `;
        
        document.getElementById('profileModal').style.display = 'flex'; 

    } catch(e) { 
        console.error("Erro ao abrir perfil:", e); 
    }
};

// --- PAINEL KAGE (ADMIN) ---
async function carregarPainelAdmin() { 
    const c = document.getElementById('admin-missoes-grid'); 
    if(!c) return;
    
    c.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">Buscando solicitações...</p>'; 
    
    try {
        const s = await getDocs(collection(db, "users")); 
        c.innerHTML = '';
        let pendencias = false;

        s.forEach(u => { 
            const d = u.data(); 
            const m = d.statusMissoes || {}; 
            const cq = d.statusConquistas || {}; 

            // Renderizar Missões
            for(const [mid, st] of Object.entries(m)) { 
                if(st === 'em_andamento') { 
                    pendencias = true;
                    criarCardAdmin(c, d, u.id, mid, 'Missão', 'window.aprovarMissao');
                } 
            } 
            
            // Renderizar Conquistas
            for(const [cid, st] of Object.entries(cq)) { 
                if(st === 'solicitado') { 
                    pendencias = true;
                    criarCardAdmin(c, d, u.id, cid, 'Conquista', 'window.aprovarConquista');
                } 
            } 
        });

        if (!pendencias) {
            c.innerHTML = '<p style="text-align:center; padding:20px; grid-column:1/-1; color:#999;">Nenhuma solicitação pendente.</p>';
        }
    } catch(e) { 
        console.error(e);
        c.innerHTML = '<p style="color:var(--danger-color);">Erro ao carregar painel.</p>';
    } 
}

// --- PAINEL KAGE: EXPORTAR / IMPORTAR JUTSUS, FERRAMENTAS E ITENS ---
const COLECOES_CATALOGO = ['jutsus', 'ferramentas', 'itens'];
window.exportarCatalogo = async () => {
    const btn = document.getElementById('btn-exportar-catalogo');
    if (btn) { btn.disabled = true; btn.innerText = 'Exportando...'; }
    try {
        const pacote = { formato: 'rpg-naruto-catalogo', versao: 1, exportadoEm: new Date().toISOString() };
        for (const col of COLECOES_CATALOGO) {
            const snap = await getDocs(collection(db, col));
            pacote[col] = {};
            snap.forEach(d => { pacote[col][d.id] = d.data(); });
        }
        const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `catalogo-rpg-naruto-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        const total = COLECOES_CATALOGO.reduce((n, c) => n + Object.keys(pacote[c]).length, 0);
        document.getElementById('catalogo-status').innerHTML = `✅ Arquivo baixado com ${total} registros (${COLECOES_CATALOGO.map(c => `${Object.keys(pacote[c]).length} ${c}`).join(', ')}).`;
    } catch (e) {
        console.error(e);
        alert("Erro ao exportar: " + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-download" aria-hidden="true"></i> Exportar'; }
    }
};

let importacaoPendente = null;
window.lerArquivoImportacao = async (ev) => {
    const arquivo = ev.target.files[0];
    ev.target.value = '';
    if (!arquivo) return;
    const area = document.getElementById('catalogo-previa');
    try {
        const pacote = JSON.parse(await arquivo.text());
        if (!COLECOES_CATALOGO.some(c => pacote[c] && typeof pacote[c] === 'object')) throw new Error('O arquivo não tem jutsus, ferramentas nem itens.');
        const mudancas = [];
        for (const col of COLECOES_CATALOGO) {
            if (!pacote[col]) continue;
            const atuais = {};
            (await getDocs(collection(db, col))).forEach(d => { atuais[d.id] = d.data(); });
            for (const [id, novo] of Object.entries(pacote[col])) {
                if (!novo || typeof novo !== 'object') continue;
                const atual = atuais[id];
                const campos = Object.keys(novo).filter(k => JSON.stringify(novo[k]) !== JSON.stringify(atual ? atual[k] : undefined));
                if (!campos.length) continue;
                mudancas.push({ col, id, novo: !atual, nome: novo.nome || atual?.nome || novo.titulo || id, campos, dados: Object.fromEntries(campos.map(k => [k, novo[k]])), antes: atual || {} });
            }
        }
        importacaoPendente = mudancas;
        if (!mudancas.length) { area.innerHTML = '<p class="arena-vazio">Nada para mudar: tudo no arquivo já é igual ao banco.</p>'; return; }
        const fmt = (v) => v === undefined ? '<em>vazio</em>' : esc(typeof v === 'object' ? JSON.stringify(v) : String(v));
        area.innerHTML = `
            <p class="form-ajuda">Revise o que vai mudar. Desmarque o que não quiser importar. Nada é apagado: só campos novos ou alterados.</p>
            <div class="importacao-lista">${mudancas.map((m, i) => `
                <details class="importacao-item">
                    <summary><label><input type="checkbox" class="importacao-check" data-i="${i}" checked> <strong>${esc(m.nome)}</strong> <small>(${esc(m.col)}${m.novo ? ' · NOVO' : ''} · ${m.campos.length} campo${m.campos.length > 1 ? 's' : ''})</small></label></summary>
                    <table class="importacao-tabela">${m.campos.map(k => `<tr><td>${esc(k)}</td><td>${fmt(m.antes[k])}</td><td>→</td><td><strong>${fmt(m.dados[k])}</strong></td></tr>`).join('')}</table>
                </details>`).join('')}</div>
            <div class="importacao-acoes">
                <button class="buy-btn" onclick="window.confirmarImportacao()"><i class="fa-solid fa-file-import" aria-hidden="true"></i> Importar selecionados</button>
                <button class="btn-arena-sec" onclick="document.getElementById('catalogo-previa').innerHTML=''">Cancelar</button>
            </div>`;
    } catch (e) {
        console.error(e);
        area.innerHTML = `<p style="color:var(--danger);font-weight:700;">Não foi possível ler o arquivo: ${esc(e.message)}</p>`;
    }
};

window.confirmarImportacao = async () => {
    if (!importacaoPendente) return;
    const escolhidos = [...document.querySelectorAll('.importacao-check:checked')].map(c => importacaoPendente[Number(c.dataset.i)]);
    if (!escolhidos.length) return alert("Nenhum registro selecionado.");
    if (!confirm(`Importar ${escolhidos.length} registro(s) para o banco?`)) return;
    try {
        for (let i = 0; i < escolhidos.length; i += 400) {
            const lote = writeBatch(db);
            escolhidos.slice(i, i + 400).forEach(m => lote.set(doc(db, m.col, m.id), m.dados, { merge: true }));
            await lote.commit();
        }
        limparCache();
        importacaoPendente = null;
        document.getElementById('catalogo-previa').innerHTML = '';
        document.getElementById('catalogo-status').innerHTML = `✅ ${escolhidos.length} registro(s) importado(s) com sucesso.`;
    } catch (e) {
        console.error(e);
        alert("Erro ao importar: " + e.message);
    }
};

// --- PAINEL KAGE: PRÊMIOS DA ROLETA A ENTREGAR ---
window.carregarPremiosPendentesAdmin = async () => {
    const c = document.getElementById('admin-premios-list');
    if (!c) return;
    c.innerHTML = '<p style="color:#777; text-align:center;">Procurando prêmios...</p>';
    try {
        const s = await lerColecao("users", true);
        c.innerHTML = '';
        let total = 0;
        s.forEach(u => {
            const d = u.data();
            (d.premios_pendentes || []).forEach((p, indice) => {
                total++;
                const nome = p.nome || p.item || "Prêmio";
                const ehMoeda = p.tipo === 'moeda_ryos' || p.tipo === 'moeda_en';
                const linha = document.createElement('div');
                linha.className = 'premio-pendente';
                linha.innerHTML = `
                    <div class="premio-info">
                        <strong>${esc(d.nome || "Ninja")}</strong>
                        <span>🎁 ${esc(nome)} <small>· ${esc(p.data || "")}${p.pago ? " · giro pago" : ""}</small></span>
                    </div>
                    <div class="premio-acoes">
                        <button class="btn-adm btn-adm-approve" onclick="window.entregarPremio(${jsArg(u.id)}, ${jsArg(chavePremio(p, indice))}, true)"><i class="fa-solid fa-check" aria-hidden="true"></i> ${ehMoeda ? 'Creditar' : 'Entregue'}</button>
                        <button class="btn-adm btn-adm-reject" onclick="window.entregarPremio(${jsArg(u.id)}, ${jsArg(chavePremio(p, indice))}, false)" title="Descartar (ex.: prêmio inválido)"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                    </div>`;
                c.appendChild(linha);
            });
        });
        if (total === 0) c.innerHTML = '<p style="text-align:center; color:#999; padding: 10px;">Nenhum prêmio aguardando entrega.</p>';
    } catch (e) {
        console.error(e);
        c.innerHTML = '<p style="color:var(--danger-color);">Erro ao carregar prêmios.</p>';
    }
};

// Identifica um prêmio: pelo id ou, nos antigos (sem id), pela posição + conteúdo
function chavePremio(p, indice) {
    return p.id !== undefined && p.id !== null ? 'id:' + p.id : `pos:${indice}:${p.item || p.nome || ''}:${p.data || ''}`;
}
const tipoDoPremio = (p) => (typeof p.valor === 'string' && p.valor) || p.item || p.nome || '';

// entregar=true: credita (Ryos/EN) ou marca item como entregue. entregar=false: descarta.
window.entregarPremio = async (uid, premioId, entregar) => {
    if (!entregar && !confirm("Descartar este prêmio sem entregar?")) return;
    try {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const lista = snap.data().premios_pendentes || [];
        const indice = lista.findIndex((p, i) => chavePremio(p, i) === premioId);
        const premio = lista[indice];
        if (!premio) { alert("Este prêmio já foi resolvido."); return window.carregarPremiosPendentesAdmin(); }
        const atualizacao = { premios_pendentes: lista.filter((_, i) => i !== indice) };
        if (entregar) {
            if (premio.tipo === 'moeda_ryos') atualizacao.ryos = increment(numero(premio.valor));
            if (premio.tipo === 'moeda_en') atualizacao.essencia_ninja = increment(numero(premio.valor));
            atualizacao.premios_recebidos = arrayUnion({ ...premio, entregueEm: new Date().toLocaleDateString('pt-BR') });
        }
        await updateDoc(ref, atualizacao);
        window.carregarPremiosPendentesAdmin();
    } catch (e) { console.error(e); alert("Erro ao atualizar o prêmio."); }
};

// Descarta TODOS os prêmios pendentes de todos os jogadores (não credita nada)
window.limparTodosPremios = async () => {
    if (!confirm("Descartar TODOS os prêmios da roleta pendentes, de todos os jogadores?\n\nNada é creditado. Isso não pode ser desfeito.")) return;
    if (prompt('Para confirmar, digite DESCARTAR') !== 'DESCARTAR') return;
    try {
        const s = await getDocs(collection(db, "users"));
        const alvos = s.docs.filter(u => (u.data().premios_pendentes || []).length);
        for (let i = 0; i < alvos.length; i += 400) {
            const lote = writeBatch(db);
            alvos.slice(i, i + 400).forEach(u => lote.update(doc(db, "users", u.id), { premios_pendentes: [] }));
            await lote.commit();
        }
        limparCache();
        alert(`Prêmios descartados de ${alvos.length} jogador(es).`);
        window.carregarPremiosPendentesAdmin();
    } catch (e) { console.error(e); alert("Erro ao descartar os prêmios: " + e.message); }
};

// Recusa TODAS as solicitações pendentes (missões em andamento e conquistas pedidas)
window.limparTodasAprovacoes = async () => {
    if (!confirm("Recusar TODAS as aprovações pendentes (missões e conquistas) de todos os jogadores?\n\nOs ninjas poderão pedir de novo depois.")) return;
    if (prompt('Para confirmar, digite RECUSAR') !== 'RECUSAR') return;
    try {
        const s = await getDocs(collection(db, "users"));
        const mudancas = [];
        s.forEach(u => {
            const d = u.data(), upd = {};
            for (const [id, st] of Object.entries(d.statusMissoes || {})) if (st === 'em_andamento') upd[`statusMissoes.${id}`] = deleteField();
            for (const [id, st] of Object.entries(d.statusConquistas || {})) if (st === 'solicitado') upd[`statusConquistas.${id}`] = deleteField();
            if (Object.keys(upd).length) mudancas.push([u.id, upd]);
        });
        for (let i = 0; i < mudancas.length; i += 400) {
            const lote = writeBatch(db);
            mudancas.slice(i, i + 400).forEach(([uid, upd]) => lote.update(doc(db, "users", uid), upd));
            await lote.commit();
        }
        const total = mudancas.reduce((n, [, u]) => n + Object.keys(u).length, 0);
        alert(`${total} solicitação(ões) recusada(s).`);
        carregarPainelAdmin();
    } catch (e) { console.error(e); alert("Erro ao recusar: " + e.message); }
};

// =====================================================================
//  RESGATE DE PRÊMIOS DA ROLETA (o próprio jogador escolhe)
//  Jutsu Rank B, Ferramenta Especial, Arma Ninja e Modificador de Atributo.
//  As regras de segurança conferem tudo (rank, item marcado, +1 no atributo).
// =====================================================================
const PREMIOS_RESGATAVEIS = {
    'Jutsu Rank B': { icone: '📜', texto: 'Escolha um jutsu Rank B' },
    'Ferramenta Especial': { icone: '🧰', texto: 'Escolha uma Ferramenta Especial' },
    'Arma Ninja': { icone: '🗡️', texto: 'Escolha uma Arma Ninja' },
    'Modificador de Atributo': { icone: '💪', texto: 'Escolha o atributo que vai receber +50 (ou o máximo de Vida, Chakra ou Stamina)' }
};
const ATRIBUTOS_MODIFICADOR = [['forca', 'Força', '💪'], ['defesa', 'Defesa', '🛡️'], ['constituicao', 'Constituição', '🫀'], ['destreza', 'Destreza', '🎯'], ['intelecto', 'Intelecto', '🧠'], ['agilidade', 'Agilidade', '💨'],
    ['max_vida', 'Vida máxima', '❤️'], ['max_chakra', 'Chakra máximo', '🔵'], ['max_stamina', 'Stamina máxima', '🟢']];
const VALOR_MODIFICADOR = 50;   // (se mudar aqui, mude também em firestore.rules → resgateAtributo)

function premiosResgataveis(tipo) {
    return (currentUserData?.premios_pendentes || []).filter(p => tipo ? tipoDoPremio(p) === tipo : PREMIOS_RESGATAVEIS[tipoDoPremio(p)]);
}
window.temPremio = (tipo) => premiosResgataveis(tipo).length > 0;

// Pode resgatar este jutsu? (Rank B, não tem ainda, não é exclusivo de outro personagem)
function jutsuResgatavel(id, j) {
    const rank = String(j.rank || '').toUpperCase().replace(/RANK[\s-]*/g, '').trim();
    const restrito = Array.isArray(j.restrito_a) && j.restrito_a.length && !j.restrito_a.includes(currentUserData?.nome);
    return rank === 'B' && !(currentUserData?.meusJutsus || []).includes(id) && !restrito;
}

window.resgatarPremio = async (tipoPremio, destino, nomeDestino) => {
    if (!confirm(`Usar o prêmio "${tipoPremio}" para receber ${nomeDestino}?`)) return;
    const uid = minhaUid();
    const ref = doc(db, "users", uid);
    try {
        const d = (await getDoc(ref)).data() || {};
        const lista = d.premios_pendentes || [];
        const indice = lista.findIndex(p => tipoDoPremio(p) === tipoPremio);
        if (indice < 0) return alert("Você não tem mais esse prêmio para resgatar.");
        const upd = { premios_pendentes: lista.filter((_, i) => i !== indice), ultimoResgate: { indice, tipo: destino.tipo, id: destino.id } };
        if (destino.tipo === 'jutsu') {
            if ((d.meusJutsus || []).includes(destino.id)) return alert("Você já tem esse jutsu.");
            upd.meusJutsus = [...(d.meusJutsus || []), destino.id];
        } else if (destino.tipo === 'atributo') {
            upd[destino.id] = numero(d[destino.id]) + VALOR_MODIFICADOR;
        } else {
            upd[`inventario.${destino.id}`] = numero((d.inventario || {})[destino.id]) + 1;
        }
        await updateDoc(ref, upd);
        document.getElementById('modal-resgate').style.display = 'none';
        limparCache();
        alert(`🎁 Prêmio resgatado: ${nomeDestino}!`);
    } catch (e) {
        console.error(e);
        alert("Não foi possível resgatar: " + (e.code === 'permission-denied' ? 'o banco recusou (confira se o item ainda é válido para esse prêmio).' : e.message));
    }
};

// Janela de escolha (lista as opções do prêmio)
window.abrirResgate = async (tipoPremio) => {
    const info = PREMIOS_RESGATAVEIS[tipoPremio];
    if (!info) return;
    document.getElementById('resgate-titulo').innerText = `${info.icone} ${tipoPremio}`;
    document.getElementById('resgate-ajuda').innerText = info.texto + '.';
    const area = document.getElementById('resgate-opcoes');
    area.innerHTML = '<p class="arena-vazio">Carregando...</p>';
    document.getElementById('modal-resgate').style.display = 'flex';
    let opcoes = [];
    try {
        if (tipoPremio === 'Modificador de Atributo') {
            opcoes = ATRIBUTOS_MODIFICADOR.map(([id, nome, icone]) => ({ destino: { tipo: 'atributo', id }, nome, sub: `${formatarNum(numero(currentUserData[id]))} → ${formatarNum(numero(currentUserData[id]) + VALOR_MODIFICADOR)}`, icone }));
        } else if (tipoPremio === 'Jutsu Rank B') {
            const s = await lerColecao("jutsus");
            s.forEach(d => { const j = d.data(); if (jutsuResgatavel(d.id, j)) opcoes.push({ destino: { tipo: 'jutsu', id: d.id }, nome: j.nome || d.id, sub: 'Rank B', img: j.imagem }); });
        } else {
            for (const col of ['ferramentas', 'itens']) {
                const s = await lerColecao(col);
                s.forEach(d => { const it = d.data(); if (it.premio_roleta === tipoPremio) opcoes.push({ destino: { tipo: col, id: d.id }, nome: it.nome || d.id, sub: it.dano || (col === 'itens' ? 'Item' : 'Ferramenta'), img: it.imagem }); });
            }
        }
    } catch (e) { console.error(e); }
    if (tipoPremio !== 'Modificador de Atributo') opcoes.sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    area.innerHTML = opcoes.length ? opcoes.map(o => `
        <button class="resgate-opcao" onclick="window.resgatarPremio(${jsArg(tipoPremio)}, ${esc(JSON.stringify(o.destino))}, ${jsArg(o.nome)})">
            ${o.img ? `<img src="${esc(o.img)}" alt="" loading="lazy">` : `<span class="resgate-icone">${o.icone || info.icone}</span>`}
            <strong>${esc(o.nome)}</strong><small>${esc(o.sub || '')}</small>
        </button>`).join('')
        : `<p class="arena-vazio">Ainda não há opções cadastradas para este prêmio. O Kage precisa marcar itens na loja como "${esc(tipoPremio)}".</p>`;
};

// Quadro "Seus prêmios" na aba da Roleta
function renderMeusPremios() {
    const c = document.getElementById('meus-premios');
    if (!c) return;
    const lista = currentUserData?.premios_pendentes || [];
    if (!lista.length) { c.innerHTML = ''; return; }
    const grupos = {};
    lista.forEach(p => { const t = tipoDoPremio(p); (grupos[t] = grupos[t] || []).push(p); });
    c.innerHTML = `<h3 class="section-title">🎁 Seus prêmios</h3><div class="meus-premios-lista">${Object.entries(grupos).map(([tipo, ps]) => {
        const r = PREMIOS_RESGATAVEIS[tipo];
        const nome = ps[0].nome || ps[0].item || tipo;
        return `<div class="premio-meu"><span class="premio-meu-icone">${r ? r.icone : '💰'}</span>
            <div><strong>${esc(r ? tipo : nome)}</strong>${ps.length > 1 ? ` <span class="qtd-badge">x${ps.length}</span>` : ''}<small>${r ? 'Resgate você mesmo' : 'O Kage credita em breve'}</small></div>
            ${r ? `<button class="buy-btn" onclick="window.abrirResgate(${jsArg(tipo)})">Resgatar</button>` : ''}</div>`;
    }).join('')}</div>`;
}

// Carrega a lista de Diários no Painel Kage
window.carregarDiariosAdmin = () => {
    const container = document.getElementById('admin-diarios-list');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align:center; color:#777;">Procurando diários...</p>';
    
    // Busca todos os chats onde o "MESTRE" está marcado como participante
    const q = query(collection(db, "chats"), where("participantes", "array-contains", "MESTRE"));
    
    // Usamos onSnapshot para que você veja a notificação de nova mensagem brotar na hora
    // (desliga o listener anterior para não acumular um novo a cada abertura da aba)
    if (window._unsubDiariosAdmin) window._unsubDiariosAdmin();
    window._unsubDiariosAdmin = onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        
        if(snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; color:#999; padding: 10px;">Nenhum diário ativo no momento.</p>';
            return;
        }
        
        snapshot.forEach(docSnap => {
            const dados = docSnap.data();
            
            // Descobre qual é o ID do jogador (o participante que NÃO é o MESTRE)
            const playerId = dados.participantes.find(id => id !== "MESTRE");
            if (!playerId) return;
            
            const nomePlayer = dados.nomes ? dados.nomes[playerId] : "Ninja";
            const naoLidas = dados.naoLidas_MESTRE || 0;
            
            const div = document.createElement('div');
            // Reutilizamos o estilo bonito da sua lista de chats normal
            div.className = 'chat-list-item'; 
            div.onclick = () => {
                window.zerarNaoLidas(docSnap.id); // Zera as não lidas do Mestre
                window.abrirDiarioComoMestre(playerId, nomePlayer);
            };
            
            div.innerHTML = `
                <div style="display:flex; flex-direction:column; overflow: hidden; padding-right: 10px;">
                    <strong style="color:var(--primary-color); font-size: 1rem;"><i class="fa-solid fa-book-journal-whills"></i> Diário de ${esc(nomePlayer)}</strong>
                    <span style="font-size:0.85rem; color:#777; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${esc(dados.ultimaMensagem || "Nenhuma anotação ainda...")}
                    </span>
                </div>
                ${naoLidas > 0 ? '<span class="unread-badge" style="background:#f1c40f; color:#333;">' + esc(naoLidas) + '</span>' : ''}
            `;
            container.appendChild(div);
        });
    });
};

// Abre a janela de Chat com o status invertido para o Mestre
window.abrirDiarioComoMestre = (playerId, playerName) => {
    document.getElementById('chat-status-dot').style.background = '#f1c40f'; // Bolinha dourada
    document.getElementById('chat-user-name').innerText = "Diário: " + playerName;
    document.getElementById('chat-widget').style.display = 'flex';
    
    currentChatUserId = playerId; 
    window.currentSalaId = "diario_" + playerId;
    
    window.carregarMensagensDaSala(window.currentSalaId);
};


function criarCardAdmin(container, userData, uid, itemId, tipo, funcaoAprovar) {
    const div = document.createElement('div');
    div.className = 'admin-card'; // Usando a nova classe
    
    const tipoSlug = tipo.toLowerCase().includes('miss') ? 'missao' : 'conquista';

    div.innerHTML = `
        <div class="admin-card-header">
            <img src="${esc(userData.avatar || IMG_PADRAO)}" alt="Avatar">
            <div>
                <h4 style="margin:0; font-size:0.9rem; color:#2d3436;">${esc(userData.nome)}</h4>
                <small style="color:var(--primary-color); font-weight:800; text-transform:uppercase; font-size:0.65rem;">
                    <i class="fa-solid fa-scroll"></i> ${tipo}
                </small>
            </div>
        </div>

        <div class="admin-card-id">
            <strong>ID:</strong> ${esc(itemId)}
        </div>
        
        <div class="admin-actions">
            <button class="btn-adm btn-adm-approve" onclick="${funcaoAprovar}(${jsArg(uid)},${jsArg(itemId)})">
                <i class="fa-solid fa-check"></i> Aprovar
            </button>
            
            <button class="btn-adm btn-adm-reject" onclick="window.reprovarSolicitacao(${jsArg(uid)}, ${jsArg(itemId)}, ${jsArg(tipoSlug)}, this)">
                <i class="fa-solid fa-xmark"></i> Recusar
            </button>
        </div>
    `;
    container.appendChild(div);
}


window.aprovarMissao = async (uid, mid) => { 
    if(confirm("Confirmar conclusão da missão?")) { 
        await updateDoc(doc(db, "users", uid), { [`statusMissoes.${mid}`]: 'aprovado' }); 
        alert("Aprovado!"); 
        carregarPainelAdmin(); 
    } 
};

window.aprovarConquista = async (uid, cid) => { 
    if(confirm("Confirmar conquista?")) { 
        await updateDoc(doc(db, "users", uid), { [`statusConquistas.${cid}`]: 'aprovado' }); 
        alert("Aprovado!"); 
        carregarPainelAdmin(); 
    } 
};


window.reprovarSolicitacao = async (uid, id, tipo, btn) => {
    if(!confirm("Deseja reprovar esta solicitação? O ninja poderá tentar novamente.")) return;
    
    if(btn) btn.disabled = true;

    try {
        const userRef = doc(db, "users", uid);
        const campoStatus = tipo === 'missao' ? `statusMissoes.${id}` : `statusConquistas.${id}`;

        // Remove o status atual para que o botão de "Iniciar" ou "Resgatar" reapareça para o player
        await updateDoc(userRef, {
            [campoStatus]: deleteField() // Importe deleteField do firebase/firestore se não tiver
        });

        alert("Solicitação reprovada! O ninja já pode tentar novamente.");
        
        // Fecha o modal e atualiza o painel
        fecharMissaoModal();
        fecharConquistaModal();
        carregarPainelAdmin(); 

    } catch (e) {
        console.error(e);
        alert("Erro ao reprovar.");
        if(btn) btn.disabled = false;
    }
};


// Calcula o custo em EN conforme o usuário digita os Ryos
window.calcularCustoEN = (valor) => {
    const qtdRyos = parseInt(valor) || 0;
    const custo = Math.ceil(qtdRyos / 10); // 10 Ryos = 1 EN
    document.getElementById('label-custo-en').innerText = custo;
};

// Executa a compra de Ryos usando EN
window.confirmarTrocaRyos = async () => {
    const qtdRyos = parseInt(document.getElementById('input-qtd-ryos').value) || 0;
    if(qtdRyos <= 0) return alert("Digite uma quantidade válida!");
    
    const custoEN = Math.ceil(qtdRyos / 10);
    const enAtual = currentUserData.essencia_ninja || 0;

    if(enAtual < custoEN) {
        return alert("Você não possui Essência Ninja suficiente!");
    }

    if(confirm(`Deseja trocar ${custoEN} EN por ${qtdRyos} Ryos?`)) {
        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await updateDoc(userRef, {
                essencia_ninja: increment(-custoEN),
                ryos: increment(qtdRyos)
            });
            alert("Troca realizada com sucesso!");
            document.getElementById('input-qtd-ryos').value = "";
            document.getElementById('label-custo-en').innerText = "0";
        } catch(e) {
            alert("Erro ao realizar a transação.");
        }
    }
};

// Abre o modal com o QR Code do Pix
window.abrirModalPix = (plano) => {
    const modal = document.getElementById('pixModal');
    const img = document.getElementById('pix-qrcode');
    const title = document.getElementById('pix-title');
    
    const linksPix = {
        'plano100': "img/pix/plano100.jpg",
        'plano300': "img/pix/plano300.jpg",
        'plano500': "img/pix/plano500.jpg"
    };

    title.innerText = "Adquirir EN (" + plano.replace('plano', '') + " unidades)";
    img.src = linksPix[plano] || IMG_PADRAO;
    modal.style.display = 'flex';
};


window.abrirModalCriacao = () => {
    const btnAdd = document.getElementById('btn-adicionar-geral');
    if (!btnAdd) return;

    const tipo = (btnAdd.getAttribute('data-tipo') || "").trim().toLowerCase();
    const container = document.getElementById('campos-dinamicos');
    const tituloModal = document.getElementById('titulo-modal-criacao');

    container.innerHTML = '';
    tituloModal.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> CRIAR ${tipo.toUpperCase()}`;

    const campo = (label, id, type = 'text', ph = '') => `
        <div class="input-group">
            <label>${label}</label>
            <input type="${type}" id="${id}" placeholder="${ph}">
        </div>
    `;

    // --- BLOCO 1: NOME E IMAGEM (Padrão) ---
    let html = `
        <div class="input-grid-2">
            ${campo((tipo.includes('missoes') || tipo.includes('conquistas')) ? 'TÍTULO' : 'NOME', 'cre-nome', 'text', 'Ex: Chidori')}
            ${campo('URL DA IMAGEM', 'cre-imagem', 'text', 'https://...')}
        </div>
        <div class="input-group">
            <label>DESCRIÇÃO</label>
            <textarea id="cre-desc" placeholder="Detalhes técnicos e efeitos..."></textarea>
        </div>
    `;

    // --- BLOCO 2: ESPECÍFICO POR TIPO ---

    // CASO: JUTSUS — campos da arena (veja REGULAMENTO_ARENA.md)
    const selecao = (label, id, opcoes) => `
        <div class="input-group"><label for="${id}">${label}</label>
            <select id="${id}">${opcoes.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></div>`;
    const ajuda = (t) => `<p class="form-ajuda">${t}</p>`;
    if (tipo.includes('jutsus')) {
        html += `
            <div class="input-grid-3">
                ${campo('PREÇO (RYOS)', 'cre-preco', 'number', '0')}
                ${campo('REQUISITO (NV)', 'cre-requisito', 'number', '1')}
                ${selecao('RANK', 'cre-rank', [['E', 'E'], ['D', 'D'], ['C', 'C'], ['B', 'B'], ['A', 'A'], ['S', 'S']])}
            </div>
            <div class="form-caixa">
                <h4><i class="fa-solid fa-khanda" aria-hidden="true"></i> Arena</h4>
                <div class="input-grid-2">
                    ${selecao('FUNÇÃO', 'cre-funcao', [['ataque', '⚔️ Ataque'], ['defesa', '🛡️ Defesa'], ['esquiva', '💨 Esquiva/Escape'], ['suporte', '✨ Suporte'], ['modo', '🌀 Modo / Doujutsu'], ['criacao', '🌳 Criação (raízes, pedras...)'], ['kai', '✋ Contra-Genjutsu (Kai)'], ['espelho', '🪞 Reflexo de Genjutsu']])}
                    ${selecao('CATEGORIA', 'cre-categoria-jutsu', [['ninjutsu', 'Ninjutsu (soma Intelecto)'], ['taijutsu', 'Taijutsu (soma Força)'], ['genjutsu', 'Genjutsu (soma Intelecto)'], ['bukijutsu', 'Bukijutsu (soma Destreza)'], ['kenjutsu', 'Kenjutsu (soma Destreza)'], ['fuuinjutsu', 'Fuuinjutsu (soma Intelecto)'], ['senjutsu', 'Senjutsu (soma Intelecto)']])}
                </div>
                <div class="input-grid-3">
                    ${campo('PODER', 'cre-poder', 'number', 'Ex: 30')}
                    ${campo('CUSTO CHAKRA', 'cre-chakra', 'number', '0')}
                    ${campo('CUSTO STAMINA', 'cre-stamina', 'number', '0')}
                </div>
                ${ajuda('<strong>Poder</strong>: no ataque é o dano (somado ao atributo da categoria); na defesa é quanto absorve (somado à Defesa); na esquiva é quanto soma na Velocidade; no suporte/modo é o valor do bônus.')}
                <div class="input-grid-2">
                    ${campo('REAÇÃO NECESSÁRIA (1-12)', 'cre-reacao', 'number', 'vazio = padrão do Rank')}
                    ${campo('VELOCIDADE NECESSÁRIA (1-12)', 'cre-velocidade', 'number', 'vazio = padrão do Rank')}
                </div>
                <div class="input-grid-3">
                    ${campo('MULTIPLICADOR MÁX.', 'cre-multiplicador', 'number', '1')}
                    ${campo('SANGRAMENTO (DANO/TURNO)', 'cre-sangramento', 'number', '0')}
                    ${campo('SANGRAMENTO (TURNOS)', 'cre-sangramento-turnos', 'number', '2')}
                </div>
                <div class="input-grid-3">
                    ${selecao('EFEITO (SUPORTE/MODO)', 'cre-efeito-jutsu', [['', '—'], ['ataque', '+ Ataque'], ['defesa', '+ Defesa'], ['velocidade', '+ Velocidade'], ['reacao', '+ Reação'], ['precisao', '+ Precisão (acerto)'], ['cura', 'Cura (Vida)'], ['chakra', 'Recupera Chakra'], ['clones', 'Clones']])}
                    ${campo('DURAÇÃO (TURNOS)', 'cre-duracao', 'number', 'modo: vazio = até desativar')}
                    ${campo('MANUTENÇÃO (CP/TURNO)', 'cre-manutencao', 'number', '0')}
                </div>
                ${ajuda('<strong>Clones</strong>: escolha o efeito "Clones" e coloque no Poder quantos clones são criados. O chakra gasto vira a reserva deles.')}
                <div class="form-checks">
                    <label><input type="checkbox" id="cre-imp-esquiva"> Impossível esquivar (ex.: Amaterasu)</label>
                    <label><input type="checkbox" id="cre-imp-defender"> Impossível defender fisicamente</label>
                    <label><input type="checkbox" id="cre-sem-arena"> Sem uso na arena (utilitário, ex.: Transformação)</label>
                </div>
                <details class="form-avancado">
                    <summary>⚙️ Mecânicas especiais (requisitos, criações, genjutsu, chamas, aura)</summary>
                    ${campo('REQUER ATIVO (ids separados por vírgula)', 'cre-requer', 'text', 'Ex: sharingan_3_tomoe, ms_hatsume')}
                    ${ajuda('Basta UM deles estar ativo. Se o requisito for desligado, este efeito também some.')}
                    <div class="input-grid-3">
                        ${selecao('AURA DO MODO', 'cre-aura', [['', 'Automática'], ['sharingan', 'Sharingan'], ['mangekyou', 'Mangekyou'], ['sabio', 'Modo Sábio'], ['byakugan', 'Byakugan'], ['portao', 'Portões'], ['modo', 'Roxa (genérica)']])}
                        ${selecao('RESISTE A GENJUTSU ATÉ', 'cre-resiste', [['', '—'], ['C', 'Rank C'], ['B', 'Rank B'], ['A', 'Rank A'], ['S', 'Rank S']])}
                        ${campo('REAÇÃO MÍNIMA (KAI/REFLEXO)', 'cre-reacao-minima', 'number', '5')}
                    </div>
                    <div class="input-grid-3">
                        ${campo('CRIAÇÃO: NOME', 'cre-criacao-nome', 'text', 'Ex: Raízes')}
                        ${campo('CRIAÇÃO: ÍCONE', 'cre-criacao-icone', 'text', 'Ex: 🌳')}
                        ${campo('CRIAÇÃO: MÁXIMO', 'cre-criacao-max', 'number', 'Ex: 5')}
                    </div>
                    ${campo('CRIAÇÃO: QUANTO CADA UMA ABSORVE', 'cre-criacao-absorve', 'number', '0 = não defende')}
                    ${ajuda('<strong>Criação</strong>: o custo é por unidade e o Poder é o dano de cada uma. Elas ficam no campo até serem desfeitas ou destruídas.')}
                    <div class="input-grid-3">
                        ${selecao('GENJUTSU: EFEITO', 'cre-gen-efeito', [['', '—'], ['paralisia', 'Paralisia (não age nem reage)'], ['sem_reacao', 'Não consegue reagir'], ['confusao', 'Confusão (−Reação/Velocidade)']])}
                        ${campo('GENJUTSU: TURNOS', 'cre-gen-turnos', 'number', '1')}
                        ${campo('GENJUTSU: PENALIDADE / DANO POR TURNO', 'cre-gen-extra', 'text', 'Ex: 2 / 300')}
                    </div>
                    <div class="input-grid-3">
                        ${campo('CHAMAS: DANO POR TURNO', 'cre-chamas', 'number', 'Ex: 800 (Amaterasu)')}
                        ${campo('CHAMAS: MANUTENÇÃO (CP/TURNO)', 'cre-chamas-manutencao', 'number', 'Ex: 200')}
                        ${campo('CUSTO EM VIDA (% DA VIDA MÁX.)', 'cre-custo-vida', 'number', 'Ex: 5')}
                    </div>
                    ${selecao('REFLEXO: DEVOLVE GENJUTSU ATÉ', 'cre-espelho-rank', [['', '—'], ['B', 'Rank B'], ['A', 'Rank A'], ['S', 'Rank S']])}
                </details>
            </div>
        `;
    }
        
    // CASO: FERRAMENTAS / LOJA
    else if (tipo.includes('ferramenta') || tipo.includes('loja')) {
        html += `
            <div class="input-grid-3">
                ${campo('PREÇO', 'cre-preco', 'number', '0')}
                ${campo('REQUISITO (NV)', 'cre-requisito', 'number', '1')}
                ${campo(tipo.includes('ferramenta') ? 'PODER (DANO)' : 'DEFESA', tipo.includes('ferramenta') ? 'cre-poder' : 'cre-defesa', 'number', '0')}
            </div>
            <div class="input-grid-3">
                ${campo('CUSTO STAMINA', 'cre-stamina', 'number', '0')}
                ${tipo.includes('ferramenta') ? campo('MULTIPLICADOR MÁX.', 'cre-multiplicador', 'number', 'Ex: 3 shurikens') : campo('RECUPERA VIDA', 'cre-hp', 'number', '0')}
                ${tipo.includes('ferramenta') ? '' : campo('RECUPERA CHAKRA', 'cre-b-chakra', 'number', '0')}
            </div>
            ${tipo.includes('ferramenta') ? '' : `<div class="input-grid-3">${campo('RECUPERA STAMINA', 'cre-b-stamina', 'number', '0')}</div>`}
            <div class="form-checks">
                ${selecao('PRÊMIO DA ROLETA (pode ser resgatado com)', 'cre-premio-roleta', [['', '— Não'], ['Ferramenta Especial', '🧰 Ferramenta Especial'], ['Arma Ninja', '🗡️ Arma Ninja']])}
                <label><input type="checkbox" id="cre-recuperavel"> Recuperável na arena (volta para o inventário, ex.: katana). Desmarcado = gasta ao usar (ex.: shuriken, pílula).</label>
            </div>
        `;

        // Itens da Loja precisam de categoria (estabelecimento), vila e efeito para aparecerem na loja
        if (tipo.includes('loja')) {
            const categoriasLoja = [
                ['mercado', 'Mercado'], ['comida', 'Restaurantes'], ['remedio', 'Hospital/Farmácia'],
                ['roupa', 'Roupas'], ['acessorio', 'Acessórios'], ['padaria', 'Padaria'],
                ['floricultura', 'Floricultura'], ['ferreiro', 'Ferreiro'], ['biblioteca', 'Biblioteca']
            ];
            html += `
                <div class="input-grid-2">
                    <div class="input-group">
                        <label>ESTABELECIMENTO</label>
                        <select id="cre-tipo-loja" style="width:100%; padding:10px; border-radius:10px; border:2px solid #edf2f7; background:#f8fafc;">
                            ${categoriasLoja.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}
                        </select>
                    </div>
                    ${campo('VILAS (separadas por vírgula)', 'cre-vila', 'text', 'Global ou Konoha, Suna...')}
                </div>
                ${campo('EFEITO', 'cre-efeito', 'text', 'Ex: Recupera 20 de HP')}
            `;
        }
    }
        
    // CASO: MISSÕES / CONQUISTAS
    else if (tipo.includes('missoes') || tipo.includes('conquistas')) {
        html += `
            <div class="input-grid-2">
                <div class="input-group">
                    <label>CATEGORIA</label>
                    <select id="cre-categoria" style="width:100%; padding:10px; border-radius:10px; border:2px solid #edf2f7; background:#f8fafc;">
                        <option value="turno">Turno</option>
                        <option value="card">Card</option>
                    </select>
                </div>
                ${tipo.includes('missoes') ? campo('RANK', 'cre-rank', 'text', 'Rank-D') : ''}
            </div>
            <div class="input-grid-3">
                ${campo('XP', 'cre-xp', 'number', '0')}
                ${campo('ESSÊNCIA NINJA', 'cre-en', 'number', '0')}
                ${campo('RYOS', 'cre-recompensa', 'number', '0')}
            </div>
        `;
    }

    // Campo de Restrição (Comum a todos no final)
    html += campo('RESTRITO A (NOMES)', 'cre-restrito', 'text', 'Ex: Kagetsu Otsutsuki');

    container.innerHTML = html;
    document.getElementById('modalCriacaoGeral').style.display = 'flex';
};


document.getElementById('form-criacao-geral').onsubmit = async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('btn-adicionar-geral').getAttribute('data-tipo');
    const nomeInput = document.getElementById('cre-nome').value;
    
    const gerarSlug = (n) => n.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^\w-]+/g, '');
    const customID = gerarSlug(nomeInput);
    if (!customID) return alert("Preencha um nome/título válido.");

    // A aba "Loja" grava na coleção "itens", que é a que a loja lê
    const colecao = tipo === 'loja' ? 'itens' : tipo;
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : null;

    const restritoArray = (getVal('cre-restrito') || "").split(',').map(n => n.trim()).filter(n => n !== ""); 

    let dados = {
        descricao: getVal('cre-desc') || "",
        imagem: getVal('cre-imagem') || "",
        restrito_a: restritoArray
    };

    // Mapeamento específico por tipo
    if (tipo.includes('missoes') || tipo.includes('conquistas')) {
        dados.titulo = nomeInput;
        dados.categoria = getVal('cre-categoria');
        dados.xp = Number(getVal('cre-xp')) || 0;
        dados.en = Number(getVal('cre-en')) || 0;
        dados.recompensa = Number(getVal('cre-recompensa')) || 0;
        if (tipo.includes('missoes')) dados.rank = getVal('cre-rank') || "";
    } else {
        dados.nome = nomeInput;
        dados.preco = Number(getVal('cre-preco')) || 0;
        dados.requisito = Number(getVal('cre-requisito')) || 0;
        const numOuVazio = (id) => { const v = getVal(id); return v === null || v === "" ? null : Number(v); };
        dados.stamina = Number(getVal('cre-stamina')) || 0;
        if (!tipo.includes('jutsus')) {
            if (numOuVazio('cre-poder') !== null) dados.poder = numOuVazio('cre-poder');
            if (numOuVazio('cre-defesa') !== null) dados.defesa = numOuVazio('cre-defesa');
            if (numOuVazio('cre-multiplicador') !== null) dados.multiplicador_maximo = numOuVazio('cre-multiplicador');
            if (numOuVazio('cre-hp')) dados.bonus_hp = numOuVazio('cre-hp');
            if (numOuVazio('cre-b-chakra')) dados.bonus_chakra = numOuVazio('cre-b-chakra');
            if (numOuVazio('cre-b-stamina')) dados.bonus_stamina = numOuVazio('cre-b-stamina');
            dados.recuperavel = !!document.getElementById('cre-recuperavel')?.checked;
            if (getVal('cre-premio-roleta')) dados.premio_roleta = getVal('cre-premio-roleta');
        }
        
        if (tipo === 'loja') {
            dados.tipo = getVal('cre-tipo-loja') || "mercado";
            const vilas = (getVal('cre-vila') || "").split(',').map(v => v.trim()).filter(v => v !== "");
            dados.vila = vilas.length > 0 ? vilas : 'Global';
            dados.efeito = getVal('cre-efeito') || "";
        }

        if (tipo.includes('jutsus')) {
            dados.rank = getVal('cre-rank') || "D";
            dados.funcao = getVal('cre-funcao') || "ataque";
            dados.categoria = getVal('cre-categoria-jutsu') || "ninjutsu";
            dados.poder = Number(getVal('cre-poder')) || 0;
            dados.chakra = Number(getVal('cre-chakra')) || 0;
            const campoNum = (id, chave) => { const v = numOuVazio(id); if (v !== null && v !== 0) dados[chave] = v; };
            campoNum('cre-reacao', 'reacao_necessaria');
            campoNum('cre-velocidade', 'velocidade_necessaria');
            campoNum('cre-multiplicador', 'multiplicador_maximo');
            campoNum('cre-sangramento', 'sangramento');
            if (dados.sangramento) dados.sangramento_turnos = numOuVazio('cre-sangramento-turnos') || 2;
            const efeito = getVal('cre-efeito-jutsu');
            if (efeito === 'clones') dados.clones = dados.poder;
            else if (efeito) dados.efeito = efeito;
            campoNum('cre-duracao', 'duracao');
            campoNum('cre-manutencao', 'custo_por_turno');
            dados.impossivel_esquivar = !!document.getElementById('cre-imp-esquiva')?.checked;
            dados.impossivel_defender_fisico = !!document.getElementById('cre-imp-defender')?.checked;
            if (document.getElementById('cre-sem-arena')?.checked) dados.uso_arena = false;
            // Mecânicas especiais (só grava o que foi preenchido)
            const requer = (getVal('cre-requer') || '').split(',').map(x => x.trim()).filter(Boolean);
            if (requer.length) dados.requer_ativo = requer;
            const texto = (id, chave) => { const v = getVal(id); if (v) dados[chave] = v; };
            texto('cre-aura', 'aura'); texto('cre-resiste', 'resiste_genjutsu'); texto('cre-espelho-rank', 'espelho_rank_max');
            texto('cre-criacao-nome', 'criacao_nome'); texto('cre-criacao-icone', 'criacao_icone'); texto('cre-gen-efeito', 'genjutsu_efeito');
            campoNum('cre-reacao-minima', 'reacao_minima'); campoNum('cre-criacao-max', 'criacao_max'); campoNum('cre-criacao-absorve', 'criacao_absorve');
            campoNum('cre-gen-turnos', 'genjutsu_turnos'); campoNum('cre-chamas', 'chamas_por_turno'); campoNum('cre-chamas-manutencao', 'chamas_manutencao'); campoNum('cre-custo-vida', 'custo_vida_pct');
            const [pen, danoGen] = (getVal('cre-gen-extra') || '').split('/').map(x => Number(String(x).trim()));
            if (pen) dados.genjutsu_penalidade = pen;
            if (danoGen) dados.genjutsu_dano = danoGen;
        }
    }

    try {
        // Evita apagar sem querer um registro que já existe com o mesmo nome
        const existente = await getDoc(doc(db, colecao, customID));
        if (existente.exists() && !confirm(`Já existe um registro "${customID}" em ${colecao}. Deseja SUBSTITUÍ-LO?`)) return;

        await setDoc(doc(db, colecao, customID), dados);
        alert(`Sucesso! ${tipo} criado: ${customID}`);
        location.reload();
    } catch (err) {
        console.error(err);
        alert("Erro ao salvar.");
    }
};



// Função para gerar ID único da sala de conversa
const gerarIdSala = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};



// Abre e fecha a lista de conversas
window.toggleChatList = () => {
    const panel = document.getElementById('chat-list-panel');
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
};

// Zera a bolinha de mensagens não lidas de um chat específico
window.zerarNaoLidas = async (salaId) => {
    if(!auth.currentUser) return;
    try {
        await setDoc(doc(db, "chats", salaId), {
            [`naoLidas_${auth.currentUser.uid}`]: 0
        }, { merge: true });
    } catch(e) {}
};

// Carrega o painel lateral com todas as suas conversas ativas
let escutaListaChats = null;
window.iniciarEscutaChats = () => {
    if (!auth.currentUser) return;
    
    // Procura todos os chats onde o Array "participantes" tem o seu UID
    const q = query(collection(db, "chats"), where("participantes", "array-contains", auth.currentUser.uid));
    
    escutaListaChats = onSnapshot(q, (snapshot) => {
        const content = document.getElementById('chat-list-content');
        content.innerHTML = '';
        let totalNaoLidas = 0;

        if (snapshot.empty) {
            content.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Você não tem conversas ativas.</p>';
            document.getElementById('total-unread-badge').style.display = 'none';
            return;
        }

        snapshot.forEach((docSnap) => {
            const dados = docSnap.data();
            const meuId = auth.currentUser.uid;
            
            // Acha quem é o "outro" na conversa
            const outroId = dados.participantes.find(id => id !== meuId);
            if (!outroId) return;

            const nomeOutro = (dados.nomes && dados.nomes[outroId]) ? dados.nomes[outroId] : "Ninja Oculto";
            const naoLidas = dados[`naoLidas_${meuId}`] || 0;
            totalNaoLidas += naoLidas;

            const div = document.createElement('div');
            div.className = 'chat-list-item';
            div.onclick = () => {
                window.zerarNaoLidas(docSnap.id);
                // O Diário Ninja tem sala própria ("diario_<uid>"), não a sala privada comum
                if (docSnap.id.startsWith('diario_')) window.abrirDiarioNinja();
                else window.abrirChat(outroId, nomeOutro);
                window.toggleChatList(); // Fecha a lista após clicar
            };

            div.innerHTML = `
                <div style="display:flex; flex-direction:column; overflow: hidden; padding-right: 10px;">
                    <strong style="color:#333; font-size: 0.9rem;">${esc(nomeOutro)}</strong>
                    <span style="font-size:0.75rem; color:#777; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${esc(dados.ultimaMensagem || "...")}
                    </span>
                </div>
                ${naoLidas > 0 ? `<span class="unread-badge">${esc(naoLidas)}</span>` : ''}
            `;
            content.appendChild(div);
        });

        // Atualiza a notificação "(2)" da aba principal
        const badge = document.getElementById('total-unread-badge');
        if (totalNaoLidas > 0) {
            badge.innerText = `(${totalNaoLidas})`;
            badge.style.display = 'inline';
        } else {
            badge.style.display = 'none';
        }
    });
};


// --- SISTEMA DE CHATS (PRIVADO, DIÁRIO E CENÁRIOS) ---
window.currentSalaId = null; // Diz ao sistema em qual sala estamos escrevendo

// 1. Motor que lê e renderiza as mensagens de qualquer sala
window.carregarMensagensDaSala = (salaId) => {
    const msgsDiv = document.getElementById('chat-messages');
    msgsDiv.innerHTML = '<p style="text-align:center; color:#999; font-size:12px;">Conectando...</p>';

    if (unsubscribeChat) unsubscribeChat();

    const q = query(collection(db, "chats", salaId, "mensagens"));
    
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        msgsDiv.innerHTML = '';
        if (snapshot.empty) {
            msgsDiv.innerHTML = '<p style="text-align:center; color:#999; font-size:12px;">Nenhuma mensagem. Comece o roleplay!</p>';
            return;
        }

        let listaMensagens = [];
        snapshot.forEach((docSnap) => { listaMensagens.push(docSnap.data()); });

        listaMensagens.sort((a, b) => {
            const getMs = (msg) => {
                if (msg.timestamp?.toMillis) return msg.timestamp.toMillis();
                if (msg.data?.toMillis) return msg.data.toMillis(); 
                return 0;
            };
            return getMs(a) - getMs(b);
        });

        listaMensagens.forEach((dados) => {
            const ehMinha = dados.remetenteId === auth.currentUser.uid;
            const div = document.createElement('div');
            let classeEstilo = ehMinha ? 'msg-minha' : 'msg-dele';
            
            if (dados.tipo === 'narrador') classeEstilo = 'msg-narrador';
            if (dados.tipo === 'ooc') classeEstilo += ' msg-ooc';
            if (dados.tipo === 'dice') classeEstilo = 'msg-dice';

            div.className = `chat-msg ${classeEstilo}`;
            let nomeExibicao = esc(dados.remetenteNome || (ehMinha ? "Você" : "Ninja"));
            const textoSeguro = esc(dados.texto);
            
            // --- NOVO: Extraindo e formatando a data e hora ---
            let dataFormatada = "Enviando..."; // Aparece rapidinho antes do Firebase confirmar
            let dataRaw = dados.timestamp || dados.data;
            
            if (dataRaw && typeof dataRaw.toDate === 'function') {
                const d = dataRaw.toDate();
                // Formata para: "DD/MM/AAAA às HH:MM"
                dataFormatada = d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            }
            
            const htmlTempo = `<span class="chat-msg-time">${dataFormatada}</span>`;
            // --------------------------------------------------

            if (dados.tipo === 'narrador') {
                div.innerHTML = `<span class="chat-msg-author"><i class="fa-solid fa-scroll"></i> NARRADOR</span>${textoSeguro}${htmlTempo}`;
            } else if (dados.tipo === 'dice') {
                div.innerHTML = `<strong>${nomeExibicao}</strong><br><span style="font-size:1.2rem;">🎲 ${textoSeguro}</span>${htmlTempo}`;
            } else if (dados.tipo === 'npc') {
                // Adiciona um ícone roxo ou da cor que preferir para destacar que é um NPC
                div.innerHTML = `<span class="chat-msg-author" style="color: #9b59b6;"><i class="fa-solid fa-user-ninja"></i> ${nomeExibicao}</span>${textoSeguro}${htmlTempo}`;
            } else {
                let labelOOC = dados.tipo === 'ooc' ? ' [OOC]' : '';
                div.innerHTML = `<span class="chat-msg-author">${nomeExibicao}${labelOOC}</span>${textoSeguro}${htmlTempo}`;
            }
            msgsDiv.appendChild(div);
        });
        msgsDiv.scrollTop = msgsDiv.scrollHeight;
    });
};

// 2. Abrir Chat Privado (Entre 2 Players)
window.abrirChat = (targetUserId, targetUserName, isOnline = false) => {
    if (!auth.currentUser) return;
    if (auth.currentUser.uid === targetUserId) return alert("Você não pode conversar consigo mesmo!");

    document.getElementById('chat-status-dot').style.background = isOnline ? '#2ecc71' : '#ccc';
    document.getElementById('chat-user-name').innerText = targetUserName;
    document.getElementById('chat-widget').style.display = 'flex';
    document.getElementById('btn-ninjas-local').style.display = 'none';
    document.getElementById('ninjas-local-panel').style.display = 'none';

    currentChatUserId = targetUserId;
    window.currentSalaId = gerarIdSala(auth.currentUser.uid, targetUserId);
    
    window.zerarNaoLidas(window.currentSalaId);
    window.carregarMensagensDaSala(window.currentSalaId);
};

// 3. Abrir o Diário Ninja (Player x Mestre)
window.abrirDiarioNinja = () => {
    if (!auth.currentUser) return;
    
    document.getElementById('chat-status-dot').style.background = '#f1c40f'; // Dourado
    document.getElementById('chat-user-name').innerText = "Diário Ninja (Mestre)";
    document.getElementById('chat-widget').style.display = 'flex';
    document.getElementById('btn-ninjas-local').style.display = 'none';
    document.getElementById('ninjas-local-panel').style.display = 'none';
    
    currentChatUserId = "MESTRE"; 
    window.currentSalaId = "diario_" + auth.currentUser.uid;
    
    window.zerarNaoLidas(window.currentSalaId);
    window.carregarMensagensDaSala(window.currentSalaId);
};

// Função para fechar qualquer tipo de chat
window.fecharChat = () => {
    document.getElementById('chat-widget').style.display = 'none';
    document.getElementById('ninjas-local-panel').style.display = 'none'; // <-- Linha nova
    currentChatUserId = null;
    window.currentSalaId = null;
    
    if (typeof unsubscribeChat !== 'undefined' && unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }
};

window.toggleNinjasLocal = async () => {
    const panel = document.getElementById('ninjas-local-panel');
    const list = document.getElementById('ninjas-local-list');
    
    // Se já estiver aberto, apenas fecha
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
        return;
    }
    
    // Abre o painel e mostra status de carregamento
    panel.style.display = 'block';
    list.innerHTML = '<span style="color:#777;">Procurando rastros de chakra...</span>';
    
    // Extrai o ID do cenário da sala atual (ex: "cenario_vila_folha" vira "vila_folha")
    const cenarioId = window.currentSalaId.replace('cenario_', '');
    
    try {
        // Busca os jogadores que têm o 'cenarioAtual' igual ao local atual
        const q = query(collection(db, "users"), where("cenarioAtual", "==", cenarioId));
        const snap = await getDocs(q);
        
        list.innerHTML = '';
        
        if (snap.empty) {
            list.innerHTML = '<span style="color:#999;">O local parece deserto...</span>';
            return;
        }
        
        snap.forEach(docSnap => {
            const u = docSnap.data();
            const isOnline = u.isOnline === true;
            const corBolinha = isOnline ? '#2ecc71' : '#ccc';
            const statusTexto = isOnline ? 'Online' : 'Offline';
            
            // Adiciona o jogador na lista
            list.innerHTML += `
                <div style="display:flex; align-items:center; gap:8px; margin-top:8px; padding: 4px; border-radius: 4px; background: white; border: 1px solid #eee;">
                    <span style="width:8px; height:8px; background:${corBolinha}; border-radius:50%; box-shadow: 0 0 3px ${corBolinha};"></span>
                    <strong style="color:var(--text-color);">${esc(u.nome || "Ninja")}</strong>
                    <span style="font-size:0.7rem; color:#777;">(${esc(u.apelido || "Sem clã")})</span>
                </div>
            `;
        });
        
    } catch (e) {
        console.error("Erro ao buscar ninjas:", e);
        list.innerHTML = '<span style="color:var(--danger-color);">Falha ao rastrear o local.</span>';
    }
};

// 4. Abrir Chat de Cenário (Grupo)
window.abrirChatCenario = (id, nome) => {
    if (id === 'mundo_aberto') {
        alert("Você está no Mundo Aberto! Aqui a jornada é solitária. Suas ações devem ser enviadas no Diário Ninja.");
        window.abrirDiarioNinja();
        return;
    }
    
    document.getElementById('chat-status-dot').style.background = '#3498db'; 
    document.getElementById('chat-user-name').innerText = "Cenário: " + nome;
    document.getElementById('chat-widget').style.display = 'flex';
    
    // Mostra o botão de Ninjas no Local apenas em cenários
    document.getElementById('btn-ninjas-local').style.display = 'inline-block';
    document.getElementById('ninjas-local-panel').style.display = 'none';
    
    currentChatUserId = "CENARIO"; 
    window.currentSalaId = "cenario_" + id;
    window.carregarMensagensDaSala(window.currentSalaId);
};

// 5. Enviar Mensagem Adaptativo
window.enviarMensagemChat = async () => {
    const input = document.getElementById('chat-input');
    const textoCru = input.value.trim();
    
    if (!textoCru || !window.currentSalaId || !auth.currentUser) return;
    
    input.value = ''; 
    
    // --- CORREÇÃO AQUI: Mudamos de const para let ---
    let meuNome = currentUserData?.nome || currentUserData?.apelido || "Ninja";
    const nomeSala = document.getElementById('chat-user-name').innerText;

    let tipoMsg = 'rp';
    let textoFinal = textoCru;
    const isAdmin = ["admin@rpgnaruto.com", "conselheiro@rpgnaruto.com"].includes(auth.currentUser.email);

    if (textoCru.startsWith('/narrador ') && isAdmin) {
        tipoMsg = 'narrador';
        textoFinal = textoCru.replace('/narrador ', '').trim();
    } 
    // Comando de NPC
    else if (textoCru.startsWith('/npc ') && isAdmin) {
        tipoMsg = 'npc';
        let conteudoNpc = textoCru.replace('/npc ', '').trim();
        let separadorIndex = conteudoNpc.indexOf(':'); // Procura os dois pontos
        
        if (separadorIndex !== -1) {
            meuNome = conteudoNpc.substring(0, separadorIndex).trim(); // Agora funciona!
            textoFinal = conteudoNpc.substring(separadorIndex + 1).trim(); 
        } else {
            meuNome = "NPC"; // Agora funciona!
            textoFinal = conteudoNpc;
        }
    }
    else if (textoCru.startsWith('//')) {
        tipoMsg = 'ooc';
        textoFinal = textoCru.substring(2).trim();
    } else {
        const matchDado = textoCru.match(/^\/d(\d+)/i);
        if (matchDado) {
            tipoMsg = 'dice';
            const lados = parseInt(matchDado[1]);
            const resultado = Math.floor(Math.random() * lados) + 1;
            textoFinal = `rolou um D${lados} e tirou: [ ${resultado} ]`;
        }
    }

    try {
        // Grava a mensagem
        await addDoc(collection(db, "chats", window.currentSalaId, "mensagens"), {
            remetenteId: auth.currentUser.uid,
            remetenteNome: meuNome,
            texto: textoFinal,
            tipo: tipoMsg,
            timestamp: serverTimestamp()
        });

        let prevMsg = tipoMsg === 'dice' ? `🎲 ${meuNome} rolou os dados!` : textoFinal;
        
        // Estrutura os Metadados dependendo de qual sala estamos
        const salaRef = doc(db, "chats", window.currentSalaId);
        let metadados = { ultimaMensagem: prevMsg, atualizadoEm: serverTimestamp() };

        if (window.currentSalaId.startsWith("cenario_")) {
            metadados.tipoChat = 'cenario';
            metadados.nomeCenario = nomeSala;
        } else if (window.currentSalaId.startsWith("diario_")) {
            const donoId = window.currentSalaId.replace("diario_", "");
            const souDono = auth.currentUser.uid === donoId;
            const alvoNaoLida = souDono ? "MESTRE" : donoId;

            metadados.tipoChat = 'diario';
            metadados.participantes = [donoId, "MESTRE"];
            metadados[`naoLidas_${alvoNaoLida}`] = increment(1);
            
            if (souDono) {
                metadados.nomes = {
                    [donoId]: meuNome,
                    ["MESTRE"]: "Kage (Mestre)"
                };
            }
        } else {
            metadados.tipoChat = 'privado';
            metadados.participantes = [auth.currentUser.uid, currentChatUserId];
            metadados.nomes = {
                [auth.currentUser.uid]: meuNome,
                [currentChatUserId]: nomeSala
            };
            metadados[`naoLidas_${currentChatUserId}`] = increment(1);
        }

        await setDoc(salaRef, metadados, { merge: true });

    } catch (e) {
        console.error("Erro ao enviar mensagem:", e);
        alert("Falha ao enviar o pergaminho.");
    }
};

// --- SISTEMA DE PAGAMENTO DE SALÁRIOS (sai do Cofre da Vila) ---
// Se o cofre não tiver o suficiente para a folha inteira, paga PROPORCIONAL:
// todos recebem a mesma porcentagem do salário (arredondando para baixo).
window.pagarSalariosGeral = async () => {
    const btn = document.getElementById('btn-pagar-salarios');
    try {
        const snapCofre = await getDoc(refCofre());
        if (!snapCofre.exists()) return alert("O Cofre da Vila ainda não foi aberto. Recarregue o Painel Kage.");
        const saldo = numero(snapCofre.data().saldo);
        const usersSnap = await getDocs(collection(db, "users"));
        const folha = usersSnap.docs.map(d => ({ id: d.id, salario: Math.floor(numero(d.data().salario)) })).filter(x => x.salario > 0);
        const total = folha.reduce((a, x) => a + x.salario, 0);
        if (!folha.length) return alert("Nenhum ninja tem salário cadastrado.");
        const fator = saldo >= total ? 1 : Math.max(0, saldo) / total;
        const pagos = folha.map(x => ({ ...x, valor: Math.floor(x.salario * fator) })).filter(x => x.valor > 0);
        const pago = pagos.reduce((a, x) => a + x.valor, 0);
        const aviso = fator < 1
            ? `⚠️ O cofre tem ${formatarNum(saldo)} Ryos, mas a folha é de ${formatarNum(total)}.\nVai pagar PROPORCIONAL: ${Math.floor(fator * 100)}% de cada salário (${formatarNum(pago)} Ryos no total).`
            : `Folha: ${formatarNum(total)} Ryos para ${folha.length} ninjas.\nO cofre fica com ${formatarNum(saldo - total)} Ryos.`;
        if (!pago) return alert(`O cofre está vazio (${formatarNum(saldo)} Ryos). Não há como pagar salários agora.`);
        if (!confirm(`Pagar os salários de TODOS os ninjas?\n\n${aviso}`)) return;
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Transferindo Ryos...'; }
        // Lotes de até 400 escritas; o último lote também desconta o cofre e registra a saída
        for (let a = 0; a < pagos.length; a += 400) {
            const lote = writeBatch(db);
            pagos.slice(a, a + 400).forEach(x => lote.update(doc(db, "users", x.id), { ryos: increment(x.valor) }));
            if (a + 400 >= pagos.length) {
                lote.update(refCofre(), { saldo: increment(-pago) });
                lote.set(doc(db, "vila_movimentos", idMovimento('salarios')), { uid: minhaUid(), nome: 'Kage', tipo: 'salarios', valor: -pago, data: serverTimestamp(), ref: fator < 1 ? `proporcional ${Math.floor(fator * 100)}%` : '' });
            }
            await lote.commit();
        }
        alert(`💰 Pagamento concluído!\n\n${pagos.length} ninjas receberam ${fator < 1 ? `${Math.floor(fator * 100)}% do salário` : 'o salário'}.\nSaíram ${formatarNum(pago)} Ryos do Cofre da Vila.`);
        window.carregarTesouraria();
    } catch (erro) {
        console.error("Erro ao pagar salários:", erro);
        alert("Ocorreu um erro na tesouraria: " + erro.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-coins"></i> Pagar Salários'; }
    }
};

// Painel Kage: saldo do cofre, folha de salários e ajuste manual
window.carregarTesouraria = async () => {
    const el = document.getElementById('tesouraria-info');
    if (!el) return;
    try {
        let snap = await getDoc(refCofre());
        if (!snap.exists()) {
            // Primeira vez: abre o cofre com o saldo inicial combinado
            const lote = writeBatch(db);
            lote.set(refCofre(), { saldo: COFRE.saldoInicial, criadoEm: serverTimestamp() });
            lote.set(doc(db, "vila_movimentos", idMovimento('abertura')), { uid: minhaUid(), nome: 'Kage', tipo: 'abertura', valor: COFRE.saldoInicial, data: serverTimestamp(), ref: 'Saldo inicial' });
            await lote.commit();
            snap = await getDoc(refCofre());
        }
        const saldo = numero(snap.data().saldo);
        const usersSnap = await lerColecao("users", true);
        let folha = 0, ninjas = 0;
        usersSnap.forEach(u => { const v = Math.floor(numero(u.data().salario)); if (v > 0) { folha += v; ninjas++; } });
        el.innerHTML = `<div class="tesouraria-saldo"><span>Cofre da Vila</span><strong>${formatarNum(saldo)} Ryos</strong></div>
            <div class="tesouraria-folha">Folha de salários: <strong>${formatarNum(folha)} Ryos</strong> (${ninjas} ninjas)
            ${folha > saldo ? `<br><span class="tesouraria-alerta">O cofre não cobre a folha: o pagamento será proporcional (${Math.floor(Math.max(0, saldo) / folha * 100)}%).</span>` : ''}</div>`;
    } catch (e) { console.error(e); el.innerHTML = '<p style="color:var(--danger);">Erro ao abrir o cofre.</p>'; }
};
window.ajustarCofre = async (sinal) => {
    const valor = Math.floor(Number(prompt(sinal > 0 ? 'Quantos Ryos DEPOSITAR no cofre?' : 'Quantos Ryos RETIRAR do cofre?')));
    if (!valor || valor < 1) return;
    const motivo = (prompt('Motivo (aparece no extrato da vila):') || '').slice(0, 80);
    try {
        const lote = writeBatch(db);
        lote.update(refCofre(), { saldo: increment(sinal * valor) });
        lote.set(doc(db, "vila_movimentos", idMovimento('ajuste')), { uid: minhaUid(), nome: 'Kage', tipo: 'ajuste', valor: sinal * valor, data: serverTimestamp(), ref: motivo });
        await lote.commit();
        window.carregarTesouraria();
    } catch (e) { console.error(e); alert("Erro ao ajustar o cofre: " + e.message); }
};

// =====================================================================
//  ABA BANCO: Cofre da Vila (saldo, doação, extrato e patronos)
// =====================================================================
const NOME_MOVIMENTO = { torneio: '🏆 Torneio', aposta: '🎲 Taxa de aposta', imposto_loja: '🛒 Imposto da loja', missao: '📜 Contrato de missão', arena: '⚔️ Taxa da arena', doacao: '🎁 Doação', salarios: '💰 Salários', ajuste: '⚖️ Ajuste do Kage', abertura: '🏯 Abertura do cofre' };
window.carregarCofreVila = async () => {
    const el = document.getElementById('cofre-vila');
    if (!el) return;
    try {
        const snap = await getDoc(refCofre());
        if (!snap.exists()) { el.innerHTML = '<p class="arena-vazio">O Cofre da Vila ainda não foi aberto pelo Kage.</p>'; return; }
        const saldo = numero(snap.data().saldo);
        const digitado = document.getElementById('valor-doacao')?.value || '';   // não apaga o que a pessoa está digitando
        const [movs, patronos] = await Promise.all([
            getDocs(query(collection(db, "vila_movimentos"), orderBy("data", "desc"), limit(12))),
            getDocs(query(collection(db, "users"), orderBy("doado_vila", "desc"), limit(5)))
        ]);
        const extrato = movs.docs.map(d => {
            const m = d.data(), v = numero(m.valor);
            const quando = m.data?.toDate ? m.data.toDate().toLocaleDateString('pt-BR') : '';
            return `<li class="${v < 0 ? 'saida' : 'entrada'}"><span>${esc(NOME_MOVIMENTO[m.tipo] || m.tipo)}${['doacao', 'missao', 'arena', 'imposto_loja', 'aposta'].includes(m.tipo) ? ` · ${esc(m.nome || '')}` : ''}${m.ref && (m.tipo === 'ajuste' || m.tipo === 'salarios') ? ` · ${esc(m.ref)}` : ''}<small>${esc(quando)}</small></span><strong>${v < 0 ? '−' : '+'}${formatarNum(Math.abs(v))}${m.moeda === 'essencia_ninja' ? ' EN' : ''}</strong></li>`;
        }).join('');
        const ranking = patronos.docs.filter(d => numero(d.data().doado_vila) > 0).map((d, i) =>
            `<li><span>${['🥇', '🥈', '🥉', '4º', '5º'][i]} ${esc(d.data().nome || 'Ninja')}</span><strong>${formatarNum(numero(d.data().doado_vila))}</strong></li>`).join('');
        el.innerHTML = `
            <div class="cofre-topo">
                <div class="cofre-saldo"><span>🏯 Cofre da Vila</span><strong>${formatarNum(saldo)} <small>Ryos</small></strong>${numero(snap.data().saldo_en) ? `<div class="cofre-en">+ ${formatarNum(numero(snap.data().saldo_en))} EN</div>` : ''}
                    <p>Paga os salários dos ninjas. Cresce com missões (+20% do contrato), compras na loja (+10%), lutas e apostas da arena (5%) e doações.</p></div>
                <div class="cofre-doar">
                    <label for="valor-doacao"><strong>Doar para a Vila</strong></label>
                    <div class="cofre-doar-linha"><input type="number" id="valor-doacao" min="1" placeholder="Ryos" class="edit-input" value="${esc(digitado)}"><button class="buy-btn" onclick="window.doarParaVila()">Doar</button></div>
                    <small>Você tem ${formatarNum(numero(currentUserData?.ryos))} Ryos${numero(currentUserData?.doado_vila) ? ` · já doou ${formatarNum(numero(currentUserData.doado_vila))}` : ''}</small>
                </div>
            </div>
            <div class="cofre-colunas">
                <div><h4>Extrato recente</h4><ul class="cofre-lista">${extrato || '<li><span>Sem movimentações ainda.</span></li>'}</ul></div>
                <div><h4>Patronos da Vila</h4><ul class="cofre-lista patronos">${ranking || '<li><span>Ninguém doou ainda. Seja o primeiro!</span></li>'}</ul></div>
            </div>`;
    } catch (e) { console.error(e); el.innerHTML = '<p class="arena-vazio">Não foi possível abrir o cofre agora.</p>'; }
};
window.doarParaVila = async () => {
    const v = Math.floor(Number(document.getElementById('valor-doacao')?.value));
    if (!v || v < 1) return alert("Informe quanto quer doar.");
    if (v > numero(currentUserData?.ryos)) return alert("Você não tem Ryos suficientes.");
    if (!confirm(`Doar ${formatarNum(v)} Ryos para o Cofre da Vila?`)) return;
    try {
        if (!(await cofreAberto())) return alert("O Cofre da Vila ainda não foi aberto.");
        const movId = idMovimento('doacao');
        const lote = writeBatch(db);
        lote.update(doc(db, "users", minhaUid()), { ryos: increment(-v), doado_vila: increment(v), ultimaDoacao: movId });
        entradaNoCofre(lote, movId, 'doacao', v);
        await lote.commit();
        document.getElementById('valor-doacao').value = '';
        alert(`🏯 Obrigado! A vila recebeu ${formatarNum(v)} Ryos.`);
        window.carregarCofreVila();
    } catch (e) { console.error(e); alert("Não foi possível doar: " + e.message); }
};


// --- SISTEMA DE PRESENÇA (ONLINE/OFFLINE) ---
window.atualizarStatusOnline = (online) => {
    if (auth && auth.currentUser) {
        updateDoc(doc(db, "users", auth.currentUser.uid), { isOnline: online }).catch(()=>{});
    }
};

// Avisa o Firebase quando o jogador muda de aba, minimiza o celular ou volta pro jogo
document.addEventListener("visibilitychange", () => {
    atualizarStatusOnline(document.visibilityState === 'visible');
});

// Tenta avisar o Firebase quando o jogador fecha a janela/navegador de vez
window.addEventListener("beforeunload", () => {
    atualizarStatusOnline(false);
});

// DICA: Você também pode colocar "atualizarStatusOnline(true);" 
// dentro da sua função que faz o login dar certo, para ele já entrar verdinho!




// --- SISTEMA DA ROLETA SEMANAL (8 FATIAS) ---
let roletaGirando = false;


// Função que faz a roleta girar e dá o prémio (usada pelos dois botões)
const executarAnimacaoRoleta = async (pago = false) => {
    if (roletaGirando) return;
    roletaGirando = true;

    const premios = [
        { nome: '5.000 Ryos', tipo: 'moeda_ryos', valor: 5000 },
        { nome: '15 Essências Ninjas', tipo: 'moeda_en', valor: 15 },
        { nome: '1 Jutsu de Rank B', tipo: 'item_manual', valor: 'Jutsu Rank B' },
        { nome: '20.000 Ryos', tipo: 'moeda_ryos', valor: 20000 },
        { nome: '1 Ferramenta', tipo: 'item_manual', valor: 'Ferramenta Especial' },
        { nome: '1 Arma', tipo: 'item_manual', valor: 'Arma Ninja' },
        { nome: '50 Essências Ninjas', tipo: 'moeda_en', valor: 50 },
        { nome: '+1 Modificador', tipo: 'item_manual', valor: 'Modificador de Atributo' }
    ];

    const fatiaSorteada = Math.floor(Math.random() * 8);
    const premioSorteado = premios[fatiaSorteada];
    
    // Animação
    const roleta = document.getElementById('roleta-wheel');
    const grausPorFatia = 45;
    const grausParaCair = 1800 + (360 - (fatiaSorteada * grausPorFatia)) - 22.5;
    roleta.style.transform = `rotate(${grausParaCair}deg)`;

    setTimeout(async () => {
        try {
            const docRef = doc(db, "users", auth.currentUser.uid);
            // Todo prêmio fica PENDENTE e o Kage entrega pelo Painel Kage
            // (o sorteio acontece no navegador, então o banco não pode creditar sozinho).
            let dadosParaAtualizar = {
                premios_pendentes: arrayUnion({
                    id: Date.now(),
                    nome: premioSorteado.nome,
                    tipo: premioSorteado.tipo,
                    valor: premioSorteado.valor,
                    pago: pago,
                    data: new Date().toLocaleDateString('pt-BR')
                })
            };
            if (pago) dadosParaAtualizar.essencia_ninja = increment(-15); // giro pago: cobra junto com o registro
            else dadosParaAtualizar.ultimoGiroRoleta = Date.now();         // giro grátis: marca a semana

            const resgatavel = PREMIOS_RESGATAVEIS[premioSorteado.valor];
            const msgAlerta = `Parabéns! Você ganhou: ${premioSorteado.nome}!\n\n` + (resgatavel ? 'Resgate quando quiser em "Seus prêmios", logo acima da roleta.' : 'Seu prêmio foi registrado e será creditado pelo Kage em breve.');

            await updateDoc(docRef, dadosParaAtualizar);
            
            // Reset visual
            roleta.style.transition = 'none';
            roleta.style.transform = 'rotate(0deg)';
            setTimeout(() => roleta.style.transition = 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)', 50);

            alert(msgAlerta);
        } catch (e) {
            console.error(e);
            alert("Erro ao registrar o prêmio.");
        } finally {
            roletaGirando = false;
        }
    }, 4000);
};

// Botão Grátis
window.girarRoleta = async () => {
    const seteDiasEmMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - (currentUserData.ultimoGiroRoleta || 0) < seteDiasEmMs) {
        alert("Volte em 7 dias!");
        return;
    }
    executarAnimacaoRoleta(false);
};

// Botão Pago
window.girarRoletaPaga = async () => {
    if ((currentUserData.essencia_ninja || 0) < 15) return alert("Saldo insuficiente (15 EN)");
    if (confirm("Gastar 15 EN para girar agora?")) {
        executarAnimacaoRoleta(true); // os 15 EN são cobrados junto com o registro do prêmio
    }
};




window.aplicarEscalaPersonalizada = aplicarEscalaPersonalizada;
window.abrirModalSimples = abrirModalSimples;
window.carregarPersonagens = carregarPersonagens;
window.verDetalhesJutsu = (id, d) => abrirModalSimples('jutsu', d);
window.verDetalhesFerramenta = (id, d) => abrirModalSimples('tool', d);
window.verDetalhesItem = (id, d) => abrirModalSimples('item', d);
window.fecharJutsuModal = () => document.getElementById('jutsuModal').style.display='none';
window.fecharToolModal = () => document.getElementById('toolModal').style.display='none';
window.fecharItemModal = () => document.getElementById('itemModal').style.display='none';
window.calcularCustoEN = calcularCustoEN;
window.confirmarTrocaRyos = confirmarTrocaRyos;
window.abrirModalPix = abrirModalPix;
window.showTab = showTab;
window.reprovarSolicitacao = reprovarSolicitacao;
window.abrirModalCriacao = abrirModalCriacao;

// --- FUNÇÕES PARA FECHAR OS MODAIS ---

// Fecha o modal de Comentários/Postagem (Feed)
window.closeModal = () => {
    const modal = document.getElementById('commentModal');
    if (modal) modal.style.display = 'none';
};

// Fecha o modal de Missões
window.fecharMissaoModal = () => {
    const modal = document.getElementById('missaoModal');
    if (modal) modal.style.display = 'none';
};

// Fecha o modal de Conquistas
window.fecharConquistaModal = () => {
    const modal = document.getElementById('conquistaModal');
    if (modal) modal.style.display = 'none';
};

// Fecha o modal de Perfil/Personagem
window.fecharProfileModal = () => {
    const modal = document.getElementById('profileModal');
    if (modal) modal.style.display = 'none';
};

// Fecha o modal de Jutsus
window.fecharJutsuModal = () => {
    const modal = document.getElementById('jutsuModal');
    if (modal) modal.style.display = 'none';
};

// Fecha o modal de Ferramentas
window.fecharToolModal = () => {
    const modal = document.getElementById('toolModal');
    if (modal) modal.style.display = 'none';
};

// Fecha o modal de Itens
window.fecharItemModal = () => {
    const modal = document.getElementById('itemModal');
    if (modal) modal.style.display = 'none';
};

// Fecha o modal de Edição de Perfil
window.closeEditProfileModal = () => {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
};

// Fecha o modal de Alterar Senha
window.closeChangePasswordModal = () => {
    const modal = document.getElementById('changePasswordModal');
    if (modal) modal.style.display = 'none';
};

window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay-comment')) {
        event.target.style.display = "none";
    }
};
