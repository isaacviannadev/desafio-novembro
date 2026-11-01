# Desafio de Novembro

Site do desafio de 30 dias (1–30 de novembro de 2026), com check-in diário e placar ao vivo do grupo.

**Site:** https://isaacviannadev.github.io/desafio-novembro/

## Regras

- Zero ou pouco álcool (tente zerar)
- Zero fast-food
- Musculação 3–5x na semana
- 20 min de cardio 3x na semana (no mínimo)
- 3 L de água por dia (500 ml em jejum de manhã)
- 2 a 3 frutas por dia
- Ler 10 páginas por dia
- 30 minutos sem celular antes de dormir

## Como funciona

- `index.html` — o site inteiro (HTML, CSS e JS num arquivo só), publicado pelo GitHub Pages a partir deste branch (`gh-pages`).
- `config.js` — a URL da API do placar. Vazia, o site funciona e cada um marca o progresso só no próprio aparelho.
- `aws/template.yaml` — o backend do placar: uma função Lambda com URL pública e uma tabela DynamoDB. Cabe no free tier da AWS.
- `aws/handler.js` — o mesmo código da Lambda que está embutido no template, para leitura.

Cada participante entra só com o nome. O navegador guarda uma chave secreta que permite alterar apenas o próprio progresso; no servidor fica só o hash dessa chave. O botão "Usar em outro aparelho" copia um link com essa chave para abrir no celular ou no computador.

## Ligar o placar (AWS, uma vez)

1. No console da AWS, abra **CloudFormation → Create stack → With new resources**.
2. Em **Upload a template file**, envie `aws/template.yaml`.
3. Nome da stack: `desafio-novembro`. Parâmetros:
   - `AllowedOrigin`: `https://isaacviannadev.github.io`
   - `MaxPlayers`: `100` (ou o que quiser)
4. Na última tela, marque a caixa que reconhece a criação de recursos IAM e clique em **Submit**.
5. Quando a stack ficar `CREATE_COMPLETE`, abra a aba **Outputs** e copie `ApiUrl`.
6. Cole a URL em `config.js`:

   ```js
   window.DESAFIO_API = "https://xxxx.lambda-url.sa-east-1.on.aws/";
   ```

7. Faça commit e push no branch `gh-pages`. Em um ou dois minutos o placar aparece no site.

Pela linha de comando, o equivalente é:

```bash
aws cloudformation deploy \
  --template-file aws/template.yaml \
  --stack-name desafio-novembro \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides AllowedOrigin=https://isaacviannadev.github.io

aws cloudformation describe-stacks --stack-name desafio-novembro \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text
```

### API

| Método | Caminho | O que faz |
| --- | --- | --- |
| `GET` | `/players` | Lista todos os participantes (nome, dias marcados) |
| `POST` | `/players` | Cria um participante: `{ "nick": "Isaac" }` → `{ token, player }` |
| `PUT` | `/players/{id}` | Atualiza `days` e/ou `nick`. Exige `Authorization: Bearer <token>` |

### Custos

A tabela usa capacidade provisionada de 5 leituras e 5 escritas, dentro do free tier permanente do DynamoDB. A Lambda tem 1 milhão de chamadas grátis por mês, e o site consulta o placar a cada 15 s só enquanto está aberto e visível. Os logs são guardados por 7 dias. Para apagar tudo depois do desafio, exclua a stack e, em seguida, a tabela (ela é mantida de propósito para não perder o placar por engano).

## Créditos

Regras do post de @gabr1elluizz. Fotos do Unsplash.
