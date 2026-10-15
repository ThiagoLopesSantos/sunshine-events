import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import obter_conexao, SuperAdminModel, AdministradorModel, ConvidadoModel, AcompanhanteModel, TokenModel
from ..schemas import LoginSchema
from ..auth import verificar_senha, criar_token_acesso, obter_super_admin_atual, hash_senha

router = APIRouter(prefix="/master", tags=["Super Admin Master"])

@router.post("/login")
def login_super_admin(credenciais: LoginSchema, db: Session = Depends(obter_conexao)):
    master = db.query(SuperAdminModel).filter(SuperAdminModel.email == credenciais.email).first()

    if not master or not verificar_senha(credenciais.senha, master.senha):
        return {"status": "erro", "mensagem": "Credenciais de Super Admin incorretas!"}

    # Gera token especificando que o tipo é 'super'
    token_acesso = criar_token_acesso(dados={"sub": master.email, "tipo": "super"})

    return {
        "status": "sucesso",
        "nome": master.nome,
        "mensagem": f"Bem-vindo ao Painel Master, {master.nome}.",
        "access_token": token_acesso,
        "token_type": "bearer"
    }

@router.post("/gerar-token")
def gerar_token(admin_logado: dict = Depends(obter_super_admin_atual), db: Session = Depends(obter_conexao)):
    novo_codigo = f"SUNSHINE-{secrets.token_hex(3).upper()}"
    
    token_db = TokenModel(token=novo_codigo, usado=False)
    db.add(token_db)
    db.commit()

    return {
        "status": "sucesso",
        "token_gerado": novo_codigo,
        "mensagem": "Token de licença gerado com sucesso!"
    }

@router.get("/listar-admins")
def listar_admins(admin_logado: dict = Depends(obter_super_admin_atual), db: Session = Depends(obter_conexao)):
    admins = db.query(AdministradorModel).all()
    hoje = datetime.utcnow().date()
    lista = []

    for a in admins:
        expirado = False
        if a.data_evento:
            try:
                data_ev = datetime.strptime(a.data_evento, "%Y-%m-%d").date()
                limite_expiracao = data_ev + timedelta(days=2)
                if hoje > limite_expiracao:
                    expirado = True
            except Exception:
                pass

        lista.append({
            "id": a.id,
            "nome": a.nome_noivos, 
            "email": a.email_noivo, 
            "celular": a.celular,
            "evento": a.nome_evento,
            "data": a.data_evento,
            "expirado": expirado
        })

    return {"status": "sucesso", "total": len(lista), "administradores": lista}

@router.delete("/admin/{admin_id}")
def deletar_admin(admin_id: int, admin_logado: dict = Depends(obter_super_admin_atual), db: Session = Depends(obter_conexao)):
    alvo = db.query(AdministradorModel).filter(AdministradorModel.id == admin_id).first()
    if not alvo:
        return {"status": "erro", "mensagem": "Administrador não encontrado."}

    # Exclusão em cascata (convidados e acompanhantes)
    convidados = db.query(ConvidadoModel).filter(ConvidadoModel.admin_id == alvo.id).all()
    for c in convidados:
        db.query(AcompanhanteModel).filter(AcompanhanteModel.convidado_id == c.id).delete()
        db.delete(c)
    
    db.delete(alvo)
    db.commit()

    return {"status": "sucesso", "mensagem": f"Administrador {alvo.nome} e todos os seus dados foram removidos com sucesso!"}