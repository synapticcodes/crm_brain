**DATABASE BRAIN:**

**Schema BRAIN**

A Database Brain será um lugar onde iremos reunir todos os clientes de todas as empresas. Nela será armazenada apenas quem é cliente com contrato assinado.

Precisaremos migrar todos os clientes existentes do Tenex e do Trello e atribui-los um UIUID único para identificação interna, tenancy_id para identificação de qual empresa ele pertence e utilizar o CPF como principal forma de identificação externa

Os novos clientes virão dos CRMs através do tenancy_id e já serão registrados na database.

Cada cliente existente nessa database terá seus respectivos dados armazenados e atrelados pelo seu ID.

De alguma forma precisamos armazenar o histórico de conversas no WhatsApp obtidas pelo número de telefone e no App de processos obtidas pelo CPF e atrela-los aos clientes pelo seu ID.

Todos os clientes com acesso ao app deverão estar listadas nessa database

Este sistema deverá estar desintexado do robots.txt, não pode ficar visível no Google.

As respostas do jurídico relacionado a determinados processos deverão ser inseridas nesta database

Todas as ações dos outros setores utilizarão como base essa database como consulta.

Este sistema deverá estar desintexado do robots.txt, não pode ficar visível no Google.

**Clientes novos (Obtido através do CRM):**

Agrupar através de IDs todos os clientes e guardar as seguintes informações:

1 - Data de ingresso (Dia em que assinou o contrato e data de cadastro Tenex)

2 - Dados de contato (Email, WhatsApp, Telefone secundário)

3 - Status financeiro (Aguardando primeiro pagamento, Em dia, Inadimplente, Cancelado) -> Esses dados são mutáveis de acordo com o Tenex.

4 - Dados de negociação (Nome completo, Telefone, Telefone secundário, Email, CPF, RG, Rua, Número, Bairro, Cidade, Estado, CEP, Serviço contratado, Valor do contrato, Forma de pagamento, Parcelas, Documentos Frente-Verso, Audio de comprometimento, Cópia do contrato assinado, Comprovante de residência)

5 -- Vendedor responsável e UIDID do vendedor responsável

6 -- ID Credilly

7 -- Tenancy_id

**Clientes antigos (Importação):**

Esses clientes terão que ser gerados IDs ao serem inseridos no sistema.

1 - Data de ingresso (Dia em que assinou o contrato e data de cadastro Tenex)

2 - Dados de contato (Email, WhatsApp, Telefone secundário)

3 - Status financeiro (Aguardando primeiro pagamento, Em dia, Inadimplente, Cancelado) -> Esses dados são mutáveis de acordo com o Tenex.

4 - Dados de negociação (Nome completo, Telefone, Telefone secundário, Email, CPF, RG, Rua, Número, Bairro, Cidade, Estado, CEP, Serviço contratado, Valor do contrato, Forma de pagamento, Parcelas, Documentos Frente-Verso, Audio de comprometimento, Cópia do contrato assinado, Comprovante de residência)

5 -- Vendedor responsável

6 -- Processo super-endividamento

7 -- Processo RMC

8 -- ID Credilly e ID Turing

9 - Tenancy_id

**Dados preenchidos pelo próprio cliente (Obtido através do App de acompanhamento):**

**Esses dados deverão ser cruzados com os obtidos através do CRM para double-check e alimentar os dados faltantes**

RG, Idade, Gênero, Profissão, Estado civil, Situação, Vulnerabilidade, Escolaridade, Tem dependentes?, número de dependentes (se houver), faixa de renda individual, faixa de renda familiar, água, luz, telefone/internet, aluguel ou prestação da casa, alimentação, plano de saúde, medicamentos, impostos, transporte, outras despesas, causas das dívidas, número de credores, compromentimento mensal, está em cadastro de inadimplência?, Possuí casa própria?, Tem financiamento de veículo?, Como conheceu o crédito?, RG e CPF ou CNH (Frente-verso), comprovante de residência, Contracheque recente, Extrato de empréstimo consignado, relatório do registrato de empréstimos e financiamentos, assinatura digital

