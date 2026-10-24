(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickN = (a, n) => shuffle(a).slice(0, n);
const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (n, d = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const isCode = s => /^[\d.\/-]+$/.test(String(s));

/* ================= regras do guia ================= */
const CNPJ_LOJA = '19.234.190/0007-25';
const DEP = { L: 'LOJA - MORADA DO SOL', D: 'DEPÓSITO - MORADA DO SOL' };
const TIPOS = ['Compra para Revenda', 'Compra para Consumo', 'Transferência', 'Bens e Patrimônio', 'Bonificação', 'Serviço'];
const PAGTOS = ['A Prazo', 'A Vista'];
const CFOPS = ['1.101', '1.102', '1.152', '1.401', '1.403', '1.409', '1.551', '1.552', '1.556', '1.557', '1.933', '2.933'];
const CSTS = ['000', '020', '040', '041', '060', '070', '090'];

const PAY = {
  boleto: ['Boleto bancário anexo', 'Fatura em boleto · vencimento conforme o boleto físico'],
  pix: ['Pago por transferência bancária', 'Comprovante de PIX/TED anexo à nota'],
  bonif: ['Sem cobrança', 'Nenhum boleto acompanha a mercadoria'],
  transf: ['Transferência entre lojas', 'Sem boleto · mesma empresa']
};
const SIMPLES_TXT = 'Documento emitido por ME ou EPP optante pelo Simples Nacional.';

// Cenários da tela do sistema. ans: null = campo não avaliado neste caso.
const SCEN = [
  { id: 'lat', doc: 'nfe', emit: 'LATICINIOS PIRACANJUBA DISTRIB. AM LTDA', cnpjE: '08.114.502/0003-41', cid: 'Manaus/AM', reg: 'normal', pag: 'boleto', cfopN: '5.401', nat: 'Venda de produção do estabelecimento c/ ST',
    itens: [['CREME DE LEITE PIRACANJUBA 200G', 'UN', 54, 3.337], ['LEITE DESNATADO 1L C/TAMPA PIRACANJUBA', 'UN', 12, 8.0025], ['LEITE CONDENSADO PIRACANJUBA 395G', 'UN', 24, 6.49]],
    imp: { cfop: '1.401', cst: '560' }, ans: { dep: 'L', pag: 'A Prazo', tipo: 'Compra para Revenda', cfop: '1.403', cst: '060' },
    why: 'Laticínio é revenda, então vai para a Loja. Veio boleto: A Prazo. O sistema puxou 1.401 (industrialização) e a gente troca sempre para 1.403. O CST 560 vira 060: troque o primeiro dígito por 0.' },
  { id: 'desc', doc: 'nfe', emit: 'NATUREZA COMERCIO DE DESCARTAVEIS', cnpjE: '27.903.411/0001-06', cid: 'Manaus/AM', reg: 'simples', pag: 'boleto', cfopN: '5.102', nat: 'Venda de mercadoria adquirida de terceiros',
    itens: [['BANDEJA ISOPOR B-2 C/400', 'PCT', 10, 62.9], ['BOBINA PICOTADA 30X40 C/500', 'RL', 8, 38.5], ['FILME PVC 28CM X 300M', 'RL', 6, 44.9]],
    obs: 'Material para embalar carnes e frios no balcão.',
    imp: { cfop: '1.102', cst: '102' }, ans: { dep: 'D', pag: 'A Prazo', tipo: 'Compra para Consumo', cfop: '1.556', cst: '090' },
    why: 'Bandeja, bobina e filme são embalagens que a loja consome, não vende. Entram no Depósito como Compra para Consumo, CFOP 1.556. Fornecedor do Simples: CST 090.' },
  { id: 'carne', doc: 'nfe', emit: 'FRIGORIFICO BOI NORTE LTDA', cnpjE: '05.667.230/0001-90', cid: 'Manaus/AM', reg: 'normal', pag: 'pix', cfopN: '5.101', nat: 'Venda de produção do estabelecimento',
    itens: [['PICANHA BOVINA RESFRIADA KG', 'KG', 38.4, 69.9], ['COSTELA BOVINA JANELA KG', 'KG', 120, 21.5], ['PATINHO BOVINO KG', 'KG', 62.7, 36.8]],
    imp: { cfop: '1.101', cst: '140' }, ans: { dep: 'L', pag: 'A Vista', tipo: 'Compra para Revenda', cfop: '1.102', cst: '040' },
    why: 'Carne é revenda: Loja. Pago por transferência: A Vista. 1.101 é industrialização, troca para 1.102. O CST 140 vira 040.' },
  { id: 'tfrios', doc: 'nfe', emit: 'FRIGORIFICO AMAZONAS - LOJA PARQUE DEZ', root: true, cid: 'Manaus/AM', reg: 'normal', pag: 'transf', cfopN: '5.409', nat: 'Transferência de mercadoria sujeita a ST',
    itens: [['PRESUNTO COZIDO SADIA KG', 'KG', 15.2, 32.9], ['MORTADELA BOLOGNA PERDIGAO KG', 'KG', 22.8, 18.4], ['SALAME ITALIANO SADIA KG', 'KG', 4.6, 79.9]],
    imp: { cfop: '1.409', cst: '060' }, ans: { dep: 'L', pag: null, tipo: 'Transferência', cfop: '1.409', cst: '060' },
    why: 'Veio de outra loja do Frigorífico Amazonas: Transferência. Frios são revenda, então Loja. Transferência com substituição tributária: CFOP 1.409 e CST 060. Aqui o sistema já trouxe certo, era só conferir.' },
  { id: 'tcons', doc: 'nfe', emit: 'FRIGORIFICO AMAZONAS - CD', root: true, cid: 'Manaus/AM', reg: 'normal', pag: 'transf', cfopN: '5.557', nat: 'Transferência de material de uso e consumo',
    itens: [['DETERGENTE NEUTRO 5L', 'GL', 6, 24.9], ['PAPEL TOALHA INTERFOLHA C/1000', 'FD', 10, 19.9], ['LUVA NITRILICA M C/100', 'CX', 8, 34.5]],
    obs: 'Material para limpeza e uso no açougue.',
    imp: { cfop: '1.152', cst: '040' }, ans: { dep: 'D', pag: null, tipo: 'Transferência', cfop: '1.557', cst: '040' },
    why: 'Veio do CD: Transferência. Limpeza e luvas não têm saída, vão para o Depósito. Uso e consumo em transferência tem código próprio: CFOP 1.557 com CST 040.' },
  { id: 'tprod', doc: 'nfe', emit: 'FRIGORIFICO AMAZONAS - LOJA FLORES', root: true, cid: 'Manaus/AM', reg: 'normal', pag: 'transf', cfopN: '5.151', nat: 'Transferência de produção do estabelecimento',
    itens: [['LINGUICA TOSCANA PRODUCAO PROPRIA KG', 'KG', 40, 19.9], ['CARNE MOIDA DE 1A PRODUCAO PROPRIA KG', 'KG', 35, 29.9]],
    imp: { cfop: '1.409', cst: '060' }, ans: { dep: 'L', pag: null, tipo: 'Transferência', cfop: '1.152', cst: '020' },
    why: 'Transferência da Loja Flores com produção própria: CFOP 1.152 e CST 020. É para vender, então depósito Loja.' },
  { id: 'note', doc: 'nfe', emit: 'NORTE INFORMATICA LTDA', cnpjE: '11.402.778/0001-55', cid: 'Manaus/AM', reg: 'normal', pag: 'boleto', cfopN: '5.102', nat: 'Venda de mercadoria adquirida de terceiros',
    itens: [['NOTEBOOK 15.6 CORE I5 16GB SSD 512GB', 'UN', 1, 3899]],
    obs: 'Equipamento para o escritório da loja.',
    imp: { cfop: '1.102', cst: '000' }, ans: { dep: 'D', pag: 'A Prazo', tipo: 'Bens e Patrimônio', cfop: '1.551', cst: '000' },
    why: 'Notebook do escritório é patrimônio: Bens e Patrimônio, no Depósito, CFOP 1.551. Para bens, use o CST que veio na nota (000).' },
  { id: 'comp', doc: 'nfe', emit: 'REFRIGERACAO TROPICAL LTDA', cnpjE: '16.330.902/0001-81', cid: 'Manaus/AM', reg: 'normal', pag: 'pix', cfopN: '5.102', nat: 'Venda de mercadoria adquirida de terceiros',
    itens: [['COMPRESSOR 5HP TRIFASICO P/ CAMARA FRIA', 'UN', 1, 8750]],
    obs: 'Instalação na câmara fria do açougue.',
    imp: { cfop: '1.102', cst: '041' }, ans: { dep: 'D', pag: 'A Vista', tipo: 'Bens e Patrimônio', cfop: '1.551', cst: '041' },
    why: 'Compressor é bem da loja: Bens e Patrimônio, no Depósito, CFOP 1.551, mantendo o CST da nota (041). Pago por transferência: A Vista.' },
  { id: 'tpat', doc: 'nfe', emit: 'FRIGORIFICO AMAZONAS - LOJA PONTA NEGRA', root: true, cid: 'Manaus/AM', reg: 'normal', pag: 'transf', cfopN: '5.552', nat: 'Transferência de bem do ativo imobilizado',
    itens: [['BALANCA ELETRONICA 15KG C/ IMPRESSORA', 'UN', 1, 2890]],
    imp: { cfop: '1.551', cst: '041' }, ans: { dep: 'D', pag: null, tipo: 'Transferência', cfop: '1.552', cst: '041' },
    why: 'Veio da Loja Ponta Negra: Transferência. Balança é patrimônio, fica no Depósito. Bem em transferência usa 1.552 (o 1.551 é para compra). CST conforme a nota.' },
  { id: 'bonif', doc: 'nfe', emit: 'LATICINIOS PIRACANJUBA DISTRIB. AM LTDA', cnpjE: '08.114.502/0003-41', cid: 'Manaus/AM', reg: 'normal', pag: 'bonif', cfopN: '5.910', nat: 'Remessa em bonificação, doação ou brinde',
    itens: [['IOGURTE PIRACANJUBA MORANGO 170G', 'UN', 24, 2.89], ['BEBIDA LACTEA PIRACANJUBA 900ML', 'UN', 12, 6.2]],
    imp: { cfop: '1.910', cst: '060' }, ans: { dep: 'L', pag: null, tipo: 'Bonificação', cfop: null, cst: null },
    why: 'Sem boleto e com CFOP 5.910 na nota: é Bonificação. Os produtos são para vender, então Loja.' },
  { id: 'serv', doc: 'nfse', emit: 'CLIMATIZA AMAZONAS SERVICOS LTDA', cnpjE: '31.208.664/0001-12', cid: 'Manaus/AM', reg: 'normal', pag: 'boleto', cfopN: '—', nat: 'Prestação de serviço',
    itens: [['MANUTENCAO PREVENTIVA CAMARA FRIA', 'SV', 1, 1450]],
    imp: { cfop: '1.102', cst: '' }, ans: { dep: null, pag: 'A Prazo', tipo: 'Serviço', cfop: '1.933', cst: null },
    why: 'Nota de serviço: tipo Serviço. O prestador é de Manaus, dentro do estado: CFOP 1.933. Veio boleto: A Prazo.' },
  { id: 'servsp', doc: 'nfse', emit: 'PAULISTA AUTOMACAO COMERCIAL LTDA', cnpjE: '09.775.104/0001-30', cid: 'São Paulo/SP', reg: 'normal', pag: 'pix', cfopN: '—', nat: 'Prestação de serviço',
    itens: [['SUPORTE TECNICO REMOTO - BALANCAS', 'SV', 1, 680]],
    imp: { cfop: '1.933', cst: '' }, ans: { dep: null, pag: 'A Vista', tipo: 'Serviço', cfop: '2.933', cst: null },
    why: 'Serviço de prestador de São Paulo, fora do estado: CFOP 2.933. Pago por transferência: A Vista.' },
  { id: 'cte', doc: 'cte', emit: 'TRANSPORTADORA RIO NEGRO LTDA', cnpjE: '14.886.020/0001-73', cid: 'Manaus/AM', reg: 'normal', pag: 'boleto', cfopN: '5.353', nat: 'Prestação de serviço de transporte',
    itens: [['FRETE - 1.240 KG CARGA REFRIGERADA', 'SV', 1, 980]],
    imp: { cfop: '', cst: '' }, ans: { dep: null, pag: 'A Prazo', tipo: 'Serviço', cfop: null, cst: null },
    why: 'CT-e é o documento do frete. Entra como Serviço. Cobrado em boleto: A Prazo.' },
  { id: 'flv', doc: 'nfe', emit: 'HORTIFRUTI SAO JOSE ME', cnpjE: '40.551.903/0001-27', cid: 'Iranduba/AM', reg: 'simples', pag: 'pix', cfopN: '5.102', nat: 'Venda de mercadoria',
    itens: [['BANANA PRATA KG', 'KG', 180, 4.2], ['TOMATE LONGA VIDA KG', 'KG', 95, 6.8], ['CEBOLA BRANCA KG', 'KG', 60, 5.1]],
    imp: { cfop: '1.102', cst: '102' }, ans: { dep: 'L', pag: 'A Vista', tipo: 'Compra para Revenda', cfop: '1.102', cst: '090' },
    why: 'Hortifruti (FLV) é revenda: Loja. Pago por transferência: A Vista. Fornecedor do Simples com CFOP 1.102: CST 090.' },
  { id: 'limp', doc: 'nfe', emit: 'DISTRIBUIDORA LIMPA MAIS LTDA', cnpjE: '22.315.840/0001-64', cid: 'Manaus/AM', reg: 'normal', pag: 'boleto', cfopN: '5.102', nat: 'Venda de mercadoria adquirida de terceiros',
    itens: [['AGUA SANITARIA 5L', 'GL', 10, 12.9], ['DESINFETANTE LAVANDA 5L', 'GL', 6, 18.5], ['SACO DE LIXO 100L C/100', 'PCT', 5, 42]],
    obs: 'Material para limpeza da loja.',
    imp: { cfop: '1.102', cst: '041' }, ans: { dep: 'D', pag: 'A Prazo', tipo: 'Compra para Consumo', cfop: '1.556', cst: '041' },
    why: 'Limpeza da loja é uso e consumo: Depósito, CFOP 1.556. Fornecedor fora do Simples: CST 041.' },
  { id: 'gond', doc: 'nfe', emit: 'BISCOITOS RIO NEGRO INDUSTRIA LTDA', cnpjE: '03.778.115/0001-48', cid: 'Manaus/AM', reg: 'normal', pag: 'boleto', cfopN: '5.401', nat: 'Venda de produção do estabelecimento c/ ST',
    itens: [['BISCOITO RECHEADO CHOCOLATE 130G', 'UN', 60, 2.39], ['BISCOITO CREAM CRACKER 400G', 'UN', 40, 5.49], ['ROSQUINHA DE COCO 350G', 'UN', 36, 4.79]],
    imp: { cfop: '1.401', cst: '660' }, ans: { dep: 'L', pag: 'A Prazo', tipo: 'Compra para Revenda', cfop: '1.403', cst: '060' },
    why: 'Gôndola é revenda: Loja. Com substituição tributária lançamos 1.403, nunca 1.401. O CST 660 vira 060.' },
  { id: 'cong', doc: 'nfe', emit: 'DISTRIBUIDORA POLO FRIO ME', cnpjE: '35.019.662/0001-09', cid: 'Manaus/AM', reg: 'simples', pag: 'pix', cfopN: '5.405', nat: 'Venda de mercadoria c/ ST (substituído)',
    itens: [['LASANHA BOLONHESA 600G', 'UN', 30, 13.9], ['HAMBURGUER BOVINO C/12 672G', 'CX', 20, 16.5], ['BATATA PRE-FRITA 2KG', 'PCT', 15, 24.9]],
    imp: { cfop: '1.403', cst: '500' }, ans: { dep: 'L', pag: 'A Vista', tipo: 'Compra para Revenda', cfop: '1.403', cst: '060' },
    why: 'Congelados são revenda: Loja. Pago por transferência: A Vista. Produto com ST (1.403) de fornecedor do Simples leva CST 060. O 500 do XML não serve.' },
  { id: 'exp', doc: 'nfe', emit: 'PAPELARIA CENTRAL ME', cnpjE: '12.660.318/0001-92', cid: 'Manaus/AM', reg: 'simples', pag: 'boleto', cfopN: '5.102', nat: 'Venda de mercadoria adquirida de terceiros',
    itens: [['PAPEL A4 75G CX C/10 RESMAS', 'CX', 2, 289], ['BOBINA TERMICA 80X40 C/30', 'CX', 3, 96.9], ['CANETA ESFEROGRAFICA AZUL C/50', 'CX', 1, 39.9]],
    obs: 'Material de escritório e dos caixas.',
    imp: { cfop: '1.102', cst: '102' }, ans: { dep: 'D', pag: 'A Prazo', tipo: 'Compra para Consumo', cfop: '1.556', cst: '090' },
    why: 'Material de expediente é uso e consumo: Depósito, CFOP 1.556. Fornecedor do Simples: CST 090. Boleto: A Prazo.' }
];

const SORT = [
  ['Picanha bovina resfriada', 'Açougue', 'R'], ['Frango congelado inteiro', 'Congelados', 'R'], ['Lasanha congelada 600g', 'Congelados', 'R'],
  ['Presunto fatiado', 'Frios', 'R'], ['Banana prata', 'Hortifruti (FLV)', 'R'], ['Alface crespa', 'Hortifruti (FLV)', 'R'],
  ['Arroz tipo 1 5kg', 'Gôndola', 'R'], ['Feijão carioca 1kg', 'Gôndola', 'R'], ['Iogurte de morango', 'Laticínios', 'R'],
  ['Queijo mussarela', 'Laticínios', 'R'], ['Detergente para vender na gôndola', 'Limpeza · prateleira', 'R'], ['Refrigerante 2L', 'Bebidas', 'R'],
  ['Detergente para lavar o açougue', 'Limpeza da loja', 'C'], ['Água sanitária da limpeza', 'Limpeza da loja', 'C'], ['Sabonete líquido do banheiro', 'Higiene', 'C'],
  ['Papel A4', 'Expediente', 'C'], ['Bobina térmica do caixa', 'Expediente', 'C'], ['Bandeja de isopor', 'Embalagem', 'C'],
  ['Filme PVC para embalar carne', 'Embalagem', 'C'], ['Luva descartável do açougue', 'Material para produção', 'C'], ['Etiqueta da balança', 'Expediente', 'C'],
  ['TV do painel de ofertas', 'Equipamento', 'P'], ['Notebook do escritório', 'Equipamento', 'P'], ['Mesa de escritório', 'Móvel', 'P'],
  ['Compressor da câmara fria', 'Equipamento', 'P'], ['Armário de aço', 'Móvel', 'P'], ['Máquina de moer carne', 'Máquina', 'P'],
  ['Serra fita para ossos', 'Máquina', 'P'], ['Freezer horizontal', 'Equipamento', 'P']
];
const BUCKETS = [
  { c: 'R', t: 'Revenda', s: 'Tipo: Compra para Revenda · Depósito: Loja' },
  { c: 'C', t: 'Uso e consumo', s: 'Tipo: Compra para Consumo · Depósito: Depósito' },
  { c: 'P', t: 'Patrimônio', s: 'Tipo: Bens e Patrimônio · Depósito: Depósito' }
];
const bname = c => BUCKETS.find(b => b.c === c).t;

const MACETE = ['540', '640', '140', '560', '660', '160', '541', '520', '500', '670', '260', '141'];
const SIMPLES_Q = [
  { big: '1.102', sub: 'Fornecedor do Simples Nacional', o: ['090', '040', '041', '000'], why: 'Simples Nacional no 1.102: CST 090.' },
  { big: '1.403', sub: 'Fornecedor do Simples Nacional', o: ['060', '090', '070', '040'], why: 'Simples Nacional no 1.403: CST 060.' },
  { big: '1.556', sub: 'Uso e consumo · fornecedor do Simples', o: ['090', '041', '040', '060'], why: 'Uso e consumo do Simples: 090.' },
  { big: '1.556', sub: 'Uso e consumo · fornecedor fora do Simples', o: ['041', '090', '040', '000'], why: 'Uso e consumo fora do Simples: 041.' },
  { big: '1.152', sub: 'Transferência de itens isentos', o: ['040', '020', '060', '090'], why: 'Transferência de isentos: 1.152 com 040.' },
  { big: '1.152', sub: 'Transferência de produção própria', o: ['020', '040', '060', '000'], why: 'Produção própria: 1.152 com 020.' },
  { big: '1.409', sub: 'Transferência com substituição tributária', o: ['060', '040', '070', '020'], why: 'Transferência com ST: 1.409 com 060.' },
  { big: '1.557', sub: 'Transferência de uso e consumo', o: ['040', '090', '041', '060'], why: 'Uso e consumo entre lojas: 1.557 com 040.' }
];
const CFOP_Q = [
  { big: '1.101', sub: 'O sistema puxou da nota (industrialização)', o: ['1.102', '1.101', '1.152', '1.403'], why: '1.101 vira 1.102. Só usamos CFOP de comercialização.' },
  { big: '1.401', sub: 'O sistema puxou da nota (industrialização c/ ST)', o: ['1.403', '1.401', '1.409', '1.102'], why: '1.401 vira 1.403. Troca sempre.' },
  { big: 'Serviço', sub: 'Prestador de Manaus (AM)', o: ['1.933', '2.933', '1.556', '1.102'], why: 'Dentro do estado: 1.933.' },
  { big: 'Serviço', sub: 'Prestador de São Paulo (SP)', o: ['2.933', '1.933', '1.556', '1.552'], why: 'Fora do estado: 2.933.' },
  { big: 'Consumo', sub: 'Material de uso e consumo comprado de fornecedor', o: ['1.556', '1.557', '1.551', '1.102'], why: 'Compra de uso e consumo: 1.556.' },
  { big: 'Consumo', sub: 'Uso e consumo vindo de outra loja do grupo', o: ['1.557', '1.556', '1.152', '1.409'], why: 'Uso e consumo em transferência: 1.557.' },
  { big: 'Transferência', sub: 'Itens isentos vindos da filial', o: ['1.152', '1.409', '1.557', '1.102'], why: 'Isentos em transferência: 1.152.' },
  { big: 'Transferência', sub: 'Produtos com substituição tributária', o: ['1.409', '1.152', '1.403', '1.557'], why: 'Transferência com ST: 1.409.' },
  { big: 'Patrimônio', sub: 'Bem vindo por transferência de outra loja', o: ['1.552', '1.551', '1.557', '1.556'], why: 'Bens em transferência: 1.552.' },
  { big: 'Patrimônio', sub: 'Bem comprado para o ativo da loja', o: ['1.551', '1.552', '1.556', '1.102'], why: 'Compra de bem do ativo: 1.551.' },
  { big: 'Revenda', sub: 'Compra de produto com ST', o: ['1.403', '1.102', '1.409', '1.401'], why: 'Revenda com ST: 1.403.' },
  { big: 'Revenda', sub: 'Compra de produto isento', o: ['1.102', '1.403', '1.101', '1.152'], why: 'Revenda isenta: 1.102.' }
];
const TF = [
  ['Podemos lançar uma compra com CFOP 1.101.', false, 'Só usamos CFOP de comercialização. 1.101 vira 1.102.'],
  ['Quando o fornecedor é do Simples Nacional, o CST tem 4 dígitos.', true, 'No Simples o código é o CSOSN, de 4 dígitos. Alguns sistemas chamam o campo de CST.'],
  ['CST 540 no XML deve ser lançado como 040.', true, 'Troque o primeiro dígito por 0.'],
  ['Uso e consumo de fornecedor fora do Simples usa CST 090.', false, 'Fora do Simples é 041. O 090 é para o Simples.'],
  ['Nota de serviço de prestador de outro estado usa CFOP 1.933.', false, 'Fora do estado é 2.933. O 1.933 é dentro do estado.'],
  ['Na transferência entre lojas, a conta corrente é 2 e o vencimento é a data da entrada.', true, 'Conta 2, vencimento na data da entrada.'],
  ['Fornecedor pago em boleto: conta corrente 45730.', true, 'E o vencimento conforme o boleto físico.'],
  ['O vencimento do boleto é sempre 30 dias depois da emissão.', false, 'O vencimento é conforme o boleto físico.'],
  ['Markup de 66,67% é o mesmo que 40% de margem sobre o preço de venda.', true, 'Custo × 1,6667 = preço. 40% do preço é margem.'],
  ['Antes de fechar o dia, basta tirar o relatório de NF-e lançadas.', false, 'São dois: NF-e lançadas e margens aplicadas.'],
  ['Produto de uso e consumo vai para o depósito Loja.', false, 'Uso e consumo não tem saída: vai para o Depósito.'],
  ['Bonificação vem sem boleto e com CFOP 5.910 na nota.', true, 'É assim que se reconhece a bonificação.'],
  ['Pagamento por transferência bancária é lançado como A Prazo.', false, 'Transferência é A Vista. Boleto é A Prazo.'],
  ['Material de limpeza usado na loja entra como Compra para Revenda.', false, 'Se a loja consome, é Compra para Consumo.'],
  ['Para bens e patrimônio, usamos o CST que vier na nota.', true, 'Patrimônio: CST conforme a nota.'],
  ['Confira o CNPJ só na nota fiscal; o boleto não precisa.', false, 'Confira na nota e no boleto.'],
  ['CT-e de frete entra como Serviço.', true, 'CT-e é conhecimento de transporte: Serviço.'],
  ['Hortifruti (FLV) é Compra para Consumo.', false, 'FLV vai para a gôndola: Compra para Revenda.']
];
const MC = [
  ['Fornecedor do Simples Nacional, produto isento no CFOP 1.102. Qual CST?', ['090', '040', '041', '000'], 'No Simples, o 1.102 leva CST 090.'],
  ['Fornecedor do Simples Nacional, produto com ST no CFOP 1.403. Qual CST?', ['060', '090', '070', '040'], 'No Simples, o 1.403 leva CST 060.'],
  ['Qual destes CSTs NÃO é aceito no CFOP 1.102 (fornecedor fora do Simples)?', ['060', '000', '020', '041'], 'No 1.102 aceitamos 000, 020, 040 e 041. O 060 é de substituição tributária.'],
  ['No CFOP 1.403 (fornecedor fora do Simples), quais CSTs podemos dar entrada?', ['060 ou 070', '000 ou 020', '040 ou 041', 'Só 090'], 'Substituição tributária aceita 060 e 070.'],
  ['Antes de fechar o expediente, quais relatórios você tira?', ['NF-e lançadas e margens aplicadas', 'Só o de NF-e lançadas', 'Contas a pagar e estoque', 'Vendas do dia e margens'], 'Relatório de NF-e lançadas e relatório de margens aplicadas.'],
  ['Onde você confere o CNPJ da loja?', ['Na nota fiscal e no boleto', 'Só na nota fiscal', 'Só no boleto', 'No pedido de compra'], 'Os dois documentos precisam estar no CNPJ ' + CNPJ_LOJA + '.'],
  ['Chegou um CT-e de frete. Qual o tipo de entrada?', ['Serviço', 'Compra para Consumo', 'Compra para Revenda', 'Bonificação'], 'CT-e é conhecimento de transporte: entra como Serviço.'],
  ['Como reconhecer uma nota de bonificação?', ['Sem boleto e com CFOP 5.910', 'Com boleto e CFOP 5.102', 'Vem de outra loja do grupo', 'Tem CST 090'], 'Bonificação vem sem boleto, com CFOP 5.910.'],
  ['Transferência de produção própria: qual CFOP e CST?', ['1.152 e 020', '1.409 e 060', '1.152 e 040', '1.557 e 040'], 'Produção própria: 1.152 com CST 020.'],
  ['Transferência de produtos isentos: qual CFOP e CST?', ['1.152 e 040', '1.152 e 020', '1.102 e 040', '1.409 e 060'], 'Isentos: 1.152 com CST 040.'],
  ['TV para o painel de ofertas da loja. Qual o tipo de entrada?', ['Bens e Patrimônio', 'Compra para Revenda', 'Compra para Consumo', 'Serviço'], 'A TV fica na loja, não é vendida: é patrimônio.'],
  ['Detergente que vai ser vendido na gôndola. Qual o tipo de entrada?', ['Compra para Revenda', 'Compra para Consumo', 'Bonificação', 'Bens e Patrimônio'], 'O destino decide: se vai ser vendido, é revenda e entra na Loja.'],
  ['Material de uso e consumo vindo do CD. Qual CFOP?', ['1.557', '1.556', '1.152', '1.409'], 'Uso e consumo em transferência tem código próprio: 1.557.'],
  ['O fornecedor mandou o boleto junto da nota. Forma de pagamento?', ['A Prazo', 'A Vista', 'Bonificação', 'Transferência'], 'Boleto é A Prazo. Transferência bancária é A Vista.']
];
const CNPJ_WRONG = ['19.234.190/0001-25', '19.234.190/0007-52', '19.243.190/0007-25', '19.234.109/0007-25', '19.234.190/0070-25', '91.234.190/0007-25'];

/* ================= geradores de rodada ================= */
const fmtDate = d => d.toLocaleDateString('pt-BR');
function mkSystem(s) {
  const ent = new Date(); const em = new Date(ent); em.setDate(em.getDate() - (1 + (Math.random() * 3 | 0)));
  return { ...s, nf: String(700000 + (Math.random() * 99999 | 0)).padStart(9, '0'), emis: fmtDate(em), entr: fmtDate(ent) };
}
function mkSort(n) {
  const r = shuffle(SORT.filter(x => x[2] === 'R')).slice(0, Math.ceil(n * .4));
  const c = shuffle(SORT.filter(x => x[2] === 'C')).slice(0, Math.ceil(n * .35));
  const p = shuffle(SORT.filter(x => x[2] === 'P')).slice(0, n - r.length - c.length);
  return { n, time: n * 5 + 6, items: shuffle([...r, ...c, ...p]).map(([t, s, c]) => ({ t, s, c })) };
}
function macItem(x) {
  const a = '0' + x.slice(1);
  const pool = ['040', '041', '060', '070', '020', '000', '090'].filter(v => v !== a);
  const o = shuffle([a, x, ...pickN(pool, 2)]);
  return { tag: 'CST no XML do fornecedor', big: x, sub: 'Como lançamos?', o, a, why: `Troque o primeiro dígito por 0: ${x} vira ${a}.` };
}
function mkRapid(kind, n) {
  let items;
  const fromQ = q => ({ tag: isCode(q.big) ? 'CFOP' : 'Situação', big: q.big, sub: q.sub, o: shuffle(q.o), a: q.o[0], why: q.why });
  if (kind === 'macete') items = pickN(MACETE, n).map(macItem);
  else if (kind === 'simples') items = pickN(SIMPLES_Q, n).map(q => ({ ...fromQ(q), tag: 'CFOP · qual CST?' }));
  else if (kind === 'cst') items = shuffle([...pickN(MACETE, Math.ceil(n / 2)).map(macItem), ...pickN(SIMPLES_Q, Math.floor(n / 2)).map(q => ({ ...fromQ(q), tag: 'CFOP · qual CST?' }))]);
  else items = pickN(CFOP_Q, n).map(q => ({ ...fromQ(q), tag: isCode(q.big) ? 'Veio no sistema · qual lançamos?' : 'Qual CFOP?' }));
  const title = { macete: 'Macete do CST', simples: 'CST no Simples Nacional', cst: 'Macete do CST', cfop: 'CFOP certo' }[kind];
  return { kind, title, per: 10, items };
}
function mkTF(n) { return { items: pickN(TF, n).map(([s, a, why]) => ({ s, a, why })) }; }
function mkMC() { const [q, o, why] = MC[Math.random() * MC.length | 0]; return { q, o: shuffle(o), a: o[0], why, title: 'Pergunta do guia' }; }
function mkMarkup() {
  const custo = [3, 4.5, 6, 7.2, 9.9, 12, 15.6, 24, 36.9, 18.3, 27.6][Math.random() * 11 | 0];
  const venda = Math.round(custo / 0.6 * 100) / 100;
  const opts = [venda, custo * 1.4, custo * 1.6, custo * 1.25].map(v => brl(Math.round(v * 100) / 100));
  return { q: `O produto custou ${brl(custo)}. Aplicando o markup geral da loja de 66,67%, qual o preço de venda?`, o: shuffle(opts), a: opts[0],
    why: `${brl(custo)} × 1,6667 = ${brl(venda)}. Desse preço, 40% (${brl(venda - custo)}) é margem e 60% é custo. Markup 66,67% = 40% de margem sobre o preço de venda.`,
    title: 'Markup na ponta do lápis', ctx: { custo } };
}
function mkCnpj() {
  const bad = Math.random() * 3 | 0, wrong = CNPJ_WRONG[Math.random() * CNPJ_WRONG.length | 0];
  const sup = pickN(SCEN.filter(s => !s.root), 3);
  const kinds = shuffle(['nfe', 'boleto', 'nfe']);
  return { bad, docs: kinds.map((k, i) => ({ k, emit: sup[i].emit, cnpj: i === bad ? wrong : CNPJ_LOJA, valor: sup[i].itens.reduce((t, x) => t + x[2] * x[3], 0) })) };
}
const FIN_CASES = [
  { ctx: 'Nota de LATICINIOS PIRACANJUBA com boleto anexo, vencimento impresso 18/11/2026.', conta: '45730', venc: 'Conforme o boleto físico', why: 'Fornecedor pago em boleto: conta corrente 45730 e vencimento conforme o boleto físico.' },
  { ctx: 'Nota de FRIGORIFICO BOI NORTE com boleto anexo, vencimento impresso 05/11/2026.', conta: '45730', venc: 'Conforme o boleto físico', why: 'Boleto: conta 45730 e a data que está no boleto físico.' },
  { ctx: 'Nota de transferência vinda da LOJA PARQUE DEZ.', conta: '2', venc: 'Data da entrada', why: 'Transferência entre lojas: conta corrente 2 e vencimento na data da entrada.' },
  { ctx: 'Nota de transferência vinda do CD do Frigorífico Amazonas.', conta: '2', venc: 'Data da entrada', why: 'Transferência entre lojas: conta 2, vencimento na data da entrada.' },
  { ctx: 'Nota de PAPELARIA CENTRAL com boleto anexo, vencimento impresso 28/11/2026.', conta: '45730', venc: 'Conforme o boleto físico', why: 'Boleto: conta 45730, vencimento conforme o boleto físico.' }
];
function mkFin() { return FIN_CASES[Math.random() * FIN_CASES.length | 0]; }

function buildPlan(mode) {
  const sys = () => ({ type: 'system', data: mkSystem(SCEN[Math.random() * SCEN.length | 0]) });
  const sysN = n => pickN(SCEN, n).map(s => ({ type: 'system', data: mkSystem(s) }));
  const mcR = d => ({ type: 'mc', data: d });
  switch (mode) {
    case 'match': {
      const s = sysN(4), mcs = pickN(MC, 1)[0];
      return [
        { type: 'sort', data: mkSort(7) }, s[0], { type: 'rapid', data: mkRapid('cst', 5) }, s[1],
        mcR({ q: mcs[0], o: shuffle(mcs[1]), a: mcs[1][0], why: mcs[2], title: 'Pergunta do guia' }),
        { type: 'cnpj', data: mkCnpj() }, s[2], { type: 'tf', data: mkTF(5) }, { type: 'fin', data: mkFin() },
        { type: 'rapid', data: mkRapid('cfop', 5) }, mcR(mkMarkup()), s[3]
      ];
    }
    case 'system': return sysN(5);
    case 'sort': return [{ type: 'sort', data: mkSort(8) }, { type: 'sort', data: mkSort(8) }];
    case 'cst': return [{ type: 'rapid', data: mkRapid('macete', 6) }, { type: 'rapid', data: mkRapid('simples', 6) }];
    case 'cfop': return [{ type: 'rapid', data: mkRapid('cfop', 6) }, { type: 'rapid', data: mkRapid('cfop', 6) }];
    case 'tf': return [{ type: 'tf', data: mkTF(5) }, { type: 'tf', data: mkTF(5) }];
    case 'cnpj': return [0, 1, 2].map(() => ({ type: 'cnpj', data: mkCnpj() }));
    case 'markup': return [0, 1, 2, 3].map(() => mcR(mkMarkup()));
    case 'fin': return pickN(FIN_CASES, 3).map(d => ({ type: 'fin', data: d }));
  }
  return [sys()];
}

const PHASES = [
  { k: 'system', t: 'Tela do sistema', d: 'Lance a nota completa: depósito, pagamento, tipo, CFOP e CST.', g: 'F4' },
  { k: 'sort', t: 'Separe a mercadoria', d: 'Revenda, uso e consumo ou patrimônio? Contra o relógio.', g: 'LOJA' },
  { k: 'cst', t: 'Macete do CST', d: '540 vira 040. E no Simples Nacional, qual vai?', g: '<s>5</s>40' },
  { k: 'cfop', t: 'CFOP certo', d: 'Troca de industrialização, serviço e transferência.', g: '1.403' },
  { k: 'tf', t: 'Verdadeiro ou falso', d: 'Afirmações do guia, uma de cada vez.', g: 'V / F' },
  { k: 'cnpj', t: 'Confira o CNPJ', d: 'Ache o documento que não é da Morada do Sol.', g: '/0007' },
  { k: 'markup', t: 'Markup na ponta do lápis', d: 'Custo × 1,6667 = preço de venda.', g: '66,67%' },
  { k: 'fin', t: 'Financeiro', d: 'Conta corrente e vencimento de cada caso.', g: '45730' }
];
const TYPE_LABEL = { system: 'Tela do sistema', sort: 'Separe a mercadoria', rapid: 'Rápido', tf: 'Verdadeiro ou falso', cnpj: 'Confira o CNPJ', mc: 'Pergunta', fin: 'Financeiro' };

/* ================= som ================= */
let actx = null, soundOn = true;
try { soundOn = localStorage.getItem('lancaCerto.som') !== 'off'; } catch (e) {}
function tone(f, d, type = 'triangle', when = 0, vol = .07) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + when;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + .03);
  } catch (e) {}
}
const sfx = {
  ok() { tone(660, .12); tone(990, .2, 'triangle', .08); },
  bad() { tone(196, .22, 'sawtooth', 0, .04); tone(147, .26, 'sawtooth', .1, .04); },
  tap() { tone(520, .05, 'square', 0, .02); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .24, 'triangle', i * .11)); }
};

