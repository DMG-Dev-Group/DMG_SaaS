# Configurando a sincronização do PicPay — DMG SaaS

Passo a passo pra transações do PicPay (recebimentos e pagamentos) aparecerem
sozinhas na aba Financeiro do dashboard, sem custo.

Como funciona por baixo: o serviço em `sync-picpay/` roda separado do site,
lê o extrato do PicPay via **Meu Pluggy** (Open Finance, plano gratuito) e
grava direto na coleção `receitas` do Firestore — a mesma que os lançamentos
manuais já usam. Por isso o dashboard não precisa de nenhuma alteração.

## 1. Conectar o PicPay no Meu Pluggy

1. Acesse **https://meu.pluggy.ai** e crie uma conta.
2. Clique em **"Conectar minha conta"** → procure **PicPay**.
3. Autorize pelo próprio app do PicPay, no celular da conta que será
   monitorada (precisa ser conta nominal, do CPF de quem está conectando).
4. Aguarde a sincronização inicial aparecer como concluída.

## 2. Criar a aplicação e pegar as credenciais

1. Acesse **https://dashboard.pluggy.ai** e crie uma aplicação
   (ex: `dmg-dashboard-financeiro`).
2. Anote o `clientId` e o `clientSecret` gerados.
3. Ainda no dashboard da Pluggy, vincule a conexão do PicPay (feita no passo 1)
   a essa aplicação, e copie o `itemId` gerado.

⚠️ `clientSecret` e `itemId` são segredos — vão só no `.env` do servidor,
nunca em `js/`, `css/`, `dashboard.html` ou `index.html`.

## 3. Configurar o serviço

```bash
cd sync-picpay
cp .env.example .env
```

Preencha o `.env`:

```
PLUGGY_CLIENT_ID=cole_aqui
PLUGGY_CLIENT_SECRET=cole_aqui
PLUGGY_PICPAY_ITEM_ID=cole_aqui
FIREBASE_SERVICE_ACCOUNT_PATH=./secrets/firebase-service-account.json
SYNC_INTERVAL_MINUTES=15
```

## 4. Gerar a service account do Firebase

Este é um passo diferente das credenciais do `js/firebase-init.js` (aquela é
pública, feita pra rodar no navegador). Aqui precisamos de uma chave com
permissão de escrita no servidor:

1. **Console do Firebase → Configurações do projeto → Contas de serviço →
   Gerar nova chave privada.**
2. Salve o JSON em `sync-picpay/secrets/firebase-service-account.json`
   (a pasta `secrets/` já está no `.gitignore` — nunca commitar esse arquivo).

## 5. Instalar e rodar

```bash
cd sync-picpay
npm install
npm run sync:once
```

Isso faz a carga inicial. Confira no dashboard (aba Financeiro) se as
transações do PicPay apareceram, marcadas com `origem: picpay` por baixo dos
panos.

Pra manter sincronizando sozinho dali pra frente, o processo `npm start`
precisa ficar rodando 24/7 — o que **não dá pra hospedar junto do site
estático** (Vercel/Netlify não mantêm processo vivo). Duas opções gratuitas:

- **Render** → criar um "Background Worker" novo, apontando pra pasta
  `sync-picpay/`, comando de start `npm start`.
- **Railway** → mesma ideia, free tier.

## Sobre segurança

- O único segredo real aqui é o `clientSecret` da Pluggy — ele nunca sai do
  `.env` do serviço, que roda só no servidor.
- As transações gravadas em `receitas` seguem a mesma regra de acesso que já
  existe hoje (`firestore.rules`: qualquer usuário autenticado do time pode
  ler) — ou seja, o mesmo nível de confiança que já é dado a qualquer
  lançamento financeiro manual. Não alterei essa regra.
- Como o plano é gratuito, não existe webhook em tempo real — o serviço
  consulta o PicPay a cada `SYNC_INTERVAL_MINUTES` (padrão: 15 min).

## Próximos passos naturais (não incluídos ainda)

- Editar/excluir um lançamento de origem PicPay pelo dashboard hoje funciona
  igual a qualquer outro (usa `Store.remove`), mas ele pode voltar na próxima
  sincronização se ainda existir no extrato do PicPay — o de-dup é por
  `externalId`, não impede reimportação se a transação continuar lá.
- Rótulo visual no dashboard pra diferenciar lançamento manual de importado
  (hoje o campo `origem` existe no Firestore mas a UI não usa).
