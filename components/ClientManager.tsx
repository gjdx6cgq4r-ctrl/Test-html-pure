
import React, { useState, useEffect } from 'react';
import { Client, Sale } from '../types';
import * as Storage from '../services/storageService';
import { Users, Phone, Mail, MapPin, Plus, Trash2, Search, Medal, Edit2, X, Check } from 'lucide-react';

export const ClientManager: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    
    // Form state
    const [formData, setFormData] = useState<Partial<Client>>({ name: '', phone: '', email: '', address: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setClients(Storage.clients.getAll());
        setSales(Storage.sales.getAll());
    };

    const handleSaveClient = () => {
        if (!formData.name) return;

        if (editingId) {
            // UPDATE
            Storage.clients.update({
                ...formData as Client,
                id: editingId
            });
            setEditingId(null);
        } else {
            // CREATE
            Storage.clients.add({
                ...formData as Client,
                id: Storage.generateId()
            });
        }
        
        setFormData({ name: '', phone: '', email: '', address: '' });
        refreshData();
    };

    const handleEditClick = (client: Client) => {
        setEditingId(client.id);
        setFormData({ ...client });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ name: '', phone: '', email: '', address: '' });
    };

    const handleDeleteClient = (id: string) => {
        if(window.confirm("Supprimer ce client ?")) {
            Storage.clients.delete(id);
            refreshData();
        }
    };

    // Calculate total spent for a client
    const getClientTotal = (client: Client) => {
        return sales
            .filter(s => s.clientId === client.id || s.buyerName === client.name) // Match ID or Name for legacy compatibility
            .reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    };

    // Sort clients by total spent desc
    const sortedClients = [...clients]
        .map(c => ({...c, totalSpent: getClientTotal(c)}))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-xl text-white shadow-md">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Users /> Gestion des Clients
                </h2>
                <p className="text-blue-100 mt-2">
                    Suivez vos meilleurs acheteurs et fidélisez votre clientèle.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-1 h-fit sticky top-4">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        {editingId ? <Edit2 size={18} className="text-blue-600"/> : <Plus size={18}/>} 
                        {editingId ? "Modifier Client" : "Nouveau Client"}
                    </h3>
                    
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="Nom / Prénom *" 
                            className="w-full border p-2 rounded-lg font-bold"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                        <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                            <Phone size={16} className="text-gray-400"/>
                            <input 
                                type="text" 
                                placeholder="Téléphone" 
                                className="w-full bg-transparent outline-none"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                            <Mail size={16} className="text-gray-400"/>
                            <input 
                                type="email" 
                                placeholder="Email" 
                                className="w-full bg-transparent outline-none"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                         <div className="flex items-center gap-2 border p-2 rounded-lg bg-gray-50">
                            <MapPin size={16} className="text-gray-400"/>
                            <input 
                                type="text" 
                                placeholder="Adresse / Ville" 
                                className="w-full bg-transparent outline-none"
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                        </div>

                        <div className="flex gap-2 mt-4">
                            {editingId && (
                                <button 
                                    onClick={handleCancelEdit}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg flex items-center justify-center gap-1"
                                >
                                    <X size={16}/> Annuler
                                </button>
                            )}
                            <button 
                                onClick={handleSaveClient}
                                className={`flex-1 font-bold py-2 rounded-lg flex items-center justify-center gap-1 ${editingId ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                            >
                                {editingId ? <><Check size={16}/> Mettre à jour</> : 'Ajouter'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">Mes Clients ({sortedClients.length})</h3>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
                            <input 
                                type="text" 
                                placeholder="Rechercher..." 
                                className="pl-9 pr-4 py-2 border rounded-full text-sm focus:ring-2 ring-indigo-100 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {sortedClients.length === 0 && <p className="text-gray-400 text-center py-8">Aucun client trouvé.</p>}
                        
                        {sortedClients.map((client, index) => (
                            <div key={client.id} className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg hover:shadow-md transition ${editingId === client.id ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-gray-50'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${
                                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-700' : 'bg-indigo-400'
                                    }`}>
                                        {index < 3 ? <Medal size={20}/> : client.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{client.name}</div>
                                        <div className="text-xs text-gray-500 flex flex-col sm:flex-row gap-1 sm:gap-3">
                                            {client.phone && <span className="flex items-center gap-1"><Phone size={10}/> {client.phone}</span>}
                                            {client.email && <span className="flex items-center gap-1"><Mail size={10}/> {client.email}</span>}
                                            {client.address && <span className="flex items-center gap-1"><MapPin size={10}/> {client.address}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between w-full sm:w-auto mt-3 sm:mt-0 gap-4">
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 uppercase font-semibold">Total Achat</div>
                                        <div className="font-bold text-indigo-700 text-lg">{client.totalSpent.toFixed(2)} €</div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleEditClick(client)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded">
                                            <Edit2 size={18}/>
                                        </button>
                                        <button onClick={() => handleDeleteClient(client.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded">
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
