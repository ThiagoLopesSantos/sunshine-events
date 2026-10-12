const API_URL = 'https://sunshine-events-api.onrender.com/';
let convidadoAtual = null;

// ==================== CAPTURA DO ID DO EVENTO NA URL ====================
// Exemplo de link que o convidado vai abrir: convite.html?evento=1
const urlParams = new URLSearchParams(window.location.search);
const adminIdEvento = urlParams.get('evento') || 1; // Padrão 1 caso venha sem parâmetro

// Função para buscar e exibir o nome do evento e verificar o prazo de RSVP
async function carregarInfoEvento() {
    try {
        const resposta = await fetch(`${API_URL}/rsvp/evento-info/${adminIdEvento}`);
        const dados = await resposta.json();
        
        if (resposta.ok && dados.status === 'sucesso') {
            document.getElementById('tituloNomeEvento').innerText = `Casamento de ${dados.nome_evento}`;
            
            // --- NOVA REGRA: VALIDAÇÃO DE PRAZO DO EVENTO ---
            if (dados.data_evento) {
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0); // Zera as horas para comparar apenas os dias
                
                const dataEvento = new Date(`${dados.data_evento}T00:00:00`);
                
                // Se a data de hoje for maior que a data do evento, o prazo acabou!
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

// Executa assim que a página abre
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
            
            document.getElementById('spanNome').innerText = convidadoAtual.nome_completo;
            document.getElementById('spanLimite').innerText = convidadoAtual.limite_acompanhantes;

            if (convidadoAtual.limite_acompanhantes > 0) {
                document.getElementById('secaoAcompanhantes').classList.remove('escondido');
            }

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

// ==================== 2. GERENCIAR ACOMPANHANTES ====================
function adicionarCampoAcompanhante() {
    const container = document.getElementById('listaAcompanhantesCampos');
    const totalAtual = container.children.length;

    if (totalAtual >= convidadoAtual.limite_acompanhantes) {
        alert(`O seu limite é de ${convidadoAtual.limite_acompanhantes} acompanhante(s).`);
        return;
    }

    const div = document.createElement('div');
    div.className = 'acompanhante-item';
    div.innerHTML = `
        <div class="acompanhante-inputs">
            <input type="text" placeholder="Nome completo" class="acomp-nome" required style="flex: 2;">
            <input type="number" placeholder="Idade" class="acomp-idade" min="0" max="120" required style="flex: 1;" oninput="verificarIdadeCrianca(this)">
        </div>
        <div class="aviso-crianca"></div>
        <button type="button" class="btn-remover" onclick="removerCampo(this)">Remover</button>
    `;
    container.appendChild(div);
}

function removerCampo(botao) {
    botao.parentElement.remove();
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
    const acompanhantes = [];
    const itens = document.querySelectorAll('.acompanhante-item');
    
    if (status === 'confirmado') {
        for (let item of itens) {
            const nome = item.querySelector('.acomp-nome').value.trim();
            const idade = parseInt(item.querySelector('.acomp-idade').value);

            if (!nome || isNaN(idade)) {
                alert("Por favor, preencha o nome e a idade de todos os acompanhantes que você adicionou.");
                return;
            }
            acompanhantes.push({ nome: nome, idade: idade });
        }
    }

    const payload = {
        status_presenca: status,
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

    // Dá tempo suficiente para a pessoa ler (ex: 6 segundos) e recarrega a página para o próximo
    setTimeout(() => {
        window.location.reload(); 
    }, 6000); // 6000 milissegundos = 6 segundos
}