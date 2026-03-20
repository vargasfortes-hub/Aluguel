import { Contract } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function generateContractMarkdown(contract: Contract): string {
  const { locadores, locataria, imovel, condicoes, garantia, corretor } = contract;

  // Helpers para Concordância
  const isPluralLocador = locadores.length > 1;
  const isMasculineLocador = locadores.some(l => l.tipo === 'PF' && l.genero === 'Masculino');
  const locadorTerm = isPluralLocador ? (isMasculineLocador ? 'LOCADORES' : 'LOCADORAS') : (isMasculineLocador ? 'LOCADOR' : 'LOCADORA');
  const locadorLabel = isPluralLocador ? (isMasculineLocador ? 'denominados' : 'denominadas') : (isMasculineLocador ? 'denominado' : 'denominada');
  const locadorArtigo = isPluralLocador ? (isMasculineLocador ? 'os' : 'as') : (isMasculineLocador ? 'o' : 'a');
  const locadorArtigoMaiusculo = isPluralLocador ? (isMasculineLocador ? 'Os' : 'As') : (isMasculineLocador ? 'O' : 'A');
  const isMasculineLocataria = locataria.tipo === 'PF' && locataria.genero === 'Masculino';
  const locatariaTerm = isMasculineLocataria ? 'LOCATÁRIO' : 'LOCATÁRIA';
  const locatariaLabel = isMasculineLocataria ? 'denominado' : 'denominada';
  const locatariaArtigo = isMasculineLocataria ? 'o' : 'a';
  const locatariaArtigoMaiusculo = isMasculineLocataria ? 'O' : 'A';

  // Palavras flexionadas
  const locatariaObrigada = isMasculineLocataria ? 'obrigado' : 'obrigada';
  const locatariaDela = isMasculineLocataria ? 'dele' : 'dela';
  const locatariaAutorizada = isMasculineLocataria ? 'autorizado' : 'autorizada';
  const locatariaDenunciada = isMasculineLocataria ? 'denunciado' : 'denunciada';
  const locatariaAcompanhada = isMasculineLocataria ? 'acompanhado' : 'acompanhada';
  const locadorAcompanhado = isPluralLocador ? (isMasculineLocador ? 'acompanhados' : 'acompanhadas') : (isMasculineLocador ? 'acompanhado' : 'acompanhada');
  const locadorObrigado = isPluralLocador ? (isMasculineLocador ? 'obrigados' : 'obrigadas') : (isMasculineLocador ? 'obrigado' : 'obrigada');
  const locadorAutorizado = isPluralLocador ? (isMasculineLocador ? 'autorizados' : 'autorizadas') : (isMasculineLocador ? 'autorizado' : 'autorizada');

  // Preposições e Artigos Combinados
  const locadorPrepAo = isPluralLocador ? (isMasculineLocador ? 'aos' : 'às') : (isMasculineLocador ? 'ao' : 'à');
  const locadorPrepDo = isPluralLocador ? (isMasculineLocador ? 'dos' : 'das') : (isMasculineLocador ? 'do' : 'da');
  const locadorPrepPelo = isPluralLocador ? (isMasculineLocador ? 'pelos' : 'pelas') : (isMasculineLocador ? 'pelo' : 'pela');
  const locadorPrepNo = isPluralLocador ? (isMasculineLocador ? 'nos' : 'nas') : (isMasculineLocador ? 'no' : 'na');

  const locatariaPrepAo = isMasculineLocataria ? 'ao' : 'à';
  const locatariaPrepDo = isMasculineLocataria ? 'do' : 'da';
  const locatariaPrepPelo = isMasculineLocataria ? 'pelo' : 'pela';
  const locatariaPrepNo = isMasculineLocataria ? 'no' : 'na';

  // Formatação dos Locadores
  const locadoresText = locadores.map((l, i) => {
    if (l.tipo === 'PJ') {
      const reps = l.representantes?.map(r => `${r.nome}, CPF nº ${r.cpf}${r.funcao ? ` (${r.funcao})` : ''}`).join(', ');
      return `**${l.nome.toUpperCase()}**, pessoa jurídica, inscrita no CNPJ sob o nº ${l.documento}, com sede em ${l.endereco}, nº ${l.numero}${l.complemento ? `, ${l.complemento}` : ''}, bairro ${l.bairro}, ${l.cidade}/${l.estado}, CEP: ${l.cep}, neste ato representada por: ${reps}`;
    }

    const rgText = l.isNovoRG ? `CIN (Novo RG) nº ${l.rg}` : `RG nº ${l.rg} ${l.orgaoEmissor}/${l.orgaoEmissorUF}`;
    const complementoText = l.complemento ? `, ${l.complemento}` : '';
    const nacionalidade = l.genero === 'Feminino' ? l.nacionalidade.replace('o', 'a') : l.nacionalidade;
    const profissao = l.profissao; 
    const portador = l.genero === 'Feminino' ? 'portadora' : 'portador';
    const domiciliado = l.genero === 'Feminino' ? 'domiciliada' : 'domiciliado';
    
    let text = `**${l.nome.toUpperCase()}**, ${nacionalidade}, ${profissao}, ${portador} do ${rgText} e do CPF nº ${l.cpf}`;
    
    if (l.temConjuge && l.conjuge) {
      const c = l.conjuge;
      const crgText = c.isNovoRG ? `CIN (Novo RG) nº ${c.rg}` : `RG nº ${c.rg} ${c.orgaoEmissor}/${c.orgaoEmissorUF}`;
      const cNacionalidade = c.genero === 'Feminino' ? c.nacionalidade.replace('o', 'a') : c.nacionalidade;
      const cPortador = c.genero === 'Feminino' ? 'portadora' : 'portador';
      const casado = l.genero === 'Feminino' ? 'casada' : 'casado';
      text += `, ${casado} com **${c.nome.toUpperCase()}**, ${cNacionalidade}, ${c.profissao}, ${cPortador} do ${crgText} e do CPF nº ${c.cpf}`;
    }

    text += `, residente e ${domiciliado} em ${l.endereco}, nº ${l.numero}${complementoText}, bairro ${l.bairro}, ${l.cidade}/${l.estado}, CEP: ${l.cep}`;
    return text;
  }).join('; ');

  // Formatação da Locatária
  const locatariaPortador = isMasculineLocataria ? 'portador' : 'portadora';
  const locatariaRgText = locataria.tipo === 'PF' && locataria.rg 
    ? `, ${locatariaPortador} do ${locataria.isNovoRG ? `CIN (Novo RG) nº ${locataria.rg}` : `RG nº ${locataria.rg} ${locataria.orgaoEmissor}/${locataria.orgaoEmissorUF}`}`
    : '';

  const locatariaComplementoText = locataria.complemento ? `, ${locataria.complemento}` : '';
  
  let representantesText = '';
  if (locataria.tipo === 'PJ' && locataria.representantes && locataria.representantes.length > 0) {
    const reps = locataria.representantes.map(r => `${r.nome}${r.cpf ? `, CPF nº ${r.cpf}` : ''}${r.funcao ? ` (${r.funcao})` : ''}`).join(', ');
    representantesText = `, neste ato representada por seus diretores/procuradores: ${reps}`;
  }

  let locatariaConjugeText = '';
  if (locataria.tipo === 'PF' && locataria.temConjuge && locataria.conjuge) {
    const c = locataria.conjuge;
    const crgText = c.isNovoRG ? `CIN (Novo RG) nº ${c.rg}` : `RG nº ${c.rg} ${c.orgaoEmissor}/${c.orgaoEmissorUF}`;
    const cNacionalidade = c.genero === 'Feminino' ? c.nacionalidade.replace('o', 'a') : c.nacionalidade;
    const cPortador = c.genero === 'Feminino' ? 'portadora' : 'portador';
    const casado = locataria.genero === 'Feminino' ? 'casada' : 'casado';
    locatariaConjugeText = `, ${casado} com **${c.nome.toUpperCase()}**, ${cNacionalidade}, ${c.profissao}, ${cPortador} do ${crgText} e do CPF nº ${c.cpf}`;
  }

  const locatariaNacionalidade = locataria.tipo === 'PF' && locataria.nacionalidade ? (locataria.genero === 'Feminino' ? locataria.nacionalidade.replace('o', 'a') : locataria.nacionalidade) : '';
  const locatariaText = `**${locataria.nome.toUpperCase()}**, ${locataria.tipo === 'PJ' ? 'pessoa jurídica' : 'pessoa física'}, ${locatariaNacionalidade ? locatariaNacionalidade + ', ' : ''}inscrita no ${locataria.tipo === 'PJ' ? 'CNPJ' : 'CPF'} sob o nº ${locataria.documento}${locatariaRgText}${locatariaConjugeText}, com sede/residência em ${locataria.endereco}, nº ${locataria.numero}${locatariaComplementoText}, bairro ${locataria.bairro}, ${locataria.cidade}/${locataria.estado}, CEP: ${locataria.cep}${representantesText}`;

  // Valores e Datas
  const valorExtenso = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(condicoes.valorAluguel);
  const garantiaExtenso = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(garantia.valor);
  const dataInicioFormatada = format(new Date(condicoes.dataInicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const dataTerminoFormatada = format(new Date(condicoes.dataTermino), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const imovelComplementoText = imovel.complemento ? `, ${imovel.complemento}` : '';
  const bancoInfo = condicoes.bancoNome 
    ? `${condicoes.bancoNome} (${condicoes.bancoCodigo}), AGÊNCIA ${condicoes.agencia}, CONTA ${condicoes.conta}`
    : '';

  const pinturaText = imovel.pinturaNova 
    ? "com pintura nova" 
    : "sem a necessidade de pintura nova";

  const condominioText = imovel.temCondominio 
    ? (condicoes.condominioIncluso 
        ? "Condomínio (já incluso no valor do aluguel)" 
        : `Condomínio (responsabilidade d${condicoes.pagaCondominio === 'Locador' ? locadorArtigo : locatariaArtigo} ${condicoes.pagaCondominio === 'Locador' ? locadorTerm : locatariaTerm})`)
    : "";

  // Cláusula de Garantia Dinâmica (Cláusula 18)
  let garantiaClausula = '';
  if (garantia.tipo === 'Caução') {
    garantiaClausula = `### CLÁUSULA 18 – GARANTIA
Fica acordado entre as partes que, a título de garantia locatícia (**Caução**), ${locatariaArtigo} **${locatariaTerm}** entregará ${locadorPrepAo} **${locadorTerm}** a importância total de **${garantiaExtenso}**, equivalente a **${garantia.mesesCaucao} meses** de aluguel. O referido valor será integralizado em parcela única, no ato de assinatura deste contrato.

**Parágrafo Primeiro:** Os valores referentes à caução deverão ser depositados na conta bancária indicada no Parágrafo Primeiro da Cláusula 3. ${locadorArtigoMaiusculo} **${locadorTerm}** compromete-se a manter este valor aplicado em caderneta de poupança para que sofra a devida correção monetária (rendimentos da poupança) durante todo o período da locação.

**Parágrafo Segundo:** Ao término do contrato, a caução será devolvida ${locatariaPrepAo} **${locatariaTerm}** acrescida dos rendimentos da caderneta de poupança, após a vistoria de entrega das chaves e quitação de todos os débitos de aluguel e encargos. Caso haja danos ou pendências financeiras, o valor (principal + correção) será utilizado para abatimento da dívida, sendo devolvido apenas o saldo remanescente, se houver.`;
  } else if (garantia.tipo === 'Fiador' && garantia.fiador) {
    const f = garantia.fiador;
    const fiadorTerm = f.genero === 'Feminino' ? 'FIADORA' : 'FIADOR';
    const fiadorPortador = f.genero === 'Feminino' ? 'portadora' : 'portador';
    const fiadorDomiciliado = f.genero === 'Feminino' ? 'domiciliada' : 'domiciliado';
    const conjugeText = f.temConjuge && f.conjuge 
      ? `, e seu cônjuge **${f.conjuge.nome.toUpperCase()}**, ${f.conjuge.nacionalidade}, ${f.conjuge.profissao}, ${f.conjuge.genero === 'Feminino' ? 'portadora' : 'portador'} do RG nº ${f.conjuge.rg} ${f.conjuge.orgaoEmissor}/${f.conjuge.orgaoEmissorUF} e CPF nº ${f.conjuge.cpf}`
      : '';
    
    garantiaClausula = `### CLÁUSULA 18 – GARANTIA
A título de garantia locatícia (**${fiadorTerm}**), intervém como ${fiadorTerm.toLowerCase()} e principal pagador, renunciando expressamente ao benefício de ordem previsto no Art. 827 do Código Civil: **${f.nome.toUpperCase()}**, ${f.nacionalidade}, ${f.estadoCivil}, ${f.profissao}, ${fiadorPortador} do RG nº ${f.rg} ${f.orgaoEmissor}/${f.orgaoEmissorUF} e CPF nº ${f.cpf}${conjugeText}, residente e ${fiadorDomiciliado} em ${f.endereco}, nº ${f.numero}, bairro ${f.bairro}, na Cidade de ${f.cidade}/${f.estado}, CEP ${f.cep}.
**Parágrafo Único:** A responsabilidade d${f.genero === 'Feminino' ? 'a' : 'o'} ${fiadorTerm.toLowerCase()} abrange o aluguel, encargos e danos ao imóvel, perdurando até a efetiva entrega das chaves.`;
  } else if (garantia.tipo === 'Seguro Fiança') {
    garantiaClausula = `### CLÁUSULA 18 – GARANTIA
A título de garantia locatícia (**Seguro Fiança**), ${locatariaArtigo} **${locatariaTerm}** contratou apólice junto à seguradora **${garantia.seguradora?.toUpperCase()}**, no valor de **${garantiaExtenso}**, sob a apólice que será anexada a este instrumento.
**Parágrafo Único:** A manutenção do seguro fiança é de inteira responsabilidade ${locatariaPrepDo} **${locatariaTerm}**, devendo ser renovado anualmente sob pena de infração contratual.`;
  } else {
    garantiaClausula = `### CLÁUSULA 18 – AUSÊNCIA DE GARANTIA
As partes acordam que a presente locação não contará com garantia locatícia, nos termos do Art. 37 da Lei 8.245/91.`;
  }

  const validTestemunhas = contract.testemunhas?.filter(t => t.nome || t.cpf) || [];
  const numTestemunhas = validTestemunhas.length;
  const fechoTestemunhas = numTestemunhas === 0 
    ? "" 
    : numTestemunhas === 1 
      ? ", juntamente com 1 (uma) testemunha" 
      : `, juntamente com ${numTestemunhas} (${numTestemunhas === 2 ? 'duas' : numTestemunhas}) testemunhas`;

  return `
# INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO

Pelo presente instrumento particular, em que figura de um lado, ${locadoresText}, doravante ${locadorLabel} **${locadorTerm}**.

Pelo presente instrumento particular, em que figura de outro lado, ${locatariaText}, doravante ${locatariaLabel} **${locatariaTerm}**.

### CLÁUSULA 1 – OBJETO
O objeto deste contrato de locação é um imóvel residencial, disponibilizado ${locadorPrepPelo} **${locadorTerm}**, conforme as Cláusulas delineadas neste contrato, destinado à locação em benefício ${locatariaPrepDo} **${locatariaTerm}**. O imóvel encontra-se localizado na **${imovel.endereco}, nº ${imovel.numero}${imovelComplementoText}, bairro ${imovel.bairro}, na Cidade de ${imovel.cidade}/${imovel.estado}, CEP ${imovel.cep}**, sendo este composto de: ${imovel.descricao}. Garagens: ${imovel.garagens}.

### CLÁUSULA 2 – PRAZO
O prazo de locação é de **${condicoes.prazoMeses} (trinta e seis) meses**, a começar em **${dataInicioFormatada}** e término em **${dataTerminoFormatada}**, data em que ${locatariaArtigo} **${locatariaTerm}** se obriga a restituir o imóvel locado em bom estado de conservação, **${pinturaText}**, inteiramente livre e desocupado.

**Parágrafo Primeiro:** ${locatariaArtigoMaiusculo} **${locatariaTerm}**, findo o prazo da locação, sem que haja prorrogação, obrigar-se-á a comunicar ${locadorPrepAo} **${locadorTerm}** por escrito, e com antecedência de 30 (trinta) dias, sua intenção em desocupar o imóvel, dando por finda a locação, a fim de permitir que seja o referido imóvel vistoriado.

**Parágrafo Segundo:** O contrato poderá ser prorrogado por mútuo acordo entre as partes, ficando, porém, assegurado às partes todos os direitos e vantagens conferidos pela Lei 8.245/91, com alterações da Lei 12.112/09.

### CLÁUSULA 3 – ALUGUEL
Pela locação ora ajustada, ${locatariaArtigo} **${locatariaTerm}** pagará o aluguel mensal correspondente a **${valorExtenso}**. O primeiro aluguel vencerá antecipadamente, devendo ser quitado no momento da assinatura do presente contrato.

**Parágrafo Primeiro:** O pagamento do valor do aluguel será através de depósito ou transferência para: **${bancoInfo} (CHAVE PIX: ${condicoes.chavePix})**.

**Parágrafo Segundo:** No caso de pagamento em cheque, a quitação do aluguel só terá validade após a compensação e pagamento do cheque pelo banco sacado. Assim o aluguel e os encargos locatícios só serão considerados quitados ${locatariaPrepPelo} **${locatariaTerm}**, mediante o crédito liberado na conta bancária indicada ${locadorPrepPelo} **${locadorTerm}**.

**Parágrafo Terceiro:** Se os aluguéis forem pagos fora da data de vencimento, serão acrescidos de multa de 10% (dez por cento) sobre o valor do aluguel, juros de mora de 1% (um por cento) ao mês e correção monetária pelo IGPM/FGV ou outro índice que venha a substituí-lo.

### CLÁUSULA 4 – CONSERVAÇÃO
${locatariaArtigoMaiusculo} **${locatariaTerm}** obriga-se a zelar pela conservação ordinária do imóvel, bem como das instalações elétricas, hidráulicas, sanitárias e dos equipamentos que o guarnecem, responsabilizando-se pelos danos decorrentes de uso inadequado ou de sua ação ou omissão culposa.

**Parágrafo Único:** Não responderá ${locatariaArtigo} **${locatariaTerm}** por vícios estruturais, defeitos preexistentes, desgaste natural decorrente do uso regular ou problemas decorrentes de caso fortuito ou força mayor, competindo ${locadorPrepAo} **${locadorTerm}** as reparações estruturais e aquelas necessárias à manutenção da habitabilidade do imóvel, nos termos do art. 22 da Lei nº 8.245/91.

### CLÁUSULA 5 – DESTINAÇÃO
A presente locação destina-se para fim exclusivamente residencial ${locatariaPrepDo} **${locatariaTerm}**, estando proibida qualquer alteração desta destinação, salvo mediante concordância expressa ${locadorPrepDo} **${locadorTerm}**, o que fará de forma que não prejudique ou incomode os vizinhos, e a tranquilidade de todos.

### CLÁUSULA 6 – SUBLOCAÇÃO
${locatariaArtigoMaiusculo} **${locatariaTerm}** não poderá sublocar nem emprestar o imóvel locado, no todo ou em parte, não podendo outrossim, ceder ou transferir este contrato a outrem sem o consentimento ${locadorPrepDo} **${locadorTerm}**, prévio e por escrito, devendo no caso de consentimento, agir oportunamente junto aos ocupantes, a fim de que o mesmo imóvel esteja desimpedido no término do presente contrato.

### CLÁUSULA 7 – ENCARGOS E TRIBUTOS
Além do aluguel mensal, correrão por conta exclusiva ${locatariaPrepDo} **${locatariaTerm}**, durante o período da locação: 
a) todas as despesas de conservação do imóvel e dos equipamentos, de consumo de água, luz, telefone e IPTU, exceto aquelas taxas que são exclusivas do proprietário. Os pagamentos destas taxas deverão ser feitos rigorosamente nos vencimentos estabelecidos pelo órgão credor ou recebedor competente; 
b) todas as multas pecuniárias provenientes do atraso no pagamento de quantias sob sua responsabilidade. Dentro do prazo de 30 (trinta) dias após o recebimento das chaves do imóvel, ${locatariaArtigo} **${locatariaTerm}** se compromete a solicitar junto a empresa de água/esgoto e de energia, a transferir as contas mensais para seu nome, sob pena de não o fazendo, incorrer em infração contratual grave.

**Parágrafo Primeiro:** ${locatariaArtigoMaiusculo} **${locatariaTerm}** concorda e obriga-se a segurar o imóvel contra riscos dos sinistros acima especificados, em seguradora idônea, sendo o prêmio calculado pelo valor total e real para reconstrução do imóvel ora locado, cujo seguro deverá ser renovado anualmente enquanto ${locatariaArtigo} **${locatariaTerm}** permanecer no imóvel. Entretanto, caso ${locatariaArtigo} **${locatariaTerm}** opte por não contratar o seguro, e ocorrendo qualquer sinistro no imóvel durante a locação, ${locatariaArtigo} **${locatariaTerm}** responderá pela indenização ${locadorPrepAo} **${locadorTerm}**, pelos prejuízos causados por sinistro a terceiros, desde que comprovada sua culpa ou dolo, não sendo responsável por danos decorrentes de caso fortuito, força maior, vício estrutural ou defeito preexistente do imóvel.

**Parágrafo Segundo:** Fica também entendido que prejuízos causados por sinistro à terceiros, vizinhos, etc., também será de responsabilidade e ônus ${locatariaPrepDo} **${locatariaTerm}**, quando decorrentes de sua ação ou omissão culposa, não respondendo por danos oriundos de caso fortuito, força maior ou vício estrutural do imóvel.

**Parágrafo Terceiro:** ${locatariaArtigoMaiusculo} **${locatariaTerm}**, no curso da locação, obriga-se, ainda, a satisfazer todas as exigências do Poder Público que decorram da utilização do imóvel e a que der causa, as quais não constituirão motivo para rescisão deste contrato, não respondendo, contudo, por determinações relativas à estrutura ou regularização do bem que sejam de responsabilidade ${locadorPrepDo} **${locadorTerm}**, salvo se o imóvel for considerado inabitável, hipótese que deverá ser apurada mediante vistoria judicial.

### CLÁUSULA 8 – BENFEITORIAS
${locatariaArtigoMaiusculo} **${locatariaTerm}**, exceto as obras que importem na segurança do imóvel, obriga-se por todas as outras, devendo trazê-lo em perfeito estado de conservação, e em boas condições de higiene, para assim restituí-lo com todas as instalações sanitárias e elétricas, fechos, vidros, torneiras, ralos e demais acessórios, quando findo ou rescindido este contrato.

**Parágrafo Primeiro:** As reparações estruturais ou decorrentes de vício preexistente permanecerão sob responsabilidade ${locadorPrepDo} **${locadorTerm}**. As benfeitorias necessárias, quando devidamente comprovadas e previamente comunicadas, poderão ser indenizadas, sem direito de retenção; as úteis dependerão de autorização escrita para indenização; e as voluptuárias não serão indenizáveis, podendo ser levantadas se não causarem danos ao imóvel.

**Parágrafo Segundo:** A fixação de antenas de TV, telefonia e outros equipamentos, deverão obedecer às estruturas já disponíveis no imóvel, de forma que não comprometam sua estrutura, ficando desde já ${locatariaArtigo} **${locatariaTerm}** responsável por eventuais danos causados pelos profissionais instaladores.

### CLÁUSULA 9 – VISTORIA E ESTADO DO IMÓVEL
${locatariaArtigoMaiusculo} **${locatariaTerm}** confessa neste instrumento ter vistoriado o imóvel ora locado conforme se comprova pelo laudo/fotos, e que recebeu em perfeito estado obrigando-se a manter e a restituir da maneira em que o recebe, ou seja, em perfeito estado de conservação, higiene, limpeza e funcionamento, tratando-se de um imóvel seminovo. A vistoria de entrega e de devolução das chaves será realizada por um **profissional competente da área**, garantindo a imparcialidade e precisão técnica do laudo.

**Parágrafo Único:** Os custos referentes aos honorários do profissional para a realização da **vistoria de entrada** serão pagos integralmente ${locatariaPrepPelo} **${locatariaTerm}** no ato da entrega das chaves. Já os custos referentes à **vistoria de saída** (devolução do imóvel) serão de responsabilidade ${locadorPrepDo} **${locadorTerm}**.

Todos os estragos eventualmente ocorridos no imóvel em apreço deverão ser reparados ${locatariaPrepPelo} **${locatariaTerm}**, que fica ${locatariaObrigada} ao pagamento dos aluguéis e demais encargos até que os reparos estejam totalmente concluídos. Conforme laudo/fotos anexos, havendo qualquer anormalidade no imóvel ${locadorArtigoMaiusculo} **${locadorTerm}** notificará ${locatariaArtigo} **${locatariaTerm}** para que no prazo de 10 (dez) dias repare o defeito ou substitua a peça ou aparelho defeituoso por sua conta própria e risco. Se ${locatariaArtigo} **${locatariaTerm}** não cumprir essa notificação, que poderá ser extrajudicial, ${locadorArtigoMaiusculo} **${locadorTerm}** poderá mandar executar o serviço, substituindo o que for necessário, mediante comprovação das despesas, ficando ${locatariaArtigo} **${locatariaTerm}** ${locatariaObrigada} ao reembolso dos valores efetivamente dispendidos, com o acréscimo de 10% (dez por cento) sobre o montante das despesas a título de administração. Entretanto, não havendo reembolso em 10 (dez) dias pedirá a rescisão do contrato, cumulando o débito com a multa contratual, juros de mora na base de 10% (dez por cento) ao mês, bem como as custas e despesas processuais e honorários advocatícios.

**Parágrafo Primeiro:** Após a desocupação e antes da entrega das chaves ${locadorPrepAo} **${locadorTerm}**, ${locatariaArtigo} **${locatariaTerm}** mandará efetuar no imóvel, uma reparação em tudo que foi danificado, pois se desta forma não procederem, ${locadorArtigoMaiusculo} **${locadorTerm}** não será ${locadorObrigado} a receber as chaves, e as obrigações assumidas neste contrato continuarão em vigor, inclusive o pagamento do aluguel que só cessará com a entrega do imóvel nas mesmas condições descritas no laudo/fotos de vistoria.

**Parágrafo Segundo:** Se desta forma ${locatariaArtigo} **${locatariaTerm}** não proceder, ${locadorArtigoMaiusculo} **${locadorTerm}** por este instrumento já fica ${locadorAutorizado} a efetuar tais serviços e posteriormente receber ${locatariaDela}, **${locatariaTerm}**, o reembolso das despesas havidas conforme previsto nesta Cláusula.

**Parágrafo Terceiro:** ${locatariaArtigoMaiusculo} **${locatariaTerm}** não poderá fazer qualquer modificação no imóvel, nem uma simples pintura, sem o consentimento por escrito ${locadorPrepDo} **${locadorTerm}**. Não terão ainda direito a qualquer indenização ou retenção do imóvel por qualquer benfeitoria feita no mesmo, ainda que necessária e autorizada ${locatariaPrepPelo} **${locatariaTerm}**. Estas benfeitorias ficam incorporadas ao imóvel.

### CLÁUSULA 10 – RENOVAÇÃO E PRORROGAÇÃO
Antes do vencimento deste contrato as partes deverão se entender a fim de combinar as novas bases da locação e será efetivado um novo contrato de locação, tudo em consonância com o teor da Lei nº 8.245/91, e não havendo interesse no prosseguimento da locação, por qualquer das partes, ${locatariaArtigo} **${locatariaTerm}** deverá desocupar o imóvel e entregar as chaves ${locadorPrepAo} **${locadorTerm}**. Contudo, se desta forma não proceder, e ${locatariaArtigo} **${locatariaTerm}** continuar ocupando o imóvel sem oposição ${locadorPrepDo} **${locadorTerm}**, presumir-se-á prorrogada a locação por prazo indeterminado, podendo neste caso, ${locatariaArtigo} **${locatariaTerm}** ser ${locatariaDenunciada} ${locadorPrepPelo} **${locadorTerm}** para desocupação em qualquer tempo futuro, ao qual será concedido o prazo de 30 (trinta) dias, conforme determina a Lei nº 8.245/91.

### CLÁUSULA 11 – RESCISÃO
Haverá rescisão contratual se houver incêndio, desabamento, desapropriação ou quaisquer outras ocorrências que impeçam o uso normal do imóvel locado, independentemente de qualquer indenização por parte ${locadorPrepDo} **${locadorTerm}** e ${locatariaPrepDo} **${locatariaTerm}**, cabendo ${locatariaPrepAo} **${locatariaTerm}** a responsabilidade pelos prejuízos a que der causa por ação ou omissão culposa, mesmo que venha a repor o objeto locado ao estado em que se encontrava antes do evento.

**Parágrafo Primeiro:** Ocorrerá a rescisão deste contrato, de pleno direito, no caso de desapropriação, incêndio ou acidente que sujeite o imóvel locado a obras, que importem na sua reconstrução total ou parcial ou que impeçam o uso do mesmo por mais de 30 (trinta) dias.

**Parágrafo Segundo:** Fica ressalvado o direito ${locatariaPrepDo} **${locatariaTerm}** de reclamar do causador do incêndio, desabamento, ou do poder expropriante, indenização a que, porventura, fizer jus.

### CLÁUSULA 12 – VISTORIAS
${locatariaArtigoMaiusculo} **${locatariaTerm}** já faculta ${locadorPrepAo} **${locadorTerm}** ou seu representante, examinar ou vistoriar o imóvel locado, quando entender conveniente e, no caso de o imóvel ser colocado à venda, poderá ser visitado pelos interessados, desde que ${locadorAcompanhado} ${locadorPrepPelo} **${locadorTerm}** ou pelo seu representante.

### CLÁUSULA 13 – PREFERÊNCIA
Se ${locadorArtigo} **${locadorTerm}** manifestar a intenção de vender o imóvel locado, ${locatariaArtigo} **${locatariaTerm}** se obriga a permitir que as pessoas interessadas na compra o visitem, caso não queira exercer o seu direito de preferência de adquiri-lo em igualdade de condições com terceiros.

**Parágrafo Primeiro:** Não havendo interesse ${locatariaPrepDo} **${locatariaTerm}** na compra do imóvel, e um terceiro vier a adquiri-lo, dentro do prazo deste contrato, o novo proprietário responderá por todas as obrigações assumidas neste contrato.

### CLÁUSULA 14 – TRANSFERÊNCIA DE CONTAS
${locatariaArtigoMaiusculo} **${locatariaTerm}** por este instrumento de contrato, concorda e **AUTORIZA** ${locadorArtigo} **${locadorTerm}** ou seu procurador/representante a providenciar a partir desta data, junto às empresas de água/esgoto e de energia elétrica, a transferência das contas mensais, para seu nome, devendo permanecer desta forma, enquanto o mesmo estiver ocupando o imóvel, e após a desocupação, deverá ser transferido para o nome do novo ocupante.

**Parágrafo Primeiro:** ${locatariaArtigoMaiusculo} **${locatariaTerm}** se obriga a pagar todas as contas de energia elétrica e água/esgoto, a vencer a partir desta data, tomando-se como base o período de leitura de cada uma delas, sendo que este período será considerado e deverá coincidir com os meses e dias exatos de ocupação do imóvel.

**Parágrafo Segundo:** ${locatariaArtigoMaiusculo} **${locatariaTerm}** desocupando o imóvel, e não exibindo ${locadorPrepAo} **${locadorTerm}** no ato da entrega das chaves, os comprovantes de quitação de energia e água/esgoto, se obriga a liquidar as mesmas contas, acrescidas de multa de 10% (dez por cento) mais correção monetária, tão logo lhe seja cobrado ${locadorPrepPelo} **${locadorTerm}**, com os devidos recibos.

### CLÁUSULA 15 – MULTA CONTRATUAL
Fica estipulada multa contratual equivalente a **${condicoes.multaRescisoria} (três) aluguéis** vigentes na data da infração, aplicável nos casos de descumprimento contratual relevante ou de rescisão antecipada imotivada.

**Parágrafo Primeiro:** O pagamento da multa não exime ${locatariaArtigo} **${locatariaTerm}** de solver aluguéis vencidos ou danos ao imóvel.

**Parágrafo Segundo:** A multa prevista nesta cláusula deverá ser paga proporcionalmente ao período restante de cumprimento do contrato.

### CLÁUSULA 16 – INADIMPLEMENTO E DESPEJO
O inadimplemento do aluguel e/ou encargos da locação autoriza ${locadorArtigo} **${locadorTerm}** a promover ação de despejo por falta de pagamento, com pedido de liminar para desocupação do imóvel no prazo de 15 (quinze) dias, independentemente de oitiva ${locatariaPrepDo} **${locatariaTerm}**, nos termos do Art. 59, §1º, da Lei nº 8.245/91, sem prejuízo da cobrança dos valores devidos, acrescidos de multa, juros, correção monetária e honorários advocatícios.

### CLÁUSULA 17 – TÍTULO EXECUTIVO
Este contrato constitui título executivo extrajudicial, nos termos do art. 784, VIII do Código de Processo Civil (CPC), para a cobrança de aluguéis e quaisquer encargos acessórios não quitados.

${garantiaClausula}

### CLÁUSULA 19 – VALIDADE
O presente contrato não terá qualquer valor, se não contiver no mesmo a assinatura ${locadorPrepDo} **${locadorTerm}**.

### CLÁUSULA 20 – FORO
As partes elegem o foro da Comarca de **${imovel.cidade}/${imovel.estado}**, para dirimir as questões resultantes da execução do presente contrato, obrigando-se a parte vencida a pagar à vencedora, além das custas e despesas processuais, honorários advocatícios fixados em 20% (vinte por cento) sobre o valor da causa.

### CLÁUSULA 21 – TÍTULO EXECUTIVO EXTRAJUDICIAL
Este contrato constitui título executivo extrajudicial para todos os fins de direito, abrangendo os aluguéis e encargos acessórios (IPTU, água, luz e taxas), nos termos do Art. 784, VIII do Código de Processo Civil (CPC).

E por estarem entre si, de acordo, firmam o presente, em duas vias de igual teor${fechoTestemunhas}.

**${imovel.cidade}/${imovel.estado}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.**

---

**${locadorTerm}:**

${locadores.map((l, idx) => `
_________________________________
**${l.nome.toUpperCase()}**
${l.tipo === 'PF' ? `CPF: ${l.cpf}` : `CNPJ: ${l.documento}`}
`).join('\n')}

---

**${locatariaTerm}:**

${locataria.tipo === 'PJ' && locataria.representantes ? locataria.representantes.map((r, idx) => `
_________________________________
**${r.nome.toUpperCase()}**
${r.funcao}
CPF: ${r.cpf}
`).join('\n') : `
_________________________________
**${locataria.nome.toUpperCase()}**
CPF: ${locataria.documento}
`}

---

**TESTEMUNHAS / CORRETOR:**

_________________________________
**${corretor.nome.toUpperCase()}**
CRECI: ${corretor.creci}

${validTestemunhas.map((t, idx) => `
_________________________________
**${t.nome ? t.nome.toUpperCase() : `TESTEMUNHA ${idx + 1}`}**
${t.cpf ? `CPF: ${t.cpf}` : ''}
`).join('\n')}

${garantia.tipo === 'Fiador' && garantia.fiador ? `
---

**FIADOR(ES) / FIADORA(S):**

_________________________________
**${garantia.fiador.nome.toUpperCase()}**
CPF: ${garantia.fiador.cpf}

${garantia.fiador.temConjuge && garantia.fiador.conjuge ? `
_________________________________
**${garantia.fiador.conjuge.nome.toUpperCase()}**
CPF: ${garantia.fiador.conjuge.cpf}
(Cônjuge d${garantia.fiador.genero === 'Feminino' ? 'a' : 'o'} ${garantia.fiador.genero === 'Feminino' ? 'fiadora' : 'fiador'})
` : ''}
` : ''}
  `;
}
