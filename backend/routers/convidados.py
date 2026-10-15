from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from ..database import obter_conexao, AdministradorModel, ConvidadoModel, AcompanhanteModel
from ..schemas import ConfirmarRsvpSchema

router = APIRouter(prefix="/rsvp", tags=["Portal do Convidado"])

@router.get("/evento-info/{admin_id}")
def obter_info_evento(admin_id: int, db: Session = Depends(obter_conexao)):
    admin = db.query(AdministradorModel).filter(AdministradorModel.id == admin_id).first()
    
    if not admin:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
        
    return {
        "status": "sucesso",
        "nome_evento": admin.nome_noivos,
        "data_evento": admin.data_evento
    }

@router.get("/buscar/{admin_id}/{celular}")
def buscar_por_celular(admin_id: int, celular: str, db: Session = Depends(obter_conexao)):
    convidado = db.query(ConvidadoModel).filter(
        ConvidadoModel.celular == celular,
        ConvidadoModel.admin_id == admin_id
    ).first()

    if not convidado:
        raise HTTPException(status_code=404, detail="Celular não encontrado na lista deste evento.")

    return {
        "status": "sucesso",
        "convidado": {
            "id": convidado.id,
            "nome_completo": convidado.nome_completo,
            "celular": convidado.celular,
            "limite_acompanhantes": convidado.limite_acompanhantes,
            "status_presenca": convidado.status_presenca
        }
    }

@router.post("/confirmar/{convidado_id}")
def confirmar_presenca(convidado_id: int, dados: ConfirmarRsvpSchema, db: Session = Depends(obter_conexao)):
    convidado = db.query(ConvidadoModel).filter(ConvidadoModel.id == convidado_id).first()
    if not convidado:
        raise HTTPException(status_code=404, detail="Convidado não encontrado.")

    if len(dados.acompanhantes) > convidado.limite_acompanhantes:
        raise HTTPException(status_code=400, detail=f"Você tem direito a no máximo {convidado.limite_acompanhantes} acompanhante(s).")

    convidado.status_presenca = dados.status_presenca
    
    # Remove acompanhantes antigos
    db.query(AcompanhanteModel).filter(AcompanhanteModel.convidado_id == convidado_id).delete()

    # Insere os novos acompanhantes
    for acomp in dados.acompanhantes:
        novo_acomp = AcompanhanteModel(
            convidado_id=convidado_id,
            nome=acomp.nome,
            idade=acomp.idade
        )
        db.add(novo_acomp)

    db.commit()

    return {
        "status": "sucesso",
        "mensagem": "Presença confirmada com sucesso!"
    }