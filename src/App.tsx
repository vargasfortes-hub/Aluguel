/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { 
  Plus, 
  FileText, 
  LogOut, 
  User as UserIcon, 
  Home, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Trash2, 
  Eye,
  ChevronRight,
  ChevronLeft,
  Download,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contract, Locador, Locataria, Imovel, Condicoes, Garantia, Corretor, Testemunha } from './types';
import { generateContractMarkdown } from './contractTemplate';
import Markdown from 'react-markdown';
import { addMonths, format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Search, Plus as PlusIcon, Minus, X } from 'lucide-react';
// Remove SignatureCanvas import if no longer needed

const ESTADOS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const BANCOS = [
  { codigo: '', nome: 'Selecione um banco...' },
  { codigo: '001', nome: 'Banco do Brasil S.A.' },
  { codigo: '033', nome: 'Banco Santander (Brasil) S.A.' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '237', nome: 'Banco Bradesco S.A.' },
  { codigo: '341', nome: 'Itaú Unibanco S.A.' },
  { codigo: '077', nome: 'Banco Inter S.A.' },
  { codigo: '260', nome: 'Nu Pagamentos S.A. (Nubank)' },
  { codigo: '422', nome: 'Banco Safra S.A.' },
  { codigo: '633', nome: 'Banco Rendimento S.A.' },
  { codigo: '745', nome: 'Banco Citibank S.A.' },
  { codigo: '756', nome: 'SICOOB (Bancoob)' },
  { codigo: '085', nome: 'Cooperativa Central Ailos' },
  { codigo: '290', nome: 'PagSeguro Internet S.A.' },
  { codigo: '323', nome: 'Mercado Pago' },
  { codigo: '197', nome: 'Stone Pagamentos' },
  { codigo: '237', nome: 'Next' },
  { codigo: '655', nome: 'Banco Votorantim S.A. (BV)' },
  { codigo: '336', nome: 'Banco C6 S.A.' },
  { codigo: '212', nome: 'Banco Original S.A.' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

async function fetchAddressByCep(cep: string) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return { data: null, error: 'CEP deve ter 8 dígitos' };
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return { data: null, error: 'CEP não encontrado' };
    return {
      data: {
        logradouro: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      },
      error: null
    };
  } catch (error) {
    console.error("Error fetching address:", error);
    return { data: null, error: 'Erro ao buscar CEP. Verifique sua conexão.' };
  }
}

function validateCPF(cpf: string) {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;

  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;

  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
}

