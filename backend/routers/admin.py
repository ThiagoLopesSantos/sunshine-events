import re
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import obter_conexao, AdministradorModel, ConvidadoModel, AcompanhanteModel, TokenModel
from ..schemas import AdminSchema, LoginSchema, ConvidadosSchema, EditarConvidadoSchema, EditarAdminSchema
from ..auth import hash_senha, verificar_senha, criar_token_acesso, obter_admin_atual

router = APIRouter(prefix="/admin", tags=["Administrador"])

def limpar_celular(celular: str) -> str:
    return re.sub(r'\D', '', celular)

@router.post("/cadastrar")
def cadastrar_admin(admin: AdminSchema, db: Session = Depends(obter_conexao)):
    try:
        # 1. Verifica se qualquer um dos emails (do noivo ou da noiva) já existe
        email_existente = db.query(AdministradorModel).filter(
            (AdministradorModel.email_noivo == admin.email_noivo) | 
            (AdministradorModel.email_noiva == admin.email_noiva)
        ).first()
        
        if email_existente:
            return {"status": "erro", "mensagem": "Um dos e-mails informados já está cadastrado no sistema."}

        # 2. Validação do Token de Licença
        token_obj = db.query(TokenModel).filter(TokenModel.token == admin.token, TokenModel.usado == False).first()
        if not token_obj:
            return {"status": "erro", "mensagem": "Token de ativação inválido ou já utilizado."}

        # 3. Cria o novo administrador
        senha_criptografada = hash_senha(admin.senha)
        novo_admin = AdministradorModel(
            nome_noivos=admin.nome_noivos,
            email_noivo=admin.email_noivo,
            email_noiva=admin.email_noiva,
            celular=admin.celular,
            senha=senha_criptografada,
            data_evento=admin.data_evento,
        )
        db.add(novo_admin)

        # 4. Marca o token como usado
        token_obj.usado = True
        token_obj.usado_por_email = admin.email_noivo

        db.commit()

        return {
            "status": "sucesso",
            "mensagem": f"Conta de {admin.nome_noivos} cadastrada com sucesso!",
        }
    except Exception as e:
        db.rollback()
        return {
            "status": "erro",
            "mensagem": f"Não foi possível cadastrar. Erro no banco de dados: {str(e)}"
        }

@router.post("/login")
def login_admin(credenciais: LoginSchema, db: Session = Depends(obter_conexao)):
    admin_encontrado = db.query(AdministradorModel).filter(
        (AdministradorModel.email_noivo == credenciais.email) | 
        (AdministradorModel.email_noiva == credenciais.email)
    ).first()

    if not admin_encontrado:
        return {"status": "erro", "mensagem": "E-mail não encontrado!"}
    
    if not verificar_senha(credenciais.senha, admin_encontrado.senha):
        return {"status": "erro", "mensagem": "Senha incorreta!"}

    token_acesso = criar_token_acesso(dados={"sub": admin_encontrado.email_noivo})

    return {
        "status": "sucesso",
        "mensagem": f"Login realizado com sucesso! Bem-vindos de volta, {admin_encontrado.nome_noivos}.",
        "access_token": token_acesso,
        "token_type": "bearer",
        "admin_id": admin_encontrado.id,
        "nome_evento": admin_encontrado.nome_noivos,
        "data_evento": admin_encontrado.data_evento,
    }

@router.post("/convidados/cadastrar")
def cadastrar_convidado(convidado: ConvidadosSchema, admin_logado: dict = Depends(obter_admin_atual), db: Session = Depends(obter_conexao)):
    try:
        celular_limpo = limpar_celular(convidado.celular)
        
        if len(celular_limpo) != 11 and len(celular_limpo) != 10:
            return {"status": "erro", "mensagem": "O número de celular deve conter o DDD seguido do número (10 ou 11 dígitos)."}

        celular_existente = db.query(ConvidadoModel).filter(
            ConvidadoModel.celular == celular_limpo,
            ConvidadoModel.admin_id == admin_logado["id"]
        ).first()

        if celular_existente:
            return {"status": "erro", "mensagem": "Este número de celular já está cadastrado na sua lista."}
        
        novo_convidado = ConvidadoModel(
            admin_id=admin_logado["id"],
            nome_completo=convidado.nome_completo,
            celular=celular_limpo,
            status_presenca=convidado.status_presenca,
            limite_acompanhantes=convidado.limite_acompanhantes
        )
        db.add(novo_convidado)
        db.commit()
        db.refresh(novo_convidado)

        if convidado.nome_acompanhante:
            for acomp in convidado.nome_acompanhante:
                nome_acomp = acomp.get("nome") if isinstance(acomp, dict) else acomp
                idade_acomp = acomp.get("idade", 0) if isinstance(acomp, dict) else 0
                
                novo_acomp = AcompanhanteModel(
                    convidado_id=novo_convidado.id,
                    nome=nome_acomp,
                    idade=idade_acomp
                )
                db.add(novo_acomp)
            db.commit()

        return {
            "status": "sucesso",
            "mensagem": f"Convidado {convidado.nome_completo} cadastrado com sucesso!"
        }
    except Exception as e:
        db.rollback()
        return {"status": "erro", "mensagem": f"Erro: {str(e)}"}

