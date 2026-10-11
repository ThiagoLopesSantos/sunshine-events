from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import criar_tabelas
from .routers import admin, convidados

# Cria as tabelas ao iniciar a aplicação

# Inicializa o FastAPI
app = FastAPI(title="API de Casamento")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    criar_tabelas()

    # Registra os roteadores (as pastas de rotas)
    app.include_router(admin.router)
    app.include_router(convidados.router)

# Rota Raiz
@app.get("/")
def home():
    return {"mensagem": "Bem-vindo ao sistema do casamento v2.0! Arquitetura modular ativa."}