/* ================= estado ================= */
const S = { screen: 'home', mode: null, plan: [], idx: 0, score: 0, combo: 0, bestCombo: 0, results: [], sheet: null };
let best = 0;
try { best = +localStorage.getItem('lancaCerto.best') || 0; } catch (e) {}
let timers = [], keyFn = null;
const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
const clearTimers = () => { timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = []; };
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('select')) return;
  if (S.screen === 'home' && e.key === 'Enter' && document.activeElement === document.body) { start('match'); return; }
  if (keyFn && !S.sheet) keyFn(e);
});

function show(id) {
  S.screen = id;
  ['home', 'game', 'end'].forEach(s => { $('#' + s).hidden = s !== id; });
  window.scrollTo(0, 0);
}

/* ================= home ================= */
function renderHome() {
  const codes = [['1.102', 'revenda isenta'], ['1.403', 'revenda com ST'], ['1.152', 'transferência'], ['1.409', 'transferência c/ ST'], ['1.556', 'uso e consumo'], ['1.557', 'consumo entre lojas'], ['1.551', 'bens e patrimônio'], ['1.552', 'bens em transferência'], ['1.933', 'serviço no estado'], ['2.933', 'serviço fora'], ['540 → 040', 'macete do CST'], ['090', 'Simples Nacional'], ['45730', 'conta do boleto'], ['66,67%', 'markup geral']];
  const row = codes.map(([c, t]) => `<span>${c}<i>${t}</i></span>`).join('');
  $('#ticker').innerHTML = row + row;
  $('#phases').innerHTML = PHASES.map(p => `<button class="phase" data-k="${p.k}"><span class="glyph">${p.g}</span><h3>${p.t}</h3><p>${p.d}</p></button>`).join('');
  $$('#phases .phase').forEach(b => b.onclick = () => start(b.dataset.k));
  $('#best').innerHTML = best ? `Seu recorde: <b>${best}</b> pts` : 'Cerca de 8 minutos por partida';
}
$('#play').onclick = () => start('match');

