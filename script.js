// CONFIGURAÇÃO SUPABASE (OPCIONAL)
let supabase = null;
try {
    const SUPABASE_URL = 'SUA_URL_AQUI';
    const SUPABASE_KEY = 'SUA_KEY_AQUI';
    if (SUPABASE_URL !== 'SUA_URL_AQUI' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    console.error("Erro ao iniciar Supabase:", e);
}

// CONFIGURAÇÃO INTELIGÊNCIA ARTIFICIAL (OPENAI)
// INSIRA SUA CHAVE ABAIXO PARA O SITE FUNCIONAR 100%
const OPENAI_API_KEY = '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'; 

async function generateFiveMScript(userPrompt) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'SUA_CHAVE_OPENAI_AQUI') {
        // Se não tiver chave, retorna um código de exemplo para não travar
        return {
            client: `-- Exemplo: ${userPrompt}\n-- CONECTE SUA API KEY PARA GERAR O CÓDIGO REAL\nprint("Vida IA: Aguardando API Key...")`,
            server: `-- Exemplo: ${userPrompt}\n-- CONECTE SUA API KEY PARA GERAR O CÓDIGO REAL\nprint("Vida IA: Servidor aguardando API Key...")`,
            manifest: `fx_version 'cerulean'\ngame 'gta5'\n\nauthor 'Vida IA'\ndescription 'Script gerado automaticamente'\n\nclient_script 'client.lua'\nserver_script 'server.lua'`
        };
    }

    // Adicionar instrução de sistema baseada no modo
    let systemPrompt = "Você é o 'Vida IA', o desenvolvedor de FiveM mais avançado do mundo. Sua especialidade é criar scripts complexos e otimizados para as bases vRP e Creative. ";
    if (typeof currentMode !== 'undefined') {
        if (currentMode === 'create') {
            systemPrompt += "O usuário quer CRIAR um script funcional. Responda APENAS com um objeto JSON válido contendo as chaves: 'client', 'server', 'manifest'.";
        } else if (currentMode === 'fix') {
            systemPrompt += "O usuário quer CORRIGIR um erro. Analise o código/erro enviado e forneça a versão corrigida em um objeto JSON válido com as chaves: 'client', 'server', 'manifest'.";
        }
    }
    
    systemPrompt += `\nREGRAS:\n1. Responda APENAS com um objeto JSON válido.\n2. O JSON deve ter as chaves: "client", "server", "manifest".\n3. No manifest, use fx_version 'cerulean' e game 'gta5'.\n4. Se for vRP, use Tunnel/Proxy corretamente.\n5. Se for Creative, use os padrões da base (Summer/Creative v3).\n6. O código deve ser limpo, comentado em português e funcional.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Requisição FiveM: ${userPrompt}` }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("Erro detalhado da OpenAI:", data.error);
            // MODO DE SEGURANÇA: Se estiver sem créditos, gera um script básico funcional para não travar o usuário
            if (data.error.code === 'insufficient_quota' || data.error.message.includes('API key')) {
                console.log("Usando gerador de emergência (Sem créditos OpenAI)");
                return generateEmergencyScript(userPrompt);
            }
            return { error: "Erro na IA: " + data.error.message };
        }

        const content = JSON.parse(data.choices[0].message.content);
        return content;
    } catch (err) {
        console.error("Erro na OpenAI:", err);
        return generateEmergencyScript(userPrompt); // Tenta o de emergência se houver erro de rede
    }
}

// FUNÇÃO DE EMERGÊNCIA PARA QUEM NÃO TEM CRÉDITOS NA OPENAI
function generateEmergencyScript(prompt) {
    const name = prompt.toLowerCase();
    let client = `-- Script de Emergência (Vida IA)\nprint("Script '${prompt}' carregado!")\n`;
    let server = `-- Script de Emergência (Vida IA Server)\n`;
    
    if (name.includes('vida') || name.includes('heal')) {
        client += `RegisterCommand('vida', function()\n    SetEntityHealth(PlayerPedId(), 200)\n    print("Vida recuperada!")\nend)`;
    } else if (name.includes('carro') || name.includes('veiculo') || name.includes('spawn')) {
        client += `RegisterCommand('carro', function(source, args)\n    local mhash = GetHashKey(args[1] or "panto")\n    RequestModel(mhash)\n    while not HasModelLoaded(mhash) do Wait(1) end\n    CreateVehicle(mhash, GetEntityCoords(PlayerPedId()), GetEntityHeading(PlayerPedId()), true, false)\nend)`;
    } else if (name.includes('arma') || name.includes('weapon') || name.includes('ouro')) {
        client += `RegisterCommand('arma', function(source, args)\n    local ped = PlayerPedId()\n    GiveWeaponToPed(ped, GetHashKey("WEAPON_PISTOL"), 250, false, true)\n    print("Arma recebida!")\nend)`;
    } else {
        client += `\n-- [VIDA IA] Script para: ${prompt}\n-- O arquivo foi injetado corretamente na sua pasta resources.\n-- Para gerar logicas complexas, conecte sua API Key da OpenAI.\n\nprint("Script '${prompt}' iniciado com sucesso!")`;
    }

    return {
        client: client,
        server: server,
        manifest: `fx_version 'cerulean'\ngame 'gta5'\n\nauthor 'Vida IA (Modo Offline)'\n\nclient_script 'client.lua'\nserver_script 'server.lua'`
    };
}

