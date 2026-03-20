export interface Conjuge {
  nome: string;
  nacionalidade: string;
  profissao: string;
  rg: string;
  orgaoEmissor: string;
  orgaoEmissorUF: string;
  isNovoRG: boolean;
  cpf: string;
  genero: 'Masculino' | 'Feminino';
}

export interface Locador {
  tipo: 'PF' | 'PJ';
  nome: string;
  nacionalidade: string;
  profissao: string;
  rg: string;
  orgaoEmissor: string;
  orgaoEmissorUF: string;
  isNovoRG: boolean;
  cpf: string;
  genero: 'Masculino' | 'Feminino';
  documento: string; // CNPJ if PJ
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  temConjuge: boolean;
  conjuge?: Conjuge;
  representantes?: Representante[];
  cepError?: string;
}

export interface Representante {
  nome: string;
  funcao: string;
  cpf: string;
}

export interface Locataria {
  nome: string;
  tipo: 'PF' | 'PJ';
  nacionalidade?: string;
  profissao?: string;
  documento: string; // CPF or CNPJ
  rg?: string;
  orgaoEmissor?: string;
  orgaoEmissorUF?: string;
  isNovoRG?: boolean;
  genero: 'Masculino' | 'Feminino';
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  temConjuge: boolean;
  conjuge?: Conjuge;
  representantes?: Representante[];
  cepError?: string;
}

export interface Fiador {
  nome: string;
  nacionalidade: string;
  profissao: string;
  rg: string;
  orgaoEmissor: string;
  orgaoEmissorUF: string;
  isNovoRG: boolean;
  cpf: string;
  genero: 'Masculino' | 'Feminino';
  estadoCivil: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  cepError?: string;
  temConjuge: boolean;
  conjuge?: Conjuge;
}

export interface Garantia {
  tipo: 'Caução' | 'Fiador' | 'Seguro Fiança' | 'Nenhuma';
  valor: number;
  mesesCaucao?: number;
  fiador?: Fiador;
  seguradora?: string;
}

export interface Corretor {
  nome: string;
  creci: string;
  imobiliaria?: string;
}

export interface Testemunha {
  nome: string;
  cpf: string;
}

export interface Imovel {
  tipo: 'Casa' | 'Apartamento' | 'Comercial';
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  descricao: string;
  garagens: string;
  pinturaNova: boolean;
  temCondominio: boolean;
  cepError?: string;
}

export interface Condicoes {
  prazoMeses: number;
  dataInicio: string;
  dataTermino: string;
  valorAluguel: number;
  diaPagamento: number;
  indiceReajuste: string;
  multaRescisoria: number;
  pagaIPTU: 'Locador' | 'Locatária';
  pagaCondominio: 'Locador' | 'Locatária';
  condominioIncluso: boolean;
  chavePix: string;
  bancoNome: string;
  bancoCodigo: string;
  agencia: string;
  conta: string;
}

export interface Contract {
  id?: string;
  locadores: Locador[];
  locataria: Locataria;
  imovel: Imovel;
  condicoes: Condicoes;
  garantia: Garantia;
  corretor: Corretor;
  testemunhas: Testemunha[];
  ownerId: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role?: 'corretor' | 'locador' | 'locatario';
}
