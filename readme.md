Markdown
<div align="center">

# ☀️ Sunshine Events - RSVP
### Sistema Profissional de Gestão de Eventos e Confirmação de Presença (SaaS)

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat-square&logo=postgresql)](https://www.supabase.com/)
[![Render](https://img.shields.io/badge/Render-Backend-46E3B7?style=flat-square&logo=render)](https://render.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Frontend-000000?style=flat-square&logo=vercel)](https://vercel.com/)
[![Status](https://img.shields.io/badge/Status-Produção%20Ativa-success?style=flat-square)]()

*Uma solução moderna, modular, altamente responsiva e de alta performance para gerenciar listas de presença, convidados e acompanhantes com isolamento total de dados entre eventos e persistência robusta em nuvem.*

---

</div>

## 📖 Propósito do Projeto

O **Sunshine Events - RSVP** nasceu com o objetivo de solucionar um problema real enfrentado por organizadores de eventos e casais: a complexidade e a desorganização no gerenciamento de confirmações de presença (RSVP). 

O propósito foi construir um **SaaS (Software as a Service) multi-tenant**, onde múltiplos administradores possam se cadastrar, configurar seus próprios eventos e gerar links exclusivos para que seus convidados interajam de forma dinâmica, elegante e intuitiva, controlando o limite de acompanhantes, isenções de buffet para crianças e prazos de resposta.

---

## 🧠 Evolução e Mentalidade de Arquitetura

O desenvolvimento seguiu uma trilha de engenharia evolutiva, garantindo solidez a cada camada:

1. **Fase 1: MVP Local e Modularidade (Fundação)**
   * Estruturação inicial separando claramente o **Backend** (`backend/`) e o **Frontend** (`frontend/`).
   * Desenvolvimento do layout limpo e responsivo para navegadores e dispositivos móveis.
   * Criação do painel administrativo e do portal do convidado.

2. **Fase 2: Blindagem de Segurança e Multi-Tenancy**
   * Implementação de autenticação baseada em tokens **JWT (JSON Web Tokens)** e criptografia de senhas com **Bcrypt**.
   * Isolamento estrito de dados por administrador (`admin_id`), impedindo que convidados de eventos diferentes se sobreponham.
   * Validação de números de telefone no padrão brasileiro (10 ou 11 dígitos com limpeza automática de caracteres especiais).

3. **Fase 3: Regras de Negócio e Validações Críticas**
   * Trava de prazo de RSVP: cálculo automático de dias restantes e bloqueio do formulário caso a data do evento já tenha sido ultrapassada.
   * Regra de buffet inteligente para acompanhantes (contabilização diferenciada para menores de 7 anos).
   * Geração automatizada de links de convite e lembretes via WhatsApp.

4. **Fase 4: O Salto para a Nuvem e Persistência Definitiva (Produção)**
   * Migração do ambiente local SQLite para um banco de dados relacional robusto na nuvem (**PostgreSQL via Supabase**).
   * Adoção do **SQLAlchemy** como ORM para gerenciar o mapeamento de objetos e a criação automática de tabelas.
   * Deploy profissional desacoplado: **Render** para a API FastAPI e **Vercel** para os arquivos estáticos do Frontend.

---

## 🛠️ Tecnologias Utilizadas

* **Linguagem:** Python 3.11+
* **Framework Backend:** FastAPI (Alta performance, documentação automática via Swagger/OpenAPI)
* **ORM & Banco de Dados:** SQLAlchemy, PostgreSQL (Hospedado no Supabase)
* **Segurança:** Python-Jose (JWT), Passlib (Bcrypt)
* **Servidor API:** Uvicorn (Hospedado no Render)
* **Frontend:** HTML5, CSS3 Moderno, JavaScript Vanilla (Modularizado e Responsivo)
* **Hospedagem Frontend:** Vercel (Rede global de entrega de conteúdo - CDN)
* **Bibliotecas Auxiliares:** SheetJS (XLSX) para exportação de planilhas executivas.

---

## 📂 Estrutura do Projeto

```text
sistema-rsvp/
├── backend/
│   ├── main.py              # Ponto de entrada da API e inicialização do ORM
│   ├── database.py          # Configuração do SQLAlchemy e conexão com PostgreSQL/Supabase
│   ├── auth.py              # Regras de geração e validação de tokens JWT e senhas
│   ├── schemas.py           # Modelos de validação de dados de entrada (Pydantic)
│   └── routers/
│       ├── admin.py         # Rotas protegidas do painel administrativo e CRUD de convidados
│       └── convidados.py    # Rotas públicas do portal do convidado e validação de prazos
├── frontend/
│   ├── index.html / index.js / index.css         # Portal de Login e Cadastro do Admin
│   ├── admin/
│   │   ├── dashboard.html   # Painel de controle principal do evento
│   │   ├── script.js        # Lógica de estatísticas, tabelas e links dinâmicos
│   │   └── style.css        # Estilização responsiva do painel
│   └── convidados/
│       ├── convite.html     # Portal interativo para o convidado confirmar presença
│       ├── convite.js       # Regras de busca por celular, prazos e acompanhantes
│       └── convite.css      # Design mobile-first adaptado para smartphones
├── requirements.txt         # Dependências do projeto Python para produção
└── readme.md                # Documentação oficial do projeto
```

---

## 🚀 Como Executar o Projeto Localmente

### 1. Clonar o Repositório e Configurar o Backend
```bash
git clone <url-do-seu-repositorio>
cd sistema-rsvp

# Criar e ativar o ambiente virtual
python -m venv venv
venv\Scripts\activate  # No Windows (ou source venv/bin/activate no Linux/Mac)

# Instalar dependências
pip install -r requirements.txt

# Iniciar o servidor de desenvolvimento FastAPI
uvicorn backend.main:app --reload
```

### 2. Acessar o Frontend
Abra a pasta `frontend/` utilizando um servidor local (como a extensão *Live Server* do VS Code) para testar os fluxos de administrador e convidados no navegador (`http://127.0.0.1:5500/frontend/index.html`).

---

<div align="center">
  <p>Desenvolvido com engenharia rigorosa, arquitetura limpa e foco em alta performance e escalabilidade. 💍🚀</p>
</div>