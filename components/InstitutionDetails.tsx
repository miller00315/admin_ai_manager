
import React, { useState } from 'react';
import { useInstitutionDetails } from '../presentation/hooks/useInstitutionDetails';
import { Building2, MapPin, ArrowLeft, Loader2, AlertTriangle, Briefcase, BookOpen, Users, GraduationCap, School, User, ShieldCheck, Mail, Eye, CreditCard, AlertCircle, ChevronRight, Home } from 'lucide-react';
import GradeDetails from './GradeDetails';
import { SchoolGrade } from '../types';

interface InstitutionDetailsProps {
  institutionId: string;
  onBack: () => void;
  hasSupabase: boolean;
  // Navigation callbacks for drill-down
  onViewProfessor?: (professorId: string) => void;
  onViewStudent?: (studentId: string) => void;
  onViewClass?: (classId: string) => void;
}

const InstitutionDetails: React.FC<InstitutionDetailsProps> = ({ institutionId, onBack, hasSupabase, onViewProfessor, onViewStudent, onViewClass }) => {
  const { 
      institution, departments, grades, classes, students, professors, loading, error,
      createStripeCustomer
  } = useInstitutionDetails(institutionId, hasSupabase);

  // Removed unused hooks - view only mode

  // View State
  const [view, setView] = useState<'main' | 'grade'>('main');
  const [selectedGrade, setSelectedGrade] = useState<SchoolGrade | null>(null);

  // Removed edit and creation states - view only mode

  // Stripe Customer State
  const [isCreatingStripe, setIsCreatingStripe] = useState(false);
  const [stripeStatusMessage, setStripeStatusMessage] = useState<{ type: 'success' | 'error' | 'checking'; message: string } | null>(null);

  // --- Grade Navigation ---
  const handleViewGrade = (gradeId: string) => {
      const grade = grades.find(g => g.id === gradeId);
      if (grade) {
          setSelectedGrade(grade);
          setView('grade');
      }
  };

  const handleBackFromGrade = () => {
      setSelectedGrade(null);
      setView('main');
  };

  // Removed handlers for creation and deletion - view only mode

  if (loading && !institution) {
      return (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <Loader2 className="animate-spin mb-4" size={40}/>
              <p>Carregando perfil da instituição...</p>
          </div>
      );
  }

  if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <AlertTriangle className="mx-auto text-red-500 dark:text-red-400 mb-4" size={48} />
            <h3 className="text-lg font-bold text-red-700 dark:text-red-300 mb-2">Erro ao Carregar Instituição</h3>
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <button onClick={onBack} className="text-slate-600 dark:text-slate-300 underline">Voltar</button>
        </div>
      );
  }

  if (!institution) return null;

  // Render Grade Details View
  if (view === 'grade' && selectedGrade) {
      return (
          <GradeDetails 
              grade={selectedGrade} 
              onBack={handleBackFromGrade} 
              hasSupabase={hasSupabase}
              readOnly={false}
              onViewProfessor={onViewProfessor}
          />
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">

      {/* Header & Overview */}
      <div className="flex flex-col md:flex-row gap-6">
          <button onClick={onBack} className="p-2 h-fit hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400 self-start">
              <ArrowLeft size={24}/>
          </button>
          
          <div className="flex-1 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <Building2 size={200}/>
                  </div>
                  
                  {/* View Mode Only */}
                  <div>
                          <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4 tracking-wider">
                              <School size={12}/> {institution.type || institution.institution_types?.name}
                          </span>
                          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">{institution.name}</h1>
                          
                          <div className="flex flex-col gap-3">
                              {institution.addresses && (
                                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                      <MapPin size={18} className="text-slate-400 dark:text-slate-500 shrink-0"/>
                                      <span>{institution.addresses.address_line_1}, {institution.addresses.city}, {institution.addresses.country}</span>
                                  </div>
                              )}
                              
                              {institution.manager && (
                                  <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 w-fit px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-600">
                                          <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0"/>
                                          <span className="font-bold text-slate-700 dark:text-slate-200 mr-1">Gestor:</span>
                                          <span>{institution.manager.first_name} {institution.manager.last_name}</span>
                                          <span className="text-slate-400 dark:text-slate-500 mx-1">•</span>
                                          <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><Mail size={12}/> {institution.manager.email}</span>
                                      </div>
                                      
                                      {/* Stripe Customer Status */}
                                      {(institution.manager as any).stripe_id ? (
                                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 w-fit px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                              <CreditCard size={16}/>
                                              <span className="text-xs font-medium">Stripe Customer configurado</span>
                                          </div>
                                      ) : (
                                          <div className="flex flex-col gap-2">
                                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800">
                                                      <AlertCircle size={16}/>
                                                      <span className="text-xs font-medium">Stripe Customer não configurado</span>
                                                  </div>
                                                  <button
                                                      onClick={async () => {
                                                          if (!institution.manager) return;
                                                          setStripeStatusMessage(null);
                                                          setIsCreatingStripe(true);
                                                          
                                                          try {
                                                              await createStripeCustomer((institution.manager as any).id);
                                                              
                                                              // Aguardar sincronização e verificar vínculo
                                                              setStripeStatusMessage({ type: 'checking', message: 'Verificando sincronização...' });
                                                              
                                                              // Aguardar 3 segundos para o sync do Stripe
                                                              await new Promise(resolve => setTimeout(resolve, 3000));
                                                              
                                                              // O hook já faz refresh dos dados após createStripeCustomer
                                                              // Verificar se o stripe_id foi vinculado
                                                              if ((institution.manager as any).stripe_id) {
                                                                  setStripeStatusMessage({ type: 'success', message: 'Cliente Stripe vinculado com sucesso!' });
                                                              } else {
                                                                  // Pode levar mais tempo para sincronizar, mostrar mensagem informativa
                                                                  setStripeStatusMessage({ 
                                                                      type: 'success', 
                                                                      message: 'Cliente criado no Stripe. A sincronização pode levar alguns segundos. Atualize a página para verificar.' 
                                                                  });
                                                              }
                                                          } catch (e) {
                                                              setStripeStatusMessage({ type: 'error', message: 'Falha ao criar cliente Stripe. Tente novamente.' });
                                                          } finally {
                                                              setIsCreatingStripe(false);
                                                          }
                                                      }}
                                                      disabled={isCreatingStripe}
                                                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                                  >
                                                      {isCreatingStripe ? (
                                                          <Loader2 size={14} className="animate-spin"/>
                                                      ) : (
                                                          <CreditCard size={14}/>
                                                      )}
                                                      {isCreatingStripe ? 'Processando...' : 'Criar Cliente Stripe'}
                                                  </button>
                                              </div>
                                              
                                              {/* Status Message */}
                                              {stripeStatusMessage && (
                                                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                                                      stripeStatusMessage.type === 'success' 
                                                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                                                          : stripeStatusMessage.type === 'error'
                                                          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                                                          : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                                  }`}>
                                                      {stripeStatusMessage.type === 'checking' && <Loader2 size={14} className="animate-spin"/>}
                                                      {stripeStatusMessage.type === 'success' && <CreditCard size={14}/>}
                                                      {stripeStatusMessage.type === 'error' && <AlertCircle size={14}/>}
                                                      <span>{stripeStatusMessage.message}</span>
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>
                      </div>
              </div>

              {/* Stats Grid */}
              {
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-2"><Users size={20}/></div>
                          {loading ? (
                              <Loader2 className="animate-spin text-slate-400 dark:text-slate-500 mb-2" size={24}/>
                          ) : (
                              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{students.length}</div>
                          )}
                          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Alunos</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-2"><BookOpen size={20}/></div>
                          {loading ? (
                              <Loader2 className="animate-spin text-slate-400 mb-2" size={24}/>
                          ) : (
                              <div className="text-2xl font-bold text-slate-800">{classes.length}</div>
                          )}
                          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Turmas</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-2"><Briefcase size={20}/></div>
                          {loading ? (
                              <Loader2 className="animate-spin text-slate-400 mb-2" size={24}/>
                          ) : (
                              <div className="text-2xl font-bold text-slate-800">{departments.length}</div>
                          )}
                          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Departamentos</div>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-2"><GraduationCap size={20}/></div>
                          {loading ? (
                              <Loader2 className="animate-spin text-slate-400 mb-2" size={24}/>
                          ) : (
                              <div className="text-2xl font-bold text-slate-800">{grades.length}</div>
                          )}
                          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Séries</div>
                      </div>
                  </div>
              }
          </div>
      </div>

      {
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* LEFT COLUMN: Departments & Grades */}
              <div className="space-y-8">
                  
                  {/* Departments List - View Only */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                          <div className="flex justify-between items-center">
                              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Briefcase size={18}/> Departamentos</h3>
                              {loading ? (
                                  <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" size={14}/>
                              ) : (
                                  <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-500 dark:text-slate-400">{departments.length}</span>
                              )}
                          </div>
                      </div>
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                          {departments.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhum departamento cadastrado.</div>
                          ) : (
                              departments.map(d => (
                                  <div key={d.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                                      <div>
                                          <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{d.name}</span>
                                          {d.code && <span className="ml-2 text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400">{d.code}</span>}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>

                  {/* Grades List - View Only */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                          <div className="flex justify-between items-center">
                              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><GraduationCap size={18}/> Séries</h3>
                              {loading ? (
                                  <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" size={14}/>
                              ) : (
                                  <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-500 dark:text-slate-400">{grades.length}</span>
                              )}
                          </div>
                      </div>
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                          {grades.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhuma série cadastrada.</div>
                          ) : (
                              grades.map(g => (
                                  <div 
                                    key={g.id} 
                                    onClick={() => handleViewGrade(g.id)}
                                    className="flex justify-between items-center p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 group cursor-pointer"
                                  >
                                      <div className="flex items-center gap-3">
                                          <span className="w-6 h-6 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">{g.level}</span>
                                          <span className="font-medium text-slate-700 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{g.name}</span>
                                      </div>
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); handleViewGrade(g.id); }}
                                          className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors opacity-0 group-hover:opacity-100"
                                          title="Ver Detalhes da Série"
                                      >
                                          <Eye size={14}/>
                                      </button>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>

              {/* RIGHT COLUMN: Classes & Faculty */}
              <div className="space-y-8">
                  
                  {/* Classes List - View Only */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-[400px] flex flex-col">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                          <div className="flex justify-between items-center">
                              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><BookOpen size={18}/> Turmas</h3>
                              {loading ? (
                                  <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" size={14}/>
                              ) : (
                                  <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-500 dark:text-slate-400">{classes.length}</span>
                              )}
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                          {classes.length === 0 ? (
                              <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhuma turma ativa encontrada.</div>
                          ) : (
                              <table className="w-full text-left">
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                      {classes.map(c => (
                                          <tr 
                                            key={c.id} 
                                            onClick={() => onViewClass?.(c.id)}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-700 group ${onViewClass ? 'cursor-pointer' : ''}`}
                                          >
                                              <td className={`p-4 font-bold text-slate-800 dark:text-slate-200 text-sm ${onViewClass ? 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors' : ''}`}>{c.name}</td>
                                              <td className="p-4 text-center">
                                                  <span 
                                                    onClick={(e) => { e.stopPropagation(); c.grade_id && handleViewGrade(c.grade_id); }}
                                                    className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                                  >
                                                    {c.school_grades?.name}
                                                  </span>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          )}
                      </div>
                  </div>

                  {/* Faculty List (View Only) */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Briefcase size={18}/> Corpo Docente</h3>
                          {loading ? (
                              <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" size={14}/>
                          ) : (
                              <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-500 dark:text-slate-400">{professors.length}</span>
                          )}
                      </div>
                      <div className="p-2 max-h-[300px] overflow-y-auto">
                          {professors.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhum professor vinculado.</div>
                          ) : (
                              professors.map(p => (
                                  <div 
                                    key={p.id} 
                                    onClick={() => onViewProfessor?.(p.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 ${onViewProfessor ? 'cursor-pointer group' : ''}`}
                                  >
                                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 overflow-hidden shrink-0">
                                          {p.app_users?.profile_picture_url ? <img src={p.app_users.profile_picture_url} className="w-full h-full object-cover"/> : <User size={14}/>}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className={`font-bold text-sm text-slate-800 dark:text-slate-200 truncate ${onViewProfessor ? 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors' : ''}`}>{p.name}</p>
                                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.email}</p>
                                      </div>
                                      <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded font-medium uppercase">{p.departments?.code || p.department}</span>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              </div>
          </div>
      }
    </div>
  );
};

export default InstitutionDetails;