**Dados preenchidos pelo setor jurídico (Obtido através do CRM Lungs):**

Esses dados serão preenchidos via cards no CRM dos advogados na role de distribuidor de processos (não de cobrança). Conforme for preenchido, será inserido no cliente através de UIDID.

Processos a serem distribuídos

Processos em andamento

Provas e provas agendadas

Perguntas e respostas

Processos em análise

Cartão RMC solicitar e solicitados

Datas das audiências

Audiência confirmada

Adiamento da audiência e cancelamento da audiência

Decisão judicial

Documentos pendentes

**### Funcionalidades front-end:**

**Sessão 00 -- Login page:**

O acesso será via email e senha, não haverá forma de se cadastrar, apenas logar e redefinir a senha. Será cadastrado manualmente o email e a senha no supabase do usuário. Pode ser redefinido a senha a qualquer momento enviando um link de redefinição via e-mail. Após criado, será checado na tabela "equipe" qual a role e tanancy_id para permitir o login no projeto.

**Sessão 01 -- Clientes:**

Essa sessão concentrará a maior parte das ações da plataforma.

A visualização será composta por kanbans onde cada card representa um cliente. O card terá como identificação o nome completo do cliente, id, cpf, telefone, telefone secundário e email como amostragem.

Nos kanbans teremos as seguintes colunas:

Documentação pendente, Documentação enviada,Em dia, Provas, Inadimplentes

Na coluna Documentação pendente, teremos os cards na cor amarelo.

Na coluna Documentação enviada, teremos os cards na cor roxa

Na coluna Em dia, teremos os cards na cor verde.

Na coluna Inadimplentes teremos os cards na cor vermelha.

Na coluna Provas teremos os cards na cor laranja

Nessa mesma sessão teremos filtros por coluna, nome, telefone, cpf, processo super-endividamento, processo rmc , documentos e teremos filtros de data. Por padrão será a visualização todo o período, e teremos as opções de diário, semanal, mensal, anual e personalizado. Esses dados de filtros utilizarão a data da criação desse cliente como parâmetro.

Ao abrir um card irá mostrar todos os dados existentes daquele cliente e também um histórico de ações que foram feitas ao longo do tempo que serão armazenadas em forma de timeline.

Os dados existentes serão o seguinte:

"ID, Nome completo, Telefone, Telefone secundário, Email, CPF, RG, Processo super-endividamento, Processo RMC, Status de pagamento, Parcelas pagas, Rua, Número, Bairro, Cidade, Estado, CEP, Serviço contratado, Valor do contrato, Forma de pagamento, Parcelas, Documentos Frente-Verso, Audio de comprometimento, Cópia do contrato assinado, Comprovante de residência RG, Idade, Gênero, Profissão, Estado civil, Situação, Vulnerabilidade, Escolaridade, Tem dependentes?, número de dependentes, renda individual mensal, faixa de renda pessoal, renda familiar mensal, faixa de renda familiar, água, luz, telefone/internet, aluguel ou prestação da casa, alimentação, plano de saúde, medicamentos, impostos, transporte, outras despesas, causas das dívidas, número de credores, compromentimento mensal, está em cadastro de inadimplência?, Possuí casa própria?, Tem financiamento de veículo?"

Todos esses dados serão armazenados em formatos de blocos dentro do card do lead na parte superior. Alguns dados poderão ser editados pelos usuários, por exemplo:

Os dados de telefone, telefone secundário, email, processo super-endividamento, processo RMC e acesso podem ser editados pelos usuários.

Logo abaixo teremos o histórico de ações em formatos de timeline. Nele receberemos tudo que foi feito em relação a este cliente em específico, por exemplo:

Modificações de dados feitas por usuários ou pelo próprio cliente

Recebimento de documentos

Disparos de email/whatsapp/sms feitos de maneira automática ou manual

Entrou em contato pelo aplicativo/email/site/whatsapp

Respostas do jurídico

Atualizações de processo

Atualizações de status de pagamento

Bloqueio e liberação do aplicativo

Todos esses dados possuirão timestamp e ficará guardado permanentemente no card do cliente através de scroll infinito.

