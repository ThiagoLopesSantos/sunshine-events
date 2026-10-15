from pydantic import BaseModel
from typing import Optional, List

# Schemas (Pydantic)
class AdminSchema(BaseModel):
    nome_noivos: str
    email_noivo: str
    email_noiva: str
    celular: str
    senha: str 
    data_evento: str
    token: str

class LoginSchema(BaseModel):
    email: str
    senha: str

class ConvidadosSchema(BaseModel):
    nome_completo: str
    celular: str
    status_presenca: str = "pendente"
    limite_acompanhantes: int = 0
    categoria: Optional[str] = "Geral"
    nome_acompanhante: Optional[List[str]] = []   

class AtualizarPresencaSchema(BaseModel):
    status_presenca: str
    nome_acompanhante: Optional[List[str]] = []

class EditarConvidadoSchema(BaseModel):
    nome_completo: str
    celular: str
    limite_acompanhantes: int
    categoria: Optional[str] = "Geral"
    nome_acompanhante: Optional[List[str]] = []

class AcompanhanteSchema(BaseModel):
    nome: str
    idade: int

class ConfirmarRsvpSchema(BaseModel):
    status_presenca: str  # 'confirmado' ou 'recusado'
    acompanhantes: Optional[List[AcompanhanteSchema]] = []

class EditarAdminSchema(BaseModel):
    nome: str
    celular: str
    nome_evento: str
    data_evento: str
    senha: Optional[str] = None  # Opcional: se vier vazio, não altera a senha
