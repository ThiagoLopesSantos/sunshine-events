const API_URL = 'https://sunshine-events-api.onrender.com';
// const API_URL = 'http://127.0.0.1:8000';

let convidadoAtual = null;

// ==================== CAPTURA DO ID DO EVENTO NA URL ====================
const urlParams = new URLSearchParams(window.location.search);
const adminIdEvento = urlParams.get('evento') || 1; 

// Função para buscar e exibir o nome do evento e verificar o prazo de RSVP
async function carregarInfoEvento() {
    try {
        const resposta = await fetch(`${API_URL}/rsvp/evento-info/${adminIdEvento}`);
        const dados = await resposta.json();
        
        if (resposta.ok && dados.status === 'sucesso') {
            document.getElementById('tituloNomeEvento').innerText = `Casamento de ${dados.nome_evento}`;
            
            if (dados.data_evento) {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0); 
                
                const dataEvento = new Date(`${dados.data_evento}T00:00:00`);
                
                if (hoje > dataEvento) {
                    const formBusca = document.getElementById('formBusca');
                    if (formBusca) {
                        formBusca.innerHTML = `
                            <div style="background-color: #ffeaa7; padding: 15px; border-radius: 8px; color: #d63031; text-align: center; font-weight: bold;">
                                ⏳ O prazo para confirmação de presença neste evento já foi encerrado. Agradecemos o carinho!
                            </div>
                        `;
                    }
                }
            }
        } else {
            document.getElementById('tituloNomeEvento').innerText = `Portal de Convidados`;
        }
    } catch (erro) {
        document.getElementById('tituloNomeEvento').innerText = `Portal de Convidados`;
    }
}

carregarInfoEvento();

// ==================== 1. BUSCAR CONVIDADO POR CELULAR ====================
document.getElementById('formBusca').addEventListener('submit', async function(evento) {
    evento.preventDefault();
    
    let celular = document.getElementById('celularBusca').value.replace(/\D/g, '');
    const msgErro = document.getElementById('msgErroBusca');
    
    if (celular.length < 10) {
        msgErro.innerText = "Por favor, digite um número de celular válido com DDD.";
        return;
    }

    msgErro.style.color = '#333';
    msgErro.innerText = 'Buscando seu convite...';

    try {
        const resposta = await fetch(`${API_URL}/rsvp/buscar/${adminIdEvento}/${celular}`);
        const dados = await resposta.json();

        if (resposta.ok && dados.convidado) {
            convidadoAtual = dados.convidado;
            
            // Apenas para saudação de boas-vindas
            document.getElementById('spanNome').innerText = convidadoAtual.nome_completo;
            document.getElementById('spanLimite').innerText = convidadoAtual.limite_acompanhantes;

            // Renderiza automaticamente os campos de acompanhantes de acordo com o limite
            renderizarCamposAcompanhantes(convidadoAtual.limite_acompanhantes);

            document.getElementById('etapaBusca').classList.add('escondido');
            document.getElementById('etapaConvite').classList.remove('escondido');
        } else {
            msgErro.style.color = '#ff4757';
            msgErro.innerText = dados.detail || "Não encontramos um convite com este número.";
        }
    } catch (erro) {
        msgErro.style.color = '#ff4757';
        msgErro.innerText = "Erro ao conectar com o servidor. Tente novamente mais tarde.";
    }
});

// ==================== 2. GERENCIAR ACOMPANHANTES AUTOMÁTICOS ====================
function renderizarCamposAcompanhantes(limite) {
    const container = document.getElementById('listaAcompanhantesCampos');
    container.innerHTML = '';

    if (limite > 0) {
        document.getElementById('secaoAcompanhantes').classList.remove('escondido');
        
        for (let i = 0; i < limite; i++) {
            const div = document.createElement('div');
            div.className = 'acompanhante-item';
            div.style.cssText = "margin-bottom: 15px; background: #fdfdfd; padding: 10px; border: 1px solid #eee; border-radius: 6px;";
            div.innerHTML = `
                <label style="font-size: 13px; color: #555; display: block; margin-bottom: 5px;">Acompanhante ${i + 1}:</label>
                <div style="display: flex; gap: 10px; margin-bottom: 8px;">
                    <input type="text" placeholder="Nome" class="acomp-nome" required style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <input type="text" placeholder="Sobrenome" class="acomp-sobrenome" required style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" placeholder="Idade" class="acomp-idade" min="0" max="120" required style="width: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" oninput="verificarIdadeCrianca(this)">
                    <span class="aviso-crianca" style="font-size: 12px; color: #e67e22;"></span>
                </div>
            `;
            container.appendChild(div);
        }
    } else {
        document.getElementById('secaoAcompanhantes').classList.add('escondido');
    }
}

