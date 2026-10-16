const API_URL = 'https://sunshine-events-api.onrender.com';
// const API_URL = 'http://127.0.0.1:8000';

const token = localStorage.getItem('meu_token_rsvp');

if (!token) {
    window.location.href = 'index.html';
}

let listaGlobalConvidados = [];

// Configuração do Evento e Contagem Regressiva
const nomeEventoSalvo = localStorage.getItem('nome_evento');
const dataEventoSalva = localStorage.getItem('data_evento');

if (nomeEventoSalvo && dataEventoSalva) {
    document.getElementById('tituloEvento').innerText = `Casamento: ${nomeEventoSalvo}`;
    
    // Calcula os dias restantes
    const hoje = new Date();
    // Zera as horas para o cálculo ser exato pelos dias
    hoje.setHours(0, 0, 0, 0); 
    
    // Adiciona o timezone 'T00:00:00' para evitar que o fuso horário subtraia 1 dia
    const dataCasamento = new Date(`${dataEventoSalva}T00:00:00`); 
    
    const diferencaTempo = dataCasamento.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

    const pContagem = document.getElementById('contagemRegressiva');
    if (diasRestantes > 0) {
        pContagem.innerText = `⏳ Faltam ${diasRestantes} dias para o grande dia!`;
    } else if (diasRestantes === 0) {
        pContagem.innerText = `🎉 É hoje! Aproveitem muito!`;
        pContagem.style.color = '#2ed573';
    } else {
        pContagem.innerText = `💍 Casados há ${Math.abs(diasRestantes)} dias!`;
        pContagem.style.color = '#718093';
    }
}

// ==================== CARREGAMENTO ====================
async function carregarConvidados() {
    try {
        const resposta = await fetch(`${API_URL}/admin/convidado`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resposta.status === 401) return sair();

        const dados = await resposta.json();
        
        if (dados.status === 'sucesso') {
            listaGlobalConvidados = dados.convidado || dados.convidados || [];
            atualizarCards(listaGlobalConvidados);
            renderizarTabela(listaGlobalConvidados);

            verificarAlertaPendentes(listaGlobalConvidados);                
        } else {
            document.getElementById('tabelaConvidados').innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Erro ao carregar dados.</td></tr>';
        }
    } catch (erro) {
        console.error("Erro na requisição:", erro);
        document.getElementById('tabelaConvidados').innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Erro de conexão com a API.</td></tr>';
    }

    // ==================== ALERTA DE PENDENTES PRÓXIMO AO CASAMENTO ====================
    function verificarAlertaPendentes(convidados) {
        const dataEventoSalva = localStorage.getItem('data_evento');
        if (!dataEventoSalva) return;

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataCasamento = new Date(`${dataEventoSalva}T00:00:00`);
        
        const diferencaTempo = dataCasamento.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diferencaTempo / (1000 * 3600 * 24));

        const pendentes = convidados.filter(c => c.status_presenca.toLowerCase() === 'pendente');
        const containerAlerta = document.getElementById('alertaPendentesDinamico');
        const textoAlerta = document.getElementById('textoAlertaPendentes');

        if (!containerAlerta || !textoAlerta) return;

        // Se faltarem 7 dias ou menos e houver pendentes
        if (diasRestantes <= 7 && diasRestantes > 0 && pendentes.length > 0) {
            textoAlerta.innerHTML = `⚠️ <strong>Atenção:</strong> Faltam apenas ${diasRestantes} dias para o grande dia e você tem <strong>${pendentes.length} convidado(s) pendente(s)</strong>! Use o botão "Lembrete" na tabela para avisá-los no WhatsApp.`;
            containerAlerta.classList.remove('escondido'); // Mostra o alerta
            containerAlerta.style.display = 'flex';
        } else {
            containerAlerta.classList.add('escondido'); // Esconde se não estiver na regra
            containerAlerta.style.display = 'none';
        }
    }
}