Dentro do card de cada cliente, é possível anexar arquivos que serão salvos dentro do bucket no qual aquele cliente pertence. Pode ser inserido arquivos pdf, jpg, docx, png, etc... Essa funcionalidade se chamará "Anexar arquivo" e conforme os arquivos são anexados, terá uma lista de arquivos que será visualizada ao abrir o card no canto superior direito. Com o nome de cada arquivo enviado, tipo de arquivo (pdf,jpg,etc.) e o timestamp que foi armazenado. Também mostrará os arquivos já existentes, ou seja, que não foram inseridos no frontend mas que já existia anexado ao cliente.

Dentro de cada card também teremos um boxe de mensagem chamado "Enviar ao jurídico" no qual ao preencher e enviar, será enviado a mensagem para o setor jurídico, isso influenciará na Sessão 03 -- Jurídico movendo o card para a sessão Pendentes.

Sempre qualquer um dos documentos da tabela "dados_extras" forem preenchidos aparecerá uma badge roxa no card do cliente escrito "documentos para serem analisados"

O usuário precisará analisar os documentos para serem analisados, todos os documentos estarão preenchidos nos cards e quando houver essa tag, aparecerá 2 botões, confirmar ou recusar. Caso confirme, a tag "documentos enviados" irá ser removida e será transferido o cliente para a coluna Documentação enviada no kanban, caso recuse, irá mudar a cor da tag para vermelho escuro e irá alterar para "recusado" e irá abrir uma boxe de mensagem para enviar uma notificação para o cliente no qual foi recusado. Caso recusado deve-se manter na mesma coluna do kanban. O cliente irá receber essa notificação em outro sistema e poderá efetuar novamente o envio dos documentos faltantes ou corrigi-los.

Caso tenha sido aprovado, será liberado o acesso do aplicativo e os dados serão enviados para o setor jurídico dar início ao processo.

Todos os clientes também mostrarão de quem é o vendedor responsável. Poderá ser filtrado também por vendedor responsável nos filtros.

**Sessão 02 -- Aplicativo:**

Nessa sessão terá o mesmo design da sessão 01, A visualização será composta por kanbans onde cada card representa um cliente. O card terá como identificação o nome completo do cliente, id, cpf, telefone, telefone secundário e email como amostragem.

As colunas serão as seguintes:

Pendente, Liberado, Bloqueado

Na coluna Pendente teremos os cards na cor amarela

Na coluna Liberado teremos os cards na cor verde

Na coluna Bloqueado teremos os cards na cor vermelha

Nessa mesma sessão teremos filtros por coluna, nome, telefone, cpf, processo super-endividamento, processo rmc e teremos filtros de data. Por padrão será a visualização todo o período, e teremos as opções de diário, semanal, mensal, anual e personalizado. Esses dados de filtros utilizarão a data da criação desse cliente como parâmetro.

Ao abrir um card irá mostrar todos os dados existentes daquele cliente, o andamento do processo e também um histórico de ações que foram feitas ao longo do tempo que serão armazenadas em formato de timeline.

Os dados existentes serão o seguinte:

"ID, Nome completo, Telefone, Telefone secundário, Email, CPF, RG, Processo super-endividamento, Processo RMC, Status de pagamento, Parcelas pagas, Acesso ao aplicativo"

Todos esses dados serão armazenados em formatos de blocos dentro do card do lead na parte superior. Alguns dados poderão ser editados pelos usuários, por exemplo:

Os dados de telefone, telefone secundário, email, processo super-endividamento, processo RMC e acesso ao aplicativo podem ser editados pelos usuários.

Logo abaixo teremos o histórico de ações em formatos de timeline. Nele receberemos tudo que foi feito em relação ao aplicativo deste cliente, por exemplo:

Atualizações de processo

Atualizações de status de pagamento

Bloqueio e liberação do aplicativo

Todos esses dados possuirão timestamp e ficará guardado permanentemente no card do cliente através de scroll infinito.

Dentro do card de cada cliente, é possível enviar arquivos que serão salvos dentro do bucket no qual aquele cliente pertence. Pode ser inserido arquivos pdf, jpg, docx, png, etc...

