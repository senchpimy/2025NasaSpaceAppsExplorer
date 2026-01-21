import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

type Categoria = {
  nombre: string;
  subCategorias?: Array<String>;
}

type Project = {
  id: number | string,
  name: string,
  location: string,
  challenge: string,
  badges?: string | null,
  link: string
}

const opcionesIniciales = [
  { nombre: "Projects" },
  { nombre: "Locations" },
  { nombre: "Challenges" }
];

// --- RENDER HELPERS ---
const SearchBar = ({ 
  large = false, 
  searchTerm, 
  handleSearchChange, 
  handleSearchSubmit, 
  isHero 
}: { 
  large?: boolean, 
  searchTerm: string, 
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  handleSearchSubmit: () => void,
  isHero: boolean
}) => (
  <div className={`relative w-full ${large ? 'max-w-2xl' : 'max-w-xl'}`}>
    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 ${large ? 'scale-125' : ''}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
    <input
      type="text"
      placeholder={large ? "Search for projects..." : "Exoplanet Detection"}
      className={`w-full ${large ? 'p-4 pl-12 text-lg' : 'p-3 pl-12 text-sm'} 
        rounded-full
        bg-white/10 border border-white/20 text-white placeholder-gray-400 backdrop-blur-md
        focus:outline-none focus:border-blue-500/50 focus:bg-white/15 transition-all`}
      value={searchTerm}
      onChange={handleSearchChange}
      onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
      autoFocus={!isHero}
    />
    {large && (
        <div className="absolute inset-0 -z-10 bg-blue-500/20 blur-xl rounded-full opacity-0 focus-within:opacity-100 transition-opacity duration-500"></div>
    )}
  </div>
);

