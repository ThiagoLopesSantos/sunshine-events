from fastapi import APIRouter, HTTPException
from ..database import obter_conexao
from ..schemas import ConfirmarRsvpSchema

router = APIRouter(prefix="/rsvp", tags=["Portal do Convidado"])

@router.get("/evento-info/{admin_id}")
def obter_info_evento(admin_id: int):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()

        # Aqui buscamos no banco de dados o nome_evento E a data_evento do administrador
        cursor.execute("SELECT nome_evento, data_evento FROM administradores WHERE id = ?", (admin_id,))
        resultado = cursor.fetchone()
        
    if not resultado:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
        
    return {
        "status": "sucesso",
        "nome_evento": resultado[0],
        "data_evento": resultado[1]
    }

@router.get("/buscar/{admin_id}/{celular}")
def buscar_por_celular(admin_id: int, celular: str):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute("""
                    SELECT id, 
                    nome_completo, 
                    celular, 
                    limite_acompanhantes, 
                    status_presenca FROM convidados WHERE celular = ? AND admin_id = ?
        """, (celular, admin_id))
        convidado = cursor.fetchone()

        if not convidado:
            raise HTTPException(status_code=404, detail="Celular não encontrado na lista deste evento.")

        return {
            "status": "sucesso",
            "convidado": {
                "id": convidado[0],
                "nome_completo": convidado[1],
                "celular": convidado[2],
                "limite_acompanhantes": convidado[3],
                "status_presenca": convidado[4]
            }
        }

@router.post("/confirmar/{convidado_id}")
def confirmar_presenca(convidado_id: int, dados: ConfirmarRsvpSchema):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()

        # Verifica se o convidado existe
        cursor.execute("SELECT id, limite_acompanhantes FROM convidados WHERE id = ?", (convidado_id,))
        convidado = cursor.fetchone()
        if not convidado:
            raise HTTPException(status_code=404, detail="Convidado não encontrado.")

        limite_permitido = convidado[1]

        # Valida se o número de acompanhantes enviado passa do limite
        if len(dados.acompanhantes) > limite_permitido:
            raise HTTPException(status_code=400, detail=f"Você tem direito a no máximo {limite_permitido} acompanhante(s).")

        # Atualiza o status do convidado principal
        cursor.execute("UPDATE convidados SET status_presenca = ? WHERE id = ?", (dados.status_presenca, convidado_id))

        # Remove acompanhantes antigos caso ele esteja atualizando a resposta
        cursor.execute("DELETE FROM acompanhantes WHERE convidado_id = ?", (convidado_id,))

        # Insere os novos acompanhantes e aplica a regra das crianças menores de 7 anos
        # (Podemos salvar todas, mas na hora de contar para o buffet filtramos quem tem >= 7)
        for acomp in dados.acompanhantes:
            cursor.execute("INSERT INTO acompanhantes (convidado_id, nome, idade) VALUES (?, ?, ?)", 
            (convidado_id, acomp.nome, acomp.idade))

        conexao.commit()

        return {
            "status": "sucesso",
            "mensagem": "Presença confirmada com sucesso!"
        }