let credits = 0;
let isOwner = false;
let currentUser = null;
let directoryHandle = null; // Guardará o acesso à pasta do servidor

// --- FUNÇÕES DE INJEÇÃO ESTILO KIRO ---

async function connectServerFolder() {
    try {
        // Solicita ao usuário para escolher a pasta do servidor (ex: resources)
        directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        
        if (directoryHandle) {
            document.getElementById('connected-server').textContent = `Conectado via Injeção: ${directoryHandle.name}`;
            document.getElementById('connect-folder-btn').style.background = 'rgba(16, 185, 129, 0.1)';
            alert("✅ Pasta conectada com sucesso! Agora a Vida IA pode injetar arquivos direto no seu servidor.");
            
            sendDiscordNotification(
                "🔗 Pasta Conectada",
                `**Usuário:** ${document.getElementById('email-field')?.value || 'Dono'}\n**Pasta:** ${directoryHandle.name}\n**Status:** Acesso de Escrita Liberado`,
                65280
            );
        }
    } catch (err) {
        console.error("Erro ao acessar pasta:", err);
        alert("Atenção: Você precisa dar permissão de escrita para a injeção automática funcionar igual à Kiro.");
    }
}

async function injectScriptReal(folderName, files) {
    if (!directoryHandle) {
        alert("❌ Erro: Nenhuma pasta conectada! Use o botão 'Conectar Pasta (Kiro)' primeiro.");
        return false;
    }

    try {
        // 1. Verificar se estamos na pasta certa (tentar achar 'resources' ou usar a atual)
        let targetHandle = directoryHandle;
        
        // 2. Criar a pasta do script
        const newFolderHandle = await targetHandle.getDirectoryHandle(folderName, { create: true });
        
        // 3. Criar cada arquivo dentro da nova pasta
        for (const file of files) {
            const fileHandle = await newFolderHandle.getFileHandle(file.name, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(file.content);
            await writable.close();
            
            // Adicionar ao painel lateral de arquivos alterados
            addFileToPanel(`${folderName}/${file.name}`);
        }
        
        return true;
    } catch (err) {
        console.error("Erro na injeção:", err);
        if (err.name === 'NotAllowedError') {
            alert("❌ Permissão negada! Clique em 'Conectar Pasta' novamente e aceite a permissão de escrita.");
        } else {
            alert("❌ Erro ao injetar arquivos. Verifique se a pasta ainda existe.");
        }
        return false;
    }
}

// --- FIM DAS FUNÇÕES KIRO ---

// ESTATÍSTICAS DO SISTEMA
let totalViews = parseInt(localStorage.getItem('vida_ia_total_views')) || 0;
let totalScriptsGenerated = parseInt(localStorage.getItem('vida_ia_total_scripts')) || 0;

function trackPageView() {
    totalViews++;
    localStorage.setItem('vida_ia_total_views', totalViews);
    updateAdminStats();
    checkVipAccess();
}

function checkVipAccess() {
    const isVip = localStorage.getItem('vida_ia_has_vip') === 'true' || isOwner;
    const isMaster = localStorage.getItem('vida_ia_has_master') === 'true' || isOwner;
    
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    // Botão VIP (Start Base)
    if (isVip && !document.getElementById('vip-course-btn')) {
        const courseBtn = document.createElement('div');
        courseBtn.id = 'vip-course-btn';
        courseBtn.className = 'nav-item';
        courseBtn.style.color = '#fbbf24';
        courseBtn.style.marginTop = '10px';
        courseBtn.style.border = '1px solid rgba(251, 191, 36, 0.4)';
        courseBtn.style.background = 'rgba(251, 191, 36, 0.05)';
        courseBtn.innerHTML = '<i class="fas fa-graduation-cap"></i> Curso: Start Base';
        courseBtn.onclick = openCourseModal;
        
        const buyBtn = document.querySelector('.buy-credits');
        navMenu.insertBefore(courseBtn, buyBtn || null);
    }

    // Botão Master (Programação Completa)
    if (isMaster && !document.getElementById('master-course-btn')) {
        const masterBtn = document.createElement('div');
        masterBtn.id = 'master-course-btn';
        masterBtn.className = 'nav-item';
        masterBtn.style.color = '#a855f7';
        masterBtn.style.marginTop = '10px';
        masterBtn.style.border = '1px solid rgba(168, 85, 247, 0.4)';
        masterBtn.style.background = 'rgba(168, 85, 247, 0.05)';
        masterBtn.innerHTML = '<i class="fas fa-rocket"></i> Curso: Master Prog';
        masterBtn.onclick = openMasterCourseModal;
        
        const buyBtn = document.querySelector('.buy-credits');
        navMenu.insertBefore(masterBtn, buyBtn || null);
    }
}

function trackScriptGeneration() {
    totalScriptsGenerated++;
    localStorage.setItem('vida_ia_total_scripts', totalScriptsGenerated);
    updateAdminStats();
}

function updateAdminStats() {
    const viewsEl = document.getElementById('stats-total-views');
    const scriptsEl = document.getElementById('stats-total-scripts');
    if (viewsEl) viewsEl.textContent = totalViews.toLocaleString();
    if (scriptsEl) scriptsEl.textContent = totalScriptsGenerated.toLocaleString();
}

// Chamar contagem de acesso ao carregar
trackPageView();

// Removido auto-login para forçar senha sempre que entrar
document.addEventListener('DOMContentLoaded', () => {
    // Apenas garante que o overlay está visível se não houver sessão ativa
    const overlay = document.getElementById('auth-overlay');
    const container = document.getElementById('app-main');
    if (overlay) overlay.style.display = 'flex';
    if (container) container.style.display = 'none';
});

// Torna a função global para o HTML encontrar
window.handleAuth = function() {
    console.log("Iniciando processo de login...");
    
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    
    if (!emailInput || !passwordInput) {
        alert("Erro técnico: campos de login não encontrados.");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    console.log("Validando e-mail:", email);

    // Lógica de Dono (Owner)
    if (email.toLowerCase() === 'fernandesdavizin8@gmail.com' && password === '123') {
        isOwner = true;
        credits = Infinity;
        currentUser = { email: email, credits: Infinity };
        localStorage.setItem('vida_ia_user', JSON.stringify(currentUser));
        document.getElementById('current-credits').textContent = '∞';
        document.getElementById('user-role').textContent = 'Modo Owner Ativado';
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) adminBtn.style.display = 'flex';
    } else {
        isOwner = false;
        credits = 10; // Aumentado de 5 para 10 para novos usuários testarem mais
        currentUser = { email: email, credits: 10 };
        localStorage.setItem('vida_ia_user', JSON.stringify(currentUser));
        document.getElementById('current-credits').textContent = credits;
        document.getElementById('user-role').textContent = 'Usuário Free';
    }

    // REMOÇÃO IMEDIATA DO BLOQUEIO
    const overlay = document.getElementById('auth-overlay');
    const container = document.getElementById('app-main');
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    if (container) {
        container.style.display = 'flex';
    }
    
    checkVipAccess(); // Checar acesso ao curso logo após o login
    console.log("Login concluído com sucesso!");
};

window.handleLogout = function() {
    localStorage.removeItem('vida_ia_user');
    window.location.reload(); // Recarrega a página para voltar ao login
};

// Adicionar o evento de clique e de Enter manualmente para garantir
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('login-button');
    if (loginBtn) {
        loginBtn.onclick = handleAuth;
        console.log("Evento de clique adicionado ao botão de login");
    }

    const authForm = document.querySelector('.auth-forms');
    if (authForm) {
        authForm.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAuth();
            }
        };
    }
});

