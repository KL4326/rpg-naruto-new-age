# Segurança do banco (Firestore)

O arquivo [`firestore.rules`](firestore.rules) define quem pode alterar o quê no Firebase.

## O que as regras garantem

- **Kage** (`admin@rpgnaruto.com`) e **Conselheiro** (`conselheiro@rpgnaruto.com`) podem alterar qualquer coisa pelo site.
- **Pelo console do Firebase você sempre pode editar tudo** (Ryos, EN, fichas, catálogos). O console ignora as regras.
- **Jogadores não conseguem alterar o próprio saldo.** Ryos, EN e XP só mudam em operações conferidas pelo banco:

| Operação | O que o banco confere |
|---|---|
| Comprar jutsu | Preço cadastrado (ou promoção), moeda certa, nível mínimo, não ter o jutsu |
| Comprar item/ferramenta | Preço × quantidade recebida |
| Usar item | Quantidade só diminui |
| Coletar missão/conquista | Status **aprovado pelo Kage** e valores cadastrados; só uma vez |
| Trocar EN por Ryos | Taxa de 1 EN = 10 Ryos |
| Presente | Sai de quem envia exatamente o que entra em quem recebe |
| Mentoria | Preço cadastrado no mentor; o valor vai para o jogador-mentor |
| Subir de nível | XP da tabela de níveis descontado |
| Combate | Vida/chakra/stamina só diminuem |
| Cofre da Vila | Só sobe com comprovante conferido: 10% de cada compra em Ryos, 20% da recompensa de missão (uma vez por missão), 5% do cofre Competitivo em Ryos e doações (que saem da ficha de quem doa). Só o Kage tira (salários e ajustes) |
| Arena ao vivo e torneios | Qualquer ninja assiste; apostas e inscrições pagas são conferidas (o valor sai da ficha e entra no bolo no mesmo envio). Na chave do torneio, só o vencedor da luta avança, e só para a vaga certa. Sorteio, W.O. e prêmios: só o Kage |
| Roleta | Ryos/EN ficam **pendentes** (o Kage credita). Jutsu Rank B, Ferramenta Especial, Arma Ninja e Modificador o **próprio jogador resgata**: o banco confere o Rank B, o item marcado como prêmio e o +1 no atributo, e tira só aquele prêmio da lista |
| Arena: apostar no Competitivo | Só a própria aposta, no valor do desafio; XP precisa sobrar 10 na barra |
| Arena: receber o cofre | Só o **vencedor** registrado na luta, só uma vez, no valor exato do cofre |
| Arena: devolver aposta | Só em convite recusado/cancelado, luta anulada ou empate; só uma vez |
| Arena: vitórias, derrotas e pontos | Conferidos com o resultado da luta (+25/−15 na Rankeada); só uma vez por luta |

Feed, frases, chats e arena também foram protegidos: ninguém posta em nome de outro, lê conversa alheia ou usa `/narrador` sem ser Kage.

## Como publicar (passo a passo)

> ⚠️ **Publique as regras só DEPOIS que a nova versão do site estiver no ar.**
> As regras esperam os "comprovantes" que o site novo envia em cada compra ou presente.
> Com o site antigo, compras e presentes passariam a ser recusados.

1. Faça o merge da branch no `main` e confirme que o site novo está no ar.
2. Abra o [console do Firebase](https://console.firebase.google.com/) → projeto **rpg-naruto-5150a**.
3. Menu **Firestore Database** → aba **Regras**.
4. **Copie as regras atuais e guarde num bloco de notas** (para voltar atrás, se precisar).
5. Apague tudo, cole o conteúdo de `firestore.rules` e clique em **Publicar**.
6. Teste no site: compre algo barato, envie um presente pequeno e colete uma missão aprovada.

**Para desfazer:** cole de volta as regras guardadas no passo 4 e publique.

## Testes automáticos das regras

A pasta [`testes/`](testes/) tem 100 testes que rodam num banco **local de mentira** (emulador). Eles conferem o que deve funcionar e o que deve ser bloqueado. Rode depois de qualquer mudança nas regras. É preciso ter Node.js e Java instalados:

```bash
cd testes
npm install
npm run testar-regras
```

O motor da arena (regras da luta) tem 47 testes próprios, que rodam só com Node.js:

```bash
node testes/arena.test.mjs
```

## Limites conhecidos

- **Roleta:** o sorteio acontece no navegador, então o banco não sabe qual prêmio saiu de verdade. Por isso todo prêmio fica pendente até o Kage entregar. Um jogador mal-intencionado poderia registrar um prêmio diferente do sorteado (um por giro). Na dúvida, use o botão **✕** no Painel Kage para descartar.
- **Arena:** as contas da luta rodam no navegador dos jogadores, com fórmulas fixas (sem dados) e histórico completo de cada ação. Como não há servidor, um jogador com conhecimento de programação poderia mexer no próprio navegador. O histórico deixa isso visível e o Kage pode anular a luta (Fase 2).
- **Dados no chat (`/d20`):** a rolagem acontece no navegador de quem rolou.
- **Restrição por nome (`restrito_a`):** a loja esconde jutsus/itens restritos, mas o banco não confere o nome do jogador na compra.
