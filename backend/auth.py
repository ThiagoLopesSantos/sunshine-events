import os
import bcrypt
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .database import obter_conexao_contexto, AdministradorModel, SuperAdminModel

SECRET_KEY = os.getenv("SECRET_KEY", "sua_chave_secreta_super_segura_aqui_mude_depois")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

def hash_senha(senha: str) -> str:
    pwd_bytes = senha.encode('utf-8')
    salt = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(pwd_bytes, salt)
    return hash_bytes.decode('utf-8')

def verificar_senha(senha_informada: str, senha_hash: str) -> bool:
    try:
        senha_bytes = senha_informada.encode('utf-8')
        hash_bytes = senha_hash.encode('utf-8') if isinstance(senha_hash, str) else senha_hash
        return bcrypt.checkpw(senha_bytes, hash_bytes)
    except Exception:
        return False
    
def criar_token_acesso(dados: dict):
    dados_cópia = dados.copy()
    exp_tempo = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    dados_cópia.update({"exp": exp_tempo})
    return jwt.encode(dados_cópia, SECRET_KEY, algorithm=ALGORITHM)

# Dependência para Administradores Comuns
def obter_admin_atual(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        tipo: str = payload.get("tipo", "admin")
        if email is None or tipo != "admin":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    with obter_conexao_contexto() as db:
        admin = db.query(AdministradorModel).filter(
    (AdministradorModel.email_noivo == email) | 
    (AdministradorModel.email_noiva == email)
).first()

    if admin is None:
        raise credentials_exception

    return {
            "id": admin.id, 
            "nome_noivos": admin.nome_noivos, 
            "email_noivo": admin.email_noivo, 
            "email_noiva": admin.email_noiva, 
            "celular": admin.celular
        }

# Dependência Exclusiva para o Super Admin
def obter_super_admin_atual(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acesso negado. Apenas o Super Admin pode aceder a esta rota.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        tipo: str = payload.get("tipo")
        if email is None or tipo != "super":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    with obter_conexao_contexto() as db:
        super_admin = db.query(SuperAdminModel).filter(SuperAdminModel.email == email).first()

    if super_admin is None:
        raise credentials_exception

    return {"id": super_admin.id, "nome": super_admin.nome, "email": super_admin.email}