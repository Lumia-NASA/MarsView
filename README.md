# MarsView

Landing page de Marte em **React 19 + TypeScript + Tailwind CSS 4 + Three.js + Lucide React**. Código completo, componentes modulares e recursos gráficos locais. A interface segue os textos em inglês do briefing.

## Executar

Requer Node.js 22.12+ ou 24 LTS.

```powershell
cd "D:\aresnav-mars-main\Landing Page"
npm.cmd ci
npm.cmd run dev
```

Abra a URL impressa pelo Vite, normalmente `http://127.0.0.1:5173`.
Em macOS/Linux, use `npm` no lugar de `npm.cmd`.

```sh
npm run build       # TypeScript + build estático em dist/
npm run preview     # Servir o build de produção
npm test            # Validação de dados externos
npm run typecheck
```

Para produção, execute `npm run build` e `npm start`: o servidor Node serve `dist/` e a rota `/api/mars-weather` na porta 4173 (configurável por `PORT`). Use `HOST=0.0.0.0` quando necessário no provedor e termine HTTPS na hospedagem. Em um host exclusivamente estático, também será necessário hospedar essa rota em um backend e configurar `VITE_TELEMETRY_URL`; publicar somente `dist/` não oferece a consulta à NASA. O projeto assume hospedagem na raiz do domínio. Configure o domínio absoluto nos metadados Open Graph antes da publicação pública.

## O que está implementado

- Hero central, paleta preta/cobre, fontes locais e entrada suave via Tailwind.
- Globo Three.js texturizado na landing page, arraste horizontal no toque, arraste livre com mouse, teclado e rotação automática. Fallback visual quando WebGL não está disponível.
- Ticker infinito com pausa e suporte a `prefers-reduced-motion`.
- Bento assimétrico, inspeção interativa da imagem Mastcam-Z e links para fontes NASA.
- Atlas planetário com período de rotação, ano marciano, gravidade e pressão média, distinguindo referências estáticas de telemetria.
- Regiões Jezero, Olympus Mons e Valles Marineris apresentadas na landing page, com links para fontes NASA, além de um roteiro de leitura entre missão de superfície, observações orbitais e o arquivo PDS.
- Observações reais NASA/REMS, com fonte, data, valores ausentes explícitos, validação, timeout e atualização a cada 30 minutos.
- Navegação mobile, skip link, foco visível, elementos semânticos e estados acessíveis.
- Carregamento separado do Three.js; descarte de recursos gráficos e suspensão da renderização fora da tela ou com a aba oculta.

## Áudio ambiente

O botão AUDIO controla a música e todos os efeitos por um único volume mestre. A faixa é “Decoherence”, de Scott Buckley (CC BY 4.0), em um trecho editado para loop de 96 segundos com crossfade de oito segundos. O arquivo local tem aproximadamente 1,9 MB e só é baixado quando o áudio é ativado. Créditos e alterações estão em `public/audio/CREDITS.md` e no rodapé.

O áudio começa desativado para novos visitantes e guarda a preferência. Quando a preferência salva está ativada, a reprodução aguarda um clique, toque ou tecla para respeitar as regras do navegador. Há entrada gradual, mute conjunto, pausa com a aba oculta e retomada da mesma posição, sem empilhar trilhas. Uma falha permite tentar novamente pelo botão de áudio.

## Observações da NASA

