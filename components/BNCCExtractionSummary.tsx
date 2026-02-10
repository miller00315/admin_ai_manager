import React, { useState } from 'react';
import { ExtractedBNCC, BNCCExtractionResult } from '../services/geminiService';
import { BNCCItem } from '../types';
import { BookOpen, CheckCircle, X, AlertTriangle, Loader2, Save, FileText } from 'lucide-react';

interface BNCCExtractionSummaryProps {
    result: BNCCExtractionResult | null;
    fileName: string;
    onSave: (bnccs: Partial<BNCCItem>[]) => Promise<void>;
    onClose: () => void;
    isSaving: boolean;
    isExtracting: boolean;
}

const BNCCExtractionSummary: React.FC<BNCCExtractionSummaryProps> = ({ 
    result, 
    fileName, 
    onSave, 
    onClose, 
    isSaving,
    isExtracting
}) => {
    const [selectedItems, setSelectedItems] = useState<Set<number>>(
        new Set(result?.bnccs.map((_, index) => index) || [])
    );

    // Show loading state while extracting
    if (isExtracting || !result) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText size={24} className="text-indigo-600"/>
                            Processando Documento
                        </h3>
                    </div>
                    
                    <div className="p-12 text-center">
                        <Loader2 size={64} className="mx-auto text-indigo-600 mb-4 animate-spin"/>
                        <h4 className="text-lg font-bold text-slate-800 mb-2">Analisando PDF...</h4>
                        <p className="text-slate-600 mb-6">
                            Extraindo texto e identificando competências e habilidades da BNCC.
                        </p>
                        <p className="text-sm text-slate-500">
                            <strong>Arquivo:</strong> {fileName}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const toggleItem = (index: number) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedItems(newSelected);
    };

    const toggleAll = () => {
        if (selectedItems.size === result.bnccs.length) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(result.bnccs.map((_, index) => index)));
        }
    };

    const handleSave = async () => {
        const itemsToSave = result.bnccs
            .filter((_, index) => selectedItems.has(index))
            .map(bncc => ({
                codigo_alfanumerico: bncc.codigo_alfanumerico,
                componente_curricular: bncc.componente_curricular || '',
                descricao_habilidade: bncc.descricao_habilidade || '',
                ano_serie: bncc.ano_serie || '',
                unidade_tematica: bncc.unidade_tematica || ''
            } as Partial<BNCCItem>));

        await onSave(itemsToSave);
    };

    if (!result.hasBNCCContent) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText size={24} className="text-indigo-600"/>
                            Análise do Documento
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
                            <X size={24}/>
                        </button>
                    </div>
                    
                    <div className="p-8 text-center">
                        <AlertTriangle size={64} className="mx-auto text-amber-400 mb-4"/>
                        <h4 className="text-lg font-bold text-slate-800 mb-2">Conteúdo não relacionado à BNCC</h4>
                        <p className="text-slate-600 mb-6">
                            {result.message || 'O documento analisado não contém informações relacionadas à Base Nacional Comum Curricular (BNCC).'}
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                            <strong>Arquivo:</strong> {fileName}
                        </p>
                        <button
                            onClick={onClose}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (result.bnccs.length === 0) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText size={24} className="text-indigo-600"/>
                            Análise do Documento
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
                            <X size={24}/>
                        </button>
                    </div>
                    
                    <div className="p-8 text-center">
                        <AlertTriangle size={64} className="mx-auto text-amber-400 mb-4"/>
                        <h4 className="text-lg font-bold text-slate-800 mb-2">Nenhuma BNCC encontrada</h4>
                        <p className="text-slate-600 mb-6">
                            Não foi possível identificar competências ou habilidades da BNCC no documento analisado.
                        </p>
                        <p className="text-sm text-slate-500 mb-6">
                            <strong>Arquivo:</strong> {fileName}
                        </p>
                        <button
                            onClick={onClose}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen size={24} className="text-indigo-600"/>
                            BNCCs Extraídas do Documento
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                            <strong>Arquivo:</strong> {fileName} • <strong>{result.bnccs.length}</strong> habilidade{result.bnccs.length !== 1 ? 's' : ''} encontrada{result.bnccs.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
                        <X size={24}/>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={selectedItems.size === result.bnccs.length}
                                onChange={toggleAll}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <span className="font-semibold">Selecionar todas ({selectedItems.size}/{result.bnccs.length})</span>
                        </label>
                    </div>

                    <div className="space-y-4">
                        {result.bnccs.map((bncc, index) => (
                            <div
                                key={bncc.codigo_alfanumerico || `bncc-${index}`}
                                className={`border-2 rounded-lg p-4 transition-all ${
                                    selectedItems.has(index)
                                        ? 'border-indigo-500 bg-indigo-50'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedItems.has(index)}
                                        onChange={() => toggleItem(index)}
                                        className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-mono font-bold text-indigo-700 text-sm bg-indigo-100 px-2 py-1 rounded">
                                                {bncc.codigo_alfanumerico}
                                            </span>
                                            {bncc.componente_curricular && (
                                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                                    {bncc.componente_curricular}
                                                </span>
                                            )}
                                            {bncc.ano_serie && (
                                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                                                    {bncc.ano_serie}
                                                </span>
                                            )}
                                        </div>
                                        {bncc.unidade_tematica && (
                                            <p className="text-sm text-slate-600 mb-2">
                                                <strong>Unidade Temática:</strong> {bncc.unidade_tematica}
                                            </p>
                                        )}
                                        {bncc.descricao_habilidade && (
                                            <p className="text-sm text-slate-700">
                                                {bncc.descricao_habilidade}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="text-sm text-slate-600">
                        <strong>{selectedItems.size}</strong> de <strong>{result.bnccs.length}</strong> habilidade{selectedItems.size !== 1 ? 's' : ''} selecionada{selectedItems.size !== 1 ? 's' : ''}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={selectedItems.size === 0 || isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin" size={18}/>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={18}/>
                                    Salvar {selectedItems.size} habilidade{selectedItems.size !== 1 ? 's' : ''}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BNCCExtractionSummary;