Dentro do card também teremos o andamento do processo, que irá mostrar em um boxe o resumo de tudo que foi feito e em qual etapa está ele atualmente.

Manualmente pode-se liberar e travar o aplicativo como fallback. Os usuários podem fazer isso.

Pode-se criar um usuário do zero também e atribuindo-o a um cpf para puxar os dados restantes de id, nome, telefone, etc..

**Sessão 03 -- Jurídico:**

Essa sessão será responsável por enviar e receber informações para o setor jurídico. Poderá enviar através de emails internos ou outro sistema similar (que irão funcionar em ambos fronts dando a impressão que é um sistema de tickets)

Basicamente funcionará da seguinte maneira: O usuário irá selecionar um card de cliente na Sessão 01 - Clientes, irá inserir em um boxe de mensagem o ocorrido e irá enviar para o jurídico. O jurídico receberá o mesmo card em outro sistema e irá responder de volta ou realizar edições no card do cliente no qual ele possua permissão afetando o supabase e modificando os dados.

Haverá 2 colunas no kanban nessa sessão, a "Pendentes" e a "Respondidos".

A coluna Pendentes armazenará os cards em que o usuário já enviou a mensagem para o jurídico mas ainda não houve resposta. A coluna Respondidos armazenará os cards em que o jurídico respondeu. Sempre que houver uma nova interação entre o usuário e o jurídico, o card se moverá, se foi o usuário, voltará para Pendentes, se for resposta do jurídico, voltará para Respondidos.

Também haverá uma lista de logs com o histórico e timestamp de todos os clientes que foram enviados e respondidos pelo jurídico.

Sempre em que houver uma resposta do jurídico deve aparecer uma notificação no canto inferior direito e com um som no qual iremos configurar depois.

**Sessão 04 -- Atendimentos:**

Essa sessão funcionará como um sistema de chat com protocolos. Cada chat ficará aberto permanentemente até o usuário ou o cliente encerra-lo. Quando se encerra um chat, se encerra o protocolo, mas as conversas não serão apagadas. Todo o histórico de conversa de cada chat será atribuído a um cliente através do ID e o histórico será infinito e permanente. As mensagens nunca irão desaparecer. Os chats poderão ser iniciados tanto pelo side do cliente quanto pelo side do usuário. Quando iniciado pelo side do usuário, o sistema precisará validar se o cliente já acessou o aplicativo. Caso não tenha acessado ainda, retornará uma mensagem de erro dizendo "Cliente ainda não se cadastrou no app".

Cada mensagem recebida de qualquer chat vindo do side do cliente, aparecerá uma notificação TOAST para o usuário, no canto inferior direito e também soará um som que iremos configurar posteriormente.

A visualização dessa sessão será no canto esquerdo a aba de chats com os nomes dos clientes, uidid, cpf, número de telefone, email, protocolo e status de pagamento (inadimplente, em dia, pendente), no centro o chat em si com as mensagens recebidas pelos clientes com timestamp e as respostas enviadas com timestamp. O chat deve aceitar texto, imagens, arquivos e áudio. Deverá ser implementada uma forma de enviar e receber áudios em formato .mp3 ou .ogg.

Se o cliente ou o usuário estiver offline, mostrará que está offline no chat. O online é somente se estiver PRESENTE no chat, se estiver na plataforma mas com o chat fechado, não será considerado online.

Quando um chat se encerra, o protocolo é deletado, quando é reaberto, é gerado um novo protocolo e assim por diante. Preservando todas as conversas nos chats.

No chat é necessário mostrar quando e qual atendente está online e se o cliente está online, é preciso ver ambas mensagens se foram entregues e visualizadas.

Também devemos ter uma funcionalidade de exportar todas as conversas do chat em formato TXT. Qualquer chat poderá ser baixado pelo usuário.

A regra é cada chat recente subirá para o topo e os mais antigos sem movimentação irão sendo movidos para baixo. Teremos filtros de data. Por padrão será a visualização todo o período, e teremos as opções de diário, semanal, mensal, anual e personalizado. Esses dados de filtros utilizarão a data da última interação desse cliente como parâmetro.

