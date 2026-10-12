import os
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Pega a URL do banco do Supabase via Variável de Ambiente, ou usa SQLite local para testes locais
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./casamento.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Modelos das Tabelas que serão criadas automaticamente no PostgreSQL/Supabase
class AdministradorModel(Base):
    __tablename__ = "administradores"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    celular = Column(String, nullable=False)
    senha = Column(String, nullable=False)
    nome_evento = Column(String, nullable=True)
    data_evento = Column(String, nullable=True)

class ConvidadoModel(Base):
    __tablename__ = "convidados"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    admin_id = Column(Integer, nullable=False)
    nome_completo = Column(String, nullable=False)
    celular = Column(String, nullable=False)
    status_presenca = Column(String, default="pendente")
    limite_acompanhantes = Column(Integer, default=0)

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