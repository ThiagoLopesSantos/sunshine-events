// const API_URL = 'http://127.0.0.1:8000';
const API_URL = 'https://sunshine-events-api.onrender.com';
const token = localStorage.getItem('meu_token_rsvp');

if (!token) {
    window.location.href = '../index.html';
}

// Exibe o nome do Super Admin logado
const nomeLogado = localStorage.getItem('nome_super') || "Thiago";
const elementoBoasVindas = document.getElementById('nomeSuperAdmin');
if (elementoBoasVindas) {
    elementoBoasVindas.innerText = `Olá, ${nomeLogado}!`;
}

async function gerarToken(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    try {
        const resposta = await fetch(`${API_URL}/master/gerar-token`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dados = await resposta.json();

        if (resposta.ok && dados.status === 'sucesso') {
            const caixaToken = document.getElementById('resultadoToken');
            caixaToken.innerText = dados.token_gerado;
            caixaToken.style.color = '#2c3e50';
            caixaToken.style.fontStyle = 'normal';
            caixaToken.style.fontWeight = 'bold';
        } else {
            alert(dados.detail || dados.mensagem || "Erro ao gerar token.");
        }
    } catch (erro) {
        alert("Erro de conexão com o servidor.");
    }
}

async function carregarAdmins() {
    try {
        const resposta = await fetch(`${API_URL}/master/listar-admins`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dados = await resposta.json();

        const tbody = document.getElementById('tabelaAdmins');
        tbody.innerHTML = '';

        if (resposta.ok && dados.status === 'sucesso') {
            if (dados.administradores.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum administrador encontrado.</td></tr>';
                return;
            }

            dados.administradores.forEach(a => {
                const tr = document.createElement('tr');
                
                if (a.expirado) {
                    tr.style.backgroundColor = '#fdf2f2';
                }

                let statusBadge = `<span class="badge-ativo">Ativo</span>`;
                if (a.expirado) {
                    statusBadge = `<span class="badge-expirado">Expirado (Pronto para limpeza)</span>`;
                }

                tr.innerHTML = `
                    <td><strong>${a.nome}</strong><br><small style="color:#666;">${a.evento || 'Sem evento'}</small></td>
                    <td>${a.email}<br><small>${a.celular}</small></td>
                    <td>${a.data || 'Não informada'}</td>
                    <td>${statusBadge}</td>
                    <td><button class="btn-excluir" onclick="excluirAdmin(${a.id}, '${a.nome}')">Excluir & Limpar</button></td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">${dados.detail || 'Acesso negado ou erro ao carregar.'}</td></tr>`;
        }
    } catch (erro) {
        document.getElementById('tabelaAdmins').innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Erro de conexão com o servidor.</td></tr>';
    }
}

async function excluirAdmin(id, nome) {
    if (confirm(`ATENÇÃO: Deseja realmente excluir o administrador "${nome}" e TODOS OS SEUS CONVIDADOS em cascata?`)) {
        try {
            const resposta = await fetch(`${API_URL}/master/admin/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dados = await resposta.json();

            if (resposta.ok && dados.status === 'sucesso') {
                alert(dados.mensagem);
                carregarAdmins();
            } else {
                alert(dados.detail || dados.mensagem || "Erro ao excluir.");
            }
        } catch (erro) {
            alert("Erro de conexão ao tentar excluir.");
        }
    }
}

function sair() {
    localStorage.removeItem('meu_token_rsvp');
    window.location.href = '../index.html';
}

carregarAdmins();