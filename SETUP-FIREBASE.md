# Configurando o Firebase — DMG SaaS

Passo a passo pra sair de dados mockados pra dados reais.

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e crie um projeto novo (ou use um já existente do DMG).
2. Dentro do projeto: **Firestore Database** → Criar banco de dados → modo produção → escolha a região mais próxima (ex: `southamerica-east1`).
3. Ainda no console: **Authentication** → Sign-in method → ative **Email/senha**.
4. **Authentication → Users → Add user**: crie um usuário (email + senha) pra cada pessoa do time que vai acessar o painel. Não existe cadastro público — é você quem cria os acessos.

## 2. Pegar as credenciais do app web

1. **Configurações do projeto** (ícone de engrenagem) → **Seus apps** → **Adicionar app** → ícone `</>` (Web).
2. Copie o objeto `firebaseConfig` que aparece.
3. Cole os valores em `js/firebase-init.js`, substituindo os placeholders (`COLE_AQUI_SUA_API_KEY`, etc.).

## 3. Aplicar as regras de segurança

1. **Firestore Database → Regras**.
2. Cole o conteúdo de `firestore.rules` (na raiz deste projeto), substituindo o que já estiver lá.
3. Publique.

## 4. Popular os dados iniciais (opcional)

Os dados mockados do `seed()` antigo não são criados automaticamente no Firestore — ele começa vazio. Duas opções:

- **Manual:** use o próprio dashboard (é pra isso que ele serve) — adicione os projetos, clientes etc. pela UI depois de logar.
- **Em lote:** se quiser importar os dados de exemplo de uma vez, no Console do Firebase → Firestore → cada coleção tem um botão "Importar" que aceita JSON.

## 5. Rodar localmente

```
node server.js
```

Depois acesse `http://localhost:4173/dashboard.html`. Vai aparecer a tela de login — entre com um dos usuários criados no passo 1.

## O que mudou em relação à versão anterior (localStorage)

- `js/store.js` agora fala com o Firestore em vez de `localStorage`, mas mantém a mesma interface (`get/add/update/remove/log`) — nenhuma view do `app.js` precisou ser reescrita.
- Mudanças feitas por qualquer pessoa do time aparecem em tempo real pra todo mundo (via `onSnapshot`), sem precisar recarregar a página.
- `js/auth.js` mostra uma tela de login até autenticar; depois libera o dashboard.
- Os botões de "exportar backup" e "limpar dados" da tela de Configurações saíram — isso agora se faz direto no Console do Firebase.

## Próximos passos naturais (não incluídos ainda)

- Regra de segurança mais granular (hoje é "qualquer usuário autenticado pode tudo" — ok pra um time pequeno confiável, mas vale revisar se o time crescer).
- Cloud Function pra manter só as últimas 60 atividades (hoje isso não é mais limpo automaticamente).
- Separar `app.js` por view (ainda pendente, como discutido antes — ficou de fora deste passo pra focar só na troca de dados).