Os usuários conseguem ver as notas dadas pelo cliente ao finalizar o atendimento.

Pode-se filtrar também chats através do nome do cliente, cpf, uidid ou protocolo.

Também deveremos ter uma segunda aba nessa mesma sessão chamada "Emails" onde ficará ao lado dos chats, ao clicar nela, irá mudar completamente a visualização. Nela o usuário poderá enviar emails para os clientes saindo da caixa-postal definida (pode-se optar por várias caixas diferentes configuradas). Ao abrir os emails, ficará listado da mesma maneira que os chats, porém ao invés de conversas, será os emails recebidos que ficarão amostra, é possível pesquisar um cliente através do nome, cpf ou email e ao clicar neste card do cliente, irá abrir o modal para enviar um email para ele, ao clicar em Enviar, será enviado o email e ficará registrado no histórico de emails. Devemos segregar em 2 colunas, os emails enviados e os emails recebidos para melhor organização. Também deve ser possível salvar templates de email para serem pré-selecionados e preenchidos no campo de envio e deve existir também dentro do modal um botão chamado "Emails bancos". Esse botão ao ser pressionado, irá listar vários emails salvos no qual o usuário poderá enviar um email ou template de email. Os remetentes também podem ser utilizados com BCC`s, ou seja, pode-se enviado para vários remetentes diferentes ao mesmo tempo o mesmo email. Essa opção precisa ser implementada. Após o email ser enviado para um banco, aquele card do cliente irá dar um trigger no banco de dados e adiciona-lo a etapa de "renegociação_iniciada".

Os emails precisam vir com logs nos cards de emails enviados, sucesso na cor verde para os que enviaram corretamente, erro na cor vermelho para os que falharam. O usuário deve receber uma notificação TOAST quando há um sucesso ou erro.

**Sessão 05 -- Logs:**

Aqui será uma grande lista no qual mostra todos os logs do sistema de todas as sessões e ações separada por colunas. Sendo elas as seguintes:

1 - Ação

2 -- Responsável

3 - Descrição

4 - Timestamp

Esses logs se armazenarão infinitamente para poderem ser auditados posteriormente.

**Sessão 06 -- Equipe:**

A visualização será composta por uma lista mostrando os usuários com sua respectiva foto de perfil, nome completo, email, telefone, data da ultima atividade, status se está online ou offline e role. Através do front-end devemos conseguir obter a sessão em tempo real do usuário para conseguirmos saber se ele está efetivamente online

Os usuários normais não poderão acessar essa sessão, apenas o admin.

Nessa sessão deverá ter um botão "Convidar", quando clicado, deverá abrir uma box com opção de convidar por email. Onde será mostrado os seguintes campos para serem preenchidos:

1 -- Nome completo

2 -- Email

Ao serem preenchidos, ao clicar no botão "Enviar", será enviado através do Auth do supabase para o email no qual foi preenchido no campo.

Assim que enviado deve listar o usuário na sessão com o status de "Pendente". Assim que o usuário acessar o link e se autenticar, deverá mudar o status para "online" assim que ele logar no sistema.

Essa sessão se comunicará com a tabela "equipe" do supabase. Todas ações deverá refletir na tabela

O status deverá seguir essas seguintes cores:

Online = Verde

Offline = Vermelho

Laranja = Pendente

Nessa sessão também deverá existir o botão "Demitir" onde irá deletar o usuário da tabela Auth do supabase e também irá remove-lo do CRM. Ao ser removido, deverá ser obtido o IP dele através da tabela "equipe" na coluna "ip_address" e inseri-lo em uma blacklist para não conseguir mais acessar o sistema pelo link.

Iremos utilizar o IPData para obter o IP e dados de geolocalização dos usuários, assim que eles logarem de primeira, já devemos obter esses dados.

**### Tecnologias necessárias:**

CRM Heart funcional

Integração Tenex

IPData

SMTP para comunicar com o jurídico (talvez) e enviar aos clientes

VITE Framework