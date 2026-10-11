Markdown
<div align="center">

# ☀️ Sunshine Events - RSVP
### Sistema Profissional de Gestão de Eventos e Confirmação de Presença (SaaS)

[![Python](https://img.shields.io/badge/Python-3.11%2B-blue?style=flat-square&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![Status](https://img.shields.io/badge/Status-Pronto%20para%20Deploy-success?style=flat-square)]()

*Uma solução moderna, modular e de alta performance para gerenciar listas de presença, convidados e acompanhantes com isolamento total de dados entre eventos e validações estritas de segurança.*

---

</div>

## 📖 Sobre o Projeto

O **Sunshine Events - RSVP** foi desenvolvido do absoluto zero com um rigoroso padrão de engenharia de software para atender organizadores de eventos e casais. O sistema prioriza:
* **Arquitetura Limpa e Modular:** Separação estrita entre o backend (`backend/`) e o frontend (`frontend/`), organizado em subpastas dedicadas para o painel do administrador (`admin/`) e o portal do convidado (`convidado/`).
* **Segurança de Nível Comercial:** Autenticação via JWT com chave protegida por variáveis de ambiente (`os.getenv`), criptografia de senhas com Bcrypt e isolamento multi-tenant (`admin_id`).
* **Validação Rigorosa de Dados:** Limpeza automática e padronização de telefones brasileiros (10 ou 11 dígitos) e travamento automático de prazos de RSVP com base na data do evento.

---

## 🛠️ Estrutura do Projeto

```text
sistema-rsvp/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── auth.py
│   ├── schemas.py
│   └── routers/
│       ├── admin.py
│       └── convidados.py
├── frontend/
│   ├── index.html / index.js / index.css (Login/Cadastro Admin)
│   ├── admin/ (dashboard.html, script.js, style.css)
│   └── convidados/ (convite.html, convite.js, convite.css)
├── casamento.db
└── readme.md
✨ Funcionalidades Principais
🔐 Painel Administrativo Seguro: Cadastro, login e recuperação de senha validados.

👥 Isolamento Multi-Tenant: Cada administrador gerencia sua própria base de convidados sem conflitos de números de telefone.

📱 Portal Dinâmico do Convidado: Acesso via link personalizado por evento (convite.html?evento=ID), busca por celular e controle inteligente de acompanhantes (com isenção para menores de 7 anos).

⏳ Trava de Prazo de RSVP: Bloqueio automático de confirmações caso a data limite do evento já tenha sido ultrapassada.

📲 Disparos Rápidos via WhatsApp: Geração de links automáticos para convites e lembretes direto na dashboard.

📊 Exportação Executiva: Download de relatórios limpos em formato Excel (.xlsx).

🚀 Como Executar Localmente
1. Clonar o Repositório e Iniciar o Backend
Bash
git clone <url-do-seu-repositorio>
cd sistema-rsvp

# Criar e ativar o ambiente virtual (Recomendado)
python -m venv venv
venv\Scripts\activate

# Instalar dependências
pip install fastapi uvicorn pydantic bcrypt python-jose python-multipart

# Iniciar o servidor da API FastAPI
uvicorn backend.main:app --reload