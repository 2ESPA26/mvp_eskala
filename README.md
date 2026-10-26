# ESKALA

### Sistema de Monitoramento de Condição de Escadas Rolantes

O **ESKALA** é um protótipo de aplicação web voltado ao monitoramento da condição de escadas rolantes e ao apoio ao planejamento da manutenção. A proposta utiliza conceitos de **Manutenção Baseada na Condição (CBM — Condition-Based Maintenance)** para transformar dados operacionais e históricos em informações claras, rastreáveis e úteis para as equipes técnicas e de gestão.

O projeto foi desenvolvido pela **squad CodeX**, no contexto de um desafio acadêmico da **FIAP** em parceria com a **Motiva**.

> **Importante:** esta versão é um MVP demonstrativo. Os dados exibidos são simulados e não representam medições reais dos equipamentos da Motiva.

## Objetivo

Apoiar o acompanhamento de uma frota de referência de **197 escadas rolantes**, permitindo identificar equipamentos que merecem atenção, consultar possíveis anomalias, analisar indicadores e acessar registros de manutenção em uma interface centralizada.

O ESKALA **apoia a decisão humana**: não substitui inspeções técnicas, sistemas operacionais existentes nem mecanismos de segurança.

## Funcionalidades

| Módulo | Descrição |
| --- | --- |
| **Dashboard** | Visão geral da frota, indicadores de disponibilidade, condições dos equipamentos e matriz para consulta e comparação. |
| **Central de Alertas** | Consulta de alertas e identificação de equipamentos que exigem investigação, com informações de contexto e prioridade. |
| **Equipamentos e Telemetria** | Listagem de escadas, consulta de dados operacionais e análise da condição individual dos ativos. |
| **Registro de Intervenção** | Interface para registrar informações sobre serviços e atividades de manutenção. |
| **Histórico de Intervenções** | Tabela de intervenções com consulta por equipamento, data, componente, serviço realizado e técnico responsável, além de detalhes de cada ocorrência. |

Entre as interações previstas estão navegação por menu lateral, pesquisa de equipamentos, filtros de consulta e visualização detalhada de registros.

## Usuários do sistema

- **Técnicos de manutenção:** consultam alertas, dados do equipamento e intervenções anteriores para apoiar o diagnóstico.
- **Planejamento e coordenação:** acompanham a condição da frota e organizam prioridades de investigação.
- **Gestão de operação e manutenção:** analisam indicadores consolidados e tendências para apoiar decisões.

Os passageiros são beneficiários indiretos de uma operação com maior previsibilidade e disponibilidade.

## Tecnologias

O projeto utiliza uma aplicação frontend baseada na seguinte stack prevista para o MVP:

- **React** e **TypeScript** — interface e organização dos componentes.
- **Vite** — ambiente de desenvolvimento e compilação.
- **Tailwind CSS** — estilização.
- **Recharts** — visualização de gráficos.
- **Lucide** — ícones de interface.

> Confira o arquivo `package.json` para verificar as dependências e versões efetivamente instaladas no repositório.

## Como executar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org/) com npm instalado.
- Git, caso queira clonar o repositório.

### Instalação

1. Clone o repositório e entre na pasta do projeto:

   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd <NOME_DA_PASTA>
   ```

   Se o projeto já estiver no seu computador, abra a pasta diretamente no terminal.

2. Instale as dependências:

   ```bash
   npm install
   ```

3. Inicie o ambiente de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Abra no navegador o endereço local mostrado no terminal (normalmente `http://localhost:5173/`).

### Compilação para produção

```bash
npm run build
```

Para visualizar a versão compilada localmente, caso o script esteja disponível:

```bash
npm run preview
```

## Histórico de intervenções

O módulo de histórico é voltado à rastreabilidade dos serviços executados em cada escada rolante. Ele reúne informações como:

- Data da intervenção e identificação do equipamento.
- Componente afetado e descrição do serviço realizado.
- Técnico responsável.
- Tipo, duração e observações, quando disponíveis.

A consulta pode ser filtrada por equipamento para visualizar seu histórico de intervenções e auxiliar no entendimento de recorrências e manutenções anteriores.

## Escopo e limitações

O ESKALA é uma ferramenta de **monitoramento e apoio à decisão**. Nesta proposta, o sistema:

- Não substitui sistemas existentes da Motiva, como **SCADA, SCL ou SAP**.
- Não controla, aciona ou interrompe fisicamente as escadas rolantes.
- Não toma decisões automáticas sobre a segurança ou a continuidade da operação.
- Não substitui a equipe de manutenção nem elimina a necessidade de inspeções preventivas.
- Não garante a previsão de todas as falhas.

O protótipo utiliza **dados fictícios** para apresentar os fluxos e as interfaces. A conexão com fontes reais de dados e a validação operacional dependeriam de etapas futuras do projeto.

## Próximas evoluções possíveis

- Integração controlada com fontes de dados operacionais e históricos autorizados.
- Aprimoramento dos critérios de priorização e da explicabilidade dos alertas.
- Análise de recorrência de ocorrências e intervenções por equipamento.
- Validação da usabilidade com técnicos, coordenadores e gestores.

Essas possibilidades não devem ser confundidas com funcionalidades já implementadas ou aprovadas para o MVP.

## Equipe

**Squad CodeX** — Projeto acadêmico FIAP + Motiva.

---

**ESKALA — Dados para orientar decisões de manutenção.**