@router.get("/convidado")
def listar_convidados(admin_logado: dict = Depends(obter_admin_atual), db: Session = Depends(obter_conexao)):
    convidados_brutos = db.query(ConvidadoModel).filter(ConvidadoModel.admin_id == admin_logado["id"]).all()

    lista_formatada = []
    for c in convidados_brutos:
        acompanhantes_db = db.query(AcompanhanteModel).filter(AcompanhanteModel.convidado_id == c.id).all()
        acompanhantes_lista = [{"nome": a.nome, "idade": a.idade} for a in acompanhantes_db]

        lista_formatada.append({
            "id": c.id, 
            "nome_completo": c.nome_completo, 
            "celular": c.celular,
            "status_presenca": c.status_presenca, 
            "limite_acompanhantes": c.limite_acompanhantes,
            "nome_acompanhante": acompanhantes_lista         
        })

    return {
        "status": "sucesso",
        "total_convidados": len(lista_formatada),
        "convidados": lista_formatada
    }

@router.put("/convidado/{convidado_id}")
def editar_convidado(convidado_id: int, dados: EditarConvidadoSchema, admin_logado: dict = Depends(obter_admin_atual), db: Session = Depends(obter_conexao)):
    convidado = db.query(ConvidadoModel).filter(
        ConvidadoModel.id == convidado_id,
        ConvidadoModel.admin_id == admin_logado["id"]
    ).first()

    if not convidado:
        return {"status": "erro", "mensagem": "Convidado não encontrado ou sem permissão!"}

    convidado.nome_completo = dados.nome_completo
    convidado.celular = dados.celular
    convidado.limite_acompanhantes = dados.limite_acompanhantes
    db.commit()

    return {"status": "sucesso", "mensagem": "Atualizado com sucesso!"}

@router.delete("/convidado/{convidado_id}")
def deletar_convidado(convidado_id: int, admin_logado: dict = Depends(obter_admin_atual), db: Session = Depends(obter_conexao)):
    convidado = db.query(ConvidadoModel).filter(
        ConvidadoModel.id == convidado_id,
        ConvidadoModel.admin_id == admin_logado["id"]
    ).first()

    if not convidado:
        return {"status": "erro", "mensagem": "Convidado não encontrado ou sem permissão!"}

    db.delete(convidado)
    db.commit()
    return {"status": "sucesso", "mensagem": "Removido com sucesso!"}

@router.post("/verificar-recuperacao")
def verificar_recuperacao(dados: dict, db: Session = Depends(obter_conexao)):
    email = dados.get("email")
    celular = dados.get("celular")
    
    admin = db.query(AdministradorModel).filter(
        (AdministradorModel.email_noivo == email) | (AdministradorModel.email_noiva == email),
        AdministradorModel.celular == celular
    ).first()
    
    if not admin:
        return {"status": "erro", "mensagem": "E-mail ou celular não conferem com nossos registros."}
        
    return {"status": "sucesso", "admin_id": admin.id}

@router.post("/redefinir-senha")
def redefinir_senha(dados: dict, db: Session = Depends(obter_conexao)):
    email = dados.get("email")
    nova_senha = dados.get("nova_senha")
    
    if not email or not nova_senha:
        return {"status": "erro", "mensagem": "Dados incompletos."}
        
    admin = db.query(AdministradorModel).filter(
        (AdministradorModel.email_noivo == email) | (AdministradorModel.email_noiva == email)
    ).first()
    
    if not admin:
        return {"status": "erro", "mensagem": "Administrador não encontrado."}
        
    admin.senha = hash_senha(nova_senha)
    db.commit()
            
    return {"status": "sucesso", "mensagem": "Senha redefinida com sucesso!"}

@router.get("/me")
def obter_perfil(admin_logado: dict = Depends(obter_admin_atual), db: Session = Depends(obter_conexao)):
    admin = db.query(AdministradorModel).filter(AdministradorModel.id == admin_logado["id"]).first()
    
    return {
        "status": "sucesso",
        "perfil": {
            "nome_noivos": admin.nome_noivos,
            "email_noivo": admin.email_noivo,
            "email_noiva": admin.email_noiva,
            "celular": admin.celular,
            "data_evento": admin.data_evento
        }
    }

@router.put("/editar")
def editar_admin(dados: EditarAdminSchema, admin_logado: dict = Depends(obter_admin_atual), db: Session = Depends(obter_conexao)):
    admin = db.query(AdministradorModel).filter(AdministradorModel.id == admin_logado["id"]).first()
    
    admin.nome_noivos = dados.nome_noivos
    admin.celular = dados.celular
    admin.data_evento = dados.data_evento
    
    if dados.senha:
        admin.senha = hash_senha(dados.senha)
        
    db.commit()
    return {"status": "sucesso", "mensagem": "Perfil atualizado com sucesso!"}