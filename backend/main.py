from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.routers import super_admin
from .database import SuperAdminModel, criar_tabelas, SessionLocal, AdministradorModel
from .routers import admin, convidados
from .auth import hash_senha

# Inicializa o FastAPI
app = FastAPI(title="API de Casamento")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def criar_super_admin_inicial():
    db: Session = SessionLocal()
    try:
        email_super = "thiagodev8343@gmail.com"
        master_existente = db.query(SuperAdminModel).filter(SuperAdminModel.email == email_super).first()
        
        if not master_existente:
            print("👑 Criando Super Admin na tabela exclusiva...")
            novo_master = SuperAdminModel(
                nome="Thiago Lopes Santos",
                email=email_super,
                senha=hash_senha("Tls*959802") # Senha padrão inicial
            )
            db.add(novo_master)
            db.commit()
            print("👑 Super Admin criado com sucesso! Senha temporária: 123456")
    except Exception as e:
        print(f"Erro ao criar super admin: {e}")
        db.rollback()
    finally:
        db.close()

@app.on_event("startup")
def startup():
    criar_tabelas()
    criar_super_admin_inicial() # Executa a verificação/criação do Super Admin ao ligar

    # Registra os roteadores
    app.include_router(admin.router)
    app.include_router(convidados.router)
    app.include_router(super_admin.router)

# Rota Raiz
@app.get("/")
def home():
    return {"mensagem": "Bem-vindo ao sistema do casamento Sunshine Events! Arquitetura modular ativa."}