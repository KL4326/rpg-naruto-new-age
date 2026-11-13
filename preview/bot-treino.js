// =====================================================================
//  BOT DE TREINO — SÓ NA PRÉ-VISUALIZAÇÃO (nunca vai para o site real)
//  A ninja "Aiko Hyuga" (u2) aceita desafios e joga sozinha, para dar
//  para testar a arena sem precisar de um segundo jogador.
// =====================================================================
(function botDeTreino() {
    const BOT = 'u2';
    const JUTSUS_BOT = [
        { id: 'juuken', nome: 'Juuken: Palma Suave', funcao: 'ataque', categoria: 'taijutsu', poder: 22, chakra: 10, reacao_necessaria: 5, velocidade_necessaria: 6, rank: 'C' },
        { id: 'kaiten', nome: 'Kaiten', funcao: 'defesa', poder: 30, chakra: 20, rank: 'B' },
        { id: 'byakugan', nome: 'Byakugan', funcao: 'modo', bonus: { reacao: 3 }, chakra: 10, custo_por_turno: 5, rank: 'C', resiste_genjutsu: 'C' },
        { id: 'ilusao_hyuga', nome: 'Ilusão do Templo', funcao: 'ataque', categoria: 'genjutsu', poder: 5, chakra: 15, rank: 'B', reacao_necessaria: 8, velocidade_necessaria: 9, genjutsu_efeito: 'paralisia', genjutsu_turnos: 1 },
        { id: 'kai_bot', nome: 'Kai', funcao: 'kai', chakra: 5, reacao_minima: 5, rank: 'D' }
    ];
    const pensando = {};
    const ref = (id) => doc(db, 'desafios_batalha', id);
    const espera = (ms) => new Promise(r => setTimeout(r, ms));

    async function jogar(id, acao) {
        try {
            await runTransaction(db, async (tx) => {
                const s = await tx.get(ref(id));
                const d = s.data();
                const { estado, eventos } = aplicarAcao(d.estado, BOT, acao, Date.now());
                const base = d.histN || (d.historico || []).length;
                const upd = { estado, atualizadoEm: serverTimestamp(), rev: (d.rev || 0) + 1, histN: base + eventos.length, historico: [...(d.historico || []), ...eventos.map((e, i) => ({ ...e, t: Date.now(), n: base + i + 1 }))] };
                if (estado.status === 'finalizada') upd.status = 'finalizada';
                tx.update(ref(id), upd);
            });
            return true;
        } catch (e) { return false; }
    }

    // Aceita automaticamente os desafios enviados para a Aiko
    onSnapshot(query(collection(db, 'desafios_batalha'), where('desafiadoId', '==', BOT), where('status', '==', 'pendente')), async (snap) => {
        for (const s of snap.docs) {
            if (pensando['aceite-' + s.id]) continue;
            pensando['aceite-' + s.id] = true;
            await espera(1200);
            const d = s.data();
            const fA = (await getDoc(doc(db, 'users', d.desafianteId))).data();
            const fB = (await getDoc(doc(db, 'users', BOT))).data();
            const { estado, eventos } = criarEstadoInicial(fA, d.desafianteId, fB, BOT, Date.now());
            const upd = { status: 'aceito', estado, historico: eventos.map((e, i) => ({ ...e, t: Date.now(), n: i + 1 })), histN: eventos.length, atualizadoEm: serverTimestamp() };
            if (d.aposta) upd['cofre.' + BOT] = d.aposta.valor;
            await updateDoc(ref(s.id), upd);
        }
    });

    // Joga quando for a vez dela
    onSnapshot(query(collection(db, 'desafios_batalha'), where('desafiadoId', '==', BOT), where('status', '==', 'aceito')), (snap) => {
        for (const s of snap.docs) {
            const e = s.data().estado;
            if (!e || e.status !== 'em_andamento') continue;
            const chave = `${s.id}-${e.turno}-${e.fase}-${e.acoesRestantes}`;
            if (pensando[chave]) continue;
            // mantém a presença da Aiko em dia (ela nunca "sai" da arena)
            if (!e.presenca || Date.now() - (e.presenca[BOT] || 0) > 15000) jogar(s.id, { tipo: 'presenca' });
            if (e.pausada) continue;
            if (e.fase === 'acao' && e.vez === BOT) {
                pensando[chave] = true;
                setTimeout(async () => {
                    const eu = e.lutadores[BOT];
                    // Preso num genjutsu: tenta o Kai
                    if ((eu.efeitos || []).some(x => x.tipo === 'genjutsu')) { await jogar(s.id, { tipo: 'kai', jutsu: JUTSUS_BOT[4] }); await espera(900); }
                    const alvo = e.lutadores[outro(e, BOT)];
                    const alvoPreso = (alvo.efeitos || []).some(x => x.tipo === 'genjutsu');
                    if (!alvoPreso && e.turno % 3 === 0 && eu.chakra > 40) { await jogar(s.id, { tipo: 'jutsu', jutsu: JUTSUS_BOT[3] }); await espera(900); return jogar(s.id, { tipo: 'passar' }); }
                    const temByakugan = (eu.efeitos || []).some(x => x.id === 'byakugan');
                    if (!temByakugan && eu.chakra > 60) await jogar(s.id, { tipo: 'jutsu', jutsu: JUTSUS_BOT[2] });
                    await espera(900);
                    if (eu.chakra > 25) await jogar(s.id, { tipo: 'jutsu', jutsu: JUTSUS_BOT[0] });
                    else await jogar(s.id, { tipo: 'jutsu', jutsu: { id: '_basico', nome: 'Ataque Básico', funcao: 'ataque', categoria: 'taijutsu', poder: 0, stamina: 5, rank: 'E' } });
                    await espera(900);
                    await jogar(s.id, { tipo: 'passar' });
                }, 1800);
            } else if (e.fase === 'reacao' && e.vez !== BOT) {
                pensando[chave] = true;
                setTimeout(async () => {
                    const eu = e.lutadores[BOT];
                    const atk = e.ataquePendente;
                    const av = avaliarReacao(eu, atk);
                    if (av.percebe && eu.chakra > 40 && atk.dano > 30) { if (await jogar(s.id, { tipo: 'reagir', opcao: 'defender', jutsu: JUTSUS_BOT[1] })) return; }
                    if (av.podeEsquivar && await jogar(s.id, { tipo: 'reagir', opcao: 'esquivar' })) return;
                    await jogar(s.id, { tipo: 'reagir', opcao: 'receber' });
                }, 2200);
            }
        }
    });
})();
