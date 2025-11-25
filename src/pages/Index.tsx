import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/StatsCard";
import { Search, Package, AlertTriangle, Clock, User, MapPin, Info, CheckCircle, XCircle, X, ArrowRight, ChevronRight, Sparkles, Maximize2 } from "lucide-react";
import { toast } from "sonner";

// --- TIPOS DE DATOS ---
interface Part {
  sku: string;
  descripcion: string;
  marca: string;
  stock_actual: number;
  precio: string;
  ubicacion_pasillo: string;
  imagen_url: string;
  id_grupo: number;
  nombre_grupo?: string;
  compatible_models?: string[];
}

interface Suggestion {
  descripcion: string;
  sku: string;
}

const Index = () => {
  // --- ESTADOS ---
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // NUEVO: Estados para Historial y Contador
  const [dailySearchCount, setDailySearchCount] = useState(12); // Empieza en 12
  const [recentSearches, setRecentSearches] = useState<string[]>(["R150-002107", "Amortiguador", "USB Avatar"]);

  // Estados de Autocompletado
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Flujo de Búsqueda
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [alternatives, setAlternatives] = useState<Part[]>([]);

  // Modales
  const [selectedTechPart, setSelectedTechPart] = useState<Part | null>(null);
  const [pickingItem, setPickingItem] = useState<Part | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const shouldFetchSuggestions = useRef(true); 

  // --- EFECTO: AUTOCOMPLETADO ---
  useEffect(() => {
    if (!shouldFetchSuggestions.current) return;

    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggestions?q=${searchQuery}`);
        const data = await response.json();
        setSuggestions(data);
        if (shouldFetchSuggestions.current) {
            setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Error fetching suggestions", error);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // --- 1. BUSCAR ---
  const handleSearch = async (term?: string) => {
    shouldFetchSuggestions.current = false; 
    setShowSuggestions(false);

    const query = term || searchQuery;
    if (!query.trim()) return;

    setSearchQuery(query);
    setLoading(true);
    setSearchResults([]);
    setSelectedPart(null);

    // NUEVO: Actualizar Contadores e Historial
    // 1. Aumentamos el contador de hoy
    setDailySearchCount(prev => prev + 1);

    // 2. Actualizamos el historial (Lógica de Pila: Último entra primero)
    setRecentSearches(prev => {
        // Filtramos si ya existe para no duplicar y tomamos los últimos 2 para sumar el nuevo
        const newHistory = [query, ...prev.filter(item => item !== query)].slice(0, 3);
        return newHistory;
    });

    try {
        const response = await fetch(`/api/search?q=${query}`);
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
            setSearchResults(data);
            if (data.length === 1) {
                selectPart(data[0], query);
            }
        } else {
            toast.error("No se encontraron repuestos.");
        }
    } catch (error) {
        console.error("Error:", error);
        toast.error("Error de conexión con el servidor.");
    } finally {
        setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    shouldFetchSuggestions.current = false;
    setSearchQuery(suggestion.descripcion);
    handleSearch(suggestion.descripcion);
  };

  // --- 2. SELECCIONAR DETALLE ---
  const selectPart = async (part: Part, currentQuery = searchQuery) => {
    setLoading(true);
    setAlternatives([]);
    shouldFetchSuggestions.current = false; 
    setSearchQuery(part.descripcion); 
    
    try {
        const compResponse = await fetch(`/api/details/${part.sku}`);
        const compData = await compResponse.json();
        
        const fullPart = { ...part, compatible_models: compData };
        setSelectedPart(fullPart);

        if (part.stock_actual >= 0) {
            const altResponse = await fetch(`/api/alternatives/${part.id_grupo}/${part.sku}?q=${currentQuery}`);
            const altData = await altResponse.json();
            setAlternatives(altData);
            
            if (altData.length > 0) {
                toast.success("Alternativas encontradas");
            } else {
                toast.info("No hay alternativas directas.");
            }
        }
    } catch (error) {
        console.error(error);
        toast.error("Error al cargar detalles.");
    } finally {
        setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch(); };
  const openTechModal = (part: Part) => setSelectedTechPart(part);
  const closeTechModal = () => setSelectedTechPart(null);
  const openPickingDrawer = (part: Part) => setPickingItem(part);
  const confirmPicking = () => { toast.success("Ítem confirmado para despacho."); setPickingItem(null); };
  
  // NUEVO: Reset Search mantiene el historial
  const resetSearch = () => { 
      setSearchResults([]); 
      setSelectedPart(null); 
      setSearchQuery(""); 
  };

  return (
    <div className="min-h-screen bg-secondary/20 pb-20 font-sans text-slate-900">
      {/* HEADER */}
      <header className="bg-white border-b-2 border-primary sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetSearch}>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Jarvis<span className="text-primary">Bike</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
               <div className="hidden md:block text-right">
                  <p className="text-sm font-bold">Bodega Central</p>
                  <p className="text-xs text-muted-foreground">Sistema Online</p>
               </div>
               <div className="h-10 w-10 rounded-full bg-slate-100 border flex items-center justify-center text-primary"><User className="h-5 w-5" /></div>
            </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* BUSCADOR */}
        <div className={`max-w-3xl mx-auto text-center transition-all duration-500 ${searchResults.length > 0 ? 'mb-6' : 'mb-12 mt-8'}`}>
          {!selectedPart && searchResults.length === 0 && (
            <>
              <h2 className="text-3xl font-bold mb-2">Motor de Búsqueda Inteligente</h2>
              <p className="text-muted-foreground mb-8">Ingresa SKU, nombre o característica (ej: USB)</p>
            </>
          )}
          
          <div ref={searchContainerRef} className="relative">
            <div className="flex shadow-lg rounded-lg overflow-hidden border border-slate-200 bg-white z-20 relative">
                <div className="pl-4 flex items-center justify-center text-slate-400"><Search className="h-5 w-5" /></div>
                <Input
                type="text"
                placeholder="Ej: Amortiguador, USB, R150..."
                value={searchQuery}
                onChange={(e) => {
                    shouldFetchSuggestions.current = true;
                    setSearchQuery(e.target.value);
                }}
                onKeyDown={handleKeyPress}
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                className="h-14 text-lg border-0 focus-visible:ring-0 rounded-none"
                />
                <Button size="lg" onClick={() => handleSearch()} className="h-14 px-8 rounded-none font-bold text-md" disabled={loading}>
                {loading ? "..." : "BUSCAR"}
                </Button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-b-lg shadow-xl z-10 mt-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="text-xs font-bold text-slate-400 uppercase px-4 py-2 bg-slate-50 border-b">Sugerencias</div>
                    <ul>
                        {suggestions.map((item, idx) => (
                            <li key={idx} onClick={() => handleSelectSuggestion(item)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center group border-b border-slate-100 last:border-0 text-left">
                                <span className="text-slate-700 font-medium group-hover:text-primary">{item.descripcion}</span>
                                <span className="text-xs text-slate-400 font-mono">{item.sku}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        </div>

        {/* LISTA DE RESULTADOS */}
        {!selectedPart && searchResults.length > 0 && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Resultados encontrados ({searchResults.length})</h3>
                    <Button variant="ghost" onClick={resetSearch} size="sm"><X className="mr-2 h-4 w-4"/> Limpiar</Button>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {searchResults.map((item) => (
                        <div key={item.sku} onClick={() => selectPart(item)} className="bg-white p-4 rounded-lg border hover:border-primary cursor-pointer transition-all shadow-sm hover:shadow-md flex items-center gap-4 group">
                            <div className="h-16 w-16 bg-slate-100 rounded flex-shrink-0 overflow-hidden flex items-center justify-center">
                                <img src={item.imagen_url} className="w-full h-full object-cover" alt="" onError={(e) => e.currentTarget.src = 'https://placehold.co/100x100?text=IMG'} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg group-hover:text-primary">{item.descripcion}</h4>
                                <div className="flex gap-4 text-sm text-slate-500">
                                    <span className="font-mono bg-slate-100 px-1 rounded">SKU: {item.sku}</span>
                                    <span>|</span>
                                    <span>{item.ubicacion_pasillo}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`block font-bold ${item.stock_actual === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    {item.stock_actual === 0 ? "AGOTADO" : `Stock: ${item.stock_actual}`}
                                </span>
                                <span className="text-sm font-bold text-slate-900">${item.precio}</span>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:text-primary" />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* DETALLE SELECCIONADO + ALTERNATIVAS */}
        {selectedPart && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            
            {/* IZQUIERDA */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex justify-between items-center">
                 <Button variant="outline" size="sm" onClick={() => setSelectedPart(null)}>← Volver a la lista</Button>
              </div>

              <div className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden ${selectedPart.stock_actual === 0 ? 'border-destructive' : 'border-green-500'}`}>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">SKU: {selectedPart.sku}</span>
                      <h2 className="text-2xl font-bold mt-1">{selectedPart.descripcion}</h2>
                      <p className="text-sm text-slate-500">Marca: {selectedPart.marca}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${selectedPart.stock_actual === 0 ? 'bg-red-50 text-destructive border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                      {selectedPart.stock_actual === 0 ? <><XCircle className="h-3 w-3" /> AGOTADO</> : <><CheckCircle className="h-3 w-3" /> EN STOCK {selectedPart.stock_actual}</>}
                    </div>
                  </div>

                  <div className="flex gap-6 mt-6 flex-col sm:flex-row">
                    <div className="h-48 w-48 bg-slate-100 rounded-lg flex-shrink-0 border mx-auto sm:mx-0 overflow-hidden flex items-center justify-center">
                       <img src={selectedPart.imagen_url} className="w-full h-full object-cover" alt="Repuesto" onError={(e) => e.currentTarget.src = 'https://placehold.co/200x200?text=No+Image'} />
                    </div>
                    <div className="flex-1 space-y-3">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3 rounded border">
                             <span className="text-xs text-slate-500 block">Precio Unitario</span>
                             <span className="font-bold text-lg">${selectedPart.precio}</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded border">
                             <span className="text-xs text-slate-500 block">Ubicación</span>
                             <span className="font-bold text-lg">{selectedPart.ubicacion_pasillo}</span>
                          </div>
                       </div>
                       <div className="p-3 bg-slate-50 rounded border text-sm text-slate-600">
                            <span className="font-bold text-slate-800">Grupo Funcional:</span> {selectedPart.nombre_grupo}
                       </div>
                       <Button variant="outline" className="w-full gap-2 mt-2" onClick={() => openTechModal(selectedPart)}>
                         <Info className="h-4 w-4" /> Ver Ficha Técnica
                       </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DERECHA */}
            <div className="lg:col-span-5">
               {selectedPart.stock_actual >= 0 && (
               <div className="sticky top-24">
                  <div className="bg-white rounded-xl border shadow-lg overflow-hidden">
                     <div className="bg-primary px-6 py-4 text-primary-foreground flex justify-between items-center">
                        <div className="flex items-center gap-2">
                           <Sparkles className="h-5 w-5 text-yellow-300" />
                           <span className="font-bold">Alternativas Inteligentes</span>
                        </div>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Grupo {selectedPart.id_grupo}</span>
                     </div>

                     <div className="p-4 space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto bg-slate-50/50">
                        {alternatives.length > 0 ? alternatives.map((alt) => (
                           <div key={alt.sku} onClick={() => selectPart(alt)} className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-primary transition-all relative group cursor-pointer">
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="h-4 w-4 text-slate-400" /></div>
                              <div className="flex justify-between items-start mb-2">
                                 <div>
                                    <h4 className="font-bold text-sm text-slate-800 group-hover:text-primary">{alt.descripcion}</h4>
                                    <p className="text-xs text-slate-500 font-mono">{alt.sku}</p>
                                 </div>
                                 <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200">
                                    Stock: {alt.stock_actual}
                                 </span>
                              </div>
                              <div className="flex justify-between items-end mt-4">
                                 <div className="text-xs text-slate-500"><MapPin className="h-3 w-3 inline mr-1" />{alt.ubicacion_pasillo}</div>
                                 <span className="font-bold text-lg text-slate-900">${alt.precio}</span>
                              </div>
                              <Button className="w-full mt-3 gap-2 bg-slate-900 hover:bg-primary transition-colors relative z-10" size="sm" onClick={(e) => { e.stopPropagation(); openPickingDrawer(alt); }}>
                                 Localizar en Bodega <ArrowRight className="h-3 w-3" />
                              </Button>
                           </div>
                        )) : (
                            <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                                <AlertTriangle className="h-8 w-8 mb-2 opacity-20" />
                                <p>No se encontraron alternativas automáticas.</p>
                            </div>
                        )}
                     </div>
                  </div>
               </div>
               )}
            </div>
          </div>
        )}

        {/* DASHBOARD INICIAL */}
        {!selectedPart && searchResults.length === 0 && !loading && (
          <div className="max-w-5xl mx-auto space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard title="Total Referencias" value="3,319" icon={Package} />
              <StatsCard title="Motos Soportadas" value="34" icon={AlertTriangle} />
              {/* NUEVO: Pasamos la variable de estado dailySearchCount */}
              <StatsCard title="Búsquedas Hoy" value={dailySearchCount} icon={Clock} />
            </div>
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-slate-400" /> Búsquedas Recientes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* NUEVO: Mapeamos el estado recentSearches */}
                {recentSearches.map((term, index) => (
                  <button key={index} onClick={() => handleSearch(term)} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border transition-colors group text-left">
                    <span className="font-medium">{term}</span>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL FICHA TÉCNICA */}
      {selectedTechPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border overflow-hidden animate-in zoom-in-95">
              <div className="flex justify-between items-center p-6 border-b">
                 <h3 className="text-xl font-bold">Ficha Técnica: {selectedTechPart.sku}</h3>
                 <Button variant="ghost" size="icon" onClick={closeTechModal}><X className="h-5 w-5" /></Button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-slate-100 rounded-lg flex items-center justify-center min-h-[200px] p-4">
                    <img src={selectedTechPart.imagen_url} alt="Detalle" className="max-w-full max-h-[200px] object-contain" onError={(e) => e.currentTarget.src = 'https://placehold.co/200x200?text=No+Image'} />
                 </div>
                 <div className="space-y-4">
                    <h4 className="font-bold text-lg text-primary">{selectedTechPart.descripcion}</h4>
                    <div className="text-sm text-slate-600 space-y-1">
                        <p><strong>Marca:</strong> {selectedTechPart.marca}</p>
                        <p><strong>Categoría:</strong> {selectedTechPart.nombre_grupo}</p>
                    </div>
                    <div className="border-t pt-4">
                        <h5 className="text-xs font-bold text-slate-400 uppercase mb-3">Compatibilidad Validada</h5>
                        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                            {selectedTechPart.compatible_models?.map((m, i) => (
                                <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded font-medium">{m}</span>
                            ))}
                            {!selectedTechPart.compatible_models?.length && <span className="text-xs text-slate-400 italic">Genérico / Sin asignación específica.</span>}
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* DRAWER DE DESPACHO */}
      {pickingItem && (
         <>
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setPickingItem(null)} />
            <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white shadow-2xl border-l animate-in slide-in-from-right flex flex-col">
               <div className="p-6 border-b bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="font-bold text-lg flex items-center gap-2"><Package className="h-5 w-5" /> Recolección</h3>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setPickingItem(null)}><X className="h-5 w-5" /></Button>
               </div>
               <div className="flex-1 p-6 overflow-y-auto">
                  <div className="bg-slate-50 p-4 rounded border mb-6">
                     <p className="text-sm text-slate-500 mb-1">Ítem a recoger:</p>
                     <p className="font-bold text-lg leading-tight">{pickingItem.descripcion}</p>
                     <p className="font-mono text-sm text-slate-400 mt-1">{pickingItem.sku}</p>
                  </div>
                  <div className="space-y-6">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-yellow-900 flex items-center gap-4 shadow-sm">
                            <MapPin className="h-8 w-8 text-yellow-600" />
                            <div><p className="text-xs font-bold uppercase text-yellow-600">Ubicación Física</p><p className="text-3xl font-bold">{pickingItem.ubicacion_pasillo}</p></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad a despachar</label>
                        <Input type="number" defaultValue="1" min="1" max={pickingItem.stock_actual} className="text-lg h-12 font-bold" />
                        <p className="text-xs text-slate-500 mt-2">Disponible: {pickingItem.stock_actual}</p>
                    </div>
                  </div>
               </div>
               <div className="p-6 border-t bg-slate-50">
                   <Button className="w-full h-14 hidden text-lg font-bold gap-2 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-900/20" onClick={confirmPicking}>
                       <CheckCircle className="h-6 w-6" /> CONFIRMAR DESPACHO
                   </Button>
               </div>
            </div>
         </>
      )}
    </div>
  );
};

export default Index;