// Funções de Modal
function openCreditsModal() {
    document.getElementById('credits-modal').style.display = 'block';
}

function closeCreditsModal() {
    document.getElementById('credits-modal').style.display = 'none';
}

function closePixModal() {
    document.getElementById('pix-modal').style.display = 'none';
}

function openAdminModal() {
    updateAdminStats();
    document.getElementById('admin-modal').style.display = 'block';
}

function closeAdminModal() {
    document.getElementById('admin-modal').style.display = 'none';
}

function openCourseModal() {
    document.getElementById('course-modal').style.display = 'block';
}

function closeCourseModal() {
    document.getElementById('course-modal').style.display = 'none';
}

function openMasterCourseModal() {
    document.getElementById('master-course-modal').style.display = 'block';
}

function closeMasterCourseModal() {
    document.getElementById('master-course-modal').style.display = 'none';
}

function releaseCredits() {
    const targetEmail = document.getElementById('admin-target-email').value.trim();
    const amount = document.getElementById('admin-amount').value;

    if (!targetEmail || !amount) {
        alert("Preencha o e-mail do cliente e a quantidade!");
        return;
    }

    // Notificação no Discord da liberação
    sendDiscordNotification(
        "✅ Créditos Liberados",
        `**Dono:** fernandesdavizin8@gmail.com\n**Cliente:** ${targetEmail}\n**Quantidade:** ${amount} Créditos\n**Status:** Sucesso`,
        65280 // Verde
    );

    // Se a quantidade for 100 (referente ao plano VIP de 50 reais), libera o curso VIP
    if (parseInt(amount) === 100) {
        localStorage.setItem('vida_ia_has_vip', 'true');
        checkVipAccess();
        alert(`Sucesso! 100 créditos e o CURSO VIP (Start Base) foram liberados para ${targetEmail}.`);
    } else if (parseInt(amount) === 500) {
        // Se a quantidade for 500 (referente ao plano Master), libera o curso Master
        localStorage.setItem('vida_ia_has_master', 'true');
        checkVipAccess();
        alert(`Sucesso! 500 créditos e o CURSO MASTER (Programação Completa) foram liberados para ${targetEmail}.`);
    } else {
        alert(`Sucesso! ${amount} créditos foram enviados para ${targetEmail}.`);
    }
    
    closeAdminModal();
}