/* ================= jogo ================= */
function start(mode) {
  sfx.tap();
  Object.assign(S, { mode, plan: buildPlan(mode), idx: 0, score: 0, combo: 0, bestCombo: 0, results: [], sheet: null });
  $('#score').dataset.v = 0; $('#score').textContent = '0';
  show('game'); renderRound();
}
$('#quit').onclick = () => { clearTimers(); closeSheet(); keyFn = null; show('home'); renderHome(); };
const setMute = () => { $('#mute').textContent = soundOn ? 'Som: on' : 'Som: off'; };
$('#mute').onclick = () => { soundOn = !soundOn; try { localStorage.setItem('lancaCerto.som', soundOn ? 'on' : 'off'); } catch (e) {} setMute(); };
setMute();

function hud() {
  $('#prog').innerHTML = S.plan.map((_, i) => {
    const r = S.results[i];
    const c = r ? (r.frac === 1 ? 'ok' : r.frac > 0 ? 'part' : 'bad') : i === S.idx ? 'cur' : '';
    return `<i class="${c}"></i>`;
  }).join('');
  const cb = $('#combo');
  if (S.combo >= 1) { cb.hidden = false; cb.textContent = `COMBO ×${mult().toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}`; cb.classList.remove('pop'); void cb.offsetWidth; cb.classList.add('pop'); }
  else cb.hidden = true;
}
const mult = () => 1 + Math.min(S.combo, 4) * .25;
function animateScore(v) {
  const el = $('#score'), from = +el.dataset.v || 0; el.dataset.v = v;
  if (reduce) { el.textContent = v; return; }
  const t0 = performance.now();
  const step = t => { const p = Math.min(1, (t - t0) / 700); el.textContent = Math.round(from + (v - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

function renderRound() {
  clearTimers(); keyFn = null;
  const r = S.plan[S.idx], st = $('#stage');
  hud();
  st.classList.remove('enter'); st.innerHTML = '';
  void st.offsetWidth; st.classList.add('enter');
  R[r.type](r.data, st, finish);
  window.scrollTo({ top: 0 });
}
const head = (label, title, lede) =>
  `<div class="round-head"><span class="eyebrow">Rodada ${S.idx + 1} de ${S.plan.length} · ${label}</span><h2>${title}</h2>${lede ? `<p>${lede}</p>` : ''}</div>`;

function finish(res) {
  clearTimers(); keyFn = null;
  const m = mult(), pts = Math.round(res.frac * 100 * m);
  S.score += pts;
  S.combo = res.frac === 1 ? S.combo + 1 : 0;
  S.bestCombo = Math.max(S.bestCombo, S.combo);
  S.results.push({ title: res.title, frac: res.frac, why: res.why, lines: res.lines || [] });
  if (!res.silent) res.frac === 1 ? sfx.ok() : sfx.bad();
  if (res.frac === 1 && res.big) confetti(60);
  animateScore(S.score);
  hud();
  openSheet(res, pts, m);
}

function openSheet(res, pts, m) {
  S.sheet = true;
  const last = S.idx >= S.plan.length - 1;
  const kind = res.frac === 1 ? 'ok' : res.frac > 0 ? 'part' : 'bad';
  const head = { ok: ['Perfeito', ['Lançamento certo!', 'Mandou bem!', 'Na mosca!', 'Isso mesmo!'][Math.random() * 4 | 0]], part: ['Parcial', 'Quase lá'], bad: ['Errou', 'Não foi dessa vez'] }[kind];
  const lines = (res.lines || []).map(l => `<li class="${l.ok ? 'y' : 'n'}"><span class="m">${l.ok ? '✓' : '✗'}</span><span>${l.label}</span><span class="v">${l.ok ? `<b>${l.expected}</b>` : `<s>${l.given || '—'}</s> → <b>${l.expected}</b>`}</span></li>`).join('');
  $('#sheetIn').innerHTML = `
    <div class="verdict"><span class="badge ${kind}">${head[0]}</span><h3>${head[1]}</h3>
      <span class="pts">+${pts}${m > 1 && pts ? `<small>combo ×${String(m).replace('.', ',')}</small>` : ''}</span></div>
    ${lines ? `<ul class="lines">${lines}</ul>` : ''}
    ${res.why ? `<p class="why">${res.why}</p>` : ''}
    <button class="btn ${kind === 'ok' ? 'hl' : ''}" id="nextBtn">${last ? 'Ver resultado' : 'Próxima rodada'} →</button>`;
  $('#sheet').classList.add('open'); $('#scrim').classList.add('open');
  const nb = $('#nextBtn'); nb.onclick = next;
  later(() => nb.focus({ preventScroll: true }), 300);
}
function closeSheet() { S.sheet = null; $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open'); }
function next() { closeSheet(); S.idx++; if (S.idx >= S.plan.length) endGame(); else renderRound(); }

/* ================= rodadas ================= */
const R = {};

/* ---- tela do sistema ---- */
function danfe(d) {
  const tot = d.itens.reduce((t, x) => t + x[2] * x[3], 0);
  const title = { nfe: ['DANFE', 'Documento auxiliar da Nota Fiscal Eletrônica'], nfse: ['NFS-e', 'Nota Fiscal de Serviço Eletrônica'], cte: ['DACTE', 'Documento auxiliar do Conhecimento de Transporte'] }[d.doc];
  const pay = PAY[d.pag];
  const obs = [d.reg === 'simples' ? SIMPLES_TXT : '', d.obs || ''].filter(Boolean).join(' ');
  return `<article class="danfe" aria-label="Nota recebida">
    <header><b>${title[0]}</b><span>${title[1]}</span><span class="nf">Nº ${d.nf}<br>Série 1</span></header>
    <div class="dz"><small>${d.doc === 'nfe' ? 'Emitente' : 'Prestador'}</small><strong>${d.emit}</strong><span>${d.root ? 'Mesma empresa · CNPJ raiz 19.234.190' : 'CNPJ ' + d.cnpjE} · ${d.cid}</span></div>
    <div class="dz-row"><div class="dz"><small>Natureza da operação</small><strong>${d.nat}</strong></div>
      <div class="dz"><small>CFOP</small><strong class="mono">${d.cfopN}</strong></div></div>
    <div class="dz"><small>${d.doc === 'nfe' ? 'Destinatário' : 'Tomador'}</small><strong>FRIGORIFICO AMAZONAS · MORADA DO SOL</strong><span class="mono">CNPJ ${CNPJ_LOJA}</span></div>
    <table class="ditems"><thead><tr><th>${d.doc === 'nfe' ? 'Produto' : 'Descrição'}</th><th style="text-align:right">Qtd</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${d.itens.map(x => `<tr><td>${x[0]}</td><td class="n">${num(x[2], x[1] === 'KG' ? 1 : 0)} ${x[1]}</td><td class="n">${num(x[2] * x[3])}</td></tr>`).join('')}
      <tr><td><b>Valor total</b></td><td></td><td class="n"><b>${num(tot)}</b></td></tr></tbody></table>
    <div class="pay ${d.pag}"><small>Cobrança</small><strong>${pay[0]}</strong><span>${pay[1]}</span></div>
    ${obs ? `<div class="dz" style="border-bottom:0"><small>Informações complementares</small><p>${obs}</p></div>` : ''}
    <div class="bars" aria-hidden="true"></div>
  </article>`;
}
function wsel(id, label, opts, ans, cur, cls = '') {
  if (ans === null || ans === undefined) return `<label class="wf ${cls}"><span>${label}</span><select id="${id}" disabled><option>${cur || '—'}</option></select><span class="na">não se aplica nesta nota</span></label>`;
  return `<label class="wf ${cls}"><span>* ${label}</span><select id="${id}" class="req ${cur ? 'filled' : ''}">${cur ? '' : '<option value="">Selecione…</option>'}${opts.map(o => `<option${o === cur ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
}
R.system = (d, el, done) => {
  const a = d.ans, tot = d.itens.reduce((t, x) => t + x[2] * x[3], 0);
  const qtd = d.itens.reduce((t, x) => t + x[2], 0);
  const cstOpts = CSTS.includes(d.imp.cst) || !d.imp.cst ? CSTS : [d.imp.cst, ...CSTS];
  const cfopOpts = CFOPS.includes(d.imp.cfop) || !d.imp.cfop ? CFOPS : [d.imp.cfop, ...CFOPS];
  const itemEdit = a.cfop !== null || a.cst !== null;
  el.innerHTML = head('Tela do sistema', 'Dê entrada nesta nota', 'Leia a nota recebida e preencha os campos com <b>*</b>. O sistema já importou CFOP e CST do XML: confira e corrija se precisar. Depois clique em <b>Gravar</b>.') + `
  <div class="sys-layout">
    ${danfe(d)}
    <div class="win" id="win">
      <div class="win-title"><span>Cadastro de Entrada de Produto</span><span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
      <div class="wsec"><div class="wgrid">
        <label class="wf"><span>Tipo</span><input value="${d.doc === 'nfe' ? 'NF' : d.doc === 'cte' ? 'CT-e' : 'NFS-e'}" disabled></label>
        <label class="wf"><span>NF (F2)</span><input value="${d.nf}" disabled></label>
        <label class="wf span2"><span>Fornecedor (F2)</span><input value="${d.emit}" disabled></label>
        ${wsel('f-dep', 'Depósito', [DEP.L, DEP.D], a.dep, '')}
        <label class="wf"><span>Empresa</span><input value="FRIGORIFICO AMAZONAS" disabled></label>
        <label class="wf"><span>Emissão</span><input value="${d.emis}" disabled></label>
        <label class="wf"><span>Entrada</span><input value="${d.entr}" disabled></label>
        ${wsel('f-pag', 'Forma de Pagto', PAGTOS, a.pag, '')}
        ${wsel('f-tipo', 'Tipo de entrada', TIPOS, a.tipo, '', 'span2')}
        <label class="wf"><span>Modelo da Nota Fiscal</span><input value="${d.doc === 'nfe' ? '55 - NF-e' : d.doc === 'cte' ? '57 - CT-e' : 'NFS-e'}" disabled></label>
      </div>
      <div class="wtotal" style="margin-top:10px"><span>Valor Nota:</span><b class="mono">${num(tot)}</b></div></div>
      <div class="wsec">
        <p class="wsec-t">Produtos (F4) · alterar itens</p>
        <div class="wgrid">
          ${itemEdit ? wsel('f-cst', 'CST', cstOpts, a.cst, d.imp.cst) : `<label class="wf"><span>CST</span><input value="${d.imp.cst || '—'}" disabled><span class="na">não avaliado nesta nota</span></label>`}
          ${itemEdit ? (a.cfop !== null ? wsel('f-cfop', 'CFOP', cfopOpts, a.cfop, d.imp.cfop) : `<label class="wf"><span>CFOP</span><input value="${d.imp.cfop || '—'}" disabled></label>`) : `<label class="wf"><span>CFOP</span><input value="${d.imp.cfop || '—'}" disabled><span class="na">não avaliado nesta nota</span></label>`}
        </div>
        ${itemEdit ? '<p class="na" style="margin:8px 0 0;font-size:11px;color:#6b7386">A alteração vale para todos os itens da nota.</p>' : ''}
      </div>
      <div class="wtable-wrap"><table class="wtable"><thead><tr><th>Descrição</th><th>Qtde</th><th>Unitário</th><th>Total</th><th>CFOP</th><th>CST</th></tr></thead>
        <tbody>${d.itens.map(x => `<tr><td>${x[0]}</td><td class="n">${num(x[2], 2)}</td><td class="n">${num(x[3], 4)}</td><td class="n">${num(x[2] * x[3])}</td><td class="code c-cfop">${d.imp.cfop || ''}</td><td class="code c-cst">${d.imp.cst || ''}</td></tr>`).join('')}</tbody></table></div>
      <div class="wbar"><span>Qtde: ${num(qtd, 3)} · Itens: ${d.itens.length}</span><span>Em azul produtos controlados.</span></div>
      <div id="wmsg"></div>
      <div class="wbtns">
        <button class="wbtn" disabled>Importar<br>NFE</button>
        <button class="wbtn" disabled>Visualizar<br>lotes</button>
        <button class="wbtn" disabled>Duplicatas</button>
        <button class="wbtn" disabled>Imprimir</button>
        <button class="wbtn go" id="gravar">Gravar</button>
      </div>
      <div class="wfoot">Para alterar a nota de entrada, é preciso realizar a exclusão e dar entrada novamente na mesma!</div>
    </div>
  </div>`;

  const fields = [['Depósito', 'f-dep', a.dep && DEP[a.dep]], ['Forma de pagto', 'f-pag', a.pag], ['Tipo de entrada', 'f-tipo', a.tipo], ['CFOP', 'f-cfop', a.cfop], ['CST', 'f-cst', a.cst]]
    .filter(f => f[2]);
  fields.forEach(([, id]) => {
    const s = $('#' + id, el);
    s.addEventListener('change', () => {
      sfx.tap(); s.classList.toggle('filled', !!s.value);
      const ph = s.querySelector('option[value=""]'); if (ph && s.value) ph.remove();
      if (id === 'f-cfop' || id === 'f-cst') {
        const cls = id === 'f-cfop' ? '.c-cfop' : '.c-cst', orig = id === 'f-cfop' ? d.imp.cfop : d.imp.cst;
        $$(cls, el).forEach(td => { td.textContent = s.value; td.classList.toggle('changed', s.value !== orig); });
      }
    });
  });
  $('#gravar', el).onclick = () => {
    const missing = fields.filter(([, id]) => !$('#' + id, el).value);
    if (missing.length) {
      const w = $('#win', el); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); sfx.bad();
      $('#wmsg', el).innerHTML = `<div class="wmsg">Preencha os campos obrigatórios: ${missing.map(m => m[0]).join(', ')}.</div>`;
      return;
    }
    $('#wmsg', el).innerHTML = '';
    let ok = 0;
    const lines = fields.map(([label, id, exp]) => {
      const s = $('#' + id, el), g = s.value, y = g === exp;
      ok += y; s.classList.remove('filled'); s.classList.add(y ? 'ok' : 'bad'); s.disabled = true;
      s.closest('.wf').insertAdjacentHTML('beforeend', `<span class="exp ${y ? '' : 'no'}">${y ? '✓ correto' : '✗ certo: ' + exp}</span>`);
      return { label, given: g.replace(' - MORADA DO SOL', ''), expected: exp.replace(' - MORADA DO SOL', ''), ok: y };
    });
    $('#gravar', el).disabled = true;
    later(() => done({ title: `Entrada: ${d.emit}`, frac: ok / fields.length, lines, why: d.why, big: true }), 650);
  };
};

/* ---- separar mercadoria ---- */
function fly(card, target, ok) {
  if (reduce || !card.animate) return;
  const a = card.getBoundingClientRect(), b = target.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  card.animate(ok
    ? [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.25)`, opacity: 0 }]
    : [{ transform: 'none' }, { transform: 'translateX(-10px) rotate(-3deg)' }, { transform: 'translateX(10px) rotate(3deg)' }, { transform: 'translateY(30px) rotate(8deg)', opacity: 0 }],
    { duration: ok ? 420 : 520, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
}
R.sort = (d, el, done) => {
  el.innerHTML = head('Separe a mercadoria', 'Para onde vai cada produto?', 'Toque na categoria certa antes do tempo acabar. O destino do produto decide: vai ser vendido, consumido pela loja ou é um bem?') + `
    <div class="solo" style="max-width:860px">
      <div class="timer" id="tm"><i></i></div>
      <div class="meta"><span id="cnt">1 / ${d.n}</span><span id="secs">${d.time}s</span></div>
      <div class="deck" id="deck"></div>
      <div class="buckets">${BUCKETS.map((b, k) => `<button class="bucket" data-c="${b.c}"><kbd>${k + 1}</kbd><strong>${b.t}</strong><small>${b.s}</small></button>`).join('')}</div>
    </div>`;
  let i = 0, hits = 0, lock = false, left = d.time * 1000, over = false;
  const lines = [];
  const deck = $('#deck', el), bar = $('#tm i', el);
  const card = () => { const it = d.items[i]; deck.innerHTML = `<div class="pcard"><small>${it.s}</small><strong>${it.t}</strong></div>`; $('#cnt', el).textContent = `${i + 1} / ${d.n}`; };
  const end = () => {
    if (over) return; over = true;
    for (let k = lines.length; k < d.n; k++) lines.push({ label: d.items[k].t, given: 'sem resposta', expected: bname(d.items[k].c), ok: false });
    done({ title: 'Separe a mercadoria', frac: hits / d.n, lines, why: 'Revenda (carnes, congelados, frios, FLV, gôndola, laticínios) entra na Loja. Uso e consumo e patrimônio não têm saída: vão para o Depósito.', silent: true });
  };
  const pick = c => {
    if (lock || over) return; lock = true;
    const it = d.items[i], ok = c === it.c, btn = $(`.bucket[data-c="${c}"]`, el);
    ok ? (hits++, sfx.ok()) : sfx.bad();
    btn.classList.add(ok ? 'ok' : 'bad');
    if (!ok) $(`.bucket[data-c="${it.c}"]`, el).classList.add('ok');
    lines.push({ label: it.t, given: bname(c), expected: bname(it.c), ok });
    fly($('.pcard', deck), btn, ok);
    later(() => { $$('.bucket', el).forEach(b => b.classList.remove('ok', 'bad')); i++; lock = false; i >= d.n ? end() : card(); }, ok ? 480 : 900);
  };
  $$('.bucket', el).forEach(b => b.onclick = () => pick(b.dataset.c));
  keyFn = e => { const k = +e.key; if (k >= 1 && k <= 3) pick(BUCKETS[k - 1].c); };
  card();
  const t0 = performance.now();
  every(() => {
    const rem = Math.max(0, left - (performance.now() - t0));
    bar.style.transform = `scaleX(${rem / left})`;
    $('#tm', el).classList.toggle('low', rem < 8000);
    $('#secs', el).textContent = Math.ceil(rem / 1000) + 's';
    if (rem <= 0) { lock = true; end(); }
  }, 100);
};

/* ---- rápido (CST / CFOP) ---- */
R.rapid = (d, el, done) => {
  el.innerHTML = head(d.title, d.kind === 'cfop' ? 'Qual CFOP lançamos?' : 'Qual CST lançamos?', `${d.items.length} perguntas, ${d.per} segundos cada. Use as teclas 1 a 4 se estiver no computador.`) + `
    <div class="solo">
      <div class="timer" id="tm"><i></i></div>
      <div class="meta"><span id="cnt"></span><span id="pts"></span></div>
      <div class="card prompt" id="pr"></div>
      <div class="opts" id="op"></div>
      <div class="inline-why" id="iw" aria-live="polite"></div>
    </div>`;
  let i = 0, hits = 0, lock = false, t0 = 0;
  const lines = [], per = d.per * 1000;
  const render = () => {
    const it = d.items[i]; lock = false; t0 = performance.now();
    $('#cnt', el).textContent = `${i + 1} / ${d.items.length}`;
    $('#pts', el).textContent = `${hits} acerto${hits === 1 ? '' : 's'}`;
    $('#pr', el).innerHTML = `<span class="tag">${it.tag}</span><span class="big ${isCode(it.big) ? '' : 'word'}">${it.big}</span><span class="sub">${it.sub}</span>`;
    $('#op', el).innerHTML = it.o.map((o, k) => `<button class="opt ${isCode(o) ? 'code' : ''}" data-v="${o}"><kbd>${k + 1}</kbd>${o}</button>`).join('');
    $('#iw', el).textContent = '';
    $$('#op .opt', el).forEach(b => b.onclick = () => answer(b.dataset.v));
    const pr = $('#pr', el); if (!reduce && pr.animate) pr.animate([{ transform: 'scale(.94)', opacity: .3 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,1.4,.4,1)' });
  };
  const answer = v => {
    if (lock) return; lock = true;
    const it = d.items[i], ok = v === it.a;
    ok ? (hits++, sfx.ok()) : sfx.bad();
    $$('#op .opt', el).forEach(b => { b.disabled = true; if (b.dataset.v === it.a) b.classList.add('ok'); else if (b.dataset.v === v) b.classList.add('bad'); else b.classList.add('dim'); });
    $('#iw', el).innerHTML = `${ok ? '<b>Certo.</b> ' : v === null ? '<b>Tempo esgotado.</b> ' : '<b>Não.</b> '}${it.why}`;
    lines.push({ label: `${it.big} · ${it.sub}`, given: v === null ? 'sem resposta' : v, expected: it.a, ok });
    later(() => { i++; i >= d.items.length ? done({ title: d.title, frac: hits / d.items.length, lines, why: d.kind === 'cfop' ? 'Só usamos CFOP de comercialização: 1.101 vira 1.102 e 1.401 vira 1.403. Serviço: 1.933 no estado, 2.933 fora. Uso e consumo: 1.556 (compra) e 1.557 (transferência).' : 'Macete: CST com outro primeiro dígito (540, 640, 140) troca o primeiro dígito por 0. No Simples: 1.102 com 090 e 1.403 com 060.', silent: true }) : render(); }, ok ? 900 : 1900);
  };
  keyFn = e => { const k = +e.key; const b = $$('#op .opt', el)[k - 1]; if (b && !b.disabled) answer(b.dataset.v); };
  render();
  const bar = $('#tm i', el);
  every(() => {
    if (lock) return;
    const rem = Math.max(0, per - (performance.now() - t0));
    bar.style.transform = `scaleX(${rem / per})`;
    $('#tm', el).classList.toggle('low', rem < 3000);
    if (rem <= 0) answer(null);
  }, 80);
};

/* ---- verdadeiro ou falso ---- */
R.tf = (d, el, done) => {
  el.innerHTML = head('Verdadeiro ou falso', 'O guia diz isso mesmo?', 'Teclas V e F, ou setas ← →.') + `
    <div class="solo">
      <div class="meta"><span id="cnt"></span><span id="pts"></span></div>
      <div class="card prompt" id="pr" style="min-height:180px;align-content:center"></div>
      <div class="tf-btns"><button class="opt" data-v="1">Verdadeiro</button><button class="opt" data-v="0">Falso</button></div>
      <div class="inline-why" id="iw" aria-live="polite"></div>
    </div>`;
  let i = 0, hits = 0, lock = false; const lines = [];
  const btns = $$('.tf-btns .opt', el);
  const render = () => {
    lock = false; const it = d.items[i];
    $('#cnt', el).textContent = `${i + 1} / ${d.items.length}`; $('#pts', el).textContent = `${hits} acerto${hits === 1 ? '' : 's'}`;
    $('#pr', el).innerHTML = `<span class="tag">Afirmação ${i + 1}</span><p class="qtext">${it.s}</p>`;
    btns.forEach(b => { b.disabled = false; b.className = 'opt'; }); $('#iw', el).textContent = '';
    const pr = $('#pr', el); if (!reduce && pr.animate) pr.animate([{ transform: 'translateX(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.2,.9,.3,1)' });
  };
  const answer = v => {
    if (lock) return; lock = true;
    const it = d.items[i], ok = v === it.a; ok ? (hits++, sfx.ok()) : sfx.bad();
    btns.forEach(b => { b.disabled = true; const bv = b.dataset.v === '1'; b.classList.add(bv === it.a ? 'ok' : bv === v ? 'bad' : 'dim'); });
    $('#iw', el).innerHTML = `<b>${it.a ? 'Verdadeiro.' : 'Falso.'}</b> ${it.why}`;
    lines.push({ label: it.s, given: v ? 'V' : 'F', expected: it.a ? 'V' : 'F', ok });
    later(() => { i++; i >= d.items.length ? done({ title: 'Verdadeiro ou falso', frac: hits / d.items.length, lines, silent: true }) : render(); }, ok ? 1300 : 2300);
  };
  btns.forEach(b => b.onclick = () => answer(b.dataset.v === '1'));
  keyFn = e => { const k = e.key.toLowerCase(); if (k === 'v' || k === 'arrowleft') answer(true); if (k === 'f' || k === 'arrowright') answer(false); };
  render();
};

/* ---- múltipla escolha ---- */
R.mc = (d, el, done) => {
  el.innerHTML = head(d.title || 'Pergunta', d.ctx ? 'Calcule o preço' : 'Responda', '') + `
    <div class="solo">
      <div class="card prompt" style="text-align:left;justify-items:start">${d.ctx ? `<span class="tag">Custo ${brl(d.ctx.custo)} · markup 66,67%</span>` : '<span class="tag">Guia de faturamento</span>'}<p class="qtext">${d.q}</p></div>
      <div class="opts ${d.o.some(o => o.length > 22) ? 'one' : ''}">${d.o.map((o, k) => `<button class="opt ${isCode(o) ? 'code' : ''}" data-i="${k}"><kbd>${k + 1}</kbd>${o}</button>`).join('')}</div>
    </div>`;
  let lock = false;
  const answer = k => {
    if (lock) return; lock = true;
    const v = d.o[k], ok = v === d.a;
    $$('.opt', el).forEach((b, j) => { b.disabled = true; b.classList.add(d.o[j] === d.a ? 'ok' : j === k ? 'bad' : 'dim'); });
    later(() => done({ title: d.title || 'Pergunta do guia', frac: ok ? 1 : 0, lines: [{ label: d.q, given: v, expected: d.a, ok }], why: d.why }), 550);
  };
  $$('.opt', el).forEach(b => b.onclick = () => answer(+b.dataset.i));
  keyFn = e => { const k = +e.key - 1; if (k >= 0 && k < d.o.length) answer(k); };
};

/* ---- CNPJ ---- */
function diffMark(wrong) {
  return [...wrong].map((ch, i) => ch !== CNPJ_LOJA[i] ? `<mark>${ch}</mark>` : ch).join('');
}
R.cnpj = (d, el, done) => {
  el.innerHTML = head('Confira o CNPJ', 'Um destes documentos não é da Morada do Sol', 'Confira o CNPJ do destinatário e toque no documento errado.') + `
    <div class="docs">${d.docs.map((x, i) => `<button class="doc" data-i="${i}">
      <span class="dh"><span>${x.k === 'boleto' ? 'BOLETO' : 'DANFE'}</span><span>${x.k === 'boleto' ? 'Pagador' : 'Destinatário'}</span></span>
      <small>${x.k === 'boleto' ? 'Beneficiário' : 'Emitente'}</small><span>${x.emit}</span>
      <small>${x.k === 'boleto' ? 'Pagador' : 'Destinatário'}</small><span>FRIGORIFICO AMAZONAS LTDA</span>
      <small>CNPJ</small><span class="cnpj">${x.cnpj}</span>
      <small>${x.k === 'boleto' ? 'Valor do documento' : 'Valor total da nota'}</small><span class="mono">${brl(x.valor)}</span>
    </button>`).join('')}</div>`;
  let lock = false;
  const answer = i => {
    if (lock) return; lock = true;
    const ok = i === d.bad, docs = $$('.doc', el);
    docs.forEach((b, j) => { b.disabled = true; if (j === d.bad) { b.classList.add(ok ? 'ok' : 'target'); $('.cnpj', b).innerHTML = diffMark(d.docs[j].cnpj); } else if (j === i) b.classList.add('bad'); });
    later(() => done({ title: 'Confira o CNPJ', frac: ok ? 1 : 0, lines: [{ label: 'CNPJ errado em', given: ok ? '' : `${d.docs[i].emit}`, expected: `${d.docs[d.bad].cnpj}`, ok }], why: `O CNPJ da Morada do Sol é ${CNPJ_LOJA}. Confira na nota e no boleto: um dígito trocado já é outra empresa (ou outra filial).` }), 900);
  };
  $$('.doc', el).forEach(b => b.onclick = () => answer(+b.dataset.i));
  keyFn = e => { const k = +e.key - 1; if (k >= 0 && k < 3) answer(k); };
};

/* ---- financeiro ---- */
R.fin = (d, el, done) => {
  const contas = ['45730', '2', '45370', '1001'], vencs = ['Conforme o boleto físico', 'Data da entrada', 'Data de emissão da nota', '30 dias após a entrada'];
  el.innerHTML = head('Financeiro', 'Lance o financeiro desta nota', 'A conta corrente e o vencimento mudam conforme a forma de pagamento.') + `
    <div class="fin-grid">
      <div class="card prompt" style="text-align:left;justify-items:start"><span class="tag">Nota recebida</span><p class="qtext">${d.ctx}</p></div>
      <div class="win" id="win">
        <div class="win-title"><span>Duplicatas · Lançamento do financeiro</span><span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>
        <div class="wsec"><div class="wgrid">
          ${wsel('f-conta', 'Conta corrente', shuffle(contas), 'x', '')}
          ${wsel('f-venc', 'Data de vencimento', shuffle(vencs), 'x', '')}
        </div></div>
        <div id="wmsg"></div>
        <div class="wbtns"><button class="wbtn" disabled>Cancelar</button><button class="wbtn go" id="gravar">Confirmar</button></div>
      </div>
    </div>`;
  ['f-conta', 'f-venc'].forEach(id => { const s = $('#' + id, el); s.onchange = () => { sfx.tap(); s.classList.toggle('filled', !!s.value); }; });
  $('#gravar', el).onclick = () => {
    const c = $('#f-conta', el), v = $('#f-venc', el);
    if (!c.value || !v.value) { const w = $('#win', el); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); sfx.bad(); $('#wmsg', el).innerHTML = '<div class="wmsg">Escolha a conta corrente e o vencimento.</div>'; return; }
    $('#wmsg', el).innerHTML = '';
    const lines = [['Conta corrente', c, d.conta], ['Vencimento', v, d.venc]].map(([label, s, exp]) => {
      const y = s.value === exp; s.classList.remove('filled'); s.classList.add(y ? 'ok' : 'bad'); s.disabled = true;
      return { label, given: s.value, expected: exp, ok: y };
    });
    $('#gravar', el).disabled = true;
    later(() => done({ title: 'Financeiro', frac: lines.filter(l => l.ok).length / 2, lines, why: d.why }), 500);
  };
};

/* ================= fim ================= */
function endGame() {
  clearTimers(); keyFn = null;
  const n = S.results.length, acc = Math.round(S.results.reduce((t, r) => t + r.frac, 0) / n * 100);
  const perfect = S.results.filter(r => r.frac === 1).length;
  const record = S.mode === 'match' && S.score > best;
  if (record) { best = S.score; try { localStorage.setItem('lancaCerto.best', best); } catch (e) {} }
  const rank = acc >= 90 ? 'Nota 10 no fiscal' : acc >= 75 ? 'Lança com segurança' : acc >= 50 ? 'No caminho certo' : 'Hora de revisar o guia';
  const label = S.mode === 'match' ? 'Partida completa' : 'Treino · ' + PHASES.find(p => p.k === S.mode).t;
  const misses = S.results.filter(r => r.frac < 1);
  $('#end').innerHTML = `
    <div class="end-top">
      <div><span class="eyebrow">${label}</span><h1 style="margin-top:12px">${rank.replace(/(\S+)$/, '<span class="mark">$1</span>')}</h1></div>
      <div class="bigscore" id="bigscore">0<small>pontos${record ? ' · novo recorde' : best && S.mode === 'match' ? ` · recorde ${best}` : ''}</small></div>
    </div>
    <div class="stats">
      <div class="stat"><b>${acc}%</b><span>de acerto</span></div>
      <div class="stat"><b>${perfect}/${n}</b><span>rodadas perfeitas</span></div>
      <div class="stat"><b>${S.bestCombo}</b><span>maior sequência</span></div>
    </div>
    <div class="sec-title"><h2>${misses.length ? 'Revise o que escapou' : 'Nenhum erro. Partida limpa.'}</h2><p>${misses.length ? 'Cada item traz a regra do guia.' : 'Todas as rodadas saíram certas.'}</p></div>
    <div class="review">${S.results.map(r => {
      const p = Math.round(r.frac * 100), c = r.frac === 1 ? 'var(--ok)' : r.frac > 0 ? 'var(--hl)' : 'var(--bad)';
      const wrong = r.lines.filter(l => !l.ok).slice(0, 4).map(l => `${l.label}: <b>${l.expected}</b>`).join(' · ');
      return `<div class="rv"><div class="meter" style="--p:${p};--c:${c}"><span>${p}%</span></div><b>${r.title}</b><p>${r.frac === 1 ? 'Tudo certo.' : (r.why || wrong)}${r.frac < 1 && r.why && wrong ? '<br>' + wrong : ''}</p></div>`;
    }).join('')}</div>
    <div class="end-actions"><button class="btn hl" id="again">Jogar de novo</button><button class="btn ghost" id="home2">Voltar ao início</button></div>`;
  show('end');
  $('#again').onclick = () => start(S.mode);
  $('#home2').onclick = () => { show('home'); renderHome(); };
  const bs = $('#bigscore'), small = bs.querySelector('small').outerHTML, t0 = performance.now();
  const step = t => { const p = reduce ? 1 : Math.min(1, (t - t0) / 1200); bs.innerHTML = Math.round(S.score * (1 - Math.pow(1 - p, 3))) + small; if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  if (acc >= 75) { sfx.win(); confetti(160); }
}

/* ================= confete ================= */
function confetti(n) {
  if (reduce) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
  const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr; const g = c.getContext('2d'); g.scale(dpr, dpr);
  const cs = getComputedStyle(document.documentElement);
  const cols = ['--hl', '--blue', '--ok', '--ink'].map(v => cs.getPropertyValue(v).trim()).concat('#ff8a3d');
  const P = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4,
    r: Math.random() * 6, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, col: cols[Math.random() * cols.length | 0] }));
  const t0 = performance.now();
  const frame = t => {
    const el = t - t0; g.clearRect(0, 0, W, H);
    P.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.col; g.globalAlpha = Math.max(0, 1 - el / 2400); g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); });
    el < 2400 ? requestAnimationFrame(frame) : c.remove();
  };
  requestAnimationFrame(frame);
}

/* ================= boot ================= */
window.claude?.hot?.snapshot?.(() => ({ screen: S.screen, mode: S.mode, plan: S.plan, idx: S.idx, score: S.score, combo: S.combo, bestCombo: S.bestCombo, results: S.results }));
function boot(data) {
  renderHome();
  if (data && data.screen === 'game' && data.plan && data.plan.length && data.idx < data.plan.length) {
    Object.assign(S, data, { sheet: null });
    $('#score').dataset.v = S.score; $('#score').textContent = S.score;
    show('game'); renderRound();
  } else show('home');
}
window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
})();
