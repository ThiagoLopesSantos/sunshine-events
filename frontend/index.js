const API_URL = 'http://127.0.0.1:8000';

// Alterna entre os formulários escondendo todos e mostrando só o desejado
function alternarTelas(idTelaDesejada) {
    // 1. Esconde todas as telas garantido
    document.getElementById('telaLogin').classList.add('escondido');
    document.getElementById('telaCadastro').classList.add('escondido');
    document.getElementById('telaRecuperacao').classList.add('escondido');

    // 2. Mostra apenas a tela que foi chamada no clique
    if (idTelaDesejada) {
        document.getElementById(idTelaDesejada).classList.remove('escondido');
    }

    // 3. Limpa todas as mensagens de erro/sucesso para não confundir o usuário
    document.getElementById('msgLogin').innerText = '';
    document.getElementById('msgCadastro').innerText = '';
    document.getElementById('msgRecuperacao').innerText = '';

    // 4. Limpa todos os formulários ao trocar de tela
    document.getElementById('formLogin').reset();
    document.getElementById('formCadastro').reset();
    document.getElementById('formVerificaRecrutamento').reset();
    document.getElementById('formNovaSenha').reset();
    
    // Esconde a etapa de nova senha e volta para a verificação caso ele saia e volte
    document.getElementById('formNovaSenha').classList.add('escondido');
    document.getElementById('formVerificaRecrutamento').classList.remove('escondido');
}

// ---------- LÓGICA DE LOGIN ----------
document.getElementById('formLogin').addEventListener('submit', async function(evento) {
    evento.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    const msgBox = document.getElementById('msgLogin');
    
    msgBox.innerText = 'Autenticando...';

    try {
        const resposta = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: senha })
        });

        const dados = await resposta.json();

        if (resposta.ok && dados.access_token) {
            localStorage.setItem('meu_token_rsvp', dados.access_token);
            localStorage.setItem('admin_id', dados.admin_id),
            localStorage.setItem('nome_evento', dados.nome_evento);
            localStorage.setItem('data_evento', dados.data_evento);
            window.location.href = 'admin/dashboard.html';
        } else {
            msgBox.innerText = dados.detail || dados.mensagem || "E-mail ou senha incorretos.";
        }
    } catch (erro) {
        msgBox.innerText = "Erro ao conectar com o servidor. Verifique se a API está rodando.";
    }
});