function verificarIdadeCrianca(input) {
    const idade = parseInt(input.value);
    const avisoDiv = input.closest('.acompanhante-item').querySelector('.aviso-crianca');
    
    if (!isNaN(idade) && idade < 7) {
        avisoDiv.innerText = "ℹ️ Criança menor de 7 anos (não contabiliza vaga).";
    } else {
        avisoDiv.innerText = "";
    }
}

// ==================== 3. ENVIAR RESPOSTA (O RSVP FINAL) ====================
async function enviarResposta(status) {
    const msgProcessando = document.getElementById('msgProcessando');
    
    // Coleta o nome e sobrenome do titular preenchido pelo convidado
    const nomeTitular = document.getElementById('titularNome').value.trim();
    const sobrenomeTitular = document.getElementById('titularSobrenome').value.trim();

    if (status === 'confirmado' && (!nomeTitular || !sobrenomeTitular)) {
        alert("Por favor, preencha o seu Nome e Sobrenome.");
        return;
    }

    const acompanhantes = [];
    const itens = document.querySelectorAll('.acompanhante-item');
    
    if (status === 'confirmado') {
        for (let item of itens) {
            const nomeAcomp = item.querySelector('.acomp-nome').value.trim();
            const sobrenomeAcomp = item.querySelector('.acomp-sobrenome').value.trim();
            const idade = parseInt(item.querySelector('.acomp-idade').value);

            if (!nomeAcomp || !sobrenomeAcomp || isNaN(idade)) {
                alert("Por favor, preencha o nome, sobrenome e a idade de todos os acompanhantes.");
                return;
            }
            // Junta nome + sobrenome para manter compatibilidade com o formato que o backend espera
            acompanhantes.push({ 
                nome: `${nomeAcomp} ${sobrenomeAcomp}`, 
                idade: idade 
            });
        }
    }

    // Se o titular preencheu nome e sobrenome separados, unimos para enviar como o novo nome oficial na base
    const nomeCompletoOficial = status === 'confirmado' ? `${nomeTitular} ${sobrenomeTitular}` : convidadoAtual.nome_completo;

    const payload = {
        status_presenca: status,
        nome_completo: nomeCompletoOficial, // Atualiza para o nome completo preenchido por ele
        acompanhantes: acompanhantes
    };

    msgProcessando.style.color = '#333';
    msgProcessando.innerText = 'Processando sua resposta...';

    try {
        const resposta = await fetch(`${API_URL}/rsvp/confirmar/${convidadoAtual.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const dados = await resposta.json();

        if (resposta.ok) {
            msgProcessando.innerText = '';
            exibirTelaConclusao(status);
        } else {
            msgProcessando.style.color = '#ff4757';
            msgProcessando.innerText = dados.detail || "Ocorreu um erro ao salvar sua resposta.";
        }
    } catch (erro) {
        msgProcessando.style.color = '#ff4757';
        msgProcessando.innerText = "Erro de conexão. Verifique sua internet.";
    }
}

function exibirTelaConclusao(status) {
    document.getElementById('etapaConvite').classList.add('escondido');
    document.getElementById('etapaConclusao').classList.remove('escondido');

    const icone = document.getElementById('iconeConclusao');
    const titulo = document.getElementById('tituloConclusao');
    const texto = document.getElementById('textoConclusao');

    if (status === 'confirmado') {
        icone.innerText = '✔️';
        icone.className = 'icone-sucesso';
        titulo.innerText = 'Presença Confirmada!';
        texto.innerText = 'Seus dados foram salvos com sucesso. Agradecemos a confirmação e mal podemos esperar para celebrar com você!';
    } else {
        icone.innerText = '✖️';
        icone.className = 'icone-recusa';
        titulo.innerText = 'Resposta Registrada';
        texto.innerText = 'Sentiremos muito a sua falta, mas agradecemos por nos avisar. Obrigado!';
    }

    setTimeout(() => {
        window.location.reload(); 
    }, 6000);
}

// Função para aplicar máscara de telefone em tempo real e bloquear letras
function aplicarMascaraTelefone(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function (e) {
        let valor = e.target.value.replace(/\D/g, ''); 
        if (valor.length > 11) valor = valor.substring(0, 11); 

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

window.addEventListener('DOMContentLoaded', () => {
    aplicarMascaraTelefone('celular');       
    aplicarMascaraTelefone('cadCelular');    
    aplicarMascaraTelefone('perfilCelular'); 
});