from pydantic import BaseModel
from typing import Optional, List

# Schemas (Pydantic)
class AdminSchema(BaseModel):
    nome: str
    email: str
    celular: str
    senha: str 
    nome_evento: str
    data_evento: str

class LoginSchema(BaseModel):
    email: str
    senha: str

class ConvidadosSchema(BaseModel):
    nome_completo: str
    celular: str
    status_presenca: str = "pendente"
    limite_acompanhantes: int = 0
    nome_acompanhante: Optional[List[str]] = []   

class AtualizarPresencaSchema(BaseModel):
    status_presenca: str
    nome_acompanhante: Optional[List[str]] = []

class EditarConvidadoSchema(BaseModel):
    nome_completo: str
    celular: str
    limite_acompanhantes: int
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
