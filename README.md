# MarsView — Next-Generation Martian Cartography & Exploration

<div align="center">

[![NASA Space Apps Challenge 2026](https://img.shields.io/badge/NASA%20Space%20Apps-Challenge%202026-orange?style=for-the-badge&logo=nasa)](https://www.spaceappschallenge.org/)
[![Deploy Status](https://img.shields.io/badge/Deploy-Vercel%20Production-success?style=for-the-badge&logo=vercel)](https://marsview.vercel.app)
[![Tests](https://img.shields.io/badge/Tests-67%2F67%20Passed-brightgreen?style=for-the-badge&logo=vitest)](https://marsview.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**Plataforma imersiva de cartografia, telemetria e navegação planetária em Marte com dados científicos reais da NASA, ESA e FU Berlin.**

[🌐 Acessar Aplicação Online](https://marsview.vercel.app) • [🚀 Abrir Dashboard 3D Jezero](https://marsview.vercel.app/dashboard/) • [🎬 Assistir Vídeo do Pitch (29s)](https://marsview.vercel.app/video/marsview-pitch.mp4)

</div>

---

## 🌌 Visão Geral

**MarsView** é um projeto independente desenvolvido pela equipe **Lumia** para o **NASA Space Apps Challenge 2026**. A plataforma transforma dados científicos abertos de missões espaciais (Perseverance, Curiosity, MRO e Mars Express) em uma experiência interativa, acessível e de alta fidelidade visual para exploradores, entusiastas e pesquisadores.

A solução une uma landing page de alta densidade estética (Three.js, paleta marciana cobre/âmbar, telemetria real em tempo real) com um **Dashboard de Operações em Marte** completo (CesiumJS 3D, relevo digital MOLA/HRSC, fotos de solo em primeira pessoa pelo rover e assistente de voz neural com IA).

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                   MARSVIEW                                       │
│                                                                                  │
│   ┌──────────────────────────┐             ┌─────────────────────────────────┐   │
│   │    LANDING PAGE (React)  │             │   DASHBOARD 3D (Cesium/Leaflet) │   │
│   │  - Globo Three.js        │             │  - Globo Planetário Completo    │   │
│   │  - Telemetria NASA/REMS  │────────────>│  - Relevo Real HRSC/MOLA (200m) │   │
│   │  - Áudio Ambiente Scott B│             │  - Helmet HUD (Solo Navcam M20) │   │
│   │  - Vídeo Oficial Pitch   │             │  - Voz Neural ARES (Edge TTS)   │   │
│   └──────────────────────────┘             └─────────────────────────────────┘   │
│                 │                                           │                    │
│                 ▼                                           ▼                    │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │             BACKEND NODE / FASTIFY (Proxy Científico & Cache)            │   │
│   │      REMS API • FU Berlin Mosaics • MOLA DEM Elevation • EvidenceGate    │   │
│   └──────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Links Rápidos de Produção

- **Aplicação Oficial:** [https://marsview.vercel.app](https://marsview.vercel.app)
- **Dashboard Jezero Crater & Helmet HUD:** [https://marsview.vercel.app/dashboard/](https://marsview.vercel.app/dashboard/)
- **Vídeo do Pitch (Full HD 1080p, 29s):** [https://marsview.vercel.app/video/marsview-pitch.mp4](https://marsview.vercel.app/video/marsview-pitch.mp4)
- **Servidor Dedicado de Apoio:** `http://140.238.184.166/` (Oracle Cloud Ampere A1 com PM2 Cluster & Watchdog nativo)

---

## 🚀 Principais Funcionalidades

### 1. 🌍 Landing Page Planetária Imersiva
- **Globo Interativo em Three.js:** Texturizado com iluminação atmosférica suave, rotação inercial ao toque/mouse, controle de inclinação e fallback suave quando WebGL não está presente.
- **Telemetria Climática Real da NASA (Curiosity/REMS):** Consulta direta sem intermediários inventados. Exibe temperatura do ar, do solo, pressão atmosférica e o Sol mais recente publicado pelo Centro de Astrobiología/JPL.
- **Áudio Ambiente Dinâmico:** Trilha imersiva *"Decoherence"* de Scott Buckley (CC BY 4.0), com crossfade contínuo de 96s, respeitando as preferências de reprodução do navegador e `prefers-reduced-motion`.
- **Atlas Planetário e Regiões de Interesse:** Detalhamento geológico de Jezero Crater, Olympus Mons e Valles Marineris com coordenadas precisas.

### 2. 🔭 Dashboard de Exploração 3D (`/dashboard/`)
- **Globo CesiumJS de Escala Real:** Mapeamento esférico de Marte com base no mosaico em cor natural da ESA/DLR/FU Berlin.
- **Relevo Digital de Terreno (DEM):** Modelos altimétricos integrados MOLA (463 m/px) e HRSC+MOLA (200 m/px) para análise de declive e planejamento de rotas seguras de rovers.
- **Modo Capacete ("Helmet HUD" / 1st Person Ground Truth):** Vista em primeira pessoa do astronauta/rover usando mosaicos fotográficos reais da Navcam do Perseverance, combinados com elevação orbital 3D e bússola giroscópica.
- **Simulação de Missão:** Rastreamento de batimentos, estimativa de consumo de oxigênio baseada no gradiente de terreno e peso do traje.

### 3. 🎙️ ARES Mission Copilot (Voz Neural)
- Síntese de voz com entonação natural via Edge TTS (`en-US-AvaMultilingualNeural`), 24 kHz/96 kbps em MP3.
- Respostas audíveis e avisos de telemetria sem exigir dependências pesadas de Python no cliente.

### 4. 🎬 Vídeo Pitch Oficial (Remotion)
- Projeto de animação de 29 segundos localizado na pasta `pitch/`, renderizado em 1920x1080 a 30 FPS com narração sincronizada por inteligência artificial.

---

## 🛰️ Dados Científicos e Procedência (Data Provenance)

O projeto prioriza rigor factual e integridade científica absoluta. Não há dados inventados ou números de preenchimento:

| Camada / Recurso | Missão / Agência | Instrumento / Dataset | Resolução / Detalhe |
| :--- | :--- | :--- | :--- |
| **Elevação Global** | Mars Global Surveyor (NASA) | MOLA DEM | 463 m/pixel |
| **Relevo Jezero & Regional** | Mars Express (ESA/DLR) | HRSC + MOLA | ~200 m/pixel |
| **Imagens de Alta Resolução** | Mars Reconnaissance Orbiter | HiRISE / CTX | 0,25 m a 6 m/pixel |
| **Mosaico em Cor Natural** | Mars Express (ESA/DLR/FU Berlin) | HRSC (CC BY-SA 3.0 IGO) | Cores reais calibradas |
| **Clima e Atmosfera** | Curiosity / Mars 2020 (NASA) | REMS / MEDA | Sols recentes publicados |
| **Fotografias de Solo** | Perseverance (NASA/JPL) | Navcam & Mastcam-Z | Panoramas brutos reais |

---

## 🛠️ Tecnologias Utilizadas

- **Frontend Core:** React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, Lucide React
- **Renderização 3D e Cartografia:** Three.js (0.180), CesiumJS (1.119), Leaflet (1.9)
- **Backend & APIs:** Node.js (v20/v22), Fastify, Edge TTS, REST Endpoints
- **Motion Design & Vídeo:** Remotion 4
- **Testes & Qualidade:** Vitest 3.2, JSDOM 26, Puppeteer Core (E2E WebGL)
- **Infraestrutura e Alta Disponibilidade:** Vercel Edge Network, Oracle Cloud Ubuntu (Ampere A1 aarch64), PM2 Cluster com auto-restart e Watchdog Systemd a cada 60s.

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos
- **Node.js:** Versão 20.x, 22.x ou 24 LTS
- **Git**

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/Lumia-NASA/MarsView.git
   cd MarsView
   ```

2. **Instalar as dependências:**
   ```bash
   npm install
   ```
   *(O comando `postinstall` instalará automaticamente os pacotes de backend necessários).*

3. **Executar em modo desenvolvimento:**
   ```bash
   npm run dev
   ```
   Abra no navegador: `http://localhost:5173`

4. **Executar a suíte de testes:**
   ```bash
   npm test
   ```
   *Executa 10 arquivos e 67 testes unitários e de integração via Vitest.*

5. **Compilar e rodar o servidor de produção:**
   ```bash
   npm run build
   npm start
   ```
   A aplicação completa estará disponível em `http://localhost:4173` (tanto a landing quanto a rota `/dashboard/`).

---

## 🎥 Como Renderizar o Vídeo do Pitch (`pitch/`)

O projeto do vídeo oficial foi construído com **Remotion**:

```bash
cd pitch
npm install
npx remotion render src/index.ts MarsViewPitch out/marsview-pitch.mp4
```

O vídeo de saída será gerado em `pitch/out/marsview-pitch.mp4` em 1080p a 30 FPS.

---

## 🛡️ Infraestrutura e Resiliência em Produção

A arquitetura pública conta com dupla proteção para zero downtime:
1. **Vercel Edge Proxy:** Distribuição global de assets via CDN com SSL automático no domínio `marsview.vercel.app`.
2. **Oracle Cloud Dedicated Host (`140.238.184.166`):**
   - **PM2 Cluster Mode:** Monitoramento contínuo de memória com reciclagem em 600 MB e reinicialização imediata em caso de falha.
   - **Self-Healing Watchdog:** Timer nativo do systemd (`marsview-watchdog.timer`) verificando a integridade HTTP a cada 60 segundos com recuperação autônoma.
   - **pm2-logrotate:** Limite de 10 MB e retenção de 7 arquivos para evitar acúmulo de disco.

---

## 👥 Equipe Lumia (NASA Space Apps 2026)

Desenvolvido com dedicação por:
- **Lucas Mauril** ([@LucasMauril](https://github.com/LucasMauril))
- **Thiago Alves** ([@thiagoalves0707](https://github.com/thiagoalves0707))
- **Naldrin** ([@Naldrin123](https://github.com/Naldrin123))
- **Gabriel Franzói**
- **Rafael Manzan**

---

## 📄 Licença e Atribuições

- Código licenciado sob a **Licença MIT**.
- Trilha sonora: *"Decoherence"* por Scott Buckley ([scottbuckley.com.au](https://www.scottbuckley.com.au/)), licenciada sob [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Imagens e modelos de Marte cortesia de NASA, JPL-Caltech, ESA, DLR e Freie Universität Berlin (HRSC CC BY-SA 3.0 IGO).