export function Selector() {
  const location = useLocation();
  const [opciones, setOpciones] = useState<Categoria[]>(opcionesIniciales);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<Project[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasAward, setHasAward] = useState(false);
  const [orderBy, setOrderBy] = useState("default");
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  
  // UI State
  const [isHero, setIsHero] = useState(true);

  // Handle Winners Filter from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('filter') === 'winners') {
      setIsHero(false);
      setOrderBy('awards');
      setHasAward(true);
    }
  }, [location.search]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastProjectElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && searchResults && searchResults.length < totalResults) {
        getResourses(true);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, searchResults, totalResults, selectedChallenges, selectedLocations, searchTerm, hasAward, orderBy]);

  useEffect(() => {
    const cargarDatos = async () => {
      const promesas = opcionesIniciales.map(async (e) => {
        try {
          const response = await fetch(`/api/categorias/${e.nombre.toLowerCase()}`);
          const resultado = await response.json();
          return { ...e, subCategorias: resultado.cont };
        } catch (error) {
          console.error(`Error cargando ${e.nombre}`, error);
          return { ...e, subCategorias: [] };
        }
      });

      const resultadosFinales = await Promise.all(promesas);
      setOpciones(resultadosFinales);
    };

    cargarDatos();
  }, []);

  async function getResourses(append: boolean = false) {
    setLoading(true);
    try {
      // Artificial delay to make loading state visible as requested
      if (append) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      const offset = append && searchResults ? searchResults.length : 0;
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challenges: selectedChallenges,
          locations: selectedLocations,
          query: searchTerm,
          hasAward: hasAward,
          orderBy: orderBy,
          offset: offset,
          limit: 50
        }),
      });
      const resultado = await response.json();
      if (append && searchResults) {
        const newItems = resultado.cont.filter((newItem: Project) => 
          !searchResults.some(existingItem => existingItem.id === newItem.id)
        );
        setSearchResults([...searchResults, ...newItems]);
      } else {
        setSearchResults(resultado.cont);
      }
      setTotalResults(resultado.total);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelection = (category: string, item: string) => {
    if (category === "Challenges") {
      setSelectedChallenges(prev => 
        prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
      );
    } else if (category === "Locations") {
      setSelectedLocations(prev => 
        prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
      );
    }
  };

  useEffect(() => {
    if (!isHero) {
      const timer = setTimeout(() => {
        getResourses();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedChallenges, selectedLocations, hasAward, orderBy, isHero, searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (val.length > 0 && isHero) {
      setIsHero(false);
    }
  };

  const handleSearchSubmit = () => {
      if (isHero) setIsHero(false);
      getResourses();
  }

  // --- HERO VIEW ---
  if (isHero) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)] overflow-hidden">
        {/* Planets */}
        <div className="absolute left-[10%] top-[40%] w-24 h-24 rounded-full bg-gradient-to-br from-[#c2410c] to-[#7c2d12] shadow-[0_0_60px_rgba(194,65,12,0.4)] animate-pulse">
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] font-bold text-gray-500">MARS</span>
        </div>
        <div className="absolute right-[10%] top-[40%] w-24 h-24 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a] shadow-[0_0_60px_rgba(59,130,246,0.4)] animate-pulse" style={{ animationDelay: '1s' }}>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] font-bold text-gray-500">NEPTUNE</span>
        </div>

        {/* Content */}
        <div className="z-10 flex flex-col items-center text-center max-w-4xl px-4 mt-[-5vh]">
          <span className="text-blue-400 font-bold tracking-[0.3em] text-xs mb-4 uppercase">Project Explorer</span>
          <h1 className="text-7xl md:text-9xl font-serif text-white tracking-widest mb-2 opacity-90" style={{ textShadow: '0 0 40px rgba(255,255,255,0.1)' }}>
            SPACE APPS
          </h1>
          
          <div className="w-24 h-1 bg-blue-500 rounded-full mb-8"></div>

          <p className="text-gray-400 text-lg mb-12 font-light">
            Discover innovative solutions crafted for the universe.
          </p>

          <div className="w-full max-w-2xl mb-20 relative group">
              {/* Glow effect behind search */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <SearchBar 
                large={true} 
                searchTerm={searchTerm}
                handleSearchChange={handleSearchChange}
                handleSearchSubmit={handleSearchSubmit}
                isHero={isHero}
              />
              
              <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => setIsHero(false)}
                    className="bg-white text-black px-8 py-3 rounded-full text-xs font-bold tracking-widest hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                  >
                      START EXPLORING
                  </button>
              </div>
          </div>

          <div className="flex gap-4">
              {opciones.map((opt) => (
                  <button 
                    key={opt.nombre}
                    onClick={() => {
                        setIsHero(false);
                        if (opt.nombre === "Winners") {
                            setOrderBy("awards");
                            setHasAward(true);
                        }
                    }}
                    className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs font-bold tracking-widest text-gray-400 transition-all flex items-center gap-2"
                  >
                      {opt.nombre === "Locations" && "🌍"}
                      {opt.nombre === "Winners" && "🏆"}
                      {opt.nombre === "Challenges" && "⚡"}
                      {opt.nombre.toUpperCase()}
                  </button>
              ))}
          </div>
        </div>

        {/* Bottom Arc Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-900/20 to-transparent pointer-events-none rounded-[100%] scale-x-150 translate-y-1/2 blur-3xl"></div>
      </div>
    );
  }

  // --- RESULTS VIEW ---
  return (
    <div className="flex flex-col min-h-screen">
      {/* Search Header Banner */}
      <div className="w-full bg-gradient-to-r from-blue-900/40 to-slate-900/40 border-b border-white/5 p-6 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-2">
                <span className="text-2xl font-serif text-white">PROJECT RESULTS</span>
                <span className="w-px h-6 bg-gray-700 mx-2"></span>
                <span className="text-xs font-bold tracking-widest text-gray-500">EXPLORING THE ARCHIVE</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <SearchBar 
                  searchTerm={searchTerm}
                  handleSearchChange={handleSearchChange}
                  handleSearchSubmit={handleSearchSubmit}
                  isHero={isHero}
                />
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c2410c] to-[#7c2d12]"></div>
                        <span className="text-[8px] tracking-widest text-gray-500 mt-1 uppercase">Mars</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1e3a8a]"></div>
                        <span className="text-[8px] tracking-widest text-gray-500 mt-1 uppercase">Neptune</span>
                    </div>
                </div>
            </div>
          </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-6">
        {/* Filters Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between mb-8">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-gray-500 uppercase mr-2">Active Filters:</span>
                {selectedChallenges.map(c => (
                    <span key={c} className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                    {c} <button onClick={() => setSelectedChallenges(prev => prev.filter(i => i !== c))} className="hover:text-white">×</button>
                    </span>
                ))}
                {selectedLocations.map(l => (
                    <span key={l} className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                    {l} <button onClick={() => setSelectedLocations(prev => prev.filter(i => i !== l))} className="hover:text-white">×</button>
                    </span>
                ))}
                {(selectedChallenges.length === 0 && selectedLocations.length === 0) && (
                    <span className="text-xs text-gray-600 italic">None selected</span>
                )}
                {(selectedChallenges.length > 0 || selectedLocations.length > 0) && (
                    <button onClick={() => { setSelectedChallenges([]); setSelectedLocations([]); }} className="text-xs text-gray-400 underline hover:text-white ml-2">CLEAR ALL</button>
                )}
            </div>

            <div className="flex items-center gap-4">
                <span className="text-3xl font-serif text-white">{totalResults.toLocaleString()}</span>
                <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Results</span>
                <div className="w-px h-4 bg-gray-700 mx-2"></div>
                <select 
                    value={orderBy} 
                    onChange={(e) => setOrderBy(e.target.value)}
                    className="bg-transparent text-gray-400 text-xs font-bold tracking-widest uppercase border-none outline-none cursor-pointer hover:text-white"
                >
                    <option value="default">Sort by: Relevance</option>
                    <option value="awards">Sort by: Awards</option>
                </select>
            </div>
        </div>

        {/* Filter Selection Grid */}
        <div className="flex flex-col gap-6 mb-12">
            {[ "Locations", "Challenges" ].map((catName) => (
                <div key={catName} className="flex items-center gap-4 group">
                    <div className="flex-shrink-0 w-36">
                        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 group-hover:border-blue-500/30 group-hover:text-white transition-all">
                            <span>{catName === "Locations" ? "🌍" : "⚡"}</span>
                            {catName}
                        </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-1">
                        {opciones.find(o => o.nombre === catName)?.subCategorias?.map((sub, i) => {
                            const isSelected = catName === "Challenges" 
                                ? selectedChallenges.includes(sub as string)
                                : selectedLocations.includes(sub as string);
                            
                            return (
                                <button 
                                    key={i} 
                                    onClick={() => toggleSelection(catName, sub as string)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border
                                    ${isSelected 
                                        ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
                                        : "bg-gray-900/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white hover:border-gray-500"}
                                    `}>
                                    {sub}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>

        {/* Results Grid */}
        {loading && !searchResults && (
            <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )}

        {searchResults && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
              {searchResults.map((result, i) => {
                const isLast = searchResults.length === i + 1;
                const hasAward = result.badges && result.badges.length > 0;
                return (
                  <div 
                    key={`${result.id}-${i}`}
                    ref={isLast ? lastProjectElementRef : null}
                    className="bg-gradient-to-b from-gray-800/40 to-gray-900/40 border border-gray-700/50 p-6 rounded-lg group hover:border-blue-500/50 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] flex flex-col h-full animate-project-card"
                    style={{ animationDelay: `${(i % 10) * 0.05}s` }}
                  >
                      <div className="flex justify-between items-start mb-4">
                           {/* Placeholder Icon */}
                           <div className="w-12 h-12 rounded-lg bg-gray-700/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                               {['🚀', '🛰️', '🌌', '🔭', '🪐'][i % 5]}
                           </div>
                                                    {hasAward && (
                                                        <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                                                          {result.badges?.split(',').map((badge, idx) => (
                                                            <span key={idx} className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                                                {badge.trim()}
                                                            </span>
                                                          ))}
                                                        </div>
                                                    )}
                           
                      </div>
                    
                    <div className="mb-2">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-500/20">
                          {result.challenge.substring(0, 20)}...
                        </span>
                    </div>

                    <h3 className="text-xl font-serif text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                      {result.name}
                    </h3>
                    
                    <p className="text-sm text-gray-400 line-clamp-3 mb-6 flex-1">
                        A project developed in <span className="text-gray-300">{result.location}</span>. 
                        Innovative solution tackling space challenges using open data.
                    </p>
                    
                    <div className="pt-4 border-t border-gray-700/50 flex items-center justify-between mt-auto">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                          📍 {result.location}
                      </span>
                      <a
                          href={`https://www.spaceappschallenge.org${result.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold tracking-widest text-blue-400 group-hover:translate-x-1 transition-transform uppercase flex items-center gap-1"
                      >
                          Explore <span className="text-lg leading-none">→</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold tracking-[0.2em] text-blue-500/60 uppercase">Retrieving more data</span>
              </div>
            )}
            
            {!loading && searchResults.length >= totalResults && totalResults > 0 && (
              <div className="flex justify-center py-12">
                <span className="text-[10px] font-bold tracking-[0.2em] text-gray-600 uppercase">All projects explored</span>
              </div>
            )}
            <div className="pb-20"></div>
          </>
        )}
      </div>
    </div>
  );
}