function validateCNPJ(cnpj: string) {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

function formatCPF(v: string) {
  const clean = v.replace(/\D/g, '');
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

function formatCNPJ(v: string) {
  const clean = v.replace(/\D/g, '');
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

function formatCEP(v: string) {
  const clean = v.replace(/\D/g, '');
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [view, setView] = useState<'list' | 'form' | 'preview'>('list');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [step, setStep] = useState(1);

  // Form State
  const [locadores, setLocadores] = useState<Locador[]>([{ 
    tipo: 'PF',
    nome: '', 
    nacionalidade: 'Brasileiro(a)', 
    profissao: '', 
    rg: '', 
    orgaoEmissor: 'SSP', 
    orgaoEmissorUF: 'SP', 
    isNovoRG: false, 
    cpf: '', 
    genero: 'Masculino',
    documento: '',
    cep: '', 
    endereco: '', 
    numero: '', 
    complemento: '', 
    bairro: '', 
    cidade: '', 
    estado: '',
    temConjuge: false,
    representantes: []
  }]);
  const [locataria, setLocataria] = useState<Locataria>({ 
    nome: '', 
    tipo: 'PF', 
    documento: '', 
    rg: '', 
    orgaoEmissor: 'SSP', 
    orgaoEmissorUF: 'SP', 
    isNovoRG: false, 
    genero: 'Masculino',
    cep: '', 
    endereco: '', 
    numero: '', 
    complemento: '', 
    bairro: '', 
    cidade: '', 
    estado: '', 
    temConjuge: false,
    representantes: [] 
  });
  const [imovel, setImovel] = useState<Imovel>({ 
    cep: '', 
    endereco: '', 
    numero: '', 
    complemento: '', 
    bairro: '', 
    cidade: '', 
    estado: '', 
    descricao: '', 
    garagens: '',
    tipo: 'Casa',
    temCondominio: false,
    pinturaNova: true
  });
  const [condicoes, setCondicoes] = useState<Condicoes>({ 
    prazoMeses: 12, 
    dataInicio: '', 
    dataTermino: '', 
    valorAluguel: 0, 
    diaPagamento: 10, 
    chavePix: '', 
    bancoNome: '', 
    bancoCodigo: '', 
    agencia: '', 
    conta: '',
    indiceReajuste: 'IPCA',
    multaRescisoria: 3,
    pagaIPTU: 'Locatária',
    pagaCondominio: 'Locatária',
    condominioIncluso: false
  });
  const [garantia, setGarantia] = useState<Garantia>({ tipo: 'Caução', valor: 0, mesesCaucao: 3 });
  const [corretor, setCorretor] = useState<Corretor>({ nome: '', creci: '', imobiliaria: '' });
  const [testemunhas, setTestemunhas] = useState<Testemunha[]>([
    { nome: '', cpf: '' },
    { nome: '', cpf: '' }
  ]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'contracts'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
      setContracts(docs);
    }, (error) => {
      console.error("Error fetching contracts:", error);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (condicoes.dataInicio && condicoes.prazoMeses) {
      const start = parseISO(condicoes.dataInicio);
      if (isValid(start)) {
        const end = addMonths(start, condicoes.prazoMeses);
        const formattedEnd = format(end, 'yyyy-MM-dd');
        if (formattedEnd !== condicoes.dataTermino) {
          setCondicoes(prev => ({ ...prev, dataTermino: formattedEnd }));
        }
      }
    }
  }, [condicoes.dataInicio, condicoes.prazoMeses]);

  const handleSave = async () => {
    if (!user) return;
    try {
      const newContract = {
        locadores,
        locataria,
        imovel,
        condicoes,
        garantia,
        corretor,
        testemunhas,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'contracts'), newContract);
      setView('list');
      resetForm();
    } catch (error) {
      console.error("Error saving contract:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este contrato?")) return;
    try {
      await deleteDoc(doc(db, 'contracts', id));
    } catch (error) {
      console.error("Error deleting contract:", error);
    }
  };

  const resetForm = () => {
    setLocadores([{ 
      tipo: 'PF',
      nome: '', 
      nacionalidade: 'Brasileiro(a)', 
      profissao: '', 
      rg: '', 
      orgaoEmissor: 'SSP', 
      orgaoEmissorUF: 'SP', 
      isNovoRG: false, 
      cpf: '', 
      genero: 'Masculino',
      documento: '',
      cep: '', 
      endereco: '', 
      numero: '', 
      complemento: '', 
      bairro: '', 
      cidade: '', 
      estado: '',
      temConjuge: false,
      representantes: []
    }]);
    setLocataria({ 
      nome: '', 
      tipo: 'PF', 
      documento: '', 
      rg: '', 
      orgaoEmissor: 'SSP', 
      orgaoEmissorUF: 'SP', 
      isNovoRG: false, 
      genero: 'Masculino',
      cep: '', 
      endereco: '', 
      numero: '', 
      complemento: '', 
      bairro: '', 
      cidade: '', 
      estado: '', 
      temConjuge: false,
      representantes: [] 
    });
    setImovel({ 
      cep: '', 
      endereco: '', 
      numero: '', 
      complemento: '', 
      bairro: '', 
      cidade: '', 
      estado: '', 
      descricao: '', 
      garagens: '',
      tipo: 'Casa',
      temCondominio: false,
      pinturaNova: true
    });
    setCondicoes({ 
      prazoMeses: 12, 
      dataInicio: '', 
      dataTermino: '', 
      valorAluguel: 0, 
      diaPagamento: 10, 
      chavePix: '', 
      bancoNome: '', 
      bancoCodigo: '', 
      agencia: '', 
      conta: '',
      indiceReajuste: 'IPCA',
      multaRescisoria: 3,
      pagaIPTU: 'Locatária',
      pagaCondominio: 'Locatária',
      condominioIncluso: false
    });
    setGarantia({ tipo: 'Caução', valor: 0, mesesCaucao: 3 });
    setCorretor({ nome: '', creci: '', imobiliaria: '' });
    setTestemunhas([{ nome: '', cpf: '' }, { nome: '', cpf: '' }]);
    setStep(1);
  };

  const canGoNext = () => {
    if (step === 1) {
      // Pelo menos um locador deve estar preenchido corretamente
      const validLocadores = locadores.filter(l => l.nome || l.cpf);
      if (validLocadores.length === 0) return false;
      return validLocadores.every(l => l.nome && validateCPF(l.cpf) && !l.cepError);
    }
    if (step === 2) {
      const isDocValid = locataria.tipo === 'PF' ? validateCPF(locataria.documento) : validateCNPJ(locataria.documento);
      return locataria.nome && isDocValid && !locataria.cepError;
    }
    if (step === 3) {
      return imovel.endereco && imovel.numero && imovel.bairro && imovel.cidade && imovel.estado && !imovel.cepError;
    }
    return true;
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-stone-100">Carregando...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-100 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText size={32} />
          </div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">GeraContrato</h1>
          <p className="text-stone-500 mb-8">Gestão simplificada de contratos de locação imobiliária.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full bg-stone-900 text-white py-4 rounded-2xl font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-3"
          >
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('list')}>
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">GeraContrato</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium">{user.displayName}</span>
              <span className="text-xs text-stone-500">{user.email}</span>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Meus Contratos</h2>
                  <p className="text-stone-500">Gerencie seus contratos de locação.</p>
                </div>
                <button 
                  onClick={() => setView('form')}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Plus size={20} />
                  Novo Contrato
                </button>
              </div>

              {contracts.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-6 sm:p-12 text-center">
                  <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Nenhum contrato encontrado</h3>
                  <p className="text-stone-500 mb-6">Comece criando seu primeiro contrato de locação.</p>
                  <button 
                    onClick={() => setView('form')}
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    Criar contrato agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {contracts.map((c) => (
                    <div key={c.id} className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 hover:shadow-md transition-shadow group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-stone-100 text-stone-600 rounded-xl flex items-center justify-center">
                          <FileText size={24} />
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setSelectedContract(c); setView('preview'); }}
                            className="p-2 text-stone-400 hover:text-emerald-600"
                          >
                            <Eye size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(c.id!)}
                            className="p-2 text-stone-400 hover:text-red-500"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-bold text-lg mb-1 truncate">{c.locataria.nome}</h3>
                      <p className="text-sm text-stone-500 mb-4 truncate">{c.imovel.endereco}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                        <span className="text-sm font-semibold text-emerald-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.condicoes.valorAluguel)}
                        </span>
                        <span className="text-xs text-stone-400">
                          {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="mb-8 flex items-center justify-between">
                <button onClick={() => setView('list')} className="text-stone-500 flex items-center gap-1 hover:text-stone-900">
                  <ChevronLeft size={20} />
                  Voltar
                </button>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={cn("w-3 h-3 rounded-full", step >= s ? "bg-emerald-600" : "bg-stone-200")} />
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-xl border border-stone-200">
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <UserIcon size={20} />
                      </div>
                      <h3 className="text-xl font-bold">Dados dos Locadores</h3>
                    </div>
                    {locadores.map((l, idx) => (
                      <div key={idx} className="p-4 sm:p-6 bg-stone-50 rounded-3xl border border-stone-100 relative space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-4">
                            <Select 
                              label="Tipo de Locador" 
                              value={l.tipo || 'PF'} 
                              options={['PF', 'PJ']} 
                              onChange={v => {
                                const newLoc = [...locadores];
                                newLoc[idx].tipo = v as any;
                                setLocadores(newLoc);
                              }} 
                            />
                          </div>
                          <div className="md:col-span-8">
                            <Input label={l.tipo === 'PJ' ? "Razão Social" : "Nome Completo"} value={l.nome} onChange={v => {
                              const newLoc = [...locadores];
                              newLoc[idx].nome = v;
                              setLocadores(newLoc);
                            }} />
                          </div>
                          <div className="md:col-span-4">
                            <Select 
                              label="Gênero" 
                              value={l.genero || 'Masculino'} 
                              options={['Masculino', 'Feminino']} 
                              onChange={v => {
                                const newLoc = [...locadores];
                                newLoc[idx].genero = v as any;
                                setLocadores(newLoc);
                              }} 
                            />
                          </div>
                          
                          {l.tipo === 'PJ' ? (
                            <>
                              <div className="md:col-span-12">
                                <Input 
                                  label="CNPJ" 
                                  value={l.documento || ''} 
                                  onChange={v => {
                                    const newLoc = [...locadores];
                                    newLoc[idx].documento = formatCNPJ(v);
                                    setLocadores(newLoc);
                                  }} 
                                  error={l.documento && l.documento.replace(/\D/g, '').length === 14 && !validateCNPJ(l.documento) ? "CNPJ inválido" : ""}
                                />
                              </div>
                              <div className="md:col-span-12">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-sm font-bold text-stone-700">Representantes (Diretores/Procuradores)</h4>
                                  <button 
                                    onClick={() => {
                                      const newLoc = [...locadores];
                                      newLoc[idx].representantes = [...(newLoc[idx].representantes || []), { nome: '', funcao: '', cpf: '' }];
                                      setLocadores(newLoc);
                                    }}
                                    className="text-xs text-emerald-600 font-bold flex items-center gap-1 hover:underline"
                                  >
                                    <Plus size={14} /> Adicionar Representante
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {(l.representantes || []).map((rep, rIdx) => (
                                    <div key={rIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-white rounded-2xl border border-stone-200 relative">
                                      <button 
                                        onClick={() => {
                                          const newLoc = [...locadores];
                                          newLoc[idx].representantes = newLoc[idx].representantes?.filter((_, i) => i !== rIdx);
                                          setLocadores(newLoc);
                                        }}
                                        className="absolute top-2 right-2 text-stone-300 hover:text-red-500"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <div className="md:col-span-5">
                                        <Input label="Nome" value={rep.nome} onChange={v => {
                                          const newLoc = [...locadores];
                                          newLoc[idx].representantes![rIdx].nome = v;
                                          setLocadores(newLoc);
                                        }} />
                                      </div>
                                      <div className="md:col-span-3">
                                        <Input label="Função" value={rep.funcao} onChange={v => {
                                          const newLoc = [...locadores];
                                          newLoc[idx].representantes![rIdx].funcao = v;
                                          setLocadores(newLoc);
                                        }} placeholder="Ex: Diretor" />
                                      </div>
                                      <div className="md:col-span-4">
                                        <Input label="CPF" value={rep.cpf} onChange={v => {
                                          const newLoc = [...locadores];
                                          newLoc[idx].representantes![rIdx].cpf = formatCPF(v);
                                          setLocadores(newLoc);
                                        }} onKeyPress={onlyNumbers} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="md:col-span-6">
                                <Input label="Nacionalidade" value={l.nacionalidade} onChange={v => {
                                  const newLoc = [...locadores];
                                  newLoc[idx].nacionalidade = v;
                                  setLocadores(newLoc);
                                }} />
                              </div>
                              
                              <div className="md:col-span-6">
                                <Input label="Profissão" value={l.profissao} onChange={v => {
                                  const newLoc = [...locadores];
                                  newLoc[idx].profissao = v;
                                  setLocadores(newLoc);
                                }} />
                              </div>

                              <div className="md:col-span-4">
                                <Input 
                                  label="RG" 
                                  value={l.rg} 
                                  onChange={v => {
                                    const clean = v.replace(/\D/g, '');
                                    const newLoc = [...locadores];
                                    newLoc[idx].rg = clean;
                                    setLocadores(newLoc);
                                  }} 
                                  onKeyPress={onlyNumbers}
                                  placeholder="Apenas números"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <Input label="Órgão" value={l.orgaoEmissor} onChange={v => {
                                  const newLoc = [...locadores];
                                  newLoc[idx].orgaoEmissor = v.toUpperCase();
                                  setLocadores(newLoc);
                                }} />
                              </div>
                              <div className="md:col-span-2">
                                <Select 
                                  label="UF" 
                                  value={l.orgaoEmissorUF} 
                                  options={ESTADOS}
                                  onChange={v => {
                                    const newLoc = [...locadores];
                                    newLoc[idx].orgaoEmissorUF = v;
                                    setLocadores(newLoc);
                                  }} 
                                />
                              </div>

                              <div className="md:col-span-4 flex items-end pb-3">
                                <div className="flex items-center gap-2 px-1">
                                  <input 
                                    type="checkbox" 
                                    id={`novo-rg-${idx}`}
                                    checked={l.isNovoRG} 
                                    onChange={e => {
                                      const newLoc = [...locadores];
                                      newLoc[idx].isNovoRG = e.target.checked;
                                      setLocadores(newLoc);
                                    }}
                                    className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                                  />
                                  <label htmlFor={`novo-rg-${idx}`} className="text-sm font-medium text-stone-700">Novo RG (CIN)?</label>
                                </div>
                              </div>

                              <div className="md:col-span-12">
                                <Input 
                                  label="CPF" 
                                  value={l.cpf} 
                                  onChange={v => {
                                    const newLoc = [...locadores];
                                    newLoc[idx].cpf = formatCPF(v);
                                    setLocadores(newLoc);
                                  }} 
                                  error={l.cpf && l.cpf.replace(/\D/g, '').length === 11 && !validateCPF(l.cpf) ? "CPF inválido" : ""}
                                />
                              </div>
                            </>
                          )}

                          <div className="md:col-span-3">
                            <Input 
                              label="CEP" 
                              value={l.cep} 
                              icon={Search}
                              onChange={async v => {
                                const formatted = formatCEP(v);
                                const newLoc = [...locadores];
                                newLoc[idx].cep = formatted;
                                newLoc[idx].cepError = '';
                                
                                if (formatted.replace(/\D/g, '').length === 8) {
                                  const { data, error } = await fetchAddressByCep(formatted);
                                  if (data) {
                                    newLoc[idx].endereco = data.logradouro;
                                    newLoc[idx].bairro = data.bairro;
                                    newLoc[idx].cidade = data.cidade;
                                    newLoc[idx].estado = data.estado;
                                  } else if (error) {
                                    newLoc[idx].cepError = error;
                                  }
                                }
                                setLocadores(newLoc);
                              }} 
                              placeholder="00000-000"
                              error={l.cepError}
                            />
                          </div>
                          <div className="md:col-span-7">
                            <Input label={l.tipo === 'PJ' ? "Sede Social" : "Endereço Residencial"} value={l.endereco} onChange={v => {
                              const newLoc = [...locadores];
                              newLoc[idx].endereco = v;
                              setLocadores(newLoc);
                            }} />
                          </div>
                          <div className="md:col-span-2">
                            <Input label="Nº" value={l.numero} onChange={v => {
                              const newLoc = [...locadores];
                              newLoc[idx].numero = v;
                              setLocadores(newLoc);
                            }} placeholder="Ex: 123" />
                          </div>

                          <div className="md:col-span-4">
                            <Input label="Complemento" value={l.complemento || ''} onChange={v => {
                              const newLoc = [...locadores];
                              newLoc[idx].complemento = v;
                              setLocadores(newLoc);
                            }} placeholder="Ex: Apto 101" />
                          </div>
                          <div className="md:col-span-3">
                            <Input label="Bairro" value={l.bairro} onChange={v => {
                              const newLoc = [...locadores];
                              newLoc[idx].bairro = v;
                              setLocadores(newLoc);
                            }} />
                          </div>
                          <div className="md:col-span-3">
                            <Input label="Cidade" value={l.cidade} onChange={v => {
                              const newLoc = [...locadores];
                              newLoc[idx].cidade = v;
                              setLocadores(newLoc);
                            }} />
                          </div>
                          <div className="md:col-span-2">
                            <Select 
                              label="Estado" 
                              value={l.estado} 
                              options={ESTADOS}
                              onChange={v => {
                                const newLoc = [...locadores];
                                newLoc[idx].estado = v;
                                setLocadores(newLoc);
                              }} 
                            />
                          </div>

                          {l.tipo === 'PF' && (
                            <div className="md:col-span-12">
                              <div className="flex items-center gap-2 px-1 mb-2">
                                <input 
                                  type="checkbox" 
                                  id={`tem-conjuge-locador-${idx}`}
                                  checked={l.temConjuge} 
                                  onChange={e => {
                                    const newLoc = [...locadores];
                                    newLoc[idx].temConjuge = e.target.checked;
                                    if (e.target.checked && !newLoc[idx].conjuge) {
                                      newLoc[idx].conjuge = { nome: '', nacionalidade: 'Brasileiro(a)', profissao: '', rg: '', orgaoEmissor: 'SSP', orgaoEmissorUF: 'SP', isNovoRG: false, cpf: '', genero: 'Masculino' };
                                    }
                                    setLocadores(newLoc);
                                  }}
                                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                                />
                                <label htmlFor={`tem-conjuge-locador-${idx}`} className="text-sm font-medium text-stone-700">Adicionar Cônjuge?</label>
                              </div>
                              {l.temConjuge && l.conjuge && (
                                <ConjugeForm 
                                  conjuge={l.conjuge} 
                                  onChange={v => {
                                    const newLoc = [...locadores];
                                    newLoc[idx].conjuge = v;
                                    setLocadores(newLoc);
                                  }} 
                                />
                              )}
                            </div>
                          )}
                        </div>
                        
                        {locadores.length > 1 && (
                          <button 
                            onClick={() => setLocadores(locadores.filter((_, i) => i !== idx))} 
                            className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-red-100 text-red-500 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm"
                            title="Remover Locador"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      onClick={() => setLocadores([...locadores, { tipo: 'PF', nome: '', nacionalidade: 'Brasileiro(a)', profissao: '', rg: '', orgaoEmissor: '', orgaoEmissorUF: 'SP', isNovoRG: false, cpf: '', documento: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', temConjuge: false, genero: 'Masculino' }])}
                      className="w-full py-3 border-2 border-dashed border-stone-200 rounded-2xl text-stone-500 hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Adicionar outro Locador
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <UserIcon size={20} />
                      </div>
                      <h3 className="text-xl font-bold">Dados da Locatária</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-12">
                        <div className="flex gap-4 mb-4">
                          <button 
                            onClick={() => setLocataria({ ...locataria, tipo: 'PF' })}
                            className={cn("flex-1 py-3 rounded-xl font-medium border transition-all", locataria.tipo === 'PF' ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-600 border-stone-200")}
                          >
                            Pessoa Física
                          </button>
                          <button 
                            onClick={() => setLocataria({ ...locataria, tipo: 'PJ' })}
                            className={cn("flex-1 py-3 rounded-xl font-medium border transition-all", locataria.tipo === 'PJ' ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-stone-600 border-stone-200")}
                          >
                            Pessoa Jurídica
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-8">
                        <Input label="Nome / Razão Social" value={locataria.nome} onChange={v => setLocataria({ ...locataria, nome: v })} />
                      </div>
                      <div className="md:col-span-4">
                        <Select 
                          label="Gênero" 
                          value={locataria.genero || 'Masculino'} 
                          options={['Masculino', 'Feminino']} 
                          onChange={v => setLocataria({ ...locataria, genero: v as any })} 
                        />
                      </div>
                      <div className="md:col-span-4">
                        <Input 
                          label={locataria.tipo === 'PF' ? "CPF" : "CNPJ"} 
                          value={locataria.documento} 
                          onChange={v => setLocataria({ 
                            ...locataria, 
                            documento: locataria.tipo === 'PF' ? formatCPF(v) : formatCNPJ(v) 
                          })} 
                          error={
                            locataria.documento && (
                              (locataria.tipo === 'PF' && locataria.documento.replace(/\D/g, '').length === 11 && !validateCPF(locataria.documento)) ||
                              (locataria.tipo === 'PJ' && locataria.documento.replace(/\D/g, '').length === 14 && !validateCNPJ(locataria.documento))
                            ) ? `${locataria.tipo === 'PF' ? 'CPF' : 'CNPJ'} inválido` : ""
                          }
                        />
                      </div>

                      {locataria.tipo === 'PF' && (
                        <>
                          <div className="md:col-span-4">
                            <Input 
                              label="RG" 
                              value={locataria.rg || ''} 
                              onChange={v => {
                                const clean = v.replace(/\D/g, '');
                                setLocataria({ ...locataria, rg: clean });
                              }} 
                              onKeyPress={onlyNumbers}
                              placeholder="Apenas números"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input label="Órgão" value={locataria.orgaoEmissor || ''} onChange={v => setLocataria({ ...locataria, orgaoEmissor: v.toUpperCase() })} />
                          </div>
                          <div className="md:col-span-2">
                            <Select 
                              label="UF" 
                              value={locataria.orgaoEmissorUF || 'SP'} 
                              options={ESTADOS}
                              onChange={v => setLocataria({ ...locataria, orgaoEmissorUF: v })} 
                            />
                          </div>
                          <div className="md:col-span-4 flex items-end pb-3">
                            <div className="flex items-center gap-2 px-1">
                              <input 
                                type="checkbox" 
                                id="novo-rg-locataria"
                                checked={locataria.isNovoRG || false} 
                                onChange={e => setLocataria({ ...locataria, isNovoRG: e.target.checked })}
                                className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                              />
                              <label htmlFor="novo-rg-locataria" className="text-sm font-medium text-stone-700">Novo RG (CIN)?</label>
                            </div>
                          </div>
                          <div className="md:col-span-12">
                            <div className="flex items-center gap-2 px-1 mb-2">
                              <input 
                                type="checkbox" 
                                id="tem-conjuge-locataria"
                                checked={locataria.temConjuge} 
                                onChange={e => {
                                  setLocataria({ 
                                    ...locataria, 
                                    temConjuge: e.target.checked,
                                    conjuge: e.target.checked ? (locataria.conjuge || { nome: '', nacionalidade: 'Brasileiro(a)', profissao: '', rg: '', orgaoEmissor: 'SSP', orgaoEmissorUF: 'SP', isNovoRG: false, cpf: '', genero: 'Masculino' }) : undefined
                                  });
                                }}
                                className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                              />
                              <label htmlFor="tem-conjuge-locataria" className="text-sm font-medium text-stone-700">Adicionar Cônjuge?</label>
                            </div>
                            {locataria.temConjuge && locataria.conjuge && (
                              <ConjugeForm 
                                conjuge={locataria.conjuge} 
                                onChange={v => setLocataria({ ...locataria, conjuge: v })} 
                              />
                            )}
                          </div>
                        </>
                      )}

                      <div className="md:col-span-3">
                        <Input 
                          label="CEP" 
                          value={locataria.cep} 
                          icon={Search}
                          onChange={async v => {
                            const formatted = formatCEP(v);
                            setLocataria(prev => ({ ...prev, cep: formatted, cepError: '' }));
                            if (formatted.replace(/\D/g, '').length === 8) {
                              const { data, error } = await fetchAddressByCep(formatted);
                              if (data) {
                                setLocataria(prev => ({ 
                                  ...prev, 
                                  endereco: data.logradouro, 
                                  bairro: data.bairro, 
                                  cidade: data.cidade, 
                                  estado: data.estado 
                                }));
                              } else if (error) {
                                setLocataria(prev => ({ ...prev, cepError: error }));
                              }
                            }
                          }} 
                          placeholder="00000-000"
                          error={locataria.cepError}
                        />
                      </div>
                      <div className="md:col-span-7">
                        <Input label="Endereço Completo" value={locataria.endereco} onChange={v => setLocataria({ ...locataria, endereco: v })} />
                      </div>
                      <div className="md:col-span-2">
                        <Input label="Nº" value={locataria.numero} onChange={v => setLocataria({ ...locataria, numero: v })} placeholder="Ex: 123" />
                      </div>

                      <div className="md:col-span-4">
                        <Input label="Complemento" value={locataria.complemento || ''} onChange={v => setLocataria({ ...locataria, complemento: v })} placeholder="Ex: Sala 202" />
                      </div>
                      <div className="md:col-span-3">
                        <Input label="Bairro" value={locataria.bairro} onChange={v => setLocataria({ ...locataria, bairro: v })} />
                      </div>
                      <div className="md:col-span-3">
                        <Input label="Cidade" value={locataria.cidade} onChange={v => setLocataria({ ...locataria, cidade: v })} />
                      </div>
                      <div className="md:col-span-2">
                        <Select label="Estado" value={locataria.estado} options={ESTADOS} onChange={v => setLocataria({ ...locataria, estado: v })} />
                      </div>

                      {locataria.tipo === 'PJ' && (
                        <div className="md:col-span-12 space-y-4 mt-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-stone-700">Representantes (Sócios/Diretores)</h4>
                            <button 
                              onClick={() => {
                                const reps = locataria.representantes || [];
                                setLocataria({ ...locataria, representantes: [...reps, { nome: '', funcao: '', cpf: '' }] });
                              }}
                              className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-emerald-200 transition-colors flex items-center gap-1 font-semibold"
                            >
                              <PlusIcon size={14} />
                              Adicionar Representante
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {(locataria.representantes || []).map((rep, rIdx) => (
                              <div key={rIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-stone-50 p-4 rounded-2xl border border-stone-100 relative group">
                                <div className="md:col-span-4">
                                  <Input 
                                    label="Nome Completo" 
                                    value={rep.nome} 
                                    onChange={v => {
                                      const reps = [...(locataria.representantes || [])];
                                      reps[rIdx].nome = v;
                                      setLocataria({ ...locataria, representantes: reps });
                                    }} 
                                  />
                                </div>
                                <div className="md:col-span-4">
                                  <Input 
                                    label="CPF" 
                                    value={rep.cpf} 
                                    onChange={v => {
                                      const reps = [...(locataria.representantes || [])];
                                      reps[rIdx].cpf = formatCPF(v);
                                      setLocataria({ ...locataria, representantes: reps });
                                    }} 
                                    error={rep.cpf && rep.cpf.replace(/\D/g, '').length === 11 && !validateCPF(rep.cpf) ? "CPF inválido" : ""}
                                  />
                                </div>
                                <div className="md:col-span-3">
                                  <Input 
                                    label="Função" 
                                    value={rep.funcao} 
                                    onChange={v => {
                                      const reps = [...(locataria.representantes || [])];
                                      reps[rIdx].funcao = v;
                                      setLocataria({ ...locataria, representantes: reps });
                                    }} 
                                  />
                                </div>
                                <div className="md:col-span-1 flex justify-center pb-2">
                                  <button 
                                    onClick={() => {
                                      const reps = (locataria.representantes || []).filter((_, i) => i !== rIdx);
                                      setLocataria({ ...locataria, representantes: reps });
                                    }}
                                    className="text-red-400 hover:text-red-600 transition-colors p-2"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {(locataria.representantes || []).length === 0 && (
                            <p className="text-xs text-stone-400 italic text-center py-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">Nenhum representante adicionado.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Home size={20} />
                      </div>
                      <h3 className="text-xl font-bold">Dados do Imóvel</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <div className="md:col-span-3">
                          <Input 
                            label="CEP" 
                            value={imovel.cep} 
                            icon={Search}
                            onChange={async v => {
                              const formatted = formatCEP(v);
                              setImovel(prev => ({ ...prev, cep: formatted, cepError: '' }));
                              if (formatted.replace(/\D/g, '').length === 8) {
                                const { data, error } = await fetchAddressByCep(formatted);
                                if (data) {
                                  setImovel(prev => ({ 
                                    ...prev, 
                                    endereco: data.logradouro, 
                                    bairro: data.bairro, 
                                    cidade: data.cidade, 
                                    estado: data.estado 
                                  }));
                                } else if (error) {
                                  setImovel(prev => ({ ...prev, cepError: error }));
                                }
                              }
                            }} 
                            placeholder="00000-000"
                            error={imovel.cepError}
                          />
                        </div>
                        <div className="md:col-span-7">
                          <Input label="Endereço do Imóvel" value={imovel.endereco} onChange={v => setImovel({ ...imovel, endereco: v })} />
                        </div>
                        <div className="md:col-span-2">
                          <Input label="Nº" value={imovel.numero} onChange={v => setImovel({ ...imovel, numero: v })} placeholder="Ex: 123" />
                        </div>
                        
                        <div className="md:col-span-4">
                          <Input label="Complemento" value={imovel.complemento || ''} onChange={v => setImovel({ ...imovel, complemento: v })} placeholder="Ex: Bloco B" />
                        </div>
                        <div className="md:col-span-3">
                          <Input label="Bairro" value={imovel.bairro} onChange={v => setImovel({ ...imovel, bairro: v })} />
                        </div>
                        <div className="md:col-span-3">
                          <Input label="Cidade" value={imovel.cidade} onChange={v => setImovel({ ...imovel, cidade: v })} />
                        </div>
                        <div className="md:col-span-2">
                          <Select label="Estado" value={imovel.estado} options={ESTADOS} onChange={v => setImovel({ ...imovel, estado: v })} />
                        </div>

                        <div className="md:col-span-12">
                          <Input label="Descrição (Quartos, Suítes, etc)" value={imovel.descricao} onChange={v => setImovel({ ...imovel, descricao: v })} placeholder="Ex: 03 quartos, sendo 01 suíte, sala, cozinha..." />
                        </div>
                        <div className="md:col-span-12">
                          <Input label="Garagens (Números)" value={imovel.garagens} onChange={v => setImovel({ ...imovel, garagens: v })} placeholder="Ex: 106 e 106A" />
                        </div>

                        <div className="md:col-span-4">
                          <Select 
                            label="Tipo de Imóvel" 
                            value={imovel.tipo} 
                            options={['Casa', 'Apartamento']} 
                            onChange={v => setImovel({ ...imovel, tipo: v as any })} 
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Select 
                            label="Pintura Nova?" 
                            value={imovel.pinturaNova ? 'Sim' : 'Não'} 
                            options={['Sim', 'Não']} 
                            onChange={v => setImovel({ ...imovel, pinturaNova: v === 'Sim' })} 
                          />
                        </div>
                        {imovel.tipo === 'Apartamento' && (
                          <div className="md:col-span-4">
                            <Select 
                              label="Tem Condomínio?" 
                              value={imovel.temCondominio ? 'Sim' : 'Não'} 
                              options={['Sim', 'Não']} 
                              onChange={v => setImovel({ ...imovel, temCondominio: v === 'Sim' })} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Calendar size={20} />
                      </div>
                      <h3 className="text-xl font-bold">Prazos e Valores</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-3">
                        <Input label="Prazo (Meses)" type="number" value={condicoes.prazoMeses.toString()} onChange={v => setCondicoes({ ...condicoes, prazoMeses: parseInt(v) })} />
                      </div>
                      <div className="md:col-span-3">
                        <Input label="Dia do Pagamento" type="number" value={condicoes.diaPagamento.toString()} onChange={v => setCondicoes({ ...condicoes, diaPagamento: parseInt(v) })} />
                      </div>
                      <div className="md:col-span-3">
                        <Input label="Data de Início" type="date" value={condicoes.dataInicio} onChange={v => setCondicoes({ ...condicoes, dataInicio: v })} />
                      </div>
                      <div className="md:col-span-3">
                        <Input label="Data de Término" type="date" value={condicoes.dataTermino} onChange={v => setCondicoes({ ...condicoes, dataTermino: v })} />
                      </div>
                      
                      <div className="md:col-span-6">
                        <Input label="Valor do Aluguel" type="number" prefix="R$" value={condicoes.valorAluguel.toString()} onChange={v => setCondicoes({ ...condicoes, valorAluguel: parseFloat(v) })} />
                      </div>
                      <div className="md:col-span-6">
                        <Input label="Chave PIX" value={condicoes.chavePix} onChange={v => setCondicoes({ ...condicoes, chavePix: v })} />
                      </div>

                      <div className="md:col-span-3">
                        <Select 
                          label="Índice Reajuste" 
                          value={condicoes.indiceReajuste} 
                          options={['IPCA', 'IGP-M', 'INPC']} 
                          onChange={v => setCondicoes({ ...condicoes, indiceReajuste: v })} 
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Input 
                          label="Multa Rescisória (Meses)" 
                          type="number"
                          value={condicoes.multaRescisoria.toString()} 
                          onChange={v => setCondicoes({ ...condicoes, multaRescisoria: parseInt(v) })} 
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Select 
                          label="Quem paga IPTU?" 
                          value={condicoes.pagaIPTU} 
                          options={['Locador', 'Locatária']} 
                          onChange={v => setCondicoes({ ...condicoes, pagaIPTU: v as any })} 
                        />
                      </div>
                      <div className="md:col-span-3">
                        <Select 
                          label="Quem paga Condomínio?" 
                          value={condicoes.pagaCondominio} 
                          options={['Locador', 'Locatária']} 
                          onChange={v => setCondicoes({ ...condicoes, pagaCondominio: v as any })} 
                        />
                      </div>
                      {imovel.tipo === 'Apartamento' && imovel.temCondominio && (
                        <div className="md:col-span-12">
                          <Select 
                            label="Condomínio já incluso no valor do aluguel?" 
                            value={condicoes.condominioIncluso ? 'Sim' : 'Não'} 
                            options={['Sim', 'Não']} 
                            onChange={v => setCondicoes({ ...condicoes, condominioIncluso: v === 'Sim' })} 
                          />
                        </div>
                      )}
                      
                      <div className="md:col-span-12 border-t border-stone-100 pt-6 mt-2">
                        <h4 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                          Dados Bancários para Pagamento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-6">
                            <Select 
                              label="Banco" 
                              value={condicoes.bancoNome} 
                              options={BANCOS.map(b => b.nome)}
                              onChange={v => {
                                const banco = BANCOS.find(b => b.nome === v);
                                setCondicoes({ 
                                  ...condicoes, 
                                  bancoNome: v, 
                                  bancoCodigo: banco?.codigo || '' 
                                });
                              }} 
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input 
                              label="Código" 
                              value={condicoes.bancoCodigo} 
                              onChange={v => setCondicoes({ ...condicoes, bancoCodigo: v })} 
                              placeholder="000"
                              onKeyPress={onlyNumbers}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input 
                              label="Agência" 
                              value={condicoes.agencia} 
                              onChange={v => setCondicoes({ ...condicoes, agencia: v })} 
                              placeholder="0000"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input 
                              label="Conta" 
                              value={condicoes.conta} 
                              onChange={v => setCondicoes({ ...condicoes, conta: v })} 
                              placeholder="00000-0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <ShieldCheck size={20} />
                      </div>
                      <h3 className="text-xl font-bold">Garantia e Corretor</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="md:col-span-6">
                        <Select 
                          label="Tipo de Garantia" 
                          value={garantia.tipo} 
                          options={['Caução', 'Fiador', 'Seguro Fiança', 'Nenhuma']} 
                          onChange={v => setGarantia({ ...garantia, tipo: v as any })} 
                        />
                      </div>
                      {garantia.tipo === 'Caução' && (
                        <>
                          <div className="md:col-span-3">
                            <Input 
                              label="Meses de Caução" 
                              type="number" 
                              value={garantia.mesesCaucao?.toString() || ''} 
                              onChange={v => {
                                const meses = parseInt(v) || 0;
                                setGarantia({ 
                                  ...garantia, 
                                  mesesCaucao: meses,
                                  valor: condicoes.valorAluguel * meses
                                });
                              }} 
                            />
                          </div>
                          <div className="md:col-span-3">
                            <Input 
                              label="Valor Total" 
                              type="number" 
                              prefix="R$"
                              value={garantia.valor.toString()} 
                              onChange={v => setGarantia({ ...garantia, valor: parseFloat(v) })} 
                            />
                          </div>
                        </>
                      )}
                      {garantia.tipo === 'Fiador' && (
                        <div className="md:col-span-12">
                          <FiadorForm 
                            fiador={garantia.fiador || { 
                              nome: '', 
                              nacionalidade: 'Brasileiro(a)', 
                              profissao: '', 
                              rg: '', 
                              orgaoEmissor: 'SSP', 
                              orgaoEmissorUF: 'SP', 
                              isNovoRG: false,
                              cpf: '', 
                              genero: 'Masculino',
                              estadoCivil: 'Solteiro(a)',
                              cep: '',
                              endereco: '', 
                              numero: '', 
                              bairro: '', 
                              cidade: '', 
                              estado: 'SP',
                              temConjuge: false 
                            }} 
                            onChange={v => setGarantia({ ...garantia, fiador: v })} 
                          />
                        </div>
                      )}
                      {garantia.tipo === 'Seguro Fiança' && (
                        <div className="md:col-span-12">
                          <Input 
                            label="Nome da Seguradora" 
                            value={garantia.seguradora || ''} 
                            onChange={v => setGarantia({ ...garantia, seguradora: v })} 
                            placeholder="Ex: Porto Seguro"
                          />
                        </div>
                      )}
                      {(garantia.tipo === 'Fiador' || garantia.tipo === 'Seguro Fiança') && (
                        <div className="md:col-span-6">
                          <Input 
                            label="Valor da Garantia" 
                            type="number" 
                            prefix="R$"
                            value={garantia.valor.toString()} 
                            onChange={v => setGarantia({ ...garantia, valor: parseFloat(v) })} 
                          />
                        </div>
                      )}
                      
                      <div className="md:col-span-12 border-t border-stone-100 pt-6 mt-2">
                        <h4 className="font-bold text-stone-700 mb-4 flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                          Dados do Corretor
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-12">
                            <Input label="Nome da Imobiliária" value={corretor.imobiliaria || ''} onChange={v => setCorretor({ ...corretor, imobiliaria: v })} />
                          </div>
                          <div className="md:col-span-8">
                            <Input label="Nome do Corretor" value={corretor.nome} onChange={v => setCorretor({ ...corretor, nome: v })} />
                          </div>
                          <div className="md:col-span-4">
                            <Input label="CRECI" value={corretor.creci} onChange={v => setCorretor({ ...corretor, creci: v })} />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-12 border-t border-stone-100 pt-6 mt-2">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-stone-700 flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                            Testemunhas
                          </h4>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => setTestemunhas([...testemunhas, { nome: '', cpf: '' }])}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Adicionar Testemunha"
                            >
                              <Plus size={18} />
                            </button>
                            {testemunhas.length > 0 && (
                              <button 
                                type="button"
                                onClick={() => {
                                  setTestemunhas(testemunhas.slice(0, -1));
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover Última Testemunha"
                              >
                                <Minus size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4">
                          {testemunhas.map((t, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                              <div className="md:col-span-8">
                                <Input 
                                  label={`Nome da Testemunha ${idx + 1}`} 
                                  value={t.nome} 
                                  onChange={v => {
                                    const newT = [...testemunhas];
                                    newT[idx] = { ...newT[idx], nome: v };
                                    setTestemunhas(newT);
                                  }} 
                                />
                              </div>
                              <div className="md:col-span-4">
                                <Input 
                                  label={`CPF da Testemunha ${idx + 1}`} 
                                  value={t.cpf} 
                                  onChange={v => {
                                    const newT = [...testemunhas];
                                    newT[idx] = { ...newT[idx], cpf: v };
                                    setTestemunhas(newT);
                                  }} 
                                  onKeyPress={onlyNumbers}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-12 flex flex-col items-end gap-2">
                  <div className="flex items-center justify-between w-full">
                    {step > 1 ? (
                      <button 
                        onClick={() => setStep(step - 1)}
                        className="px-4 sm:px-8 py-3 text-stone-600 font-semibold hover:text-stone-900 flex items-center gap-2"
                      >
                        <ChevronLeft size={20} />
                        Anterior
                      </button>
                    ) : <div />}
                    
                    {step < 5 ? (
                      <button 
                        onClick={() => setStep(step + 1)}
                        disabled={!canGoNext()}
                        className={cn(
                          "px-4 sm:px-8 py-3 rounded-2xl font-semibold transition-colors flex items-center gap-2",
                          canGoNext() 
                            ? "bg-stone-900 text-white hover:bg-stone-800" 
                            : "bg-stone-200 text-stone-400 cursor-not-allowed"
                        )}
                      >
                        Próximo
                        <ChevronRight size={20} />
                      </button>
                    ) : (
                      <button 
                        onClick={handleSave}
                        disabled={!canGoNext()}
                        className={cn(
                          "px-6 sm:px-10 py-3 rounded-2xl font-semibold transition-colors shadow-lg",
                          canGoNext()
                            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20"
                            : "bg-stone-200 text-stone-400 cursor-not-allowed shadow-none"
                        )}
                      >
                        Finalizar e Salvar
                      </button>
                    )}
                  </div>
                  {!canGoNext() && (
                    <p className="text-xs text-red-500 font-medium animate-pulse">
                      {step === 1 && "Preencha o nome e CPF válido de todos os locadores adicionados."}
                      {step === 2 && `Preencha o nome e ${locataria.tipo === 'PF' ? 'CPF' : 'CNPJ'} válido da locatária.`}
                      {step === 3 && "Preencha todos os campos obrigatórios do endereço do imóvel."}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'preview' && selectedContract && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <div className="mb-8 flex items-center justify-between">
                <button onClick={() => setView('list')} className="text-stone-500 flex items-center gap-1 hover:text-stone-900">
                  <ChevronLeft size={20} />
                  Voltar para lista
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="p-3 bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors"
                    title="Imprimir"
                  >
                    <Printer size={20} />
                  </button>
                  <button 
                    className="bg-emerald-600 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                  >
                    <Download size={20} />
                    <span className="hidden sm:inline">Baixar PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 sm:p-12 rounded-3xl shadow-2xl border border-stone-200 print:shadow-none print:border-none print:p-0 relative">
                {/* Print Header */}
                <div className="print-header">
                  <span className="print-header-side">CRECI: {selectedContract.corretor.creci}</span>
                  <span className="print-header-center">{selectedContract.corretor.imobiliaria || "CORRETORA DE IMÓVEIS"}</span>
                  <span className="print-header-side">CRECI: {selectedContract.corretor.creci}</span>
                </div>

                <div className="markdown-body prose prose-stone max-w-none">
                  <Markdown>{generateContractMarkdown(selectedContract)}</Markdown>
                </div>

                {/* Print Footer */}
                <div className="print-footer">
                  <div className="print-footer-line">
                    LOCADOR(ES)
                  </div>
                  <div className="print-footer-line">
                    CORRETOR
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}


function Input({ label, value, onChange, type = 'text', placeholder = '', error = '', onKeyPress, icon: Icon, prefix }: { label: string, value: string, onChange: (v: string) => void, type?: string, placeholder?: string, error?: string, onKeyPress?: (e: React.KeyboardEvent) => void, icon?: any, prefix?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-stone-700 ml-1">{label}</label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
            <Icon size={18} />
          </div>
        )}
        {prefix && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 font-bold">
            {prefix}
          </div>
        )}
        <input 
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          className={cn(
            "w-full bg-white border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all",
            (Icon || prefix) && "pl-11",
            error 
              ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" 
              : "border-stone-200 focus:ring-emerald-500/20 focus:border-emerald-500"
          )}
        />
      </div>
      {error && <p className="text-xs text-red-500 ml-1 font-medium">{error}</p>}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string, value: string, onChange: (v: string) => void, options: string[] }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-stone-700 ml-1">{label}</label>
      <div className="relative">
        <select 
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-10"
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
          <ChevronRight size={16} className="rotate-90" />
        </div>
      </div>
    </div>
  );
}

const onlyNumbers = (e: React.KeyboardEvent) => {
  if (!/[0-9]/.test(e.key)) {
    e.preventDefault();
  }
};

function FiadorForm({ fiador, onChange }: { fiador: any, onChange: (v: any) => void }) {
  return (
    <div className="mt-4 p-4 bg-white rounded-2xl border border-stone-200 space-y-4">
      <h5 className="text-sm font-bold text-stone-600 flex items-center gap-2">
        <ShieldCheck size={14} />
        Dados do Fiador
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-12">
          <Input label="Nome Completo" value={fiador.nome} onChange={v => onChange({ ...fiador, nome: v })} />
        </div>
        <div className="md:col-span-12">
          <Select 
            label="Gênero" 
            value={fiador.genero || 'Masculino'} 
            options={['Masculino', 'Feminino']} 
            onChange={v => onChange({ ...fiador, genero: v })} 
          />
        </div>
        <div className="md:col-span-6">
          <Input label="Nacionalidade" value={fiador.nacionalidade} onChange={v => onChange({ ...fiador, nacionalidade: v })} />
        </div>
        <div className="md:col-span-6">
          <Input label="Profissão" value={fiador.profissao} onChange={v => onChange({ ...fiador, profissao: v })} />
        </div>
        <div className="md:col-span-4">
          <Input label="RG" value={fiador.rg} onChange={v => onChange({ ...fiador, rg: v })} onKeyPress={onlyNumbers} />
        </div>
        <div className="md:col-span-4">
          <Input label="Órgão Emissor" value={fiador.orgaoEmissor} onChange={v => onChange({ ...fiador, orgaoEmissor: v })} />
        </div>
        <div className="md:col-span-4">
          <Select label="UF" value={fiador.orgaoEmissorUF} options={ESTADOS} onChange={v => onChange({ ...fiador, orgaoEmissorUF: v })} />
        </div>
        <div className="md:col-span-12">
          <Input label="CPF" value={fiador.cpf} onChange={v => onChange({ ...fiador, cpf: formatCPF(v) })} onKeyPress={onlyNumbers} />
        </div>
        <div className="md:col-span-12">
          <Select 
            label="Estado Civil" 
            value={fiador.estadoCivil || 'Solteiro(a)'} 
            options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']} 
            onChange={v => onChange({ ...fiador, estadoCivil: v })} 
          />
        </div>

        <div className="md:col-span-12">
          <div className="flex items-center gap-2 px-1 mb-2">
            <input 
              type="checkbox" 
              id="tem-conjuge-fiador"
              checked={fiador.temConjuge} 
              onChange={e => {
                onChange({ 
                  ...fiador, 
                  temConjuge: e.target.checked,
                  conjuge: e.target.checked ? (fiador.conjuge || { nome: '', nacionalidade: 'Brasileiro(a)', profissao: '', rg: '', orgaoEmissor: 'SSP', orgaoEmissorUF: 'SP', isNovoRG: false, cpf: '' }) : undefined
                });
              }}
              className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
            />
            <label htmlFor="tem-conjuge-fiador" className="text-sm font-medium text-stone-700">Adicionar Cônjuge?</label>
          </div>
          {fiador.temConjuge && fiador.conjuge && (
            <ConjugeForm 
              conjuge={fiador.conjuge} 
              onChange={v => onChange({ ...fiador, conjuge: v })} 
            />
          )}
        </div>

        <div className="md:col-span-3">
          <Input 
            label="CEP" 
            value={fiador.cep || ''} 
            icon={Search}
            onChange={async v => {
              const formatted = formatCEP(v);
              onChange({ ...fiador, cep: formatted, cepError: '' });
              if (formatted.replace(/\D/g, '').length === 8) {
                const { data, error } = await fetchAddressByCep(formatted);
                if (data) {
                  onChange({ 
                    ...fiador, 
                    cep: formatted,
                    endereco: data.logradouro, 
                    bairro: data.bairro, 
                    cidade: data.cidade, 
                    estado: data.estado 
                  });
                } else if (error) {
                  onChange({ ...fiador, cep: formatted, cepError: error });
                }
              }
            }} 
            placeholder="00000-000"
            error={fiador.cepError}
          />
        </div>
        <div className="md:col-span-7">
          <Input label="Endereço Completo" value={fiador.endereco} onChange={v => onChange({ ...fiador, endereco: v })} />
        </div>
        <div className="md:col-span-2">
          <Input label="Nº" value={fiador.numero || ''} onChange={v => onChange({ ...fiador, numero: v })} placeholder="Ex: 123" />
        </div>
        <div className="md:col-span-4">
          <Input label="Complemento" value={fiador.complemento || ''} onChange={v => onChange({ ...fiador, complemento: v })} placeholder="Ex: Sala 202" />
        </div>
        <div className="md:col-span-3">
          <Input label="Bairro" value={fiador.bairro || ''} onChange={v => onChange({ ...fiador, bairro: v })} />
        </div>
        <div className="md:col-span-3">
          <Input label="Cidade" value={fiador.cidade || ''} onChange={v => onChange({ ...fiador, cidade: v })} />
        </div>
        <div className="md:col-span-2">
          <Select label="Estado" value={fiador.estado || 'SP'} options={ESTADOS} onChange={v => onChange({ ...fiador, estado: v })} />
        </div>
      </div>
    </div>
  );
}

function ConjugeForm({ conjuge, onChange }: { conjuge: any, onChange: (v: any) => void }) {
  return (
    <div className="mt-4 p-4 bg-white rounded-2xl border border-stone-200 space-y-4">
      <h5 className="text-sm font-bold text-stone-600 flex items-center gap-2">
        <UserIcon size={14} />
        Dados do Cônjuge
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-12">
          <Input label="Nome do Cônjuge" value={conjuge.nome} onChange={v => onChange({ ...conjuge, nome: v })} />
        </div>
        <div className="md:col-span-12">
          <Select 
            label="Gênero" 
            value={conjuge.genero || 'Masculino'} 
            options={['Masculino', 'Feminino']} 
            onChange={v => onChange({ ...conjuge, genero: v })} 
          />
        </div>
        <div className="md:col-span-6">
          <Input label="Nacionalidade" value={conjuge.nacionalidade} onChange={v => onChange({ ...conjuge, nacionalidade: v })} />
        </div>
        <div className="md:col-span-6">
          <Input label="Profissão" value={conjuge.profissao} onChange={v => onChange({ ...conjuge, profissao: v })} />
        </div>
        <div className="md:col-span-4">
          <Input label="RG" value={conjuge.rg} onChange={v => onChange({ ...conjuge, rg: v })} />
        </div>
        <div className="md:col-span-4">
          <Input label="Órgão Emissor" value={conjuge.orgaoEmissor} onChange={v => onChange({ ...conjuge, orgaoEmissor: v })} />
        </div>
        <div className="md:col-span-4">
          <Input label="UF" value={conjuge.orgaoEmissorUF} onChange={v => onChange({ ...conjuge, orgaoEmissorUF: v })} />
        </div>
        <div className="md:col-span-12">
          <Input label="CPF" value={conjuge.cpf} onChange={v => onChange({ ...conjuge, cpf: v })} onKeyPress={onlyNumbers} />
        </div>
      </div>
    </div>
  );
}