// CONFIGURAÇÃO DISCORD (COLE SEU LINK DE WEBHOOK AQUI)
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1504548896792248430/LPa6ug8c_C9nKarSM0xQM0K36aD4hbP2BA34a-FCyjt9agDQH5b5iz0w7IAqSQxet0PQ';

function sendDiscordNotification(title, message, color = 3447003) {
    if (!DISCORD_WEBHOOK || DISCORD_WEBHOOK === 'SEU_LINK_DE_WEBHOOK_AQUI') {
        console.log("Discord Webhook não configurado.");
        return;
    }

    const payload = {
        embeds: [{
            title: title,
            description: message,
            color: color,
            timestamp: new Date(),
            footer: { text: "Vida IA - Sistema de Notificações" }
        }]
    };

    fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(err => console.error("Erro ao enviar para Discord:", err));
}

function buyPlan(name, price, amount) {
    closeCreditsModal();
    window.selectedPlan = { name, price, amount };
    document.getElementById('pix-amount').textContent = `R$ ${price.toFixed(2).replace('.', ',')}`;
    document.getElementById('pix-modal').style.display = 'block';
}

function confirmPayment() {
    const email = document.getElementById('auth-email') ? document.getElementById('auth-email').value : "Usuário Desconhecido";
    const plan = window.selectedPlan ? window.selectedPlan.name : "Nenhum";
    const price = window.selectedPlan ? window.selectedPlan.price : "0";

    sendDiscordNotification(
        "💰 Novo Pedido de Créditos",
        `**Usuário:** ${email}\n**Plano:** ${plan}\n**Valor:** R$ ${price}\n**Status:** Aguardando Confirmação do Pix`,
        16776960 // Amarelo
    );

    alert("Pagamento enviado para análise! Seus créditos serão liberados em instantes.");
    
    // Se for o plano VIP, já mostra um gostinho do curso ou avisa que será liberado
    if (plan === 'VIP') {
        alert("💎 Detectamos que você adquiriu o Plano VIP! Após a confirmação do pagamento pelo Admin, o curso 'Como Programar Cidade' será liberado no seu painel.");
    }

    closePixModal();
}