function atualizarCards(convidados) {
    let totalPessoasConfirmadas = 0;
    let recusados = 0;
    let pendentes = 0;

    convidados.forEach(c => {
        const status = c.status_presenca.toLowerCase();
        
        if (status === 'confirmado') {
            totalPessoasConfirmadas++; // Titular
            if (c.nome_acompanhante && c.nome_acompanhante.length > 0) {
                c.nome_acompanhante.forEach(a => {
                    if (a.idade >= 7) totalPessoasConfirmadas++;
                });
            }
        } else if (status === 'recusado') {
            recusados++;
        } else {
            pendentes++;
        }
    });

    document.getElementById('cardTotal').innerText = convidados.length;
    document.getElementById('cardConfirmados').innerText = totalPessoasConfirmadas;
    document.getElementById('cardPendentes').innerText = pendentes;
    document.getElementById('cardRecusados').innerText = recusados;
}

function renderizarTabela(convidados) {
    const tbody = document.getElementById('tabelaConvidados');
    tbody.innerHTML = '';

    if (convidados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum convidado cadastrado.</td></tr>';
        return;
    }

    convidados.forEach(c => {
        const tr = document.createElement('tr');
        let classeStatus = 'pendente';
        if (c.status_presenca.toLowerCase() === 'confirmado') classeStatus = 'confirmado';
        if (c.status_presenca.toLowerCase() === 'recusado') classeStatus = 'recusado';

        let descAcomp = `${c.limite_acompanhantes} limite`;
        if (c.nome_acompanhante && c.nome_acompanhante.length > 0) {
            const nomes = c.nome_acompanhante.map(a => `${a.nome} (${a.idade}a)`).join(', ');
            descAcomp = `<b>Confirmados:</b> ${nomes}`;
        }

        // BLOCO DE TAGS
        let tagClass = 'tag-geral';
        if (c.categoria === 'Padrinho/Madrinha') tagClass = 'tag-padrinho';
        else if (c.categoria === 'Pais/Familia') tagClass = 'tag-familia';
        else if (c.categoria === 'VIP') tagClass = 'tag-vip';

        // Gera o link personalizado com o ID do admin logado
        const adminId = localStorage.getItem('admin_id') || 1;
        const origem = window.location.origin;
        const caminhoPasta = window.location.pathname.substring(0, window.location.pathname.indexOf('/admin/'));
        const linkConvite = `${origem}${caminhoPasta}/convidados/convite.html?evento=${adminId}`;

        // Textos formatados para o WhatsApp
        const msgConvite = encodeURIComponent(`Olá ${c.nome_completo}! É uma alegria ter você conosco. Por favor, acesse o link abaixo para confirmar sua presença no nosso evento: ${linkConvite}`);
        const msgLembrete = encodeURIComponent(`Olá ${c.nome_completo}, passando para lembrar de confirmar sua presença no nosso evento pelo link: ${linkConvite}. Contamos com você!`);

        tr.innerHTML = `
            <td><strong>${c.nome_completo}</strong></td>
            <td>${c.celular}</td>
            <td>${descAcomp}</td>
            <td><span class="tag-categoria ${tagClass}">${c.categoria || 'Geral'}</span></td>
            <td><span class="status ${classeStatus}">${c.status_presenca.toUpperCase()}</span></td>
            <td>
                <a href="https://api.whatsapp.com/send?phone=55${c.celular.replace(/\D/g, '')}&text=${msgConvite}" target="_blank" class="btn-acao" style="background-color: #25d366; color: white; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 12px; display: inline-block; margin-right: 4px;">📲 Convite</a>
                <a href="https://api.whatsapp.com/send?phone=55${c.celular.replace(/\D/g, '')}&text=${msgLembrete}" target="_blank" class="btn-acao" style="background-color: #128c7e; color: white; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 12px; display: inline-block; margin-right: 4px;">⏰ Lembrete</a>
                <button class="btn-acao btn-editar" onclick="abrirModal(${c.id}, '${c.nome_completo}', '${c.celular}', ${c.limite_acompanhantes}, '${c.categoria || 'Geral'}')">Editar</button>
                <button class="btn-acao btn-excluir" onclick="excluirConvidado(${c.id}, '${c.nome_completo}')">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function obterConvidadosFiltrados() {
    const termoBusca = document.getElementById('buscaNome').value.toLowerCase();
    const filtroStatus = document.getElementById('filtroStatus').value;

    return listaGlobalConvidados.filter(c => {
        const bateNome = c.nome_completo.toLowerCase().includes(termoBusca);
        const bateStatus = filtroStatus === 'todos' || c.status_presenca.toLowerCase() === filtroStatus;
        return bateNome && bateStatus;
    });
}

function filtrarLista() {
    const filtrados = obterConvidadosFiltrados();
    renderizarTabela(filtrados);
}

// ==================== EXPORTAR EXCEL ====================
function exportarExcel() {
    const dadosParaExportar = obterConvidadosFiltrados();

    if (dadosParaExportar.length === 0) {
        return alert("Não há dados filtrados para exportar.");
    }
    
    // Prepara os dados no formato que o Excel entende (Array de Objetos)
    const linhasExcel = [];
    let contador = 1; // variavel para criar a numeração sequencial
    
    dadosParaExportar.forEach(c => {
        // Adiciona a linha do titular
        linhasExcel.push({
            "Nº": contador++,
            "Tipo": "Titular",
            "Nome": c.nome_completo,
            "Celular": c.celular,
        });
        
        // Adiciona as linhas dos acompanhantes, se houver
        if (c.nome_acompanhante && c.nome_acompanhante.length > 0) {
            c.nome_acompanhante.forEach(a => {
                linhasExcel.push({
                    "Nº": contador++,
                    "Tipo": "Acompanhante",
                    "Nome": a.nome,
                });
            });
        }
    });
    
    // Cria a planilha e a pasta de trabalho usando o SheetJS
    const worksheet = XLSX.utils.json_to_sheet(linhasExcel);
    const workbook = XLSX.utils.book_new();
    
    // Ajusta a largura das colunas para ficar bonito
    worksheet['!cols'] = [
        { wch: 5 },  // Nº
        { wch: 15 }, // Tipo
        { wch: 35 }, // Nome
        { wch: 15 }, // Celular
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Convidados");
    
    // Força o download do arquivo .xlsx
    XLSX.writeFile(workbook, 'lista_convidados_rsvp.xlsx');
}

// ==================== COBRAR WHATSAPP ====================
function cobrarWhatsApp(nome, celular) {
    const numeroLimpo = celular.replace(/\D/g, '');
    const linkPortal = "http://127.0.0.1:5500/frontend/convidados/convite.html"; 
    const mensagem = `Olá, ${nome}! Estamos passando para lembrar de confirmar sua presença no nosso casamento. Por favor, acesse o link e nos avise: ${linkPortal}`;
    const url = `https://wa.me/55${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// ==================== CRUD E MODAL ====================
async function excluirConvidado(id, nome) {
    if(confirm(`Tem certeza que deseja remover ${nome}?`)) {
        const resposta = await fetch(`${API_URL}/admin/convidado/${id}`, {
            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
        if(resposta.ok) carregarConvidados();
    }
}

function abrirModal(id = '', nome = '', celular = '', limite = 0, categoria = 'Geral') {
    document.getElementById('convidadoId').value = id;
    document.getElementById('nome').value = nome;
    document.getElementById('celular').value = celular;
    document.getElementById('limite').value = limite;
    document.getElementById('categoria').value = categoria || 'Geral';
    document.getElementById('modalTitulo').innerText = id ? 'Editar Convidado' : 'Novo Convidado';
    document.getElementById('modalConvidado').classList.add('ativo');
}

function fecharModal() {
    document.getElementById('modalConvidado').classList.remove('ativo');
}

document.getElementById('formConvidado').addEventListener('submit', async function(evento) {
    evento.preventDefault();
    limparErroModal();

    const id = document.getElementById('convidadoId').value;
    const payload = {
        nome_completo: document.getElementById('nome').value,
        celular: document.getElementById('celular').value,
        limite_acompanhantes: parseInt(document.getElementById('limite').value),
        categoria: document.getElementById('categoria').value
    };

    const metodo = id ? 'PUT' : 'POST';
    const rota = id ? `/admin/convidado/${id}` : '/admin/convidados/cadastrar';

    try {
        const resposta = await fetch(`${API_URL}${rota}`, {
            method: metodo,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.status === 'sucesso') {
            fecharModal();
            carregarConvidados();
        } else {
            mostrarErroModal(formatarErro(dados));
        }
    } catch (e) {
        mostrarErroModal('Não foi possível conectar ao servidor.');
    }
});

function formatarErro(dados) {
    // FastAPI (422) devolve "detail" como lista de objetos
    if (Array.isArray(dados.detail)) {
        return dados.detail.map(d => d.msg).join(', ');
    }
    return dados.mensagem || dados.detail || 'Não foi possível cadastrar o convidado.';
}

function mostrarErroModal(mensagem) {
    const el = document.getElementById('modal-erro');
    el.textContent = mensagem;
    el.hidden = false;
}

function limparErroModal() {
    const el = document.getElementById('modal-erro');
    el.textContent = '';
    el.hidden = true;
}

function sair() {
    localStorage.removeItem('meu_token_rsvp');
    window.location.href = '../index.html';
}

carregarConvidados();

// ==================== PERFIL DO ADMIN ====================
async function abrirModalPerfil() {
    try {
        const resposta = await fetch(`${API_URL}/admin/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dados = await resposta.json();
        
        if (resposta.ok && dados.status === 'sucesso') {
            document.getElementById('perfilNomeNoivos').value = dados.perfil.nome_noivos;
            document.getElementById('perfilEmailNoivo').value = dados.perfil.email_noivo;
            document.getElementById('perfilEmailNoiva').value = dados.perfil.email_noiva;
            document.getElementById('perfilCelular').value = dados.perfil.celular;
            document.getElementById('perfilDataEvento').value = dados.perfil.data_evento;
            document.getElementById('perfilSenha').value = ''; 
            document.getElementById('perfilConfirmaSenha').value = '';
            
            document.getElementById('modalPerfil').classList.add('ativo');;
        } else {
            alert("Erro ao carregar os dados do perfil.");
        }
    } catch (erro) {
        alert("Erro de conexão com o servidor.");
    }
}

function fecharModalPerfil() {
    document.getElementById('modalPerfil').classList.remove('ativo');
}

document.getElementById('formPerfil').addEventListener('submit', async function(evento) {
    evento.preventDefault();

    const senhaNova = document.getElementById('perfilSenha').value;
    const senhaConfirma = document.getElementById('perfilConfirmaSenha').value;
    const msgBox = document.getElementById('msgPerfil');

    if (senhaNova && senhaNova !== senhaConfirma) {
        msgBox.style.color = '#ff4757';
        msgBox.innerText = "A nova senha e a confirmação não coincidem.";
        return;
    }
    
    const payload = {
        nome_noivos: document.getElementById('perfilNomeNoivos').value,
        email_noivo: document.getElementById('perfilEmailNoivo').value,
        email_noiva: document.getElementById('perfilEmailNoiva').value,
        celular: document.getElementById('perfilCelular').value,
        data_evento: document.getElementById('perfilDataEvento').value,
        senha: senhaNova || null 
    };

    msgBox.style.color = '#333';
    msgBox.innerText = "Salvando alterações...";

    try {
        const resposta = await fetch(`${API_URL}/admin/editar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.status === 'sucesso') {
            localStorage.setItem('nome_evento', payload.nome_noivos);
            localStorage.setItem('data_evento', payload.data_evento);
            
            msgBox.style.color = '#2ed573';
            msgBox.innerText = "Perfil atualizado com sucesso! Recarregando...";
            
            setTimeout(() => {
                fecharModalPerfil();
                window.location.reload(); 
            }, 1500);
        } else {
            let mensagemErro = "Falha ao salvar.";
            if (dados.detail) {
                if (Array.isArray(dados.detail)) {
                    mensagemErro = dados.detail.map(d => d.msg || JSON.stringify(d)).join(', ');
                } else if (typeof dados.detail === 'object') {
                    mensagemErro = JSON.stringify(dados.detail);
                } else {
                    mensagemErro = dados.detail;
                }
            } else if (dados.mensagem) {
                mensagemErro = dados.mensagem;
            }
            msgBox.style.color = '#ff4757';
            msgBox.innerText = `Erro: ${mensagemErro}`;
        }
    } catch (erro) {
        msgBox.style.color = '#ff4757';
        msgBox.innerText = "Erro de conexão com o servidor.";
    }
});

// Exibe o link do convite na dashboard ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    const adminId = localStorage.getItem('admin_id') || 1;

    // Pega a origem do site e monta o link correto apontando para a pasta convidados
    const origem = window.location.origin; // Ex: http://127.0.0.1:5500
    const caminhoPasta = window.location.pathname.substring(0, window.location.pathname.indexOf('/admin/'));
    const linkFinal = `${origem}${caminhoPasta}/convidados/convite.html?evento=${adminId}`;
    
    const elementoLink = document.getElementById('linkConviteTexto');
    if(elementoLink) {
        elementoLink.innerText = linkFinal;
    }
});

function copiarLinkConvite() {
    const adminId = localStorage.getItem('admin_id') || 1;

// Monta o link blindado apontando para a pasta convidados
    const origem = window.location.origin;
    const caminhoPasta = window.location.pathname.substring(0, window.location.pathname.indexOf('/admin/'));
    const linkFinal = `${origem}${caminhoPasta}/convidados/convite.html?evento=${adminId}`;
    
   // Copia para a área de transferência e avisa o usuário
    navigator.clipboard.writeText(linkFinal).then(() => {
        alert("Link do convite copiado com sucesso!");
    }).catch(err => {
        console.error('Erro ao copiar: ', err);
        alert("Não foi possível copiar o link automaticamente.");
    });
}

function abrirModalExcluirConta() {
    const senha = prompt("⚠️ ATENÇÃO: Isso apagará TODOS os seus dados e convidados permanentemente.\nPara confirmar, digite sua senha atual:");
    if (!senha) return;

    fetch(`${API_URL}/admin/conta/excluir-propria`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ senha: senha })
    })
    .then(res => res.json())
    .then(dados => {
        if (dados.status === 'sucesso') {
            alert("Conta excluída com sucesso.");
            localStorage.clear();
            window.location.href = '../index.html';
        } else {
            alert(dados.mensagem || "Erro ao excluir conta.");
        }
    })
    .catch(() => alert("Erro de conexão com o servidor."));
}


// Função para aplicar máscara de telefone em tempo real e bloquear letras
function aplicarMascaraTelefone(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function (e) {
        let valor = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
        if (valor.length > 11) valor = valor.substring(0, 11); // Trava em 11 dígitos

        // Formata: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
        if (valor.length > 6) {
            valor = `(${valor.substring(0, 2)}) ${valor.substring(2, 7)}-${valor.substring(7)}`;
        } else if (valor.length > 2) {
            valor = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
        } else if (valor.length > 0) {
            valor = `(${valor}`;
        }
        e.target.value = valor;
    });
}

// Aplica automaticamente nos campos de celular existentes nas telas
window.addEventListener('DOMContentLoaded', () => {
    aplicarMascaraTelefone('celular');       // Modal de convidado
    aplicarMascaraTelefone('cadCelular');    // Tela de cadastro
    aplicarMascaraTelefone('perfilCelular'); // Modal de perfil
});