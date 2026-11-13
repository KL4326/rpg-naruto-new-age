# ⚔️ Regulamento da Arena — RPG Naruto New Age

As regras abaixo são as que o site aplica automaticamente. O código está em
[`arena-regras.js`](arena-regras.js) e os testes em [`testes/arena.test.mjs`](testes/arena.test.mjs).

---

## 1. Antes da luta

### Tipos de luta (escolhidos ao desafiar)
| Tipo | O que vale |
|---|---|
| 🤝 **Amistoso** | Só a honra. Conta em Vitórias/Derrotas/Empates e no ranking "Amistosos". |
| 🏆 **Rankeada** | Quem vence ganha **+25 pontos**; quem perde perde **−15** (nunca fica negativo). |
| 💰 **Competitivo** | Quem desafia escolhe o valor (Ryos, EN ou XP). Ao aceitar, **o valor dos dois vai para um cofre** e **quem vencer leva o cofre inteiro**. |

- No Competitivo valendo **XP**, precisa sobrar **10 XP** na barra do nível (com 30 XP, aposta no máximo 20).
- Convite recusado ou cancelado: a aposta volta para quem desafiou. Empate: cada um recebe a sua de volta.
- Um ninja luta **uma batalha por vez**.

### A luta começa com
- **Vida, Chakra e Stamina cheios** (os máximos da ficha). A arena usa uma **cópia**: **a ficha nunca é alterada** por uma luta.
- Nenhum efeito ativo.

### Quem começa
1. Mais **Agilidade**.
2. Empatou: mais **Velocidade** (1 a 12).
3. Empatou de novo: **d20** para cada um (rola de novo se empatar).

---

## 2. Os turnos

```
A faz até 3 ações (no máximo 1 ataque) ──► A passa o turno
                                                │
          B REAGE ao ataque (esquivar / defender / jutsu / receber)
                                                │
B faz até 3 ações ──► B passa o turno ──► A reage ... e assim por diante
```

- **Tempo:** **30 s** para agir e **20 s** para reagir (cronômetro na tela; fica vermelho nos 5 s finais).
  - Acabou o tempo de **agir**: perde a vez.
  - Acabou o tempo de **reagir**: toma o golpe em cheio.
- **Reagir não gasta ação**: depois de reagir, o ninja ainda faz as 3 ações dele (isso já é o "contra-ataque").
- Se o turno não teve ataque, o outro vai direto para as ações dele.
- No início do **próprio** turno: recupera **5% da Stamina máxima** (chakra não volta sozinho), paga a manutenção dos modos e sofre sangramentos.
- **Pausa:** se um dos dois sair da arena (fechar o site, trocar de aba ou ficar sem sinal por 35 s), a luta **pausa** e o tempo congela. Quando os dois voltam, continua de onde parou, mesmo em outro dia.

---

## 3. Dano, defesa e esquiva

### Dano
**Dano = atributo da categoria + Poder do jutsu + bônus de ataque ativos.**

| Categoria | Atributo que soma |
|---|---|
| Taijutsu | Força |
| Ninjutsu, Genjutsu, Fuuinjutsu, Senjutsu | Intelecto |
| Bukijutsu, Kenjutsu, Ferramentas | Destreza |

- **Multiplicador:** jutsus/ferramentas com "multiplicador máximo" podem ser repetidos (ex.: 3 shurikens). O dano e o custo multiplicam, e conta como **1 ataque**.
- **Ataque Básico:** sempre disponível, custa 5 de Stamina e usa a Força.

### Reação e Velocidade
Cada ataque tem **Reação necessária** e **Velocidade necessária** (1 a 12). Se ficarem vazias, valem os padrões do Rank:

| Rank | E | D | C | B | A | S |
|---|---|---|---|---|---|---|
| Reação | 1 | 2 | 4 | 6 | 8 | 10 |
| Velocidade | 1 | 3 | 5 | 7 | 9 | 11 |

1. **Percebeu o golpe?** Reação do ninja (+ bônus) **≥** Reação necessária. Se não, toma o golpe.
2. **Esquivar:** Velocidade (+ bônus) **≥** necessária: escapa totalmente. **1 abaixo:** toma metade. **2 ou mais abaixo:** toma tudo.
   Jutsu de **esquiva** soma o Poder dele à Velocidade só naquela esquiva.