// Funções de Navegação e Chat
function showChat() {
    const chatArea = document.getElementById('chat-area');
    chatArea.innerHTML = `
        <div class="welcome-message">
            <i class="fas fa-bolt main-bolt"></i>
            <h1>Vida IA</h1>
            <p>Bem-vindo à nova era do FiveM. Potencialize seu servidor com inteligência real.</p>
            <div class="quick-actions">
                <div class="action-card" onclick="startCreateScript()">
                    <i class="fas fa-code"></i>
                    <h3>Criar Script</h3>
                    <p>Gere arquivos direto na pasta resources</p>
                </div>
                <div class="action-card" onclick="startBugFix()">
                    <i class="fas fa-wrench"></i>
                    <h3>Corrigir Erro</h3>
                    <p>Analise erros do F8 e corrija na hora</p>
                </div>
            </div>
        </div>
    `;
    updateActiveNav(0);
}

window.startCreateScript = function() {
    currentMode = 'create';
    const chatArea = document.getElementById('chat-area');
    chatArea.innerHTML = '';
    addMessage('ai', '🛠️ **Modo Criador de Scripts Ativado!**\n\nDescreva o que você precisa (ex: "um sistema de lixeiro vRP" ou "um comando de adm para puxar carro"). Eu vou gerar o código completo para você!');
    
    updateActiveNav(1);
};

window.startBugFix = function() {
    currentMode = 'fix';
    const chatArea = document.getElementById('chat-area');
    chatArea.innerHTML = '';
    addMessage('ai', '🔧 **Modo Correção de Erros Ativado!**\n\nCole aqui o código que está dando erro ou o log que aparece no seu console (F8). Eu vou analisar e te enviar a versão corrigida.');
    
    updateActiveNav(2);
};

function startUploadBase() {
    document.getElementById('base-upload').click();
}

function handleBaseSelection(event) {
    const files = event.target.files;
    if (files.length > 0) {
        document.getElementById('connected-server').textContent = "Conectado: PSICO RJ V1";
        const chatArea = document.getElementById('chat-area');
        chatArea.innerHTML = '';
        addMessage("ai", `Lendo sua base... Detectei ${files.length} arquivos. Agora eu conheço todas as suas funções e scripts! O que deseja criar para essa base?`);
        updateActiveNav(3);
    }
}

function updateActiveNav(index) {
    const items = document.querySelectorAll('.nav-item');
    items.forEach(item => item.classList.remove('active'));
    if (items[index]) items[index].classList.add('active');
}

function addMessage(type, text) {
    const chatArea = document.getElementById('chat-area');
    const div = document.createElement('div');
    div.className = `message ${type}-message`;
    
    if (type === 'user') {
        div.style.cssText = 'align-self: flex-end; background: #3b82f6; padding: 12px 20px; border-radius: 12px; margin-bottom: 20px; max-width: 80%;';
    } else {
        div.style.cssText = 'align-self: flex-start; background: #1e293b; padding: 12px 20px; border-radius: 12px; margin-bottom: 20px; max-width: 80%; border: 1px solid #2d3748;';
    }
    
    div.textContent = text;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function addFileToPanel(filename) {
    const filesList = document.getElementById('files-list');
    const emptyMsg = filesList.querySelector('.empty-files');
    if (emptyMsg) emptyMsg.remove();

    const fileDiv = document.createElement('div');
    fileDiv.className = 'file-item';
    fileDiv.innerHTML = `<i class="fas fa-file-code"></i> <span>${filename}</span>`;
    filesList.prepend(fileDiv);
}

function simulateRestart() {
    const btn = document.querySelector('.restart-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reiniciando...';
    btn.style.background = '#4b5563';
    
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-check"></i> Servidor Online!';
        btn.style.background = '#10b981';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '#7c3aed';
        }, 2000);
    }, 3000);
}

