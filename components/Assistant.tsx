import React, { useState } from 'react';
import { askBeekeepingAdvisor } from '../services/geminiService';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

export const Assistant: React.FC = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResponse('');
    
    const answer = await askBeekeepingAdvisor(query);
    setResponse(answer);
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col max-h-[600px]">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 rounded-t-xl text-white">
            <h2 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare /> Assistant Réglementaire
            </h2>
            <p className="text-blue-100 mt-2">
                Posez vos questions sur la législation sanitaire, l'étiquetage ou les traitements autorisés.
            </p>
        </div>

        <div className="bg-white border-x border-b border-gray-200 p-6 rounded-b-xl flex-grow flex flex-col">
            <div className="flex-grow overflow-y-auto mb-4 min-h-[200px] bg-gray-50 rounded-lg p-4">
                {!response && !loading && (
                    <div className="text-gray-400 text-center mt-10">
                        <p>Exemples de questions :</p>
                        <ul className="text-sm mt-2 space-y-2">
                            <li>"Quelles mentions sont obligatoires sur l'étiquette de miel ?"</li>
                            <li>"Combien de temps dois-je garder le registre d'élevage ?"</li>
                            <li>"Quels sont les traitements anti-varroa autorisés ?"</li>
                        </ul>
                    </div>
                )}
                
                {loading && (
                    <div className="flex justify-center items-center h-full text-blue-500">
                        <Loader2 className="animate-spin mr-2" /> Recherche dans la réglementation...
                    </div>
                )}

                {response && (
                    <div className="prose prose-blue max-w-none">
                        <div className="whitespace-pre-wrap text-gray-800">{response}</div>
                    </div>
                )}
            </div>

            <form onSubmit={handleAsk} className="flex gap-2">
                <input
                    type="text"
                    className="flex-grow border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Posez votre question..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                    type="submit" 
                    disabled={loading || !query.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg disabled:opacity-50"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    </div>
  );
};