3. **Defender (físico):** a Defesa da ficha absorve o dano. **Só funciona** contra Taijutsu, Bukijutsu, Kenjutsu e ferramentas.
4. **Jutsu de defesa:** absorve **Defesa + Poder**. Funciona contra qualquer categoria.
5. "**Impossível esquivar**" e "**impossível defender fisicamente**" desligam as opções correspondentes.

A tela mostra o resultado de cada opção **antes** de o jogador escolher.

---

## 4. Funções dos jutsus

| Função | Quando usa | O que o **Poder** significa |
|---|---|---|
| ⚔️ **Ataque** | Na sua vez (1 por turno) | Dano |
| 🛡️ **Defesa** | Ao reagir | Quanto absorve (somado à Defesa) |
| 💨 **Esquiva/Escape** | Ao reagir | Quanto soma na Velocidade |
| ✨ **Suporte** | Na sua vez | Valor do bônus (dura 2 turnos se não tiver Duração) |
| 🌀 **Modo / Doujutsu** | Na sua vez | Valor do bônus; fica ativo **até ser desativado**, cobrando **manutenção** de chakra a cada turno |

Campos extras (todos opcionais):
- **Efeito** (suporte/modo): `ataque`, `defesa`, `velocidade`, `reacao`, `cura`, `chakra` ou `clones`. Para vários bônus juntos, use o campo `bonus` (ex.: `{ "ataque": 10, "velocidade": 1 }`).
- **Duração** (turnos) e **Manutenção** (chakra por turno).
- **Sangramento**: dano por turno e quantos turnos dura, aplicado quando o ataque acerta.
- **Custo na arena** (`custo_chakra`, `custo_stamina`): números que a luta cobra. Têm prioridade sobre os campos `chakra`/`stamina`, que podem continuar com o texto do RP (ex.: "-200 para ativar | -100 por turno").
- **Bônus na arena** (`bonus_arena`): igual ao `bonus`, mas deixa o `bonus` livre para texto (ex.: "+3 em Percepção").
- **Sem uso na arena** (`uso_arena: false`): jutsu/item utilitário (Transformação, comida, upgrades). Aparece bloqueado na luta.
- **Cura** (`cura`) e **recuperação** (`recupera_chakra`, `recupera_stamina`). Em jutsus, `bonus_hp`/`bonus_chakra` **não** curam (são bônus de ficha); em itens, continuam curando.

### Clones
- O jutsu de clone cria **N clones**. **O chakra gasto vira a reserva deles.**
- Num ataque, os clones podem atacar junto: cada um soma um golpe e gasta o custo do jutsu (mínimo 5 CP) **da reserva**.
- Quando a reserva acaba, os clones **se desfazem**.
- **Clone sólido** recebe um golpe no lugar do dono e estoura.

### Itens na arena
- **Ferramentas** (kunai, shuriken, selos...) são ataques que usam **Destreza**. Armas vendidas como item (ex.: ferreiro) também viram ataque se tiverem **Poder**.
- **Itens de recuperação** (pílulas, comida) recuperam Vida/Chakra/Stamina e contam como ação.
- Item **gasto ao usar** sai do inventário. Item **recuperável** (ex.: katana) não sai.

---

## 5. Fim da luta
- **Vida em 0:** derrota.
- **Chakra em 0:** derrota por esgotamento (inclusive pela manutenção de um modo). O site avisa antes de um jutsu que zeraria o chakra.
- **Desistir:** derrota de quem desistiu.
- **Empate:** os dois caem ao mesmo tempo, ou um propõe empate e o outro aceita.
- Sem limite de turnos.

Toda luta guarda o **histórico completo** de ações.

---

## 6. Próximas fases
- **Fase 2 — Arena ao vivo:** botão 🔴 para todos assistirem, torcida com emojis, apostas (os acertadores dividem o dinheiro de quem errou, 5% vai para o caixa do Banco Ninja, fecham no 2º turno, só Ryos/EN) e o Kage podendo anular lutas.
- **Fase 3 — Torneios:** eventos criados pelo Kage com inscrição, chaveamento sorteado e prêmios.