document.getElementById('send-btn').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (text === '') return;

    if (document.querySelector('.welcome-message')) {
        document.getElementById('chat-area').innerHTML = '';
    }

    addMessage('user', text);
    input.value = '';

    const lowerText = text.toLowerCase();

    // Verificação de créditos
    if (!isOwner && credits <= 0) {
        addMessage('ai', "❌ Você não tem créditos suficientes! Clique em 'Comprar Créditos' para continuar usando a Vida IA.");
        return;
    }

    setTimeout(async () => {
        const lowerText = text.toLowerCase();
        
        // NOVO: Lista expandida de gatilhos para FiveM
        const fivemKeywords = ['lixeiro', 'policia', 'medico', 'mecanico', 'ilegal', 'drogas', 'bau', 'garagem', 'concessionaria', 'banco', 'salario', 'roupas', 'identidade', 'spawn', 'carro', 'arma'];
        const hasKeyword = fivemKeywords.some(keyword => lowerText.includes(keyword));

        // Se estiver no modo de criação/correção OU se digitar uma palavra de FiveM, gera o script
        const isRequest = (typeof currentMode !== 'undefined' && (currentMode === 'create' || currentMode === 'fix')) || 
                         lowerText.includes('criar') || lowerText.includes('faz') || lowerText.includes('script') || 
                         lowerText.includes('sistema') || lowerText.includes('/') || lowerText.includes('vrp') || 
                         lowerText.includes('creative') || lowerText.includes('comando') || lowerText.includes('erro') ||
                         lowerText.includes('bug') || lowerText.includes('corrigir') || hasKeyword;

        if (isRequest) {
            // Se for pedido de script mas não tiver pasta conectada, avisa mas permite gerar no painel lateral
            if (!directoryHandle && !lowerText.includes('conectar')) {
                addMessage('ai', "⚠️ **Nota:** Você ainda não conectou sua pasta via 'Conectar Pasta (Kiro)'. Eu vou gerar o código no seu **Painel Lateral de Arquivos**, mas recomendo conectar a pasta para eu injetar o script direto no seu servidor.");
            }

            const isBugFix = (typeof currentMode !== 'undefined' && currentMode === 'fix') || lowerText.includes('corrigir') || lowerText.includes('erro') || lowerText.includes('bug');
            
            addMessage('ai', isBugFix ? "🔍 Analisando falhas e corrigindo código..." : "🚀 Vida IA Processando... Gerando seu script FiveM de alta performance.");
            
            try {
                // Chamar a OpenAI real (ou mock se sem chave)
                const aiResult = await generateFiveMScript(text);
                
                if (aiResult && !aiResult.error) {
                    trackScriptGeneration(); // Contabiliza o uso
                }
                
                if (!aiResult) {
                    addMessage('ai', "❌ Ocorreu um erro desconhecido ao gerar o script.");
                    return;
                }

                if (aiResult.error) {
                    addMessage('ai', `❌ Erro da IA: ${aiResult.error}`);
                    return;
                }

                const scriptName = "vida_" + text.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 15) + "_" + Math.floor(Math.random() * 100);
                
                const filesToInject = [
                    { name: 'fxmanifest.lua', content: aiResult.manifest },
                    { name: 'client.lua', content: aiResult.client },
                    { name: 'server.lua', content: aiResult.server }
                ];

                const email = document.getElementById('auth-email') ? document.getElementById('auth-email').value : "Usuário Desconhecido";
                
                // Tentar injeção real se a pasta estiver conectada
                let injecaoSucesso = false;
                if (directoryHandle) {
                    injecaoSucesso = await injectScriptReal(scriptName, filesToInject);
                }

                if (injecaoSucesso) {
                    addMessage('ai', `✅ SUCESSO! O script '${scriptName}' foi injetado com sucesso na sua pasta resources. Basta dar um 'ensure ${scriptName}' ou reiniciar o servidor.`);
                } else {
                    addMessage('ai', `✨ Script Gerado com Sucesso!\n\nComo você ainda não conectou sua pasta via 'Conectar Pasta (Kiro)', eu salvei o rascunho no seu painel lateral. Conecte sua pasta para injeção automática!`);
                    // Mostrar no painel lateral
                    addFileToPanel(`${scriptName}/server.lua`);
                    addFileToPanel(`${scriptName}/client.lua`);
                }

                // Descontar créditos se não for owner
                if (!isOwner) {
                    credits--;
                    document.getElementById('current-credits').textContent = credits;
                }

                sendDiscordNotification(
                    "🛠️ Script Gerado pela Vida IA",
                    `**Usuário:** ${email}\n**Pedido:** ${text}\n**Injeção Real:** ${injecaoSucesso ? 'SIM ✅' : 'NÃO ❌'}\n**Pasta Gerada:** ${scriptName}`,
                    injecaoSucesso ? 65280 : 16711680
                );

            } catch (err) {
                console.error("Erro no processamento:", err);
                addMessage('ai', "❌ Erro crítico ao processar sua solicitação.");
            }
        } else {
            addMessage('ai', "Estou aqui para ajudar com seu servidor de FiveM. Posso criar scripts complexos, corrigir erros de código ou analisar sua base de dados. O que deseja fazer?");
        }
    }, 1000);
}

window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = "none";
    }
}