// ---------- LÓGICA DE CADASTRO ----------
document.getElementById('formCadastro').addEventListener('submit', async function(evento) {
    evento.preventDefault();
    
    const nome = document.getElementById('cadNome').value;
    const email = document.getElementById('cadEmail').value;
    const celular = document.getElementById('cadCelular').value;
    const nomeEvento = document.getElementById('cadNomeEvento').value;
    const dataEvento = document.getElementById('cadDataEvento').value;
    const senha = document.getElementById('cadSenha').value;
    const confirmaSenha = document.getElementById('cadConfirmaSenha').value;
    const msgBox = document.getElementById('msgCadastro');


    // Validação de Segurança da Senha
    if (senha.length < 6) {
        msgBox.ClassName = 'mensagem erro';
        msgBox.innerText = "A senha precisa ter pelo menos 6 caracteres.";
    }

    if (senha !== confirmaSenha) {
        msgBox.className = 'mensagem erro';
        msgBox.innerText = "As senhas não coincidem. Verifique e tente novamente.";
    }
    
    msgBox.className = 'mensagem';
    msgBox.style.color = '#333';
    msgBox.innerText = 'Criando conta...';

    try {
        const resposta = await fetch(`${API_URL}/admin/cadastrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nome: nome, 
                email: email, 
                celular: celular, 
                nome_evento: nomeEvento, 
                data_evento: dataEvento, 
                senha: senha 
            })
        });

        const dados = await resposta.json();

        // O SEGREDO É ESSA LINHA ABAIXO. Precisamos exigir que o status seja 'sucesso'
        if (resposta.ok && dados.status === 'sucesso') {
            msgBox.className = 'mensagem sucesso';
            msgBox.innerText = "Cadastro realizado com sucesso! Redirecionando para o login...";
            
            setTimeout(() => {
                alternarTelas('telaLogin');
                document.getElementById('loginEmail').value = email; 
            }, 2000);
        } else {
            // Agora sim, se o banco falhar, o erro vai aparecer em vermelho!
            msgBox.className = 'mensagem erro';
            msgBox.innerText = dados.mensagem || dados.detail || "Erro ao cadastrar.";
        }
    } catch (erro) {
        msgBox.className = 'mensagem erro';
        msgBox.innerText = "Erro ao conectar com o servidor.";
    }
});

// ---------- RECUPERAÇÃO - ETAPA 1: VERIFICAR ----------
document.getElementById('formVerificaRecrutamento').addEventListener('submit', async function(evento) {
    evento.preventDefault();
    const email = document.getElementById('recEmail').value;
    const celular = document.getElementById('recCelular').value;
    const msgBox = document.getElementById('msgRecuperacao');
    
    msgBox.className = 'mensagem';
    msgBox.style.color = '#333';
    msgBox.innerText = 'Verificando dados...';

    try {
        const resposta = await fetch(`${API_URL}/admin/verificar-recuperacao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, celular: celular })
        });
        const dados = await resposta.json();

        if (resposta.ok && dados.status === 'sucesso') {
            emailValidadoParaTroca = email;
            msgBox.className = 'mensagem sucesso';
            msgBox.innerText = "Identidade confirmada! Digite sua nova senha abaixo.";
            document.getElementById('formVerificaRecrutamento').classList.add('escondido');
            document.getElementById('formNovaSenha').classList.remove('escondido');
        } else {
            msgBox.className = 'mensagem erro';
            msgBox.innerText = dados.mensagem || "Dados não encontrados.";
        }
    } catch (erro) {
        msgBox.className = 'mensagem erro';
        msgBox.innerText = "Erro ao conectar com o servidor.";
    }
});

// ---------- RECUPERAÇÃO - ETAPA 2: SALVAR NOVA SENHA ----------
document.getElementById('formNovaSenha').addEventListener('submit', async function(evento) {
    evento.preventDefault();
    const novaSenha = document.getElementById('recNovaSenha').value;
    const confirmaNovaSenha = document.getElementById('recConfirmaNovaSenha').value;
    const msgBox = document.getElementById('msgRecuperacao');

    // Validação de Segurança da Senha
    if (novaSenha.length < 6) {
        msgBox.className = 'mensagem erro';
        msgBox.innerText = "A nova senha precisa ter pelo menos 6 caracteres.";
        return;
    }

    if (novaSenha !== confirmaNovaSenha) {
        msgBox.className = 'mensagem erro';
        msgBox.innerText = "As senhas não coincidem.";
        return;
    }
    
    msgBox.className = 'mensagem';
    msgBox.style.color = '#333';
    msgBox.innerText = 'Salvando nova senha...';

    try {
        const resposta = await fetch(`${API_URL}/admin/redefinir-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: emailValidadoParaTroca, 
                nova_senha: novaSenha 
            })
        });
        const dados = await resposta.json();

        if (resposta.ok && dados.status === 'sucesso') {
            msgBox.className = 'mensagem sucesso';
            msgBox.innerHTML = `Senha alterada com sucesso!<br><a onclick="alternarTelas('telaLogin'); document.getElementById('loginEmail').value='${emailValidadoParaTroca}';" style="color: #1e90ff; cursor: pointer; text-decoration: underline;">Ir para o Login</a>`;
            document.getElementById('formNovaSenha').classList.add('escondido');
        } else {
            msgBox.className = 'mensagem erro';
            msgBox.innerText = dados.mensagem || "Erro ao redefinir.";
        }
    } catch (erro) {
        msgBox.className = 'mensagem erro';
        msgBox.innerText = "Erro ao conectar com o servidor.";
    }
});
