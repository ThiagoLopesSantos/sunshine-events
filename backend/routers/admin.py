import re
import sqlite3
import json
from fastapi import APIRouter, Depends, HTTPException, status
from ..database import obter_conexao
from ..schemas import AdminSchema, LoginSchema, ConvidadosSchema, EditarConvidadoSchema, EditarAdminSchema
from ..auth import hash_senha, verificar_senha, criar_token_acesso, obter_admin_atual

router = APIRouter(prefix="/admin", tags=["Administrador"])

# ==================== FUNÇÃO AUXILIAR ====================
# Limpa o telefone para manter apenas os números (remove parênteses, traços e espaços)
def limpar_celular(celular: str) -> str:
    return re.sub(r'\D', '', celular)

@router.post("/cadastrar")
def cadastrar_admin(admin: AdminSchema):
    try:
        with obter_conexao() as conexao:
            cursor = conexao.cursor()

            # Verifica se o email já existe para dar um feedback limpo
            cursor.execute("SELECT id FROM administradores WHERE email = ?", (admin.email,))
            if cursor.fetchone():
                return {"status": "erro", "mensagem": "Este email já está cadastrado no sistema."}
            
            senha_criptografada = hash_senha(admin.senha)
            cursor.execute("""
                INSERT INTO administradores (nome, email, celular, senha, nome_evento, data_evento)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (admin.nome, admin.email, admin.celular, senha_criptografada, admin.nome_evento, admin.data_evento))
            conexao.commit()

        return {
            "status": "sucesso",
            "mensagem": f"Administrador {admin.nome} cadastrado com sucesso",
        }
    except sqlite3.Error as e:
        return {
            "status": "erro",
            "mensagem": f"Não foi possível cadastrar. Erro no banco de dados: {str(e)}"
        }

@router.post("/login")
def login_admin(credenciais: LoginSchema):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()

        cursor.execute(""" 
            SELECT id, nome, email, senha, nome_evento, data_evento FROM administradores
            WHERE email = ?
        """, (credenciais.email,))

        admin_encontrado = cursor.fetchone()

        if admin_encontrado is None:
            return {
                "status": "erro",
                "mensagem": "E-mail não encontrado!"
            }
        
        senha_valida = verificar_senha(credenciais.senha, admin_encontrado[3])

        if not senha_valida:
            return {
                "status": "erro",
                "mensagem": "Senha incorreta!"
            }

        token_acesso = criar_token_acesso(dados={"sub": admin_encontrado[2]})

        return {
            "status": "sucesso",
            "mensagem": f"Login realizado com sucesso! Bem-vindo de volta, {admin_encontrado[1]}.",
            "access_token": token_acesso,
            "token_type": "bearer",
            "admin_id": admin_encontrado[0],
            "nome_evento": admin_encontrado[4],
            "data_evento": admin_encontrado[5]
        }

@router.post("/convidados/cadastrar")
def cadastrar_convidado(convidado: ConvidadosSchema, admin_logado: dict = Depends(obter_admin_atual)):
    try:
        # Remove qualquer caractere que não seja número do celular digitado
        celular_limpo = limpar_celular(convidado.celular)

        if len(celular_limpo) != 11 and len(celular_limpo) != 10:
            return {"status": "erro", "mensagem": "O número de celular deve conter DDD e número."}
        
        with obter_conexao() as conexao:
            cursor = conexao.cursor()
            
            # Verifica se o celular já existe para ESTE administrador específico
            cursor.execute("SELECT id FROM convidados WHERE celular = ? AND admin_id = ?", (convidado.celular, admin_logado["id"]))
            if cursor.fetchone():
                return {"status": "erro", "mensagem": "Este número de celular já está cadastrado na sua lista."}
            
            # Vincula o convidado ao ID do administrador logado
            cursor.execute(""" 
                INSERT INTO convidados (admin_id, nome_completo, celular, status_presenca, limite_acompanhantes)
                VALUES (?, ?, ?, ?, ?)
            """, (
                admin_logado["id"],
                convidado.nome_completo,
                convidado.celular,
                convidado.status_presenca,
                convidado.limite_acompanhantes
            ))
            
            convidado_id = cursor.lastrowid

            # Salva acompanhantes se houver
            if convidado.nome_acompanhante:
                for acomp in convidado.nome_acompanhante:
                    nome_acomp = acomp.get("nome") if isinstance(acomp, dict) else acomp
                    idade_acomp = acomp.get("idade", 0) if isinstance(acomp, dict) else 0
                    
                    cursor.execute("""
                        INSERT INTO acompanhantes (convidado_id, nome, idade)
                        VALUES (?, ?, ?)
                    """, (convidado_id, nome_acomp, idade_acomp))

            conexao.commit()

            return {
                "status": "sucesso",
                "mensagem": f"Convidado {convidado.nome_completo} cadastrado com sucesso!"
            }
    except sqlite3.Error as e:
        return {
            "status": "erro",
            "mensagem": f"Erro: {str(e)}"
        }

@router.get("/convidado")
def listar_convidados(admin_logado: dict = Depends(obter_admin_atual)):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        
        # Filtra estritamente pelos convidados do admin logado
        cursor.execute("""
            SELECT id, nome_completo, celular, status_presenca, limite_acompanhantes 
            FROM convidados WHERE admin_id = ?
        """, (admin_logado["id"],))
        convidados_brutos = cursor.fetchall()

        lista_formatada = []
        for c in convidados_brutos:
            convidado_id = c[0]
            
            cursor.execute("SELECT nome, idade FROM acompanhantes WHERE convidado_id = ?", (convidado_id,))
            acompanhantes_db = cursor.fetchall()
            
            acompanhantes_lista = [{"nome": a[0], "idade": a[1]} for a in acompanhantes_db]

            lista_formatada.append({
                "id": convidado_id, 
                "nome_completo": c[1], 
                "celular": c[2],
                "status_presenca": c[3], 
                "limite_acompanhantes": c[4],
                "nome_acompanhante": acompanhantes_lista          
            })

        return {
            "status": "sucesso",
            "total_convidados": len(lista_formatada),
            "convidados": lista_formatada
        }

@router.put("/convidado/{convidado_id}")
def editar_convidado(convidado_id: int, dados: EditarConvidadoSchema, admin_logado: dict = Depends(obter_admin_atual)):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()

        cursor.execute("SELECT id FROM convidados WHERE id = ? AND admin_id = ?", (convidado_id, admin_logado["id"]))
        if cursor.fetchone() is None:
            return {"status": "erro", "mensagem": "Convidado não encontrado ou sem permissão!"}

        cursor.execute("""
            UPDATE convidados
            SET nome_completo = ?, celular = ?, limite_acompanhantes = ?
            WHERE id = ?
        """, (dados.nome_completo, dados.celular, dados.limite_acompanhantes, convidado_id))

        conexao.commit()
        return {"status": "sucesso", "mensagem": "Atualizado com sucesso!"}

@router.delete("/convidado/{convidado_id}")
def deletar_convidado(convidado_id: int, admin_logado: dict = Depends(obter_admin_atual)):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()

        cursor.execute("SELECT nome_completo FROM convidados WHERE id = ? AND admin_id = ?", (convidado_id, admin_logado["id"]))
        convidado = cursor.fetchone()

        if convidado is None:
            return {"status": "erro", "mensagem": "Convidado não encontrado ou sem permissão!"}

        cursor.execute("DELETE FROM convidados WHERE id = ?", (convidado_id,))
        conexao.commit()
        return {"status": "sucesso", "mensagem": "Removido com sucesso!"}


@router.post("/verificar-recuperacao")
def verificar_recuperacao(dados: dict):
    email = dados.get("email")
    celular = dados.get("celular")
    
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute("SELECT id FROM administradores WHERE email = ? AND celular = ?", (email, celular))
        admin = cursor.fetchone()
        
        if not admin:
            return {"status": "erro", "mensagem": "E-mail ou celular não conferem com nossos registros."}
            
        return {"status": "sucesso", "admin_id": admin[0]}

@router.post("/redefinir-senha")
def redefinir_senha(dados: dict):
    email = dados.get("email")
    nova_senha = dados.get("nova_senha")
    
    if not email or not nova_senha:
        return {"status": "erro", "mensagem": "Dados incompletos."}
        
    senha_criptografada = hash_senha(nova_senha)
    
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute("""
            UPDATE administradores 
            SET senha = ? 
            WHERE email = ?
        """, (senha_criptografada, email))
        conexao.commit()
        
        if cursor.rowcount == 0:
            return {"status": "erro", "mensagem": "Administrador não encontrado."}
            
    return {"status": "sucesso", "mensagem": "Senha redefinida com sucesso!"}

@router.get("/me")
def obter_perfil(admin_logado: dict = Depends(obter_admin_atual)):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        cursor.execute("""
            SELECT nome, email, celular, nome_evento, data_evento 
            FROM administradores WHERE id = ?
        """, (admin_logado["id"],))
        admin = cursor.fetchone()
        
    return {
        "status": "sucesso",
        "perfil": {
            "nome": admin[0],
            "email": admin[1],
            "celular": admin[2],
            "nome_evento": admin[3],
            "data_evento": admin[4]
        }
    }

@router.put("/editar")
def editar_admin(dados: EditarAdminSchema, admin_logado: dict = Depends(obter_admin_atual)):
    with obter_conexao() as conexao:
        cursor = conexao.cursor()
        
        # Se o usuário preencheu uma senha nova, atualiza com hash. Se não, ignora a senha.
        if dados.senha:
            senha_criptografada = hash_senha(dados.senha)
            cursor.execute("""
                UPDATE administradores 
                SET nome = ?, celular = ?, nome_evento = ?, data_evento = ?, senha = ?
                WHERE id = ?
            """, (dados.nome, dados.celular, dados.nome_evento, dados.data_evento, senha_criptografada, admin_logado["id"]))
        else:
            cursor.execute("""
                UPDATE administradores 
                SET nome = ?, celular = ?, nome_evento = ?, data_evento = ?
                WHERE id = ?
            """, (dados.nome, dados.celular, dados.nome_evento, dados.data_evento, admin_logado["id"]))
        
        conexao.commit()
        
    return {"status": "sucesso", "mensagem": "Perfil atualizado com sucesso!"}