A seção de observações consulta o [feed público NASA/JPL de Curiosity/REMS](https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json), sem chave de API. A rota `/api/mars-weather` faz a consulta no servidor para evitar bloqueios CORS no navegador; funciona no Vite, no preview e no servidor de produção incluído. O destino da consulta é fixo, sem proxy aberto, e erros da NASA retornam HTTP 502, sem números de reserva. Exibe o sol mais recente com data válida, temperaturas mínima/máxima do ar e do solo e pressão em Pa. Todos os campos pertencem ao mesmo sol. O feed é fornecido pelo Centro de Astrobiología para divulgação; para pesquisa científica, consulte o [PDS](https://pds.nasa.gov/).

São medições reais publicadas, não telemetria em tempo real. A data terrestre corresponde ao meio-dia do sol segundo a definição do feed, sem inventar um horário UTC de observação. A interface separa essa data da hora da consulta, identifica a missão/instrumento e mantém o link da fonte ao lado dos valores. Não há coordenadas inventadas nem valores demonstrativos de reserva.

A consulta acontece ao abrir a página, ao retornar à aba, a cada 30 minutos com a aba visível e pelo botão de atualização. Há timeout de 10 segundos, cancelamento e validação dos dados. Campos ausentes ou inválidos aparecem como “Not reported”. Em falha, a última observação obtida nesta sessão permanece com sua data e um aviso; sem leitura anterior, nenhum número é exibido.

Opcionalmente configure `VITE_TELEMETRY_URL` com um espelho confiável desse mesmo feed NASA (`{ "soles": [...] }`), permitindo CORS. O contrato genérico antigo de telemetria não é mais usado. `VITE_*` fica público no bundle: nunca coloque chaves nessa configuração. Recompile após mudar variáveis. `VITE_REPOSITORY_URL` continua opcional.


## Limites do escopo

O globo é uma visualização de textura de cor, não um modelo científico de elevação. O card Rover Routing Engine ilustra o conceito: não inclui algoritmo de navegação, modelo digital de terreno ou cálculo de rotas. Atmospheric Zoom permite inspecionar uma imagem real; não simula física atmosférica. Esses módulos podem ser conectados sem reescrever a landing page.

## Componentes

```text
src/
  App.tsx                   Composição da landing page e error boundary
  components/
    Header.tsx              Navegação responsiva
    Hero.tsx                Hero e CTAs
    MarsGlobe.tsx            Fronteira substituível do renderizador 3D
    MissionTicker.tsx        Faixa de missão
    Features.tsx             Bento de recursos
    Telemetry.tsx            Cards de dados e estados
    Footer.tsx               Créditos e links
  hooks/
    useTelemetry.ts         Polling, timeout e cancelamento
    useReducedMotion.ts     Preferência de acessibilidade
  lib/
    config.ts               Links e regiões
    telemetry.ts            Contrato, validação e formatação
    telemetry.test.ts       Testes da fronteira de dados
  styles.css                Tokens e utilities Tailwind
```

Os botões “Open dashboard” abrem `/dashboard/`, servido diretamente de `aresnav-mars-main/frontend`. A rota `/dashboard` redireciona para a versão com barra para resolver corretamente os scripts e dados relativos. `/api/v1/*` é encaminhado ao backend Fastify original, iniciado automaticamente em uma porta privada ao primeiro acesso. A integração funciona com `npm run dev`, `npm run preview` e `npm start`, sem iniciar manualmente outro terminal. A recarga direta de `/dashboard/` também funciona.

O dashboard usa `responsive.css` e `responsive.js` para adaptar o espaço de trabalho. Até 1100 px de largura ou 600 px de altura, os painéis passam para uma navegação inferior: Preparar, Plano, Simulação e Ferramentas. Só um painel fica aberto por vez, com rolagem interna, fechamento acessível e controles originais preservados. A busca e as ações secundárias ficam no menu; no modo Capacete, os controles detalhados ficam em Ferramentas. Ao ampliar a janela, os painéis voltam ao layout de desktop sem reiniciar a missão.

`npm ci` na raiz instala as dependências do backend via `postinstall`. Na implantação, inclua `dist/`, `server/` e `aresnav-mars-main/` (frontend, backend e contrato), além das dependências instaladas. Publicar apenas `dist/` não inclui o dashboard nem suas APIs. O processo privado é encerrado junto com o servidor principal. As configurações e credenciais do dashboard continuam no backend original; nenhum arquivo de configuração privado é exposto pelo frontend.

## Fontes e atribuições

- Textura: [Solar System Scope](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Aplicada a uma esfera com iluminação artística; as cores não são uma escala científica.
- Imagem: [Perseverance’s Mastcam-Z First High-Resolution Panorama, PIA23727](https://science.nasa.gov/photojournal/perseverances-mastcam-z-first-high-resolution-panorama/). NASA/JPL-Caltech/ASU/MSSS. Redimensionada para exibição.
- Constantes de raio e gravidade: [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html).
- Fontes: Manrope e IBM Plex Mono distribuídas via Fontsource; licenças incluídas nos pacotes.
- Ícones: Lucide, ISC. Demais dependências mantêm suas próprias licenças.

Projeto independente destinado ao NASA Space Apps Challenge 2026 conforme o briefing. Não implica endosso, afiliação oficial ou inscrição confirmada.
"# Pagina-Domum1.0" 
