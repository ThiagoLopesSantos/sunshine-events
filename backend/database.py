import os
from contextlib import contextmanager
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from datetime import datetime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Pega a URL do banco do Supabase via Variável de Ambiente, ou usa SQLite local para testes locais
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./casamento.db")

# Configuração robusta para evitar timeouts e quedas de conexão na nuvem
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,       # Verifica se a conexão está ativa antes de usar
        pool_size=5,              # Mantém um pool saudável de conexões
        max_overflow=10,
        connect_args={"connect_timeout": 10} # Timeout de 10 segundos para não estourar a porta do Render
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Gerenciador de contexto compatível com blocos 'with' (usado no auth.py)
@contextmanager
def obter_conexao_contexto():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Gerenciador para injeção via Depends() no FastAPI
def obter_conexao():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Modelos das Tabelas que serão criadas automaticamente no PostgreSQL/Supabase
class SuperAdminModel(Base):
    __tablename__ = "super_administradores"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha = Column(String, nullable=False)

class AdministradorModel(Base):
    __tablename__ = "administradores"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome_noivos = Column(String, nullable=False)
    email_noivo = Column(String, unique=True, index=True, nullable=False)
    email_noiva = Column(String, unique=True, index=True, nullable=False)
    celular = Column(String, nullable=False)
    senha = Column(String, nullable=False)
    data_evento = Column(String, nullable=True)

class TokenModel(Base):
    __tablename__ = "tokens_licenca"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token = Column(String, unique=True, index=True, nullable=False)
    usado = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    usado_por_email = Column(String, nullable=True)

class ConvidadoModel(Base):
    __tablename__ = "convidados"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(Integer, nullable=False)
    nome_completo = Column(String, nullable=False)
    celular = Column(String, nullable=False)
    status_presenca = Column(String, default="pendente")
    limite_acompanhantes = Column(Integer, default=0)
    categoria = Column(String, default="Geral")

class AcompanhanteModel(Base):
    __tablename__ = "acompanhantes"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    convidado_id = Column(Integer, nullable=False)
    nome = Column(String, nullable=False)
    idade = Column(Integer, nullable=False)

def criar_tabelas():
    Base.metadata.create_all(bind=engine)

def obter_conexao():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()