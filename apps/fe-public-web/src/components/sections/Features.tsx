'use client';

import { Brain, Mic, Search, GitBranch, Folder, Shield } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: "Transcripción de Audio",
    description: "Convierte tus ideas habladas en notas estructuradas automáticamente. Captura en movimiento."
  },
  {
    icon: Brain,
    title: "Captura Inteligente",
    description: "Guarda documentos, correos y contenido web en un solo lugar. Organización automática."
  },
  {
    icon: Search,
    title: "Búsqueda Avanzada",
    description: "Encuentra exactamente lo que necesitas al instante. Búsqueda full-text y por contexto."
  },
  {
    icon: GitBranch,
    title: "Conexiones Automáticas",
    description: "Descubre relaciones entre tus notas. Un grafo de conocimiento personal."
  },
  {
    icon: Folder,
    title: "Proyectos Organizados",
    description: "Agrupa tus notas por espacios y proyectos. Contexto limpio y accesible."
  },
  {
    icon: Shield,
    title: "Privacidad Total",
    description: "Tu conocimiento es privado. Sin rastreo, sin venta de datos. Seguridad garantizada."
  }
];

export function Features() {
  return (
    <section className="py-20 bg-[#0A0A0A] relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />
      </div>
      
      <div className="container-custom relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2A2A2A] bg-[#1A1A1A]/30 mb-6">
            <Brain size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-blue-400">Características Poderosas</span>
          </div>
          
          <h2 className="heading-h2 text-[#E5E5E5] mb-4">
            Todo lo que necesitas para gestionar tu conocimiento
            <span className="block bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              personal de forma eficiente
            </span>
          </h2>
          
          <p className="text-lg text-[#999999] max-w-2xl mx-auto">
            SecondBrain combina inteligencia artificial con diseño intuitivo para crear la experiencia
            de gestión de conocimiento más poderosa y fácil de usar.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative p-6 rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A]/30 
                         hover:bg-[#1A1A1A]/50 hover:border-blue-500/30 transition-all duration-300 
                         hover:transform hover:-translate-y-1 backdrop-blur-sm"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 
                              flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon size={24} className="text-white" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold text-[#E5E5E5] mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-[#999999] leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Hover Effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 
                               bg-gradient-to-br from-blue-500/5 to-transparent transition-opacity" />
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <button className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r 
                           from-blue-600 to-blue-700 text-white rounded-xl font-semibold 
                           hover:from-blue-700 hover:to-blue-800 transition-all duration-300 
                           transform hover:scale-105 shadow-lg hover:shadow-blue-500/25">
            <span>Explora todas las características</span>
            <Brain size={20} className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-orange-500 text-white rounded-full font-medium animate-pulse">
              Beta
            </div>
          </button>
          <div className="mt-3 text-sm text-[#666666]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Acceso anticipado limitado
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
